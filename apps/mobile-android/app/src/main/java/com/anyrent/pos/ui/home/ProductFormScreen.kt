package com.anyrent.pos.ui.home

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.ui.common.AppCard
import com.anyrent.pos.ui.common.AppInputField
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.AppSecondaryButton
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
    // iOS NewProductViewController.generatedBarcode — empty → random 6 digits
    var barcode by remember { mutableStateOf(generatedBarcode(initial?.barcode)) }
    var rentPrice by remember { mutableStateOf(initial?.rentPrice?.toString().orEmpty()) }
    var salePrice by remember { mutableStateOf(initial?.salePrice?.toString().orEmpty()) }
    var deposit by remember { mutableStateOf(initial?.deposit?.toString() ?: "0") }
    var stock by remember { mutableStateOf((initial?.stock ?: 1).toString()) }
    // Category UI hidden — keep existing id on edit so update does not clear it.
    val categoryId = initial?.categoryId
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var moreOptions by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val canManage = PermissionManager.canManageProducts()

    // Prefer newly picked local URI; fall back to existing product image on edit.
    val previewModel: Any? = imageUri ?: initial?.imageUrl?.takeIf { it.isNotBlank() }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) imageUri = uri
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
        containerColor = MaterialTheme.colorScheme.surface,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                // Sheet is not under the status bar — default TopAppBar insets push the title down.
                windowInsets = WindowInsets(0, 0, 0, 0),
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
                colors = androidx.compose.material3.TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        bottomBar = {
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                AppPrimaryButton(
                    text = if (loading) stringResource(R.string.loading)
                    else if (initial == null) stringResource(R.string.add_product)
                    else stringResource(R.string.save),
                    onClick = ::saveProduct,
                    enabled = !loading && canManage,
                )
            }
        },
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .background(MaterialTheme.colorScheme.background)
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
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f),
                            )
                            .clickable { picker.launch("image/*") },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (previewModel != null) {
                            AsyncImage(
                                model = previewModel,
                                contentDescription = stringResource(R.string.product_image),
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop,
                            )
                            // Dim + camera hint so user knows tap still changes the photo.
                            Box(
                                Modifier
                                    .fillMaxSize()
                                    .background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.18f)),
                            )
                            Icon(
                                Icons.Default.CameraAlt,
                                contentDescription = stringResource(R.string.pick_image),
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(10.dp)
                                    .size(28.dp)
                                    .background(
                                        MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
                                        RoundedCornerShape(8.dp),
                                    )
                                    .padding(5.dp),
                                tint = MaterialTheme.colorScheme.primary,
                            )
                        } else {
                            Icon(
                                Icons.Default.CameraAlt,
                                contentDescription = stringResource(R.string.pick_image),
                                modifier = Modifier.size(42.dp),
                                tint = MaterialTheme.colorScheme.outline,
                            )
                        }
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
                AppSecondaryButton(
                    text = stringResource(R.string.delete),
                    onClick = {
                        scope.launch {
                            loading = true
                            val result = withContext(Dispatchers.IO) { ApiParity.deleteProduct(initial.id) }
                            loading = false
                            result.onSuccess { onSaved() }.onFailure { error = it.message }
                        }
                    },
                    enabled = !loading,
                )
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

/** Matches iOS `Utils.randomString(length: 6)` — digits only. */
private fun generatedBarcode(existing: String? = null): String {
    val trimmed = existing?.trim().orEmpty()
    if (trimmed.isNotEmpty()) return trimmed
    return buildString(6) {
        repeat(6) { append(('0'..'9').random()) }
    }
}
