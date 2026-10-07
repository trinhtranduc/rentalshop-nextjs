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

/** #640 share image model: spec behaviors 1–9 without drawing */
class OrderShareModelTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")
    private val shop = ShareShop("Lan Anh Bridal", "Chi nhánh Quận 3", "0901 234 567", "45 Võ Văn Tần, Quận 3, TP.HCM")
    private val bank = OutletBankAccount(1, "Vietcombank", "0071001234567", "Nguyen Lan Anh", isDefault = true)

    private fun item(name: String, qty: Int, unit: Double) =
        OrderItem(id = null, productId = 1, productName = name, quantity = qty, unitPrice = unit, totalPrice = unit * qty)

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
    ) = OrderDetail(
        summary = OrderSummary(
            id = 1, orderNumber = "482113", orderType = type, status = status, totalAmount = total,
            depositAmount = deposit, customerName = customer, customerPhone = customer?.let { "0912 345 678" },
            // 07/10 and 16/10 in Vietnam: the UTC instants fall on the day before
            pickupPlanAt = "2026-10-06T17:00:00.000Z", returnPlanAt = "2026-10-16T16:59:59.000Z",
            createdAt = "2026-10-07T03:00:00.000Z", notes = null,
        ),
        items = listOf(item("Váy cưới đuôi cá trơn", 1, 650_000.0), item("Áo dài cưới đỏ", 1, 350_000.0), item("Vương miện ngọc trai", 2, 75_000.0)),
        customerId = 1,
        payments = payments,
        securityDeposit = security,
        collateralDetails = papers,
        discountAmount = discount,
    )

    private fun res(text: ShareText) = (text as ShareText.Res).id

    @Test
    fun pillTextAndToneByStatus() {
        assertEquals(R.string.share_status_reserved, res(OrderShareModel.pill("RESERVED").first))
        assertEquals(R.string.share_status_pickuped, res(OrderShareModel.pill("PICKUPED").first))
        assertEquals(R.string.share_status_pickuped, res(OrderShareModel.pill("PICKED_UP").first))
        assertEquals(R.string.share_status_returned, res(OrderShareModel.pill("RETURNED").first))
        assertEquals(R.string.share_status_completed, res(OrderShareModel.pill("COMPLETED").first))
        assertEquals(ShareTone.GREEN, OrderShareModel.pill("COMPLETED").second)
        assertEquals(R.string.share_status_cancelled, res(OrderShareModel.pill("CANCELLED").first))
        assertEquals(ShareTone.RED, OrderShareModel.pill("CANCELLED").second)
        val draft = draft()
        assertEquals(R.string.share_status_draft, res(draft.pill))
        assertEquals(ShareTone.ORANGE, draft.pillTone)
    }

    @Test
    fun rentHeaderCustomerAndDayStrip() {
        val m = OrderShareModel.from(order(), shop, vi = true, zone = vn)
        assertEquals("LA", m.initials)
        assertEquals("Chi nhánh Quận 3 · 0901 234 567", m.outletLine)
        assertEquals(R.string.share_kind_rent, res(m.kind))
        assertEquals(ShareText.Plain("#482113"), m.title)
        assertEquals(ShareText.Plain("Nguyễn Thị Mai"), m.customerName)
        assertEquals("0912 345 678", m.customerPhone)
        assertEquals(ShareDayStrip("T4 07/10", "T6 16/10", 10), m.dayStrip)
        assertEquals(ShareText.Res(R.string.share_items_rent, listOf(3)), m.itemsTitle)
        assertEquals(ShareLine("Vương miện ngọc trai", "2 × 75.000đ", "150.000đ"), m.lines[2])
        assertEquals(ShareText.Res(R.string.share_thanks, listOf("Lan Anh Bridal")), m.thanks)
        assertEquals("Order_482113.jpg", m.fileName)
        assertFalse(m.isDraft)
    }

    @Test
    fun englishDaysAndWalkIn() {
        val m = OrderShareModel.from(order(customer = null), shop, vi = false, zone = vn)
        assertEquals(ShareDayStrip("Wed 07/10", "Fri 16/10", 10), m.dayStrip)
        assertEquals(R.string.share_walk_in, res(m.customerName))
        assertNull(m.customerPhone)
    }

    @Test
    fun rentTotalsAndRentStillOwed() {
        val m = OrderShareModel.from(order(), shop, vi = true, zone = vn)
        assertEquals(
            listOf(
                ShareRow(ShareText.Res(R.string.share_rent_total), "1.150.000đ"),
                ShareRow(ShareText.Res(R.string.share_deposit_paid), "− 300.000đ"),
                ShareRow(ShareText.Res(R.string.share_collateral), "CCCD + 2.000.000đ"),
            ),
            m.rows,
        )
        // Rent still owed: total − deposit, collateral money not included (owner, 2026-10-07)
        assertEquals(ShareHighlight(ShareText.Res(R.string.share_amount_due), "850.000đ", ShareTone.ACCENT), m.highlight)
        assertNull(m.note)
    }

    @Test
    fun collateralMoneyDoesNotChangeTheAmountStillOwed() {
        val with = OrderShareModel.from(order(security = 2_000_000.0), shop, vi = true, zone = vn)
        val without = OrderShareModel.from(order(security = 0.0, papers = null), shop, vi = true, zone = vn)
        assertEquals("850.000đ", with.highlight.value)
        assertEquals(with.highlight, without.highlight)
    }

    @Test
    fun rentStillOwedSubtractsPickupPaymentsAndNeverGoesBelowZero() {
        fun pay(amount: Double, notes: String, status: String = "COMPLETED") = PaymentEntry(1, amount, "CASH", status, notes)
        val partly = order(payments = listOf(pay(500_000.0, "PICKUP"), pay(100_000.0, "PICKUP", status = "PENDING"), pay(900_000.0, "RETURN_ADJUSTMENT")))
        assertEquals("350.000đ", OrderShareModel.from(partly, shop, vi = true, zone = vn).highlight.value)
        // Handed over with rent + collateral collected: nothing owed, not negative
        val handedOver = order(status = "PICKUPED", payments = listOf(pay(2_850_000.0, "PICKUP")))
        assertEquals("0đ", OrderShareModel.from(handedOver, shop, vi = true, zone = vn).highlight.value)
        assertEquals("0đ", OrderShareModel.from(order(status = "CANCELLED"), shop, vi = true, zone = vn).highlight.value)
    }

    @Test
    fun rentWithoutDepositOrCollateralHasOnlyTheTotalRow() {
        val m = OrderShareModel.from(order(deposit = 0.0, security = 0.0, papers = null), shop, vi = true, zone = vn)
        assertEquals(listOf(R.string.share_rent_total), m.rows.map { res(it.label) })
    }

    @Test
    fun saleTotals() {
        val m = OrderShareModel.from(
            order(type = "SALE", status = "COMPLETED", total = 400_000.0, deposit = 0.0, security = 0.0, papers = null, discount = 20_000.0),
            shop, vi = true, zone = vn,
        )
        assertEquals(R.string.share_kind_sale, res(m.kind))
        assertNull(m.dayStrip)
        assertEquals(ShareText.Res(R.string.share_items_sale, listOf(3)), m.itemsTitle)
        assertEquals(
            listOf(
                ShareRow(ShareText.Res(R.string.share_subtotal), "420.000đ"),
                ShareRow(ShareText.Res(R.string.share_discount), "− 20.000đ"),
            ),
            m.rows,
        )
        assertEquals(ShareHighlight(ShareText.Res(R.string.share_total), "400.000đ", ShareTone.GREEN), m.highlight)
        assertEquals(ShareTone.GREEN, m.pillTone)
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
        assertTrue(qr.payload.contains("5406850000"))
        assertTrue(qr.payload.contains("62120808DH482113"))
        assertTrue(qr.payload.startsWith("000201010212"))
        assertEquals(VietQr.crc16(qr.payload.dropLast(4)), qr.payload.takeLast(4))
    }

    @Test
    fun qrWithoutAmountWhenNothingIsDue() {
        val returned = OrderShareModel.from(order(status = "RETURNED"), shop, vi = true, printBankQr = true, bankAccount = bank, zone = vn)
        assertEquals("0đ", returned.highlight.value)
        assertFalse(returned.qr!!.payload.contains("5407"))
        assertTrue(returned.qr!!.payload.contains("0808DH482113"))
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
        assertEquals(ShareText.Res(R.string.share_kind_draft, listOf(ShareText.Res(R.string.share_kind_rent), "T4 07/10")), m.kind)
        assertEquals(R.string.share_draft_title, res(m.title))
        assertEquals(ShareText.Plain("Nguyễn Thị Mai"), m.customerName)
        assertEquals(ShareDayStrip("T4 07/10", "T6 16/10", 10), m.dayStrip)
        assertEquals(
            listOf(
                ShareRow(ShareText.Res(R.string.share_draft_deposit), "300.000đ"),
                ShareRow(ShareText.Res(R.string.share_collateral), "CCCD + 2.000.000đ"),
            ),
            m.rows,
        )
        assertEquals(ShareHighlight(ShareText.Res(R.string.share_draft_estimate), "1.150.000đ", ShareTone.ORANGE), m.highlight)
        assertEquals(R.string.share_draft_note, res(m.note!!))
        assertNull(m.qr)
        assertTrue(m.isDraft)
        assertEquals("Draft_20261007-0630.jpg", m.fileName)
    }

    @Test
    fun saleDraftHasNoDaysNorDeposit() {
        val m = draft(sale = true, customer = null)
        assertNull(m.dayStrip)
        assertTrue(m.rows.isEmpty())
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
        assertEquals("CN 11/10", OrderShareModel.dayLabel(LocalDate.of(2026, 10, 11), vi = true))
        assertEquals("T2 12/10", OrderShareModel.dayLabel(LocalDate.of(2026, 10, 12), vi = true))
        assertEquals("Sun 11/10", OrderShareModel.dayLabel(LocalDate.of(2026, 10, 11), vi = false))
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
