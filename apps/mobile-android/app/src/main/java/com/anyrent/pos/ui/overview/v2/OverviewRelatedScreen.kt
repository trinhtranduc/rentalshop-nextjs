package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CurrentOutlet
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.overview.CollateralSections
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.IncomeRow
import com.anyrent.pos.domain.overview.OverviewRelated
import com.anyrent.pos.domain.overview.OverviewRelatedKind
import com.anyrent.pos.domain.overview.RelatedNote
import com.anyrent.pos.domain.overview.RelatedRow
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.theme.DS
import com.anyrent.pos.ui.home.v2.V2Colors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val PAGE_SIZE = 200
private const val MAX_PAGES = 50

/** Every page of every bucket of [kind]: the total must equal the figure, so nothing is left unloaded */
private fun loadRelated(kind: OverviewRelatedKind, startDate: String, endDate: String): Result<RelatedLoad> = runCatching {
    val api = ApiClient.get()
    // #938: Thế chân first lists the orders holding collateral now (the "đang giữ N đơn" chip)
    var heldCount: Int? = null
    val held = if (kind != OverviewRelatedKind.COLLATERAL) emptyList() else {
        val json = api.authedGet(OverviewLogic.outletOperationsPath(CurrentOutlet.merchantFilterId) + "&collateralHeld=1")
        val data = json.optJSONObject("data") ?: org.json.JSONObject()
        heldCount = OverviewRelated.heldCount(data)
        OverviewRelated.heldRows(data)
    }
    RelatedLoad(held + kind.buckets.flatMap { bucket ->
        val items = mutableListOf<IncomeRow>()
        for (page in 0 until MAX_PAGES) {
            val (rows, hasMore) = api.incomeRows(startDate, endDate, bucket, offset = page * PAGE_SIZE, limit = PAGE_SIZE, outletId = CurrentOutlet.merchantFilterId).getOrThrow()
            items += rows
            if (!hasMore || rows.isEmpty()) break
        }
        OverviewRelated.rows(kind, items)
    }, heldCount)
}

/** The rows, and (Thế chân) how many orders the API says are held: its list is cut at 500 */
data class RelatedLoad(val rows: List<RelatedRow>, val heldCount: Int? = null)

data class RelatedState(val rows: List<RelatedRow>? = null, val heldCount: Int? = null, val error: String? = null)

/** Kept across a trip to an order detail, so the list does not reload on back */
class OverviewRelatedViewModel(private val loader: suspend () -> Result<RelatedLoad>) : ViewModel() {
    private val _state = MutableStateFlow(RelatedState())
    val state: StateFlow<RelatedState> = _state.asStateFlow()

    fun load() {
        if (_state.value.rows != null) return
        viewModelScope.launch {
            loader()
                .onSuccess { _state.value = RelatedState(rows = it.rows, heldCount = it.heldCount) }
                .onFailure { _state.value = RelatedState(error = it.message.orEmpty()) }
        }
    }

    class Factory(private val loader: suspend () -> Result<RelatedLoad>) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = OverviewRelatedViewModel(loader) as T
    }
}

private fun titleOf(kind: OverviewRelatedKind): Int = when (kind) {
    OverviewRelatedKind.ORDER_VALUE -> R.string.overview_dash_kpi_order_value
    OverviewRelatedKind.COLLECTED -> R.string.overview_dash_kpi_collected
    OverviewRelatedKind.OUTSTANDING -> R.string.overview_dash_kpi_outstanding
    OverviewRelatedKind.COLLATERAL -> R.string.overview_dash_kpi_collateral
}

/**
 * #722 "Xem các đơn liên quan" (iOS `OverviewRelatedOrdersViewController`): one row per order and day with the money
 * it adds to the figure, and "Tổng các dòng · n: total" at the bottom, which equals the figure. A tap opens the order.
 */
@Composable
fun OverviewRelatedScreen(
    kind: OverviewRelatedKind,
    startDate: String,
    endDate: String,
    onOpenOrder: (Int) -> Unit,
    onBack: () -> Unit,
) {
    val viewModel: OverviewRelatedViewModel = viewModel(
        factory = remember(kind, startDate, endDate) {
            OverviewRelatedViewModel.Factory { withContext(Dispatchers.IO) { loadRelated(kind, startDate, endDate) } }
        },
    )
    val state by viewModel.state.collectAsState()
    LaunchedEffect(Unit) { viewModel.load() }
    val rows = state.rows
    val signed = kind == OverviewRelatedKind.COLLECTED || kind == OverviewRelatedKind.COLLATERAL

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 10.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Column(Modifier.weight(1f)) {
                Text(
                    stringResource(titleOf(kind)), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.semantics { heading() },
                )
                Text(
                    if (startDate == endDate) startDate else "$startDate → $endDate",
                    fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                )
            }
        }
        HorizontalDivider(color = DS.Colors.Border)
        when {
            rows == null && state.error == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
            }
            rows == null -> Message(state.error.orEmpty().ifBlank { stringResource(R.string.calendar_v2_error) })
            rows.isEmpty() -> Message(stringResource(R.string.overview_v2_related_empty))
            kind == OverviewRelatedKind.COLLATERAL -> {
                // #1273: two sections with their own totals, in the list (no sticky total)
                val sections = OverviewRelated.sections(rows, state.heldCount, rows)
                val today = OverviewRelated.flowIsToday(startDate, endDate, ShopTime.today().toString())
                CollateralTwoParts(sections, today, startDate, endDate, onOpenOrder, Modifier.weight(1f).fillMaxWidth())
            }
            else -> {
                LazyColumn(Modifier.weight(1f).fillMaxWidth()) {
                    itemsIndexed(rows, key = { index, row -> "$index-${row.id}" }) { _, row ->
                        RelatedRowItem(row, signed, onClick = { onOpenOrder(row.id) })
                        HorizontalDivider(color = DS.Colors.Border)
                    }
                }
                val total = formatAmount(OverviewRelated.total(rows), signed)
                val totalText = "${stringResource(R.string.overview_v2_related_total)} · ${OverviewRelated.count(rows)}: $total"
                Text(
                    totalText,
                    fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.fillMaxWidth().background(V2Colors.Section).navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 14.dp)
                        .testTag("related.total").semantics { contentDescription = totalText },
                )
            }
        }
    }
}

private val NoteFill = Color(0xFFFFFBEB)
private val SectionFill = Color(0xFFEFF6FF)

/** #1273: "Đang giữ thế chân" (a state) and "Phát sinh hôm nay" (+ received, − returned), each with its totals (iOS: the same list) */
@Composable
private fun CollateralTwoParts(
    s: CollateralSections,
    today: Boolean,
    startDate: String,
    endDate: String,
    onOpenOrder: (Int) -> Unit,
    modifier: Modifier,
) {
    val day = if (startDate == endDate) OverviewRelated.dayMonth(startDate)
    else "${OverviewRelated.dayMonth(startDate)} – ${OverviewRelated.dayMonth(endDate)}"
    val heldMoney = if (s.heldTotalKnown) formatMoneyVnd(s.heldTotal) else "—"
    LazyColumn(modifier) {
        item(key = "note") {
            Text(
                stringResource(if (today) R.string.overview_v2_related_collateral_note else R.string.overview_v2_related_collateral_note_period),
                fontSize = DS.TextSize.Secondary, color = DS.Colors.Text,
                modifier = Modifier.fillMaxWidth().background(NoteFill).padding(horizontal = 16.dp, vertical = 12.dp).testTag("related.note"),
            )
        }
        item(key = "held-head") {
            SectionHeader(stringResource(R.string.overview_v2_related_collateral_held_title), stringResource(R.string.overview_v2_related_collateral_held_hint))
        }
        itemsIndexed(s.held, key = { index, row -> "held-$index-${row.id}" }) { _, row ->
            RelatedRowItem(row, signed = false, onClick = { onOpenOrder(row.id) })
            HorizontalDivider(color = DS.Colors.Border)
        }
        item(key = "held-total") {
            TotalLine(stringResource(R.string.overview_v2_related_collateral_held_total, heldMoney, s.heldOrders), "related.held.total")
        }
        item(key = "flow-head") {
            SectionHeader(
                if (today) stringResource(R.string.overview_v2_related_collateral_flow_title, day)
                else stringResource(R.string.overview_v2_related_collateral_flow_title_period, day),
                stringResource(if (today) R.string.overview_v2_related_collateral_flow_hint else R.string.overview_v2_related_collateral_flow_hint_period),
            )
        }
        itemsIndexed(s.received + s.returned, key = { index, row -> "flow-$index-${row.id}" }) { _, row ->
            RelatedRowItem(row, signed = true, onClick = { onOpenOrder(row.id) })
            HorizontalDivider(color = DS.Colors.Border)
        }
        item(key = "flow-in") {
            TotalLine(stringResource(R.string.overview_v2_related_collateral_flow_in, formatAmount(s.receivedTotal, true), s.receivedOrders), "related.flow.in")
        }
        item(key = "flow-out") {
            TotalLine(stringResource(R.string.overview_v2_related_collateral_flow_out, formatAmount(-s.returnedTotal, true), s.returnedOrders), "related.flow.out")
        }
        item(key = "flow-net") {
            // keeps the old test tag: it is the number of the tile (received − returned)
            TotalLine(
                stringResource(
                    if (today) R.string.overview_v2_related_collateral_flow_net else R.string.overview_v2_related_collateral_flow_net_period,
                    formatAmount(s.net, true),
                ),
                "related.total", Modifier.navigationBarsPadding(),
            )
        }
    }
}

@Composable
private fun SectionHeader(title: String, hint: String) {
    Column(Modifier.fillMaxWidth().background(SectionFill).padding(horizontal = 16.dp, vertical = 10.dp)) {
        Text(title, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.semantics { heading() })
        Text(hint, fontSize = DS.TextSize.Pill, color = DS.Colors.TextMuted)
    }
}

@Composable
private fun TotalLine(text: String, tag: String, modifier: Modifier = Modifier) {
    Text(
        text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
        modifier = Modifier.fillMaxWidth().background(V2Colors.Section).then(modifier)
            .padding(horizontal = 16.dp, vertical = 12.dp).testTag(tag).semantics { contentDescription = text },
    )
}

private fun formatAmount(amount: Double, signed: Boolean): String = when {
    amount < 0 -> "−" + formatMoneyVnd(-amount)
    signed && amount > 0 -> "+" + formatMoneyVnd(amount)
    else -> formatMoneyVnd(amount)
}

@Composable
private fun RelatedRowItem(row: RelatedRow, signed: Boolean, onClick: () -> Unit) {
    val detail = when (row.note) {
        RelatedNote.CREATED -> stringResource(R.string.overview_v2_related_created)
        RelatedNote.CANCELLED -> stringResource(R.string.overview_v2_related_cancelled)
        RelatedNote.OWES -> stringResource(R.string.overview_v2_related_owes)
        RelatedNote.COLLATERAL_IN -> stringResource(R.string.overview_v2_related_collateral_in)
        RelatedNote.COLLATERAL_OUT -> stringResource(R.string.overview_v2_related_collateral_out)
        RelatedNote.HELD -> stringResource(R.string.overview_v2_related_collateral_held)
        RelatedNote.EVENT ->
            if (row.reasons.isEmpty()) row.description
            else row.reasons.map { part -> part.reason?.let { stringResource(it.res) } ?: part.text }.joinToString(" + ")
    }
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).heightIn(min = 56.dp).padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                listOf(row.orderNumber, row.customer).filter { it.isNotBlank() }.joinToString(" · "),
                fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, maxLines = 1,
            )
            if (detail.isNotBlank()) Text(detail, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 2)
        }
        Text(
            // #938: a held row is what is held now, not money moved in the period: no sign
            formatAmount(row.amount, signed && row.note != RelatedNote.HELD), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold,
            color = if (row.amount < 0) V2Colors.Danger else DS.Colors.Text,
        )
    }
}

@Composable
private fun Message(text: String) {
    Text(text, color = DS.Colors.TextMuted, fontSize = DS.TextSize.Body, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(40.dp))
}
