package com.anyrent.pos.data

import com.anyrent.pos.domain.orders.OrderPhotoField
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * URLs of a photo list in an order. Additive and tolerant: a missing or null field, a value that is not a list and null
 * elements all give nothing (`optString` on a JSON null gives the text "null").
 */
internal fun JSONObject.photoUrls(key: String): List<String> {
    val array = optJSONArray(key) ?: return emptyList()
    return (0 until array.length()).mapNotNull { index ->
        (array.opt(index) as? String)?.takeIf { it.isNotBlank() }
    }
}

/** #1418 photos waiting for one order on this device. The folder carries the user and the shop: another login never sees them */
class OrderPhotoQueue(private val root: File, private val now: () -> Long = System::currentTimeMillis) {
    data class Entry(
        val scope: String,
        val orderId: Int,
        val field: OrderPhotoField,
        /** How many photos the order held when these were queued */
        val baseline: Int,
        val files: List<File>,
    )

    private fun folder(scope: String, orderId: Int, field: OrderPhotoField) =
        File(File(root, scope), "${orderId}_${field.apiName}")

    /** Written to a temporary folder and moved, so a crash never leaves half a queue */
    fun enqueue(scope: String, orderId: Int, field: OrderPhotoField, baseline: Int, photos: List<ByteArray>) {
        purgeExpired()
        val target = folder(scope, orderId, field)
        val temp = File(root, ".tmp-${UUID.randomUUID()}")
        check(temp.mkdirs()) { "Could not create $temp" }
        try {
            photos.forEachIndexed { index, bytes -> File(temp, "$index.jpg").writeBytes(bytes) }
            File(temp, MANIFEST).writeText(
                JSONObject()
                    .put("baseline", baseline)
                    .put("count", photos.size)
                    .put("createdAt", now())
                    .toString(),
            )
            target.parentFile?.mkdirs()
            target.deleteRecursively()
            check(temp.renameTo(target)) { "Could not move the photos to $target" }
        } finally {
            temp.deleteRecursively()
        }
    }

    fun entry(scope: String, orderId: Int, field: OrderPhotoField): Entry? {
        val dir = folder(scope, orderId, field)
        val manifest = readManifest(dir) ?: return null
        val files = (0 until manifest.optInt("count")).map { File(dir, "$it.jpg") }.filter(File::exists)
        if (files.isEmpty()) return null
        return Entry(scope, orderId, field, manifest.optInt("baseline"), files)
    }

    fun remove(scope: String, orderId: Int, field: OrderPhotoField) {
        folder(scope, orderId, field).deleteRecursively()
    }

    fun purgeExpired() {
        root.listFiles()?.forEach { scope ->
            scope.listFiles()?.forEach { dir ->
                val createdAt = readManifest(dir)?.optLong("createdAt") ?: return@forEach
                if (now() - createdAt > MAX_AGE_MS) dir.deleteRecursively()
            }
        }
    }

    private fun readManifest(dir: File): JSONObject? =
        runCatching { JSONObject(File(dir, MANIFEST).readText()) }.getOrNull()

    companion object {
        private const val MANIFEST = "manifest.json"
        /** Queues older than this are removed: the user who left them may never log in again */
        const val MAX_AGE_MS = 30L * 24 * 3600 * 1000

        fun scope(userId: Int, merchantId: Int?) = "u${userId}_m${merchantId ?: 0}"
    }
}
