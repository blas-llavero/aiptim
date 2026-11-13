package com.blasllavero.aiptim

import org.junit.Assert.assertEquals
import org.junit.Test

class TimeFormatTest {
    @Test fun formatsSeconds() {
        assertEquals("0 s", formatDuration(0))
        assertEquals("9 s", formatDuration(9_000))
    }

    @Test fun formatsMinutesAndHours() {
        assertEquals("1 min 5 s", formatDuration(65_000))
        assertEquals("2 h 15 min", formatDuration(8_100_000))
    }

    @Test fun negativeDurationsAreClamped() {
        assertEquals("0 s", formatDuration(-1))
    }
}
