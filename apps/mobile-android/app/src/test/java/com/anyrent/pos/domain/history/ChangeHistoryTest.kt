package com.anyrent.pos.domain.history

import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.util.TimeZone

/** #519 change history: lenient decoding, Vietnam civil days whatever the device zone, the boards' lines */
class ChangeHistoryTest {
    private lateinit var saved: TimeZone

    /** The JVM zone must not matter: run under a zone far from Vietnam */
    @Before fun setUp() {
        saved = TimeZone.getDefault()
        TimeZone.setDefault(TimeZone.getTimeZone("America/Los_Angeles"))
    }

    @After fun tearDown() = TimeZone.setDefault(saved)

    private fun i(s: String) = Instant.parse(s)

    private val boardJson = """
        {"success":true,"data":{"total":6,"latestAt":"2026-10-06T08:10:00.000Z","entries":[
          {"id":6,"at":"2026-10-06T08:10:00.000Z","kind":"ORDER_EDITED","actor":{"name":"Nguyễn An","role":"OUTLET_STAFF"},
           "changes":[{"field":"returnPlanAt","from":"2026-10-04T17:00:00.000Z","to":"2026-10-06T17:00:00.000Z"},
                      {"field":"totalAmount","from":1000000,"to":1300000}],"items":[]},
          {"id":5,"at":"2026-10-06T08:08:00.000Z","kind":"ORDER_ITEMS","actor":{"name":"Nguyễn An","role":"OUTLET_STAFF"},
           "changes":[],"items":[{"productId":4,"name":"Vest đen slim","field":"quantity","from":1,"to":2}]},
          {"id":4,"at":"2026-10-06T07:50:00.000Z","kind":"ORDER_ITEM_PRICE","actor":{"name":"Merchant 1","role":"MERCHANT"},
           "changes":[],"items":[{"productId":7,"name":"Áo dài lụa đỏ","field":"price","from":300000,"to":250000,"unit":"FIXED"}]},
          {"id":3,"at":"2026-10-05T11:02:00.000Z","kind":"ORDER_NOTE","actor":{"name":"Merchant 1","role":"MERCHANT"},
           "changes":[],"items":[],"note":{"text":"khách lấy thêm cà vạt nếu còn","imagesAdded":2,"imagesRemoved":0}},
          {"id":2,"at":"2026-10-05T07:33:00.000Z","kind":"ORDER_DEPOSIT","actor":{"name":"Merchant 1","role":"MERCHANT"},
           "changes":[{"field":"depositAmount","from":0,"to":300000}],"items":[]},
          {"id":1,"at":"2026-10-05T07:32:00.000Z","kind":"ORDER_CREATED","actor":{"name":"Merchant 1","role":"MERCHANT"},
           "changes":[],"items":[]}
        ]}}
    """.trimIndent()

    private val now = i("2026-10-06T09:00:00Z") // Tue 06/10 16:00 in Vietnam

    @Test fun boardOrderTimeline() {
        val page = ChangeHistory.parsePage(JSONObject(boardJson))
        assertEquals(6, page.total)
        assertEquals(i("2026-10-06T08:10:00Z"), page.latestAt)
        val sections = ChangeHistory.sections(page.entries, now)
        assertEquals(listOf("HÔM NAY · T3 06/10", "T2 05/10"), sections.map { it.header })
        val today = sections[0].rows
        assertEquals(listOf("Sửa đơn", "Sửa món", "Sửa giá trong đơn"), today.map { it.title })
        assertEquals(
            listOf(ChangeHistory.Line("Ngày trả", "05/10", "07/10"), ChangeHistory.Line("Tổng đơn", "1.000.000đ", "1.300.000đ")),
            today[0].lines,
        )
        assertEquals("bởi Nguyễn An (nhân viên) · 15:10", today[0].footer)
        assertEquals("NA", today[0].initials)
        assertEquals(listOf(ChangeHistory.Line("Vest đen slim", "× 1", "× 2")), today[1].lines)
        assertEquals(listOf(ChangeHistory.Line("Áo dài lụa đỏ", "300.000đ/lần", "250.000đ/lần")), today[2].lines)
        assertEquals("bởi Merchant 1 · 14:50", today[2].footer)
        assertEquals("M1", today[2].initials)

        val monday = sections[1].rows
        assertEquals(listOf("Sửa ghi chú", "Thu cọc", "Tạo đơn"), monday.map { it.title })
        assertEquals(listOf(ChangeHistory.Line(null, null, null, "Thêm 2 ảnh, “khách lấy thêm cà vạt nếu còn”")), monday[0].lines)
        assertEquals("bởi Merchant 1 · 18:02", monday[0].footer)
        assertEquals(listOf(ChangeHistory.Line("Cọc trả trước", "0đ", "300.000đ")), monday[1].lines)
        assertTrue(monday[2].lines.isEmpty())
        assertEquals(ChangeHistory.Tone.GREEN, monday[2].tone)
    }

    @Test fun boardProductTimeline() {
        val json = JSONObject(
            """
            {"data":{"total":5,"latestAt":"2026-10-06T02:15:00Z","entries":[
              {"id":10,"at":"2026-10-06T02:15:00Z","kind":"PRODUCT_PRICE","actor":{"name":"Merchant 1","role":"MERCHANT"},
               "changes":[{"field":"pricing.DAILY","from":150000,"to":130000},{"field":"pricing.FIXED","from":350000,"to":300000}]},
              {"id":9,"at":"2026-10-02T10:40:00Z","kind":"PRODUCT_STOCK","actor":{"name":"Admin Outlet 1","role":"OUTLET_ADMIN"},
               "changes":[{"field":"stock.Chi nhánh chính","from":3,"to":4}]},
              {"id":8,"at":"2026-10-02T10:38:00Z","kind":"PRODUCT_IMAGES","actor":{"name":"Admin Outlet 1","role":"OUTLET_ADMIN"},
               "changes":[{"field":"images","from":2,"to":2},{"field":"imagesAdded","from":null,"to":1},{"field":"imagesRemoved","from":null,"to":1}]},
              {"id":7,"at":"2026-09-28T03:05:00Z","kind":"PRODUCT_EDITED","actor":{"name":"Merchant 1","role":"MERCHANT"},
               "changes":[{"field":"name","from":"Vest đen","to":"Vest đen slim fit"},{"field":"deposit","from":500000,"to":400000}]},
              {"id":6,"at":"2026-09-28T03:00:00Z","kind":"PRODUCT_CREATED","actor":{"name":"Merchant 1","role":"MERCHANT"}}
            ]}}
            """.trimIndent(),
        )
        val sections = ChangeHistory.sections(ChangeHistory.parsePage(json).entries, now)
        assertEquals(listOf("HÔM NAY · T3 06/10", "T6 02/10", "T2 28/09"), sections.map { it.header })
        assertEquals(
            listOf(ChangeHistory.Line("Thuê theo ngày", "150.000đ", "130.000đ"), ChangeHistory.Line("Thuê theo lần", "350.000đ", "300.000đ")),
            sections[0].rows[0].lines,
        )
        val stock = sections[1].rows[0]
        assertEquals("Sửa tồn kho", stock.title)
        assertEquals(listOf(ChangeHistory.Line("Chi nhánh chính", "3", "4")), stock.lines)
        assertEquals("AO", stock.initials)
        assertEquals("bởi Admin Outlet 1 (nhân viên) · 17:40", stock.footer)
        assertEquals(listOf(ChangeHistory.Line(null, null, null, "Thêm 1 ảnh, bỏ 1 ảnh")), sections[1].rows[1].lines)
        assertEquals(
            listOf(ChangeHistory.Line("Tên", "Vest đen", "Vest đen slim fit"), ChangeHistory.Line("Tiền cọc", "500.000đ", "400.000đ")),
            sections[2].rows[0].lines,
        )
        assertEquals("Tạo sản phẩm", sections[2].rows[1].title)
    }

    @Test fun vietnamMidnightDecidesTheDay() {
        val entries = listOf(
            ChangeHistory.Entry(1, i("2026-10-05T16:59:59Z"), "ORDER_EDITED", null), // Mon 05/10 23:59:59 VN
            ChangeHistory.Entry(2, i("2026-10-05T17:00:00Z"), "ORDER_EDITED", null), // Tue 06/10 00:00 VN
        )
        val sections = ChangeHistory.sections(entries, now)
        assertEquals(listOf("HÔM NAY · T3 06/10", "T2 05/10"), sections.map { it.header })
        assertEquals("00:00", sections[0].rows[0].footer)
        assertEquals("23:59", sections[1].rows[0].footer)
    }

    @Test fun headersAcrossMonthAndYear() {
        val today = LocalDate.of(2027, 1, 1)
        assertEquals("T5 31/12", ChangeHistory.dayHeader(LocalDate.of(2026, 12, 31), today))
        assertEquals("HÔM NAY · T6 01/01", ChangeHistory.dayHeader(today, today))
        assertEquals("CN 01/11", ChangeHistory.dayHeader(LocalDate.of(2026, 11, 1), today))
    }

    @Test fun lenientValuesNeverCrash() {
        val json = JSONObject(
            """
            {"data":{"entries":[
              {"id":"12","at":"not a date","kind":"SOMETHING_NEW","actor":null,
               "changes":[{"field":"mystery","from":true,"to":{"a":1}},{"field":"isReadyToDeliver","from":false,"to":true},
                          {"field":"status","from":"RESERVED","to":"PICKUPED"},{"field":"totalAmount","from":"1000","to":null},
                          {"field":"pricing.BLOCK","from":null,"to":90000},{"nofield":1}],
               "items":[{"name":"X","field":"added","to":"3"},{"name":"Y","field":"removed","from":2},{"name":"Z","field":"weird","from":1.5,"to":2}]},
              "garbage",
              {"kind":"ORDER_PAYMENT","at":"2026-10-06T01:00:00Z","changes":[{"field":"paymentRefunded","from":null,"to":200000},{"field":"paymentMethod","from":null,"to":"CASH"}]}
            ]}}
            """.trimIndent(),
        )
        val page = ChangeHistory.parsePage(json)
        assertEquals(2, page.entries.size)
        assertEquals(2, page.total)
        assertNull(page.latestAt)
        val odd = page.entries[0]
        assertEquals(12L, odd.id)
        assertNull(odd.at)
        val row = ChangeHistory.row(odd)
        assertEquals("Cập nhật", row.title)
        assertEquals("?", row.initials)
        assertEquals("", row.footer)
        assertEquals(
            listOf(
                ChangeHistory.Line("mystery", "Có", "{\"a\":1}"),
                ChangeHistory.Line("Sẵn sàng giao", "Không", "Có"),
                ChangeHistory.Line("Trạng thái", "Đã đặt", "Đang thuê"),
                ChangeHistory.Line("Tổng đơn", "1.000đ", "—"),
                ChangeHistory.Line("Giá BLOCK", null, "90.000đ"),
                ChangeHistory.Line("X", null, "thêm × 3"),
                ChangeHistory.Line("Y", "× 2", "bỏ"),
                ChangeHistory.Line("Z", "1,5", "2"),
            ),
            row.lines,
        )
        val refund = ChangeHistory.row(page.entries[1])
        assertEquals("Hoàn tiền", refund.title)
        assertEquals(listOf(ChangeHistory.Line("Đã hoàn", null, "200.000đ"), ChangeHistory.Line("Hình thức", null, "Tiền mặt")), refund.lines)
        // An entry without a time goes last, under no header
        val sections = ChangeHistory.sections(page.entries, now)
        assertEquals(listOf("HÔM NAY · T3 06/10", ""), sections.map { it.header })
    }

    @Test fun emptyOrMissingPage() {
        val page = ChangeHistory.parsePage(JSONObject("{\"success\":true}"))
        assertTrue(page.entries.isEmpty())
        assertEquals(0, page.total)
        assertTrue(ChangeHistory.sections(page.entries, now).isEmpty())
    }

    @Test fun staffSuffixOnlyForOutletRoles() {
        fun footer(role: String?) = ChangeHistory.footer(
            ChangeHistory.Entry(1, i("2026-10-06T03:04:00Z"), "ORDER_EDITED", ChangeHistory.Actor("Lan", role)),
        )
        assertEquals("bởi Lan (nhân viên) · 10:04", footer("OUTLET_STAFF"))
        assertEquals("bởi Lan (nhân viên) · 10:04", footer("OUTLET_ADMIN"))
        assertEquals("bởi Lan · 10:04", footer("MERCHANT"))
        assertEquals("bởi Lan · 10:04", footer(null))
    }

    @Test fun onlyOwnersAndOutletAdminsSeeHistory() {
        for (role in listOf("ADMIN", "OPS", "MERCHANT", "OUTLET_ADMIN", "merchant", " OUTLET_ADMIN ")) {
            assertTrue(role, ChangeHistory.canView(role))
        }
        for (role in listOf("OUTLET_STAFF", "outlet_staff", "", "ARTICLE", "SOMETHING", null)) {
            assertFalse("$role", ChangeHistory.canView(role))
        }
    }

    @Test fun footerBoldsTheNameAndDropsUnknownActors() {
        fun row(actor: ChangeHistory.Actor?, texts: ChangeHistory.Texts = ChangeHistory.Texts()) = ChangeHistory.row(
            ChangeHistory.Entry(1, i("2026-10-06T08:10:00Z"), "ORDER_EDITED", actor), texts,
        )
        fun bold(r: ChangeHistory.Row) = r.footerName?.let { r.footer.substring(it.first, it.last + 1) }

        val owner = row(ChangeHistory.Actor("Trinh Trần", "MERCHANT"))
        assertEquals("bởi Trinh Trần · 15:10", owner.footer)
        assertEquals("Trinh Trần", bold(owner))

        val staff = row(ChangeHistory.Actor(" Lan Anh ", "OUTLET_STAFF"))
        assertEquals("bởi Lan Anh (nhân viên) · 15:10", staff.footer)
        assertEquals("Lan Anh", bold(staff))

        val english = row(ChangeHistory.Actor("Lan Anh", "OUTLET_ADMIN"), ChangeHistory.Texts(staffName = "%1\$s (staff)", actorBy = "by %1\$s"))
        assertEquals("by Lan Anh (staff) · 15:10", english.footer)
        assertEquals("Lan Anh", bold(english))

        val unknown = row(null)
        assertEquals("15:10", unknown.footer)
        assertNull(unknown.footerName)
        assertEquals("15:10", row(ChangeHistory.Actor("  ", "MERCHANT")).footer)
        assertNull(row(ChangeHistory.Actor("", "OUTLET_STAFF")).footerName)
    }

    @Test fun countSummaryOfTheSheetRow() {
        assertEquals("6 lần thay đổi · gần nhất 15:10 hôm nay", ChangeHistory.countSummary(6, i("2026-10-06T08:10:00Z"), now))
        assertEquals("2 lần thay đổi · gần nhất 05/10", ChangeHistory.countSummary(2, i("2026-10-05T16:59:59Z"), now))
        // 17:00Z on 05/10 is already 06/10 in Vietnam
        assertEquals("1 lần thay đổi · gần nhất 00:00 hôm nay", ChangeHistory.countSummary(1, i("2026-10-05T17:00:00Z"), now))
        assertEquals("3 lần thay đổi", ChangeHistory.countSummary(3, null, now))
        assertNull(ChangeHistory.countSummary(0, null, now))
    }

    @Test fun moneyAndNumbers() {
        assertEquals("0đ", ChangeHistory.money(0.0))
        assertEquals("1.000.000đ", ChangeHistory.money(1_000_000.0))
        assertEquals("−50.000đ", ChangeHistory.money(-50_000.0))
        assertEquals("12", ChangeHistory.number(12.0))
        assertEquals("1.234", ChangeHistory.number(1234.0))
    }

    @Test fun resourcePairs() {
        assertEquals(mapOf("A" to "Một", "B.C" to "x|y"), ChangeHistory.pairs(arrayOf("A|Một", "B.C|x|y", "broken", "|nokey")))
    }

    @Test fun newestFirstWhateverTheOrder() {
        val entries = listOf(
            ChangeHistory.Entry(1, i("2026-10-06T01:00:00Z"), "ORDER_CREATED", null),
            ChangeHistory.Entry(2, i("2026-10-06T03:00:00Z"), "ORDER_EDITED", null),
        )
        assertEquals(listOf(2L, 1L), ChangeHistory.sections(entries, now).single().rows.map { it.id })
    }
}
