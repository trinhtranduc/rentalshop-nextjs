package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.money.ShopMoney
import com.anyrent.pos.domain.products.BlockPricing
import com.anyrent.pos.domain.products.BlockTable
import com.anyrent.pos.domain.products.BlockText
import com.anyrent.pos.domain.products.MoneyInput
import com.anyrent.pos.domain.products.PricingMode
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.AppPrimaryButton
import com.anyrent.pos.ui.theme.DS

/** What the price screen holds when "Lưu bảng giá" is tapped (iOS `BlockPriceDraft`); a null [table] = no day-block table */
data class BlockPriceDraft(
    val perRental: Double?,
    val perDay: Double?,
    val defaultMode: PricingMode,
    val table: BlockTable?,
)

/**
 * #1189 (iOS `BlockPriceViewController`): the product's price screen. Radio rows choose how a new order is priced
 * (Thuê theo lần / Thuê theo ngày / Giá theo khối ngày), then the day table, what happens past the last day, a
 * preview and "Lưu bảng giá" / "Tắt giá theo khối ngày". It only edits the form's draft; the form saves the product.
 */
@Composable
fun BlockPriceScreen(
    productName: String,
    draft: BlockPriceDraft,
    onSave: (BlockPriceDraft) -> Unit,
    onClose: () -> Unit,
) {
    val res = LocalContext.current.resources
    val hadTable = draft.table != null
    var mode by remember { mutableStateOf(draft.defaultMode) }
    var rentalText by remember { mutableStateOf(MoneyInput.display(draft.perRental)) }
    var dayText by remember { mutableStateOf(MoneyInput.display(draft.perDay)) }
    val startDay = draft.table?.startDay ?: 1
    val tierTexts = remember { mutableStateListOf<String>().apply { addAll(draft.table?.tiers?.map { MoneyInput.display(it) } ?: listOf("")) } }
    var extraMode by remember { mutableStateOf(draft.table?.extraMode ?: BlockTable.EXTRA_PER_DAY) }
    var extraText by remember { mutableStateOf(MoneyInput.display(draft.table?.extraPrice)) }
    var previewDays by remember { mutableIntStateOf(5) }
    var error by remember { mutableStateOf<String?>(null) }
    val invalidText = stringResource(R.string.block_error_invalid)
    val emptyText = stringResource(R.string.block_error_empty)

    val input = BlockPricing.parse(tierTexts.toList(), startDay, extraMode, extraText)

    fun turnOff() {
        val rental = MoneyInput.parse(rentalText)
        val day = MoneyInput.parse(dayText)
        var fallback = mode
        if (fallback == PricingMode.BLOCK) fallback = if (rental == null && day != null) PricingMode.PER_DAY else PricingMode.PER_RENTAL
        onSave(BlockPriceDraft(rental, day, fallback, null))
    }

    fun save() {
        val rental = MoneyInput.parse(rentalText)
        val day = MoneyInput.parse(dayText)
        val table = when (input) {
            is BlockPricing.Input.Table -> input.table
            BlockPricing.Input.Empty -> null
            BlockPricing.Input.Invalid -> { error = invalidText; return }
        }
        var chosen = mode
        if (chosen == PricingMode.BLOCK && table == null) { error = emptyText; return }
        if (chosen == PricingMode.PER_DAY && day == null) chosen = PricingMode.PER_RENTAL
        onSave(BlockPriceDraft(rental, day, chosen, table))
    }

    Column(Modifier.fillMaxSize().background(Color.White).statusBarsPadding().imePadding()) {
        Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onClose) {
                Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.close), modifier = Modifier.size(DS.Icon.Lg))
            }
            Text(
                stringResource(R.string.block_screen_title, productName),
                fontSize = 20.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f).padding(end = 16.dp),
            )
        }
        HorizontalDivider(color = DS.Colors.Border)
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            // Default pricing: radio rows, never a switch or a segmented control
            SectionBand(stringResource(R.string.block_section_default))
            RadioRow(PricingMode.PER_RENTAL.name, stringResource(R.string.v2_form_per_rental), mode == PricingMode.PER_RENTAL, { mode = PricingMode.PER_RENTAL }) {
                MoneyBox(rentalText, "block.rental", Modifier.width(140.dp)) { rentalText = it }
            }
            HorizontalDivider(color = DS.Colors.Divider)
            RadioRow(PricingMode.PER_DAY.name, stringResource(R.string.v2_form_per_day), mode == PricingMode.PER_DAY, { mode = PricingMode.PER_DAY }) {
                MoneyBox(dayText, "block.day", Modifier.width(140.dp)) { dayText = it }
            }
            HorizontalDivider(color = DS.Colors.Divider)
            RadioRow(PricingMode.BLOCK.name, stringResource(R.string.block_title), mode == PricingMode.BLOCK, { mode = PricingMode.BLOCK }) {
                val table = (input as? BlockPricing.Input.Table)?.table
                Text(
                    if (table != null) stringResource(R.string.block_row_tiers, table.tiers.size) else stringResource(R.string.block_row_off),
                    fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted,
                )
            }
            HorizontalDivider(color = DS.Colors.Divider)
            Text(
                stringResource(R.string.block_hint_default),
                fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                modifier = Modifier.padding(horizontal = 16.dp).padding(top = 10.dp, bottom = 12.dp),
            )

            // The day table
            SectionBand(stringResource(R.string.block_section_tiers))
            tierTexts.forEachIndexed { index, text ->
                val day = startDay + index
                Row(
                    Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 5.dp, bottom = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        pluralStringResource(R.plurals.v2_cart_days, day, day),
                        fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = Color(0xFF334155),
                        modifier = Modifier.width(64.dp),
                    )
                    MoneyBox(text, "block.tier.${index + 1}", Modifier.weight(1f)) { tierTexts[index] = it }
                    if (tierTexts.size > 1) {
                        IconButton(onClick = { tierTexts.removeAt(index) }, modifier = Modifier.size(44.dp)) {
                            Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.block_remove_day), tint = Color(0xFF64748B), modifier = Modifier.size(18.dp))
                        }
                    } else {
                        Spacer(Modifier.size(44.dp))
                    }
                }
            }
            if (tierTexts.size < BlockPricing.MAX_TIERS) {
                TextButton(onClick = { tierTexts.add("") }, modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 8.dp).heightIn(min = 44.dp)) {
                    Text(stringResource(R.string.block_add_day, startDay + tierTexts.size), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = DS.Colors.Primary)
                }
            }

            // Past the last day
            SectionBand(stringResource(R.string.block_section_beyond, tierTexts.size))
            RadioRow(BlockTable.EXTRA_PER_DAY, stringResource(R.string.block_extra_per_day), extraMode == BlockTable.EXTRA_PER_DAY, { extraMode = BlockTable.EXTRA_PER_DAY }) {
                MoneyBox(extraText, "block.extra", Modifier.width(140.dp)) { extraText = it }
            }
            HorizontalDivider(color = DS.Colors.Divider)
            val lastTyped = tierTexts.lastOrNull()?.let { MoneyInput.parse(it) }
            val holdTitle = lastTyped?.let { stringResource(R.string.block_hold_last_price, ShopMoney.withUnit(it)) } ?: stringResource(R.string.block_hold_last)
            RadioRow(BlockTable.HOLD_LAST, holdTitle, extraMode == BlockTable.HOLD_LAST, { extraMode = BlockTable.HOLD_LAST }) {}
            HorizontalDivider(color = DS.Colors.Divider)

            // Preview: the price of N days from the boxes as they are now
            Column(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 12.dp, bottom = 4.dp)
                    .clip(RoundedCornerShape(12.dp)).background(Color(0xFFEFF6FF)).padding(horizontal = 14.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                val detail = (input as? BlockPricing.Input.Table)?.let { BlockPricing.detail(it.table, previewDays, BlockPricing.minorUnit(ShopMoney.current.code)) }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(stringResource(R.string.block_preview), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold)
                    V2Stepper(value = previewDays, onChange = { previewDays = it.coerceAtLeast(1) }, minimum = 1, compact = true)
                    Text(
                        detail?.let { ShopMoney.withUnit(it.total) } ?: "–",
                        fontSize = 18.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Primary, textAlign = TextAlign.End,
                        modifier = Modifier.weight(1f).semantics { contentDescription = "block.previewTotal" },
                    )
                }
                if (detail != null) {
                    Text(
                        BlockText.summary(res, detail) + (BlockText.formulaOrNull(res, detail)?.let { " · $it" } ?: ""),
                        fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
        }
        HorizontalDivider(color = DS.Colors.Border)
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            AppPrimaryButton(stringResource(R.string.block_save), onClick = ::save, modifier = Modifier.fillMaxWidth().height(52.dp))
            if (hadTable) {
                TextButton(onClick = ::turnOff, modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp)) {
                    Text(stringResource(R.string.block_turn_off), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = V2Colors.Danger)
                }
            }
        }
    }
    error?.let { AppAlertError(message = it, onDismiss = { error = null }) }
}

/** A radio row: a 22 dp dot, the title, then [trailing] (a price box or a note). The whole row picks it. */
@Composable
private fun RadioRow(tag: String, title: String, selected: Boolean, onPick: () -> Unit, trailing: @Composable () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = 58.dp)
            .clickable(role = Role.RadioButton, onClick = onPick)
            .semantics { contentDescription = "block.radio.$tag" }
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            Modifier.size(22.dp).clip(CircleShape).background(Color.White)
                .border(if (selected) 6.dp else 1.5.dp, if (selected) DS.Colors.Primary else Color(0xFF94A3B8), CircleShape),
        )
        Text(
            title, fontSize = DS.TextSize.Input, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = DS.Colors.Text, maxLines = 2, modifier = Modifier.weight(1f),
        )
        trailing()
    }
}

/** A numeric box that keeps "1.250.000" grouping and reports the text (up to 12 digits) */
@Composable
private fun MoneyBox(value: String, tag: String, modifier: Modifier, onChange: (String) -> Unit) {
    Row(
        modifier.height(46.dp).border(1.dp, V2Colors.Border, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
            if (value.isEmpty()) Text("0", fontSize = DS.TextSize.Input, color = Color(0xFF94A3B8))
            BasicTextField(
                value = TextFieldValue(value, selection = TextRange(value.length)),
                onValueChange = { onChange(MoneyInput.display(MoneyInput.parse(it.text.filter { c -> c.isDigit() }.take(12)))) },
                singleLine = true,
                textStyle = TextStyle(fontSize = DS.TextSize.Input, color = DS.Colors.Text, textAlign = TextAlign.End),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = tag },
            )
        }
        Text(ShopMoney.symbol(), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted)
    }
}
