package com.anyrent.pos.domain.notifications

import com.anyrent.pos.data.model.InboxNotification
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.ui.common.formatDayShort
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.Instant
import java.util.Locale
import java.util.TimeZone

/** #477 — new inbox (Vietnam day groups, type tiles, unread style) and note editor photo rules. Same table as iOS. */
class NotificationsLogicTest {
    private var savedZone: TimeZone? = null

    // The device zone must not matter: run as if the phone were on UTC
    @Before fun setUp() { savedZone = TimeZone.getDefault(); TimeZone.setDefault(TimeZone.getTimeZone("UTC")) }
    @After fun tearDown() { TimeZone.setDefault(savedZone) }

    private fun item(id: Int, createdAt: String?, type: String = "ORDER_CREATED", status: String? = null, isRead: Boolean = false) =
        InboxNotification(id, "T$id", "B$id", type, isRead, createdAt, id, status)

    // Day groups

    @Test fun vietnamMidnightSplitsGroupsAt17Utc() {
        val groups = NotificationsLogic.groups(
            listOf(item(2, "2026-10-04T17:00:00Z"), item(1, "2026-10-04T16:59:59Z")),
            now = Instant.parse("2026-10-05T03:00:00Z"),
        )
        assertEquals(listOf("2026-10-05", "2026-10-04"), groups.map { it.key })
        assertEquals(listOf(listOf(2), listOf(1)), groups.map { g -> g.items.map { it.id } })
    }

    @Test fun todayYesterdayAndOlderWords() {
        val groups = NotificationsLogic.groups(
            listOf(
                item(3, "2026-10-05T02:12:00Z"),
                item(2, "2026-10-04T11:30:00Z"),
                item(1, "2026-10-02T09:00:00.000Z"),
            ),
            now = Instant.parse("2026-10-05T03:00:00Z"),
        )
        assertEquals(listOf(DayWord.TODAY, DayWord.YESTERDAY, DayWord.NONE), groups.map { it.word })
        val labels = groups.map { g ->
            formatDayShort(g.day!!.atTime(12, 0).atZone(NotificationsLogic.zone).toInstant(), NotificationsLogic.zone, Locale.forLanguageTag("vi"))
        }
        assertEquals(listOf("T2 05/10", "CN 04/10", "T6 02/10"), labels)
    }

    @Test fun todayFollowsVietnamDayNotUtc() {
        // 18:00Z on 04/10 is 01:00 on 05/10 in Vietnam: an item at 17:30Z is today
        val groups = NotificationsLogic.groups(listOf(item(1, "2026-10-04T17:30:00Z")), now = Instant.parse("2026-10-04T18:00:00Z"))
        assertEquals("2026-10-05", groups.single().key)
        assertEquals(DayWord.TODAY, groups.single().word)
    }

    @Test fun unreadableDateJoinsPreviousGroup() {
        val groups = NotificationsLogic.groups(
            listOf(item(2, "2026-10-05T02:00:00Z"), item(1, null), item(0, "bad")),
            now = Instant.parse("2026-10-05T03:00:00Z"),
        )
        assertEquals(1, groups.size)
        assertEquals(listOf(2, 1, 0), groups.single().items.map { it.id })
    }

    @Test fun timeIsVietnamClock() {
        assertEquals("09:12", NotificationsLogic.time("2026-10-05T02:12:00Z"))
        assertEquals("23:59", NotificationsLogic.time("2026-10-04T16:59:59Z"))
        assertEquals("00:00", NotificationsLogic.time("2026-10-04T17:00:00.000Z"))
        assertEquals("", NotificationsLogic.time(null))
    }

    // Type → tile

    @Test fun kindMapping() {
        assertEquals(NotificationKind.ORDER, NotificationsLogic.kind("ORDER_CREATED", "RESERVED"))
        assertEquals(NotificationKind.HAND_OVER, NotificationsLogic.kind("ORDER_STATUS_CHANGED", "PICKUPED"))
        assertEquals(NotificationKind.RETURNED, NotificationsLogic.kind("ORDER_STATUS_CHANGED", "RETURNED"))
        assertEquals(NotificationKind.PAYMENT, NotificationsLogic.kind("ORDER_STATUS_CHANGED", "COMPLETED"))
        assertEquals(NotificationKind.NEUTRAL, NotificationsLogic.kind("ORDER_STATUS_CHANGED", "CANCELLED"))
        assertEquals(NotificationKind.ORDER, NotificationsLogic.kind("ORDER_STATUS_CHANGED", "RESERVED"))
        assertEquals(NotificationKind.ORDER, NotificationsLogic.kind("ORDER_STATUS_CHANGED", null))
        assertEquals(NotificationKind.PAYMENT, NotificationsLogic.kind("PAYMENT_RECEIVED", null))
        assertEquals(NotificationKind.LATE, NotificationsLogic.kind("ORDER_OVERDUE", null))
        assertEquals(NotificationKind.LATE, NotificationsLogic.kind("RETURN_LATE", null))
        assertEquals(NotificationKind.HAND_OVER, NotificationsLogic.kind("HANDOVER_DUE", null))
        assertEquals(NotificationKind.NEUTRAL, NotificationsLogic.kind("SOMETHING_NEW", null))
        assertEquals(NotificationKind.NEUTRAL, NotificationsLogic.kind("", null))
    }

    // Unread styling

    @Test fun unreadAndReadRowStyle() {
        val unread = NotificationsLogic.rowStyle(isRead = false)
        assertTrue(unread.titleBold)
        assertEquals(0xFF0F172A, unread.titleArgb)
        assertEquals(0xFFF8FBFF, unread.backgroundArgb)
        assertTrue(unread.showsDot)

        val read = NotificationsLogic.rowStyle(isRead = true)
        assertFalse(read.titleBold)
        assertEquals(0xFF334155, read.titleArgb)
        assertEquals(0xFFFFFFFF, read.backgroundArgb)
        assertFalse(read.showsDot)
    }

    // Note editor photos

    @Test fun photoLimitIsFive() {
        assertEquals(5, OrderDetailLogic.MAX_NOTE_PHOTOS)
        assertTrue(NoteEditorLogic.canAdd(0))
        assertTrue(NoteEditorLogic.canAdd(4))
        assertFalse(NoteEditorLogic.canAdd(5))
        assertFalse(NoteEditorLogic.canAdd(6))
        assertEquals(3, NoteEditorLogic.remaining(2))
        assertEquals(0, NoteEditorLogic.remaining(7))
    }

    @Test fun cartEditorHasNoPhotos() {
        assertFalse(NoteEditorLogic.canAdd(0, max = 0))
        assertEquals(0, NoteEditorLogic.remaining(0, max = 0))
    }

    @Test fun titleSuffixIsShortCode() {
        assertEquals("#0057", NoteEditorLogic.titleSuffix("ORD-3-0057"))
        assertEquals("#1234", NoteEditorLogic.titleSuffix("1234"))
        assertNull(NoteEditorLogic.titleSuffix(null))
        assertNull(NoteEditorLogic.titleSuffix(""))
    }
}
