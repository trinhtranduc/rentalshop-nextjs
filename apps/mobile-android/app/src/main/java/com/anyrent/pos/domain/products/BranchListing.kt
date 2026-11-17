package com.anyrent.pos.domain.products

import androidx.annotation.StringRes
import com.anyrent.pos.R
import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.data.model.ProductOutletStock
import org.json.JSONArray
import org.json.JSONObject

/*
 * #1346 (#1335 PR 1m) "Hiện ở chi nhánh": pure rules of the tick on a product at a branch (`OutletStock.isListed`).
 * Same rules as iOS `BranchListing` in `Model/ProductsV2.swift`. The API is the real gate (`PUT /api/products/listing`
 * is MERCHANT only, a branch role gets 403); these only decide what the screens show and ask for.
 */

/** A branch of the shop as the form lists it */
data class BranchOutlet(val id: Int, val name: String, val isDefault: Boolean)

/** One line of the "Tồn và hiện ở chi nhánh" box (#1607): a branch, its quantity (edited in the box), and the tick */
data class BranchTickRow(
    val outletId: Int,
    val name: String,
    val isDefault: Boolean,
    val stock: Int,
    val renting: Int,
    val listed: Boolean,
)

/** A tick that moved: one `PUT /api/products/listing` call */
data class BranchTickChange(val outletId: Int, val isListed: Boolean)

/** The line under an unticked branch that still holds units. It never blocks the save. */
data class BranchListingReminder(val stock: Int, val renting: Int) {
    @get:StringRes
    val stringRes: Int
        get() = if (renting > 0) R.string.products_listing_reminder else R.string.products_listing_reminder_no_rent

    /** Format arguments of [stringRes]: units left, then (only when some are out) units on rent */
    val args: List<Any>
        get() = if (renting > 0) listOf(stock, renting) else listOf(stock)
}

/** `outletStock[]` item of `POST /api/products`; `isListed` is sent only when set (the owner's form) */
data class BranchOutletStockItem(val outletId: Int, val stock: Int, val isListed: Boolean? = null) {
    fun toJson(): JSONObject = JSONObject().put("outletId", outletId).put("stock", stock).apply {
        if (isListed != null) put("isListed", isListed)
    }
}

object BranchListing {
    /** The token this build adds to `X-Client-Capabilities`: the server then stops re-listing products for it */
    const val CAPABILITY_TOKEN = "branch-listing"
    const val LISTING_PATH = "/api/products/listing"

    /** Only the shop owner ticks and unticks (the API: `canSetBranchListing`) */
    fun canSet(role: UserRole?): Boolean = role == UserRole.MERCHANT

    private fun isBranchRole(role: UserRole?): Boolean =
        role == UserRole.OUTLET_ADMIN || role == UserRole.OUTLET_INVENTORY || role == UserRole.OUTLET_STAFF

    /**
     * The owner sees the box with two or more active branches. A branch role cannot count the shop's branches (the API
     * lists only its own), so it sees the dimmed tick when the product has rows at two or more branches (as the web).
     * A shop with one branch (every Basic shop) has no tick.
     */
    fun showsTick(role: UserRole?, activeOutletCount: Int, productOutletRows: Int): Boolean = when {
        role == UserRole.MERCHANT -> activeOutletCount >= 2
        isBranchRole(role) -> productOutletRows >= 2
        else -> false
    }

    /**
     * A branch role asks for `listed=true` (a shop known to have one branch does not: the API would ignore it).
     * #1614: so does the owner, for the branch chosen on Home (`outletId`): a product not shown there is hidden.
     */
    fun sendsListed(role: UserRole?, activeOutletCount: Int): Boolean =
        (role == UserRole.MERCHANT || isBranchRole(role)) && activeOutletCount != 1

    /** Query parts of the product list, with `listed=true` added when [sendsListed] */
    fun listQuery(base: List<String>, role: UserRole?, activeOutletCount: Int): List<String> =
        if (sendsListed(role, activeOutletCount)) base + "listed=true" else base

    /** The row of that branch says listed unless it says `false`. No row, no branch, or an older API: listed. */
    fun isListedAt(product: Product, outletId: Int?): Boolean {
        if (outletId == null) return true
        return product.outletStock.firstOrNull { it.outletId == outletId }?.isListed ?: true
    }

    /**
     * Does a Home row count as listed at the branch in use? Every list asks for `listed=true` now (#1614), so a row is
     * unlisted only when the API ignored it; a one-branch shop has no tick, so nothing is hidden there.
     */
    fun listedForRow(product: Product, role: UserRole?, activeOutletCount: Int, outletId: Int?): Boolean =
        if (role != UserRole.MERCHANT || activeOutletCount < 2) true else isListedAt(product, outletId)

    /** `outletStock[]` of the API: `isListed` missing or null = listed (an older API) */
    fun parseRows(rows: JSONArray): List<ProductOutletStock> = (0 until rows.length()).mapNotNull { index ->
        val row = rows.optJSONObject(index) ?: return@mapNotNull null
        val outletId = (row.optJSONObject("outlet")?.optInt("id") ?: 0).takeIf { it > 0 }
            ?: row.optInt("outletId").takeIf { it > 0 }
            ?: return@mapNotNull null
        val stock = row.optInt("stock")
        val renting = row.optInt("renting")
        val listed = if (row.has("isListed") && !row.isNull("isListed")) row.optBoolean("isListed", true) else true
        ProductOutletStock(outletId, stock, renting, row.optInt("available", (stock - renting).coerceAtLeast(0)), listed)
    }

    /**
     * Lines of the owner's box: every active branch; a saved product follows its rows, a new one ticks the creating branch
     * with quantity 1 there (#1607) and 0 elsewhere
     */
    fun rows(outlets: List<BranchOutlet>, product: Product?, creatingAt: Int?): List<BranchTickRow> =
        outlets.map { outlet ->
            val row = product?.outletStock?.firstOrNull { it.outletId == outlet.id }
            BranchTickRow(
                outletId = outlet.id,
                name = outlet.name,
                isDefault = outlet.isDefault,
                stock = if (product == null) (if (outlet.id == creatingAt) 1 else 0) else row?.stock ?: 0,
                renting = row?.renting ?: 0,
                listed = if (product == null) outlet.id == creatingAt else row?.isListed ?: false,
            )
        }

    /** #1607 "Tổng N" of the box */
    fun total(rows: List<BranchTickRow>): Int = rows.sumOf { it.stock }

    /** #1607 (#1603): the product must be shown at one branch at least; the form says so before sending anything */
    fun needsBranch(rows: List<BranchTickRow>): Boolean = rows.none { it.listed }

    /** #1607: the first row whose quantity is below its units on rent (the API refuses it: STOCK_BELOW_RENTED) */
    fun belowRented(rows: List<BranchTickRow>): BranchTickRow? = rows.firstOrNull { it.stock < it.renting }

    /**
     * The ticks that moved between the form as opened and as saved. #1605: every tick before every untick, so a move
     * A -> B never leaves the product shown nowhere in between (the API refuses that untick, #1603).
     */
    fun changes(from: List<BranchTickRow>, to: List<BranchTickRow>): List<BranchTickChange> {
        val before = from.associate { it.outletId to it.listed }
        val moved = to.filter { before[it.outletId] != null && before[it.outletId] != it.listed }
            .map { BranchTickChange(it.outletId, it.listed) }
        return moved.filter { it.isListed } + moved.filter { !it.isListed }
    }

    /** #1607 `outletStock[]` of an edit: only the branches whose quantity changed (the tick has its own route) */
    fun stockWrites(from: List<BranchTickRow>, to: List<BranchTickRow>): List<BranchOutletStockItem> {
        val before = from.associate { it.outletId to it.stock }
        return to.filter { before[it.outletId] != it.stock }.map { BranchOutletStockItem(it.outletId, it.stock) }
    }

    /** A reminder only for an unticked branch that still holds units or has some on rent */
    fun reminder(row: BranchTickRow): BranchListingReminder? =
        if (!row.listed && (row.stock > 0 || row.renting > 0)) BranchListingReminder(row.stock, row.renting) else null

    /** `outletStock[]` of a new product from the owner's box (#1607): every branch with its own quantity and tick */
    fun createStock(rows: List<BranchTickRow>): List<BranchOutletStockItem> =
        rows.map { BranchOutletStockItem(it.outletId, it.stock, it.listed) }

    /** Body of `PUT /api/products/listing` */
    fun listingBody(outletId: Int, productIds: List<Int>, isListed: Boolean): JSONObject =
        JSONObject().put("outletId", outletId).put("productIds", JSONArray(productIds)).put("isListed", isListed)
}
