package com.blasllavero.aiptim

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.blasllavero.aiptim.data.AiptimDatabase
import com.blasllavero.aiptim.data.Project
import com.blasllavero.aiptim.data.TrackedPrompt
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private lateinit var database: AiptimDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        database = AiptimDatabase(applicationContext)
        enableEdgeToEdge()
        setContent {
            val colors = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()
            MaterialTheme(colorScheme = colors) {
                Surface(Modifier.fillMaxSize()) {
                    AiptimScreen(database)
                }
            }
        }
    }

    override fun onDestroy() {
        database.close()
        super.onDestroy()
    }
}

@Composable
private fun AiptimScreen(database: AiptimDatabase) {
    var projects by remember { mutableStateOf(database.readProjects()) }
    var prompts by remember { mutableStateOf(database.readPrompts()) }
    var selectedProjectId by rememberSaveable { mutableLongStateOf(0L) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var showProjectDialog by remember { mutableStateOf(false) }
    var showPromptDialog by remember { mutableStateOf(false) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }

    fun refresh() {
        projects = database.readProjects()
        prompts = database.readPrompts()
    }

    LaunchedEffect(projects) {
        if (projects.none { it.id == selectedProjectId }) {
            selectedProjectId = projects.firstOrNull()?.id ?: 0L
        }
    }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1000L)
        }
    }

    val selected = projects.firstOrNull { it.id == selectedProjectId }
    val selectedPrompts = prompts.filter { it.projectId == selectedProjectId }
    val selectedTotal = selectedPrompts.sumOf { it.elapsedMs(now) }

    Scaffold(
        contentWindowInsets = WindowInsets.safeDrawing,
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == 0,
                    onClick = { tab = 0 },
                    icon = { Text("◷") },
                    label = { Text("Projects") }
                )
                NavigationBarItem(
                    selected = tab == 1,
                    onClick = { tab = 1 },
                    icon = { Text("▥") },
                    label = { Text("Analytics") }
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "AIPTIM",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                "AI Prompt Time Manager · Early test version",
                style = MaterialTheme.typography.bodySmall
            )
            if (tab == 0) {
                Text(
                    "This version uses manual timers. It does not read ChatGPT or detect whether you are idle.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "Your projects",
                        style = MaterialTheme.typography.titleLarge
                    )
                    TextButton(onClick = { showProjectDialog = true }) {
                        Text("+ Add project")
                    }
                }
                if (projects.isEmpty()) {
                    Card(Modifier.fillMaxWidth()) {
                        Text(
                            "Create your first project to start tracking prompts.",
                            modifier = Modifier.padding(18.dp)
                        )
                    }
                } else {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        projects.forEach { project ->
                            FilterChip(
                                selected = selectedProjectId == project.id,
                                onClick = { selectedProjectId = project.id },
                                label = { Text(project.name) }
                            )
                        }
                    }
                    if (selected != null) {
                        Card(Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(18.dp)) {
                                Text(selected.name, style = MaterialTheme.typography.titleMedium)
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    formatDuration(selectedTotal),
                                    style = MaterialTheme.typography.headlineMedium
                                )
                                Text(
                                    "Total time · ${selectedPrompts.size} prompts",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Prompts", style = MaterialTheme.typography.titleLarge)
                            TextButton(onClick = { showPromptDialog = true }) {
                                Text("+ Add prompt")
                            }
                        }
                        if (selectedPrompts.isEmpty()) {
                            Text("No prompts in this project yet.")
                        }
                        selectedPrompts.forEach { prompt ->
                            PromptCard(
                                prompt = prompt,
                                now = now,
                                onToggle = {
                                    if (prompt.runningSinceMs == null) {
                                        database.startPrompt(prompt.id)
                                    } else {
                                        database.pausePrompt(prompt.id)
                                    }
                                    refresh()
                                }
                            )
                        }
                    }
                }
            } else {
                Text("Time by project", style = MaterialTheme.typography.titleLarge)
                val totals = projects.map { project ->
                    project to prompts.filter { it.projectId == project.id }.sumOf { it.elapsedMs(now) }
                }
                val maxTotal = totals.maxOfOrNull { it.second }?.coerceAtLeast(1L) ?: 1L
                if (totals.isEmpty()) {
                    Text("Your statistics will appear after you create a project.")
                }
                totals.forEach { (project, total) ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(project.name, fontWeight = FontWeight.SemiBold)
                                Text(formatDuration(total))
                            }
                            LinearProgressIndicator(
                                progress = { total.toFloat() / maxTotal.toFloat() },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
                HorizontalDivider()
                Text(
                    "Time totals include only sessions you started manually. Leaving a timer running while idle will overestimate your time.",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }

    if (showProjectDialog) {
        AddProjectDialog(
            onDismiss = { showProjectDialog = false },
            onSave = { name ->
                if (database.addProject(name)) {
                    refresh()
                    selectedProjectId = projects.first().id
                    showProjectDialog = false
                    true
                } else false
            }
        )
    }
    if (showPromptDialog && selected != null) {
        AddPromptDialog(
            onDismiss = { showPromptDialog = false },
            onSave = { title, url, limit ->
                if (database.addPrompt(selectedProjectId, title, url, limit)) {
                    refresh()
                    showPromptDialog = false
                    true
                } else false
            }
        )
    }
}

@Composable
private fun PromptCard(
    prompt: TrackedPrompt,
    now: Long,
    onToggle: () -> Unit
) {
    val uriHandler = LocalUriHandler.current
    val elapsed = prompt.elapsedMs(now)
    val overLimit = elapsed >= prompt.limitMinutes.toLong() * 60_000L
    Card(Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(prompt.title, fontWeight = FontWeight.SemiBold)
            Text(formatDuration(elapsed), style = MaterialTheme.typography.titleLarge)
            Text(
                "Limit: ${prompt.limitMinutes} min" +
                    if (overLimit) " · Limit exceeded" else "",
                color = if (overLimit) MaterialTheme.colorScheme.error
                else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onToggle) {
                    Text(if (prompt.runningSinceMs == null) "Start / Resume" else "Pause")
                }
                if (prompt.conversationUrl.isNotEmpty()) {
                    OutlinedButton(onClick = { uriHandler.openUri(prompt.conversationUrl) }) {
                        Text("Open chat")
                    }
                }
            }
        }
    }
}

@Composable
private fun AddProjectDialog(
    onDismiss: () -> Unit,
    onSave: (String) -> Boolean
) {
    var name by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New project") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it; error = false },
                    label = { Text("Project name") },
                    singleLine = true
                )
                if (error) Text("Enter a unique name (up to 80 characters).",
                    color = MaterialTheme.colorScheme.error)
            }
        },
        confirmButton = {
            TextButton(onClick = { if (!onSave(name)) error = true }) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
private fun AddPromptDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, Int) -> Boolean
) {
    var title by remember { mutableStateOf("") }
    var url by remember { mutableStateOf("") }
    var limit by remember { mutableStateOf("30") }
    var error by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New prompt") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it; error = false },
                    label = { Text("Prompt title") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it; error = false },
                    label = { Text("Conversation URL (optional)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = limit,
                    onValueChange = { limit = it; error = false },
                    label = { Text("Time limit (minutes)") },
                    singleLine = true
                )
                if (error) Text(
                    "Check the title, web link and limit (1–10080 min).",
                    color = MaterialTheme.colorScheme.error
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val minutes = limit.toIntOrNull()
                if (minutes == null || !onSave(title, url, minutes)) error = true
            }) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
