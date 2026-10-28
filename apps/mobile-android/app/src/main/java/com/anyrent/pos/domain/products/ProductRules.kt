package com.anyrent.pos.domain.products

import androidx.annotation.StringRes
import com.anyrent.pos.R
import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.Product
import java.time.LocalDate
import java.time.temporal.ChronoUnit

/*
 * Pure rules of the redesigned products, product form and cart (#373, flag `newProducts`).
 * Same rules as iOS `Model/ProductsV2.swift`; the unit tests cover them.
 */

/** Product rights by role. The API is the real gate; these only decide which controls are shown. */
object ProductAccess {
    /**
     * Roles with `products.manage` (MERCHANT, OUTLET_ADMIN, Nhân viên kho). OUTLET_STAFF lost `products.create`
     * in #825, so iOS hides the Home "+"; Android does the same (#863).
     */
    fun canCreate(role: UserRole): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN || role == UserRole.OUTLET_INVENTORY

    /** OUTLET_STAFF has no `products.update`; Nhân viên kho has `products.manage` (#682) */
    fun canEdit(role: UserRole): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN || role == UserRole.OUTLET_INVENTORY

    /** `DELETE /api/products/{id}` needs `products.manage`: never OUTLET_STAFF (#390) */
    fun canDelete(role: UserRole): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN || role == UserRole.OUTLET_INVENTORY

    /** Price fields in the form and price edits in the cart */
    fun showsPriceFields(role: UserRole): Boolean = canEdit(role)
}

/**
 * #632 — categories from the product form, same gates as the API and iOS `CategoryRules`:
 * `POST /api/categories` needs `products.manage` (MERCHANT, OUTLET_ADMIN); `PUT`/`DELETE /api/categories/{id}`
 * only MERCHANT (and ADMIN). Same name rule as the web form.
 */
object CategoryRules {
    const val NAME_MIN = 2
    const val NAME_MAX = 50

    enum class NameError { REQUIRED, TOO_SHORT, TOO_LONG }

    fun canAdd(role: UserRole): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN || role == UserRole.OUTLET_INVENTORY

    /** Rename / delete: owners and Nhân viên kho (#682); the API refuses outlet admins */
    fun canManage(role: UserRole): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_INVENTORY

    /** The default category ("General") is never deleted, only renamed */
    fun canDelete(isDefault: Boolean): Boolean = !isDefault

    /** Search box of the category screen: accent- and case-insensitive ("ao cuoi" finds "Áo cưới"); blank keeps all */
    fun matches(name: String?, query: String): Boolean {
        val needle = fold(query)
        return needle.isEmpty() || fold(name.orEmpty()).contains(needle)
    }

    private fun fold(text: String): String =
        java.text.Normalizer.normalize(text.trim().lowercase(), java.text.Normalizer.Form.NFD)
            .replace(Regex("\\p{M}+"), "")
            .replace('đ', 'd')

    fun validateName(name: String): NameError? {
        val trimmed = name.trim()
        return when {
            trimmed.isEmpty() -> NameError.REQUIRED
            trimmed.length < NAME_MIN -> NameError.TOO_SHORT
            trimmed.length > NAME_MAX -> NameError.TOO_LONG
            else -> null
        }
    }
}

enum class PricingMode(val apiType: String) {
    PER_RENTAL("FIXED"),
    PER_DAY("DAILY"),
    /** #1189: day-block table ("Giá theo khối ngày") */
    BLOCK("BLOCK"),
}

/** #418 — the pricing types `POST /api/orders` accepts; null, blank or unknown read as FIXED (iOS `?? "FIXED"`) */
object PricingTypes {
    private val known = setOf("FIXED", "HOURLY", "DAILY", "BLOCK")

    fun normalize(raw: String?): String = raw?.trim()?.uppercase()?.takeIf { it in known } ?: "FIXED"

    /**
     * #482: type of a pricing option as the cart sheet lists it; BLOCK stays BLOCK so it gets its own row. The order
     * payload still goes through [normalize] (the API takes FIXED / HOURLY / DAILY), so a block price is sent as FIXED.
     */
    fun normalizeOption(raw: String?): String = raw?.trim()?.uppercase()?.takeIf { it in known || it == "BLOCK" } ?: "FIXED"
}

data class PricingOptionInput(val type: String, val price: Double, val isDefault: Boolean, val blockTable: BlockTable? = null)

object ProductPricing {
    fun perRental(product: Product): Double? {
        if (product.pricingOptions.isEmpty()) {
            if (product.pricingType.equals("DAILY", ignoreCase = true)) return null
            return product.rentPrice.takeIf { it > 0 }
        }
        // #951: an option of 0 is a 0đ price. A bare rentPrice of 0 is not a list price (a sale-only product). #996 prices it in the cart.
        return product.pricingOptions.firstOrNull { it.type.equals("FIXED", ignoreCase = true) }?.price?.takeIf { it >= 0 }
    }

    fun perDay(product: Product): Double? {
        if (product.pricingOptions.isEmpty()) {
            if (!product.pricingType.equals("DAILY", ignoreCase = true)) return null
            return product.rentPrice.takeIf { it > 0 }
        }
        return product.pricingOptions.firstOrNull { it.type.equals("DAILY", ignoreCase = true) }?.price?.takeIf { it >= 0 }
    }

    /** #1189: the day-block table of the product (a BLOCK option); null when it has none */
    fun block(product: Product): BlockTable? =
        product.pricingOptions.firstOrNull { it.type.equals("BLOCK", ignoreCase = true) && it.blockTable != null }?.blockTable

    fun sale(product: Product): Double? = product.salePrice?.takeIf { it > 0 }

    fun defaultMode(product: Product): PricingMode {
        val type = product.pricingOptions.firstOrNull { it.isDefault }?.type
            ?: product.pricingOptions.firstOrNull()?.type
            ?: product.pricingType
        if (type.equals("BLOCK", ignoreCase = true) && block(product) != null) return PricingMode.BLOCK
        return if (type.equals("DAILY", ignoreCase = true)) PricingMode.PER_DAY else PricingMode.PER_RENTAL
    }

    /**
     * Options sent on save (#951: 0 is a 0đ price, empty = none); a default without a price falls back to the mode
     * that has one. #1189: the BLOCK option carries the table, its `price` is the day-1 price.
     */
    fun options(perRental: Double?, perDay: Double?, defaultMode: PricingMode, block: BlockTable? = null): List<PricingOptionInput> {
        val fixed = perRental?.takeIf { it >= 0 }
        val daily = perDay?.takeIf { it >= 0 }
        val has = { m: PricingMode ->
            when (m) {
                PricingMode.PER_RENTAL -> fixed != null
                PricingMode.PER_DAY -> daily != null
                PricingMode.BLOCK -> block != null
            }
        }
        // The default is the mode that has a price: the one asked for, else the first that has one
        val mode = if (has(defaultMode)) defaultMode
        else listOf(PricingMode.PER_RENTAL, PricingMode.PER_DAY, PricingMode.BLOCK).firstOrNull(has) ?: PricingMode.PER_RENTAL
        return listOfNotNull(
            fixed?.let { PricingOptionInput("FIXED", it, mode == PricingMode.PER_RENTAL) },
            daily?.let { PricingOptionInput("DAILY", it, mode == PricingMode.PER_DAY) },
            block?.let { PricingOptionInput("BLOCK", it.tiers.first(), mode == PricingMode.BLOCK, it) },
        )
    }
}

data class StockCounts(val total: Int, val rented: Int, val free: Int)

object ProductStock {
    /** With [outletId], that outlet's row; else the product totals (rented = total − available) */
    fun counts(product: Product, outletId: Int? = null): StockCounts {
        val row = outletId?.let { id -> product.outletStock.firstOrNull { it.outletId == id } }
        if (row != null) {
            return StockCounts(row.stock, row.renting, (row.stock - row.renting).coerceAtLeast(0))
        }
        val rented = if (product.renting > 0) product.renting else (product.stock - product.available).coerceAtLeast(0)
        return StockCounts(product.stock, rented, (product.stock - rented).coerceAtLeast(0))
    }

    /** Free today for the list badge ("Còn N" / "Hết hôm nay") */
    fun freeToday(product: Product): Int = product.effectiveAvailableToday ?: product.available

    /** Outlet whose stock the form writes: the user's, else the product's first row, else the merchant's default */
    fun outletFor(userOutletId: Int?, product: Product?, merchantOutlets: List<Pair<Int, Boolean>>): Int? =
        userOutletId
            ?: product?.outletStock?.firstOrNull()?.outletId
            ?: (merchantOutlets.firstOrNull { it.second } ?: merchantOutlets.firstOrNull())?.first
}

// ---------------------------------------------------------------------------------------------
// Home row (#383)
// ---------------------------------------------------------------------------------------------

/** The + button on a Home row: add, already in the cart (shows the count), or out today (grey) */
sealed class AddButtonState {
    object Add : AddButtonState()
    data class InCart(val count: Int) : AddButtonState()
    object Out : AddButtonState()
}

/** The line under the name: the product code and today's free count (no category) */
data class ProductRowSubtitle(val code: String?, val free: Int)

/**
 * The Home row's price line (#681, iOS `ProductRowPrice`): the default rent option first, the other one muted after it.
 * `mainMode == null` means a sale-only product, shown as "bán <price>".
 */
/** `sale` (#887): the sale price of a product that also rents, shown last as "· bán <price>" (board SP-dong, iOS) */
data class ProductRowPrice(
    val main: Double,
    val mainMode: PricingMode?,
    val second: Double? = null,
    val secondMode: PricingMode? = null,
    val sale: Double? = null,
)

object ProductRowLogic {
    /** #937: Home product names wrap to two lines, then "…" */
    const val NAME_MAX_LINES = 2

    /** #937: badge of the Home cart button: the cart's units (same number as the cart bar), capped at 99, none when empty */
    fun cartBadge(itemCount: Int): String? = if (itemCount > 0) itemCount.coerceAtMost(99).toString() else null

    /** Units of this product already in the cart */
    fun cartCount(productId: Int, lines: List<CartLine>): Int =
        lines.filter { it.product.id == productId }.sumOf { it.quantity }

    fun subtitle(product: Product): ProductRowSubtitle =
        ProductRowSubtitle(code = product.barcodeText, free = ProductStock.freeToday(product))

    fun price(product: Product): ProductRowPrice? {
        val rental = ProductPricing.perRental(product)
        val day = ProductPricing.perDay(product)
        val sale = ProductPricing.sale(product)
        // #1189: a product whose default is the day-block table shows the day-1 price first
        val table = ProductPricing.block(product)
        if (ProductPricing.defaultMode(product) == PricingMode.BLOCK && table != null) {
            val other = rental?.let { it to PricingMode.PER_RENTAL } ?: day?.let { it to PricingMode.PER_DAY }
            return ProductRowPrice(table.tiers.first(), PricingMode.BLOCK, other?.first, other?.second, sale)
        }
        return when {
            rental != null && day != null ->
                if (ProductPricing.defaultMode(product) == PricingMode.PER_DAY) {
                    ProductRowPrice(day, PricingMode.PER_DAY, rental, PricingMode.PER_RENTAL, sale)
                } else {
                    ProductRowPrice(rental, PricingMode.PER_RENTAL, day, PricingMode.PER_DAY, sale)
                }
            rental != null -> ProductRowPrice(rental, PricingMode.PER_RENTAL, sale = sale)
            day != null -> ProductRowPrice(day, PricingMode.PER_DAY, sale = sale)
            else -> ProductPricing.sale(product)?.let { ProductRowPrice(it, null) }
        }
    }

    /** The cart count wins (#677, iOS `ProductRowLogic.addState`): a product out today that is in the cart shows its count */
    fun addState(free: Int, inCart: Int): AddButtonState = when {
        inCart > 0 -> AddButtonState.InCart(inCart)
        free <= 0 -> AddButtonState.Out
        else -> AddButtonState.Add
    }
}

/** What the full-screen viewer shows: the photos and the one it opens at (#472) */
data class ProductImageViewerRequest(val urls: List<String>, val startIndex: Int)

/** Full-screen photos (#472, iOS `ProductImages`) */
object ProductImages {
    /** The product's photos in pager order: `images` without blanks, else `imageUrl` (same list as the detail pager) */
    fun viewerUrls(product: Product): List<String> =
        product.images.filter { it.isNotBlank() }.ifEmpty { listOfNotNull(product.imageUrl?.takeIf { it.isNotBlank() }) }

    /** The URL the Home row thumbnail loads (first of `images`, else `imageUrl`); null means the placeholder */
    fun thumbnailUrl(product: Product): String? =
        (product.images.firstOrNull() ?: product.imageUrl)?.takeIf { it.isNotBlank() }

    /** A tap on the Home row thumbnail: the viewer at that photo, or null (placeholder) so the row opens detail */
    fun thumbnailTap(product: Product): ProductImageViewerRequest? {
        val thumb = thumbnailUrl(product) ?: return null
        val urls = viewerUrls(product).ifEmpty { return null }
        return ProductImageViewerRequest(urls, urls.indexOf(thumb).coerceAtLeast(0))
    }

    /** A tap on the detail photo pager: the viewer at the page on screen (clamped), or null without photos */
    fun detailTap(product: Product, page: Int): ProductImageViewerRequest? {
        val urls = viewerUrls(product).ifEmpty { return null }
        return ProductImageViewerRequest(urls, page.coerceIn(0, urls.lastIndex))
    }
}

/**
 * Code for a new product: last 8 digits of the clock + 3 random digits.
 * Same rule as the web form `generateBarcode` (#994). An edit keeps the saved code.
 */
object ProductBarcode {
    fun generate(now: Long = System.currentTimeMillis(), random: Int = (0..999).random()): String {
        val clock = now.toString().let { if (it.length >= 8) it.takeLast(8) else it.padStart(8, '0') }
        val tail = random.coerceIn(0, 999).toString().padStart(3, '0')
        return clock + tail
    }
}

object BarcodeMatch {
    /** The product whose barcode equals [code] (trimmed, case-insensitive); the search API also matches names */
    fun exact(code: String, products: List<Product>): Product? {
        val wanted = code.trim()
        if (wanted.isEmpty()) return null
        return products.firstOrNull { it.barcode?.trim().equals(wanted, ignoreCase = true) }
    }
}

// ---------------------------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------------------------

data class ProductFormInput(
    val name: String,
    val perRental: Double?,
    val perDay: Double?,
    val defaultMode: PricingMode,
    val salePrice: Double?,
    val deposit: Double?,
    val quantity: Int,
    /** Units out on rent now (edit only); quantity may not go below it */
    val rented: Int,
    val photoCount: Int,
    val showsPrices: Boolean,
    /** #1249: the day table "Theo ngày" sends; null = none */
    val block: BlockTable? = null,
)

sealed class ProductFormIssue {
    object NameRequired : ProductFormIssue()
    object NegativeAmount : ProductFormIssue()
    object PerDayDefaultNeedsPrice : ProductFormIssue()
    object NegativeQuantity : ProductFormIssue()
    data class QuantityBelowRented(val rented: Int) : ProductFormIssue()
    data class TooManyPhotos(val max: Int) : ProductFormIssue()
}

object ProductFormValidator {
    const val MAX_PHOTOS = 5

    fun validate(input: ProductFormInput): List<ProductFormIssue> {
        val issues = mutableListOf<ProductFormIssue>()
        if (input.name.isBlank()) issues += ProductFormIssue.NameRequired
        val amounts = listOf(input.deposit) +
            if (input.showsPrices) listOf(input.perRental, input.perDay, input.salePrice) else emptyList()
        if (amounts.any { (it ?: 0.0) < 0 }) issues += ProductFormIssue.NegativeAmount
        // #951: a per-day default needs a per-day price; 0đ is one
        if (input.showsPrices && input.defaultMode == PricingMode.PER_DAY && (input.perDay == null || input.perDay < 0)) {
            issues += ProductFormIssue.PerDayDefaultNeedsPrice
        }
        when {
            input.quantity < 0 -> issues += ProductFormIssue.NegativeQuantity
            input.quantity < input.rented -> issues += ProductFormIssue.QuantityBelowRented(input.rented)
        }
        if (input.photoCount > MAX_PHOTOS) issues += ProductFormIssue.TooManyPhotos(MAX_PHOTOS)
        return issues
    }
}

/** Giá vốn (#887, iOS `ProductCostPrice`): shown and saved only for roles that may see prices */
object ProductCostPrice {
    /** The cost on product detail: > 0 and the role may see prices */
    fun shown(product: Product, showsPrices: Boolean): Double? =
        product.costPrice?.takeIf { showsPrices && it > 0 }

    /**
     * The cost sent on save: the typed value; an empty field sends 0 only when the product had a cost (cleared on
     * purpose), else nothing, so a product read without `costPrice` (list payload) keeps its cost
     */
    fun toSend(typed: Double?, original: Double?): Double? =
        typed ?: if ((original ?: 0.0) > 0) 0.0 else null
}

object MoneyInput {
    /** "1.250.000" → 1250000.0; empty → null */
    fun parse(text: String?): Double? = text.orEmpty().filter { it.isDigit() }.takeIf { it.isNotEmpty() }?.toDouble()

    /** 1250000.0 → "1.250.000" */
    fun display(value: Double?): String {
        if (value == null) return ""
        val rounded = Math.round(value)
        return kotlin.math.abs(rounded).toString().reversed().chunked(3).joinToString(".").reversed()
    }
}

// ---------------------------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------------------------

/** One row of the "Cách tính giá" sheet (#482): a pricing type and its catalog price (null = "Nhập giá") */
data class CartPricingChoice(val type: String, val catalogPrice: Double?)

/** Live preview of the sheet: "130.000đ × 3 ngày × 1" ([days] only for a daily rent price) and its total */
data class CartPricePreview(val unitPrice: Double, val days: Int?, val quantity: Int, val total: Double)


/** What one cart line costs: "150.000đ/ngày × 3 ngày", "300.000đ/lần × 2", "Giá bán 850.000đ × 1" */
data class CartLineCalc(
    val unitPrice: Double,
    val kind: Kind,
    val quantity: Int,
    val total: Double,
) {
    sealed class Kind {
        object PerRental : Kind()
        data class PerDay(val days: Int) : Kind()
        object Sale : Kind()
    }
}

/** Why the new cart cannot open the review yet (iOS `Cart.validate()`, same order) */
enum class CartProblem { EMPTY, NO_CUSTOMER, NO_PICKUP, NO_RETURN }

/**
 * #1024 (option A, icon + word): the cart's icons; the UI maps each to its Material icon
 * (`Icons.Outlined.<material>`). [ios] is the SF Symbol of iOS `CartV2Icon`.
 */
enum class CartV2Icon(val material: String, val ios: String) {
    /** MÓN header "Thêm" */
    ADD_ITEM("AddCircleOutline", "plus.circle"),
    /**
     * #1061 (owner: "đổi icon edit không giống", "icon đúng mockup"): Giảm giá, Đặt cọc, the order note, a line's
     * note — the mockup's pen-line (`AppIcons.EditLine`; iOS `DS.editIcon`)
     */
    EDIT("EditLine", "pen-line"),
    ;

    companion object {
        /** a line's "Ghi chú" / its note */
        val ITEM_NOTE = EDIT
        /** the order's "Ghi chú" row in TIỀN */
        val ORDER_NOTE = EDIT
    }
}

/** #1056 (owner, mockup cartmoney): the rows of the cart's TIỀN section; [editable] rows open a sheet (iOS `CartMoneyRow`) */
enum class CartMoneyRow(val editable: Boolean) {
    SUBTOTAL(false), DISCOUNT(true), TOTAL(false), DEPOSIT(true), NOTE(true),
}

/** #1056: how a TIỀN value is drawn. Rule of the whole cart: blue = tappable, black / grey = read only */
enum class CartMoneyTone {
    /** black, no icon */
    PLAIN,
    /** blue (primary), bold, then the blue pencil */
    ACTION,
    /** the order note's text: one line, dark grey (#334155), then the blue pencil */
    NOTE_TEXT,
}

object CartV2Logic {
    /** #1056 (iOS `moneyRowTone`): an empty note shows the blue "Thêm"; a note shows its text */
    fun moneyRowTone(row: CartMoneyRow, note: String? = null): CartMoneyTone = when {
        !row.editable -> CartMoneyTone.PLAIN
        row == CartMoneyRow.NOTE && noteShown(note) != null -> CartMoneyTone.NOTE_TEXT
        else -> CartMoneyTone.ACTION
    }

    /**
     * #1056 (owner: "note cần xuống dòng", iOS `noteShown`): a note as the cart shows it, in full on several lines —
     * each line trimmed, blank lines dropped; null = "Ghi chú" / "Thêm"
     */
    fun noteShown(note: String?): String? =
        noteText(note)?.lines()?.map { it.trim() }?.filter { it.isNotEmpty() }?.joinToString("\n")

    /** #1056 (iOS `discountShown`): "−50.000đ" above 0, else "0đ" (both blue now) */
    fun discountShown(discountAmount: Double): Double = if (discountAmount > 0) -discountAmount else 0.0

    /** #1067 (iOS `discountLimit`): the most a discount can be: the line subtotal before discount, or 100% */
    fun discountLimit(subtotal: Double, isPercent: Boolean): Double = if (isPercent) 100.0 else subtotal.coerceAtLeast(0.0)

    /** #1067 (owner: "chặn giảm giá lớn hơn tổng đơn luôn"): refused, never clamped; equal to the limit is fine */
    fun discountExceeds(value: Double, subtotal: Double, isPercent: Boolean): Boolean = value > discountLimit(subtotal, isPercent)

    /** #1067: the X in "Giảm giá không được lớn hơn tổng đơn (X)": the subtotal as money, or "100%" */
    fun discountLimitText(subtotal: Double, isPercent: Boolean, money: (Double) -> String): String =
        if (isPercent) "100%" else money(discountLimit(subtotal, isPercent = false))

    /** #1056 (iOS `moneyRowSpoken`): TalkBack reads the title, the value (+ the note photos) and "Sửa" */
    fun moneyRowSpoken(title: String, value: String, edit: String, photos: String? = null): String =
        listOfNotNull(title, value, photos, edit).joinToString(", ")

    /** #684: a line's note as shown and sent: trimmed; null when blank (an empty sheet clears it), iOS `noteText` */
    fun noteText(note: String?): String? = note?.trim()?.takeIf { it.isNotEmpty() }

    /**
     * #1024 (iOS `itemNoteLine`): a line's note on one line (line breaks become spaces) for the pencil entry, which
     * cuts it with "…"; null = the entry shows "Ghi chú"
     */
    fun itemNoteLine(note: String?): String? =
        noteText(note)?.lines()?.map { it.trim() }?.filter { it.isNotEmpty() }?.joinToString(" ")

    /**
     * #1024 (iOS `itemNoteSpoken`): what TalkBack reads on the pencil entry, as before the icon: the visible text
     * ("Ghi chú" or the note) and the action label "Ghi chú cho <product>". [noteLabel] is "Ghi chú",
     * [accessibilityFormat] "Ghi chú cho %1$s".
     */
    data class ItemNoteSpoken(val text: String, val actionLabel: String)

    fun itemNoteSpoken(productName: String, note: String?, noteLabel: String, accessibilityFormat: String): ItemNoteSpoken =
        ItemNoteSpoken(text = noteText(note) ?: noteLabel, actionLabel = String.format(accessibilityFormat, productName))

    /**
     * #1043 (iOS `orderNoteMaxPhotos`): the "Ghi chú đơn" sheet's photo row — up to MAX_NOTE_PHOTOS on a new order
     * (#480); none while editing an order (its photos live on the order detail)
     */
    fun orderNoteMaxPhotos(editMode: Boolean): Int =
        if (editMode) 0 else com.anyrent.pos.domain.orders.OrderDetailLogic.MAX_NOTE_PHOTOS

    /** #677: the cart header's ⋯ menu ("Chia sẻ báo giá", "Xoá giỏ hàng") */
    data class MoreMenu(val shareEnabled: Boolean, val clearEnabled: Boolean)

    /**
     * #677: null while editing an order (no ⋯; "Huỷ sửa" is in the bottom bar). An empty cart disables both items;
     * the quote also needs the rental dates ([datesReady]), as the share did (iOS `CartV2Logic.moreMenu`).
     */
    fun moreMenu(editing: Boolean, itemCount: Int, isSale: Boolean, datesReady: Boolean): MoreMenu? =
        if (editing) null else MoreMenu(shareEnabled = itemCount > 0 && (isSale || datesReady), clearEnabled = itemCount > 0)

    /** Every problem at once, like the iOS alert; a sale needs no dates (#448) */
    fun problems(itemCount: Int, hasCustomer: Boolean, isSale: Boolean, datesChosen: Boolean): List<CartProblem> =
        buildList {
            if (itemCount <= 0) add(CartProblem.EMPTY)
            if (!hasCustomer) add(CartProblem.NO_CUSTOMER)
            if (!isSale && !datesChosen) {
                add(CartProblem.NO_PICKUP)
                add(CartProblem.NO_RETURN)
            }
        }

    /** Same money as the old cart: [CartLine.unitPrice] and [CartLine.lineTotal] */
    fun calc(line: CartLine, isSale: Boolean): CartLineCalc {
        val kind = when {
            isSale -> CartLineCalc.Kind.Sale
            line.pricingType.equals("DAILY", ignoreCase = true) -> CartLineCalc.Kind.PerDay(line.rentalDays.coerceAtLeast(1))
            else -> CartLineCalc.Kind.PerRental
        }
        return CartLineCalc(line.unitPrice, kind, line.quantity, line.lineTotal)
    }

    /** "Theo lần / Theo ngày" only when the product has a price for both */
    fun offersBothModes(product: Product): Boolean =
        ProductPricing.perRental(product) != null && ProductPricing.perDay(product) != null

    /** "Theo lần / Theo ngày" on every rent line, whatever prices the product has (owner, 2026-10-05) */
    fun showsPricingToggle(isSale: Boolean): Boolean = !isSale

    /**
     * #951: the line has a price for its mode: one typed for this order (0 included, a saved order's price too), else
     * the product's option of that mode (0đ included), else the legacy rent price of its own type, 0 included (#996).
     */
    fun hasPrice(line: CartLine): Boolean =
        line.isSale || line.unitPriceOverride != null || catalogPrice(line.product, line.pricingType) != null

    /** A rent line with no price yet (a mode the product has no price for): the cart asks for one. 0đ is a price (#951) */
    fun needsPrice(line: CartLine, isSale: Boolean): Boolean = !isSale && !hasPrice(line)

    /** #951: the price on the line's chip; null shows "Nhập giá" (rent lines without a price only) */
    fun chipPrice(line: CartLine, isSale: Boolean): Double? = if (needsPrice(line, isSale)) null else line.unitPrice

    /** #951: units of each product across its lines (availability, overbooking, "+" counts) */
    fun quantitiesByProduct(lines: List<CartLine>): Map<Int, Int> =
        lines.groupBy { it.product.id }.mapValues { (_, group) -> group.sumOf { it.quantity } }

    /** Names of the rent lines without a price; each becomes "Nhập giá cho …" in the error alert before Tạo đơn */
    fun missingPrices(lines: List<CartLine>, isSale: Boolean): List<String> =
        lines.filter { needsPrice(it, isSale) }.map { it.product.name }

    /**
     * #473 — a line built before the product had both prices (added earlier, restored from disk, or loaded from an
     * edited order) takes the product's options, so the cart offers "Theo lần / Theo ngày". Only when [product] has
     * both prices and the line does not offer both yet. Quantity, mode and the price in use stay (iOS
     * `CartItem.adoptPricingOptions`).
     */
    fun withFreshPricing(line: CartLine, product: Product): CartLine {
        if (!offersBothModes(product) || offersBothModes(line.product)) return line
        return line.copy(product = line.product.copy(pricingOptions = product.pricingOptions))
    }

    /**
     * #1189: the product's day table changed (the API answered BLOCK_PRICE_MISMATCH): a BLOCK line of it takes the
     * product's new table and is priced again (iOS `Cart.refreshBlockTable`)
     */
    fun refreshBlockTable(line: CartLine, product: Product): CartLine {
        if (line.product.id != product.id || !line.pricingType.equals("BLOCK", ignoreCase = true)) return line
        if (ProductPricing.block(product) == null) return line
        return line.copy(product = line.product.copy(pricingOptions = product.pricingOptions), savedBlockTable = null, unitPriceOverride = null)
    }

    // --- Pricing sheet (#482, board Gio-hang-chon-gia; iOS CartV2Logic) ---

    /**
     * The product's price for a pricing type: its option (#951: 0đ included), else the legacy rent price of its own
     * type, 0 included (#996). A mode the product does not price is null ("Nhập giá").
     */
    fun catalogPrice(product: Product, type: String): Double? =
        product.pricingOptions.firstOrNull { it.type.equals(type, ignoreCase = true) && it.price >= 0 }?.price
            ?: product.rentPrice.takeIf { product.pricingType.equals(type, ignoreCase = true) && it >= 0 }

    /** Theo lần and Theo ngày always, then every other option type of the product, each with its catalog price */
    fun pricingChoices(line: CartLine): List<CartPricingChoice> {
        val types = mutableListOf("FIXED", "DAILY")
        line.product.pricingOptions.forEach { option ->
            val type = option.type.uppercase()
            if (type !in types) types += type
        }
        // #1189: a line loaded from a saved order offers the table it was priced with
        if (line.blockTable != null && "BLOCK" !in types) types += "BLOCK"
        return types.map { CartPricingChoice(it, catalogPrice(line.product, it)) }
    }

    /** Price the field shows for a row: the line's price for its own mode, else the catalog price, else 0 */
    fun startPrice(line: CartLine, type: String): Double = sheetStartPrice(line, type) ?: 0.0

    /**
     * #951: what the sheet's price box starts with; null = empty (no price yet). The line's own mode shows its price
     * (0 shows "0"); another mode its catalog price.
     */
    fun sheetStartPrice(line: CartLine, type: String): Double? =
        if (type.equals(line.pricingType, ignoreCase = true) || line.isSale) line.unitPrice.takeIf { hasPrice(line) }
        else catalogPrice(line.product, type)

    /** #951: digits typed in the price box; a lone 0 stays (a free line), leading zeros go */
    fun priceDigits(text: String): String {
        val digits = text.filter { it.isDigit() }.take(12)
        return if (digits.isEmpty()) "" else digits.trimStart('0').ifEmpty { "0" }
    }

    fun pricePreview(type: String, price: Double, days: Int, quantity: Int, isSale: Boolean): CartPricePreview =
        if (!isSale && type.equals("DAILY", ignoreCase = true)) {
            val safe = days.coerceAtLeast(1)
            CartPricePreview(price, safe, quantity, price * safe * quantity)
        } else {
            CartPricePreview(price, null, quantity, price * quantity)
        }

    /**
     * "Áp dụng": the line's pricing type (rent) and its price for this order only; the product is never changed. The
     * catalog price of that type clears the override, so a later switch to SALE still uses the sale price (#373).
     */
    fun applyPricing(line: CartLine, type: String?, price: Double?, rentalDays: Int): CartLine {
        // #951: 0 is a price (a free line); an empty box (null) removes the typed price
        val safe = price?.coerceAtLeast(0.0)
        if (line.isSale || type == null) return line.copy(unitPriceOverride = safe)
        val normalized = type.uppercase()
        val catalog = catalogPrice(line.product, normalized)
        return line.copy(
            pricingType = normalized,
            rentalDays = rentalDays,
            unitPriceOverride = if (catalog != null && catalog == safe) null else safe,
        )
    }

    /** Units free for the dates (rent) or in stock (sale) when fewer than asked; null = enough or unknown */
    fun shortage(available: Int?, quantity: Int): Int? =
        available?.takeIf { it < quantity }?.coerceAtLeast(0)

    /** #1054: how strong the shortage warning is: LOW = some units free (fewer than asked), NONE = nothing free */
    enum class ShortageTone { OK, LOW, NONE }

    /** #1054 (owner, iOS `shortageTone`): "Chỉ còn 1 trống…" in red read as out of stock; red only when nothing is free */
    fun shortageTone(left: Int): ShortageTone = if (left >= 1) ShortageTone.LOW else ShortageTone.NONE

    /**
     * #1064: the one availability pill of a cart line: the short shown text, the longer TalkBack text, the count and
     * the tone (iOS `AvailabilityNote`)
     */
    data class AvailabilityNote(@StringRes val textRes: Int, @StringRes val spokenRes: Int, val count: Int, val tone: ShortageTone)

    /**
     * #1064 (owner, iOS `availabilityNote`): 0 free = "Hết đồ" / "Hết hàng" (red); 1 free, or fewer than [asked]
     * (amber); 2+ free and at least [asked] (green). Shown: "Còn N" when enough, "Chỉ còn N" when fewer than asked
     * ("text còn trống dài quá"); TalkBack adds "trong ngày đã chọn" / "trong kho". null while not loaded
     */
    fun availabilityNote(available: Int?, asked: Int, isRent: Boolean): AvailabilityNote? {
        if (available == null) return null
        if (available <= 0) {
            return if (isRent) AvailabilityNote(R.string.v2_cart_booked_out, R.string.v2_cart_unavailable_rent, 0, ShortageTone.NONE)
            else AvailabilityNote(R.string.v2_cart_out_of_stock, R.string.v2_cart_out_of_stock, 0, ShortageTone.NONE)
        }
        val tone = if (available >= 2 && available >= asked) ShortageTone.OK else ShortageTone.LOW
        return if (available >= asked) {
            AvailabilityNote(R.string.v2_cart_left, if (isRent) R.string.v2_cart_free_rent else R.string.v2_cart_in_stock, available, tone)
        } else {
            AvailabilityNote(R.string.v2_cart_only_left, if (isRent) R.string.v2_cart_short_rent else R.string.v2_cart_short_stock, available, tone)
        }
    }

    /** Paid now: the prepaid deposit for a rental, the order total for a sale */
    fun collectNow(isSale: Boolean, total: Double, deposit: Double): Double = if (isSale) total else deposit

    /** Inclusive civil days: same day = 1 */
    fun rentalDays(pickup: LocalDate, returnDate: LocalDate): Int =
        (ChronoUnit.DAYS.between(pickup, returnDate) + 1).toInt().coerceAtLeast(1)
}

/** The barcode to show; the list parser can hand back the JSON literal "null" */
val Product.barcodeText: String?
    get() = barcode?.trim()?.takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }

/** #952 (owner, iOS `CartDateRowLogic`): the cart's date row has a calendar icon in a light-blue circle like the customer avatar */
object CartDateRow {
    /** Same circle as the customer row's avatar */
    const val ICON_DP = 40

    /** [text] / [days] are null until both days are chosen (the row then says "Chọn ngày thuê" in blue, no pill) */
    data class State(val text: String?, val days: Int?) {
        val isEmpty: Boolean get() = days == null
    }

    fun state(pickup: LocalDate?, returnDate: LocalDate?): State {
        if (pickup == null || returnDate == null) return State(null, null)
        return State(
            com.anyrent.pos.domain.DayText.dmy(pickup) + " → " + com.anyrent.pos.domain.DayText.dmy(returnDate),
            CartV2Logic.rentalDays(pickup, returnDate),
        )
    }
}
