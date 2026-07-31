package com.anyrent.pos.ui.home

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
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
    var showCategorySheet by remember { mutableStateOf(false) }
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val canManage = PermissionManager.canManageProducts()
    val categoryName = categories.firstOrNull { it.id == categoryId }?.name

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        imageUri = uri
    }

    LaunchedEffect(Unit) {
        val result = withContext(Dispatchers.IO) { ApiParity.listCategories() }
        result.onSuccess { categories = it }
            .onFailure { /* category optional — keep form usable */ }
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
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text(stringResource(R.string.name)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = barcode,
                onValueChange = { barcode = it },
                label = { Text(stringResource(R.string.barcode)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = rentPrice,
                onValueChange = { rentPrice = it.filter { ch -> ch.isDigit() || ch == '.' } },
                label = { Text(stringResource(R.string.rent_price)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = salePrice,
                onValueChange = { salePrice = it.filter { ch -> ch.isDigit() || ch == '.' } },
                label = { Text(stringResource(R.string.sale_price)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = deposit,
                onValueChange = { deposit = it.filter { ch -> ch.isDigit() || ch == '.' } },
                label = { Text(stringResource(R.string.deposit)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = stock,
                onValueChange = { stock = it.filter { ch -> ch.isDigit() } },
                label = { Text(stringResource(R.string.stock)) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )

            OutlinedButton(
                onClick = { showCategorySheet = true },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    categoryName?.let { "${stringResource(R.string.category)}: $it" }
                        ?: stringResource(R.string.category)
                )
            }

            Button(
                onClick = { picker.launch("image/*") },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    if (imageUri == null) stringResource(R.string.pick_image)
                    else stringResource(R.string.image_selected)
                )
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (!canManage) {
                Text(
                    "No permission to manage products",
                    color = MaterialTheme.colorScheme.error,
                )
            }

            Button(
                onClick = {
                    val price = rentPrice.toDoubleOrNull()
                    val qty = stock.toIntOrNull()
                    if (name.isBlank() || price == null || qty == null) {
                        error = "Invalid input"
                        return@Button
                    }
                    loading = true
                    error = null
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
                enabled = !loading && canManage,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (loading) stringResource(R.string.loading) else stringResource(R.string.save))
            }

            if (initial != null && canManage) {
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            val result = withContext(Dispatchers.IO) { ApiParity.deleteProduct(initial.id) }
                            loading = false
                            result.onSuccess { onSaved() }.onFailure { error = it.message }
                        }
                    },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text(stringResource(R.string.delete)) }
            }
        }
    }

    if (showCategorySheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showCategorySheet = false },
            sheetState = sheetState,
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(stringResource(R.string.category), style = MaterialTheme.typography.titleMedium)
                TextButton(
                    onClick = {
                        categoryId = null
                        showCategorySheet = false
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("—") }
                if (categories.isEmpty()) {
                    Text(
                        stringResource(R.string.loading),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    categories.forEach { cat ->
                        TextButton(
                            onClick = {
                                categoryId = cat.id
                                showCategorySheet = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(cat.name) }
                    }
                }
            }
        }
    }
}
