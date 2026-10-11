package com.anyrent.pos.domain

import com.anyrent.pos.ui.inbox.InboxUnread
import com.anyrent.pos.ui.navigation.OrdersChanged
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Duration
import java.time.Instant

/** #674 — reload on re-show only when data changed or got old */
class RefreshPolicyTest {
    private val t0 = Instant.parse("2026-10-08T03:00:00Z")
    private val ttl = Duration.ofMinutes(5)

    @Test
    fun `never loaded reloads`() = assertTrue(RefreshPolicy.shouldReload(false, null, t0, ttl))

    @Test
    fun `dirty reloads even when fresh`() = assertTrue(RefreshPolicy.shouldReload(true, t0, t0, ttl))

    @Test
    fun `fresh and clean does not reload`() =
        assertFalse(RefreshPolicy.shouldReload(false, t0, t0.plusSeconds(299), ttl))

    @Test
    fun `stale reloads at the ttl`() = assertTrue(RefreshPolicy.shouldReload(false, t0, t0.plusSeconds(300), ttl))

    @Test
    fun ttls() {
        assertEquals(Duration.ofMinutes(5), RefreshPolicy.LIST_TTL)
        assertEquals(Duration.ofMinutes(10), RefreshPolicy.SUMMARY_TTL)
    }

    @Test
    fun `tracker load clears dirty, a change makes it dirty`() {
        var version = 0L
        val tracker = RefreshTracker { version }
        assertTrue(tracker.shouldReload(t0, ttl))
        tracker.loaded(tracker.begin(), t0)
        assertFalse(tracker.shouldReload(t0.plusSeconds(10), ttl))
        version++
        assertTrue(tracker.isDirty)
        assertTrue(tracker.shouldReload(t0.plusSeconds(10), ttl))
        tracker.loaded(tracker.begin(), t0.plusSeconds(20))
        assertFalse(tracker.isDirty)
    }

    @Test
    fun `change during a load stays dirty`() {
        var version = 0L
        val tracker = RefreshTracker { version }
        val started = tracker.begin()
        version++
        tracker.loaded(started, t0)
        assertTrue(tracker.isDirty)
    }

    @Test
    fun `an older load does not undo a newer one`() {
        var version = 1L
        val tracker = RefreshTracker { version }
        tracker.loaded(tracker.begin(), t0)
        tracker.loaded(0, t0.plusSeconds(1))
        assertFalse(tracker.isDirty)
    }

    @Test
    fun `orders changed bumps the version`() {
        val before = OrdersChanged.version.value
        OrdersChanged.notifyChanged()
        assertEquals(before + 1, OrdersChanged.version.value)
    }

    @Test
    fun `unread badge asks again when stale, after a push or for another account`() {
        InboxUnread.set(3, owner = 1, at = t0)
        assertEquals(3, InboxUnread.count.value)
        assertFalse(InboxUnread.needsFetch(owner = 1, now = t0.plusSeconds(9 * 60)))
        assertTrue(InboxUnread.needsFetch(owner = 1, now = t0.plusSeconds(10 * 60)))
        assertTrue("another account", InboxUnread.needsFetch(owner = 2, now = t0))
        InboxUnread.invalidate()
        assertTrue("after a push", InboxUnread.needsFetch(owner = 1, now = t0))
    }
}
