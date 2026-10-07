package com.anyrent.pos.ui.auth.v2

import org.junit.Assert.assertEquals
import org.junit.Test

/** #466 — the 4A dot grid is opaque over its top 30 % and fades linearly to transparent at its bottom */
class AuthDotGridTest {

    @Test
    fun opaqueOverTheTopThirtyPercent() {
        assertEquals(1f, dotGridAlpha(0f), 0.0001f)
        assertEquals(1f, dotGridAlpha(0.3f), 0.0001f)
    }

    @Test
    fun fadesLinearlyToTransparentAtTheBottom() {
        assertEquals(0.5f, dotGridAlpha(0.65f), 0.0001f)
        assertEquals(0f, dotGridAlpha(1f), 0.0001f)
    }

    @Test
    fun clampsOutsideTheGrid() {
        assertEquals(1f, dotGridAlpha(-0.2f), 0.0001f)
        assertEquals(0f, dotGridAlpha(1.4f), 0.0001f)
    }
}
