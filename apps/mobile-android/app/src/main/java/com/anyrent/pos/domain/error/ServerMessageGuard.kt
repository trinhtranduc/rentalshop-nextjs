package com.anyrent.pos.domain.error

/**
 * #1408 Installed apps must not show a server exception (SQL, paths, stack) even if the API ever sends one.
 * Same rule as iOS `ServerMessageGuard`, used wherever a server message becomes UI text.
 */
object ServerMessageGuard {
    private const val MAX_LENGTH = 400
    private val markers = listOf("invocation", "prisma", ".next", "/app/", "chunks/", "node_modules", "\$queryraw", "cannot read propert")

    /** Upper case only: "please select a product from the list" is a sentence, not SQL */
    private val patterns = listOf(
        Regex("""\bSELECT\b[\s\S]*\bFROM\b|\bINSERT INTO\b|\bUPDATE\b[\s\S]*\bSET\b|ECONN[A-Z]+|ETIMEDOUT|ENOTFOUND"""),
        Regex("""\.[cm]?[jt]sx?:\d|\n\s+at\s"""),
    )

    fun looksTechnical(text: String): Boolean {
        if (text.length > MAX_LENGTH) return true
        val lower = text.lowercase()
        if (markers.any { lower.contains(it) }) return true
        return patterns.any { it.containsMatchIn(text) }
    }

    /** [text] when it reads like a sentence, else [fallback] */
    fun safe(text: String, fallback: String): String = if (looksTechnical(text)) fallback else text
}
