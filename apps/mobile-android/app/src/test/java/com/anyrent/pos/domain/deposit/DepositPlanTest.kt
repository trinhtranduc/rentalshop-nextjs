package com.anyrent.pos.domain.deposit

import com.anyrent.pos.domain.money.ShopCurrency
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1199 — staged deposits: the golden numbers of the spec, the old and new payloads, requests and roles (iOS `DepositPlanTests`) */
class DepositPlanTest {
    private val vnd = ShopCurrency.VND
    private val thirtyFortyRest = listOf(
        DepositStageDraft("Cọc giữ chỗ", 30.0, DepositDueRule.onCreate),
        DepositStageDraft("Cọc trước ngày lấy", 40.0, DepositDueRule.beforePickup(3)),
    )

    @Test
    fun `golden 12 million with 30 and 40 percent gives 3_6M 4_8M 3_6M`() {
        val stages = DepositPlanMath.stages(thirtyFortyRest, 12_000_000.0, "2026-10-25", "2026-11-14", vnd, "Phần còn lại")
        assertEquals(listOf(3_600_000.0, 4_800_000.0, 3_600_000.0), stages.map { it.amount })
        assertEquals(listOf("i1", "i2", "rest"), stages.map { it.key })
        assertEquals(listOf("2026-10-25", "2026-11-11", "2026-11-14"), stages.map { it.dueDateKey })
        assertEquals(listOf(30.0, 40.0, 30.0), stages.map { it.percent })
        assertTrue(stages.last().isRest)
        assertEquals(12_000_000.0, stages.sumOf { it.amount }, 0.0)
        assertFalse(DepositPlanMath.exceedsTotal(stages, 12_000_000.0))
    }

    @Test
    fun `rest takes the difference so the stages always add up`() {
        val stages = DepositPlanMath.stages(listOf(DepositStageDraft("A", 33.33, DepositDueRule.onCreate)), 100_001.0, "2026-10-25", "2026-10-30", vnd, "rest")
        assertEquals(33_330.0, stages[0].amount, 0.0)
        assertEquals(66_671.0, stages[1].amount, 0.0)
        assertEquals(100_001.0, stages.sumOf { it.amount }, 0.0)
    }

    @Test
    fun `percent is the template one until the amount is edited (1245)`() {
        val plain = DepositPlanMath.stages(listOf(DepositStageDraft("A", 30.0, DepositDueRule.onCreate)), 128.0, "2026-10-25", "2026-10-30", vnd, "rest")
        assertEquals(38.0, plain[0].amount, 0.0)
        assertEquals(30.0, plain[0].percent, 0.0)
        val edited = DepositPlanMath.stages(listOf(DepositStageDraft("A", 30.0, DepositDueRule.onCreate, amountOverride = 38.0)), 128.0, "2026-10-25", "2026-10-30", vnd, "rest")
        assertEquals(29.7, edited[0].percent, 0.0)
    }

    @Test
    fun `an owner amount replaces the percentage and can exceed the total`() {
        val drafts = listOf(DepositStageDraft("A", 30.0, DepositDueRule.onCreate, amountOverride = 13_000_000.0))
        val stages = DepositPlanMath.stages(drafts, 12_000_000.0, "2026-10-25", "2026-11-14", vnd, "rest")
        assertEquals(13_000_000.0, stages[0].amount, 0.0)
        assertEquals(0.0, stages[1].amount, 0.0)
        assertTrue(DepositPlanMath.exceedsTotal(stages, 12_000_000.0))
    }

    @Test
    fun `USD keeps two decimals`() {
        assertEquals(333.33, DepositPlanMath.percentOf(1000.0, 33.333, ShopCurrency.USD), 0.0)
        assertEquals(333.0, DepositPlanMath.percentOf(1000.0, 33.333, vnd), 0.0)
        assertEquals(1.01, DepositPlanMath.roundMoney(1.005, ShopCurrency.USD), 0.0)
    }

    @Test
    fun `due days follow the rule, a picked day wins, month ends carry`() {
        assertEquals("2026-11-14", DepositPlanMath.dueKey(DepositStageDraft("a", 1.0, DepositDueRule.onCreate, dueDateKey = "2026-11-14"), "2026-10-25", "2026-12-01"))
        assertEquals("2026-11-28", DepositPlanMath.dueKey(DepositStageDraft("a", 1.0, DepositDueRule.beforePickup(3)), "2026-10-25", "2026-12-01"))
        assertEquals("2026-11-03", DepositPlanMath.dueKey(DepositStageDraft("a", 1.0, DepositDueRule.afterCreate(9)), "2026-10-25", "2026-12-01"))
        assertEquals("2026-10-25", DepositPlanMath.dueKey(DepositStageDraft("a", 1.0, DepositDueRule.onCreate), "2026-10-25", "2026-12-01"))
    }

    @Test
    fun `percent and day texts`() {
        assertEquals("30", DepositPlanMath.percentText(30.0))
        assertEquals("33.33", DepositPlanMath.percentText(33.333))
        assertEquals("12.5", DepositPlanMath.percentText(12.5))
        assertEquals("10/11", DepositPlanMath.dayText("2026-11-10"))
        assertEquals("", DepositPlanMath.dayText(null))
        assertEquals(4, DepositPlanMath.lateDays("2026-11-10", "2026-11-14"))
        assertEquals(0, DepositPlanMath.lateDays("2026-11-20", "2026-11-14"))
    }

    // --- payloads

    @Test
    fun `list badge only for an order with a plan, percent from the API (1222)`() {
        fun badge(plan: Boolean?, percent: Double?, type: String = "RENT", status: String = "RESERVED") =
            DepositPlanLogic.listBadgePercent(type, status, plan, percent)
        assertEquals(40.0, badge(true, 40.0)!!, 0.0)
        assertEquals(33.0, badge(true, 33.33)!!, 0.0)
        assertEquals(100.0, badge(true, 250.0)!!, 0.0)
        assertNull(badge(true, 0.0))
        assertNull(badge(true, null))
        assertNull(badge(true, 40.0, status = "PICKUPED"))
        assertNull(badge(true, 40.0, type = "SALE"))
    }

    @Test
    fun `a one-time deposit order has no badge even with money collected`() {
        assertNull(DepositPlanLogic.listBadgePercent("RENT", "RESERVED", hasPlan = false, apiPercent = null))
        assertNull(DepositPlanLogic.listBadgePercent("RENT", "RESERVED", hasPlan = false, apiPercent = 40.0))
        assertNull(DepositPlanLogic.listBadgePercent("RENT", "RESERVED", hasPlan = null, apiPercent = 40.0)) // an older API sends no flag
    }

    /** #1380: the Giao đồ button gives way to "Còn đợt chưa thu" exactly when the API would refuse the hand-over */
    @Test
    fun `blocksHandOver only for an unpaid explicit stage of a booked plan order`() {
        fun stage(key: String, amount: Double, status: String = "UPCOMING", paid: Double = 0.0) =
            OrderInstallment(key, key, 10.0, amount, status = status, paidAmount = paid)
        fun plan(vararg stages: OrderInstallment) = DepositPlanInfo(hasPlan = true, installments = stages.toList())
        val unpaid = plan(stage("i1", 300.0, "PAID", 300.0), stage("i2", 400.0), stage("rest", 300.0))
        assertTrue(DepositPlanLogic.blocksHandOver(unpaid, "RESERVED"))
        assertTrue(DepositPlanLogic.blocksHandOver(plan(stage("i1", 300.0, "OVERDUE"), stage("rest", 700.0)), "RESERVED"))
        assertTrue("status is matched like the screen does", DepositPlanLogic.blocksHandOver(unpaid, "reserved"))

        // Every stage collected, or a stage short-paid: the API lets it through
        assertFalse(DepositPlanLogic.blocksHandOver(plan(stage("i1", 300.0, "PAID", 300.0), stage("rest", 700.0)), "RESERVED"))
        assertFalse(DepositPlanLogic.blocksHandOver(plan(stage("i1", 100.0, "PARTIAL", 100.0), stage("rest", 900.0)), "RESERVED"))
        // Nothing to collect: a stage worth 0, or only the rest (collected at hand-over)
        assertFalse(DepositPlanLogic.blocksHandOver(plan(stage("i1", 0.0), stage("rest", 1000.0)), "RESERVED"))
        assertFalse(DepositPlanLogic.blocksHandOver(plan(stage("rest", 1000.0)), "RESERVED"))

        // No plan: a shop with one "Đã cọc", no deposit, an old order, or a response without the plan fields
        assertFalse(DepositPlanLogic.blocksHandOver(unpaid.copy(hasPlan = false), "RESERVED"))
        assertFalse(DepositPlanLogic.blocksHandOver(unpaid.copy(hasPlan = null), "RESERVED"))
        assertFalse(DepositPlanLogic.blocksHandOver(null, "RESERVED"))
        assertFalse(DepositPlanLogic.blocksHandOver(plan(), "RESERVED"))

        // Not waiting for pick-up
        listOf("PICKUPED", "RETURNED", "COMPLETED", "CANCELLED", null).forEach {
            assertFalse("$it", DepositPlanLogic.blocksHandOver(unpaid, it))
        }
    }

    @Test
    fun `an old order payload has no deposit part`() {
        val info = DepositPlanInfo.fromJson(JSONObject("""{"id":1,"orderNumber":"123456","depositAmount":2000000}"""))
        assertNull(info.installments)
        assertNull(info.summary)
        assertNull(info.hasPlan)
        assertNull(info.cancelKeptAmount)
        assertFalse(DepositPlanLogic.hasPlan(info))
    }

    @Test
    fun `a new order payload decodes stages, summary, policy and the kept amount`() {
        val json = JSONObject(
            """
            {"hasDepositPlan":true,"depositPlanPolicy":"Huỷ không hoàn","cancelKeptAmount":1800000,
             "installmentSummary":{"planned":12000000,"collected":3600000,"remaining":8400000,"percentCollected":30,"nextDue":{"key":"i2","amount":4800000}},
             "installments":[
               {"key":"i1","label":"Cọc giữ chỗ","percent":30,"amount":3600000,"plannedAmount":3600000,"remaining":0,"dueDateKey":"2026-10-25","status":"PAID","collectedAt":"2026-10-25T03:00:00.000Z","paidAmount":3600000},
               {"key":"i2","label":"Cọc lần 2","percent":40,"amount":4800000,"dueDateKey":"2026-11-11","status":"UPCOMING"},
               {"key":"rest","label":"Còn lại","percent":30,"amount":3600000,"dueDateKey":"2026-11-14","status":"UPCOMING"}]}
            """.trimIndent(),
        )
        val info = DepositPlanInfo.fromJson(json)
        assertTrue(DepositPlanLogic.hasPlan(info))
        assertEquals("Huỷ không hoàn", info.policy)
        assertEquals(1_800_000.0, info.cancelKeptAmount!!, 0.0)
        assertEquals(30.0, info.summary!!.percentCollected, 0.0)
        val stages = info.installments!!
        assertEquals(3, stages.size)
        assertTrue(stages[0].isPaid)
        assertFalse(stages[1].isPaid)
        assertEquals(4_800_000.0, stages[1].remaining, 0.0) // missing `remaining` falls back to the amount
        assertEquals(4_800_000.0, stages[1].plannedAmount, 0.0)
        assertTrue(stages[2].isRest)
    }

    @Test
    fun `settings payload and the fallbacks`() {
        val settings = DepositSettings.fromJson(
            JSONObject(
                """{"success":true,"data":{"depositMode":"STAGED","cancellationPolicy":"p","templates":[
                  {"id":"t1","name":"3 giai đoạn","isDefault":true,"items":[{"label":"Cọc","type":"PERCENT","value":30,"dueRule":{"kind":"ON_CREATE"}},
                  {"label":"Lần 2","type":"PERCENT","value":40,"dueRule":{"kind":"BEFORE_PICKUP","days":3}}]}],
                  "defaultTemplate":{"id":"d","name":"Mặc định","items":[]}}}""",
            ),
        )
        assertEquals(DepositMode.STAGED, settings.depositMode)
        assertEquals("t1", settings.startTemplate?.id)
        assertEquals(listOf("t1"), settings.choices.map { it.id })
        assertEquals(DepositDueRule.beforePickup(3), settings.templates[0].items[1].dueRule)
        assertEquals(DepositMode.ONE_TIME, DepositMode.from(null))
        assertEquals(DepositMode.ONE_TIME, DepositMode.from("whatever"))
        val builtIn = DepositSettings(defaultTemplate = DepositTemplate("d", "x", false, emptyList()))
        assertEquals(listOf("d"), builtIn.choices.map { it.id })
        assertEquals("d", builtIn.startTemplate?.id)
    }

    @Test
    fun `settings save body sends only the keys given`() {
        assertEquals("""{"depositMode":"STAGED"}""", DepositSettings.saveBody(mode = DepositMode.STAGED).toString())
        val body = DepositSettings.saveBody(
            templates = listOf(DepositTemplate("t1", "N", true, listOf(DepositStageTemplate("A", 30.0, DepositDueRule.onCreate)))),
        )
        val item = body.getJSONArray("templates").getJSONObject(0)
        assertTrue(item.getBoolean("isDefault"))
        assertEquals("ON_CREATE", item.getJSONArray("items").getJSONObject(0).getJSONObject("dueRule").getString("kind"))
        assertFalse(item.getJSONArray("items").getJSONObject(0).getJSONObject("dueRule").has("days"))
    }

    @Test
    fun `reminders decode the three groups and older payloads give none`() {
        assertNull(InstallmentReminders.fromJson(JSONObject("""{"overdueReturns":{"count":0}}""")))
        val r = InstallmentReminders.fromJson(
            JSONObject(
                """{"installmentsDue":{"count":1,"orders":[{"orderId":5,"orderNumber":"123456","customerName":"An","key":"i2","label":"Cọc lần 2","amount":4800000,"remaining":4800000,"dueDateKey":"2026-11-11","lateDays":0}]},
                   "installmentsOverdue":{"count":1,"orders":[{"orderId":6,"orderNumber":"222222","key":"i1","label":"Cọc","amount":10,"lateDays":4}]},
                   "installmentsDueTomorrow":{"count":0,"orders":[]}}""",
            ),
        )!!
        assertEquals(listOf(5, 6), r.due.map { it.orderId })
        assertEquals(10.0, r.due[1].remaining, 0.0)
        assertEquals(4, r.due[1].lateDays)
        assertTrue(r.tomorrow.isEmpty())
        assertFalse(r.isEmpty)
    }

    // --- requests and roles

    @Test
    fun `paymentPlan body of an owner and of staff`() {
        val owner = PaymentPlanRequest.body(thirtyFortyRest, "t1", canEditStages = true, collectFirst = "CASH" to "ref-12345678")
        assertEquals("t1", owner.getString("templateId"))
        assertEquals(2, owner.getJSONArray("items").length())
        assertEquals("ON_CREATE", owner.getJSONArray("items").getJSONObject(0).getJSONObject("dueRule").getString("kind"))
        assertEquals("CASH", owner.getJSONObject("collectFirstNow").getString("method"))
        // staff send {} (the API uses the shop's default template), plus the first collection when asked
        val staff = PaymentPlanRequest.body(thirtyFortyRest, "t1", canEditStages = false, collectFirst = null)
        assertEquals("{}", staff.toString())
        val picked = PaymentPlanRequest.body(listOf(DepositStageDraft("a", 10.0, DepositDueRule.onCreate, dueDateKey = "2026-11-02", amountOverride = 5.0)), null, true, null)
        val item = picked.getJSONArray("items").getJSONObject(0)
        assertEquals("2026-11-02", item.getString("dueDateKey"))
        assertFalse(item.has("dueRule"))
        assertEquals(5.0, item.getDouble("amountOverride"), 0.0)
    }

    @Test
    fun `collect and cancel bodies`() {
        val collect = CollectInstallmentRequest.body(3_600_000.0, "TRANSFER", "android-abc12345")
        assertEquals("TRANSFER", collect.getString("method"))
        assertFalse(collect.has("note"))
        assertEquals("""{"status":"CANCELLED"}""", DepositPlanLogic.cancelBody(0.0, null).toString())
        val kept = DepositPlanLogic.cancelBody(1_800_000.0, "  khách báo huỷ ")
        assertEquals(1_800_000.0, kept.getDouble("cancelKeptAmount"), 0.0)
        assertEquals("khách báo huỷ", kept.getString("cancelNote"))
    }

    @Test
    fun `cancel amounts follow each other`() {
        val start = DepositPlanLogic.CancelAmounts.keeping(0.0, 3_600_000.0)
        assertEquals(3_600_000.0, start.refund, 0.0)
        val kept = DepositPlanLogic.CancelAmounts.keeping(1_800_000.0, 3_600_000.0)
        assertEquals(1_800_000.0, kept.refund, 0.0)
        assertTrue(kept.isValid)
        assertEquals(0.0, DepositPlanLogic.CancelAmounts.keeping(9_999_999.0, 3_600_000.0).refund, 0.0)
        assertEquals(1_800_000.0, DepositPlanLogic.CancelAmounts.refunding(1_800_000.0, 3_600_000.0).kept, 0.0)
    }

    @Test
    fun `roles`() {
        assertTrue(DepositPlanLogic.canEditPlan("MERCHANT"))
        assertTrue(DepositPlanLogic.canEditPlan("OUTLET_ADMIN"))
        assertFalse(DepositPlanLogic.canEditPlan("OUTLET_STAFF"))
        assertFalse(DepositPlanLogic.canEditPlan("OUTLET_INVENTORY"))
        assertTrue(DepositPlanLogic.canVoid("MERCHANT"))
        assertFalse(DepositPlanLogic.canVoid("OUTLET_ADMIN"))
        assertTrue(DepositPlanLogic.canKeepOnCancel("OUTLET_ADMIN"))
        assertFalse(DepositPlanLogic.canKeepOnCancel("OUTLET_STAFF"))
        assertTrue(DepositPlanLogic.canEditSettings("MERCHANT"))
        assertFalse(DepositPlanLogic.canEditSettings("OUTLET_ADMIN"))
        assertEquals(listOf("CASH", "TRANSFER"), DepositPlanLogic.collectMethods(staffLike = true))
        assertEquals(listOf("CASH", "TRANSFER", "CHECK"), DepositPlanLogic.collectMethods(staffLike = false))
    }

    @Test
    fun `collecting and the hand-over guard`() {
        val stages = listOf(
            OrderInstallment("i1", "A", 30.0, 3_600_000.0, status = "PAID", paidAmount = 3_600_000.0, remaining = 0.0),
            OrderInstallment("i2", "B", 40.0, 4_800_000.0),
            OrderInstallment("rest", "R", 30.0, 3_600_000.0),
        )
        assertEquals("i2", DepositPlanLogic.nextToCollect(stages, "RESERVED")?.key)
        assertNull(DepositPlanLogic.nextToCollect(stages, "PICKUPED"))
        assertEquals(listOf("i2"), DepositPlanLogic.unpaidBeforePickup(stages).map { it.key }) // the rest is collected at hand-over
        assertEquals(2, DepositPlanLogic.stageNumber(stages, "i2"))
        assertNull(DepositPlanLogic.stageNumber(stages, "i9"))
        assertEquals("30", DepositPlanLogic.badgePercent(30.0))
        assertNull(DepositPlanLogic.badgePercent(null))
    }
}
