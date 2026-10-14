package com.anyrent.pos.print

import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.data.model.OrderItem
import com.anyrent.pos.data.model.OrderSummary
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.text.Normalizer

/** #970: bill text loses its Vietnamese accents exactly as iOS `formatStringOriginalCharacter()` does */
class PrintTextTest {
    // Right side: the iOS function's output for the left side (swift, RCExtentions.swift, 14/10/26)
    private val iosOutputs = listOf(
        "CỬA HÀNG ÁO DÀI ĐẸP" to "CUA HANG AO DAI DEP",
        "Khách hàng: Nguyễn Thị Hồng Nhung - 0909 123 456" to "Khach hang: Nguyen Thi Hong Nhung - 0909 123 456",
        "Ghi chú: Đơn thuê của Trần Đức Trịnh" to "Ghi chu: Don thue cua Tran Duc Trinh",
        "*** Vui lòng mang theo CMND/BLX khi lấy đồ" to "*** Vui long mang theo CMND/BLX khi lay do",
        "Váy cưới Ỷ Lan · size M (đỏ)" to "Vay cuoi Y Lan · size M (do)",
        "Tiền cọc: 1.500.000đ" to "Tien coc: 1.500.000d",
        "Ưu đãi ỨNG Ữ Ự Ừ Ử Ơ Ớ Ờ Ở Ỡ Ợ" to "Uu dai UNG U U U U O O O O O O",
        "CHUYỂN KHOẢN" to "CHUYEN KHOAN",
        "NGUYỄN VĂN A" to "NGUYEN VAN A",
        "Thank you – 謝謝 €5" to "Thank you – 謝謝 €5",
        "Ạ Ả Ã Ẹ Ẻ Ẽ Ị Ỉ Ĩ Ọ Ỏ Õ Ụ Ủ Ũ Ỵ Ỷ Ỹ ỳ ý ỵ ỷ ỹ" to "A A A E E E I I I O O O U U U Y Y Y y y y y y",
    )

    @Test
    fun sameTextAsIos() {
        for ((input, ios) in iosOutputs) assertEquals(input, ios, PrintText.plain(input))
    }

    @Test
    fun decomposedAccentsToo() {
        val decomposed = Normalizer.normalize("Đơn thuê của Trần Đức", Normalizer.Form.NFD)
        assertEquals("Don thue cua Tran Duc", PrintText.plain(decomposed))
    }

    @Test
    fun billBytesHaveNoVietnameseAccents() {
        val order = OrderDetail(
            summary = OrderSummary(
                id = 7, orderNumber = "123456", orderType = "RENT", status = "RESERVED",
                totalAmount = 148_000.0, depositAmount = 0.0, customerName = "Trần Thị Đào", customerPhone = "0909123456",
                pickupPlanAt = "2026-10-05T03:00:00.000Z", returnPlanAt = "2026-10-06T03:00:00.000Z",
                createdAt = "2026-10-05T03:00:00.000Z", notes = "Đơn thuê của Trần Đức",
            ),
            items = listOf(OrderItem(id = 1, productId = 7, productName = "Áo dài đỏ", quantity = 1, unitPrice = 148_000.0, totalPrice = 148_000.0)),
            customerId = 1,
            payments = emptyList(),
            outletId = 5,
        )
        val config = ThermalPrinter.Config(ip = "", note = "*** Vui lòng mang theo CMND/BLX khi lấy đồ")
        val text = String(ThermalPrinter.buildOrderReceipt(config, order), Charsets.UTF_8)
        for (plain in listOf("Tran Thi Dao", "Ao dai do", "Don thue cua Tran Duc", "Vui long mang theo CMND/BLX khi lay do")) {
            assertTrue(plain, text.contains(plain))
        }
        assertTrue("no accented letter left", text.none { it in "Đđơưăâêôáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ" })
    }
}
