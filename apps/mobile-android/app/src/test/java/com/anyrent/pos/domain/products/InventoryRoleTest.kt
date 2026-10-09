package com.anyrent.pos.domain.products

import com.anyrent.pos.data.UserFormRoles
import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.repository.appConfigFromJson
import com.anyrent.pos.domain.history.ChangeHistory
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.settings.SettingsItem
import com.anyrent.pos.domain.settings.SettingsRows
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #682 Nhân viên kho (OUTLET_INVENTORY): staff + products and categories, money hidden like staff */
class InventoryRoleTest {
    private val inventory = UserRole.from("OUTLET_INVENTORY")

    @Test
    fun `parses the role and manages products and categories`() {
        assertEquals(UserRole.OUTLET_INVENTORY, inventory)
        assertTrue(ProductAccess.canCreate(inventory))
        assertTrue(ProductAccess.canEdit(inventory))
        assertTrue(ProductAccess.canDelete(inventory))
        assertTrue(ProductAccess.showsPriceFields(inventory))
        assertTrue(CategoryRules.canAdd(inventory))
        assertTrue(CategoryRules.canManage(inventory))
        assertFalse(CategoryRules.canManage(UserRole.OUTLET_ADMIN))
    }

    @Test
    fun `hides revenue, history, staff admin and export like staff`() {
        assertTrue(inventory.isStaffLike)
        assertFalse(UserRole.OUTLET_ADMIN.isStaffLike)
        assertFalse(OverviewLogic.showsRevenue("OUTLET_INVENTORY"))
        assertTrue(OverviewLogic.showsOperations("OUTLET_INVENTORY"))
        assertFalse(ChangeHistory.canView("OUTLET_INVENTORY"))
        assertTrue(ChangeHistory.isStaff("OUTLET_INVENTORY"))
        val items = SettingsRows.sections("OUTLET_INVENTORY", hasPlan = true).flatMap { it.items }
        assertTrue(SettingsItem.CATEGORIES in items)
        assertFalse(SettingsItem.USERS in items)
        assertFalse(SettingsItem.EXPORT in items)
    }

    @Test
    fun `the role is offered only when the API allows it`() {
        assertEquals(listOf("OUTLET_ADMIN", "OUTLET_STAFF"), UserFormRoles.choices(false, null))
        assertEquals(listOf("OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY"), UserFormRoles.choices(true, null))
        assertTrue("OUTLET_INVENTORY" in UserFormRoles.choices(false, "OUTLET_INVENTORY"))
        // #684: no role until one is picked
        assertFalse(UserFormRoles.isComplete(null))
        assertFalse(UserFormRoles.isComplete(""))
        assertTrue(UserFormRoles.isComplete("OUTLET_STAFF"))
        assertTrue(appConfigFromJson(JSONObject("""{"features":{},"inventoryRole":true}""")).inventoryRole)
        assertFalse(appConfigFromJson(JSONObject("""{"features":{}}""")).inventoryRole)
    }
}
