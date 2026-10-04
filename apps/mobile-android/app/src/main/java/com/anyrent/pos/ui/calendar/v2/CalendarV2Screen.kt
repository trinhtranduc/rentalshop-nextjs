package com.anyrent.pos.ui.calendar.v2

import androidx.compose.foundation.ExperimentalFoundationApi
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anyrent.pos.R
import com.anyrent.pos.domain.calendar.CalendarCell
import com.anyrent.pos.domain.calendar.CalendarDayMarks
import com.anyrent.pos.domain.calendar.CalendarDayRow
import com.anyrent.pos.domain.calendar.CalendarLogic
import com.anyrent.pos.domain.calendar.CalendarRowKind
import com.anyrent.pos.ui.common.formatDayShort
import com.anyrent.pos.ui.common.formatMoneyVnd
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS
import java.time.LocalDate
import java.time.ZoneId

private val ReturnRing = Color(0xFF6D28D9)
private val OtherMonth = Color(0xFF94A3B8)

/** Redesigned calendar tab (#374, board Lich), shown when `newCalendar` is on */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun CalendarV2Screen(
    onOpenOrder: (Int) -> Unit,
    viewModel: CalendarV2ViewModel = viewModel(factory = CalendarV2ViewModel.Factory()),
) {
    val state by viewModel.state.collectAsState()
    val todayKey = viewModel.todayKey
    // Again on every show, so a hand-over or return done in the order detail shows up when coming back
    LaunchedEffect(Unit) { viewModel.onShown() }
    val grid = CalendarLogic.monthGrid(state.month, todayKey)

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = viewModel::refresh,
        modifier = Modifier.fillMaxSize().background(DS.Colors.Surface),
    ) {
        LazyColumn(Modifier.fillMaxSize()) {
            item(key = "header") {
                Row(
                    Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 16.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(stringResource(R.string.calendar_v2_title), fontSize = 24.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                    IconButton(onClick = { viewModel.moveMonth(-1) }) {
                        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.calendar_v2_prev_month), tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Md))
                    }
                    Text(
                        stringResource(R.string.calendar_v2_month, state.month.monthValue, state.month.year),
                        fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text,
                        textAlign = TextAlign.Center, modifier = Modifier.widthIn(min = 108.dp),
                    )
                    IconButton(onClick = { viewModel.moveMonth(1) }) {
                        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = stringResource(R.string.calendar_v2_next_month), tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Md))
                    }
                }
            }
            item(key = "grid") {
                Column(Modifier.fillMaxWidth().padding(horizontal = 10.dp)) {
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        stringResource(R.string.calendar_v2_weekdays).split(",").forEach {
                            Text(it, fontSize = 12.sp, color = DS.Colors.TextMuted, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
                        }
                    }
                    grid.chunked(7).forEach { week ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 1.dp)) {
                            week.forEach { cell ->
                                DayCell(
                                    cell = cell,
                                    marks = CalendarLogic.marks(cell.key, state.counts, todayKey),
                                    selected = cell.key == state.selectedKey,
                                    onClick = { viewModel.select(cell.key) },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
                    ) {
                        Legend(MarkKind.HAND_OVER, stringResource(R.string.calendar_v2_legend_hand_over))
                        Legend(MarkKind.RETURN, stringResource(R.string.calendar_v2_legend_return))
                        Legend(MarkKind.LATE, stringResource(R.string.calendar_v2_legend_late))
                    }
                }
                Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
            }
            stickyHeader(key = "day") { DayHeader(state.selectedKey, todayKey, state.counts) }
            when {
                state.dayLoading -> item(key = "loading") {
                    Box(Modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(Modifier.size(28.dp))
                    }
                }
                state.dayError != null -> item(key = "error") {
                    Text(
                        (state.dayError?.takeIf { it.isNotBlank() } ?: stringResource(R.string.calendar_v2_error)) + "\n" + stringResource(R.string.retry),
                        color = DS.Colors.TextMuted, fontSize = 15.sp, textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().clickable { viewModel.retryDay() }.padding(28.dp),
                    )
                }
                state.rows.isEmpty() -> item(key = "empty") {
                    Text(
                        stringResource(R.string.calendar_v2_empty), color = DS.Colors.TextMuted, fontSize = 15.sp,
                        textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(28.dp),
                    )
                }
                else -> items(state.rows, key = { "${it.kind}-${it.order.id}" }) { row ->
                    DayRow(row) { onOpenOrder(row.order.id) }
                    ThinDivider()
                }
            }
            item(key = "bottom") { Spacer(Modifier.height(24.dp)) }
        }
    }
}

private enum class MarkKind { HAND_OVER, RETURN, LATE }

@Composable
private fun Mark(kind: MarkKind) {
    val base = Modifier.size(7.dp)
    when (kind) {
        MarkKind.HAND_OVER -> Box(base.clip(CircleShape).background(DS.Colors.Primary))
        MarkKind.RETURN -> Box(base.border(2.dp, ReturnRing, CircleShape))
        MarkKind.LATE -> Box(base.clip(RoundedCornerShape(2.dp)).background(V2Colors.Danger))
    }
}

@Composable
private fun Legend(kind: MarkKind, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Mark(kind)
        Text(label, fontSize = 12.sp, color = DS.Colors.TextMuted)
    }
}

@Composable
private fun DayCell(cell: CalendarCell, marks: CalendarDayMarks, selected: Boolean, onClick: () -> Unit, modifier: Modifier) {
    val label = formatDayShort(LocalDate.parse(cell.key).atStartOfDay(ZoneId.systemDefault()).plusHours(12).toInstant())
    val (fill, textColor) = when {
        cell.isToday && cell.inMonth -> DS.Colors.Text to Color.White
        selected && cell.inMonth -> DS.Status.HandOver.fill to DS.Status.HandOver.text
        cell.inMonth -> Color.Transparent to DS.Colors.Text
        else -> Color.Transparent to OtherMonth
    }
    Column(
        modifier
            .padding(horizontal = 2.dp)
            .height(46.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(fill)
            .then(
                if (cell.inMonth) Modifier.clickable(onClick = onClick).semantics {
                    role = Role.Button
                    this.selected = selected
                    contentDescription = label
                } else Modifier,
            ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            cell.day.toString(), fontSize = 14.sp, color = textColor,
            fontWeight = if ((cell.isToday || selected) && cell.inMonth) FontWeight.Bold else FontWeight.Normal,
        )
        Spacer(Modifier.height(3.dp))
        Row(Modifier.height(7.dp), horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.CenterVertically) {
            if (cell.inMonth) {
                if (marks.handOver) Mark(MarkKind.HAND_OVER)
                if (marks.returning) Mark(MarkKind.RETURN)
                if (marks.lateReturn) Mark(MarkKind.LATE)
            }
        }
    }
}

@Composable
private fun DayHeader(selectedKey: String, todayKey: String, counts: com.anyrent.pos.domain.calendar.CalendarMonthCounts?) {
    val isToday = selectedKey == todayKey
    val dayLabel = formatDayShort(LocalDate.parse(selectedKey).atStartOfDay(ZoneId.systemDefault()).plusHours(12).toInstant())
    val title = if (isToday) "${stringResource(R.string.calendar_v2_today).uppercase()} · $dayLabel" else dayLabel.uppercase()
    val day = counts?.byDate?.get(selectedKey)
    val late = counts?.lateReturns ?: 0
    val lateText = if (isToday && late > 0) stringResource(R.string.calendar_v2_late_count, late) else null
    val rest = stringResource(R.string.calendar_v2_day_counts, day?.pickups ?: 0, day?.returns ?: 0)
    Column(Modifier.fillMaxWidth().background(V2Colors.Section)) {
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155), modifier = Modifier.weight(1f))
            Text(
                buildAnnotatedString {
                    if (lateText != null) {
                        withStyle(SpanStyle(color = V2Colors.Danger, fontWeight = FontWeight.SemiBold)) { append(lateText) }
                        append(" · ")
                    }
                    append(rest)
                },
                fontSize = 13.sp, color = DS.Colors.TextMuted,
            )
        }
        ThinDivider()
    }
}

@Composable
private fun DayRow(row: CalendarDayRow, onClick: () -> Unit) {
    val pill = if (row.kind == CalendarRowKind.HAND_OVER) DS.Status.HandOver else DS.Status.Return
    val tag = stringResource(if (row.kind == CalendarRowKind.HAND_OVER) R.string.orders_hand_over else R.string.calendar_v2_tag_return)
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).heightIn(min = DS.TouchTarget).padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    tag, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = pill.text,
                    modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(pill.fill).padding(horizontal = 6.dp, vertical = 2.dp),
                )
                Text(
                    row.order.customerName?.takeIf { it.isNotBlank() } ?: row.order.orderNumber,
                    fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                row.order.itemsSummary.ifBlank { row.order.orderNumber }, fontSize = 13.sp, color = Color(0xFF334155),
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(formatMoneyVnd(row.order.totalAmount), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            if (row.lateDays > 0) {
                Text(pluralStringResource(R.plurals.orders_late_days, row.lateDays, row.lateDays), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = V2Colors.Danger)
            }
        }
        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = OtherMonth, modifier = Modifier.size(DS.Icon.Sm))
    }
}
