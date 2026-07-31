package com.anyrent.pos.ui.payment

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.error.AppError
import com.anyrent.pos.domain.payment.PaymentAction
import com.anyrent.pos.domain.payment.PaymentMethod
import com.anyrent.pos.domain.payment.PaymentPolicy
import com.anyrent.pos.domain.payment.PaymentQr
import com.anyrent.pos.domain.payment.PaymentReceipt
import com.anyrent.pos.domain.payment.PaymentRepository
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class PaymentUiState(
    val action: PaymentAction? = null,
    val selectedMethod: PaymentMethod = PaymentMethod.CASH,
    val submitting: Boolean = false,
    val receipt: PaymentReceipt? = null,
    val qr: PaymentQr? = null,
    val loadingQr: Boolean = false,
    val error: String? = null,
)

class PaymentViewModel(
    private val repository: PaymentRepository,
    private val referenceProvider: () -> String = { UUID.randomUUID().toString() },
) : ViewModel() {
    private val _state = MutableStateFlow(PaymentUiState())
    val state: StateFlow<PaymentUiState> = _state.asStateFlow()
    private var orderId: Int? = null
    private var pendingReference: String? = null

    fun setOrder(order: OrderDetail) {
        orderId = order.summary.id
        pendingReference = null
        _state.update {
            it.copy(
                action = PaymentPolicy.actionFor(order),
                receipt = null,
                error = null,
            )
        }
    }

    fun selectMethod(method: PaymentMethod) {
        if (!_state.value.submitting) _state.update { it.copy(selectedMethod = method) }
    }

    fun submit(onSuccess: () -> Unit) {
        val id = orderId ?: return
        val snapshot = _state.value
        val action = snapshot.action ?: return
        if (snapshot.submitting) return
        val reference = pendingReference ?: referenceProvider().also { pendingReference = it }
        _state.update { it.copy(submitting = true, error = null) }
        viewModelScope.launch {
            runCatching {
                repository.processPayment(id, action, snapshot.selectedMethod, reference)
            }.onSuccess { receipt ->
                pendingReference = null
                _state.update { it.copy(submitting = false, receipt = receipt) }
                onSuccess()
            }.onFailure { error ->
                _state.update {
                    it.copy(submitting = false, error = AppError.from(error).message)
                }
            }
        }
    }

    fun loadQr() {
        val id = orderId ?: return
        if (_state.value.loadingQr) return
        _state.update { it.copy(loadingQr = true, qr = null, error = null) }
        viewModelScope.launch {
            runCatching { repository.getPaymentQr(id) }
                .onSuccess { qr ->
                    _state.update { it.copy(loadingQr = false, qr = qr) }
                }
                .onFailure { error ->
                    _state.update {
                        it.copy(loadingQr = false, error = AppError.from(error).message)
                    }
                }
        }
    }

    fun clearQr() = _state.update { it.copy(qr = null) }

    fun clearError() = _state.update { it.copy(error = null) }

    class Factory(
        private val repository: PaymentRepository,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            PaymentViewModel(repository) as T
    }
}
