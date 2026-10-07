package com.anyrent.pos.domain.notifications

import com.anyrent.pos.data.model.InboxNotification
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId

/** What a notification is about; picks the icon tile (#477, board TB-thong-bao). Same table as iOS. */
enum class NotificationKind { ORDER, HAND_OVER, LATE, RETURNED, PAYMENT, NEUTRAL }

/** Which day words go before the date of a group */
enum class DayWord { TODAY, YESTERDAY, NONE }

data class NotificationDayGroup(
    /** `yyyy-MM-dd` Vietnam civil day */
    val key: String,
    val day: LocalDate?,
    val word: DayWord,
    val items: List<InboxNotification>,
)

/** Unread: bold dark title, blue dot, very light blue row. Read: medium slate title, white row. */
data class NotificationRowStyle(
    val titleBold: Boolean,
    val titleArgb: Long,
    val backgroundArgb: Long,
    val showsDot: Boolean,
)

object NotificationsLogic {
    /** Days of the inbox are Vietnam civil days (timezone-dates rule 8) */
    val zone: ZoneId get() = com.anyrent.pos.domain.ShopTime.zone

    /** The API sends `ORDER_CREATED` and `ORDER_STATUS_CHANGED` (+ `data.status`). Future types are matched by name. */
    fun kind(type: String, status: String?): NotificationKind {
        val t = type.uppercase()
        if ("PAYMENT" in t) return NotificationKind.PAYMENT
        if ("OVERDUE" in t || "LATE" in t) return NotificationKind.LATE
        if ("HANDOVER" in t || "PICKUP_DUE" in t) return NotificationKind.HAND_OVER
        if (t == "ORDER_CREATED") return NotificationKind.ORDER
        if (t == "ORDER_STATUS_CHANGED") {
            return when (status?.uppercase()) {
                "PICKUPED" -> NotificationKind.HAND_OVER
                "RETURNED" -> NotificationKind.RETURNED
                "COMPLETED" -> NotificationKind.PAYMENT
                "CANCELLED" -> NotificationKind.NEUTRAL
                else -> NotificationKind.ORDER
            }
        }
        return NotificationKind.NEUTRAL
    }

    fun rowStyle(isRead: Boolean): NotificationRowStyle =
        if (isRead) NotificationRowStyle(false, 0xFF334155, 0xFFFFFFFF, false)
        else NotificationRowStyle(true, 0xFF0F172A, 0xFFF8FBFF, true)

    fun instant(createdAt: String?): Instant? =
        createdAt?.let { runCatching { OffsetDateTime.parse(it).toInstant() }.getOrNull() }

    /**
     * Consecutive notifications of one Vietnam day, in the order received (the API sends newest first).
     * A notification without a readable date joins the group before it (or a "" group at the top).
     */
    fun groups(items: List<InboxNotification>, now: Instant = Instant.now()): List<NotificationDayGroup> {
        val today = now.atZone(zone).toLocalDate()
        val order = mutableListOf<String>()
        val buckets = mutableMapOf<String, MutableList<InboxNotification>>()
        var lastKey = ""
        items.forEach { item ->
            val key = instant(item.createdAt)?.atZone(zone)?.toLocalDate()?.toString() ?: lastKey
            buckets.getOrPut(key) { order += key; mutableListOf() }.add(item)
            lastKey = key
        }
        return order.map { key ->
            val day = runCatching { LocalDate.parse(key) }.getOrNull()
            val word = when (day) {
                null -> DayWord.NONE
                today -> DayWord.TODAY
                today.minusDays(1) -> DayWord.YESTERDAY
                else -> DayWord.NONE
            }
            NotificationDayGroup(key, day, word, buckets.getValue(key))
        }
    }

    /** "09:12" in Vietnam time, matching the day group */
    fun time(createdAt: String?): String {
        val local = instant(createdAt)?.atZone(zone) ?: return ""
        return "%02d:%02d".format(local.hour, local.minute)
    }
}

/** Photo rules of the note editor (#477): at most [com.anyrent.pos.domain.orders.OrderDetailLogic.MAX_NOTE_PHOTOS] */
object NoteEditorLogic {
    private const val MAX = com.anyrent.pos.domain.orders.OrderDetailLogic.MAX_NOTE_PHOTOS

    fun canAdd(count: Int, max: Int = MAX): Boolean = max > 0 && count < max

    /** How many photos a pick may still add */
    fun remaining(count: Int, max: Int = MAX): Int = (max - count).coerceAtLeast(0)

    /** "#0057" after "Ghi chú"; null without an order number (cart) */
    fun titleSuffix(orderNumber: String?): String? =
        orderNumber?.takeIf { it.isNotEmpty() }?.let { "#" + (it.substringAfterLast('-').ifEmpty { it }) }
}
