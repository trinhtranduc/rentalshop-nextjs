package com.anyrent.pos.domain.settings

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1313: the owner edits the shop and each branch on the phone; the branch manager edits own branch; staff only view. Same cases as iOS `ShopInfoTests`. */
class ShopInfoLogicTest {
    @Test
    fun rowTitleFollowsRole() {
        assertEquals(ShopInfoLogic.RowTitle.SHOP, ShopInfoLogic.rowTitle("MERCHANT"))
        for (role in listOf("OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY")) {
            assertEquals(role, ShopInfoLogic.RowTitle.BRANCH, ShopInfoLogic.rowTitle(role))
        }
    }

    @Test
    fun destinationByRole() {
        assertEquals(ShopInfoLogic.Destination.ShopAndBranches, ShopInfoLogic.destination("MERCHANT"))
        assertEquals(ShopInfoLogic.Destination.OwnBranch(editable = true), ShopInfoLogic.destination("OUTLET_ADMIN"))
        assertEquals(ShopInfoLogic.Destination.OwnBranch(editable = false), ShopInfoLogic.destination("OUTLET_STAFF"))
        assertEquals(ShopInfoLogic.Destination.OwnBranch(editable = false), ShopInfoLogic.destination("OUTLET_INVENTORY"))
        assertEquals(ShopInfoLogic.Destination.OwnBranch(editable = false), ShopInfoLogic.destination(null))
    }

    @Test
    fun onlyOwnerEditsShop() {
        assertTrue(ShopInfoLogic.canEditShop("MERCHANT"))
        for (role in listOf("OUTLET_ADMIN", "OUTLET_STAFF", "OUTLET_INVENTORY", "ADMIN", null)) {
            assertFalse(role.toString(), ShopInfoLogic.canEditShop(role))
        }
    }

    @Test
    fun whoEditsWhichBranch() {
        assertTrue(ShopInfoLogic.canEditBranch("MERCHANT", branchId = 5, ownBranchId = null))
        assertTrue(ShopInfoLogic.canEditBranch("OUTLET_ADMIN", branchId = 5, ownBranchId = 5))
        assertFalse(ShopInfoLogic.canEditBranch("OUTLET_ADMIN", branchId = 6, ownBranchId = 5))
        assertFalse(ShopInfoLogic.canEditBranch("OUTLET_ADMIN", branchId = 5, ownBranchId = null))
        assertFalse(ShopInfoLogic.canEditBranch("OUTLET_STAFF", branchId = 5, ownBranchId = 5))
        assertFalse(ShopInfoLogic.canEditBranch("OUTLET_INVENTORY", branchId = 5, ownBranchId = 5))
    }

    @Test
    fun addressLineJoinsStreetDistrictCity() {
        assertEquals(
            "12 Đường Số 1, P. Tân Phú, Quận 7, TP. Hồ Chí Minh",
            ShopInfoLogic.addressLine("12 Đường Số 1", "P. Tân Phú, Quận 7", "TP. Hồ Chí Minh"),
        )
    }

    @Test
    fun addressLineSkipsEmptyAndRepeatedParts() {
        assertEquals("12 Lê Lợi, Hà Nội", ShopInfoLogic.addressLine(" 12 Lê Lợi ", null, "Hà Nội"))
        assertEquals("Hà Nội", ShopInfoLogic.addressLine("Hà Nội", "", "Hà Nội"))
        assertEquals("", ShopInfoLogic.addressLine(null, null, null))
    }

    @Test
    fun shopSummaryPhoneAndTaxId() {
        assertEquals("0900 000 001 · MST 0123456789", ShopInfoLogic.shopSummary("0900 000 001", "0123456789", "MST"))
        assertEquals("0900 000 001", ShopInfoLogic.shopSummary("0900 000 001", " ", "MST"))
        assertEquals("MST 0123", ShopInfoLogic.shopSummary(null, "0123", "MST"))
        assertEquals("", ShopInfoLogic.shopSummary(null, null, "MST"))
    }

    @Test
    fun shopNeedsAName() {
        assertEquals(ShopInfoLogic.Problem.NAME_REQUIRED, ShopInfoLogic.problem(ShopFormValues(name = "  ")))
        assertNull(ShopInfoLogic.problem(ShopFormValues(name = "Áo dài Hoa Sen")))
    }

    @Test
    fun branchNeedsNameThenAddress() {
        assertEquals(ShopInfoLogic.Problem.NAME_REQUIRED, ShopInfoLogic.problem(BranchFormValues(name = "", phone = "0900", address = "")))
        assertEquals(ShopInfoLogic.Problem.ADDRESS_REQUIRED, ShopInfoLogic.problem(BranchFormValues(name = "Quận 7", phone = "", address = "")))
        assertEquals(ShopInfoLogic.Problem.ADDRESS_REQUIRED, ShopInfoLogic.problem(BranchFormValues(name = "Quận 7", phone = "", address = "  ")))
        assertNull(ShopInfoLogic.problem(BranchFormValues(name = "Quận 7", phone = "", address = "12 Đường Số 1")))
    }

    @Test
    fun shopPayloadHasTheMockupFieldsAndNoWebsite() {
        val payload = ShopInfoLogic.shopPayload(
            ShopFormValues(
                name = " Hoa Sen ", phone = "0900 000 001 ", taxId = "0123456789", address = "12 Đường Số 1",
                state = "P. Tân Phú, Quận 7", city = "TP. Hồ Chí Minh", country = "Việt Nam", zipCode = "", description = " Áo dài ",
            ),
        )
        assertEquals(setOf("name", "phone", "taxId", "address", "state", "city", "country", "zipCode", "description"), payload.keys)
        assertEquals("Hoa Sen", payload["name"])
        assertEquals("0900 000 001", payload["phone"])
        assertEquals("", payload["zipCode"])
        assertEquals("Áo dài", payload["description"])
        assertFalse(payload.containsKey("website"))
    }

    @Test
    fun branchPayloadIsNameAddressPhone() {
        val payload = ShopInfoLogic.branchPayload(BranchFormValues(name = " Thủ Đức ", phone = " 0900 000 102", address = "45 Đường Số 9 "))
        assertEquals(setOf("name", "phone", "address"), payload.keys)
        assertEquals("Thủ Đức", payload["name"])
        assertEquals("0900 000 102", payload["phone"])
        assertEquals("45 Đường Số 9", payload["address"])
    }

    @Test
    fun branchListHidesClosedBranchesAndPutsDefaultFirst() {
        val rows = ShopInfoLogic.branchRows(
            listOf(
                BranchRow(2, "B", isActive = true, isDefault = false),
                BranchRow(3, "C", isActive = false, isDefault = false),
                BranchRow(1, "A", isActive = true, isDefault = true),
                BranchRow(4, "D", isActive = null, isDefault = null),
            ),
        )
        assertEquals(listOf(1, 2, 4), rows.map { it.id })
    }

    @Test
    fun settingsRowValueByRole() {
        fun value(role: String?, name: String? = "Hoa Sen · Quận 7", count: Int? = 3) =
            ShopInfoLogic.rowValue(role, name, count, countText = { "$it chi nhánh" }, readOnlyText = "Chỉ xem")
        assertEquals("3 chi nhánh", value("MERCHANT"))
        assertNull(value("MERCHANT", count = null))
        assertEquals("Hoa Sen · Quận 7", value("OUTLET_ADMIN"))
        assertNull(value("OUTLET_ADMIN", name = " "))
        assertEquals("Chỉ xem", value("OUTLET_STAFF"))
        assertEquals("Chỉ xem", value("OUTLET_INVENTORY"))
    }
}
