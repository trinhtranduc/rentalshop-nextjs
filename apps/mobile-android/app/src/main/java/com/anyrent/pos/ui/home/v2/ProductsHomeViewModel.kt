package com.anyrent.pos.ui.home.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.model.Product
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
) : ViewModel() {
    private val _state = MutableStateFlow(ProductsHomeState())
    val state: StateFlow<ProductsHomeState> = _state.asStateFlow()
    private var page = 1
    private var generation = 0
    private var job: Job? = null

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
    }
}
