package com.anyrent.pos.data.cache

import android.content.Context
import android.content.SharedPreferences
import com.anyrent.pos.data.model.OrderSummary
import com.anyrent.pos.data.model.Product
import org.json.JSONArray
import org.json.JSONObject

/**
 * Lightweight offline cache (SharedPreferences JSON).
 * Why not Room yet: enough for Phase 7 list fallback; Room can replace later without API changes.
 */
class OfflineCache(context: Context) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences("anyrent.offline", Context.MODE_PRIVATE)

    fun saveProducts(products: List<Product>) {
        val arr = JSONArray()
        products.forEach { p ->
            arr.put(
                JSONObject()
                    .put("id", p.id)
                    .put("name", p.name)
                    .put("barcode", p.barcode)
                    .put("rentPrice", p.rentPrice)
                    .put("salePrice", p.salePrice)
                    .put("stock", p.stock)
                    .put("available", p.available)
                    .put("renting", p.renting)
            )
        }
        prefs.edit().putString(KEY_PRODUCTS, arr.toString()).apply()
    }

    fun loadProducts(): List<Product> {
        val raw = prefs.getString(KEY_PRODUCTS, null) ?: return emptyList()
        val arr = JSONArray(raw)
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Product(
                id = o.optInt("id"),
                name = o.optString("name"),
                barcode = o.optString("barcode").takeIf { it.isNotBlank() },
                rentPrice = o.optDouble("rentPrice"),
                salePrice = o.optDouble("salePrice").takeIf { o.has("salePrice") && !o.isNull("salePrice") },
                stock = o.optInt("stock"),
                available = o.optInt("available"),
                renting = o.optInt("renting"),
                categoryId = null,
                categoryName = null,
                imageUrl = null,
            )
        }
    }

    fun saveOrders(orders: List<OrderSummary>) {
        val arr = JSONArray()
        orders.forEach { o ->
            arr.put(
                JSONObject()
                    .put("id", o.id)
                    .put("orderNumber", o.orderNumber)
                    .put("orderType", o.orderType)
                    .put("status", o.status)
                    .put("totalAmount", o.totalAmount)
                    .put("depositAmount", o.depositAmount)
                    .put("customerName", o.customerName)
                    .put("customerPhone", o.customerPhone)
                    .put("createdAt", o.createdAt)
            )
        }
        prefs.edit().putString(KEY_ORDERS, arr.toString()).apply()
    }

    fun loadOrders(): List<OrderSummary> {
        val raw = prefs.getString(KEY_ORDERS, null) ?: return emptyList()
        val arr = JSONArray(raw)
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            OrderSummary(
                id = o.optInt("id"),
                orderNumber = o.optString("orderNumber"),
                orderType = o.optString("orderType"),
                status = o.optString("status"),
                totalAmount = o.optDouble("totalAmount"),
                depositAmount = o.optDouble("depositAmount"),
                customerName = o.optString("customerName").takeIf { it.isNotBlank() },
                customerPhone = o.optString("customerPhone").takeIf { it.isNotBlank() },
                pickupPlanAt = null,
                returnPlanAt = null,
                createdAt = o.optString("createdAt").takeIf { it.isNotBlank() },
                notes = null,
            )
        }
    }

    companion object {
        private const val KEY_PRODUCTS = "products"
        private const val KEY_ORDERS = "orders"

        @Volatile private var instance: OfflineCache? = null

        fun get(context: Context): OfflineCache =
            instance ?: synchronized(this) {
                instance ?: OfflineCache(context).also { instance = it }
            }
    }
}
