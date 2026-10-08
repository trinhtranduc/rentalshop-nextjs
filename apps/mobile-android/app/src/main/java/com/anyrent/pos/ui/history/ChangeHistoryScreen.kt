package com.anyrent.pos.ui.history

import android.content.res.Resources
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.domain.history.ChangeHistory
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant

/** Whose history the screen shows */
enum class ChangeHistoryTarget { ORDER, PRODUCT }

/** The screen's copy from string resources (the defaults of [ChangeHistory.Texts] are the boards' Vietnamese) */
internal fun changeHistoryTexts(res: Resources): ChangeHistory.Texts = ChangeHistory.Texts(
    weekdays = res.getString(R.string.history_weekdays).split(",").map { it.trim() },
    todayHeader = res.getString(R.string.history_today),
    kinds = ChangeHistory.pairs(res.getStringArray(R.array.history_kinds)),
    fields = ChangeHistory.pairs(res.getStringArray(R.array.history_fields)),
    values = ChangeHistory.pairs(res.getStringArray(R.array.history_values)),
    otherKind = res.getString(R.string.history_other),
    refundKind = res.getString(R.string.history_refund),
    staffName = res.getString(R.string.history_staff_name),
    actorBy = res.getString(R.string.history_actor_by),
    perDay = res.getString(R.string.history_per_day),
    perRental = res.getString(R.string.history_per_rental),
    perHour = res.getString(R.string.history_per_hour),
    quantity = res.getString(R.string.history_quantity),
    itemAdded = res.getString(R.string.history_item_added),
    itemRemoved = res.getString(R.string.history_item_removed),
    imagesAdded = res.getString(R.string.history_images_added),
    imagesRemoved = res.getString(R.string.history_images_removed),
    pricingOther = res.getString(R.string.history_pricing_other),
    countSummary = res.getString(R.string.history_count),
    countOnly = res.getString(R.string.history_count_only),
    latestToday = res.getString(R.string.history_latest_today),
)

/** One page of the target's history (blocking; run off the main thread) */
internal fun loadChangePage(target: ChangeHistoryTarget, id: Int, offset: Int, limit: Int = ChangeHistory.PAGE_SIZE): Result<ChangeHistory.Page> =
    when (target) {
        ChangeHistoryTarget.ORDER -> ApiClient.get().orderChanges(id, limit, offset)
        ChangeHistoryTarget.PRODUCT -> ApiClient.get().productChanges(id, limit, offset)
    }

/**
 * #519 "Lịch sử thay đổi" (boards LS-don, LS-san-pham): read only, newest first, grouped by Vietnam civil day,
 * 50 entries per page with "Xem thêm". Opened from the order ⋯ sheet and from the product detail.
 */
@Composable
fun ChangeHistoryScreen(target: ChangeHistoryTarget, id: Int, subtitle: String, onBack: () -> Unit) {
    val context = LocalContext.current
    val texts = remember { changeHistoryTexts(context.resources) }
    val scope = rememberCoroutineScope()
    var entries by remember { mutableStateOf<List<ChangeHistory.Entry>>(emptyList()) }
    var total by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }

    LaunchedEffect(target, id, reload) {
        loading = true
        error = null
        withContext(Dispatchers.IO) { loadChangePage(target, id, offset = 0) }
            .onSuccess { page ->
                entries = page.entries
                total = page.total
            }
            .onFailure { error = it.message }
        loading = false
    }

    fun loadMore() {
        if (loading) return
        loading = true
        scope.launch {
            withContext(Dispatchers.IO) { loadChangePage(target, id, offset = entries.size) }
                .onSuccess { page ->
                    val known = entries.map { it.id }.toSet()
                    entries = entries + page.entries.filterNot { it.id in known }
                    total = page.total
                    // A short page means the end even when `total` says otherwise
                    if (page.entries.isEmpty()) total = entries.size
                }
                .onFailure { error = it.message }
            loading = false
        }
    }

    val sections = remember(entries, texts) { ChangeHistory.sections(entries, Instant.now(), texts) }

    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        Row(
            Modifier.fillMaxWidth().padding(start = 4.dp, end = 16.dp, top = 6.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.back), modifier = Modifier.size(DS.Icon.Lg))
            }
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.history_title), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                if (subtitle.isNotBlank()) {
                    Text(subtitle, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
        HorizontalDivider(color = DS.Colors.Border)

        when {
            entries.isEmpty() && loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            entries.isEmpty() && error != null -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(stringResource(R.string.history_error), color = DS.Colors.TextMuted, fontSize = DS.TextSize.Body)
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = { reload++ }) { Text(stringResource(R.string.retry)) }
            }
            entries.isEmpty() -> Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.history_empty), color = DS.Colors.TextMuted, fontSize = DS.TextSize.Body)
            }
            else -> LazyColumn(Modifier.fillMaxSize().navigationBarsPadding()) {
                sections.forEachIndexed { index, section ->
                    if (section.header.isNotEmpty()) {
                        item(key = "day-$index-${section.header}") { DayHeader(section.header) }
                    }
                    // Index in the key: an old row may come without an id (decoded as 0)
                    itemsIndexed(section.rows, key = { i, row -> "row-$index-$i-${row.id}" }) { _, row -> EntryRow(row) }
                }
                if (entries.size < total) {
                    item(key = "more") {
                        Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                            if (loading) {
                                CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                            } else {
                                Text(
                                    stringResource(R.string.history_load_more),
                                    fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary,
                                    modifier = Modifier.clickable { loadMore() }.heightIn(min = 44.dp).padding(horizontal = 16.dp, vertical = 12.dp),
                                )
                            }
                        }
                    }
                }
                item(key = "end") { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
private fun DayHeader(text: String) {
    Box(
        Modifier.fillMaxWidth().background(Color(0xFFF8FAFC)).padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp),
    ) {
        Text(text, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted, letterSpacing = 0.5.sp)
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

private fun toneColors(tone: ChangeHistory.Tone): Pair<Color, Color> = when (tone) {
    ChangeHistory.Tone.GREEN -> Color(0xFFD1FAE5) to Color(0xFF047857)
    ChangeHistory.Tone.BLUE -> Color(0xFFDBEAFE) to Color(0xFF1E40AF)
    ChangeHistory.Tone.PURPLE -> Color(0xFFEDE9FE) to Color(0xFF5B21B6)
    ChangeHistory.Tone.AMBER -> Color(0xFFFEF3C7) to Color(0xFF92400E)
    ChangeHistory.Tone.RED -> Color(0xFFFEE2E2) to Color(0xFF991B1B)
    ChangeHistory.Tone.SLATE -> Color(0xFFF1F5F9) to Color(0xFF334155)
}

/** "bởi **Lan Anh** (nhân viên) · 18:05": the actor name bold in ink, the rest muted */
private fun footerText(row: ChangeHistory.Row): AnnotatedString = buildAnnotatedString {
    append(row.footer)
    row.footerName?.takeIf { it.last < row.footer.length }?.let { range ->
        addStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = DS.Colors.Text), range.first, range.last + 1)
    }
}

@Composable
private fun EntryRow(row: ChangeHistory.Row) {
    val (bg, fg) = toneColors(row.tone)
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(bg), contentAlignment = Alignment.Center) {
            Text(row.initials, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = fg)
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(row.title, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
            row.lines.forEach { line -> ChangeLineText(line) }
            if (row.footer.isNotBlank()) {
                Text(footerText(row), fontSize = 13.sp, color = Color(0xFF64748B))
            }
        }
    }
    HorizontalDivider(color = DS.Colors.Divider)
}

/** "Label: old (struck, muted) → new (bold)", or a plain summary line */
@Composable
private fun ChangeLineText(line: ChangeHistory.Line) {
    val body = Color(0xFF334155)
    if (line.text != null) {
        Text(line.text, fontSize = DS.TextSize.Secondary, color = body)
        return
    }
    val annotated = buildAnnotatedString {
        line.label?.let { append("$it: ") }
        line.from?.let {
            withStyle(SpanStyle(color = Color(0xFF94A3B8), textDecoration = TextDecoration.LineThrough)) { append(it) }
            append(" → ")
        }
        withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)) { append(line.to.orEmpty()) }
    }
    Text(annotated, fontSize = DS.TextSize.Secondary, color = body)
}
