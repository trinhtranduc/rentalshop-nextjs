package com.anyrent.pos.data

import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.availability.AvailabilityProduct
import com.anyrent.pos.domain.availability.AvailabilityRepository
import com.anyrent.pos.domain.availability.AvailabilityRequest
import com.anyrent.pos.domain.availability.ProductAvailability
import com.anyrent.pos.domain.availability.ValidateRentalCartAvailability
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

/** #677 — saving an edited order checks availability without the order's own units, in the app's language */
class CartOrderSubmitEditTest {
    private fun product(id: Int) = Product(
        id = id, name = "Camera", barcode = null, rentPrice = 100.0, salePrice = 200.0, stock = 5, available = 5,
        renting = 0, categoryId = null, categoryName = null, imageUrl = null, deposit = 0.0,
    )

    @Before
    fun setUp() = CartStore.clear(persistToDisk = false)

    @After
    fun tearDown() = CartStore.clear(persistToDisk = false)

    @Test
    fun `the edited order is excluded from the save check`() = runTest {
        val repository = RecordingRepository(available = true)
        CartStore.setOrderType("RENT")
        CartStore.addProduct(product(7), quantity = 4)

        val error = CartOrderSubmit.editAvailabilityError(
            ValidateRentalCartAvailability(repository), 482, "expired", "failed", "Có xung đột lịch",
        )

        assertNull(error)
        assertEquals(482, repository.excludeOrderId)
        assertEquals(listOf(AvailabilityRequest(7, 4)), repository.requests)
    }

    @Test
    fun `a real conflict shows the localized label, not the API English`() = runTest {
        val repository = RecordingRepository(available = false)
        CartStore.setOrderType("RENT")
        CartStore.addProduct(product(7))

        val error = CartOrderSubmit.editAvailabilityError(
            ValidateRentalCartAvailability(repository), 482, "expired", "failed", "Có xung đột lịch",
        )

        assertEquals("Có xung đột lịch: Camera", error)
    }

    @Test
    fun `a sale is not checked`() = runTest {
        val repository = RecordingRepository(available = false)
        CartStore.setOrderType("SALE")
        CartStore.addProduct(product(7))

        assertNull(
            CartOrderSubmit.editAvailabilityError(
                ValidateRentalCartAvailability(repository), 482, "expired", "failed", "Có xung đột lịch",
            ),
        )
        assertEquals(emptyList<AvailabilityRequest>(), repository.requests)
    }
}

private class RecordingRepository(private val available: Boolean) : AvailabilityRepository {
    var requests: List<AvailabilityRequest> = emptyList()
    var excludeOrderId: Int? = null

    override suspend fun searchProducts(query: String): List<AvailabilityProduct> = emptyList()
    override suspend fun getProduct(productId: Int): AvailabilityProduct = error("Not used")
    override suspend fun checkAvailability(productId: Int, startDate: LocalDate, endDate: LocalDate, quantity: Int): ProductAvailability =
        error("Not used")

    override suspend fun checkBatchAvailability(
        requests: List<AvailabilityRequest>,
        startDate: LocalDate,
        endDate: LocalDate,
        excludeOrderId: Int?,
    ): Map<Int, ProductAvailability> {
        this.requests = requests
        this.excludeOrderId = excludeOrderId
        return requests.associate {
            it.productId to ProductAvailability(
                productId = it.productId, productName = "Camera", totalStock = 5, totalRenting = 0,
                effectivelyAvailable = 5, requestedQuantity = it.quantity, isAvailable = available,
                conflicts = emptyList(), orders = emptyList(), message = null,
            )
        }
    }

    override suspend fun occupancyCalendar(productId: Int, from: LocalDate, to: LocalDate): Map<LocalDate, Int> = emptyMap()
}
