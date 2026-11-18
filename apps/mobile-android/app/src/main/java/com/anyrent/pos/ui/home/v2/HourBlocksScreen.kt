package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
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
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.products.HourBlock
import com.anyrent.pos.domain.products.HourBlockText
import com.anyrent.pos.domain.products.HourBlocks
import com.anyrent.pos.domain.products.MoneyInput
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.theme.DS

/**
 * #1621 (mockup "Màn mới Giá theo khối giờ", iOS `HourBlocksViewController`): the setup screen of "Theo khối giờ". One
 * row per block (hours 1–24 and the price of the whole block), "+ Thêm khối", "Lưu bảng giá" and "Tắt giá theo khối
 * giờ". No preview: the block chosen in the cart is its price. It only edits the form's draft; the form saves the
 * product. Closing without "Lưu bảng giá" changes nothing.
 */
@Composable
fun HourBlocksScreen(
    initial: List<HourBlock>,
    onSave: (List<HourBlock>) -> Unit,
    onTurnOff: () -> Unit,
    onClose: () -> Unit,
) {
    val rows = remember {
        mutableStateListOf<Pair<String, String>>().apply {
            if (initial.isEmpty()) add("" to "") else initial.forEach { add(it.hours.toString() to MoneyInput.display(it.price)) }
        }
    }
    var error by remember { mutableStateOf<String?>(null) }
    val res = LocalContext.current.resources

    fun save() {
        when (val input = HourBlocks.parse(rows.toList())) {
            is HourBlocks.Input.Invalid -> error = HourBlockText.issue(res, input.issue)
            HourBlocks.Input.Empty -> onSave(emptyList())
            is HourBlocks.Input.Blocks -> onSave(input.blocks)
        }
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.close), modifier = Modifier.size(DS.Icon.Lg))
            }
            Text(stringResource(R.string.hour_block_title), fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        }
        HorizontalDivider(color = DS.Colors.Border)
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            Text(
                stringResource(R.string.hour_block_intro), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                modifier = Modifier.padding(horizontal = 16.dp).padding(top = 10.dp, bottom = 4.dp),
            )
            SectionBand(stringResource(R.string.hour_block_section))
            rows.forEachIndexed { index, (hours, price) ->
                val number = index + 1
                Row(
                    Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 5.dp, bottom = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    HoursBox(hours, "hour.hours.$number", Modifier.width(96.dp)) { rows[index] = it to rows[index].second }
                    MoneyBox(price, "hour.price.$number", Modifier.weight(1f)) { rows[index] = rows[index].first to it }
                    if (rows.size > 1) {
                        IconButton(onClick = { rows.removeAt(index) }, modifier = Modifier.size(44.dp)) {
                            Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.hour_block_remove, number),
                                tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
                        }
                    } else {
                        Spacer(Modifier.size(44.dp))
                    }
                }
            }
            if (rows.size < HourBlocks.MAX_COUNT) {
                TextButton(
                    onClick = { rows.add("" to "") },
                    modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 8.dp).heightIn(min = 44.dp),
                ) { Text(stringResource(R.string.hour_block_add), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = DS.Colors.Primary) }
            } else {
                Text(
                    stringResource(R.string.hour_block_max, HourBlocks.MAX_COUNT), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
            Spacer(Modifier.height(24.dp))
        }
        HorizontalDivider(color = DS.Colors.Border)
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            AppPrimaryButton(stringResource(R.string.hour_block_save), onClick = ::save, modifier = Modifier.fillMaxWidth().height(52.dp))
            TextButton(onClick = onTurnOff, modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp)) {
                Text(stringResource(R.string.hour_block_turn_off), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = V2Colors.Danger)
            }
        }
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

/** The number of hours: digits only, at most two, then "giờ" */
@Composable
private fun HoursBox(value: String, tag: String, modifier: Modifier, onChange: (String) -> Unit) {
    Row(
        modifier.height(46.dp).border(1.dp, V2Colors.Border, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
            if (value.isEmpty()) Text("0", fontSize = DS.TextSize.Input, color = Color(0xFF94A3B8))
            BasicTextField(
                value = TextFieldValue(value, selection = TextRange(value.length)),
                onValueChange = { onChange(it.text.filter { c -> c.isDigit() }.take(2)) },
                singleLine = true,
                textStyle = TextStyle(fontSize = DS.TextSize.Input, color = DS.Colors.Text, textAlign = TextAlign.End),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = tag },
            )
        }
        Text(stringResource(R.string.hour_block_unit), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
    }
}
