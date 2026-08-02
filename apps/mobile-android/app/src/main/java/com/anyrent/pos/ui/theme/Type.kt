package com.anyrent.pos.ui.theme

import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import com.anyrent.pos.R

/**
 * Brand typeface — same Inter family as iOS POS (`Define.swift`: Inter-Regular/Medium/Bold…).
 * Why Inter: modern geometric sans, excellent Latin + Vietnamese UI readability, matches iOS.
 */
val InterFontFamily = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semi_bold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
    Font(R.font.inter_extra_bold, FontWeight.ExtraBold),
)
