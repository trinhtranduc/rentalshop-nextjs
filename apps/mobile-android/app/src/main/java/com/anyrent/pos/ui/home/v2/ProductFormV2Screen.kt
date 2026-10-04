package com.anyrent.pos.ui.home.v2

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiParity
import com.anyrent.pos.data.PermissionManager
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.BarcodeMatch
import com.anyrent.pos.domain.products.MoneyInput
import com.anyrent.pos.domain.products.PricingMode
import com.anyrent.pos.domain.products.ProductAccess
import com.anyrent.pos.domain.products.ProductFormInput
import com.anyrent.pos.domain.products.ProductFormIssue
import com.anyrent.pos.domain.products.ProductFormValidator
import com.anyrent.pos.domain.products.ProductPricing
import com.anyrent.pos.domain.products.ProductStock
import com.anyrent.pos.domain.products.barcodeText
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppFormSheet
import com.anyrent.pos.ui.common.AppIcons
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.common.copyUriToCacheFile
import com.anyrent.pos.ui.common.fileToProductJpegFile
import com.anyrent.pos.ui.home.BarcodeMode
import com.anyrent.pos.ui.home.CameraBarcodeScreen
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

private sealed class FormPhoto {
    data class Remote(val url: String) : FormPhoto()
    data class Local(val file: File) : FormPhoto()
}

/**
 * Redesigned add / edit product (#373, flag `newProducts`, boards SP-tao, SP-sua): photos (first is the cover),
 * name, category, barcode with scan, prices (not for OUTLET_STAFF), deposit, quantity.
 */
@Composable
fun ProductFormV2Screen(
    initial: Product?,
    onBack: () -> Unit,
    onSaved: (Product) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val showsPrices = ProductAccess.showsPriceFields(PermissionManager.role)
    var name by remember { mutableStateOf(initial?.name.orEmpty()) }
    var barcode by remember { mutableStateOf(initial?.barcodeText.orEmpty()) }
    var barcodeWarning by remember { mutableStateOf<String?>(null) }
    var categoryId by remember { mutableStateOf(initial?.categoryId) }
    var categoryName by remember { mutableStateOf(initial?.categoryName) }
    var perRental by remember { mutableStateOf(MoneyInput.display(initial?.let { ProductPricing.perRental(it) })) }
    var perDay by remember { mutableStateOf(MoneyInput.display(initial?.let { ProductPricing.perDay(it) })) }
    var defaultMode by remember { mutableStateOf(initial?.let { ProductPricing.defaultMode(it) } ?: PricingMode.PER_RENTAL) }
    var sale by remember { mutableStateOf(MoneyInput.display(initial?.let { ProductPricing.sale(it) })) }
    var deposit by remember { mutableStateOf(MoneyInput.display(initial?.deposit?.takeIf { it > 0 })) }
    var merchantOutlets by remember { mutableStateOf<List<Pair<Int, Boolean>>>(emptyList()) }
    val outletId = ProductStock.outletFor(SessionStore.outletId, initial, merchantOutlets)
    val counts = initial?.let { ProductStock.counts(it, outletId) }
    var quantity by remember { mutableIntStateOf(counts?.total ?: 1) }
    val photos = remember {
        mutableStateListOf<FormPhoto>().apply {
            addAll((initial?.images?.ifEmpty { listOfNotNull(initial.imageUrl) } ?: emptyList()).map { FormPhoto.Remote(it) })
        }
    }
    var categories by remember { mutableStateOf<List<ApiParity.Category>>(emptyList()) }
    var showCategories by remember { mutableStateOf(false) }
    var showScan by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val issueText = mapOf(
        "name" to stringResource(R.string.v2_form_error_name),
        "negative" to stringResource(R.string.v2_form_error_negative),
        "daily" to stringResource(R.string.v2_form_error_daily_default),
        "quantity" to stringResource(R.string.v2_form_error_quantity),
        "outlet" to stringResource(R.string.v2_form_error_outlet),
    )
    val belowRented = stringResource(R.string.v2_form_error_below_rented)
    val tooManyPhotos = stringResource(R.string.v2_form_error_photos)
    val barcodeUsed = stringResource(R.string.v2_form_barcode_used)
    val unreadable = stringResource(R.string.v2_form_photo_unreadable)

    LaunchedEffect(Unit) {
        categories = withContext(Dispatchers.IO) { ApiParity.listCategories().getOrDefault(emptyList()) }
        if (SessionStore.outletId == null) {
            merchantOutlets = withContext(Dispatchers.IO) { ProductsV2Api.listOutlets().getOrDefault(emptyList()) }
        }
    }
    LaunchedEffect(counts?.total) { if (initial != null && counts != null) quantity = counts.total }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null || photos.size >= ProductFormValidator.MAX_PHOTOS) return@rememberLauncherForActivityResult
        scope.launch {
            val file = withContext(Dispatchers.IO) { runCatching { context.copyUriToCacheFile(uri, prefix = "product_v2") }.getOrNull() }
            if (file == null) error = unreadable else photos.add(FormPhoto.Local(file))
        }
    }

    fun checkBarcode(code: String) {
        if (code.isBlank() || code == initial?.barcode) return
        scope.launch {
            val page = withContext(Dispatchers.IO) { ProductsV2Api.listProducts(1, 20, code) }
            val match = page.getOrNull()?.let { BarcodeMatch.exact(code, it.items) }
            if (barcode == code && match != null && match.id != initial?.id) barcodeWarning = barcodeUsed.format(match.name)
        }
    }

    fun save() {
        val input = ProductFormInput(
            name = name,
            perRental = MoneyInput.parse(perRental),
            perDay = MoneyInput.parse(perDay),
            defaultMode = defaultMode,
            salePrice = MoneyInput.parse(sale),
            deposit = MoneyInput.parse(deposit),
            quantity = quantity,
            rented = counts?.rented ?: 0,
            photoCount = photos.size,
            showsPrices = showsPrices,
        )
        val issues = ProductFormValidator.validate(input)
        if (issues.isNotEmpty()) {
            error = issues.joinToString("\n") { issue ->
                when (issue) {
                    ProductFormIssue.NameRequired -> issueText.getValue("name")
                    ProductFormIssue.NegativeAmount -> issueText.getValue("negative")
                    ProductFormIssue.PerDayDefaultNeedsPrice -> issueText.getValue("daily")
                    ProductFormIssue.NegativeQuantity -> issueText.getValue("quantity")
                    is ProductFormIssue.QuantityBelowRented -> belowRented.format(issue.rented)
                    is ProductFormIssue.TooManyPhotos -> tooManyPhotos.format(issue.max)
                }
            }
            return
        }
        val target = outletId ?: run {
            error = issueText.getValue("outlet")
            return
        }
        loading = true
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val files = photos.filterIsInstance<FormPhoto.Local>().map { fileToProductJpegFile(it.file, context.cacheDir) }
                    val fields = ProductsV2Api.ProductFields(
                        name = name.trim(),
                        barcode = barcode.trim().ifBlank { null },
                        categoryId = categoryId,
                        prices = if (showsPrices) {
                            ProductsV2Api.Prices(
                                options = ProductPricing.options(input.perRental, input.perDay, input.defaultMode),
                                salePrice = input.salePrice,
                                deposit = input.deposit,
                            )
                        } else null,
                        outletId = target,
                        quantity = quantity,
                    )
                    ProductsV2Api.saveProduct(initial?.id, fields, photos.filterIsInstance<FormPhoto.Remote>().map { it.url }, files).getOrThrow()
                }
            }
            loading = false
            result.onSuccess(onSaved).onFailure { error = it.message }
        }
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.close), modifier = Modifier.size(DS.Icon.Lg)) }
            Text(
                stringResource(if (initial == null) R.string.v2_form_add_title else R.string.v2_form_edit_title),
                fontSize = 20.sp, fontWeight = FontWeight.Bold,
            )
        }
        HorizontalDivider(color = DS.Colors.Border)
        Column(Modifier.weight(1f).imePadding().verticalScroll(rememberScrollState())) {
            // Photos
            LazyRow(
                contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                itemsIndexed(photos) { index, photo ->
                    Box(Modifier.size(84.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, V2Colors.Line, RoundedCornerShape(12.dp))) {
                        AsyncImage(
                            model = when (photo) { is FormPhoto.Remote -> photo.url; is FormPhoto.Local -> photo.file },
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                        if (index == 0) {
                            Text(
                                stringResource(R.string.v2_form_cover), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White,
                                modifier = Modifier.align(Alignment.BottomStart).padding(4.dp)
                                    .clip(RoundedCornerShape(4.dp)).background(DS.Colors.Text.copy(alpha = 0.7f)).padding(horizontal = 4.dp, vertical = 1.dp),
                            )
                        }
                        IconButton(onClick = { photos.removeAt(index) }, modifier = Modifier.align(Alignment.TopEnd).size(44.dp)) {
                            Icon(Icons.Filled.Cancel, contentDescription = stringResource(R.string.v2_form_remove_photo), tint = Color.White)
                        }
                    }
                }
                if (photos.size < ProductFormValidator.MAX_PHOTOS) {
                    item {
                        Column(
                            Modifier.size(84.dp).clip(RoundedCornerShape(12.dp)).background(V2Colors.Section)
                                .border(1.5.dp, Color(0xFF94A3B8), RoundedCornerShape(12.dp))
                                .clickable { picker.launch("image/*") },
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Icon(Icons.Outlined.PhotoCamera, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Lg))
                            Text(stringResource(R.string.v2_form_add_photo), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
                        }
                    }
                }
            }
            Text(
                stringResource(R.string.v2_form_photos_hint, ProductFormValidator.MAX_PHOTOS),
                fontSize = 12.sp, color = DS.Colors.TextMuted, modifier = Modifier.padding(horizontal = 16.dp),
            )

            FormField(stringResource(R.string.v2_form_name), required = true, value = name, onChange = { name = it },
                placeholder = stringResource(R.string.v2_form_name_placeholder))
            Row(
                Modifier.fillMaxWidth().clickable { showCategories = true }.heightIn(min = 52.dp).padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(stringResource(R.string.v2_form_category), fontSize = 15.sp, modifier = Modifier.weight(1f))
                Text(categoryName ?: stringResource(R.string.v2_form_choose), fontSize = 15.sp, color = DS.Colors.TextMuted)
                Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
            }
            HorizontalDivider(color = DS.Colors.Divider)
            FormField(
                stringResource(R.string.v2_form_barcode), value = barcode,
                onChange = { barcode = it; barcodeWarning = null },
                placeholder = stringResource(R.string.v2_form_barcode_placeholder),
                onDone = { checkBarcode(barcode.trim()) },
                trailing = {
                    IconButton(onClick = { showScan = true }) {
                        Icon(AppIcons.Barcode, contentDescription = stringResource(R.string.camera_scan), modifier = Modifier.size(DS.Icon.Md))
                    }
                },
            )
            barcodeWarning?.let { Text(it, fontSize = 13.sp, color = V2Colors.Danger, modifier = Modifier.padding(horizontal = 16.dp)) }

            if (showsPrices) {
                SectionBand(stringResource(R.string.v2_form_prices))
                Row {
                    FormField(stringResource(R.string.v2_form_per_rental), value = perRental, onChange = { perRental = MoneyInput.display(MoneyInput.parse(it)) },
                        placeholder = "0", numeric = true, unit = "đ", modifier = Modifier.weight(1f), end = 6.dp)
                    FormField(stringResource(R.string.v2_form_per_day), value = perDay, onChange = { perDay = MoneyInput.display(MoneyInput.parse(it)) },
                        placeholder = "0", numeric = true, unit = "đ", modifier = Modifier.weight(1f), start = 6.dp)
                }
                Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(stringResource(R.string.v2_form_default_pricing), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    V2Segmented(
                        titles = listOf(stringResource(R.string.v2_price_per_rental), stringResource(R.string.v2_price_per_day)),
                        selected = if (defaultMode == PricingMode.PER_DAY) 1 else 0,
                        onSelect = { defaultMode = if (it == 1) PricingMode.PER_DAY else PricingMode.PER_RENTAL },
                        modifier = Modifier.fillMaxWidth(),
                        fill = true,
                    )
                }
                Row {
                    FormField(stringResource(R.string.v2_form_sale_price), value = sale, onChange = { sale = MoneyInput.display(MoneyInput.parse(it)) },
                        placeholder = stringResource(R.string.v2_form_not_for_sale), numeric = true, unit = "đ", modifier = Modifier.weight(1f), end = 6.dp)
                    FormField(stringResource(R.string.v2_form_deposit), value = deposit, onChange = { deposit = MoneyInput.display(MoneyInput.parse(it)) },
                        placeholder = "0", numeric = true, unit = "đ", modifier = Modifier.weight(1f), start = 6.dp)
                }
            }

            SectionBand(stringResource(R.string.v2_form_stock))
            Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.v2_form_quantity), fontSize = 15.sp)
                    counts?.let { Text(stringResource(R.string.v2_form_stock_note, it.rented, it.free), fontSize = 13.sp, color = DS.Colors.TextMuted) }
                }
                V2Stepper(value = quantity, onChange = { quantity = it }, minimum = 0)
            }
            androidx.compose.foundation.layout.Spacer(Modifier.height(24.dp))
        }
        HorizontalDivider(color = DS.Colors.Border)
        Box(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp)) {
            AppPrimaryButton(
                stringResource(if (initial == null) R.string.v2_form_save else R.string.v2_form_save_changes),
                onClick = ::save, enabled = !loading, loading = loading, modifier = Modifier.fillMaxWidth(),
            )
        }
    }

    if (showCategories) {
        AlertDialog(
            onDismissRequest = { showCategories = false },
            title = { Text(stringResource(R.string.v2_form_category)) },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    (listOf<ApiParity.Category?>(null) + categories).forEach { category ->
                        Text(
                            category?.name ?: stringResource(R.string.v2_form_no_category),
                            fontSize = 16.sp,
                            fontWeight = if (category?.id == categoryId) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.fillMaxWidth().clickable {
                                categoryId = category?.id
                                categoryName = category?.name
                                showCategories = false
                            }.padding(vertical = 12.dp),
                        )
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showCategories = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
    if (showScan) {
        AppFormSheet(onDismiss = { showScan = false }, nested = true) {
            CameraBarcodeScreen(
                mode = BarcodeMode.CODE,
                onBack = { showScan = false },
                onCode = { code ->
                    barcode = code
                    barcodeWarning = null
                    checkBarcode(code)
                },
                embeddedInSheet = true,
            )
        }
    }
    error?.let { message -> AppAlertError(message = message, onDismiss = { error = null }) }
}

@Composable
private fun FormField(
    title: String,
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    required: Boolean = false,
    numeric: Boolean = false,
    unit: String? = null,
    start: androidx.compose.ui.unit.Dp = 16.dp,
    end: androidx.compose.ui.unit.Dp = 16.dp,
    onDone: (() -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    var hadFocus by remember { mutableStateOf(false) }
    Column(modifier.padding(start = start, end = end, top = 8.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            buildAnnotatedString {
                append(title)
                if (required) withStyle(SpanStyle(color = V2Colors.Danger)) { append(" *") }
            },
            fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
        )
        Row(
            Modifier.fillMaxWidth().height(48.dp).border(1.dp, V2Colors.Border, RoundedCornerShape(12.dp)).padding(start = 12.dp, end = if (trailing == null) 12.dp else 0.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f)) {
                if (value.isEmpty()) Text(placeholder, fontSize = 16.sp, color = Color(0xFF94A3B8))
                val fieldModifier = Modifier.fillMaxWidth().semantics { contentDescription = title }
                    .onFocusChanged { focus ->
                        if (focus.isFocused) {
                            hadFocus = true
                        } else if (hadFocus) {
                            hadFocus = false
                            onDone?.invoke()
                        }
                    }
                if (numeric) {
                    // Grouping dots are re-inserted on each key, so the cursor stays at the end
                    BasicTextField(
                        value = TextFieldValue(value, selection = TextRange(value.length)),
                        onValueChange = { onChange(it.text) },
                        singleLine = true,
                        textStyle = TextStyle(fontSize = 16.sp, color = DS.Colors.Text),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = fieldModifier,
                    )
                } else {
                    BasicTextField(
                        value = value,
                        onValueChange = onChange,
                        singleLine = true,
                        textStyle = TextStyle(fontSize = 16.sp, color = DS.Colors.Text),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                        keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { onDone?.invoke() }),
                        modifier = fieldModifier,
                    )
                }
            }
            unit?.let { Text(it, fontSize = 14.sp, color = DS.Colors.TextMuted) }
            trailing?.invoke()
        }
    }
}
