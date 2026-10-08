package com.anyrent.pos.ui.home.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.ui.navigation.OrdersChanged
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ProductsHomeState(
    val products: List<Product> = emptyList(),
    val query: String = "",
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val hasMore: Boolean = false,
    val error: String? = null,
)

/** Products deleted from the detail screen (#390): the list drops them when it shows again */
object DeletedProducts {
    private val _ids = MutableStateFlow<Set<Int>>(emptySet())
    val ids: StateFlow<Set<Int>> = _ids.asStateFlow()

    fun add(id: Int) {
        _ids.value = _ids.value + id
    }
}

/** Loads one page (replaceable in tests) */
fun interface ProductsPageSource {
    suspend fun load(page: Int, query: String?): ApiClient.PageResult<Product>
}

/**
 * Product list of the redesigned Home tab (#373). A new query cancels the running one, and an answer for an older
 * query never replaces a newer list.
 */
class ProductsHomeViewModel(
    private val source: ProductsPageSource = ProductsPageSource { page, query ->
        withContext(Dispatchers.IO) {
            ProductsV2Api.listProducts(page, PAGE_SIZE, query).getOrThrow()
        }
    },
    /** #677: the orders-changed version (#674 `OrdersChanged`) */
    changes: () -> Long = { OrdersChanged.version.value },
) : ViewModel() {
    private val _state = MutableStateFlow(ProductsHomeState())
    val state: StateFlow<ProductsHomeState> = _state.asStateFlow()
    private var page = 1
    private var generation = 0
    private var job: Job? = null
    private var quietJob: Job? = null
    /** The orders-changed version the rows' stock reflects */
    private var stockVersion = changes()

    fun reload(fromPull: Boolean = false) = load(1, fromPull)

    fun setQuery(text: String) {
        val trimmed = text.trim()
        if (trimmed == _state.value.query) return
        _state.value = _state.value.copy(query = trimmed)
        load(1, false)
    }

    fun loadMore() {
        val current = _state.value
        if (!current.hasMore || current.loading || job?.isActive == true) return
        load(page + 1, false)
    }

    /**
     * #677: an order was created or edited ([version] of `OrdersChanged`, read whenever the list shows): refresh the
     * loaded rows' stock once per change.
     */
    fun onOrdersVersion(version: Long) {
        if (version == stockVersion) return
        stockVersion = version
        refreshQuietly()
    }

    /**
     * Fetch the loaded pages again and update the rows in place: no spinner, same rows in the same order (the scroll
     * stays). Rows the answer does not carry stay as they were (iOS `ProductsHomeViewModel.refreshQuietly`).
     */
    fun refreshQuietly() {
        val current = _state.value
        if (current.products.isEmpty() || current.loading) return
        val token = generation
        val query = current.query.ifBlank { null }
        val pages = page.coerceIn(1, QUIET_MAX_PAGES)
        quietJob?.cancel()
        quietJob = viewModelScope.launch {
            val fresh = runCatching { (1..pages).flatMap { source.load(it, query).items } }.getOrNull() ?: return@launch
            if (token != generation) return@launch
            val byId = fresh.associateBy { it.id }
            _state.value = _state.value.copy(products = _state.value.products.map { byId[it.id] ?: it })
        }
    }

    /** Put a saved product back without a reload */
    fun replace(product: Product) {
        val list = _state.value.products
        _state.value = _state.value.copy(
            products = if (list.any { it.id == product.id }) list.map { if (it.id == product.id) product else it }
            else listOf(product) + list,
        )
    }

    /** Drop a deleted product without a reload */
    fun remove(productId: Int) {
        val list = _state.value.products
        if (list.any { it.id == productId }) _state.value = _state.value.copy(products = list.filterNot { it.id == productId })
    }

    private fun load(nextPage: Int, fromPull: Boolean) {
        if (nextPage == 1) {
            generation += 1
            job?.cancel()
            _state.value = _state.value.copy(loading = !fromPull, refreshing = fromPull, error = null)
        }
        val token = generation
        val query = _state.value.query.ifBlank { null }
        job = viewModelScope.launch {
            val result = runCatching { source.load(nextPage, query) }
            if (token != generation) return@launch
            result.onSuccess { page ->
                val merged = if (nextPage == 1) page.items
                else (_state.value.products + page.items).distinctBy { it.id }
                this@ProductsHomeViewModel.page = nextPage
                _state.value = _state.value.copy(
                    products = merged, hasMore = page.hasMore, loading = false, refreshing = false, error = null,
                )
            }.onFailure {
                if (it is kotlinx.coroutines.CancellationException) return@onFailure
                _state.value = _state.value.copy(loading = false, refreshing = false, error = it.message)
            }
        }
    }

    class Factory : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = ProductsHomeViewModel() as T
    }

    companion object {
        const val PAGE_SIZE = 20
        /** Pages the quiet refresh fetches at most */
        const val QUIET_MAX_PAGES = 5
    }
}
