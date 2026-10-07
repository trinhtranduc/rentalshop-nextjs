package com.anyrent.pos.domain.overview

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** #633 — Top sản phẩm / Top khách hàng rows: 5 on the card, 50 on "Xem tất cả", bar against the first row */
class OverviewTopLogicTest {
    private val range = DayRange(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 7))
    private fun products(n: Int) = (1..n).map {
        OverviewReport.TopProduct(id = it, name = "P$it", rentalCount = it, totalRevenue = (1000 - it).toDouble(), image = null)
    }

    private fun customers(n: Int) = (1..n).map {
        OverviewReport.TopCustomer(id = it, name = "C$it", orderCount = it, totalSpent = (500 - it).toDouble())
    }

    @Test
    fun cardKeepsFiveRowsAndViewAllKeepsFifty() {
        assertEquals(5, OverviewLogic.TOP_LIMIT)
        assertEquals(50, OverviewLogic.TOP_ALL_LIMIT)
        assertEquals(5, OverviewLogic.topProductRows(products(60)).size)
        assertEquals(50, OverviewLogic.topProductRows(products(60), OverviewLogic.TOP_ALL_LIMIT).size)
        assertEquals(5, OverviewLogic.topCustomerRows(customers(60)).size)
        assertEquals(50, OverviewLogic.topCustomerRows(customers(60), OverviewLogic.TOP_ALL_LIMIT).size)
        assertEquals(3, OverviewLogic.topProductRows(products(3), OverviewLogic.TOP_ALL_LIMIT).size)
        // API order is kept
        assertEquals(listOf("P1", "P2", "P3"), OverviewLogic.topProductRows(products(3)).map { it.name })
    }

    @Test
    fun ratioIsAgainstTheFirstRow() {
        val rows = OverviewLogic.topProductRows(
            listOf(
                OverviewReport.TopProduct(7, "A", 4, 200.0, "img"),
                OverviewReport.TopProduct(null, "B", 2, 50.0, null),
                OverviewReport.TopProduct(9, "C", 1, -10.0, null),
            ),
        )
        assertEquals(listOf(1.0, 0.25, 0.0), rows.map { it.ratio })
        assertEquals(OverviewTopRow(7, "A", 200.0, 4, 1.0, "img"), rows[0])
        assertNull(rows[1].id)

        val hidden = OverviewLogic.topCustomerRows(listOf(OverviewReport.TopCustomer(1, "X", 3, null)))
        assertEquals(OverviewTopRow(1, "X", 0.0, 3, 0.0), hidden.single())
        assertTrue(OverviewLogic.topCustomerRows(emptyList()).isEmpty())
    }

    @Test
    fun requestAsksFiveForTheCardAndFiftyForViewAll() {
        val zone = "Asia%2FHo_Chi_Minh"
        assertEquals(
            "/api/analytics/period?startDate=2026-10-01&endDate=2026-10-07&groupBy=day&limit=5&timeZone=$zone",
            OverviewLogic.periodPath(range),
        )
        assertEquals(
            "/api/analytics/period?startDate=2026-10-01&endDate=2026-10-07&groupBy=day&limit=50&timeZone=$zone",
            OverviewLogic.periodPath(range, OverviewLogic.TOP_ALL_LIMIT),
        )
    }

    @Test
    fun parsesTopCustomersAndPicksTheKind() {
        val report = OverviewLogic.reportFromJson(
            JSONObject(
                """{"topProducts":[{"id":1,"name":"P","rentalCount":2,"totalRevenue":100}],
                "topCustomers":[{"id":4,"name":"Lan","orderCount":3,"totalSpent":900},{"name":null,"totalSpent":null}]}""",
            ),
        )
        assertEquals(
            listOf(OverviewReport.TopCustomer(4, "Lan", 3, 900.0), OverviewReport.TopCustomer(null, "", 0, null)),
            report.topCustomers,
        )
        assertEquals(listOf("Lan", ""), OverviewLogic.topRows(report, OverviewTopKind.CUSTOMERS).map { it.name })
        assertEquals(listOf("P"), OverviewLogic.topRows(report, OverviewTopKind.PRODUCTS).map { it.name })
        assertTrue(OverviewLogic.reportFromJson(JSONObject("{}")).topCustomers.isEmpty())
        assertEquals(OverviewTopKind.CUSTOMERS, OverviewTopKind.from("customers"))
        assertEquals(OverviewTopKind.PRODUCTS, OverviewTopKind.from("bogus"))
    }
}
