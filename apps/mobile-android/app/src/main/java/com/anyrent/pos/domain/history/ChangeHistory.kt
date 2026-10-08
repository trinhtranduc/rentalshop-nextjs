package com.anyrent.pos.domain.history

import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * #519 "Lịch sử thay đổi" (boards LS-don, LS-san-pham): the timeline of
 * GET /api/orders/{id}/changes and GET /api/products/{id}/changes, decoded leniently and turned into rows.
 *
 * - Decoding never throws on a strange entry: unknown kinds and fields stay, `from` / `to` may be a number,
 *   a string, a boolean or null (or anything else, read as its text).
 * - Days are Vietnam civil days ([shopZone]) whatever the device zone (timezone-dates). Times are shop times too.
 * - Pure and unit tested; the screen passes [Texts] built from string resources, the defaults are the boards' copy.
 */
object ChangeHistory {
    val shopZone: ZoneId get() = com.anyrent.pos.domain.ShopTime.zone

    /** Page size of the screen */
    const val PAGE_SIZE = 50

    // ---------------------------------------------------------------------------------------------
    // Model
    // ---------------------------------------------------------------------------------------------

    data class Actor(val name: String, val role: String?)

    /** `from` / `to`: [Double], [String], [Boolean] or null */
    data class FieldChange(val field: String, val from: Any?, val to: Any?)

    data class ItemChange(
        val productId: Int?,
        val name: String,
        /** quantity | price | added | removed (anything else is shown generically) */
        val field: String,
        val from: Double?,
        val to: Double?,
        /** The line's pricing type (DAILY, FIXED, …) for a price */
        val unit: String?,
    )

    data class NoteChange(val text: String?, val imagesAdded: Int, val imagesRemoved: Int)

    data class Entry(
        val id: Long,
        val at: Instant?,
        val kind: String,
        val actor: Actor?,
        val changes: List<FieldChange> = emptyList(),
        val items: List<ItemChange> = emptyList(),
        val note: NoteChange? = null,
    )

    data class Page(val entries: List<Entry>, val total: Int, val latestAt: Instant?)

    // ---------------------------------------------------------------------------------------------
    // Decoding
    // ---------------------------------------------------------------------------------------------

    /** The whole response (`{ success, data: { entries, total, latestAt } }`) or its `data` */
    fun parsePage(json: JSONObject): Page {
        val data = json.optJSONObject("data") ?: json
        val array = data.optJSONArray("entries") ?: JSONArray()
        val entries = (0 until array.length()).mapNotNull { index ->
            array.optJSONObject(index)?.let { runCatching { parseEntry(it) }.getOrNull() }
        }
        val total = (data.opt("total") as? Number)?.toInt() ?: entries.size
        return Page(entries, total.coerceAtLeast(entries.size), instant(data.opt("latestAt")))
    }

    fun parseEntry(o: JSONObject): Entry {
        val actor = o.optJSONObject("actor")?.let { a ->
            Actor(
                name = text(a.opt("name")).orEmpty().trim(),
                role = text(a.opt("role"))?.takeIf { it.isNotBlank() },
            )
        }
        val changes = objects(o.optJSONArray("changes")).mapNotNull { c ->
            val field = text(c.opt("field"))?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            FieldChange(field, value(c.opt("from")), value(c.opt("to")))
        }
        val items = objects(o.optJSONArray("items")).map { i ->
            ItemChange(
                productId = number(i.opt("productId"))?.toInt(),
                name = text(i.opt("name")).orEmpty(),
                field = text(i.opt("field")).orEmpty(),
                from = number(i.opt("from")),
                to = number(i.opt("to")),
                unit = text(i.opt("unit"))?.takeIf { it.isNotBlank() },
            )
        }
        val note = o.optJSONObject("note")?.let { n ->
            NoteChange(
                text = text(n.opt("text")),
                imagesAdded = number(n.opt("imagesAdded"))?.toInt() ?: 0,
                imagesRemoved = number(n.opt("imagesRemoved"))?.toInt() ?: 0,
            )
        }
        return Entry(
            id = number(o.opt("id"))?.toLong() ?: 0L,
            at = instant(o.opt("at")),
            kind = text(o.opt("kind"))?.takeIf { it.isNotBlank() } ?: "OTHER",
            actor = actor,
            changes = changes,
            items = items,
            note = note,
        )
    }

    private fun objects(array: JSONArray?): List<JSONObject> =
        if (array == null) emptyList() else (0 until array.length()).mapNotNull(array::optJSONObject)

    private fun isNull(v: Any?): Boolean = v == null || v == JSONObject.NULL

    /** A JSON scalar as [Double] / [String] / [Boolean]; null for null; anything else as its text */
    internal fun value(v: Any?): Any? = when {
        isNull(v) -> null
        v is Boolean -> v
        v is Number -> v.toDouble()
        v is String -> v
        else -> v.toString()
    }

    private fun text(v: Any?): String? = when {
        isNull(v) -> null
        v is String -> v
        else -> v.toString()
    }

    private fun number(v: Any?): Double? = when {
        isNull(v) -> null
        v is Number -> v.toDouble().takeIf { it.isFinite() }
        v is String -> v.trim().toDoubleOrNull()?.takeIf { it.isFinite() }
        else -> null
    }

    internal fun instant(v: Any?): Instant? {
        val raw = text(v)?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        return runCatching { Instant.parse(raw) }
            .recoverCatching { java.time.OffsetDateTime.parse(raw).toInstant() }
            .getOrNull()
    }

    // ---------------------------------------------------------------------------------------------
    // Display
    // ---------------------------------------------------------------------------------------------

    /**
     * Copy of the screen. Map keys: [kinds] by kind, [fields] by field key (`pricing.DAILY` included),
     * [values] by `<field>.<VALUE>` (`status.RESERVED`, `orderType.RENT`, `pricingType.DAILY`, …) and `bool.true` / `bool.false`.
     */
    data class Texts(
        /** Monday first */
        val weekdays: List<String> = listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN"),
        val todayHeader: String = "HÔM NAY · %1\$s",
        val kinds: Map<String, String> = DEFAULT_KINDS,
        val fields: Map<String, String> = DEFAULT_FIELDS,
        val values: Map<String, String> = DEFAULT_VALUES,
        /** Unknown kind */
        val otherKind: String = "Cập nhật",
        /** ORDER_PAYMENT that gives money back */
        val refundKind: String = "Hoàn tiền",
        /** The actor's name for OUTLET_STAFF / OUTLET_ADMIN */
        val staffName: String = "%1\$s (nhân viên)",
        /** Footer actor: "bởi Lan Anh (nhân viên)" */
        val actorBy: String = "bởi %1\$s",
        val perDay: String = "/ngày",
        val perRental: String = "/lần",
        val perHour: String = "/giờ",
        /** Quantity "× 2" */
        val quantity: String = "× %1\$s",
        val itemAdded: String = "thêm × %1\$s",
        val itemRemoved: String = "bỏ",
        val imagesAdded: String = "thêm %1\$d ảnh",
        val imagesRemoved: String = "bỏ %1\$d ảnh",
        /** Unknown pricing type of a `pricing.<TYPE>` field */
        val pricingOther: String = "Giá %1\$s",
        val empty: String = "—",
        /** Sheet row subtitle: "6 lần thay đổi · gần nhất 15:10 hôm nay" */
        val countSummary: String = "%1\$d lần thay đổi · gần nhất %2\$s",
        val countOnly: String = "%1\$d lần thay đổi",
        val latestToday: String = "%1\$s hôm nay",
    )

    /** One change line: [text] alone, or "[label]: [from] (struck) → [to]" with [from] optional */
    data class Line(val label: String?, val from: String?, val to: String?, val text: String? = null)

    /** Avatar colour by kind (boards LS-don, LS-san-pham) */
    enum class Tone { GREEN, BLUE, PURPLE, AMBER, SLATE, RED }

    data class Row(
        val id: Long,
        val initials: String,
        val title: String,
        val lines: List<Line>,
        /** "bởi Nguyễn An (nhân viên) · 15:10", or the time alone when nobody is known */
        val footer: String,
        val tone: Tone = Tone.SLATE,
        /** Where the actor name sits in [footer] (drawn bold, ink); null without a known actor */
        val footerName: IntRange? = null,
    )

    fun tone(kind: String): Tone = when (kind) {
        "ORDER_CREATED", "PRODUCT_CREATED", "ORDER_RESTORED", "PRODUCT_RESTORED", "ORDER_COMPLETED" -> Tone.GREEN
        "ORDER_ITEM_PRICE", "ORDER_DEPOSIT", "ORDER_PAYMENT", "PRODUCT_PRICE", "ORDER_PICKED_UP", "ORDER_RETURNED" -> Tone.BLUE
        "ORDER_EDITED", "ORDER_ITEMS", "PRODUCT_STOCK" -> Tone.PURPLE
        "ORDER_NOTE", "PRODUCT_EDITED" -> Tone.AMBER
        "ORDER_CANCELLED", "ORDER_DELETED", "PRODUCT_DELETED" -> Tone.RED
        else -> Tone.SLATE
    }

    data class Section(val header: String, val rows: List<Row>)

    /** Newest first, one section per Vietnam civil day; entries without a time go last, under no day */
    fun sections(entries: List<Entry>, now: Instant, texts: Texts = Texts(), zone: ZoneId = shopZone): List<Section> {
        val today = now.atZone(zone).toLocalDate()
        val sorted = entries.sortedWith(compareByDescending<Entry> { it.at ?: Instant.MIN }.thenByDescending { it.id })
        val out = mutableListOf<Section>()
        var currentDay: LocalDate? = null
        var currentRows = mutableListOf<Row>()
        var started = false
        for (entry in sorted) {
            val day = entry.at?.atZone(zone)?.toLocalDate()
            if (!started || day != currentDay) {
                if (started) out += Section(dayHeader(currentDay, today, texts), currentRows)
                currentDay = day
                currentRows = mutableListOf()
                started = true
            }
            currentRows.add(row(entry, texts, zone))
        }
        if (started) out += Section(dayHeader(currentDay, today, texts), currentRows)
        return out
    }

    /** "HÔM NAY · T3 06/10" for today, "T2 05/10" otherwise; "" for no day */
    fun dayHeader(day: LocalDate?, today: LocalDate, texts: Texts = Texts()): String {
        if (day == null) return ""
        val weekday = texts.weekdays.getOrNull(day.dayOfWeek.value - 1).orEmpty()
        val label = listOf(weekday, ddmm(day)).filter { it.isNotEmpty() }.joinToString(" ")
        return if (day == today) texts.todayHeader.format(label) else label
    }

    fun row(entry: Entry, texts: Texts = Texts(), zone: ZoneId = shopZone): Row {
        val footer = footerParts(entry, texts, zone)
        return Row(
            id = entry.id,
            initials = initials(entry.actor?.name),
            title = title(entry, texts),
            lines = lines(entry, texts, zone),
            footer = footer.text,
            tone = tone(entry.kind),
            footerName = footer.name,
        )
    }

    fun title(entry: Entry, texts: Texts = Texts()): String {
        if (entry.kind == "ORDER_PAYMENT" && entry.changes.any { it.field == "paymentRefunded" }) return texts.refundKind
        return texts.kinds[entry.kind] ?: texts.otherKind
    }

    /** First letters of the first two words: "Nguyễn An" → NA, "Admin Outlet 1" → AO, "Merchant 1" → M1 */
    fun initials(name: String?): String {
        val words = name.orEmpty().trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
        return words.take(2).joinToString("") { it.first().uppercase() }.ifEmpty { "?" }
    }

    /** Footer text and the range of the actor name in it (the only bold run) */
    data class Footer(val text: String, val name: IntRange?)

    /** "bởi Nguyễn An (nhân viên) · 15:10"; the time alone when nobody is known */
    fun footer(entry: Entry, texts: Texts = Texts(), zone: ZoneId = shopZone): String = footerParts(entry, texts, zone).text

    fun footerParts(entry: Entry, texts: Texts = Texts(), zone: ZoneId = shopZone): Footer {
        val time = entry.at?.let { hhmm(it, zone) }
        val name = entry.actor?.name?.trim()?.takeIf { it.isNotEmpty() }
            ?: return Footer(time.orEmpty(), null)
        var (head, tail) = splitFormat(texts.actorBy)
        if (isStaff(entry.actor?.role)) {
            val (staffHead, staffTail) = splitFormat(texts.staffName)
            head += staffHead
            tail = staffTail + tail
        }
        val text = head + name + tail + (time?.let { " · $it" } ?: "")
        return Footer(text, head.length until head.length + name.length)
    }

    /** "bởi %1\$s" → ("bởi ", ""); a format without the placeholder keeps the whole text before the name */
    fun splitFormat(format: String): Pair<String, String> {
        val at = format.indexOf("%1\$s").takeIf { it >= 0 } ?: format.indexOf("%s").takeIf { it >= 0 }
            ?: return format to ""
        val length = if (format.startsWith("%1\$s", at)) 4 else 2
        return format.substring(0, at) to format.substring(at + length)
    }

    /**
     * #670: change history is for ADMIN, OPS, MERCHANT and OUTLET_ADMIN; OUTLET_STAFF (and an unknown role) gets
     * neither the entry points nor the changes request (the API answers 403). Same rule as iOS `ChangeHistoryLogic.canView`
     */
    fun canView(role: String?): Boolean = role?.trim()?.uppercase() in setOf("ADMIN", "OPS", "MERCHANT", "OUTLET_ADMIN")

    fun isStaff(role: String?): Boolean = role.equals("OUTLET_STAFF", true) || role.equals("OUTLET_ADMIN", true)

    fun lines(entry: Entry, texts: Texts = Texts(), zone: ZoneId = shopZone): List<Line> {
        val out = mutableListOf<Line>()
        val fieldKeys = entry.changes.map { it.field }.toSet()
        val imageCounts = "imagesAdded" in fieldKeys || "imagesRemoved" in fieldKeys
        for (change in entry.changes) {
            when (change.field) {
                // Product photos: one "Thêm 1 ảnh, bỏ 1 ảnh" line instead of counts
                "images" -> if (!imageCounts) out += fieldLine(change, texts, zone)
                "imagesAdded", "imagesRemoved" -> Unit
                else -> out += fieldLine(change, texts, zone)
            }
        }
        if (imageCounts) {
            val added = entry.changes.firstOrNull { it.field == "imagesAdded" }?.to.asInt() ?: 0
            val removed = entry.changes.firstOrNull { it.field == "imagesRemoved" }?.to.asInt() ?: 0
            imagesText(added, removed, texts)?.let { out += Line(null, null, null, it) }
        }
        entry.items.forEach { out += itemLine(it, texts) }
        entry.note?.let { note ->
            val parts = listOfNotNull(
                note.imagesAdded.takeIf { it > 0 }?.let { texts.imagesAdded.format(it) },
                note.imagesRemoved.takeIf { it > 0 }?.let { texts.imagesRemoved.format(it) },
                note.text?.trim()?.takeIf { it.isNotEmpty() }?.let { "“$it”" },
            )
            if (parts.isNotEmpty()) out += Line(null, null, null, capitalize(parts.joinToString(", ")))
        }
        return out
    }

    private fun imagesText(added: Int, removed: Int, texts: Texts): String? {
        val parts = listOfNotNull(
            added.takeIf { it > 0 }?.let { texts.imagesAdded.format(it) },
            removed.takeIf { it > 0 }?.let { texts.imagesRemoved.format(it) },
        )
        return parts.takeIf { it.isNotEmpty() }?.let { capitalize(it.joinToString(", ")) }
    }

    fun fieldLine(change: FieldChange, texts: Texts = Texts(), zone: ZoneId = shopZone): Line {
        val label = fieldLabel(change.field, texts)
        val from = change.from?.let { formatValue(change.field, it, texts, zone) }
        val to = change.to?.let { formatValue(change.field, it, texts, zone) } ?: texts.empty
        return Line(label, from, to)
    }

    fun fieldLabel(field: String, texts: Texts = Texts()): String {
        texts.fields[field]?.let { return it }
        if (field.startsWith("stock.")) return field.removePrefix("stock.").ifBlank { field }
        if (field.startsWith("pricing.")) {
            val type = field.removePrefix("pricing.")
            return texts.pricingOther.format(texts.values["pricingType.${type.uppercase()}"] ?: type)
        }
        return field
    }

    fun itemLine(item: ItemChange, texts: Texts = Texts()): Line {
        val name = item.name.ifBlank { texts.empty }
        return when (item.field) {
            "quantity" -> Line(name, item.from?.let { texts.quantity.format(number(it)) }, item.to?.let { texts.quantity.format(number(it)) } ?: texts.empty)
            "price" -> Line(name, item.from?.let { money(it) + unit(item.unit, texts) }, item.to?.let { money(it) + unit(item.unit, texts) } ?: texts.empty)
            "added" -> Line(name, null, texts.itemAdded.format(number(item.to ?: 1.0)))
            "removed" -> Line(name, item.from?.let { texts.quantity.format(number(it)) }, texts.itemRemoved)
            else -> Line(name, item.from?.let { number(it) }, item.to?.let { number(it) } ?: texts.empty)
        }
    }

    private fun unit(type: String?, texts: Texts): String = when (type?.uppercase()) {
        "DAILY" -> texts.perDay
        "FIXED" -> texts.perRental
        "HOURLY" -> texts.perHour
        else -> ""
    }

    private val MONEY_FIELDS = setOf(
        "totalAmount", "depositAmount", "securityDeposit", "discountAmount", "damageFee", "lateFee",
        "paymentCollected", "paymentRefunded", "deposit", "rentPrice", "salePrice",
    )
    private val DATE_FIELDS = setOf("pickupPlanAt", "returnPlanAt", "pickedUpAt", "returnedAt")
    private val ENUM_FIELDS = setOf("status", "orderType", "pricingType", "discountType", "paymentMethod", "collateralType")

    /** One side of a field change as the boards write it */
    fun formatValue(field: String, value: Any, texts: Texts = Texts(), zone: ZoneId = shopZone): String {
        if (value is Boolean) return texts.values["bool.$value"] ?: value.toString()
        val asNumber = (value as? Double) ?: (value as? Number)?.toDouble()
        return when {
            field in MONEY_FIELDS || field.startsWith("pricing.") ->
                (asNumber ?: (value as? String)?.toDoubleOrNull())?.let { money(it) } ?: value.toString()
            field in DATE_FIELDS -> (value as? String)?.let { instant(it) }?.let { ddmm(it.atZone(zone).toLocalDate()) }
                ?: value.toString()
            field in ENUM_FIELDS -> texts.values["$field.${value.toString().uppercase()}"] ?: value.toString()
            field.startsWith("stock.") || field == "images" -> asNumber?.let { number(it) } ?: value.toString()
            asNumber != null -> number(asNumber)
            else -> value.toString().ifBlank { texts.empty }
        }
    }

    /** "6 lần thay đổi · gần nhất 15:10 hôm nay" / "… gần nhất 05/10"; null when there is no change */
    fun countSummary(total: Int, latestAt: Instant?, now: Instant, texts: Texts = Texts(), zone: ZoneId = shopZone): String? {
        if (total <= 0) return null
        val latest = latestAt ?: return texts.countOnly.format(total)
        val day = latest.atZone(zone).toLocalDate()
        val whenText = if (day == now.atZone(zone).toLocalDate()) texts.latestToday.format(hhmm(latest, zone)) else ddmm(day)
        return texts.countSummary.format(total, whenText)
    }

    fun ddmm(day: LocalDate): String = "%02d/%02d".format(day.dayOfMonth, day.monthValue)

    fun hhmm(instant: Instant, zone: ZoneId = shopZone): String {
        val t = instant.atZone(zone)
        return "%02d:%02d".format(t.hour, t.minute)
    }

    /** "1.000.000đ" (minus sign for a negative amount) */
    fun money(amount: Double): String {
        val rounded = Math.round(amount)
        val digits = kotlin.math.abs(rounded).toString().reversed().chunked(3).joinToString(".").reversed()
        return (if (rounded < 0) "−" else "") + digits + "đ"
    }

    /** Whole numbers without decimals, grouped with dots ("1.000"); fractions keep up to 2 decimals */
    fun number(value: Double): String {
        if (value == Math.rint(value) && kotlin.math.abs(value) < 1e15) {
            val whole = value.toLong()
            val digits = kotlin.math.abs(whole).toString().reversed().chunked(3).joinToString(".").reversed()
            return (if (whole < 0) "−" else "") + digits
        }
        return "%.2f".format(java.util.Locale.ROOT, value).trimEnd('0').trimEnd('.').replace('.', ',')
    }

    private fun Any?.asInt(): Int? = (this as? Number)?.toInt() ?: (this as? String)?.toDoubleOrNull()?.toInt()

    private fun capitalize(s: String): String = s.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }

    // ---------------------------------------------------------------------------------------------
    // Default copy (Vietnamese, the boards); the resource arrays carry the same "KEY|text" pairs
    // ---------------------------------------------------------------------------------------------

    val DEFAULT_KINDS: Map<String, String> = mapOf(
        "ORDER_CREATED" to "Tạo đơn",
        "ORDER_EDITED" to "Sửa đơn",
        "ORDER_ITEMS" to "Sửa món",
        "ORDER_ITEM_PRICE" to "Sửa giá trong đơn",
        "ORDER_DEPOSIT" to "Thu cọc",
        "ORDER_PAYMENT" to "Thu tiền",
        "ORDER_NOTE" to "Sửa ghi chú",
        "ORDER_PICKED_UP" to "Giao đồ",
        "ORDER_RETURNED" to "Nhận trả",
        "ORDER_COMPLETED" to "Hoàn tất",
        "ORDER_CANCELLED" to "Huỷ đơn",
        "ORDER_RESTORED" to "Khôi phục",
        "ORDER_DELETED" to "Xoá đơn",
        "PRODUCT_CREATED" to "Tạo sản phẩm",
        "PRODUCT_EDITED" to "Sửa thông tin",
        "PRODUCT_PRICE" to "Sửa giá",
        "PRODUCT_STOCK" to "Sửa tồn kho",
        "PRODUCT_IMAGES" to "Đổi ảnh",
        "PRODUCT_DELETED" to "Xoá sản phẩm",
        "PRODUCT_RESTORED" to "Khôi phục",
        "OTHER" to "Cập nhật",
    )

    val DEFAULT_FIELDS: Map<String, String> = mapOf(
        "status" to "Trạng thái",
        "orderType" to "Loại đơn",
        "pickupPlanAt" to "Ngày giao",
        "returnPlanAt" to "Ngày trả",
        "pickedUpAt" to "Đã giao",
        "returnedAt" to "Đã trả",
        "totalAmount" to "Tổng đơn",
        "depositAmount" to "Cọc trả trước",
        "securityDeposit" to "Tiền thế chấp",
        "discountType" to "Kiểu giảm giá",
        "discountValue" to "Mức giảm",
        "discountAmount" to "Giảm giá",
        "damageFee" to "Phí hư hỏng",
        "lateFee" to "Phí trả trễ",
        "collateralType" to "Loại thế chấp",
        "collateralDetails" to "Thế chấp",
        "pickupNotes" to "Ghi chú khi giao",
        "returnNotes" to "Ghi chú khi trả",
        "damageNotes" to "Ghi chú hư hỏng",
        "isReadyToDeliver" to "Sẵn sàng giao",
        "paymentCollected" to "Đã thu",
        "paymentRefunded" to "Đã hoàn",
        "paymentMethod" to "Hình thức",
        "notes" to "Ghi chú",
        "name" to "Tên",
        "barcode" to "Mã vạch",
        "category" to "Danh mục",
        "isActive" to "Đang bán",
        "deposit" to "Tiền cọc",
        "rentPrice" to "Giá thuê",
        "salePrice" to "Giá bán",
        "pricingType" to "Cách tính giá",
        "pricing.DAILY" to "Thuê theo ngày",
        "pricing.FIXED" to "Thuê theo lần",
        "pricing.HOURLY" to "Thuê theo giờ",
        "images" to "Ảnh",
    )

    val DEFAULT_VALUES: Map<String, String> = mapOf(
        "status.RESERVED" to "Đã đặt",
        "status.PICKUPED" to "Đang thuê",
        "status.RETURNED" to "Đã trả",
        "status.COMPLETED" to "Hoàn tất",
        "status.CANCELLED" to "Đã huỷ",
        "orderType.RENT" to "Thuê",
        "orderType.SALE" to "Bán",
        "pricingType.DAILY" to "Theo ngày",
        "pricingType.FIXED" to "Theo lần",
        "pricingType.HOURLY" to "Theo giờ",
        "discountType.AMOUNT" to "Số tiền",
        "discountType.PERCENTAGE" to "Phần trăm",
        "paymentMethod.CASH" to "Tiền mặt",
        "paymentMethod.BANK_TRANSFER" to "Chuyển khoản",
        "bool.true" to "Có",
        "bool.false" to "Không",
    )

    /** "KEY|text" items of a resource array → map; malformed items are skipped */
    fun pairs(items: Array<String>): Map<String, String> = items.mapNotNull { item ->
        val cut = item.indexOf('|')
        if (cut <= 0) null else item.substring(0, cut).trim() to item.substring(cut + 1).trim()
    }.toMap()
}
