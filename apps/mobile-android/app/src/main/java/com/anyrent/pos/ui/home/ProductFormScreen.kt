package com.anyrent.pos.ui.home

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppInputField
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
    var moreOptions by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf(false) }
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

    fun saveProduct() {
        submitted = true
        val price = rentPrice.toDoubleOrNull()
        val qty = stock.toIntOrNull()
        if (name.isBlank() || barcode.isBlank() || price == null || qty == null) {
            error = context.getString(R.string.invalid_product_input)
            return
        }
        loading = true
        error = null
        scope.launch {
            val file = imageUri?.let { uriToFile(it) }
            val result = withContext(Dispatchers.IO) {
                if (initial == null) {
                    ApiParity.createProductFull(
                        name, price, salePrice.toDoubleOrNull(), qty,
                        barcode, deposit.toDoubleOrNull() ?: 0.0, categoryId, file,
                    )
                } else {
                    ApiParity.updateProductFull(
                        initial.id, name, price, salePrice.toDoubleOrNull(), qty,
                        barcode, deposit.toDoubleOrNull() ?: 0.0, categoryId, file,
                    )
                }
            }
            loading = false
            result.onSuccess { onSaved() }.onFailure { error = it.message }
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (initial == null) stringResource(R.string.new_product)
                        else stringResource(R.string.edit_product),
                        style = MaterialTheme.typography.titleLarge,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close))
                    }
                },
            )
        },
        bottomBar = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                Button(
                    onClick = ::saveProduct,
                    enabled = !loading && canManage,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Text(
                        if (loading) stringResource(R.string.loading)
                        else if (initial == null) stringResource(R.string.add_product)
                        else stringResource(R.string.save),
                    )
                }
            }
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            AppCard(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
            ) {
                Column(
                    Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        stringResource(R.string.product_image_required),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Box(
                        Modifier
                            .align(Alignment.CenterHorizontally)
                            .size(132.dp)
                            .background(
                                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f),
                                RoundedCornerShape(12.dp),
                            )
                            .clickable { picker.launch("image/*") },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Default.CameraAlt,
                            contentDescription = stringResource(R.string.pick_image),
                            modifier = Modifier.size(42.dp),
                            tint = if (imageUri == null) MaterialTheme.colorScheme.outline
                            else MaterialTheme.colorScheme.primary,
                        )
                    }
                    ProductField(
                        name,
                        { name = it },
                        stringResource(R.string.product_name_required),
                        isError = submitted && name.isBlank(),
                    )
                    ProductField(
                        barcode,
                        { barcode = it },
                        stringResource(R.string.barcode_required),
                        isError = submitted && barcode.isBlank(),
                    )
                    ProductField(
                        stock,
                        { stock = it.filter(Char::isDigit) },
                        stringResource(R.string.quantity_required),
                        KeyboardType.Number,
                        isError = submitted && stock.toIntOrNull() == null,
                    )
                }
            }

            AppCard(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
            ) {
                Column(
                    Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    ProductField(
                        rentPrice,
                        { rentPrice = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        stringResource(R.string.price_per_rental_required),
                        KeyboardType.Decimal,
                        isError = submitted && rentPrice.toDoubleOrNull() == null,
                    )
                    Surface(
                        onClick = { moreOptions = !moreOptions },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                    ) {
                        Row(
                            Modifier.fillMaxSize().padding(horizontal = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                stringResource(R.string.more_options),
                                modifier = Modifier.weight(1f),
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Icon(
                                if (moreOptions) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    if (moreOptions) {
                        ProductField(
                            salePrice,
                            { salePrice = it.filter { ch -> ch.isDigit() || ch == '.' } },
                            stringResource(R.string.sale_price),
                            KeyboardType.Decimal,
                        )
                        ProductField(
                            deposit,
                            { deposit = it.filter { ch -> ch.isDigit() || ch == '.' } },
                            stringResource(R.string.security_deposit),
                            KeyboardType.Decimal,
                        )
                        Surface(
                            onClick = { showCategorySheet = true },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                MaterialTheme.colorScheme.outlineVariant,
                            ),
                        ) {
                            Row(
                                Modifier.fillMaxSize().padding(horizontal = 16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    stringResource(R.string.category),
                                    modifier = Modifier.weight(1f),
                                    style = MaterialTheme.typography.bodyLarge,
                                )
                                Text(
                                    categoryName ?: "—",
                                    color = if (categoryName == null) {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    } else {
                                        MaterialTheme.colorScheme.primary
                                    },
                                )
                                Icon(
                                    Icons.Default.ExpandMore,
                                    contentDescription = null,
                                    modifier = Modifier.padding(start = 6.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }

            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (!canManage) {
                Text(
                    "No permission to manage products",
                    color = MaterialTheme.colorScheme.error,
                )
            }

            if (initial != null && canManage) {
                OutlinedButton(
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

@Composable
private fun ProductField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    isError: Boolean = false,
) {
    AppInputField(
        value = value,
        onValueChange = onValueChange,
        label = label,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        isError = isError,
    )
}
