package com.anyrent.pos.data

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized
import java.time.LocalDate
import java.util.TimeZone

/**
 * #413 / #602: the cart sends the chosen days as the shop zone's (Vietnam) day boundaries, whatever the phone
 * zone, the same instants iOS sends (`CartV2Logic.rentalBounds`, #601).
 */
@RunWith(Parameterized::class)
class CartPlanDatesTest(
    private val zone: String,
    private val pickupOct4: String,
    private val returnOct5: String,
    private val returnDec31: String,
) {
    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun zones(): List<Array<String>> = listOf(
            arrayOf(
                "Asia/Ho_Chi_Minh",
                "2026-10-03T17:00:00.000Z",
                "2026-10-05T16:59:59.000Z",
                "2026-12-31T16:59:59.000Z",
            ),
            // #602: the shop zone (Vietnam) whatever the phone zone
            arrayOf("UTC", "2026-10-03T17:00:00.000Z", "2026-10-05T16:59:59.000Z", "2026-12-31T16:59:59.000Z"),
            arrayOf("Asia/Tokyo", "2026-10-03T17:00:00.000Z", "2026-10-05T16:59:59.000Z", "2026-12-31T16:59:59.000Z"),
            arrayOf("America/Los_Angeles", "2026-10-03T17:00:00.000Z", "2026-10-05T16:59:59.000Z", "2026-12-31T16:59:59.000Z"),
        )
    }

    private lateinit var savedZone: TimeZone

    @Before
    fun setUp() {
        savedZone = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone(zone))
        CartStore.clear(persistToDisk = false)
    }

    @After
    fun tearDown() {
        CartStore.clear(persistToDisk = false)
        TimeZone.setDefault(savedZone)
    }

    @Test
    fun `pickup and return are the start and the last second of the chosen Vietnam days`() {
        CartStore.setPickup(LocalDate.of(2026, 10, 4))
        CartStore.setReturn(LocalDate.of(2026, 10, 5))

        assertEquals(pickupOct4, CartStore.isoPickup())
        assertEquals(returnOct5, CartStore.isoReturn())
    }

    @Test
    fun `same day rental keeps the whole day and a year end return stays in that year`() {
        CartStore.setPickup(LocalDate.of(2026, 10, 4))
        CartStore.setReturn(LocalDate.of(2026, 10, 4))
        assertEquals(pickupOct4, CartStore.isoPickup())
        assertEquals(returnOct5.replace("2026-10-05", "2026-10-04"), CartStore.isoReturn())

        CartStore.setReturn(LocalDate.of(2026, 12, 31))
        assertEquals(returnDec31, CartStore.isoReturn())
    }
}
