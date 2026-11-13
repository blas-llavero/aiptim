package com.blasllavero.aiptim.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

data class Project(
    val id: Long,
    val name: String
)

data class TrackedPrompt(
    val id: Long,
    val projectId: Long,
    val title: String,
    val conversationUrl: String,
    val accumulatedMs: Long,
    val runningSinceMs: Long?,
    val limitMinutes: Int,
    val source: String = "manual",
    val promptText: String = ""
) {
    fun elapsedMs(now: Long): Long =
        accumulatedMs + (runningSinceMs?.let { (now - it).coerceAtLeast(0L) } ?: 0L)
}

/**
 * Small local-first SQLite repository for MVP v0.1.0.
 * It deliberately has no internet, telemetry, or account integration.
 * All user-controlled timer state is persisted, including a running timer.
 */
class AiptimDatabase(context: Context) :
    SQLiteOpenHelper(context.applicationContext, "aiptim-local.db", null, 2) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL COLLATE NOCASE UNIQUE
            )""".trimIndent()
        )
        db.execSQL(
            """CREATE TABLE prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                conversation_url TEXT NOT NULL DEFAULT '',
                accumulated_ms INTEGER NOT NULL DEFAULT 0,
                running_since_ms INTEGER,
                limit_minutes INTEGER NOT NULL DEFAULT 30,
                import_id TEXT UNIQUE,
                prompt_text TEXT NOT NULL DEFAULT '',
                source TEXT NOT NULL DEFAULT 'manual',
                writing_ms INTEGER NOT NULL DEFAULT 0,
                reading_ms INTEGER NOT NULL DEFAULT 0,
                waiting_ms INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            )""".trimIndent()
        )
        db.execSQL("CREATE INDEX idx_prompts_project ON prompts(project_id)")
        db.execSQL("CREATE UNIQUE INDEX idx_prompts_import_id ON prompts(import_id)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE prompts ADD COLUMN import_id TEXT")
            db.execSQL("CREATE UNIQUE INDEX idx_prompts_import_id ON prompts(import_id)") 
            db.execSQL("ALTER TABLE prompts ADD COLUMN prompt_text TEXT NOT NULL DEFAULT ''")
            db.execSQL("ALTER TABLE prompts ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
            db.execSQL("ALTER TABLE prompts ADD COLUMN writing_ms INTEGER NOT NULL DEFAULT 0")
            db.execSQL("ALTER TABLE prompts ADD COLUMN reading_ms INTEGER NOT NULL DEFAULT 0")
            db.execSQL("ALTER TABLE prompts ADD COLUMN waiting_ms INTEGER NOT NULL DEFAULT 0")
        }
    }

    fun readProjects(): List<Project> {
        val result = mutableListOf<Project>()
        readableDatabase.rawQuery("SELECT id, name FROM projects ORDER BY id DESC", null)
            .use { cursor ->
                while (cursor.moveToNext()) {
                    result += Project(cursor.getLong(0), cursor.getString(1))
                }
            }
        return result
    }

    fun readPrompts(): List<TrackedPrompt> {
        val result = mutableListOf<TrackedPrompt>()
        readableDatabase.rawQuery(
            """SELECT id, project_id, title, conversation_url,
                      accumulated_ms, running_since_ms, limit_minutes,
                      source, prompt_text
               FROM prompts ORDER BY id DESC""".trimIndent(),
            null
        ).use { cursor ->
            while (cursor.moveToNext()) {
                result += TrackedPrompt(
                    id = cursor.getLong(0),
                    projectId = cursor.getLong(1),
                    title = cursor.getString(2),
                    conversationUrl = cursor.getString(3),
                    accumulatedMs = cursor.getLong(4),
                    runningSinceMs = if (cursor.isNull(5)) null else cursor.getLong(5),
                    limitMinutes = cursor.getInt(6),
                    source = cursor.getString(7),
                    promptText = cursor.getString(8)
                )
            }
        }
        return result
    }

    fun addProject(rawName: String): Boolean {
        val name = rawName.trim()
        if (name.isBlank() || name.length > 80) return false
        val values = ContentValues().apply { put("name", name) }
        return writableDatabase.insertWithOnConflict(
            "projects", null, values, SQLiteDatabase.CONFLICT_IGNORE
        ) != -1L
    }

    fun addPrompt(projectId: Long, rawTitle: String, rawUrl: String, limitMinutes: Int): Boolean {
        val title = rawTitle.trim()
        val url = rawUrl.trim()
        if (projectId <= 0 || title.isBlank() || title.length > 250 ||
            url.length > 2048 || limitMinutes !in 1..10080
        ) return false

        // Only accept normal browser links. Empty links are allowed.
        if (url.isNotBlank() &&
            !(url.startsWith("https://", ignoreCase = true) ||
              url.startsWith("http://", ignoreCase = true))
        ) return false

        val values = ContentValues().apply {
            put("project_id", projectId)
            put("title", title)
            put("conversation_url", url)
            put("limit_minutes", limitMinutes)
        }
        return writableDatabase.insert("prompts", null, values) != -1L
    }

    /** At most one running prompt. All elapsed time is computed using persisted wall time. */
    fun startPrompt(promptId: Long) {
        val db = writableDatabase
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            db.execSQL(
                """UPDATE prompts
                   SET accumulated_ms = accumulated_ms + MAX(0, ? - running_since_ms),
                       running_since_ms = NULL
                   WHERE running_since_ms IS NOT NULL""".trimIndent(),
                arrayOf(now)
            )
            db.execSQL(
                "UPDATE prompts SET running_since_ms = ? WHERE id = ?",
                arrayOf(now, promptId)
            )
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun pausePrompt(promptId: Long) {
        val db = writableDatabase
        val now = System.currentTimeMillis()
        db.execSQL(
            """UPDATE prompts
               SET accumulated_ms = accumulated_ms + MAX(0, ? - running_since_ms),
                   running_since_ms = NULL
               WHERE id = ? AND running_since_ms IS NOT NULL""".trimIndent(),
            arrayOf(now, promptId)
        )
    }
}
