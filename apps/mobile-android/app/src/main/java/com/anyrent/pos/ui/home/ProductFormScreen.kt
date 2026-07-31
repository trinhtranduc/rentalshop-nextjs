package com.anyrent.pos.ui.home

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.model.Product
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import androidx.compose.ui.Modifier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductFormScreen(
    initial: Product? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val context = LocalContext.current
    var name by remember { mutableStateOf(initial?.name.orEmpty()) }
    var barcode by remember { mutableStateOf(initial?.barcode.orEmpty()) }
    var rentPrice by remember { mutableStateOf(initial?.rentPrice?.toString().orEmpty()) }
    var salePrice by remember { mutableStateOf(initial?.salePrice?.toString().orEmpty()) }
    var deposit by remember { mutableStateOf(initial?.deposit?.toString() ?: "0") }
    var stock by remember { mutableStateOf((initial?.stock ?: 1).toString()) }
    var categories by remember { mutableStateOf<List<ApiParity.Category>>(emptyList()) }
    var categoryId by remember { mutableStateOf(initial?.categoryId) }
    var categoryExpanded by remember { mutableStateOf(false) }
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        imageUri = uri
    }

    LaunchedEffect(Unit) {
        val result = withContext(Dispatchers.IO) { ApiParity.listCategories() }
        result.onSuccess { categories = it }
    }

    fun uriToFile(uri: Uri): File? = runCatching {
        val input = context.contentResolver.openInputStream(uri) ?: return null
        val file = File(context.cacheDir, "product_${System.currentTimeMillis()}.jpg")
        FileOutputStream(file).use { out -> input.copyTo(out) }
        file
    }.getOrNull()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (initial == null) stringResource(R.string.new_product)
                        else stringResource(R.string.edit_product)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text(stringResource(R.string.name)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = barcode, onValueChange = { barcode = it }, label = { Text(stringResource(R.string.barcode)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = rentPrice, onValueChange = { rentPrice = it }, label = { Text(stringResource(R.string.rent_price)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = salePrice, onValueChange = { salePrice = it }, label = { Text(stringResource(R.string.sale_price)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = deposit, onValueChange = { deposit = it }, label = { Text(stringResource(R.string.deposit)) }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = stock, onValueChange = { stock = it }, label = { Text(stringResource(R.string.stock)) }, modifier = Modifier.fillMaxWidth())

            ExposedDropdownMenuBox(expanded = categoryExpanded, onExpandedChange = { categoryExpanded = it }) {
                OutlinedTextField(
                    value = categories.firstOrNull { it.id == categoryId }?.name ?: stringResource(R.string.category),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.category)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                )
                ExposedDropdownMenu(expanded = categoryExpanded, onDismissRequest = { categoryExpanded = false }) {
                    DropdownMenuItem(
                        text = { Text("—") },
                        onClick = { categoryId = null; categoryExpanded = false },
                    )
                    categories.forEach { cat ->
                        DropdownMenuItem(
                            text = { Text(cat.name) },
                            onClick = { categoryId = cat.id; categoryExpanded = false },
                        )
                    }
                }
            }

            Button(onClick = { picker.launch("image/*") }, modifier = Modifier.fillMaxWidth()) {
                Text(if (imageUri == null) stringResource(R.string.pick_image) else stringResource(R.string.image_selected))
            }
            message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }

            Button(
                onClick = {
                    val price = rentPrice.toDoubleOrNull()
                    val qty = stock.toIntOrNull()
                    if (name.isBlank() || price == null || qty == null) {
                        error = "Invalid input"
                        return@Button
                    }
                    loading = true
                    scope.launch {
                        val file = imageUri?.let { uriToFile(it) }
                        val result = withContext(Dispatchers.IO) {
                            if (initial == null) {
                                ApiParity.createProductFull(
                                    name, price, salePrice.toDoubleOrNull(), qty,
                                    barcode.ifBlank { null }, deposit.toDoubleOrNull() ?: 0.0,
                                    categoryId, file,
                                )
                            } else {
                                ApiParity.updateProductFull(
                                    initial.id, name, price, salePrice.toDoubleOrNull(), qty,
                                    barcode.ifBlank { null }, deposit.toDoubleOrNull() ?: 0.0,
                                    categoryId, file,
                                )
                            }
                        }
                        loading = false
                        result.onSuccess { onSaved() }.onFailure { error = it.message }
                    }
                },
                enabled = !loading && PermissionManager.canManageProducts(),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (loading) stringResource(R.string.loading) else stringResource(R.string.save)) }

            if (initial != null && PermissionManager.canManageProducts()) {
                Button(
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) { ApiParity.deleteProduct(initial.id) }
                            onSaved()
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.delete)) }
            }
        }
    }
}
