package com.anyrent.pos.domain.products

import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.data.model.ProductOutletStock
import com.anyrent.pos.domain.deposit.ClientCapabilities
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * #1346 (#1335 PR 1m), iOS `BranchListingTests`: who ticks "Hiện ở chi nhánh", who sees the tick, what the list asks
 * for, the reminder when unticking, and the payloads.
 */
class BranchListingTest {
    private val branchRoles = listOf(UserRole.OUTLET_ADMIN, UserRole.OUTLET_INVENTORY, UserRole.OUTLET_STAFF)

    private val outlets = listOf(
        BranchOutlet(1, "Quận 1", isDefault = true),
        BranchOutlet(7, "Quận 7", isDefault = false),
        BranchOutlet(9, "Thủ Đức", isDefault = false),
    )

    private fun product(vararg rows: ProductOutletStock) = Product(
        id = 12, name = "Áo dài gấm đỏ", barcode = null, rentPrice = 150_000.0, salePrice = null, stock = 12, available = 6,
        renting = 2, categoryId = null, categoryName = null, imageUrl = null, outletStock = rows.toList(),
    )

    // Who may tick

    @Test
    fun onlyTheOwnerTicksAndUnticks() {
        assertTrue(BranchListing.canSet(UserRole.MERCHANT))
        assertFalse(BranchListing.canSet(UserRole.OUTLET_ADMIN))
        assertFalse(BranchListing.canSet(UserRole.OUTLET_INVENTORY))
        assertFalse(BranchListing.canSet(UserRole.OUTLET_STAFF))
        assertFalse(BranchListing.canSet(UserRole.UNKNOWN))
        assertFalse(BranchListing.canSet(null))
    }

    // Who sees the tick

    @Test
    fun theOwnerSeesTheTickWithTwoOrMoreActiveBranches() {
        assertTrue(BranchListing.showsTick(UserRole.MERCHANT, activeOutletCount = 2, productOutletRows = 0))
        assertTrue(BranchListing.showsTick(UserRole.MERCHANT, activeOutletCount = 3, productOutletRows = 3))
        // One branch (every Basic shop), or outlets not loaded yet: no tick
        assertFalse(BranchListing.showsTick(UserRole.MERCHANT, activeOutletCount = 1, productOutletRows = 1))
        assertFalse(BranchListing.showsTick(UserRole.MERCHANT, activeOutletCount = 0, productOutletRows = 5))
    }

    @Test
    fun aBranchRoleSeesTheDimmedTickWhenTheProductHasRowsAtTwoBranches() {
        for (role in branchRoles) {
            assertTrue("$role", BranchListing.showsTick(role, activeOutletCount = 0, productOutletRows = 2))
            assertFalse("$role", BranchListing.showsTick(role, activeOutletCount = 0, productOutletRows = 1))
            assertFalse("$role", BranchListing.showsTick(role, activeOutletCount = 0, productOutletRows = 0))
        }
        assertFalse(BranchListing.showsTick(null, activeOutletCount = 3, productOutletRows = 3))
    }

    // What the list asks for

    @Test
    fun branchRolesAskForListedProductsOnly() {
        for (role in branchRoles) {
            assertTrue("$role", BranchListing.sendsListed(role, activeOutletCount = 0))
            assertTrue("$role", BranchListing.sendsListed(role, activeOutletCount = 3))
        }
    }

    @Test
    fun theOwnerNeverSendsListedSoTheOwnerSeesEveryProduct() {
        assertFalse(BranchListing.sendsListed(UserRole.MERCHANT, activeOutletCount = 3))
        assertFalse(BranchListing.sendsListed(UserRole.MERCHANT, activeOutletCount = 1))
        assertFalse(BranchListing.sendsListed(null, activeOutletCount = 3))
    }

    @Test
    fun aShopKnownToHaveOneBranchSendsNothing() {
        assertFalse(BranchListing.sendsListed(UserRole.OUTLET_STAFF, activeOutletCount = 1))
    }

    @Test
    fun listQueryAddsListedTrueWithoutTouchingTheRest() {
        val base = listOf("page=1", "limit=20", "outletId=7")
        assertEquals(base + "listed=true", BranchListing.listQuery(base, UserRole.OUTLET_STAFF, activeOutletCount = 0))
        assertEquals(base, BranchListing.listQuery(base, UserRole.MERCHANT, activeOutletCount = 3))
    }

    // The header

    @Test
    fun theHeaderDeclaresBranchListing() {
        assertEquals("branch-listing", BranchListing.CAPABILITY_TOKEN)
        assertTrue(ClientCapabilities.TOKENS.contains("branch-listing"))
        assertTrue(ClientCapabilities.headerValue.contains("branch-listing"))
        // The older tokens stay
        assertTrue(ClientCapabilities.TOKENS.contains("installments"))
        assertTrue(ClientCapabilities.TOKENS.contains("block-pricing"))
    }

    // Is a product listed here

    @Test
    fun aRowIsListedUnlessTheApiSaysFalse() {
        val p = product(
            ProductOutletStock(1, 4, 0, 4, isListed = false),
            ProductOutletStock(7, 2, 0, 2, isListed = true),
            ProductOutletStock(9, 0, 0, 0),
        )
        assertFalse(BranchListing.isListedAt(p, 1))
        assertTrue(BranchListing.isListedAt(p, 7))
        // An older API (no field): listed
        assertTrue(BranchListing.isListedAt(p, 9))
        // No row for the branch, or no branch known: nothing to hide
        assertTrue(BranchListing.isListedAt(p, 42))
        assertTrue(BranchListing.isListedAt(p, null))
        assertTrue(BranchListing.isListedAt(product(), 7))
    }

    @Test
    fun theParserKeepsIsListedAndTreatsAMissingOrNullFieldAsListed() {
        val rows = BranchListing.parseRows(
            org.json.JSONArray(
                """[{"outletId":1,"stock":4,"isListed":false},{"outlet":{"id":7},"stock":2,"isListed":true},{"outletId":9,"stock":0},{"outletId":11,"isListed":null}]""",
            ),
        )
        assertEquals(listOf(false, true, true, true), rows.map { it.isListed })
    }

    @Test
    fun anUnlistedProductCannotBeAddedButOneAlreadyInTheCartKeepsItsCount() {
        assertEquals(AddButtonState.NotListed, ProductRowLogic.addState(free = 3, inCart = 0, listed = false))
        assertEquals(AddButtonState.NotListed, ProductRowLogic.addState(free = 0, inCart = 0, listed = false))
        assertEquals(AddButtonState.InCart(2), ProductRowLogic.addState(free = 3, inCart = 2, listed = false))
        assertEquals(AddButtonState.Add, ProductRowLogic.addState(free = 3, inCart = 0, listed = true))
        assertEquals(AddButtonState.Out, ProductRowLogic.addState(free = 0, inCart = 0, listed = true))
        // The old call keeps working
        assertEquals(AddButtonState.Add, ProductRowLogic.addState(free = 3, inCart = 0))
    }

    @Test
    fun onlyTheOwnerOfAManyBranchShopSeesAnUnlistedRowAsUnlisted() {
        val p = product(ProductOutletStock(7, 4, 0, 4, isListed = false))
        assertFalse(BranchListing.listedForRow(p, UserRole.MERCHANT, activeOutletCount = 3, outletId = 7))
        assertTrue(BranchListing.listedForRow(p, UserRole.MERCHANT, activeOutletCount = 3, outletId = 1))
        // One branch (Basic), outlets not loaded, or a branch role (the list was filtered by the API): never hidden
        assertTrue(BranchListing.listedForRow(p, UserRole.MERCHANT, activeOutletCount = 1, outletId = 7))
        assertTrue(BranchListing.listedForRow(p, UserRole.MERCHANT, activeOutletCount = 0, outletId = 7))
        assertTrue(BranchListing.listedForRow(p, UserRole.OUTLET_STAFF, activeOutletCount = 0, outletId = 7))
    }

    // The reminder when unticking

    private fun row(listed: Boolean, stock: Int, renting: Int) =
        BranchTickRow(outletId = 7, name = "Quận 7", isDefault = false, stock = stock, renting = renting, listed = listed)

    @Test
    fun reminderOnlyWhenUntickedAndSomethingIsLeft() {
        assertEquals(BranchListingReminder(4, 2), BranchListing.reminder(row(listed = false, stock = 4, renting = 2)))
        assertEquals(BranchListingReminder(4, 0), BranchListing.reminder(row(listed = false, stock = 4, renting = 0)))
        assertEquals(BranchListingReminder(0, 2), BranchListing.reminder(row(listed = false, stock = 0, renting = 2)))
        // Nothing left (mockup B2c): no line
        assertNull(BranchListing.reminder(row(listed = false, stock = 0, renting = 0)))
        // Still ticked: no line
        assertNull(BranchListing.reminder(row(listed = true, stock = 4, renting = 2)))
    }

    @Test
    fun reminderWithAndWithoutRentingPicksTheRightString() {
        assertEquals(com.anyrent.pos.R.string.products_listing_reminder, BranchListingReminder(4, 2).stringRes)
        assertEquals(com.anyrent.pos.R.string.products_listing_reminder_no_rent, BranchListingReminder(4, 0).stringRes)
        assertEquals(listOf<Any>(4, 2), BranchListingReminder(4, 2).args)
        assertEquals(listOf<Any>(4), BranchListingReminder(4, 0).args)
    }

    // Rows of the form

    @Test
    fun aNewProductTicksTheCreatingBranchOnly() {
        val rows = BranchListing.rows(outlets, product = null, creatingAt = 7)
        assertEquals(listOf(1, 7, 9), rows.map { it.outletId })
        assertEquals(listOf(false, true, false), rows.map { it.listed })
        assertEquals(listOf("Quận 1", "Quận 7", "Thủ Đức"), rows.map { it.name })
        assertEquals(listOf(true, false, false), rows.map { it.isDefault })
    }

    @Test
    fun aSavedProductFollowsItsRowsAndAMissingRowIsNotListed() {
        val p = product(
            ProductOutletStock(1, 8, 2, 6, isListed = true),
            ProductOutletStock(7, 4, 2, 2, isListed = false),
        )
        val rows = BranchListing.rows(outlets, product = p, creatingAt = null)
        assertEquals(listOf(true, false, false), rows.map { it.listed })
        assertEquals(listOf(8, 4, 0), rows.map { it.stock })
        assertEquals(listOf(2, 2, 0), rows.map { it.renting })
    }

    @Test
    fun changesAreOnlyTheTicksThatMoved() {
        val before = BranchListing.rows(outlets, product = null, creatingAt = 1)
        val after = before.toMutableList().apply {
            this[0] = this[0].copy(listed = false)
            this[2] = this[2].copy(listed = true)
        }
        assertEquals(
            listOf(BranchTickChange(1, false), BranchTickChange(9, true)),
            BranchListing.changes(before, after),
        )
        assertEquals(emptyList<BranchTickChange>(), BranchListing.changes(before, before))
    }

    @Test
    fun creatingSendsTheTypedStockAtTheCurrentBranchAndZeroRowsForTheOtherTicks() {
        val rows = BranchListing.rows(outlets, product = null, creatingAt = 1).toMutableList()
        rows[2] = rows[2].copy(listed = true)
        val items = BranchListing.createStock(rows, quantity = 5, at = 1)
        assertEquals(listOf(1, 9), items.map { it.outletId })
        assertEquals(listOf(5, 0), items.map { it.stock })
        assertEquals(listOf<Boolean?>(true, true), items.map { it.isListed })
    }

    @Test
    fun creatingWithTheCurrentBranchUntickedStillSendsItsStock() {
        val rows = BranchListing.rows(outlets, product = null, creatingAt = 1).toMutableList()
        rows[0] = rows[0].copy(listed = false)
        rows[1] = rows[1].copy(listed = true)
        val items = BranchListing.createStock(rows, quantity = 5, at = 1)
        assertEquals(listOf(1, 7), items.map { it.outletId })
        assertEquals(listOf(5, 0), items.map { it.stock })
        assertEquals(listOf<Boolean?>(false, true), items.map { it.isListed })
    }

    // Requests

    @Test
    fun anOutletStockItemSendsIsListedOnlyWhenItIsSet() {
        val plain = BranchOutletStockItem(1, 3).toJson()
        assertEquals(1, plain.getInt("outletId"))
        assertEquals(3, plain.getInt("stock"))
        assertFalse(plain.has("isListed"))
        val listed: JSONObject = BranchOutletStockItem(1, 3, isListed = true).toJson()
        assertTrue(listed.getBoolean("isListed"))
        assertFalse(BranchOutletStockItem(1, 0, isListed = false).toJson().getBoolean("isListed"))
    }

    @Test
    fun theListingBodyIsOneBranchAndTheProductIds() {
        val body = BranchListing.listingBody(outletId = 7, productIds = listOf(12, 13), isListed = false)
        assertEquals(7, body.getInt("outletId"))
        assertEquals(listOf(12, 13), (0 until body.getJSONArray("productIds").length()).map { body.getJSONArray("productIds").getInt(it) })
        assertFalse(body.getBoolean("isListed"))
        assertEquals("/api/products/listing", BranchListing.LISTING_PATH)
    }
}
