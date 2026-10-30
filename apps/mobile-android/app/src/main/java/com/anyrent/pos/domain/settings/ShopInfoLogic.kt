package com.anyrent.pos.domain.settings

/** The shop form (PUT /api/settings/merchant). `address` = street, `state` = ward / district, `city` = province, as on the web and iOS. */
data class ShopFormValues(
    val name: String = "",
    val phone: String = "",
    val taxId: String = "",
    val address: String = "",
    val state: String = "",
    val city: String = "",
    val country: String = "",
    val zipCode: String = "",
    val description: String = "",
)

/** The branch form (PUT /api/outlets?outletId=) */
data class BranchFormValues(val name: String = "", val phone: String = "", val address: String = "")

/** A branch in the owner's list */
data class BranchRow(val id: Int, val name: String, val isActive: Boolean?, val isDefault: Boolean?)

/**
 * #1313: the owner edits the shop and each branch on the phone; the branch manager edits own branch; staff only view.
 * Pure rules (who edits what, the address line, validation, the PUT bodies). iOS: `ShopInfo.swift`.
 */
object ShopInfoLogic {
    enum class RowTitle { SHOP, BRANCH }

    enum class Problem { NAME_REQUIRED, ADDRESS_REQUIRED }

    /** What the Settings row opens */
    sealed class Destination {
        /** MERCHANT: the shop card and the list of branches */
        object ShopAndBranches : Destination()

        /** Everyone else: the form of the own branch (editable for the branch manager, read-only for staff) */
        data class OwnBranch(val editable: Boolean) : Destination()
    }

    /** Row title like the web: the owner "Thông tin cửa hàng", other roles "Thông tin chi nhánh" */
    fun rowTitle(role: String?): RowTitle = if (role == "MERCHANT") RowTitle.SHOP else RowTitle.BRANCH

    fun destination(role: String?): Destination = when (role) {
        "MERCHANT" -> Destination.ShopAndBranches
        "OUTLET_ADMIN" -> Destination.OwnBranch(editable = true)
        else -> Destination.OwnBranch(editable = false)
    }

    /** The shop (name, phone, tax id, address, …) is the owner's */
    fun canEditShop(role: String?): Boolean = role == "MERCHANT"

    /** The owner edits every branch of the shop, the branch manager only their own; staff none */
    fun canEditBranch(role: String?, branchId: Int, ownBranchId: Int?): Boolean = when (role) {
        "MERCHANT" -> true
        "OUTLET_ADMIN" -> ownBranchId != null && ownBranchId == branchId
        else -> false
    }

    /** Second text of the Settings row: the owner "3 chi nhánh" (once known), the branch manager the branch name, staff "Chỉ xem" */
    fun rowValue(role: String?, branchName: String?, branchCount: Int?, countText: (Int) -> String, readOnlyText: String): String? = when (role) {
        "MERCHANT" -> branchCount?.let(countText)
        "OUTLET_ADMIN" -> branchName?.trim()?.takeIf { it.isNotEmpty() }
        else -> readOnlyText
    }

    /** "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh": street, ward / district, province; empty and repeated parts skipped (web `addressLine`) */
    fun addressLine(address: String?, state: String?, city: String?): String {
        val parts = mutableListOf<String>()
        for (part in listOf(address, state, city)) {
            val value = part.orEmpty().trim()
            if (value.isNotEmpty() && value !in parts) parts += value
        }
        return parts.joinToString(", ")
    }

    /** "0900 000 001 · MST 0123456789" */
    fun shopSummary(phone: String?, taxId: String?, taxIdLabel: String): String {
        val parts = mutableListOf<String>()
        phone.orEmpty().trim().takeIf { it.isNotEmpty() }?.let { parts += it }
        taxId.orEmpty().trim().takeIf { it.isNotEmpty() }?.let { parts += "$taxIdLabel $it" }
        return parts.joinToString(" · ")
    }

    fun problem(shop: ShopFormValues): Problem? = if (shop.name.isBlank()) Problem.NAME_REQUIRED else null

    fun problem(branch: BranchFormValues): Problem? = when {
        branch.name.isBlank() -> Problem.NAME_REQUIRED
        branch.address.isBlank() -> Problem.ADDRESS_REQUIRED
        else -> null
    }

    /** Body of PUT /api/settings/merchant: text trimmed, an empty text clears the field; no website */
    fun shopPayload(form: ShopFormValues): Map<String, String> = mapOf(
        "name" to form.name.trim(),
        "phone" to form.phone.trim(),
        "taxId" to form.taxId.trim(),
        "address" to form.address.trim(),
        "state" to form.state.trim(),
        "city" to form.city.trim(),
        "country" to form.country.trim(),
        "zipCode" to form.zipCode.trim(),
        "description" to form.description.trim(),
    )

    /** Body of PUT /api/outlets?outletId= */
    fun branchPayload(form: BranchFormValues): Map<String, String> =
        mapOf("name" to form.name.trim(), "phone" to form.phone.trim(), "address" to form.address.trim())

    /** Open branches only, the main one first, the API order kept otherwise */
    fun branchRows(rows: List<BranchRow>): List<BranchRow> {
        val open = rows.filter { it.isActive ?: true }
        return open.filter { it.isDefault == true } + open.filter { it.isDefault != true }
    }
}
