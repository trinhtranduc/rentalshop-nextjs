package com.anyrent.pos.ui.common

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.Matrix
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

/**
 * Image prep for multipart uploads — mirrors iOS (`RCExtentions.swift`):
 *
 * - **Products**: `UIImage.compressToTargetSize(targetSizeKB: 100)` (max side 1920)
 * - **Notes**: `UIImageJPEGRepresentation(image, 0.8)`; if still over API 200KB,
 *   fall back to the same iterative compressor (target ~180KB) so uploads succeed
 *
 * Always emit real JPEG bytes (FF D8…) + `.jpg` names — never rename HEIC/WebP.
 */
private const val TAG = "AnyRentImageCompress"

private const val PRODUCT_TARGET_KB = 100
private const val NOTES_API_MAX_BYTES = 200 * 1024
private const val NOTES_TARGET_KB = 180
private const val PRODUCT_MAX_SIDE = 1920
private const val NOTES_JPEG_QUALITY = 80 // iOS UIImageJPEGRepresentation(..., 0.8)

/**
 * Copy a picker [Uri] into app cache while the temporary read grant is still valid.
 *
 * Why: gallery / Photo Picker URIs often become unreadable after the picker closes.
 */
fun Context.copyUriToCacheFile(uri: Uri, prefix: String = "note_img"): File {
    val input = contentResolver.openInputStream(uri)
        ?: error("Could not read selected image")
    val ext = contentResolver.getType(uri)?.substringAfter('/')?.takeIf { it.length in 3..4 }
        ?: "img"
    val file = File(cacheDir, "${prefix}_${System.currentTimeMillis()}_${uri.hashCode().toUInt()}.$ext")
    input.use { stream ->
        FileOutputStream(file).use { out -> stream.copyTo(out) }
    }
    check(file.length() > 0L) { "Could not read selected image" }
    return file
}

/**
 * Decode picker URI → JPEG file ≤ ~100KB (iOS product upload parity).
 */
fun Context.uriToProductJpegFile(uri: Uri): File {
    val cache = copyUriToCacheFile(uri, prefix = "product_raw")
    return try {
        fileToProductJpegFile(cache, cacheDir)
    } finally {
        runCatching { cache.delete() }
    }
}

/**
 * Notes path: JPEG @ quality 0.8 like iOS; shrink further if over API 200KB.
 */
fun fileToNotesJpegBytes(file: File): ByteArray {
    val bitmap = decodeBitmapFile(file, maxSide = PRODUCT_MAX_SIDE)
        ?: error("Could not decode selected image")
    return try {
        // Step 1 — same as iOS NoteViewController / PreviewViewController
        var bytes = encodeJpeg(bitmap, NOTES_JPEG_QUALITY)
        if (bytes.size > NOTES_API_MAX_BYTES) {
            // Step 2 — API rejects >200KB after server compress; match product-style budget
            Log.i(TAG, "notes jpeg@0.8=${bytes.size}B > ${NOTES_API_MAX_BYTES}B → compressToTargetSize(${NOTES_TARGET_KB}KB)")
            bytes = compressToTargetSize(
                bitmap = bitmap,
                targetSizeKB = NOTES_TARGET_KB,
                maxDimension = PRODUCT_MAX_SIDE,
            )
        }
        Log.i(TAG, "notes jpeg ready=${bytes.size}B (${bytes.size / 1024}KB)")
        require(bytes.size >= 100) { "Compressed notes image is empty" }
        require(bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()) {
            "Compressed notes image is not a valid JPEG"
        }
        bytes
    } finally {
        bitmap.recycle()
    }
}

/**
 * Decode a local cache [File] (or still-readable content [Uri]) into JPEG bytes for upload.
 * Prefer [fileToNotesJpegBytes] / [fileToProductJpegFile] for clear intent.
 */
fun Context.uriToJpegBytes(
    uri: Uri,
    maxSide: Int = PRODUCT_MAX_SIDE,
    quality: Int = NOTES_JPEG_QUALITY,
    maxBytes: Int = NOTES_API_MAX_BYTES,
): ByteArray {
    val cache = copyUriToCacheFile(uri)
    return try {
        if (maxBytes <= PRODUCT_TARGET_KB * 1024) {
            fileToJpegBytes(cache, maxSide = maxSide, quality = quality, maxBytes = maxBytes)
        } else {
            fileToNotesJpegBytes(cache)
        }
    } finally {
        runCatching { cache.delete() }
    }
}

/**
 * Encode [file] under a byte budget (used by product path and legacy callers).
 */
fun fileToJpegBytes(
    file: File,
    maxSide: Int = PRODUCT_MAX_SIDE,
    quality: Int = NOTES_JPEG_QUALITY,
    maxBytes: Int = NOTES_TARGET_KB * 1024,
): ByteArray {
    val bitmap = decodeBitmapFile(file, maxSide = maxSide)
        ?: error("Could not decode selected image")
    return try {
        val targetKb = (maxBytes / 1024).coerceAtLeast(1)
        // If caller asked for a soft quality-only pass with a large budget, try quality first.
        if (quality in 1..100 && maxBytes >= NOTES_API_MAX_BYTES) {
            val soft = encodeJpeg(bitmap, quality)
            if (soft.size <= maxBytes) return soft
        }
        compressToTargetSize(bitmap, targetSizeKB = targetKb, maxDimension = maxSide)
    } finally {
        bitmap.recycle()
    }
}

/** iOS image search: 20KB, max 1024px, min quality 0.05. Caller owns [bitmap]. */
fun bitmapToImageSearchJpeg(bitmap: Bitmap): ByteArray =
    compressToTargetSize(
        bitmap = bitmap,
        targetSizeKB = 20,
        maxDimension = 1024,
        minQuality = 0.05f,
    )

/** Product path: File already picked — re-encode to ≤100KB JPEG like iOS. */
fun fileToProductJpegFile(source: File, cacheDir: File): File {
    val bitmap = decodeBitmapFile(source, maxSide = PRODUCT_MAX_SIDE)
        ?: error("Could not decode selected image")
    val bytes = try {
        compressToTargetSize(
            bitmap = bitmap,
            targetSizeKB = PRODUCT_TARGET_KB,
            maxDimension = PRODUCT_MAX_SIDE,
        )
    } finally {
        bitmap.recycle()
    }
    Log.i(TAG, "product jpeg ready=${bytes.size}B (${bytes.size / 1024}KB)")
    require(bytes.size >= 100) { "Compressed product image is empty" }
    require(bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte()) {
        "Compressed product image is not a valid JPEG"
    }
    val out = File(cacheDir, "image_0_${System.currentTimeMillis()}.jpg")
    out.writeBytes(bytes)
    return out
}

/**
 * Port of iOS `UIImage.compressToTargetSize(targetSizeKB:maxDimension:minQuality:)`.
 *
 * - Resize if longest side > [maxDimension]
 * - Start JPEG quality at 1.0, drop by 0.05 each pass
 * - When quality hits floor, shrink dimensions ×0.8 (min side 800) up to 5 times
 */
private fun compressToTargetSize(
    bitmap: Bitmap,
    targetSizeKB: Int,
    maxDimension: Int = PRODUCT_MAX_SIDE,
    minQuality: Float = 0.1f,
): ByteArray {
    val targetBytes = targetSizeKB * 1024
    val aggressive = targetSizeKB < 50
    val initialMax = if (aggressive) minOf(maxDimension, 1024) else maxDimension

    var current = scaleDownIfNeeded(bitmap, initialMax)
    var owned = current !== bitmap
    var quality = 1.0f
    var last: ByteArray? = null
    var iterations = 0
    var resizeCount = 0
    val maxIterations = 30
    val maxResizeCount = 5

    try {
        while (iterations < maxIterations) {
            val data = encodeJpeg(current, (quality * 100).toInt().coerceIn(1, 100))
            last = data
            if (data.size <= targetBytes) {
                Log.i(
                    TAG,
                    "✅ compressed ${data.size / 1024}KB (target ${targetSizeKB}KB) " +
                        "after $iterations iters @ q=${(quality * 100).toInt()}%",
                )
                return data
            }
            if (quality > minQuality) {
                quality = (quality - 0.05f).coerceAtLeast(minQuality)
                iterations++
                continue
            }
            if (resizeCount < maxResizeCount) {
                val longest = maxOf(current.width, current.height).toFloat()
                val resizeFactor = if (aggressive) 0.7f else 0.8f
                val minDimension = if (aggressive) 400f else 800f
                if (longest > minDimension) {
                    val nextMax = longest * resizeFactor
                    val scaled = scaleDownIfNeeded(current, nextMax.toInt())
                    if (scaled !== current) {
                        if (owned) current.recycle()
                        current = scaled
                        owned = true
                    }
                    quality = if (aggressive) 0.6f else 0.8f
                    iterations++
                    resizeCount++
                    continue
                }
            }
            Log.w(TAG, "⚠️ best effort ${data.size / 1024}KB (target ${targetSizeKB}KB)")
            return data
        }
        return last ?: error("Could not compress image to JPEG")
    } finally {
        if (owned) current.recycle()
    }
}

private fun scaleDownIfNeeded(bitmap: Bitmap, maxSide: Int): Bitmap {
    val longest = maxOf(bitmap.width, bitmap.height)
    if (longest <= maxSide || maxSide <= 0) return bitmap
    val scale = maxSide.toFloat() / longest
    return Bitmap.createScaledBitmap(
        bitmap,
        (bitmap.width * scale).toInt().coerceAtLeast(1),
        (bitmap.height * scale).toInt().coerceAtLeast(1),
        true,
    )
}

private fun encodeJpeg(bitmap: Bitmap, quality: Int): ByteArray {
    return ByteArrayOutputStream().use { out ->
        check(bitmap.compress(Bitmap.CompressFormat.JPEG, quality.coerceIn(1, 100), out)) {
            "Could not compress image to JPEG"
        }
        out.toByteArray()
    }
}

private fun decodeBitmapFile(file: File, maxSide: Int): Bitmap? {
    val decoded = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        runCatching {
            val source = ImageDecoder.createSource(file)
            ImageDecoder.decodeBitmap(source) { decoder, info, _ ->
                val w = info.size.width.coerceAtLeast(1)
                val h = info.size.height.coerceAtLeast(1)
                val longest = maxOf(w, h)
                if (longest > maxSide) {
                    val sample = (longest + maxSide - 1) / maxSide
                    decoder.setTargetSampleSize(sample.coerceAtLeast(1))
                }
                decoder.isMutableRequired = false
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            }
        }.getOrNull()
    } else {
        decodeStreamSampled(file.readBytes(), maxSide)?.let { applyExifOrientation(file, it) }
    } ?: return null

    // ImageDecoder applies EXIF on API 28+; still clamp size exactly.
    val longest = maxOf(decoded.width, decoded.height)
    if (longest <= maxSide) return decoded
    val scaled = scaleDownIfNeeded(decoded, maxSide)
    if (scaled !== decoded) decoded.recycle()
    return scaled
}

/** Pre-P: BitmapFactory ignores EXIF orientation — rotate like iOS UIImage does. */
private fun applyExifOrientation(file: File, bitmap: Bitmap): Bitmap {
    val orientation = runCatching {
        ExifInterface(file).getAttributeInt(
            ExifInterface.TAG_ORIENTATION,
            ExifInterface.ORIENTATION_NORMAL,
        )
    }.getOrDefault(ExifInterface.ORIENTATION_NORMAL)
    val degrees = when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> 90f
        ExifInterface.ORIENTATION_ROTATE_180 -> 180f
        ExifInterface.ORIENTATION_ROTATE_270 -> 270f
        else -> return bitmap
    }
    val matrix = Matrix().apply { postRotate(degrees) }
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (rotated !== bitmap) bitmap.recycle()
    return rotated
}

private fun decodeStreamSampled(bytes: ByteArray, maxSide: Int): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    val largest = maxOf(bounds.outWidth, bounds.outHeight).coerceAtLeast(1)
    var sample = 1
    while (largest / sample > maxSide * 2) {
        sample *= 2
    }
    val opts = BitmapFactory.Options().apply { inSampleSize = sample }
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opts)
}
