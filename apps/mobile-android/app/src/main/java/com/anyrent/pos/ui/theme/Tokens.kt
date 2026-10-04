package com.anyrent.pos.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

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

    /**
     * Type ramp of the new UI (He-thong board, owner-approved 2026-10-04, #424).
     * Text uses only 17 · 15 · 14 · 12; inputs and primary buttons 16; headings and hero numbers 18–30.
     * No 11 or 13. Same numbers on iOS (`DS.TextSize`, pt).
     */
    object TextSize {
        /** Screen title, 700 */
        val Title = 24.sp
        /** Main money amount, 700 */
        val Amount = 20.sp
        /** Customer name, product name, row total, price, card title (600–700) */
        val Name = 17.sp
        /** Text inputs and primary buttons */
        val Input = 16.sp
        /** Body, buttons, item line, field labels, segmented control (400–600) */
        val Body = 15.sp
        /** Secondary: dates, order code, còn thu / trả cọc, stock, per-day price (400–600) */
        val Secondary = 14.sp
        /** Status pills, tags, count badges, tab labels (600–700). The minimum. */
        val Pill = 12.sp
    }

    /** Vertical rhythm of the new lists (#424) */
    object Gap {
        /** Between text lines inside one block (board: 4–5) */
        val Line = 5.dp
        val LineTight = 4.dp
        /** Order list row: 15 top/bottom, 16 left/right */
        val OrderRowVertical = 15.dp
        val RowHorizontal = 16.dp
        /** Product list row: 14 padding, 96 min height */
        val ProductRow = 14.dp
        val ProductRowMinHeight = 96.dp
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
