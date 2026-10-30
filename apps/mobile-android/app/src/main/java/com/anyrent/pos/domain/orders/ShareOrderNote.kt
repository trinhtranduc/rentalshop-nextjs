package com.anyrent.pos.domain.orders

import java.text.BreakIterator

/** #1354 when the order's note is on the share image (iOS `ShareOrderNoteRule`) */
object ShareOrderNoteRule {
    /** The note block: the order's note without surrounding blanks, only for an order (not a draft) while the switch is on */
    fun text(note: String?, enabled: Boolean, isDraft: Boolean): String? {
        if (!enabled || isDraft) return null
        return note?.trim()?.takeIf { it.isNotEmpty() }
    }
}

/** #1354 the note block is at most [MAX_LINES] lines of the box it is drawn in (iOS `ShareNoteClip`, same algorithm) */
object ShareNoteClip {
    const val MAX_LINES = 4

    private val newline = Regex("\r\n|[\n\r\u0085  ]")
    private val spaces = Regex("[\\s\\p{Z}]+")

    /** User-perceived characters, so a letter with its marks is never cut in two */
    private fun graphemes(text: String): List<String> {
        val iterator = BreakIterator.getCharacterInstance()
        iterator.setText(text)
        val out = mutableListOf<String>()
        var start = iterator.first()
        var end = iterator.next()
        while (end != BreakIterator.DONE) {
            out += text.substring(start, end)
            start = end
            end = iterator.next()
        }
        return out
    }

    /**
     * Wraps [text] by words into lines that [fits] (measured with the font and width the image draws it with). The
     * author's line breaks stay, a word longer than a line is cut by characters. More than [maxLines] lines: the last
     * kept line is shortened until it fits with "…".
     */
    fun lines(text: String, maxLines: Int = MAX_LINES, fits: (String) -> Boolean): List<String> {
        if (maxLines <= 0) return emptyList()
        val out = mutableListOf<String>()
        paragraphs@ for (paragraph in text.split(newline)) {
            var current = ""
            for (word in paragraph.split(spaces).filter { it.isNotEmpty() }) {
                val joined = if (current.isEmpty()) word else "$current $word"
                if (fits(joined)) {
                    current = joined
                    continue
                }
                if (current.isNotEmpty()) {
                    out += current
                    current = ""
                }
                // A word longer than a line: cut it by characters; the last piece may share its line with the next word
                val characters = graphemes(word)
                var start = 0
                while (start < characters.size) {
                    var end = characters.size
                    while (end > start + 1 && !fits(characters.subList(start, end).joinToString(""))) end--
                    val piece = characters.subList(start, end).joinToString("")
                    if (end == characters.size) current = piece else out += piece
                    start = end
                }
                if (out.size > maxLines) break@paragraphs
            }
            if (current.isNotEmpty()) out += current
            if (out.size > maxLines) break
        }
        if (out.size <= maxLines) return out
        val kept = out.take(maxLines).toMutableList()
        var last = kept[maxLines - 1]
        while (last.isNotEmpty() && !fits(last + "…")) {
            last = graphemes(last).dropLast(1).joinToString("").trimEnd()
        }
        kept[maxLines - 1] = last + "…"
        return kept
    }
}
