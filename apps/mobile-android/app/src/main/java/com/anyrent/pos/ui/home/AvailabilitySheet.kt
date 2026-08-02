package com.anyrent.pos.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.ui.common.formatDisplayDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvailabilitySheet(
    product: Product,
    onDismiss: () -> Unit,
    onAddAnyway: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var loading by remember { mutableStateOf(true) }
    var conflicts by remember { mutableStateOf<List<ApiParity.AvailabilityConflict>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val pickupDate by CartStore.pickupDate.collectAsState()
    val returnDate by CartStore.returnDate.collectAsState()
    val start = pickupDate.toString()
    val end = returnDate.toString()

    LaunchedEffect(product.id, start, end) {
        loading = true
        val result = withContext(Dispatchers.IO) {
            ApiParity.productAvailabilityParsed(product.id, start, end)
        }
        loading = false
        result.onSuccess { conflicts = it }.onFailure { error = it.message }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(product.name, style = MaterialTheme.typography.titleLarge)
            Text("${stringResource(R.string.pickup_date)}: ${formatDisplayDate(pickupDate)}")
            Text("${stringResource(R.string.return_date)}: ${formatDisplayDate(returnDate)}")
            when {
                loading -> Text(stringResource(R.string.loading))
                error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
                conflicts.isEmpty() -> Text(stringResource(R.string.available), color = MaterialTheme.colorScheme.primary)
                else -> {
                    Text(stringResource(R.string.availability_conflicts), color = MaterialTheme.colorScheme.error)
                    conflicts.forEach { c ->
                        Text("• ${c.orderNumber ?: c.orderId}: ${c.from} → ${c.to} ${c.message}")
                    }
                }
            }
            Button(
                onClick = {
                    CartStore.addProduct(product)
                    onAddAnyway()
                    onDismiss()
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text(stringResource(R.string.add_to_cart)) }
            Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.back))
            }
        }
    }
}
