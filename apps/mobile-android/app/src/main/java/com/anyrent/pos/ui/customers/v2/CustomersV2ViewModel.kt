package com.anyrent.pos.ui.customers.v2

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.CustomersV2Api
import com.anyrent.pos.domain.customers.CustomerRow
import com.anyrent.pos.domain.customers.CustomerRules
import com.anyrent.pos.domain.customers.CustomersPage
import com.anyrent.pos.domain.error.AppError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** Customer calls (replaceable in tests) */
interface CustomersSource {
    suspend fun list(page: Int, query: String?): CustomersPage
    suspend fun create(payload: JSONObject): CustomerRow
}

object LiveCustomersSource : CustomersSource {
    override suspend fun list(page: Int, query: String?): CustomersPage = withContext(Dispatchers.IO) {
        CustomersV2Api.list(page, CustomerRules.PAGE_SIZE, query).getOrThrow()
    }

    override suspend fun create(payload: JSONObject): CustomerRow = withContext(Dispatchers.IO) {
        CustomersV2Api.create(payload).getOrThrow()
    }
}

data class CustomersListState(
    val rows: List<CustomerRow> = emptyList(),
    val total: Int = 0,
    val query: String = "",
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val hasMore: Boolean = false,
    val error: String? = null,
)

/**
 * Customer list of the picker and of Settings (#387). Typing is debounced; a new query cancels the running one and an
 * answer for an older query never replaces a newer list.
 */
class CustomersListViewModel(
    private val source: CustomersSource = LiveCustomersSource,
    private val debounceMs: Long = 300,
) : ViewModel() {
    private val _state = MutableStateFlow(CustomersListState())
    val state: StateFlow<CustomersListState> = _state.asStateFlow()
    private var page = 1
    private var generation = 0
    private var job: Job? = null

    init {
        load(1, fromPull = false, wait = 0)
    }

    fun reload(fromPull: Boolean = false) = load(1, fromPull, wait = 0)

    fun setQuery(text: String) {
        val trimmed = text.trim()
        if (trimmed == _state.value.query) return
        _state.value = _state.value.copy(query = trimmed)
        load(1, fromPull = false, wait = debounceMs)
    }

    fun loadMore() {
        val current = _state.value
        if (!current.hasMore || current.loading || job?.isActive == true) return
        load(page + 1, fromPull = false, wait = 0)
    }

    private fun load(nextPage: Int, fromPull: Boolean, wait: Long) {
        if (nextPage == 1) {
            generation += 1
            job?.cancel()
            _state.value = _state.value.copy(loading = !fromPull && _state.value.rows.isEmpty(), refreshing = fromPull, error = null)
        }
        val token = generation
        val query = _state.value.query.ifBlank { null }
        job = viewModelScope.launch {
            if (wait > 0) delay(wait)
            val result = runCatching { source.list(nextPage, query) }
            if (token != generation) return@launch
            result.onSuccess { answer ->
                val merged = if (nextPage == 1) answer.rows else (_state.value.rows + answer.rows).distinctBy { it.id }
                page = nextPage
                _state.value = _state.value.copy(
                    rows = merged, total = answer.total, hasMore = answer.hasMore,
                    loading = false, refreshing = false, error = null,
                )
            }.onFailure {
                if (it is kotlinx.coroutines.CancellationException) return@onFailure
                _state.value = _state.value.copy(loading = false, refreshing = false, error = it.message)
            }
        }
    }

    class Factory : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = CustomersListViewModel() as T
    }
}

/** "Lưu và chọn": look the phone up first; create only when no customer has it */
class NewCustomerFlow(private val source: CustomersSource = LiveCustomersSource) {
    sealed class Outcome {
        data class Created(val row: CustomerRow) : Outcome()
        data class Existing(val row: CustomerRow) : Outcome()
        data class Failed(val message: String?) : Outcome()
    }

    /** Call after [CustomerRules.validate] passed */
    suspend fun submit(name: String, phone: String, note: String?): Outcome {
        search(CustomerRules.phoneDigits(phone), phone)?.let { return Outcome.Existing(it) }
        return try {
            Outcome.Created(source.create(CustomerRules.createPayload(name, phone, note)))
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            // The API found the same phone stored with other spacing: show that customer if we can
            val existing = if ((e as? AppError.Http)?.statusCode == 409) search(phone.trim(), phone) else null
            existing?.let { Outcome.Existing(it) } ?: Outcome.Failed(e.message)
        }
    }

    private suspend fun search(query: String, phone: String): CustomerRow? {
        // The API ignores a query shorter than 2 characters
        if (query.length < 2) return null
        val rows = runCatching { source.list(1, query).rows }.getOrDefault(emptyList())
        return CustomerRules.duplicate(phone, rows)
    }
}
