package com.anyrent.pos.domain.orders

import com.anyrent.pos.R
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Customer
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.PaymentEntry
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.bank.OutletBankAccount
import com.anyrent.pos.domain.bank.VietQr
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** #640 share image model: spec behaviors 1–9 without drawing; #930 no status, created date, item notes */
class OrderShareModelTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")
    private val shop = ShareShop("Lan Anh Bridal", "Chi nhánh Quận 3", "0901 234 567", "45 Võ Văn Tần, Quận 3, TP.HCM")
    private val bank = OutletBankAccount(1, "Vietcombank", "0071001234567", "Nguyen Lan Anh", isDefault = true)

    private fun item(name: String, qty: Int, unit: Double, note: String? = null) =
        OrderItem(id = null, productId = 1, productName = name, quantity = qty, unitPrice = unit, totalPrice = unit * qty, note = note)

    private fun order(
        type: String = "RENT",
        status: String = "RESERVED",
        total: Double = 1_150_000.0,
        deposit: Double = 300_000.0,
        security: Double = 2_000_000.0,
        papers: String? = "CCCD",
        discount: Double = 0.0,
        customer: String? = "Nguyễn Thị Mai",
        payments: List<PaymentEntry> = emptyList(),
        createdAt: String? = "2026-10-05T07:30:00.000Z",
        orderNote: String? = "Khách quen, giao trước 9h",
    ) = OrderDetail(
        summary = OrderSummary(
            id = 1, orderNumber = "482113", orderType = type, status = status, totalAmount = total,
            depositAmount = deposit, customerName = customer, customerPhone = customer?.let { "0912 345 678" },
            // 07/10 and 16/10 in Vietnam: the UTC instants fall on the day before
            pickupPlanAt = "2026-10-06T17:00:00.000Z", returnPlanAt = "2026-10-16T16:59:59.000Z",
            createdAt = createdAt, notes = orderNote,
        ),
        items = listOf(
            item("Váy cưới đuôi cá trơn", 1, 650_000.0, note = "  Size M, bó eo 2 cm "),
            item("Áo dài cưới đỏ", 1, 350_000.0, note = " "),
            item("Vương miện ngọc trai", 2, 75_000.0),
        ),
        customerId = 1,
        payments = payments,
        securityDeposit = security,
        collateralDetails = papers,
        discountAmount = discount,
    )

    private fun res(text: ShareText) = (text as ShareText.Res).id

    /** #1345: the plain rows of the money part (the order of all the entries is in OrderShareMoneyOrderTest) */
    private fun OrderShareModel.rows(): List<ShareRow> = money.filterIsInstance<ShareMoney.Row>().map { it.row }

    /** The big box: the rent total, the sale total or the draft estimate */
    private fun OrderShareModel.highlight(): ShareHighlight = money.filterIsInstance<ShareMoney.Total>().single().highlight

    @Test
    fun onlyTheDraftHasAPill() {
        // #930: the image never shows the order status (it goes stale once forwarded)
        for (status in listOf("RESERVED", "PICKUPED", "RETURNED", "CANCELLED")) {
            assertNull(status, OrderShareModel.from(order(status = status), shop, vi = true, zone = vn).pill)
        }
        assertNull(OrderShareModel.from(order(type = "SALE", status = "COMPLETED"), shop, vi = true, zone = vn).pill)
        val draft = draft()
        assertEquals(R.string.share_status_draft, res(draft.pill!!))
        assertEquals(ShareTone.ORANGE, draft.pillTone)
    }

    @Test
    fun kindLineCarriesTheCreatedTimeInVietnamTime() {
        val m = OrderShareModel.from(order(), shop, vi = true, zone = vn)
        // 07:30 UTC = 14:30 in Vietnam
        assertEquals(ShareText.Res(R.string.share_kind_created, listOf(ShareText.Res(R.string.share_kind_rent), "05/10/26 14:30")), m.kind)
        // 17:30 UTC on 04/10 is already 05/10 00:30 in Vietnam
        val late = OrderShareModel.from(order(createdAt = "2026-10-04T17:30:00.000Z"), shop, vi = true, zone = vn)
        assertEquals(ShareText.Res(R.string.share_kind_created, listOf(ShareText.Res(R.string.share_kind_rent), "05/10/26 00:30")), late.kind)
        val sale = OrderShareModel.from(order(type = "SALE", status = "COMPLETED"), shop, vi = true, zone = vn)
        assertEquals(ShareText.Res(R.string.share_kind_created, listOf(ShareText.Res(R.string.share_kind_sale), "05/10/26 14:30")), sale.kind)
        // No created date: the kind alone
        assertEquals(ShareText.Res(R.string.share_kind_rent), OrderShareModel.from(order(createdAt = null), shop, vi = true, zone = vn).kind)
    }

    @Test
    fun itemNotesShownAndTheOrderNoteNot() {
        val m = OrderShareModel.from(order(), shop, vi = true, zone = vn)
        assertEquals(listOf("Size M, bó eo 2 cm", null, null), m.lines.map { it.note })
        assertEquals(ShareLine("Váy cưới đuôi cá trơn", "1 × 650.000đ", "650.000đ", "Size M, bó eo 2 cm"), m.lines[0])
        // The order's general note is nowhere on the image
        assertFalse(m.toString().contains("Khách quen"))
    }

    @Test
    fun rentHeaderCustomerAndDayStrip() {
        val m = OrderShareModel.from(order(), shop, vi = true, zone = vn)
        assertEquals("LA", m.initials)
        assertEquals("Chi nhánh Quận 3 · 0901 234 567", m.outletLine)
        assertEquals(ShareText.Plain("#482113"), m.title)
        assertEquals(ShareText.Plain("Nguyễn Thị Mai"), m.customerName)
        assertEquals("0912 345 678", m.customerPhone)
        // #930: no day count on an order
        assertEquals(ShareDayStrip("07/10/26", "16/10/26", null), m.dayStrip)
        assertEquals(ShareText.Res(R.string.share_items_rent, listOf(3)), m.itemsTitle)
        assertEquals(ShareLine("Vương miện ngọc trai", "2 × 75.000đ", "150.000đ"), m.lines[2])
        assertEquals(ShareText.Res(R.string.share_thanks, listOf("Lan Anh Bridal")), m.thanks)
        assertEquals("Order_482113.jpg", m.fileName)
        assertFalse(m.isDraft)
    }

    @Test
    fun englishDaysAndWalkIn() {
        val m = OrderShareModel.from(order(customer = null), shop, vi = false, zone = vn)
        assertEquals(ShareDayStrip("07/10/26", "16/10/26", null), m.dayStrip)
        assertEquals(R.string.share_walk_in, res(m.customerName))
        assertNull(m.customerPhone)
    }

    @Test
    fun rentTotalsHighlightTheRentTotalWhateverTheStatus() {
        val m = OrderShareModel.from(order(), shop, vi = true, zone = vn)
        assertEquals(
            listOf(
                ShareRow(ShareText.Res(R.string.share_deposit_paid), "300.000đ"),
                ShareRow(ShareText.Res(R.string.share_collateral), "CCCD + 2.000.000đ"),
            ),
            m.rows(),
        )
        assertEquals(ShareHighlight(ShareText.Res(R.string.share_rent_total), "1.150.000đ", ShareTone.ACCENT), m.highlight())
        assertNull(m.note)
        fun pay(amount: Double) = PaymentEntry(1, amount, "CASH", "COMPLETED", "PICKUP")
        for (status in listOf("PICKUPED", "RETURNED", "CANCELLED")) {
            val other = OrderShareModel.from(order(status = status, payments = listOf(pay(500_000.0))), shop, vi = true, zone = vn)
            assertEquals(status, m.money, other.money)
        }
    }

    @Test
    fun rentDiscountRowAndBareRent() {
        val discounted = OrderShareModel.from(order(total = 1_100_000.0, discount = 50_000.0), shop, vi = true, zone = vn)
        assertEquals(ShareRow(ShareText.Res(R.string.share_discount), "− 50.000đ"), discounted.rows().first { (it.label as ShareText.Res).id == R.string.share_discount })
        assertEquals("1.100.000đ", discounted.highlight().value)
        val bare = OrderShareModel.from(order(deposit = 0.0, security = 0.0, papers = null), shop, vi = true, zone = vn)
        assertTrue(bare.rows().isEmpty())
    }

    @Test
    fun saleTotals() {
        val m = OrderShareModel.from(
            order(type = "SALE", status = "COMPLETED", total = 400_000.0, deposit = 0.0, security = 0.0, papers = null, discount = 20_000.0),
            shop, vi = true, zone = vn,
        )
        assertNull(m.dayStrip)
        assertEquals(ShareText.Res(R.string.share_items_sale, listOf(3)), m.itemsTitle)
        assertEquals(
            listOf(
                // #939: the item lines (650.000 + 350.000 + 2 × 75.000), not totalAmount + discount
                ShareRow(ShareText.Res(R.string.share_subtotal), "1.150.000đ"),
                ShareRow(ShareText.Res(R.string.share_discount), "− 20.000đ"),
            ),
            m.rows(),
        )
        assertEquals(ShareHighlight(ShareText.Res(R.string.share_total), "400.000đ", ShareTone.GREEN), m.highlight())
    }

    @Test
    fun saleSubtotalIsTheItemSumNotTheTotal() {
        // #939: test data of #930 — items 792, order total 396, no discount. iOS showed 792, Android 396.
        val base = order(type = "SALE", status = "COMPLETED", total = 396.0, deposit = 0.0, security = 0.0, papers = null)
        val m = OrderShareModel.from(
            base.copy(items = listOf(item("A", 2, 198.0), item("B", 1, 396.0))),
            shop, vi = true, zone = vn,
        )
        assertEquals(listOf(ShareRow(ShareText.Res(R.string.share_subtotal), "792đ")), m.rows())
        // The total is the server's, never recomputed from the lines
        assertEquals(ShareHighlight(ShareText.Res(R.string.share_total), "396đ", ShareTone.GREEN), m.highlight())
    }

    @Test
    fun qrOnlyWithTheSwitchAndAnAccount() {
        assertNull(OrderShareModel.from(order(), shop, vi = true, printBankQr = false, bankAccount = bank, zone = vn).qr)
        assertNull(OrderShareModel.from(order(), shop, vi = true, printBankQr = true, bankAccount = null, zone = vn).qr)
        // No BIN for the bank: no VietQR, no card
        val unknown = bank.copy(bankName = "Unknown", bankCode = null)
        assertNull(OrderShareModel.from(order(), shop, vi = true, printBankQr = true, bankAccount = unknown, zone = vn).qr)

        val qr = OrderShareModel.from(order(), shop, vi = true, printBankQr = true, bankAccount = bank, zone = vn).qr
        assertNotNull(qr)
        qr!!
        assertEquals("Vietcombank", qr.bankName)
        assertEquals("0071001234567", qr.accountNumber)
        assertEquals("NGUYEN LAN ANH", qr.holder)
        assertEquals("DH482113", qr.content)
        // #930: no amount (tag 54), the content stays
        assertEquals(VietQr.payload(bank, 0.0, "DH482113"), qr.payload)
        assertTrue(qr.payload.contains("5303704" + "5802VN"))
        assertTrue(qr.payload.contains("62120808DH482113"))
        assertTrue(qr.payload.startsWith("000201010212"))
        assertEquals(VietQr.crc16(qr.payload.dropLast(4)), qr.payload.takeLast(4))
    }

    @Test
    fun saleQrHasNoAmountEither() {
        val sale = OrderShareModel.from(order(type = "SALE", status = "COMPLETED", total = 400_000.0), shop, vi = true, printBankQr = true, bankAccount = bank, zone = vn)
        assertFalse(sale.qr!!.payload.contains("5406400000"))
        assertTrue(sale.qr!!.payload.contains("0808DH482113"))
    }

    private fun product(id: Int, name: String, price: Double) = Product(
        id = id, name = name, barcode = null, rentPrice = price, salePrice = price, stock = 5, available = 5, renting = 0,
        categoryId = null, categoryName = null, imageUrl = null,
    )

    private fun draft(sale: Boolean = false, customer: Customer? = Customer(1, "Nguyễn Thị", "Mai", "0912 345 678", null, null)) =
        OrderShareModel.fromDraft(
            lines = listOf(
                CartLine(product(1, "Váy cưới đuôi cá trơn", 650_000.0), 1, isSale = sale, unitPriceOverride = 650_000.0),
                CartLine(product(2, "Áo dài cưới đỏ", 350_000.0), 1, isSale = sale, unitPriceOverride = 350_000.0),
                CartLine(product(3, "Vương miện ngọc trai", 75_000.0), 2, isSale = sale, unitPriceOverride = 75_000.0),
            ),
            customer = customer,
            isSale = sale,
            pickup = LocalDate.of(2026, 10, 7),
            returnDate = LocalDate.of(2026, 10, 16),
            discountAmount = 0.0,
            deposit = 300_000.0,
            securityDeposit = 2_000_000.0,
            collateralDetails = "CCCD",
            shop = shop,
            vi = true,
            // 23:30 on 06/10 UTC is 07/10 in Vietnam
            now = Instant.parse("2026-10-06T23:30:00Z"),
            zone = vn,
        )

    @Test
    fun draftHeaderTotalsAndNoQr() {
        val m = draft()
        assertEquals(ShareText.Res(R.string.share_kind_draft, listOf(ShareText.Res(R.string.share_kind_rent), "07/10/26")), m.kind)
        assertEquals(R.string.share_draft_title, res(m.title))
        assertEquals(ShareText.Plain("Nguyễn Thị Mai"), m.customerName)
        // The draft keeps its day count
        assertEquals(ShareDayStrip("07/10/26", "16/10/26", 10), m.dayStrip)
        assertEquals(
            listOf(
                ShareRow(ShareText.Res(R.string.share_draft_deposit), "300.000đ"),
                ShareRow(ShareText.Res(R.string.share_collateral), "CCCD + 2.000.000đ"),
            ),
            m.rows(),
        )
        assertEquals(ShareHighlight(ShareText.Res(R.string.share_draft_estimate), "1.150.000đ", ShareTone.ORANGE), m.highlight())
        assertEquals(R.string.share_draft_note, res(m.note!!))
        assertNull(m.qr)
        assertTrue(m.isDraft)
        assertEquals("Draft_20261007-0630.jpg", m.fileName)
    }

    @Test
    fun saleDraftHasNoDaysNorDeposit() {
        val m = draft(sale = true, customer = null)
        assertNull(m.dayStrip)
        assertTrue(m.rows().isEmpty())
        assertEquals(R.string.share_walk_in, res(m.customerName))
        assertEquals(ShareText.Res(R.string.share_items_sale, listOf(3)), m.itemsTitle)
    }

    @Test
    fun initialsAndMoney() {
        assertEquals("LA", OrderShareModel.initials("Lan Anh Bridal"))
        assertEquals("Đ", OrderShareModel.initials("  đức "))
        assertEquals("A", OrderShareModel.initials(""))
        assertEquals("1.150.000đ", OrderShareModel.money(1_150_000.0))
        assertEquals("0đ", OrderShareModel.money(0.0))
        assertEquals("999đ", OrderShareModel.money(999.4))
        assertEquals("− 20.000đ", OrderShareModel.money(-20_000.0))
    }

    @Test
    fun dayLabels() {
        assertEquals("11/10/26", OrderShareModel.dayLabel(LocalDate.of(2026, 10, 11), vi = true))
        assertEquals("12/10/26", OrderShareModel.dayLabel(LocalDate.of(2026, 10, 12), vi = true))
        assertEquals("11/10/26", OrderShareModel.dayLabel(LocalDate.of(2026, 10, 11), vi = false))
    }

    @Test
    fun shareQrStringIsTheSameAsIos() {
        // Same fixture and exact string as iOS OrderShareImageTests: both apps must draw the same VietQR
        assertEquals(
            "00020101021238570010A00000072701270006970436011300710012345670208QRIBFTTA530370454068500005802VN62120808DH4821136304E529",
            VietQr.payload(bank, 850_000.0, "DH482113"),
        )
    }
}
