package com.anyrent.pos.data

/**
 * UI-only permission helpers mirroring iOS PermissionManager.
 * Data scoping always stays on the backend — never filter API results here.
 */
enum class UserRole {
    ADMIN,
    MERCHANT,
    OUTLET_ADMIN,
    OUTLET_STAFF,
    /** #682 Nhân viên kho: staff + products and categories */
    OUTLET_INVENTORY,
    UNKNOWN;

    /** Sees and does what outlet staff do (no export, no staff admin, no revenue); Nhân viên kho is one (#682) */
    val isStaffLike: Boolean get() = this == OUTLET_STAFF || this == OUTLET_INVENTORY

    companion object {
        fun from(raw: String?): UserRole = when (raw?.uppercase()) {
            "ADMIN" -> ADMIN
            "MERCHANT" -> MERCHANT
            "OUTLET_ADMIN" -> OUTLET_ADMIN
            "OUTLET_STAFF" -> OUTLET_STAFF
            "OUTLET_INVENTORY" -> OUTLET_INVENTORY
            else -> UNKNOWN
        }
    }
}

object PermissionManager {
    val role: UserRole
        get() = UserRole.from(SessionStore.role)

    fun canManageUsers(): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN

    fun canManageProducts(): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN || role == UserRole.OUTLET_INVENTORY

    fun canExport(): Boolean =
        !role.isStaffLike && role != UserRole.UNKNOWN

    fun canManageStore(): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN

    /** Mirrors iOS `PermissionManager.canManageOrders()` / `orders.manage` role defaults. */
    fun canManageOrders(): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN

    /** `orders.update` (PUT /api/orders/{id}): every shop role, OUTLET_STAFF included (#390) */
    fun canUpdateOrders(): Boolean = role != UserRole.UNKNOWN

    /** iOS: delete cancelled orders only for merchant / outlet admin (and system admin). */
    fun canDeleteCancelledOrders(): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN

    /** #670: change history (order / product); not OUTLET_STAFF. Reads the raw role so OPS counts */
    fun canViewChangeHistory(): Boolean = com.anyrent.pos.domain.history.ChangeHistory.canView(SessionStore.role)
}

/** Roles a merchant or outlet admin may pick in the user form (#682, iOS `UserFormRoles`) */
object UserFormRoles {
    /** Staff and outlet admin always; Nhân viên kho once the API allows it, or when the user already has it */
    fun choices(inventoryRole: Boolean, currentRole: String?): List<String> =
        if (inventoryRole || currentRole.equals("OUTLET_INVENTORY", true)) listOf("OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY")
        else listOf("OUTLET_ADMIN", "OUTLET_STAFF")

    /** #684: a new user has no role until one is picked; the form cannot be saved without it */
    fun isComplete(role: String?): Boolean = !role.isNullOrBlank()
}
