package com.blasllavero.aiptim

fun formatDuration(milliseconds: Long): String {
    val seconds = (milliseconds.coerceAtLeast(0L) / 1000L)
    val hours = seconds / 3600L
    val minutes = (seconds % 3600L) / 60L
    val remainingSeconds = seconds % 60L
    return when {
        hours > 0L -> "${hours} h ${minutes} min"
        minutes > 0L -> "${minutes} min ${remainingSeconds} s"
        else -> "${remainingSeconds} s"
    }
}
