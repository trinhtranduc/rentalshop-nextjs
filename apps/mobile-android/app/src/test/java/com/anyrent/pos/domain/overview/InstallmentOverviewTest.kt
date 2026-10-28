package com.anyrent.pos.domain.overview

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #1199 — the overview reads deposit stages apart from the revenue figures; old payloads are unchanged */
class InstallmentOverviewTest {
    private val period = """
        {"revenue":{"collected":5000000},"series":[
          {"date":"2026-11-11","collected":0,"expectedCollected":3600000,"futureInstallments":[{"dueDateKey":"2026-11-11","amount":4800000,"count":1}]},
          {"date":"2026-11-12","collected":0,"expectedCollected":0,"futureInstallments":[{"dueDateKey":"2026-11-12","amount":1200000,"count":2}]},
          {"date":"2026-11-13","collected":0}]}
    """.trimIndent()

    @Test
    fun `future installments are summed on their own and never added to the forecast`() {
        val report = OverviewLogic.reportFromJson(JSONObject(period))
        assertEquals(6_000_000.0 to 3, report.futureInstallmentsTotal)
        assertEquals(3_600_000.0, report.series[0].expectedCollected!!, 0.0)
        assertNull(report.series[2].futureInstallments)
    }

    @Test
    fun `an older period payload has no installments`() {
        val report = OverviewLogic.reportFromJson(JSONObject("""{"revenue":{"collected":1},"series":[{"date":"2026-11-11","collected":1}]}"""))
        assertEquals(0.0 to 0, report.futureInstallmentsTotal)
    }

    @Test
    fun `now figures carry the reminders only when the API sends them`() {
        assertNull(OverviewLogic.nowFromJson(JSONObject("""{"overdueReturns":{"count":2}}""")).installments)
        val now = OverviewLogic.nowFromJson(
            JSONObject(
                """{"overdueReturns":{"count":2},"installmentsDue":{"count":1,"orders":[{"orderId":3,"orderNumber":"111111","key":"i2","label":"Lần 2","amount":4800000,"lateDays":0}]},
                   "installmentsOverdue":{"count":0,"orders":[]},"installmentsDueTomorrow":{"count":0,"orders":[]}}""",
            ),
        )
        assertEquals(2, now.lateReturns)
        assertEquals(listOf(3), now.installments!!.due.map { it.orderId })
    }

    @Test
    fun `a collected stage has its own reason`() {
        assertEquals(EventReason.INSTALLMENT, EventReason.forType("RENT_INSTALLMENT", 3_600_000.0))
    }
}
