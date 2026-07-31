package com.anyrent.pos.ui.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.ui.common.formatMoney
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartCheckoutScreen(onBack: () -> Unit, onPickCustomer: () -> Unit, onCreated: (Int) -> Unit) {
    val lines by CartStore.lines.collectAsState()
    val customer by CartStore.customer.collectAsState()
    val orderType by CartStore.orderType.collectAsState()
    val pickup by CartStore.pickupDate.collectAsState()
    val ret by CartStore.returnDate.collectAsState()
    val notes by CartStore.notes.collectAsState()
    val discount by CartStore.discount.collectAsState()
    val discountType by CartStore.discountType.collectAsState()
    val deposit by CartStore.depositAmount.collectAsState()
    val security by CartStore.securityDeposit.collectAsState()
    val collateral by CartStore.collateralDetails.collectAsState()
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var pickupText by remember(pickup) { mutableStateOf(pickup.toString()) }
    var returnText by remember(ret) { mutableStateOf(ret.toString()) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.cart)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    IconButton(onClick = { CartStore.clear() }) { Text("Clear") }
                },
            )
        }
    ) { padding ->
        Column(
            Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("$orderType · Subtotal ${formatMoney(CartStore.subtotal)}")
            Text("Discount ${formatMoney(CartStore.discountAmount)} · Total ${formatMoney(CartStore.totalAmount)}")
            Text(
                customer?.displayName ?: stringResource(R.string.no_customer),
                modifier = Modifier.clickable(onClick = onPickCustomer),
            )
            Button(onClick = onPickCustomer) { Text(stringResource(R.string.pick_customer)) }

            if (orderType == "RENT") {
                OutlinedTextField(
                    value = pickupText,
                    onValueChange = {
                        pickupText = it
                        runCatching { LocalDate.parse(it) }.getOrNull()?.let(CartStore::setPickup)
                    },
                    label = { Text(stringResource(R.string.pickup_date)) },
                    modifier = Modifier.fillMaxWidth(),
                    supportingText = { Text("YYYY-MM-DD") },
                )
                OutlinedTextField(
                    value = returnText,
                    onValueChange = {
                        returnText = it
                        runCatching { LocalDate.parse(it) }.getOrNull()?.let(CartStore::setReturn)
                    },
                    label = { Text(stringResource(R.string.return_date)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("Rental days: ${CartStore.rentalDaysInclusive()}")
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = discountType == CartStore.DiscountType.AMOUNT,
                    onClick = { CartStore.setDiscountType(CartStore.DiscountType.AMOUNT) },
                    label = { Text("Disc amount") },
                )
                FilterChip(
                    selected = discountType == CartStore.DiscountType.PERCENT,
                    onClick = { CartStore.setDiscountType(CartStore.DiscountType.PERCENT) },
                    label = { Text("Disc %") },
                )
            }
            OutlinedTextField(
                value = if (discount == 0.0) "" else discount.toString(),
                onValueChange = { CartStore.setDiscount(it.toDoubleOrNull() ?: 0.0) },
                label = { Text(stringResource(R.string.discount)) },
                modifier = Modifier.fillMaxWidth(),
            )
            if (orderType == "RENT") {
                OutlinedTextField(
                    value = if (deposit == 0.0) "" else deposit.toString(),
                    onValueChange = { CartStore.setDeposit(it.toDoubleOrNull() ?: 0.0) },
                    label = { Text(stringResource(R.string.deposit)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = if (security == 0.0) "" else security.toString(),
                    onValueChange = { CartStore.setSecurityDeposit(it.toDoubleOrNull() ?: 0.0) },
                    label = { Text(stringResource(R.string.security_deposit)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = collateral,
                    onValueChange = CartStore::setCollateral,
                    label = { Text(stringResource(R.string.collateral)) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            OutlinedTextField(
                value = notes,
                onValueChange = CartStore::setNotes,
                label = { Text(stringResource(R.string.notes)) },
                modifier = Modifier.fillMaxWidth(),
            )

            lines.forEach { line ->
                Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                    Text(line.product.name)
                    Text("Qty ${line.quantity} · ${formatMoney(line.unitPrice)}")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { CartStore.updateQuantity(line.product.id, line.quantity - 1) }) { Text("-") }
                        Button(onClick = { CartStore.updateQuantity(line.product.id, line.quantity + 1) }) { Text("+") }
                    }
                }
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    if (lines.isEmpty()) { error = "Cart is empty"; return@Button }
                    if (customer == null) { error = "Customer required"; return@Button }
                    loading = true
                    error = null
                    scope.launch {
                        val days = CartStore.rentalDaysInclusive()
                        val result = withContext(Dispatchers.IO) {
                            ApiClient.get().createOrder(
                                orderType = orderType,
                                customerId = customer?.id,
                                lines = lines.map { Triple(it.product.id, it.quantity, it.unitPrice) },
                                totalAmount = CartStore.totalAmount,
                                depositAmount = deposit,
                                notes = listOfNotNull(
                                    notes.takeIf { it.isNotBlank() },
                                    collateral.takeIf { it.isNotBlank() }?.let { "Collateral: $it" },
                                ).joinToString("\n").ifBlank { null },
                                rentalDays = days,
                                pickupPlanAt = if (orderType == "RENT") CartStore.isoPickup() else null,
                                returnPlanAt = if (orderType == "RENT") CartStore.isoReturn() else null,
                                securityDeposit = security.takeIf { it > 0 },
                                discountType = when (discountType) {
                                    CartStore.DiscountType.AMOUNT -> "amount"
                                    CartStore.DiscountType.PERCENT -> "percentage"
                                },
                                discountValue = discount.takeIf { it > 0 },
                                discountAmount = CartStore.discountAmount.takeIf { it > 0 },
                                depositsByProduct = lines.associate { it.product.id to it.product.deposit },
                            )
                        }
                        loading = false
                        result.onSuccess {
                            CartStore.clear()
                            onCreated(it.id)
                        }.onFailure { error = it.message }
                    }
                },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (loading) stringResource(R.string.loading) else stringResource(R.string.create_order))
            }
        }
    }
}
