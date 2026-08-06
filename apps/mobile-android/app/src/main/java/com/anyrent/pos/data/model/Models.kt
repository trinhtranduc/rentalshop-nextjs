package com.anyrent.pos.data.model

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
