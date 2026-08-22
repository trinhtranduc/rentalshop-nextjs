package com.anyrent.pos.domain.availability

import com.anyrent.pos.domain.error.AppError
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.time.LocalDate

class ValidateRentalCartAvailabilityTest {
    private val pickup = LocalDate.of(2026, 8, 1)
    private val returns = LocalDate.of(2026, 8, 3)

    @Test
    fun `available products allow checkout and duplicate quantities are combined`() = runTest {
        val repository = BatchFakeRepository { requests ->
            requests.associate { request ->
                request.productId to availability(request, isAvailable = true)
            }
        }

        val blocked = ValidateRentalCartAvailability(repository)(
            lines = listOf(
                RentalCartLine(7, "Camera", 1),
                RentalCartLine(7, "Camera", 2),
                RentalCartLine(9, "Tripod", 1),
            ),
            pickupDate = pickup,
            returnDate = returns,
        )

        assertEquals(emptyList<BlockedRentalProduct>(), blocked)
        assertEquals(listOf(AvailabilityRequest(7, 3), AvailabilityRequest(9, 1)), repository.requests)
    }

    @Test
    fun `unavailable product blocks checkout`() = runTest {
        val repository = BatchFakeRepository { requests ->
            requests.associate { request ->
                request.productId to availability(
                    request,
                    isAvailable = request.productId != 7,
                )
            }
        }

        val blocked = ValidateRentalCartAvailability(repository)(
            listOf(RentalCartLine(7, "Camera", 1), RentalCartLine(9, "Tripod", 1)),
            pickup,
            returns,
        )

        assertEquals(listOf(7), blocked.map { it.productId })
    }

    @Test
    fun `missing batch result fails closed`() {
        val repository = BatchFakeRepository { emptyMap() }

        val error = assertThrows(AppError.InvalidResponse::class.java) {
            kotlinx.coroutines.runBlocking {
                ValidateRentalCartAvailability(repository)(
                    listOf(RentalCartLine(7, "Camera", 1)),
                    pickup,
                    returns,
                )
            }
        }

        assertEquals("Availability was not confirmed for Camera", error.message)
    }

    @Test
    fun `network failure propagates and cannot become available`() {
        val repository = BatchFakeRepository { throw AppError.Network("Offline") }

        assertThrows(AppError.Network::class.java) {
            kotlinx.coroutines.runBlocking {
                ValidateRentalCartAvailability(repository)(
                    listOf(RentalCartLine(7, "Camera", 1)),
                    pickup,
                    returns,
                )
            }
        }
    }

    private fun availability(
        request: AvailabilityRequest,
        isAvailable: Boolean,
    ) = ProductAvailability(
        productId = request.productId,
        productName = "Product ${request.productId}",
        totalStock = 5,
        totalRenting = 0,
        effectivelyAvailable = 5,
        requestedQuantity = request.quantity,
        isAvailable = isAvailable,
        conflicts = emptyList(),
        orders = emptyList(),
        message = null,
    )
}

private class BatchFakeRepository(
    private val batch: (List<AvailabilityRequest>) -> Map<Int, ProductAvailability>,
) : AvailabilityRepository {
    var requests: List<AvailabilityRequest> = emptyList()

    override suspend fun searchProducts(query: String): List<AvailabilityProduct> = emptyList()

    override suspend fun getProduct(productId: Int): AvailabilityProduct =
        error("Not used")

    override suspend fun checkAvailability(
        productId: Int,
        startDate: LocalDate,
        endDate: LocalDate,
        quantity: Int,
    ): ProductAvailability = error("Not used")

    override suspend fun checkBatchAvailability(
        requests: List<AvailabilityRequest>,
        startDate: LocalDate,
        endDate: LocalDate,
    ): Map<Int, ProductAvailability> {
        this.requests = requests
        return batch(requests)
    }

    override suspend fun occupancyCalendar(
        productId: Int,
        from: LocalDate,
        to: LocalDate,
    ): Map<LocalDate, Int> = emptyMap()
}
