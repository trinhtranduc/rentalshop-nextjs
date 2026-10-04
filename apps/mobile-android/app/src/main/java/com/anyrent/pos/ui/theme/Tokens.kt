package com.anyrent.pos.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * Design tokens of the redesign (He-thong board, #370). New screens use these; current screens keep theirs.
 */
object DS {
    object Colors {
        val Primary = Color(0xFF1D4ED8)
        val Text = Color(0xFF0F172A)
        val TextMuted = Color(0xFF475569)
        val Surface = Color(0xFFFFFFFF)
        val Background = Color(0xFFF3F4F6)
        val Border = Color(0xFFE5E7EB)
        val Divider = Color(0xFFF1F5F9)
    }

    /** Pill colors: [text] on [fill] */
    data class Pill(val text: Color, val fill: Color)

    object Status {
        val Late = Pill(Color(0xFFB91C1C), Color(0xFFFEE2E2))
        val HandOver = Pill(Color(0xFF1E40AF), Color(0xFFDBEAFE))
        val Return = Pill(Color(0xFF5B21B6), Color(0xFFEDE9FE))
        val Waiting = Pill(Color(0xFF9A3412), Color(0xFFFFEDD5))
        val Done = Pill(Color(0xFF047857), Color(0xFFD1FAE5))
        val Cancelled = Pill(Color(0xFF475569), Color(0xFFF1F5F9))
    }

    object Spacing {
        val xs = 4.dp
        val sm = 8.dp
        val md = 12.dp
        val lg = 16.dp
        val xl = 24.dp
    }

    object Radius {
        val pill = 999.dp
        val chip = 6.dp
        val card = 12.dp
        val sheet = 20.dp
    }

    /** Minimum touch target */
    val TouchTarget = 44.dp

    /**
     * Icon box sizes of the boards (canvas px = icon box). Use with `Icons.Outlined.*` at the same dp (#396).
     */
    object Icon {
        val Sm = 18.dp
        val Md = 20.dp
        val Lg = 22.dp
    }
}
