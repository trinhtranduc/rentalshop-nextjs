package com.anyrent.pos.domain.orders

/** #1354 when the order's note is on the share image (iOS `ShareOrderNoteRule`) */
object ShareOrderNoteRule {
    /** The note block: the order's note without surrounding blanks, only for an order (not a draft) while the switch is on */
    fun text(note: String?, enabled: Boolean, isDraft: Boolean): String? = null
}

/** #1354 the note block is at most [MAX_LINES] lines of the box it is drawn in (iOS `ShareNoteClip`, same algorithm) */
object ShareNoteClip {
    const val MAX_LINES = 4

    /**
     * Wraps [text] by words into lines that [fits] (measured with the font and width the image draws it with). The
     * author's line breaks stay, a word longer than a line is cut by characters. More than [maxLines] lines: the last
     * kept line is shortened until it fits with "…".
     */
    fun lines(text: String, maxLines: Int = MAX_LINES, fits: (String) -> Boolean): List<String> = emptyList()
}
