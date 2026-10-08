package com.anyrent.pos.domain.products

import kotlin.math.max
import kotlin.math.roundToInt

/**
 * #654: the query photo sent to `POST /api/products/searchByImage`. Same numbers as iOS
 * (`ImageSearchQuery.swift`).
 *
 * Why: the old ≤ 20 KB / quality-down-to-0.05 loop wiped out the lace and pattern detail the
 * model compares. 512 px at quality 0.7 keeps that detail and stays around 30–80 KB.
 */
object ImageSearchQuery {
    /** Longest side of the photo we send, in pixels */
    const val MAX_LONG_SIDE = 512

    /** JPEG quality of the photo we send (iOS 0.7) */
    const val JPEG_QUALITY = 70

    /** The server gives up after 20 s with SEARCH_TIMEOUT; wait longer so that code reaches the app */
    const val REQUEST_TIMEOUT_SECONDS = 30L

    /** Success with no products (or an old server sending it as an error): show the empty state */
    const val NO_MATCH_CODE = "NO_PRODUCTS_FOUND"

    /** Pixel size to encode: long side at most [MAX_LONG_SIDE], aspect kept, never upscaled. */
    fun targetSize(width: Int, height: Int): Pair<Int, Int> {
        val longSide = max(width, height)
        if (longSide <= MAX_LONG_SIDE || width <= 0 || height <= 0) return width to height
        val scale = MAX_LONG_SIDE.toDouble() / longSide
        return max(1, (width * scale).roundToInt()) to max(1, (height * scale).roundToInt())
    }

    /** True when the API code means "nothing matched" rather than a failure. */
    fun isNoMatch(code: String?): Boolean = code.equals(NO_MATCH_CODE, ignoreCase = true)
}
