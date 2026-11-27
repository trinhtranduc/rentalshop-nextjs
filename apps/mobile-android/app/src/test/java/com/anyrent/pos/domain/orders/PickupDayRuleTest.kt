package com.anyrent.pos.domain.orders

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/**
 * #1685 / #1684: no new rental for a day before today. Cases of `.agent/changes/1684-no-past-orders/spec.md`, with
 * today = 27/11/2026 in Vietnam. Every case runs with the JVM zone on Vietnam and on zones that are not Vietnam
 * (UTC, Los Angeles, Tokyo): the answer is the same.
 */
class PickupDayRuleTest {
    private val original: TimeZone = TimeZone.getDefault()
    private val zones = listOf("Asia/Ho_Chi_Minh", "UTC", "America/Los_Angeles", "Asia/Tokyo")

    // 2026-11-27 00:30 Vietnam = 2026-11-26 17:30 UTC
    private val nowHcmEarly = Instant.parse("2026-11-26T17:30:00Z")
    // 2026-11-27 23:59 Vietnam = 2026-11-27 16:59 UTC
    private val nowHcmLate = Instant.parse("2026-11-27T16:59:00Z")
    private val today = LocalDate.parse("2026-11-27")

    @After fun restoreZone() = TimeZone.setDefault(original)

    private fun inEveryZone(check: () -> Unit) = zones.forEach { id ->
        TimeZone.setDefault(TimeZone.getTimeZone(id))
        try { check() } catch (e: AssertionError) { throw AssertionError("zone $id: ${e.message}", e) }
    }

    @Test fun yesterdayIsBlocked() = inEveryZone {
        assertTrue(PickupDayRule.isPast(LocalDate.parse("2026-11-26"), today))
        assertTrue(PickupDayRule.isPast(Instant.parse("2026-11-25T17:00:00Z"), nowHcmEarly)) // 26/11 00:00 VN
    }

    @Test fun todayIsAllowedWhateverTheHour() = inEveryZone {
        assertFalse(PickupDayRule.isPast(today, today))
        // the hour has passed (00:30 pickup asked at 23:59) and it is still today
        assertFalse(PickupDayRule.isPast(Instant.parse("2026-11-26T17:30:00Z"), nowHcmLate))
    }

    @Test fun todayAt0030VietnamIsAllowedEvenThoughItIs26thInUtc() = inEveryZone {
        // spec row "26/11 17:30 UTC = 27/11 00:30 VN": the Vietnam day counts, not the UTC day
        assertFalse(PickupDayRule.isPast(Instant.parse("2026-11-26T17:30:00Z"), nowHcmEarly))
        assertFalse(PickupDayRule.isPast(Instant.parse("2026-11-26T17:30:00Z"), nowHcmLate))
    }

    @Test fun tomorrowIsAllowed() = inEveryZone {
        assertFalse(PickupDayRule.isPast(LocalDate.parse("2026-11-28"), today))
        assertFalse(PickupDayRule.isPast(Instant.parse("2026-11-27T17:00:00Z"), nowHcmLate)) // 28/11 00:00 VN
    }

    @Test fun at2359VietnamYesterdayIsBlocked() = inEveryZone {
        // 26/11 23:59 VN = 16:59 UTC; "now" is 27/11 00:30 VN
        assertTrue(PickupDayRule.isPast(Instant.parse("2026-11-26T16:59:00Z"), nowHcmEarly))
        // the instant just after VN midnight is today
        assertFalse(PickupDayRule.isPast(Instant.parse("2026-11-26T17:00:00Z"), nowHcmEarly))
    }

    @Test fun todayIsTheVietnamDayNotThePhoneDay() = inEveryZone {
        // default argument: today comes from ShopTime (Vietnam), so the rule never reads the JVM zone
        val minDay = PickupDayRule.minPickupDay(editing = false)
        assertEquals(com.anyrent.pos.domain.ShopTime.today(), minDay)
    }

    @Test fun editingAnOrderHasNoMinimum() = inEveryZone {
        assertNull(PickupDayRule.minPickupDay(editing = true, today = today))
        assertEquals(today, PickupDayRule.minPickupDay(editing = false, today = today))
    }

    @Test fun aCartMustAskDaysAgainOnlyForANewRentalWithAPastPickup() = inEveryZone {
        val past = LocalDate.parse("2026-11-26")
        assertTrue(PickupDayRule.mustAskDaysAgain(isSale = false, editing = false, datesChosen = true, pickup = past, today = today))
        assertFalse(PickupDayRule.mustAskDaysAgain(isSale = false, editing = false, datesChosen = true, pickup = today, today = today))
        assertFalse(PickupDayRule.mustAskDaysAgain(isSale = true, editing = false, datesChosen = true, pickup = past, today = today))
        assertFalse(PickupDayRule.mustAskDaysAgain(isSale = false, editing = true, datesChosen = true, pickup = past, today = today))
        assertFalse(PickupDayRule.mustAskDaysAgain(isSale = false, editing = false, datesChosen = false, pickup = past, today = today))
    }
}
