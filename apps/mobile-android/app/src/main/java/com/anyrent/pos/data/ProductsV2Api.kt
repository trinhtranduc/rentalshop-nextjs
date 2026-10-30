package com.anyrent.pos.data

import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.BlockPricing
import com.anyrent.pos.domain.products.BranchListing
import com.anyrent.pos.domain.products.BranchOutletStockItem
import com.anyrent.pos.domain.products.OtherBranchStock
import com.anyrent.pos.domain.products.OtherBranchesHint
import com.anyrent.pos.domain.products.PricingOptionInput
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URLEncoder

/** #1189: the API stores BLOCK options only from a client that says it knows them */
const val PRICING_SCHEMA_VERSION = 2

/**
 * Product calls of the redesigned screens (#373). Existing endpoints only; the old screens keep their calls.
 */
object ProductsV2Api {
    private val imageMedia = "image/jpeg".toMediaType()

    /**
     * `GET /api/products` with the user's outlet (so the list gets today's free count). #1346: a branch role asks for
     * `listed=true` (only the products ticked at its branch); [applyBranchListing] = false is for lookups that must see
     * every product (barcode already used, copying a price table).
     */
    fun listProducts(page: Int, limit: Int, q: String?, applyBranchListing: Boolean = true): Result<ApiClient.PageResult<Product>> = runCatching {
        val base = buildList {
            add("page=$page")
            add("limit=$limit")
            add("sortBy=createdAt")
            add("sortOrder=desc")
            if (!q.isNullOrBlank()) add("q=" + URLEncoder.encode(q, "UTF-8"))
            // #828: the branch in use (a merchant's chosen one) so the list gets that branch's stock
            CurrentOutlet.id?.let { add("outletId=$it") }
        }
        val query = (if (applyBranchListing) BranchListing.listQuery(base, PermissionManager.role, CurrentOutlet.outlets.size) else base)
            .joinToString("&")
        val json = ApiClient.get().authedGet("/api/products?$query")
        val data = json.optJSONObject("data") ?: JSONObject()
        val array = data.optJSONArray("products") ?: JSONArray()
        ApiClient.PageResult(
            items = (0 until array.length()).map { ApiClient.get().parseProduct(array.getJSONObject(it)) },
            hasMore = data.optBoolean("hasMore", false),
            total = data.optInt("total").takeIf { data.has("total") },
        )
    }

    /** Outlet stock and free units per day key (#388); outlet users pass their outlet, a merchant gets the default */
    data class FreeDays(val stock: Int?, val available: Map<String, Int>)

    fun availabilityCalendar(productId: Int, from: String, to: String, outletId: Int?): Result<FreeDays> = runCatching {
        val query = buildList {
            add("from=$from")
            add("to=$to")
            outletId?.let { add("outletId=$it") }
        }.joinToString("&")
        val json = ApiClient.get().authedGet("/api/products/$productId/availability-calendar?$query")
        parseFreeDays(json.optJSONObject("data") ?: JSONObject())
    }

    internal fun parseFreeDays(data: JSONObject): FreeDays {
        val days = data.optJSONArray("days") ?: JSONArray()
        val available = (0 until days.length()).mapNotNull { i ->
            val day = days.optJSONObject(i) ?: return@mapNotNull null
            val key = day.optString("date").takeIf { it.isNotBlank() } ?: return@mapNotNull null
            key to day.optInt("available")
        }.toMap()
        return FreeDays(stock = data.optInt("stock").takeIf { data.has("stock") }, available = available)
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
        /** #1346: the owner's ticks on a NEW product (`outletStock[]` with `isListed`); null = one row, the server ticks it */
        val createStock: List<BranchOutletStockItem>? = null,
    )

    data class Prices(
        val options: List<PricingOptionInput>,
        val salePrice: Double?,
        val deposit: Double?,
        /** Giá vốn (#887); null = not sent, the API keeps the stored cost */
        val costPrice: Double? = null,
        /**
         * #1189: 2 = this form sends every option, BLOCK included, so the API replaces the stored table with ours.
         * null (the old form) keeps the stored table.
         */
        val pricingSchemaVersion: Int? = null,
    )

    /**
     * Create (`id == null`) or update a product. Kept photo URLs go in `images` (cover first); new photos are
     * uploaded as `images` files and the API adds them after the kept ones.
     */
    fun saveProduct(id: Int?, fields: ProductFields, keptUrls: List<String>, newFiles: List<File>): Result<Product> = runCatching {
        val data = JSONObject()
            .put("name", fields.name)
            .put(
                "outletStock",
                if (id == null && fields.createStock != null) JSONArray(fields.createStock.map { it.toJson() })
                else JSONArray().put(JSONObject().put("outletId", fields.outletId).put("stock", fields.quantity)),
            )
        if (id == null) {
            data.put("totalStock", fields.quantity)
            // Create requires `rentPrice`; without price rights it is 0 (as iOS sends)
            data.put("rentPrice", 0.0)
        }
        fields.barcode?.takeIf { it.isNotBlank() }?.let { data.put("barcode", it) }
        fields.categoryId?.let { data.put("categoryId", it) }
        fields.prices?.let { prices ->
            val default = prices.options.firstOrNull { it.isDefault }
            data.put("rentPrice", default?.price ?: 0.0)
            data.put("salePrice", prices.salePrice ?: 0.0)
            data.put("deposit", prices.deposit ?: 0.0)
            prices.costPrice?.let { data.put("costPrice", it) }
            data.put("pricingOptions", JSONArray(prices.options.map { option ->
                option.blockTable?.let { BlockPricing.optionJson(it, option.isDefault) }
                    ?: JSONObject().put("type", option.type).put("price", option.price).put("isDefault", option.isDefault)
            }))
            prices.pricingSchemaVersion?.let { data.put("pricingSchemaVersion", it) }
        }
        if (id != null || keptUrls.isNotEmpty()) data.put("images", JSONArray(keptUrls))

        // The product routes read multipart form data only (`data` JSON + `images` files), as iOS sends
        val path = if (id == null) "/api/products" else "/api/products/$id"
        val multipart = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("data", data.toString())
            .apply {
                newFiles.forEachIndexed { index, file ->
                    addFormDataPart("images", "image_$index.jpg", file.asRequestBody(imageMedia))
                }
            }
            .build()
        val json = if (id == null) ApiClient.get().authedMultipart(path, multipart) else ApiClient.get().authedMultipartPut(path, multipart)
        val savedId = id ?: (json.optJSONObject("data") ?: JSONObject()).optInt("id")
        ApiClient.get().getProduct(savedId).getOrThrow()
    }

    /** `PUT /api/products/listing` (#1346, owner only): tick or untick one product at one branch */
    fun setBranchListing(outletId: Int, productId: Int, isListed: Boolean): Result<Unit> = runCatching {
        val body = BranchListing.listingBody(outletId, listOf(productId), isListed).toString()
            .toRequestBody("application/json".toMediaType())
        ApiClient.get().authedPut(BranchListing.LISTING_PATH, body)
        Unit
    }

    /**
     * `POST /api/products/other-outlets-availability` (#1353, #1347): the other branches that still have each short product
     * on the order's days. A hint only, so any failure (network, 403 for staff, 404 on an API without the route) is an empty
     * answer, never an error. A cancelled coroutine still cancels the caller.
     */
    fun otherBranches(body: JSONObject): Map<Int, List<OtherBranchStock>> =
        runCatching {
            ApiClient.get().authedPost(OtherBranchesHint.PATH, body.toString().toRequestBody("application/json".toMediaType()))
        }.map { OtherBranchesHint.parse(it) }.getOrDefault(emptyMap())
}
