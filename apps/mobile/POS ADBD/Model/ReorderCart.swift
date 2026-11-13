import Foundation

/// #1515 "Đặt lại" on Chi tiết đơn: a new cart that starts from an old order.
/// Taken from the order: type, customer, notes, and each line's product, quantity and note. The price is the product's
/// price today (like adding the product to a cart). Dates, discount, deposit, collateral, payments, photos, status and
/// the order number are not copied; a rent cart has no days yet, so the cart asks for them like a new rental.
enum ReorderCartBuilder {
    struct Built {
        /// nil when no line could be rebuilt (nothing to put in a cart)
        let cart: Cart?
        /// order lines left out: no `productId` (the product was deleted) or the product could not be loaded
        let skipped: Int
    }

    /// `products` holds the products loaded by id; a line whose product is missing is skipped.
    static func cart(from order: OrderDetail, products: [Int: Product]) -> Built {
        let cart = Cart()
        cart.orderType = order.orderType
        if order.customer.id > 0 {
            var customer = Customer()
            customer.id = order.customer.id
            customer.customer_id = order.customerId
            customer.firstName = order.customer.firstName
            customer.lastName = order.customer.lastName
            customer.phone = order.customer.phone
            customer.email = order.customer.email
            customer.address = order.customer.address
            customer.city = order.customer.city
            customer.state = order.customer.state
            customer.country = order.customer.country
            cart.customer = customer
        }
        let notes = (order.notes ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        cart.notes = notes.isEmpty ? nil : notes

        var skipped = 0
        for item in order.orderItems {
            guard let productId = item.productId, productId > 0, let product = products[productId] else {
                skipped += 1
                continue
            }
            // same rule as adding the product from the product list (ProductsCartBridge.add)
            let price = order.orderType == .rent ? (product.rentPrice ?? product.rent) : (product.salePrice ?? product.sale)
            var line = CartItem(from: product, quantity: max(1, item.quantity), price: price)
            let note = (item.notes ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if !note.isEmpty { line.note = note }
            cart.addItem(line)
        }
        guard !cart.items.isEmpty else { return Built(cart: nil, skipped: skipped) }
        if order.orderType == .sale { cart.syncPricesWithOrderType() }
        return Built(cart: cart, skipped: skipped)
    }
}
