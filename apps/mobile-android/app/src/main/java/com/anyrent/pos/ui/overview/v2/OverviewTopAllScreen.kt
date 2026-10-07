package com.anyrent.pos.ui.overview.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.overview.DayRange
import com.anyrent.pos.domain.overview.OverviewLogic
import com.anyrent.pos.domain.overview.OverviewTopKind
import com.anyrent.pos.domain.overview.OverviewTopRow
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** #633 the period's ranking, up to [OverviewLogic.TOP_ALL_LIMIT] rows, from `GET /api/analytics/period` */
private fun loadTopAll(kind: OverviewTopKind, range: DayRange): List<OverviewTopRow> {
    val json = ApiClient.get().authedGet(OverviewLogic.periodPath(range, OverviewLogic.TOP_ALL_LIMIT))
    val report = OverviewLogic.reportFromJson(json.optJSONObject("data") ?: JSONObject())
    return OverviewLogic.topRows(report, kind, OverviewLogic.TOP_ALL_LIMIT)
}

/**
 * #633 "Xem tất cả" of Top sản phẩm / Top khách hàng: titled like the overview band, the period under it, rows in the
 * API order with rank and the bar against the first row. A row opens what the overview row opens.
 */
@Composable
fun OverviewTopAllScreen(
    kind: OverviewTopKind,
    range: DayRange,
    /** (id, start, end) of the product's / customer's orders in the period */
    onOpenRow: (Int, String, String) -> Unit,
    onBack: () -> Unit,
) {
    var rows by remember { mutableStateOf<List<OverviewTopRow>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }

    LaunchedEffect(attempt) {
        rows = null
        error = null
        try {
            rows = withContext(Dispatchers.IO) { loadTopAll(kind, range) }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.message ?: ""
        }
    }

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 10.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Column(Modifier.weight(1f)) {
                Text(
                    stringResource(topTitle(kind)), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.semantics { heading() },
                )
                Text(longRange(range), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
        }
        HorizontalDivider(color = DS.Colors.Border)
        val loaded = rows
        when {
            loaded == null && error == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 2.dp)
            }
            loaded == null -> Column(
                Modifier.fillMaxWidth().padding(40.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    error.orEmpty().ifBlank { stringResource(R.string.calendar_v2_error) },
                    fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, textAlign = TextAlign.Center,
                )
                TextButton(onClick = { attempt += 1 }) { Text(stringResource(R.string.retry), fontWeight = FontWeight.SemiBold) }
            }
            loaded.isEmpty() -> Text(
                stringResource(R.string.overview_v2_top_empty), fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted,
                textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(40.dp),
            )
            else -> LazyColumn(Modifier.fillMaxSize()) {
                itemsIndexed(loaded, key = { index, row -> "$index-${row.id}" }) { index, row ->
                    OverviewTopRowItem(
                        row, kind, rank = index + 1,
                        onClick = row.id?.let { id -> { onOpenRow(id, range.start.toString(), range.end.toString()) } },
                    )
                }
            }
        }
    }
}
