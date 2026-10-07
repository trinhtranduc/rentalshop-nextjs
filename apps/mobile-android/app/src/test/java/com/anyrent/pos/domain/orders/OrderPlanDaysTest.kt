package com.anyrent.pos.domain.orders

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.time.LocalDate
import java.util.TimeZone

/** #413 / #602: reading an order back into the cart uses the shop zone (Vietnam), the zone the cart sends in. */
@RunWith(Parameterized::class)
class OrderPlanDaysTest(private val zone: String) {
    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun zones(): List<String> = listOf("Asia/Ho_Chi_Minh", "UTC", "Asia/Tokyo", "America/Los_Angeles")
    }

    private lateinit var savedZone: TimeZone

    @Before
    fun setUp() {
        savedZone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone(zone))
    }

    @After
    fun tearDown() {
        TimeZone.setDefault(savedZone)
    }

    @Test
    fun `sent instants read back as the chosen days`() {
        listOf(
            LocalDate.of(2026, 10, 4),
            LocalDate.of(2026, 10, 31),
            LocalDate.of(2026, 12, 31),
            LocalDate.of(2027, 1, 1),
        ).forEach { day ->
            assertEquals(day, OrderPlanDays.dayOf(OrderPlanDays.pickupInstant(day)))
            assertEquals(day, OrderPlanDays.dayOf(OrderPlanDays.returnInstant(day)))
        }
    }

    @Test
    fun `instants around Vietnam midnight fall on the Vietnam day`() {
        assertEquals(LocalDate.of(2026, 10, 4), OrderPlanDays.dayOf("2026-10-04T16:59:59.000Z"))
        val after = LocalDate.of(2026, 10, 5)
        assertEquals(after, OrderPlanDays.dayOf("2026-10-04T17:00:00Z"))
        assertEquals(after, OrderPlanDays.dayOf("2026-10-05T00:00:00+07:00"))
    }

    @Test
    fun `an iOS order loads on its days instead of the UTC day before`() {
        // iOS in Vietnam books 04/10 → 05/10 as these instants
        val pickup = OrderPlanDays.dayOf("2026-10-03T17:00:00.000Z")
        val expected = LocalDate.of(2026, 10, 4)
        assertEquals(expected, pickup)
    }

    @Test
    fun `plain day keys and blanks`() {
        assertEquals(LocalDate.of(2026, 10, 5), OrderPlanDays.dayOf("2026-10-05"))
        assertEquals(LocalDate.of(2026, 10, 5), OrderPlanDays.dayOf("2026-10-05 00:00:00"))
        assertNull(OrderPlanDays.dayOf(null))
        assertNull(OrderPlanDays.dayOf("  "))
    }
}
