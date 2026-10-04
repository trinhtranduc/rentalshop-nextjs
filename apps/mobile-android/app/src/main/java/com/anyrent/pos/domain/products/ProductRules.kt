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

    /** Price fields in the form and price edits in the cart */
    fun showsPriceFields(role: UserRole): Boolean = canEdit(role)
}

enum class PricingMode(val apiType: String) {
    PER_RENTAL("FIXED"),
    PER_DAY("DAILY"),
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

object CartV2Logic {
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

    /** Units free for the dates (rent) or in stock (sale) when fewer than asked; null = enough or unknown */
    fun shortage(available: Int?, quantity: Int): Int? =
        available?.takeIf { it < quantity }?.coerceAtLeast(0)

    /** Paid now: the prepaid deposit for a rental, the order total for a sale */
    fun collectNow(isSale: Boolean, total: Double, deposit: Double): Double = if (isSale) total else deposit

    /** Inclusive civil days: same day = 1 */
    fun rentalDays(pickup: LocalDate, returnDate: LocalDate): Int =
        (ChronoUnit.DAYS.between(pickup, returnDate) + 1).toInt().coerceAtLeast(1)
}
