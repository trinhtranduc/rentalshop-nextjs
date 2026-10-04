package com.anyrent.pos.data

import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.PricingOptionInput
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder

/**
 * Product calls of the redesigned screens (#373). Existing endpoints only; the old screens keep their calls.
 */
object ProductsV2Api {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val imageMedia = "image/jpeg".toMediaType()

    /** `GET /api/products` with the user's outlet (so the list gets today's free count) and an optional category */
    fun listProducts(page: Int, limit: Int, q: String?, categoryId: Int?): Result<ApiClient.PageResult<Product>> = runCatching {
        val query = buildList {
            add("page=$page")
            add("limit=$limit")
            add("sortBy=createdAt")
            add("sortOrder=desc")
            if (!q.isNullOrBlank()) add("q=" + URLEncoder.encode(q, "UTF-8"))
            if (categoryId != null) add("categoryId=$categoryId")
            SessionStore.outletId?.let { add("outletId=$it") }
        }.joinToString("&")
        val json = ApiClient.get().authedGet("/api/products?$query")
        val data = json.optJSONObject("data") ?: JSONObject()
        val array = data.optJSONArray("products") ?: JSONArray()
        ApiClient.PageResult(
            items = (0 until array.length()).map { ApiClient.get().parseProduct(array.getJSONObject(it)) },
            hasMore = data.optBoolean("hasMore", false),
            total = data.optInt("total").takeIf { data.has("total") },
        )
    }

    /** Merchant outlets as (id, isDefault), for a merchant without an outlet of their own */
    fun listOutlets(): Result<List<Pair<Int, Boolean>>> = runCatching {
        val json = ApiClient.get().authedGet("/api/outlets")
        val data = json.optJSONObject("data") ?: JSONObject()
        val array = data.optJSONArray("outlets") ?: JSONArray()
        (0 until array.length()).mapNotNull { i ->
            val o = array.optJSONObject(i) ?: return@mapNotNull null
            if (o.has("isActive") && !o.optBoolean("isActive", true)) return@mapNotNull null
            o.optInt("id").takeIf { it > 0 }?.let { it to o.optBoolean("isDefault") }
        }
    }

    data class ProductFields(
        val name: String,
        val barcode: String?,
        val categoryId: Int?,
        /** null = the user may not set prices: no price keys are sent */
        val prices: Prices?,
        val outletId: Int,
        val quantity: Int,
    )

    data class Prices(
        val options: List<PricingOptionInput>,
        val salePrice: Double?,
        val deposit: Double?,
    )

    /**
     * Create (`id == null`) or update a product. Kept photo URLs go in `images` (cover first); new photos are
     * uploaded as `images` files and the API adds them after the kept ones.
     */
    fun saveProduct(id: Int?, fields: ProductFields, keptUrls: List<String>, newFiles: List<File>): Result<Product> = runCatching {
        val data = JSONObject()
            .put("name", fields.name)
            .put("outletStock", JSONArray().put(JSONObject().put("outletId", fields.outletId).put("stock", fields.quantity)))
        if (id == null) data.put("totalStock", fields.quantity)
        fields.barcode?.takeIf { it.isNotBlank() }?.let { data.put("barcode", it) }
        fields.categoryId?.let { data.put("categoryId", it) }
        fields.prices?.let { prices ->
            val default = prices.options.firstOrNull { it.isDefault }
            data.put("rentPrice", default?.price ?: 0.0)
            data.put("salePrice", prices.salePrice ?: 0.0)
            data.put("deposit", prices.deposit ?: 0.0)
            data.put("pricingOptions", JSONArray(prices.options.map {
                JSONObject().put("type", it.type).put("price", it.price).put("isDefault", it.isDefault)
            }))
        }
        if (id != null || keptUrls.isNotEmpty()) data.put("images", JSONArray(keptUrls))

        val path = if (id == null) "/api/products" else "/api/products/$id"
        val json = if (newFiles.isEmpty()) {
            val body = data.toString().toRequestBody(jsonMedia)
            if (id == null) ApiClient.get().authedPost(path, body) else ApiClient.get().authedPut(path, body)
        } else {
            val multipart = MultipartBody.Builder().setType(MultipartBody.FORM)
                .addFormDataPart("data", data.toString())
                .apply {
                    newFiles.forEachIndexed { index, file ->
                        addFormDataPart("images", "image_$index.jpg", file.asRequestBody(imageMedia))
                    }
                }
                .build()
            if (id == null) ApiClient.get().authedMultipart(path, multipart) else ApiClient.get().authedMultipartPut(path, multipart)
        }
        val savedId = id ?: (json.optJSONObject("data") ?: JSONObject()).optInt("id")
        ApiClient.get().getProduct(savedId).getOrThrow()
    }
}
