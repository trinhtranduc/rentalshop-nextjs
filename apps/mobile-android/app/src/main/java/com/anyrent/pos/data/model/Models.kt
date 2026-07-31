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
) {
    val displayName: String
        get() = listOfNotNull(firstName, lastName)
            .joinToString(" ")
            .ifBlank { name?.takeIf { it.isNotBlank() } ?: email }
}

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
)

data class OrderItem(
    val id: Int?,
    val productId: Int,
    val productName: String?,
    val quantity: Int,
    val unitPrice: Double,
    val totalPrice: Double,
)

data class OrderDetail(
    val summary: OrderSummary,
    val items: List<OrderItem>,
    val customerId: Int?,
    val payments: List<PaymentEntry>,
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

data class CartLine(
    val product: Product,
    val quantity: Int,
    val rentalDays: Int = 1,
    val isSale: Boolean = false,
) {
    val unitPrice: Double
        get() = if (isSale) (product.salePrice ?: product.rentPrice) else product.rentPrice

    val lineTotal: Double
        get() = if (isSale) unitPrice * quantity else unitPrice * quantity * rentalDays
}
