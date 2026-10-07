package com.anyrent.pos.domain

import com.anyrent.pos.data.CartStore
import com.anyrent.pos.domain.calendar.CalendarLogic
import com.anyrent.pos.domain.orders.OrderPlanDays
import com.anyrent.pos.domain.orders.RentalExtension
import com.anyrent.pos.domain.overview.DayRange
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.ui.orders.v2.DateRangeChoice
import com.anyrent.pos.ui.orders.v2.OrdersBoardLogic
import com.anyrent.pos.ui.orders.v2.RentOrdersFilter
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.net.URLEncoder
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.TimeZone

/**
 * #602 live-system guarantee (spec F4): a phone set to Vietnam sends byte-identical requests to the build before
 * this change. The "before" values are the old formulas (device zone = `ZoneId.systemDefault()`), copied here.
 */
class VietnamPhoneSameRequestsTest {
    private lateinit var saved: TimeZone
    private val wire = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

    private val days: List<LocalDate> = listOf(
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 28), LocalDate.of(2026, 10, 9), LocalDate.of(2026, 10, 10),
        LocalDate.of(2026, 10, 31), LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31), LocalDate.of(2027, 1, 1),
    )
    private val instants: List<Instant> = listOf(
        "2026-10-09T16:59:59Z", "2026-10-09T17:00:00Z", "2026-10-31T16:59:59Z", "2026-10-31T17:00:00Z",
        "2026-12-31T16:59:59Z", "2026-12-31T17:00:00Z", "2026-10-10T05:00:00Z",
    ).map(Instant::parse)

    @Before
    fun setUp() {
        saved = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"))
        CartStore.clear(persistToDisk = false)
    }

    @After
    fun tearDown() {
        CartStore.clear(persistToDisk = false)
        TimeZone.setDefault(saved)
    }

    private fun oldPickup(day: LocalDate) = wire.format(day.atStartOfDay(ZoneId.systemDefault()).toInstant())
    private fun oldReturn(day: LocalDate) =
        wire.format(day.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().minusSeconds(1))
    private fun oldZoneParam() = URLEncoder.encode(ZoneId.systemDefault().id, "UTF-8")

    @Test
    fun `cart, availability and extension instants are unchanged`() {
        days.forEach { day ->
            assertEquals(oldPickup(day), OrderPlanDays.pickupInstant(day))
            assertEquals(oldReturn(day), OrderPlanDays.returnInstant(day))
            assertEquals(oldReturn(day), RentalExtension.returnPlanAt(day))
            CartStore.setPickup(day)
            CartStore.setReturn(day.plusDays(2))
            assertEquals(oldPickup(day), CartStore.isoPickup())
            assertEquals(oldReturn(day.plusDays(2)), CartStore.isoReturn())
        }
    }

    @Test
    fun `rent list date keys are unchanged`() {
        listOf(DateRangeChoice.Today, DateRangeChoice.Next7Days, DateRangeChoice.ThisMonth).forEach { range ->
            instants.forEach { now ->
                val today = now.atZone(ZoneId.systemDefault()).toLocalDate()
                val (start, end) = when (range) {
                    DateRangeChoice.Today -> today to today
                    DateRangeChoice.Next7Days -> today to today.plusDays(6)
                    else -> today.withDayOfMonth(1) to today.withDayOfMonth(today.lengthOfMonth())
                }
                val query = OrdersBoardLogic.rentQuery(RentOrdersFilter(range = range), now = now)
                assertEquals(start.toString(), query.startDate)
                assertEquals(end.toString(), query.endDate)
            }
        }
    }

    @Test
    fun `calendar, overview and today work paths are unchanged`() {
        val zone = oldZoneParam()
        assertEquals(
            "/api/calendar/orders/count?month=10&year=2026&timeZone=$zone",
            CalendarLogic.monthCountPath(YearMonth.of(2026, 10)),
        )
        assertEquals(
            "/api/calendar/orders/by-date?date=2026-10-10&timeZone=$zone&limit=200",
            CalendarLogic.dayPath("2026-10-10"),
        )
        assertEquals(
            "/api/analytics/period?startDate=2026-10-01&endDate=2026-10-31&groupBy=day&limit=3&timeZone=$zone",
            OverviewLogic.periodPath(DayRange(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31))),
        )
        assertEquals("/api/analytics/outlet-operations?timeZone=$zone", OverviewLogic.outletOperationsPath())
    }

    @Test
    fun `read back days and today are unchanged`() {
        instants.forEach { instant ->
            assertEquals(instant.atZone(ZoneId.systemDefault()).toLocalDate(), OrderPlanDays.dayOf(instant.toString()))
            assertEquals(instant.atZone(ZoneId.systemDefault()).toLocalDate(), ShopTime.today(instant))
        }
    }
}
