package com.anyrent.pos.data.model

import org.json.JSONObject

/** A money field the API may not send (older servers): absent, null or not a number reads as null (#390) */
internal fun optionalAmount(o: JSONObject, key: String): Double? {
    if (!o.has(key) || o.isNull(key)) return null
    return when (val value = o.opt(key)) {
        is Number -> value.toDouble()
        else -> null
    }
}

data class UserProfile(
    val id: Int,
    val email: String,
    val firstName: String?,
    val lastName: String?,
    val name: String?,
    val role: String,
    val merchantId: Int?,
    val outletId: Int?,
    val merchantName: String?,
    val outletName: String?,
    val merchantPhone: String? = null,
    val merchantAddress: String? = null,
    val outletPhone: String? = null,
    val outletAddress: String? = null,
) {
    val displayName: String
        get() = listOfNotNull(firstName, lastName)
            .joinToString(" ")
            .ifBlank { name?.takeIf { it.isNotBlank() } ?: email }
}

data class PricingOption(
    val id: Int?,
    val type: String,
    val price: Double,
    val isDefault: Boolean = false,
)

data class Product(
    val id: Int,
    val name: String,
    val barcode: String?,
    val rentPrice: Double,
    val salePrice: Double?,
    val stock: Int,
    val available: Int,
    val renting: Int,
    val categoryId: Int?,
    val categoryName: String?,
    val imageUrl: String?,
    val deposit: Double = 0.0,
    val pricingType: String = "FIXED",
    val pricingOptions: List<PricingOption> = emptyList(),
    val note: String? = null,
    /** ISO timestamp when image search last finished; null = never indexed */
    val embeddingGeneratedAt: String? = null,
    /** All photo URLs, cover first (#373) */
    val images: List<String> = emptyList(),
    /** Stock per outlet (#373) */
    val outletStock: List<ProductOutletStock> = emptyList(),
    /** Free today at the user's outlet when the list was asked with `outletId` (#373) */
    val effectiveAvailableToday: Int? = null,
)

/** Stock of a product at one outlet */
data class ProductOutletStock(
    val outletId: Int,
    val stock: Int,
    val renting: Int,
    val available: Int,
)

data class Customer(
    val id: Int,
    val firstName: String,
    val lastName: String?,
    val phone: String?,
    val email: String?,
    val address: String?,
) {
    val displayName: String
        get() = listOfNotNull(firstName, lastName).joinToString(" ").ifBlank { phone ?: email ?: "#$id" }
}

data class OrderSummary(
    val id: Int,
    val orderNumber: String,
    val orderType: String,
    val status: String,
    val totalAmount: Double,
    val depositAmount: Double,
    val customerName: String?,
    val customerPhone: String?,
    val pickupPlanAt: String?,
    val returnPlanAt: String?,
    val createdAt: String?,
    val notes: String?,
    val isReadyToDeliver: Boolean = false,
    val itemCount: Int = 0,
    val createdByName: String? = null,
    val updatedAt: String? = null,
    /** Item names with quantity, from the list's `orderItems` (#401) */
    val itemsSummary: String = "",
    /** Units per product id, from the list's `orderItems` (#388) */
    val productQuantities: Map<Int, Int> = emptyMap(),
    /** Still to collect / to give back, from `computeOrderBalance` (#389); null on an older API */
    val amountDue: Double? = null,
    val refundDue: Double? = null,
    /** Actual hand-over / return instants (#434); null until they happen or on an older payload */
    val pickedUpAt: String? = null,
    val returnedAt: String? = null,
)

data class OrderItem(
    val id: Int?,
    val productId: Int,
    val productName: String?,
    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double,
    val imageUrl: String? = null,
    val note: String? = null,
    val deposit: Double = 0.0,
    val rentalDays: Int = 1,
    val pricingType: String = "FIXED",
)

data class OrderDetail(
    val summary: OrderSummary,
    val items: List<OrderItem>,
    val customerId: Int?,
    val payments: List<PaymentEntry>,
    val securityDeposit: Double = 0.0,
    val damageFee: Double = 0.0,
    val lateFee: Double = 0.0,
    val collateralDetails: String? = null,
    val notesImages: List<String> = emptyList(),
    /** From API — used for receipt discount label (amount vs percentage). */
    val discountType: String? = null,
    val discountValue: Double = 0.0,
    val discountAmount: Double = 0.0,
    /** Store name on the order — preferred over SessionStore for receipt header. */
    val outletName: String? = null,
    /** Outlet of the order (public id): availability for an extension is checked there (#390) */
    val outletId: Int? = null,
    /** Nested customer from GET /api/orders/:id — preferred when editing into cart. */
    val customer: Customer? = null,
)

data class PaymentEntry(
    val id: Int,
    val amount: Double,
    val paymentMethod: String?,
    val status: String?,
    val notes: String?,
)

data class InboxNotification(
    val id: Int,
    val title: String,
    val body: String,
    val type: String,
    val isRead: Boolean,
    val createdAt: String?,
    val orderId: Int?,
    /** `data.status` of an `ORDER_STATUS_CHANGED` notification; picks the icon of the new inbox (#477) */
    val status: String? = null,
)

data class CalendarDay(
    val date: String,
    val orderCount: Int,
    val orders: List<OrderSummary>,
)

data class TodayMetrics(
    val totalOrders: Int,
    val activeRentals: Int,
    val completedOrders: Int,
    val totalRevenue: Double,
    val totalStock: Int,
    val availableStock: Int,
    val rentingStock: Int,
)

data class RankingItem(
    val id: Int?,
    val name: String,
    val value: Double,
    val subtitle: String?,
    val imageUrl: String? = null,
    val note: String? = null,
    val category: String? = null,
    val rentalCount: Int? = null,
)

data class StaffUser(
    val id: Int,
    val email: String,
    val firstName: String?,
    val lastName: String?,
    val role: String,
    val isActive: Boolean,
) {
    val displayName: String
        get() = listOfNotNull(firstName, lastName).joinToString(" ").ifBlank { email }
}

/** GET /api/subscriptions/status — merchant billing status for renew UI. */
data class SubscriptionStatus(
    val planName: String,
    val status: String,
    val statusReason: String?,
    val daysRemaining: Int?,
    val isExpiringSoon: Boolean,
    val currentPeriodEnd: String?,
    val hasAccess: Boolean,
)

data class CartLine(
    val product: Product,
    val quantity: Int,
    val rentalDays: Int = 1,
    val isSale: Boolean = false,
    val pricingType: String = product.pricingType,
    val unitPriceOverride: Double? = null,
) {
    val unitPrice: Double
        get() = unitPriceOverride ?: if (isSale) {
            product.salePrice ?: product.rentPrice
        } else {
            product.pricingOptions.firstOrNull {
                it.type.equals(pricingType, ignoreCase = true)
            }?.price ?: if (product.pricingType.equals(pricingType, ignoreCase = true)) {
                product.rentPrice
            } else {
                0.0
            }
        }

    val lineTotal: Double
        get() = unitPrice * quantity *
            if (!isSale && pricingType.equals("DAILY", ignoreCase = true)) rentalDays else 1
}
