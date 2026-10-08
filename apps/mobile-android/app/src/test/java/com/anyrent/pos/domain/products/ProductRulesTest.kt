package com.anyrent.pos.domain.products

import com.anyrent.pos.R
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.UserRole
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.data.model.PricingOption
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.data.model.ProductOutletStock
import com.anyrent.pos.domain.error.ApiErrorMessages
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDate

/** #373 — role rules, prices, form validation, cart totals, error mapping, barcode match */
class ProductRulesTest {
    private val fixed = PricingOption(1, "FIXED", 300_000.0, isDefault = true)
    private val daily = PricingOption(2, "DAILY", 120_000.0)

    private fun product(
        id: Int = 1,
        rentPrice: Double = 300_000.0,
        salePrice: Double? = 1_800_000.0,
        options: List<PricingOption> = listOf(fixed, daily),
        pricingType: String = "FIXED",
        stock: Int = 5,
        available: Int = 3,
        renting: Int = 0,
        barcode: String? = null,
        deposit: Double = 0.0,
    ) = Product(
        id = id, name = "Áo dài $id", barcode = barcode, rentPrice = rentPrice, salePrice = salePrice,
        stock = stock, available = available, renting = renting, categoryId = null, categoryName = null,
        imageUrl = null, deposit = deposit, pricingType = pricingType, pricingOptions = options,
    )

    // Roles

    @Test
    fun `outlet staff sees no price fields and cannot edit`() {
        assertFalse(ProductAccess.showsPriceFields(UserRole.OUTLET_STAFF))
        assertFalse(ProductAccess.canEdit(UserRole.OUTLET_STAFF))
        assertTrue(ProductAccess.canCreate(UserRole.OUTLET_STAFF))
    }

    @Test
    fun `merchant and outlet admin manage prices`() {
        for (role in listOf(UserRole.MERCHANT, UserRole.OUTLET_ADMIN, UserRole.ADMIN)) {
            assertTrue(ProductAccess.showsPriceFields(role))
            assertTrue(ProductAccess.canEdit(role))
        }
        assertFalse(ProductAccess.canCreate(UserRole.UNKNOWN))
    }

    // Home row price line (#681)

    @Test
    fun `row price shows the default option first and the other second`() {
        assertEquals(
            ProductRowPrice(300_000.0, PricingMode.PER_RENTAL, 120_000.0, PricingMode.PER_DAY),
            ProductRowLogic.price(product()),
        )
        val dayDefault = product(options = listOf(fixed.copy(isDefault = false), daily.copy(isDefault = true)))
        assertEquals(
            ProductRowPrice(120_000.0, PricingMode.PER_DAY, 300_000.0, PricingMode.PER_RENTAL),
            ProductRowLogic.price(dayDefault),
        )
    }

    @Test
    fun `row price with one option has no second and sale only has no mode`() {
        assertEquals(ProductRowPrice(300_000.0, PricingMode.PER_RENTAL), ProductRowLogic.price(product(options = emptyList())))
        assertEquals(ProductRowPrice(120_000.0, PricingMode.PER_DAY), ProductRowLogic.price(product(options = listOf(daily.copy(isDefault = true)))))
        assertEquals(ProductRowPrice(900_000.0, null), ProductRowLogic.price(product(rentPrice = 0.0, salePrice = 900_000.0, options = emptyList())))
        assertNull(ProductRowLogic.price(product(rentPrice = 0.0, salePrice = null, options = emptyList())))
    }

    // Prices and stock

    @Test
    fun `prices from options and legacy fields`() {
        val p = product(options = listOf(fixed.copy(isDefault = false), daily.copy(isDefault = true)))
        assertEquals(300_000.0, ProductPricing.perRental(p)!!, 0.0)
        assertEquals(120_000.0, ProductPricing.perDay(p)!!, 0.0)
        assertEquals(PricingMode.PER_DAY, ProductPricing.defaultMode(p))
        val legacyDaily = product(rentPrice = 90_000.0, salePrice = 0.0, options = emptyList(), pricingType = "DAILY")
        assertNull(ProductPricing.perRental(legacyDaily))
        assertEquals(90_000.0, ProductPricing.perDay(legacyDaily)!!, 0.0)
        assertNull(ProductPricing.sale(legacyDaily))
    }

    @Test
    fun `pricing options sent on save`() {
        val both = ProductPricing.options(300_000.0, 120_000.0, PricingMode.PER_DAY)
        assertEquals(listOf("FIXED", "DAILY"), both.map { it.type })
        assertEquals(listOf("DAILY"), both.filter { it.isDefault }.map { it.type })
        val onlyFixed = ProductPricing.options(300_000.0, null, PricingMode.PER_DAY)
        assertEquals(listOf(PricingOptionInput("FIXED", 300_000.0, true)), onlyFixed)
        assertTrue(ProductPricing.options(0.0, null, PricingMode.PER_RENTAL).isEmpty())
    }

    @Test
    fun `stock counts and outlet choice`() {
        val p = product(stock = 7, available = 4).copy(
            outletStock = listOf(ProductOutletStock(2, 5, 2, 3), ProductOutletStock(4, 2, 0, 2)),
        )
        assertEquals(StockCounts(7, 3, 4), ProductStock.counts(p))
        assertEquals(StockCounts(5, 2, 3), ProductStock.counts(p, outletId = 2))
        assertEquals(2, ProductStock.outletFor(null, p, emptyList()))
        assertEquals(4, ProductStock.outletFor(4, p, emptyList()))
        assertEquals(4, ProductStock.outletFor(null, null, listOf(2 to false, 4 to true)))
        assertEquals(3, ProductStock.freeToday(p.copy(effectiveAvailableToday = 3)))
    }

    // Form

    private fun input(
        name: String = "Áo",
        perRental: Double? = 100_000.0,
        perDay: Double? = null,
        mode: PricingMode = PricingMode.PER_RENTAL,
        deposit: Double? = null,
        quantity: Int = 1,
        rented: Int = 0,
        photos: Int = 0,
        showsPrices: Boolean = true,
    ) = ProductFormInput(name, perRental, perDay, mode, null, deposit, quantity, rented, photos, showsPrices)

    @Test
    fun `form validation`() {
        assertEquals(emptyList<ProductFormIssue>(), ProductFormValidator.validate(input()))
        assertEquals(listOf(ProductFormIssue.NameRequired), ProductFormValidator.validate(input(name = "  ")))
        assertEquals(listOf(ProductFormIssue.PerDayDefaultNeedsPrice), ProductFormValidator.validate(input(mode = PricingMode.PER_DAY)))
        assertEquals(emptyList<ProductFormIssue>(), ProductFormValidator.validate(input(perDay = 50_000.0, mode = PricingMode.PER_DAY)))
        assertEquals(listOf(ProductFormIssue.NegativeAmount), ProductFormValidator.validate(input(deposit = -1.0)))
        assertEquals(listOf(ProductFormIssue.NegativeQuantity), ProductFormValidator.validate(input(quantity = -1)))
        assertEquals(listOf(ProductFormIssue.QuantityBelowRented(3)), ProductFormValidator.validate(input(quantity = 2, rented = 3)))
        assertEquals(listOf(ProductFormIssue.TooManyPhotos(5)), ProductFormValidator.validate(input(photos = 6)))
        // Staff: no price fields, so no price rules
        assertEquals(emptyList<ProductFormIssue>(), ProductFormValidator.validate(input(perRental = null, mode = PricingMode.PER_DAY, showsPrices = false)))
    }

    @Test
    fun `money input`() {
        assertEquals(1_250_000.0, MoneyInput.parse("1.250.000")!!, 0.0)
        assertNull(MoneyInput.parse(""))
        assertEquals("1.250.000", MoneyInput.display(1_250_000.0))
        assertEquals("", MoneyInput.display(null))
    }

    /** #461 — the form re-formats on each key ("300" in a Maestro run came from a tap on the covered save button) */
    @Test
    fun `typing digits keeps exactly those digits`() {
        var field = ""
        listOf("3", "0").forEach { field = MoneyInput.display(MoneyInput.parse(field + it)) }
        assertEquals("30", field)
        listOf("0", "0", "0").forEach { field = MoneyInput.display(MoneyInput.parse(field + it)) }
        assertEquals("30.000", field)
    }

    // Cart

    @Test
    fun `rent per rental versus per day versus sale`() {
        val p = product()
        val perRental = CartLine(product = p, quantity = 2, rentalDays = 3, pricingType = "FIXED")
        val calcRental = CartV2Logic.calc(perRental, isSale = false)
        assertEquals(CartLineCalc.Kind.PerRental, calcRental.kind)
        assertEquals(600_000.0, calcRental.total, 0.0)

        val perDay = perRental.copy(pricingType = "DAILY")
        val calcDay = CartV2Logic.calc(perDay, isSale = false)
        assertEquals(CartLineCalc.Kind.PerDay(3), calcDay.kind)
        assertEquals(120_000.0, calcDay.unitPrice, 0.0)
        assertEquals(120_000.0 * 2 * 3, calcDay.total, 0.0)

        val sale = perRental.copy(isSale = true, pricingType = "DAILY")
        val calcSale = CartV2Logic.calc(sale, isSale = true)
        assertEquals(CartLineCalc.Kind.Sale, calcSale.kind)
        assertEquals(3_600_000.0, calcSale.total, 0.0)

        assertTrue(CartV2Logic.offersBothModes(p))
        assertFalse(CartV2Logic.offersBothModes(product(options = listOf(fixed))))
        assertEquals(200_000.0, CartV2Logic.collectNow(isSale = false, total = 1_000_000.0, deposit = 200_000.0), 0.0)
        assertEquals(1_000_000.0, CartV2Logic.collectNow(isSale = true, total = 1_000_000.0, deposit = 200_000.0), 0.0)
    }

    @Test
    fun `shortage and inclusive rental days`() {
        assertNull(CartV2Logic.shortage(null, 2))
        assertEquals(1, CartV2Logic.shortage(1, 2))
        assertNull(CartV2Logic.shortage(2, 2))
        val day = LocalDate.of(2026, 10, 3)
        assertEquals(1, CartV2Logic.rentalDays(day, day))
        assertEquals(3, CartV2Logic.rentalDays(day, day.plusDays(2)))
    }

    @Test
    fun `switching to sale after a pricing toggle uses the sale price`() {
        CartStore.clear(persistToDisk = false)
        val p = product(id = 77)
        CartStore.addProduct(p)
        CartStore.setPricingType(77, "DAILY")
        assertEquals(120_000.0, CartStore.lines.value.single().unitPrice, 0.0)
        CartStore.setPricingType(77, "FIXED")
        assertEquals(300_000.0, CartStore.lines.value.single().unitPrice, 0.0)
        CartStore.setOrderType("SALE")
        assertEquals(1_800_000.0, CartStore.lines.value.single().unitPrice, 0.0)
        CartStore.clear(persistToDisk = false)
    }

    // Errors and barcode

    @Test
    fun `stock below rented has its own message`() {
        assertEquals(R.string.api_error_stock_below_rented, ApiErrorMessages.stringId("STOCK_BELOW_RENTED"))
        assertEquals(R.string.api_error_stock_below_rented, ApiErrorMessages.stringId("stock_below_rented"))
        assertEquals(0, ApiErrorMessages.stringId("SOMETHING_ELSE"))
    }

    @Test
    fun `barcode keeps only an exact match`() {
        val byName = product(id = 1, barcode = "XYZ").copy(name = "AD-0123 áo")
        val exact = product(id = 2, barcode = " ad-012 ")
        assertEquals(2, BarcodeMatch.exact("AD-012", listOf(byName, exact))?.id)
        assertNull(BarcodeMatch.exact("AD-01", listOf(byName, exact)))
        assertNull(BarcodeMatch.exact(" ", listOf(exact)))
    }

    // Home row (#383)

    @Test
    fun `cart count sums the lines of one product`() {
        val lines = listOf(CartLine(product(id = 1), quantity = 2), CartLine(product(id = 7), quantity = 3))
        assertEquals(2, ProductRowLogic.cartCount(1, lines))
        assertEquals(3, ProductRowLogic.cartCount(7, lines))
        assertEquals(0, ProductRowLogic.cartCount(99, lines))
        assertEquals(0, ProductRowLogic.cartCount(1, emptyList()))
    }

    @Test
    fun `row subtitle is the code and stock without the category`() {
        val withCategory = product(barcode = " AD-012 ", available = 3).copy(categoryId = 3, categoryName = "Áo dài")
        assertEquals(ProductRowSubtitle("AD-012", 3), ProductRowLogic.subtitle(withCategory))
        assertNull(ProductRowLogic.subtitle(product(barcode = "  ")).code)
        assertNull(ProductRowLogic.subtitle(product(barcode = "null")).code)
        assertEquals(0, ProductRowLogic.subtitle(product(available = 0)).free)
    }

    @Test
    fun `add button state`() {
        assertEquals(AddButtonState.Add, ProductRowLogic.addState(free = 3, inCart = 0))
        assertEquals(AddButtonState.InCart(2), ProductRowLogic.addState(free = 3, inCart = 2))
        assertEquals(AddButtonState.Out, ProductRowLogic.addState(free = 0, inCart = 0))
        assertEquals(AddButtonState.InCart(2), ProductRowLogic.addState(free = 0, inCart = 2)) // #677: in-cart wins
    }

    // #632 — categories from the product form (same table as iOS ProductsV2Tests)

    @Test
    fun categoryAddIsMerchantAndOutletAdminNeverStaff() {
        assertTrue(CategoryRules.canAdd(UserRole.MERCHANT))
        assertTrue(CategoryRules.canAdd(UserRole.OUTLET_ADMIN))
        assertFalse(CategoryRules.canAdd(UserRole.OUTLET_STAFF))
        assertFalse(CategoryRules.canAdd(UserRole.UNKNOWN))
    }

    @Test
    fun categoryRenameAndDeleteOnlyMerchant() {
        assertTrue(CategoryRules.canManage(UserRole.MERCHANT))
        assertTrue(CategoryRules.canManage(UserRole.ADMIN))
        assertFalse(CategoryRules.canManage(UserRole.OUTLET_ADMIN))
        assertFalse(CategoryRules.canManage(UserRole.OUTLET_STAFF))
        assertFalse(CategoryRules.canManage(UserRole.UNKNOWN))
    }

    @Test
    fun defaultCategoryIsNeverDeletable() {
        assertTrue(CategoryRules.canDelete(isDefault = false))
        assertFalse(CategoryRules.canDelete(isDefault = true))
    }

    @Test
    fun categorySearchIgnoresAccentsAndCase() {
        assertTrue(CategoryRules.matches("Áo cưới", "ao cuoi"))
        assertTrue(CategoryRules.matches("Đầm dạ hội", "dam"))
        assertTrue(CategoryRules.matches("Váy", "  "))
        assertFalse(CategoryRules.matches("Áo dài", "vay"))
        assertFalse(CategoryRules.matches(null, "a"))
    }

    @Test
    fun categoryNameIsTrimmedAndTwoToFiftyCharacters() {
        assertEquals(CategoryRules.NameError.REQUIRED, CategoryRules.validateName("   "))
        assertEquals(CategoryRules.NameError.TOO_SHORT, CategoryRules.validateName(" Á "))
        assertEquals(null, CategoryRules.validateName(" Áo "))
        assertEquals(null, CategoryRules.validateName("đ".repeat(50)))
        assertEquals(CategoryRules.NameError.TOO_LONG, CategoryRules.validateName("đ".repeat(51)))
    }

    @Test
    fun categoryErrorCodesHaveTheirOwnText() {
        assertEquals(R.string.api_error_category_name_exists, ApiErrorMessages.stringId("CATEGORY_NAME_EXISTS"))
        assertEquals(R.string.api_error_cannot_delete_default_category, ApiErrorMessages.stringId("CANNOT_DELETE_DEFAULT_CATEGORY"))
    }
}
