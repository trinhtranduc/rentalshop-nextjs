package com.anyrent.pos.domain.orders

import com.anyrent.pos.R
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.deposit.DepositPlanInfo
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.money.ShopCurrency
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * #1345 money order of the share image (iOS `OrderShareMoneyOrderTests`, same expected lines): Tạm tính, Giảm giá,
 * Tổng tiền thuê, Cọc, Thu khi giao, Thế chân. The labels are read from the real `strings.xml` of each language, so a
 * wrong or missing string fails here. `flat` prints the model as one line per entry.
 */
class OrderShareMoneyOrderTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")
    private val shop = ShareShop("Lan Anh Bridal", "Chi nhánh Quận 3", "0901 234 567", "45 Võ Văn Tần, Quận 3, TP.HCM")
    private val now = Instant.parse("2026-10-07T07:00:00Z")

    // ---- text of the real resources ------------------------------------------------------------------------------

    private val names: Map<Int, String> =
        R.string::class.java.fields.filter { it.type == Int::class.javaPrimitiveType }.associate { it.getInt(null) to it.name }

    private fun table(dir: String): Map<String, String> {
        val xml = File("src/main/res/$dir/strings.xml").readText()
        return Regex("""<string name="([^"]+)"[^>]*>(.*?)</string>""", RegexOption.DOT_MATCHES_ALL).findAll(xml)
            .associate { it.groupValues[1] to it.groupValues[2].replace("\\'", "'").replace("&amp;", "&") }
    }

    private val viTable = table("values-vi")
    private val enTable = table("values")

    private fun text(t: ShareText, vi: Boolean): String = when (t) {
        is ShareText.Plain -> t.text
        is ShareText.Res -> {
            val name = names.getValue(t.id)
            val template = (if (vi) viTable else enTable).getValue(name)
            String.format(template, *t.args.map { if (it is ShareText) text(it, vi) else it }.toTypedArray())
        }
        is ShareText.Plural -> error("no plural in the money part")
    }

    private fun flat(model: OrderShareModel, vi: Boolean = true): List<String> = model.money.flatMap { entry ->
        when (entry) {
            is ShareMoney.Row -> listOf("${text(entry.row.label, vi)}|${entry.row.value}")
            is ShareMoney.Muted -> listOf("${text(entry.label, vi)}|${text(entry.value, vi)}|muted")
            is ShareMoney.Total -> listOf("TOTAL ${text(entry.highlight.label, vi)}|${entry.highlight.value}")
            is ShareMoney.Stages -> listOf("STAGES ${text(entry.title, vi)}") +
                entry.stages.map { "${text(it.title, vi)}|${it.amount}|${text(it.detail, vi)} · ${text(it.status, vi)}" }
            is ShareMoney.Collect -> listOf("COLLECT ${text(entry.label, vi)}|${entry.value}")
        }
    }

    // ---- fixtures ------------------------------------------------------------------------------------------------

    private fun item(name: String, qty: Int, unit: Double) =
        OrderItem(id = null, productId = 1, productName = name, quantity = qty, unitPrice = unit, totalPrice = unit * qty)

    private fun stages(second: String = "UPCOMING") = listOf(
        OrderInstallment("i1", "Cọc giữ chỗ", 20.0, 230_000.0, dueDateKey = "2026-10-05", status = "PAID", collectedAt = "2026-10-05T07:00:00.000Z", paidAmount = 230_000.0, remaining = 0.0),
        OrderInstallment("i2", "Cọc trước ngày lấy", 30.0, 345_000.0, dueDateKey = "2026-10-06", status = second),
        OrderInstallment("rest", "rest", 50.0, 575_000.0, dueDateKey = "2026-10-16", status = "UPCOMING"),
    )

    /** Rental #482113 of the mockups: items 650.000 + 350.000 + 2 × 75.000 */
    private fun order(
        type: String = "RENT",
        status: String = "RESERVED",
        total: Double = 1_150_000.0,
        deposit: Double = 0.0,
        security: Double = 0.0,
        papers: String? = null,
        discount: Double = 0.0,
        extra: List<OrderItem> = emptyList(),
        plan: DepositPlanInfo? = null,
    ) = OrderDetail(
        summary = OrderSummary(
            id = 1, orderNumber = "482113", orderType = type, status = status, totalAmount = total, depositAmount = deposit,
            customerName = "Nguyễn Thị Mai", customerPhone = "0912 345 678",
            pickupPlanAt = "2026-10-06T17:00:00.000Z", returnPlanAt = "2026-10-16T16:59:59.000Z",
            createdAt = "2026-10-05T07:30:00.000Z", notes = null,
        ),
        items = listOf(item("Váy cưới đuôi cá trơn", 1, 650_000.0), item("Áo dài cưới đỏ", 1, 350_000.0), item("Vương miện ngọc trai", 2, 75_000.0)) + extra,
        customerId = 1,
        payments = emptyList(),
        securityDeposit = security,
        collateralDetails = papers,
        discountAmount = discount,
        deposit = plan,
    )

    private fun staged(second: String = "UPCOMING", status: String = "RESERVED") =
        order(status = status, deposit = 230_000.0, plan = DepositPlanInfo(installments = stages(second), hasPlan = true))

    private fun make(o: OrderDetail, vi: Boolean = true, currency: ShopCurrency = ShopCurrency.VND) =
        OrderShareModel.from(o, shop, vi = vi, zone = vn, now = now, currency = currency)

    private fun product(id: Int, name: String, price: Double) = Product(
        id = id, name = name, barcode = null, rentPrice = price, salePrice = price, stock = 5, available = 5, renting = 0,
        categoryId = null, categoryName = null, imageUrl = null,
    )

    private fun draft(sale: Boolean = false, discount: Double = 0.0, deposit: Double = 300_000.0) = OrderShareModel.fromDraft(
        lines = listOf(
            CartLine(product(1, "Váy cưới đuôi cá trơn", 650_000.0), 1, isSale = sale, unitPriceOverride = 650_000.0),
            CartLine(product(2, "Áo dài cưới đỏ", 350_000.0), 1, isSale = sale, unitPriceOverride = 350_000.0),
            CartLine(product(3, "Vương miện ngọc trai", 75_000.0), 2, isSale = sale, unitPriceOverride = 75_000.0),
        ),
        customer = null, isSale = sale, pickup = LocalDate.of(2026, 10, 7), returnDate = LocalDate.of(2026, 10, 16),
        discountAmount = discount, deposit = deposit, securityDeposit = 2_000_000.0, collateralDetails = "CCCD",
        shop = shop, vi = true, now = now, zone = vn,
    )

    // ---- frames a-g ----------------------------------------------------------------------------------------------

    @Test
    fun a_oneDepositThenCollectOnDeliveryThenCollateral() {
        assertEquals(
            listOf(
                "TOTAL Tổng tiền thuê|1.150.000đ",
                "Đã cọc|300.000đ",
                "COLLECT Thu khi giao|850.000đ",
                "Thế chân khi nhận đồ|CCCD + 2.000.000đ",
            ),
            flat(make(order(deposit = 300_000.0, security = 2_000_000.0, papers = "CCCD"))),
        )
        assertEquals(
            listOf("TOTAL Tổng tiền thuê|1.150.000đ", "Đã cọc|300.000đ", "COLLECT Thu khi giao|850.000đ"),
            flat(make(order(deposit = 300_000.0))),
        )
    }

    @Test
    fun b_stagesShowPaidAndUnpaidAndCollectIsTheRest() {
        assertEquals(
            listOf(
                "TOTAL Tổng tiền thuê|1.150.000đ",
                "STAGES Thu cọc theo giai đoạn",
                "1. Cọc giữ chỗ|230.000đ|20% đơn · 05/10 · Đã thu",
                "2. Cọc trước ngày lấy|345.000đ|30% đơn · hạn 06/10 · Chưa thu",
                "COLLECT Thu khi giao|575.000đ",
            ),
            flat(make(staged())),
        )
    }

    @Test
    fun b_aStageHasOnlyPaidOrUnpaidWhateverTheDayOfTheImage() {
        val expected = flat(make(staged()))
        for (status in listOf("OVERDUE", "DUE_TODAY", "UPCOMING")) assertEquals(status, expected, flat(make(staged(second = status))))
        val partial = stages().toMutableList().also {
            it[1] = OrderInstallment("i2", "Cọc trước ngày lấy", 30.0, 200_000.0, dueDateKey = "2026-10-06", status = "PARTIAL", collectedAt = "2026-10-06T03:00:00.000Z", paidAmount = 200_000.0, remaining = 0.0)
        }
        val lines = flat(make(order(deposit = 430_000.0, plan = DepositPlanInfo(installments = partial, hasPlan = true))))
        assertTrue("$lines", lines.contains("2. Cọc trước ngày lấy|200.000đ|30% đơn · 06/10 · Thu một phần"))
    }

    @Test
    fun c_noDepositSaysSoAndCollectsTheWholeTotal() {
        assertEquals(
            listOf("TOTAL Tổng tiền thuê|1.150.000đ", "Cọc|Chưa cọc|muted", "COLLECT Thu khi giao|1.150.000đ"),
            flat(make(order())),
        )
    }

    @Test
    fun d_discountShowsSubtotalFirstAndDepositIsOnTheDiscountedTotal() {
        assertEquals(
            listOf(
                "Tạm tính|1.250.000đ", "Giảm giá|− 100.000đ",
                "TOTAL Tổng tiền thuê|1.150.000đ", "Đã cọc|300.000đ", "COLLECT Thu khi giao|850.000đ",
            ),
            flat(make(order(deposit = 300_000.0, discount = 100_000.0, extra = listOf(item("Khăn đóng", 1, 100_000.0))))),
        )
    }

    @Test
    fun f_saleKeepsSubtotalDiscountTotalAndHasNoDepositOrCollect() {
        val sale = order(type = "SALE", status = "COMPLETED", total = 400_000.0, discount = 20_000.0)
            .copy(items = listOf(item("Khăn voan cô dâu", 1, 180_000.0), item("Hoa cầm tay lụa", 2, 120_000.0)))
        assertEquals(listOf("Tạm tính|420.000đ", "Giảm giá|− 20.000đ", "TOTAL Tổng cộng|400.000đ"), flat(make(sale)))
    }

    @Test
    fun g_draftAddsCollectAndKeepsItsFixedSentence() {
        val d = draft()
        assertEquals(
            listOf(
                "TOTAL Tạm tính|1.150.000đ", "Cọc giữ đồ|300.000đ", "COLLECT Thu khi giao|850.000đ",
                "Thế chân khi nhận đồ|CCCD + 2.000.000đ",
            ),
            flat(d),
        )
        assertEquals(R.string.share_draft_note, (d.note as ShareText.Res).id)
        assertEquals(
            listOf(
                "Giảm giá|− 50.000đ", "TOTAL Tạm tính|1.100.000đ", "Cọc|Chưa cọc|muted", "COLLECT Thu khi giao|1.100.000đ",
                "Thế chân khi nhận đồ|CCCD + 2.000.000đ",
            ),
            flat(draft(discount = 50_000.0, deposit = 0.0)),
        )
        assertFalse(flat(draft(sale = true)).any { it.startsWith("COLLECT") })
    }

    // ---- fixed by the plan, not by the status --------------------------------------------------------------------

    @Test
    fun collectOnDeliveryIsTheSameForEveryOrderStatus() {
        val builders: List<(String) -> OrderDetail> = listOf(
            { s -> order(status = s, deposit = 300_000.0, security = 2_000_000.0, papers = "CCCD") },
            { s -> staged(status = s) },
            { s -> order(status = s) },
        )
        for (build in builders) {
            val reserved = flat(make(build("RESERVED")))
            assertTrue("$reserved", reserved.any { it.startsWith("COLLECT") })
            for (status in listOf("PICKUPED", "RETURNED", "CANCELLED")) assertEquals(status, reserved, flat(make(build(status))))
        }
    }

    @Test
    fun englishLabels() {
        assertEquals(
            listOf(
                "TOTAL Rental total|1.150.000đ",
                "STAGES Staged deposit",
                "1. Cọc giữ chỗ|230.000đ|20% of order · 05/10 · Collected",
                "2. Cọc trước ngày lấy|345.000đ|30% of order · due 06/10 · Not collected",
                "COLLECT Collect at hand-over|575.000đ",
            ),
            flat(make(staged(), vi = false), vi = false),
        )
        assertEquals(
            listOf("TOTAL Rental total|1.150.000đ", "Deposit|No deposit|muted", "COLLECT Collect at hand-over|1.150.000đ"),
            flat(make(order(), vi = false), vi = false),
        )
        assertEquals("Deposit paid|300.000đ", flat(make(order(deposit = 300_000.0), vi = false), vi = false)[1])
    }

    @Test
    fun dollarShopFormatsAndRoundsToCents() {
        val lines = flat(make(order(total = 1_150.30, deposit = 300.10), currency = ShopCurrency.USD))
        assertEquals("TOTAL Tổng tiền thuê|${OrderShareModel.money(1_150.30, ShopCurrency.USD)}", lines[0])
        assertEquals("COLLECT Thu khi giao|${OrderShareModel.money(850.2, ShopCurrency.USD)}", lines[2])
        assertTrue(lines[2], lines[2].contains("$850.20"))
        assertEquals(70.05, ShareMoneyRule.collectOnDelivery(100.10, 30.05, null, null, ShopCurrency.USD), 0.0)
    }

    // ---- the pure rule --------------------------------------------------------------------------------------------

    @Test
    fun collectOnDeliveryRule() {
        fun collect(total: Double = 1_150_000.0, deposit: Double = 0.0, plan: Boolean? = null, list: List<OrderInstallment>? = null) =
            ShareMoneyRule.collectOnDelivery(total, deposit, plan, list, ShopCurrency.VND)
        assertEquals(1_150_000.0, collect(), 0.0)
        assertEquals(850_000.0, collect(deposit = 300_000.0), 0.0)
        assertEquals(0.0, collect(deposit = 2_000_000.0), 0.0)
        // With a plan: total minus every stage of the plan, collected or not (230.000 + 345.000)
        assertEquals(575_000.0, collect(deposit = 230_000.0, plan = true, list = stages()), 0.0)
        // A void stage is not part of the plan; the "rest" stage is what is left
        val withVoid = stages().toMutableList().also { it.add(2, OrderInstallment("i3", "Huỷ", 5.0, 50_000.0, dueDateKey = "2026-10-08", status = "VOID")) }
        assertEquals(575_000.0, collect(deposit = 230_000.0, plan = true, list = withVoid), 0.0)
        // A short collection makes the stage worth what was taken: the rest grows
        val short = stages().toMutableList().also {
            it[1] = OrderInstallment("i2", "Cọc trước ngày lấy", 30.0, 200_000.0, dueDateKey = "2026-10-06", status = "PARTIAL", collectedAt = "2026-10-06T03:00:00.000Z", paidAmount = 200_000.0, remaining = 0.0)
        }
        assertEquals(720_000.0, collect(deposit = 430_000.0, plan = true, list = short), 0.0)
        // Stages without a plan flag, or an older API: the single deposit
        assertEquals(850_000.0, collect(deposit = 300_000.0, plan = false, list = stages()), 0.0)
        assertEquals(850_000.0, collect(deposit = 300_000.0, plan = null, list = null), 0.0)
        assertEquals(850_000.0, collect(deposit = 300_000.0, plan = true, list = emptyList()), 0.0)
    }

    /**
     * The finding of #1345: the order detail's "Thu khi giao" (`HandOverMoney`) counts only money already collected, so
     * while stage 2 is unpaid it is 920.000 (the card's "Còn phải thu"), while the card's own row "Phần còn lại, thu khi
     * giao" is 575.000. The image states the plan: 575.000, with the stage 2 line above it saying "Chưa thu".
     */
    @Test
    fun detailScreenHandOverCountsUnpaidStagesTheImageDoesNot() {
        assertEquals(920_000.0, OrderDetailLogic.handOver(1_150_000.0, 230_000.0, 0.0, emptyList()).collectNow, 0.0)
        assertEquals(575_000.0, ShareMoneyRule.collectOnDelivery(1_150_000.0, 230_000.0, true, stages(), ShopCurrency.VND), 0.0)
        assertEquals(575_000.0, OrderDetailLogic.handOver(1_150_000.0, 575_000.0, 0.0, emptyList()).collectNow, 0.0)
    }
}
