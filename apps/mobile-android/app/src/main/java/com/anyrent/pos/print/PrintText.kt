package com.anyrent.pos.print

import java.text.Normalizer

/**
 * #970: bill text without Vietnamese accents, as iOS prints it (`String.formatStringOriginalCharacter()` in
 * RCExtentions.swift). Thermal printers do not read UTF-8 Vietnamese; "Đơn thuê của" printed as boxes.
 * Same table as iOS: a e i o u y d and capitals; every other character is left as it is.
 */
object PrintText {
    private val table: Map<Char, Char> = buildMap {
        fun map(chars: String, to: Char) = chars.forEach { put(it, to) }
        map("àáạảãâầấậẩẫăằắặẳẵ", 'a')
        map("èéẹẻẽêềếệểễ", 'e')
        map("ìíịỉĩ", 'i')
        map("òóọỏõôồốộổỗơờớợởỡ", 'o')
        map("ỳýỵỷỹ", 'y')
        map("ùúụủũưừứựửữ", 'u')
        map("đ", 'd')
        map("ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ", 'A')
        map("ÈÉẸẺẼÊỀẾỆỂỄ", 'E')
        map("ÌÍỊỈĨ", 'I')
        map("ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ", 'O')
        map("ÙÚỤỦŨƯỪỨỰỬỮ", 'U')
        map("ỲÝỴỶỸ", 'Y')
        map("Đ", 'D')
    }

    /** "Đơn thuê của Trần Đức" → "Don thue cua Tran Duc" (decomposed input too, as Swift compares by character) */
    fun plain(value: String): String {
        val composed = Normalizer.normalize(value, Normalizer.Form.NFC)
        if (composed.all { it.code < 0x80 }) return composed
        return buildString(composed.length) { composed.forEach { append(table[it] ?: it) } }
    }
}
