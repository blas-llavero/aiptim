package com.blasllavero.aiptim.data

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import org.json.JSONObject

data class ImportSummary(val added: Int, val updated: Int)

/** Imports AIPTIM's own local browser-extension export; no internet is accessed. */
fun AiptimDatabase.importExtensionJson(source: String): ImportSummary {
    val root = JSONObject(source)
    require(root.optInt("schemaVersion") == 1 &&
        root.optString("generator") == "AIPTIM browser extension") {
        "Expected an AIPTIM browser-extension JSON export (schema version 1)."
    }
    val items = root.getJSONArray("records")
    require(items.length() <= 10000) { "Too many records in export." }

    val db = writableDatabase
    var added = 0
    var updated = 0
    db.beginTransaction()
    try {
        for (i in 0 until items.length()) {
            val item = items.getJSONObject(i)
            val importId = item.optString("id").trim()
            require(importId.length in 8..150) { "Missing or invalid prompt ID." }
            val fullText = item.optString("text").trim().take(10000)
            if (fullText.isBlank()) continue

            val url = item.optString("url").take(2048)
            val parsedUrl = try { java.net.URI(url) } catch (_: Exception) { null }
            require(
                parsedUrl != null && parsedUrl.scheme == "https" &&
                (parsedUrl.host == "chatgpt.com" || parsedUrl.host == "chat.openai.com" ||
                  (parsedUrl.host == "platform.openai.com" &&
                   parsedUrl.path.startsWith("/playground")))
            ) { "Export contains unsupported conversation URLs." }

            val groupName = item.optString("chatTitle").trim()
                .ifEmpty { "ChatGPT conversations" }
                .take(80)
            var projectId = -1L
            db.rawQuery("SELECT id FROM projects WHERE name = ? COLLATE NOCASE",
                arrayOf(groupName)).use { cursor ->
                if (cursor.moveToFirst()) projectId = cursor.getLong(0)
            }
            if (projectId < 0) {
                projectId = db.insertWithOnConflict(
                    "projects", null, ContentValues().apply { put("name", groupName) },
                    SQLiteDatabase.CONFLICT_IGNORE
                )
                if (projectId < 0) {
                    db.rawQuery("SELECT id FROM projects WHERE name = ? COLLATE NOCASE",
                        arrayOf(groupName)).use { cursor ->
                        require(cursor.moveToFirst()) { "Cannot locate conversation project." }
                        projectId = cursor.getLong(0)
                    }
                }
            }

            val writing = item.optLong("writingMs").coerceIn(0L, 604800000L)
            val reading = item.optLong("readingMs").coerceIn(0L, 604800000L)
            val waiting = item.optLong("waitingMs").coerceIn(0L, 604800000L)
            val values = ContentValues().apply {
                put("project_id", projectId)
                put("title", fullText.lineSequence().first().take(160))
                put("prompt_text", fullText)
                put("conversation_url", url)
                put("accumulated_ms", writing + reading)
                put("writing_ms", writing)
                put("reading_ms", reading)
                put("waiting_ms", waiting)
                put("import_id", importId)
                put("source", "browser-extension")
            }
            val existing = db.rawQuery(
                "SELECT id FROM prompts WHERE import_id = ?", arrayOf(importId)
            ).use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else null }
            if (existing == null) {
                require(db.insert("prompts", null, values) >= 0) { "Cannot import prompt." }
                added++
            } else {
                // Reimports replace the same record totals, never add the same time twice.
                db.update("prompts", values, "id = ?", arrayOf(existing.toString()))
                updated++
            }
        }
        db.setTransactionSuccessful()
    } finally {
        db.endTransaction()
    }
    return ImportSummary(added, updated)
}
