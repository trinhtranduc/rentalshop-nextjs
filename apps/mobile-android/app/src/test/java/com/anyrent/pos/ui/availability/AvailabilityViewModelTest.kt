package com.anyrent.pos.ui.availability

import com.anyrent.pos.domain.availability.AvailabilityProduct
import com.anyrent.pos.domain.availability.AvailabilityRequest
import com.anyrent.pos.domain.availability.AvailabilityRepository
import com.anyrent.pos.domain.availability.ProductAvailability
import com.anyrent.pos.domain.error.AppError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

@OptIn(ExperimentalCoroutinesApi::class)
class AvailabilityViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `search then select product loads availability`() = runTest(dispatcher) {
        val product = AvailabilityProduct(7, "Camera", "ABC", 4)
        val expected = ProductAvailability(
            productId = 7,
            productName = "Camera",
            totalStock = 4,
            totalRenting = 2,
            effectivelyAvailable = 2,
            requestedQuantity = 1,
            isAvailable = true,
            conflicts = emptyList(),
            orders = emptyList(),
            message = null,
        )
        val repository = FakeAvailabilityRepository(
            products = listOf(product),
            availability = expected,
        )
        val viewModel = AvailabilityViewModel(repository)

        viewModel.updateQuery("cam")
        viewModel.search()
        advanceUntilIdle()
        assertEquals(listOf(product), viewModel.state.value.products)

        viewModel.selectProduct(product)
        advanceUntilIdle()

        assertEquals(expected, viewModel.state.value.result)
        assertFalse(viewModel.state.value.checking)
        assertNull(viewModel.state.value.error)
    }

    @Test
    fun `selected day is used for both availability boundaries`() = runTest(dispatcher) {
        val product = AvailabilityProduct(7, "Camera", null, 4)
        val repository = FakeAvailabilityRepository(products = listOf(product))
        val viewModel = AvailabilityViewModel(repository)
        viewModel.selectProduct(product)
        advanceUntilIdle()
        repository.checkCalls = 0

        viewModel.updateDate("2026-08-10")
        viewModel.check()
        advanceUntilIdle()

        assertEquals(1, repository.checkCalls)
        assertEquals(LocalDate.of(2026, 8, 10), repository.lastStartDate)
        assertEquals(LocalDate.of(2026, 8, 10), repository.lastEndDate)
    }

    @Test
    fun `repository error becomes stable ui error`() = runTest(dispatcher) {
        val repository = FakeAvailabilityRepository(
            searchError = AppError.Network("Offline"),
        )
        val viewModel = AvailabilityViewModel(repository)

        viewModel.search()
        advanceUntilIdle()

        assertEquals("Offline", viewModel.state.value.error)
        assertFalse(viewModel.state.value.searching)
    }

    @Test
    fun `scanned product id loads product then availability`() = runTest(dispatcher) {
        val product = AvailabilityProduct(19, "Tripod", "SCAN-19", 3)
        val expected = ProductAvailability(
            productId = 19,
            productName = "Tripod",
            totalStock = 3,
            totalRenting = 0,
            effectivelyAvailable = 3,
            requestedQuantity = 1,
            isAvailable = true,
            conflicts = emptyList(),
            orders = emptyList(),
            message = null,
        )
        val repository = FakeAvailabilityRepository(
            products = listOf(product),
            availability = expected,
        )
        val viewModel = AvailabilityViewModel(repository)

        viewModel.selectProductById(19)
        advanceUntilIdle()

        assertEquals(product, viewModel.state.value.selectedProduct)
        assertEquals(expected, viewModel.state.value.result)
        assertEquals(1, repository.getProductCalls)
        assertEquals(1, repository.checkCalls)
    }
}

private class FakeAvailabilityRepository(
    private val products: List<AvailabilityProduct> = emptyList(),
    private val availability: ProductAvailability? = null,
    private val searchError: Throwable? = null,
) : AvailabilityRepository {
    var checkCalls: Int = 0
    var getProductCalls: Int = 0
    var lastStartDate: LocalDate? = null
    var lastEndDate: LocalDate? = null

    override suspend fun searchProducts(query: String): List<AvailabilityProduct> {
        searchError?.let { throw it }
        return products
    }

    override suspend fun getProduct(productId: Int): AvailabilityProduct {
        getProductCalls++
        return products.first { it.id == productId }
    }

    override suspend fun checkAvailability(
        productId: Int,
        startDate: LocalDate,
        endDate: LocalDate,
        quantity: Int,
    ): ProductAvailability {
        checkCalls++
        lastStartDate = startDate
        lastEndDate = endDate
        if (endDate.isBefore(startDate)) {
            throw AppError.Validation("Return date must be on or after pickup date")
        }
        return availability ?: ProductAvailability(
            productId = productId,
            productName = products.firstOrNull { it.id == productId }?.name.orEmpty(),
            totalStock = 0,
            totalRenting = 0,
            effectivelyAvailable = 0,
            requestedQuantity = quantity,
            isAvailable = false,
            conflicts = emptyList(),
            orders = emptyList(),
            message = null,
        )
    }

    override suspend fun checkBatchAvailability(
        requests: List<AvailabilityRequest>,
        startDate: LocalDate,
        endDate: LocalDate,
    ): Map<Int, ProductAvailability> = requests.associate {
        it.productId to checkAvailability(it.productId, startDate, endDate, it.quantity)
    }
}
