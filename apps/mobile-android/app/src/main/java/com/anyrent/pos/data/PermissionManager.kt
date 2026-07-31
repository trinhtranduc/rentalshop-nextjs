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
    UNKNOWN;

    companion object {
        fun from(raw: String?): UserRole = when (raw?.uppercase()) {
            "ADMIN" -> ADMIN
            "MERCHANT" -> MERCHANT
            "OUTLET_ADMIN" -> OUTLET_ADMIN
            "OUTLET_STAFF" -> OUTLET_STAFF
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
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN

    fun canExport(): Boolean =
        role != UserRole.OUTLET_STAFF && role != UserRole.UNKNOWN

    fun canManageStore(): Boolean =
        role == UserRole.ADMIN || role == UserRole.MERCHANT || role == UserRole.OUTLET_ADMIN
}
