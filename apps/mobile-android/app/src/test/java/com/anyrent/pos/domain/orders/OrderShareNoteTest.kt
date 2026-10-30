package com.anyrent.pos.domain.orders

import com.anyrent.pos.R
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.deposit.DepositPlanInfo
import com.anyrent.pos.domain.deposit.OrderInstallment
import com.anyrent.pos.domain.settings.CurrencySetting
import com.anyrent.pos.domain.settings.ShareOrderNoteSetting
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * #1354 "Hiện ghi chú đơn trên ảnh chia sẻ" (iOS `OrderShareNoteTests`, same expectations): who sets it, how the flag is
 * read, when the block is on the image, the 4-line cut, and the mockup's frames (a)-(g) with the switch ON and OFF.
 */
class OrderShareNoteTest {
    private val vn = ZoneId.of("Asia/Ho_Chi_Minh")
    private val shop = ShareShop("Lan Anh Bridal", "Chi nhánh Quận 3", "0901 234 567", "45 Võ Văn Tần, Quận 3, TP.HCM")
    private val now = Instant.parse("2026-10-07T07:00:00Z")
    private val note = "Khách hẹn nhận trước 9h sáng. Váy cần là lại trước khi giao."

    // ---- text of the real resources ------------------------------------------------------------------------------

    private val names: Map<Int, String> =
        R.string::class.java.fields.filter { it.type == Int::class.javaPrimitiveType }.associate { it.getInt(null) to it.name }

    private fun table(dir: String): Map<String, String> {
        val xml = File("src/main/res/$dir/strings.xml").readText()
        return Regex("""<string name="([^"]+)"[^>]*>(.*?)</string>""", RegexOption.DOT_MATCHES_ALL).findAll(xml)
            .associate { it.groupValues[1] to it.groupValues[2].replace("\\'", "'").replace("&amp;", "&") }
    }

    private fun text(t: ShareText, vi: Boolean): String = when (t) {
        is ShareText.Plain -> t.text
        is ShareText.Res -> String.format((if (vi) table("values-vi") else table("values")).getValue(names.getValue(t.id)))
        is ShareText.Plural -> error("no plural here")
    }

    // ---- fixtures ------------------------------------------------------------------------------------------------

    private fun item(name: String, qty: Int, unit: Double) =
        OrderItem(id = null, productId = 1, productName = name, quantity = qty, unitPrice = unit, totalPrice = unit * qty)

    private fun order(
        type: String = "RENT",
        total: Double = 1_150_000.0,
        deposit: Double = 0.0,
        security: Double = 0.0,
        papers: String? = null,
        discount: Double = 0.0,
        notes: String? = note,
        plan: DepositPlanInfo? = null,
    ) = OrderDetail(
        summary = OrderSummary(
            id = 1, orderNumber = "482113", orderType = type, status = "RESERVED", totalAmount = total, depositAmount = deposit,
            customerName = "Nguyễn Thị Mai", customerPhone = "0912 345 678",
            pickupPlanAt = "2026-10-06T17:00:00.000Z", returnPlanAt = "2026-10-16T16:59:59.000Z",
            createdAt = "2026-10-05T07:30:00.000Z", notes = notes,
        ),
        items = listOf(item("Váy cưới đuôi cá trơn", 1, 650_000.0), item("Áo dài cưới đỏ", 1, 350_000.0), item("Vương miện ngọc trai", 2, 75_000.0)),
        customerId = 1,
        payments = emptyList(),
        securityDeposit = security,
        collateralDetails = papers,
        discountAmount = discount,
        deposit = plan,
    )

    private fun make(o: OrderDetail, on: Boolean, vi: Boolean = true) =
        OrderShareModel.from(o, shop, vi = vi, zone = vn, now = now, showOrderNote = on)

    private fun product(id: Int, name: String, price: Double) = Product(
        id = id, name = name, barcode = null, rentPrice = price, salePrice = price, stock = 5, available = 5, renting = 0,
        categoryId = null, categoryName = null, imageUrl = null,
    )

    private fun draft() = OrderShareModel.fromDraft(
        lines = listOf(CartLine(product(1, "Váy cưới đuôi cá trơn", 650_000.0), 1, isSale = false, unitPriceOverride = 650_000.0)),
        customer = null, isSale = false, pickup = LocalDate.of(2026, 10, 7), returnDate = LocalDate.of(2026, 10, 16),
        discountAmount = 0.0, deposit = 300_000.0, securityDeposit = 2_000_000.0, collateralDetails = "CCCD",
        shop = shop, vi = true, now = now, zone = vn,
    )

    // ---- who sets it, how it is read -----------------------------------------------------------------------------

    @Test
    fun onlyTheShopOwnerSetsIt() {
        assertTrue(ShareOrderNoteSetting.canEdit("MERCHANT"))
        listOf("ADMIN", "OPS", "OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", null).forEach {
            assertFalse(it.toString(), ShareOrderNoteSetting.canEdit(it))
        }
    }

    @Test
    fun missingFlagMeansOff() {
        assertFalse(ShareOrderNoteSetting.fromMerchant(null))
        assertFalse(ShareOrderNoteSetting.fromMerchant(JSONObject("{\"id\":1}")))
        assertFalse(ShareOrderNoteSetting.fromMerchant(JSONObject("{\"shareOrderNote\":null}")))
        assertFalse(ShareOrderNoteSetting.fromMerchant(JSONObject("{\"shareOrderNote\":false}")))
        assertFalse(ShareOrderNoteSetting.fromMerchant(JSONObject("{\"shareOrderNote\":\"true\"}")))
        assertFalse(ShareOrderNoteSetting.fromMerchant(JSONObject("{\"shareOrderNote\":1}")))
        assertTrue(ShareOrderNoteSetting.fromMerchant(JSONObject("{\"shareOrderNote\":true}")))
    }

    @Test
    fun readsProfileAndSaveAnswers() {
        // GET /api/users/profile: { data: user }
        assertEquals(true, ShareOrderNoteSetting.fromResponse(JSONObject("{\"success\":true,\"data\":{\"id\":3,\"merchant\":{\"id\":1,\"shareOrderNote\":true}}}")))
        assertEquals(false, ShareOrderNoteSetting.fromResponse(JSONObject("{\"data\":{\"id\":3,\"merchant\":{\"id\":1}}}")))
        // PUT /api/settings/merchant: { data: { shareOrderNote } }
        assertEquals(true, ShareOrderNoteSetting.fromResponse(JSONObject("{\"data\":{\"id\":1,\"shareOrderNote\":true}}")))
        // An answer without a merchant (ADMIN): nothing to read, keep the cached value
        assertNull(ShareOrderNoteSetting.fromResponse(JSONObject("{\"data\":{\"id\":3,\"outlet\":{\"id\":2}}}")))
    }

    @Test
    fun bodyCarriesOnlyTheSetting() {
        assertEquals("{\"shareOrderNote\":true}", ShareOrderNoteSetting.body(true).toString())
        assertEquals("{\"shareOrderNote\":false}", ShareOrderNoteSetting.body(false).toString())
    }

    @Test
    fun refreshReadsOnceAMinuteForEveryShopRole() {
        assertTrue(CurrencySetting.shouldRefresh("OUTLET_STAFF", null, 1_000_000L, false))
        assertFalse(CurrencySetting.shouldRefresh("OUTLET_STAFF", 1_000_000L - 30_000L, 1_000_000L, false))
        assertTrue(CurrencySetting.shouldRefresh("OUTLET_STAFF", 1_000_000L - 61_000L, 1_000_000L, false))
        assertFalse(CurrencySetting.shouldRefresh("ADMIN", null, 1_000_000L, true))
    }

    // ---- when the block is on the image --------------------------------------------------------------------------

    @Test
    fun textOnlyForAnOrderWithTheSwitchOnAndANote() {
        assertEquals("Giao trước 9h", ShareOrderNoteRule.text("  Giao trước 9h \n", enabled = true, isDraft = false))
        assertNull(ShareOrderNoteRule.text("Giao trước 9h", enabled = false, isDraft = false))
        assertNull(ShareOrderNoteRule.text("Giao trước 9h", enabled = true, isDraft = true))
        listOf(null, "", "   ", "\n \t").forEach { assertNull(it.toString(), ShareOrderNoteRule.text(it, enabled = true, isDraft = false)) }
    }

    @Test
    fun offOrNoNoteIsTheImageOfBefore() {
        for (type in listOf("RENT", "SALE")) {
            assertNull("no note: no block even with the switch on", make(order(type = type, notes = null), on = true).orderNote)
            assertNull("blank note", make(order(type = type, notes = "  \n"), on = true).orderNote)
            assertNull("switch off", make(order(type = type), on = false).orderNote)
            assertEquals("switch off is the image of #1349 line for line", make(order(type = type, notes = null), on = false), make(order(type = type), on = false))
            assertEquals(make(order(type = type, notes = null), on = true), make(order(type = type, notes = null), on = false))
        }
    }

    @Test
    fun theBlockIsTitledAndKeepsTheNote() {
        val block = make(order(), on = true).orderNote
        assertNotNull(block)
        assertEquals("Ghi chú", text(block!!.title, vi = true))
        assertEquals("Note", text(block.title, vi = false))
        assertEquals(note, block.text)
    }

    @Test
    fun nothingElseOnTheImageMoves() {
        val off = make(order(deposit = 300_000.0), on = false)
        val on = make(order(deposit = 300_000.0), on = true)
        assertNotNull(on.orderNote)
        assertEquals(off.money, on.money)
        assertEquals(off.lines, on.lines)
        assertEquals(off.qr, on.qr)
        assertEquals(off.thanks, on.thanks)
        assertEquals(off.note, on.note)
        assertEquals(off, on.copy(orderNote = null))
    }

    // ---- frames (a)-(g) --------------------------------------------------------------------------------------------

    @Test
    fun framesAToG() {
        val staged = DepositPlanInfo(
            installments = listOf(
                OrderInstallment("i1", "Cọc giữ chỗ", 20.0, 230_000.0, dueDateKey = "2026-10-05", status = "PAID", collectedAt = "2026-10-05T07:00:00.000Z", paidAmount = 230_000.0, remaining = 0.0),
                OrderInstallment("rest", "rest", 80.0, 920_000.0, dueDateKey = "2026-10-16", status = "UPCOMING"),
            ),
            hasPlan = true,
        )
        val frames = listOf(
            "a" to order(deposit = 300_000.0),
            "b" to order(deposit = 230_000.0, plan = staged),
            "c" to order(),
            "d" to order(deposit = 300_000.0, discount = 100_000.0),
            "e" to order(deposit = 300_000.0, security = 2_000_000.0, papers = "CCCD"),
            "f sale" to order(type = "SALE", total = 400_000.0, discount = 20_000.0),
        )
        for ((name, o) in frames) {
            val off = make(o, on = false)
            val on = make(o, on = true)
            assertNull("($name) switch off", off.orderNote)
            assertEquals("($name) switch on", note, on.orderNote?.text)
            assertEquals("($name) the money part does not move", off.money, on.money)
        }
        assertNull("(g) a draft has no order note", draft().orderNote)
    }

    // ---- the cut: at most 4 lines, "…" when more -----------------------------------------------------------------

    private val fits10: (String) -> Boolean = { it.length <= 10 }

    @Test
    fun wrapsByWordsAndKeepsLineBreaks() {
        assertEquals(listOf("hello", "world foo", "bar"), ShareNoteClip.lines("hello world foo bar", fits = fits10))
        assertEquals(listOf("a", "b"), ShareNoteClip.lines("a\nb", fits = fits10))
        assertEquals(listOf("a", "b c"), ShareNoteClip.lines("a\r\n\r\n\nb  c", fits = fits10))
        assertEquals(emptyList<String>(), ShareNoteClip.lines("   ", fits = fits10))
        assertEquals(emptyList<String>(), ShareNoteClip.lines("", fits = fits10))
    }

    @Test
    fun aLongWordIsCutByCharacters() {
        assertEquals(listOf("abcdefghij", "klmnopqrst", "uvwxyz"), ShareNoteClip.lines("abcdefghijklmnopqrstuvwxyz", fits = fits10))
        assertEquals(listOf("ab", "abcdefghij", "klmnop"), ShareNoteClip.lines("ab abcdefghijklmnop", fits = fits10))
    }

    @Test
    fun fourLinesAreKeptWhole() {
        assertEquals(
            listOf("aaaaaaaa", "bbbbbbbb", "cccccccc", "dddddddd"),
            ShareNoteClip.lines("aaaaaaaa bbbbbbbb cccccccc dddddddd", fits = fits10),
        )
    }

    @Test
    fun moreThanFourLinesEndWithAnEllipsisOnTheFourth() {
        assertEquals(
            listOf("aaaaaaaa", "bbbbbbbb", "cccccccc", "dddddddd…"),
            ShareNoteClip.lines("aaaaaaaa bbbbbbbb cccccccc dddddddd eeeeeeee ffffffff", fits = fits10),
        )
        assertEquals(
            listOf("aaaaaaaaaa", "bbbbbbbbbb", "cccccccccc", "ddddddddd…"),
            ShareNoteClip.lines("aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee", fits = fits10),
        )
        assertEquals(listOf("a", "b", "c", "d…"), ShareNoteClip.lines("a\nb\nc\nd\ne", fits = fits10))
        assertEquals(listOf("a b", "c…"), ShareNoteClip.lines("a b c d e f", maxLines = 2, fits = { it.length <= 3 }))
    }

    @Test
    fun vietnameseIsCutByCharacters() {
        assertEquals(listOf("ếếếếếếếếếế", "ếếế"), ShareNoteClip.lines("ếếếếếếếếếếếếế", fits = fits10))
    }
}
