package com.anyrent.pos.domain.products

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
    /** MERCHANT / OUTLET_ADMIN have `products.manage`; OUTLET_STAFF only `products.create` */
    fun canCreate(role: UserRole): Boolean = role != UserRole.UNKNOWN

    /** OUTLET_STAFF has no `products.update` */
    fun canEdit(role: UserRole): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN

    /** `DELETE /api/products/{id}` needs `products.manage`: never OUTLET_STAFF (#390) */
    fun canDelete(role: UserRole): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN

    /** Price fields in the form and price edits in the cart */
    fun showsPriceFields(role: UserRole): Boolean = canEdit(role)
}

enum class PricingMode(val apiType: String) {
    PER_RENTAL("FIXED"),
    PER_DAY("DAILY"),
}

/** #418 — the pricing types `POST /api/orders` accepts; null, blank or unknown read as FIXED (iOS `?? "FIXED"`) */
object PricingTypes {
    private val known = setOf("FIXED", "HOURLY", "DAILY")

    fun normalize(raw: String?): String = raw?.trim()?.uppercase()?.takeIf { it in known } ?: "FIXED"
}

data class PricingOptionInput(val type: String, val price: Double, val isDefault: Boolean)

object ProductPricing {
    fun perRental(product: Product): Double? {
        if (product.pricingOptions.isEmpty()) {
            if (product.pricingType.equals("DAILY", ignoreCase = true)) return null
            return product.rentPrice.takeIf { it > 0 }
        }
        return product.pricingOptions.firstOrNull { it.type.equals("FIXED", ignoreCase = true) }?.price?.takeIf { it > 0 }
    }

    fun perDay(product: Product): Double? {
        if (product.pricingOptions.isEmpty()) {
            if (!product.pricingType.equals("DAILY", ignoreCase = true)) return null
            return product.rentPrice.takeIf { it > 0 }
        }
        return product.pricingOptions.firstOrNull { it.type.equals("DAILY", ignoreCase = true) }?.price?.takeIf { it > 0 }
    }

    fun sale(product: Product): Double? = product.salePrice?.takeIf { it > 0 }

    fun defaultMode(product: Product): PricingMode {
        val type = product.pricingOptions.firstOrNull { it.isDefault }?.type
            ?: product.pricingOptions.firstOrNull()?.type
            ?: product.pricingType
        return if (type.equals("DAILY", ignoreCase = true)) PricingMode.PER_DAY else PricingMode.PER_RENTAL
    }

    /** Options sent on save; a default without a price falls back to the mode that has one */
    fun options(perRental: Double?, perDay: Double?, defaultMode: PricingMode): List<PricingOptionInput> {
        val fixed = perRental?.takeIf { it > 0 }
        val daily = perDay?.takeIf { it > 0 }
        var mode = defaultMode
        if (mode == PricingMode.PER_DAY && daily == null) mode = PricingMode.PER_RENTAL
        if (mode == PricingMode.PER_RENTAL && fixed == null && daily != null) mode = PricingMode.PER_DAY
        return listOfNotNull(
            fixed?.let { PricingOptionInput("FIXED", it, mode == PricingMode.PER_RENTAL) },
            daily?.let { PricingOptionInput("DAILY", it, mode == PricingMode.PER_DAY) },
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

object ProductRowLogic {
    /** Units of this product already in the cart */
    fun cartCount(productId: Int, lines: List<CartLine>): Int =
        lines.filter { it.product.id == productId }.sumOf { it.quantity }

    fun subtitle(product: Product): ProductRowSubtitle =
        ProductRowSubtitle(code = product.barcodeText, free = ProductStock.freeToday(product))

    /** Out today wins over the cart count, so the button stays grey as before */
    fun addState(free: Int, inCart: Int): AddButtonState = when {
        free <= 0 -> AddButtonState.Out
        inCart > 0 -> AddButtonState.InCart(inCart)
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
        if (input.showsPrices && input.defaultMode == PricingMode.PER_DAY && (input.perDay ?: 0.0) <= 0) {
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

object CartV2Logic {
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

    /** A rent line with no price yet (a mode the product has no price for): the cart asks for one */
    fun needsPrice(line: CartLine, isSale: Boolean): Boolean = !isSale && line.unitPrice <= 0

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

    /** Units free for the dates (rent) or in stock (sale) when fewer than asked; null = enough or unknown */
    fun shortage(available: Int?, quantity: Int): Int? =
        available?.takeIf { it < quantity }?.coerceAtLeast(0)

    /** Paid now: the prepaid deposit for a rental, the order total for a sale */
    fun collectNow(isSale: Boolean, total: Double, deposit: Double): Double = if (isSale) total else deposit

    /** Inclusive civil days: same day = 1 */
    fun rentalDays(pickup: LocalDate, returnDate: LocalDate): Int =
        (ChronoUnit.DAYS.between(pickup, returnDate) + 1).toInt().coerceAtLeast(1)
}

/** The barcode to show; the list parser can hand back the JSON literal "null" */
val Product.barcodeText: String?
    get() = barcode?.trim()?.takeIf { it.isNotEmpty() && !it.equals("null", ignoreCase = true) }
