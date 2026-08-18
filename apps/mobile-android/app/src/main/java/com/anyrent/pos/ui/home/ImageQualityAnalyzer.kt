package com.anyrent.pos.ui.home

import android.graphics.Bitmap
import kotlin.math.max
import kotlin.math.min

/**
 * Live-camera product center (same contour idea as iOS `detectProductCenter`).
 * Quality scoring is intentionally not shown on UI.
 */
data class ImageQualityResult(
    /** Normalized 0…1 in image space, or null if no blob. */
    val productCenter: Pair<Float, Float>?,
)

private data class Gray(val pixels: IntArray, val width: Int, val height: Int)

private data class Blob(
    var minX: Int,
    var minY: Int,
    var maxX: Int,
    var maxY: Int,
    var area: Int,
) {
    val centerX: Float get() = (minX + maxX) / 2f
    val centerY: Float get() = (minY + maxY) / 2f
}

object ImageQualityAnalyzer {
    private const val MAX_SIDE = 180

    fun analyze(bitmap: Bitmap): ImageQualityResult {
        val gray = toGray(bitmap, MAX_SIDE)
        val blobs = productBlobs(gray)
        val largest = blobs.maxByOrNull { it.area }
        val imageArea = (gray.width * gray.height).toFloat().coerceAtLeast(1f)
        val minArea = imageArea * 0.05f
        val center = if (largest != null && largest.area >= minArea) {
            largest.centerX / gray.width to largest.centerY / gray.height
        } else {
            null
        }
        return ImageQualityResult(productCenter = center)
    }

    private fun toGray(bitmap: Bitmap, maxSide: Int): Gray {
        val longest = max(bitmap.width, bitmap.height).toFloat().coerceAtLeast(1f)
        val scale = min(1f, maxSide / longest)
        val w = (bitmap.width * scale).toInt().coerceAtLeast(1)
        val h = (bitmap.height * scale).toInt().coerceAtLeast(1)
        val scaled = if (w == bitmap.width && h == bitmap.height) {
            bitmap
        } else {
            Bitmap.createScaledBitmap(bitmap, w, h, true)
        }
        val argb = IntArray(w * h)
        scaled.getPixels(argb, 0, w, 0, 0, w, h)
        if (scaled !== bitmap) scaled.recycle()
        val gray = IntArray(w * h)
        for (i in argb.indices) {
            val c = argb[i]
            val r = (c shr 16) and 0xFF
            val g = (c shr 8) and 0xFF
            val b = c and 0xFF
            gray[i] = (r * 299 + g * 587 + b * 114) / 1000
        }
        return Gray(gray, w, h)
    }

    private fun productBlobs(gray: Gray): List<Blob> {
        val binary = adaptiveBinary(gray)
        val w = gray.width
        val h = gray.height
        val minArea = max(8, (w * h) / 20)
        val visited = BooleanArray(w * h)
        val blobs = ArrayList<Blob>()
        val stackX = IntArray(w * h)
        val stackY = IntArray(w * h)
        for (y in 0 until h) {
            for (x in 0 until w) {
                val start = y * w + x
                if (visited[start] || binary[start] == 0) continue
                var sp = 0
                stackX[sp] = x
                stackY[sp] = y
                sp++
                visited[start] = true
                var minX = x
                var maxX = x
                var minY = y
                var maxY = y
                var area = 0
                while (sp > 0) {
                    sp--
                    val cx = stackX[sp]
                    val cy = stackY[sp]
                    area++
                    if (cx < minX) minX = cx
                    if (cx > maxX) maxX = cx
                    if (cy < minY) minY = cy
                    if (cy > maxY) maxY = cy
                    val neighbors = intArrayOf(cx - 1, cy, cx + 1, cy, cx, cy - 1, cx, cy + 1)
                    var n = 0
                    while (n < neighbors.size) {
                        val nx = neighbors[n]
                        val ny = neighbors[n + 1]
                        n += 2
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
                        val ni = ny * w + nx
                        if (visited[ni] || binary[ni] == 0) continue
                        visited[ni] = true
                        stackX[sp] = nx
                        stackY[sp] = ny
                        sp++
                    }
                }
                if (area >= minArea) {
                    blobs.add(Blob(minX, minY, maxX, maxY, area))
                }
            }
        }
        return blobs
    }

    private fun adaptiveBinary(gray: Gray): IntArray {
        val w = gray.width
        val h = gray.height
        val radius = 5
        val integral = IntArray((w + 1) * (h + 1))
        for (y in 0 until h) {
            var row = 0
            for (x in 0 until w) {
                row += gray.pixels[y * w + x]
                integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + row
            }
        }
        val binary = IntArray(w * h)
        val c = 2
        for (y in 0 until h) {
            for (x in 0 until w) {
                val x0 = max(0, x - radius)
                val y0 = max(0, y - radius)
                val x1 = min(w - 1, x + radius)
                val y1 = min(h - 1, y + radius)
                val area = (x1 - x0 + 1) * (y1 - y0 + 1)
                val sum = integral[(y1 + 1) * (w + 1) + (x1 + 1)] -
                    integral[y0 * (w + 1) + (x1 + 1)] -
                    integral[(y1 + 1) * (w + 1) + x0] +
                    integral[y0 * (w + 1) + x0]
                val mean = sum / max(1, area)
                binary[y * w + x] = if (gray.pixels[y * w + x] < mean - c) 255 else 0
            }
        }
        return binary
    }
}
