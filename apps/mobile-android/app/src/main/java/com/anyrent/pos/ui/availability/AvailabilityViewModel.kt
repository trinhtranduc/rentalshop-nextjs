package com.anyrent.pos.ui.availability

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.domain.availability.AvailabilityProduct
import com.anyrent.pos.domain.availability.AvailabilityRepository
import com.anyrent.pos.domain.availability.ProductAvailability
import com.anyrent.pos.domain.error.AppError
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

data class AvailabilityUiState(
    val query: String = "",
    val products: List<AvailabilityProduct> = emptyList(),
    val selectedProduct: AvailabilityProduct? = null,
    val selectedDate: LocalDate = LocalDate.now(),
    val quantity: Int = 1,
    val result: ProductAvailability? = null,
    val availableByDate: Map<LocalDate, Int> = emptyMap(),
    val occupancyLoaded: Boolean = false,
    val occupancyMonth: YearMonth? = null,
    val searching: Boolean = false,
    val checking: Boolean = false,
    val error: String? = null,
)

class AvailabilityViewModel(
    private val repository: AvailabilityRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AvailabilityUiState())
    val state: StateFlow<AvailabilityUiState> = _state.asStateFlow()
    private var searchJob: Job? = null
    private var occupancyJob: Job? = null
    private var checkJob: Job? = null
    private var checkGeneration = 0
    private var occupancyGeneration = 0
    private val occupancyCache = mutableMapOf<YearMonth, Map<LocalDate, Int>>()
    private var occupancyCacheProductId: Int? = null
    private var occupancyLoadingMonth: YearMonth? = null
    private var pendingDisplayMonth: YearMonth? = null

    private fun resetOccupancyCache() {
        occupancyJob?.cancel()
        occupancyGeneration += 1
        occupancyCache.clear()
        occupancyCacheProductId = null
        occupancyLoadingMonth = null
        pendingDisplayMonth = null
        _state.update {
            it.copy(
                availableByDate = emptyMap(),
                occupancyLoaded = false,
                occupancyMonth = null,
            )
        }
    }

    fun updateQuery(value: String) {
        _state.update { it.copy(query = value) }
    }

    fun search() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            _state.update { it.copy(searching = true, error = null) }
            runCatching { repository.searchProducts(_state.value.query) }
                .onSuccess { products ->
                    _state.update { it.copy(products = products, searching = false) }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(searching = false, error = AppError.from(error).message)
                    }
                }
        }
    }

    fun selectProduct(product: AvailabilityProduct) {
        resetOccupancyCache()
        _state.update {
            it.copy(selectedProduct = product, products = emptyList(), query = product.name, result = null)
        }
        check()
    }

    fun selectProductById(productId: Int) {
        if (_state.value.selectedProduct?.id == productId) return
        viewModelScope.launch {
            _state.update { it.copy(searching = true, error = null) }
            runCatching { repository.getProduct(productId) }
                .onSuccess { product ->
                    _state.update { it.copy(searching = false) }
                    selectProduct(product)
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(searching = false, error = AppError.from(error).message)
                    }
                }
        }
    }

    fun updateDate(value: String) {
        val date = runCatching { LocalDate.parse(value) }.getOrNull()
        if (date == null) {
            _state.update { it.copy(error = "Date must use YYYY-MM-DD") }
            return
        }
        _state.update {
            it.copy(
                selectedDate = date,
                result = null,
                error = null,
            )
        }
    }

    /**
     * Called when the calendar shows a month.
     * Cached months render immediately; new months stay neutral until the API returns.
     */
    fun onCalendarMonthVisible(month: YearMonth) {
        val product = _state.value.selectedProduct ?: return
        pendingDisplayMonth = month

        if (product.id == occupancyCacheProductId && occupancyCache.containsKey(month)) {
            _state.update {
                it.copy(
                    availableByDate = occupancyCache[month].orEmpty(),
                    occupancyLoaded = true,
                    occupancyMonth = month,
                )
            }
            return
        }

        _state.update {
            it.copy(
                availableByDate = emptyMap(),
                occupancyLoaded = false,
                occupancyMonth = null,
            )
        }

        if (occupancyLoadingMonth == month) return

        occupancyJob?.cancel()
        occupancyLoadingMonth = month
        val generation = ++occupancyGeneration
        occupancyJob = viewModelScope.launch {
            val from = month.atDay(1).minusDays(7)
            val to = month.atEndOfMonth().plusDays(7)
            runCatching { repository.occupancyCalendar(product.id, from, to) }
                .onSuccess { availableByDate ->
                    if (generation != occupancyGeneration) return@onSuccess
                    occupancyLoadingMonth = null
                    occupancyCache[month] = availableByDate
                    occupancyCacheProductId = product.id
                    if (pendingDisplayMonth == month) {
                        _state.update {
                            it.copy(
                                availableByDate = availableByDate,
                                occupancyLoaded = true,
                                occupancyMonth = month,
                            )
                        }
                    }
                }
                .onFailure {
                    if (generation != occupancyGeneration) return@onFailure
                    occupancyLoadingMonth = null
                    if (pendingDisplayMonth == month) {
                        _state.update {
                            it.copy(
                                availableByDate = emptyMap(),
                                occupancyLoaded = false,
                                occupancyMonth = null,
                            )
                        }
                    }
                }
        }
    }

    fun updateQuantity(value: String) {
        val quantity = value.toIntOrNull()
        if (quantity == null || quantity < 1) {
            _state.update { it.copy(error = "Quantity must be at least 1") }
            return
        }
        _state.update { it.copy(quantity = quantity, result = null, error = null) }
    }

    fun check() {
        val snapshot = _state.value
        val product = snapshot.selectedProduct ?: run {
            _state.update { it.copy(error = "Select a product first") }
            return
        }
        checkJob?.cancel()
        val generation = ++checkGeneration
        checkJob = viewModelScope.launch {
            _state.update { it.copy(checking = true, result = null, error = null) }
            runCatching {
                repository.checkAvailability(
                    productId = product.id,
                    startDate = snapshot.selectedDate,
                    endDate = snapshot.selectedDate,
                    quantity = snapshot.quantity,
                )
            }.onSuccess { result ->
                if (generation == checkGeneration) {
                    _state.update { it.copy(result = result, checking = false) }
                }
            }.onFailure { error ->
                if (generation == checkGeneration) {
                    _state.update {
                        it.copy(checking = false, error = AppError.from(error).message)
                    }
                }
            }
        }
    }

    class Factory(
        private val repository: AvailabilityRepository,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            require(modelClass.isAssignableFrom(AvailabilityViewModel::class.java))
            return AvailabilityViewModel(repository) as T
        }
    }
}
