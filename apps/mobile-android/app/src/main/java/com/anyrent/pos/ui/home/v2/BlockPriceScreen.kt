package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ProductsV2Api
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.domain.products.BlockPricing
import com.anyrent.pos.domain.products.BlockTable
import com.anyrent.pos.domain.products.BlockText
import com.anyrent.pos.domain.products.MoneyInput
import com.anyrent.pos.domain.products.PriceForm
import com.anyrent.pos.domain.products.ProductPricing
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * #1249 (mockup v170, iOS `BlockPriceViewController`): the setup screen of "Giá theo khối ngày". The table of prices by
 * number of days, what happens past the last day, a preview, "Tạo nhanh", "Sao chép từ sản phẩm khác", "Lưu bảng giá" and
 * (when a table exists) "Tắt giá theo khối ngày". No list of price kinds here. It only edits the form's draft; the form
 * saves the product. Closing without "Lưu bảng giá" changes nothing.
 */
@Composable
fun BlockPriceScreen(
    initial: BlockTable?,
    currentProductId: Int?,
    onSave: (BlockTable) -> Unit,
    onTurnOff: () -> Unit,
    onClose: () -> Unit,
) {
    val state = remember { BlockEditorState().apply { load(initial) } }
    var error by remember { mutableStateOf<String?>(null) }
    var showQuick by remember { mutableStateOf(false) }
    var showCopy by remember { mutableStateOf(false) }
    val invalidText = stringResource(R.string.block_error_invalid)
    val emptyText = stringResource(R.string.block_error_empty)

    fun save() {
        when (val input = state.input) {
            is BlockPricing.Input.Table -> onSave(input.table)
            BlockPricing.Input.Empty -> error = emptyText
            BlockPricing.Input.Invalid -> error = invalidText
        }
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.close), modifier = Modifier.size(DS.Icon.Lg))
            }
            Text(stringResource(R.string.block_title), fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        }
        HorizontalDivider(color = DS.Colors.Border)
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Text(
                stringResource(R.string.block_intro), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                modifier = Modifier.padding(horizontal = 16.dp).padding(top = 10.dp, bottom = 4.dp),
            )
            BlockTableEditor(state)
            TextButton(
                onClick = { showQuick = true },
                modifier = Modifier.padding(start = 8.dp, top = 8.dp).heightIn(min = 44.dp).semantics { contentDescription = "block.quick" },
            ) { Text(stringResource(R.string.block_quick), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = DS.Colors.Primary) }
            TextButton(
                onClick = { showCopy = true },
                modifier = Modifier.padding(start = 8.dp).heightIn(min = 44.dp).semantics { contentDescription = "block.copy" },
            ) { Text(stringResource(R.string.block_copy), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = DS.Colors.Primary) }
            Spacer(Modifier.height(24.dp))
        }
        HorizontalDivider(color = DS.Colors.Border)
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            AppPrimaryButton(stringResource(R.string.block_save), onClick = ::save, modifier = Modifier.fillMaxWidth().height(52.dp))
            if (initial != null) {
                TextButton(onClick = onTurnOff, modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp)) {
                    Text(stringResource(R.string.block_turn_off), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = V2Colors.Danger)
                }
            }
        }
    }
    if (showQuick) {
        QuickTableDialog(onDismiss = { showQuick = false }, onCreate = { table -> state.load(table); showQuick = false })
    }
    if (showCopy) {
        CopyTableDialog(currentProductId, onDismiss = { showCopy = false }, onPick = { table -> state.load(table); showCopy = false })
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

/** "Tạo nhanh": first-day price, the amount added for each next day, and how many days to list */
@Composable
private fun QuickTableDialog(onDismiss: () -> Unit, onCreate: (BlockTable) -> Unit) {
    var first by remember { mutableStateOf("") }
    var step by remember { mutableStateOf("") }
    var days by remember { mutableStateOf("5") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.block_quick_title), fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(R.string.block_quick_first), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold)
                MoneyBox(first, "block.quick.first", Modifier.fillMaxWidth()) { first = it }
                Text(stringResource(R.string.block_quick_step), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold)
                MoneyBox(step, "block.quick.step", Modifier.fillMaxWidth()) { step = it }
                Text(stringResource(R.string.block_quick_days), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold)
                MoneyBox(days, "block.quick.days", Modifier.width(120.dp)) { days = it }
            }
        },
        confirmButton = {
            TextButton(
                enabled = MoneyInput.parse(first) != null,
                onClick = { onCreate(PriceForm.quickTable(MoneyInput.parse(first) ?: 0.0, MoneyInput.parse(step) ?: 0.0, (MoneyInput.parse(days) ?: 1.0).toInt())) },
                modifier = Modifier.semantics { contentDescription = "block.quick.create" },
            ) { Text(stringResource(R.string.block_quick_create), fontWeight = FontWeight.Bold) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}

/** "Sao chép từ sản phẩm khác": the products that have a table; a tap copies its table and the rule past the last day */
@Composable
private fun CopyTableDialog(currentProductId: Int?, onDismiss: () -> Unit, onPick: (BlockTable) -> Unit) {
    val res = LocalContext.current.resources
    var products by remember { mutableStateOf<List<Product>?>(null) }
    LaunchedEffect(Unit) {
        products = withContext(Dispatchers.IO) {
            ProductsV2Api.listProducts(1, 100, null).getOrNull()?.items.orEmpty()
                .filter { it.id != currentProductId && PriceForm.copyTable(it) != null }
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.block_copy), fontWeight = FontWeight.Bold) },
        text = {
            val list = products
            when {
                list == null -> Text(stringResource(R.string.block_copy_loading), color = DS.Colors.TextMuted)
                list.isEmpty() -> Text(stringResource(R.string.block_copy_none), color = DS.Colors.TextMuted)
                else -> Column(Modifier.heightIn(max = 360.dp).verticalScroll(rememberScrollState())) {
                    list.forEach { p ->
                        val table = ProductPricing.block(p)!!
                        Column(
                            Modifier.fillMaxWidth().clickable { PriceForm.copyTable(p)?.let(onPick) }
                                .semantics { contentDescription = "block.copy.${p.id}" }.padding(vertical = 10.dp),
                        ) {
                            Text(p.name, fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, maxLines = 1)
                            Text(BlockText.rowSummary(res, table), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
                        }
                        HorizontalDivider(color = DS.Colors.Divider)
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}
