package com.anyrent.pos.ui.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.Action
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.anyrent.pos.MainActivity
import com.anyrent.pos.R
import com.anyrent.pos.domain.widget.TodayWidgetDisplay
import com.anyrent.pos.domain.widget.TodayWidgetLabels
import com.anyrent.pos.domain.widget.TodayWidgetLayout
import com.anyrent.pos.domain.widget.TodayWidgetLink
import java.time.Instant

// "Việc cần làm" home-screen widget (#1381, epic #1372), design P2 "thẻ có màu", iOS `TodayWorkWidget.swift`.
// Small: a progress ring and three coloured counters. Medium: a header, the counters and up to three jobs of two lines.
// It only reads the file the app and its worker write: no network and no token here. What it draws is decided by
// `TodayWidgetDisplay.make` (pure, tested): a list from an earlier Vietnam day is never shown as today's.

class TodayWorkWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(
        setOf(
            DpSize(110.dp, 110.dp),
            DpSize(180.dp, 110.dp),
            DpSize(180.dp, 160.dp),
            DpSize(180.dp, 194.dp),
        ),
    )

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val labels = widgetLabels(context)
        provideContent {
            val version by TodayWidgetStore.version.collectAsState()
            val snapshot = remember(version) { TodayWidgetStore.read() }
            val now = remember(version) { Instant.now() }
            val size = LocalSize.current
            val display = TodayWidgetDisplay.make(
                snapshot, TodayWidgetSync.signedInUser(), now,
                TodayWidgetLayout.rowLimit(size.width.value, size.height.value), labels,
            )
            WidgetContent(display, small = TodayWidgetLayout.isSmall(size.width.value))
        }
    }
}

class TodayWorkWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayWorkWidget()

    /** The first widget was placed */
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        TodayWidgetSchedule.ensure(context)
        TodayWidgetSchedule.refreshOnce(context)
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        TodayWidgetSchedule.ensure(context)
    }

    /** The last widget left: no more background work, and the shop's data leaves with it */
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        TodayWidgetSchedule.cancel(context)
        TodayWidgetStore.clear()
    }
}

/** The ↻ button */
class TodayWidgetRefreshAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        TodayWidgetSchedule.refreshOnce(context)
    }
}

internal fun widgetLabels(context: Context): TodayWidgetLabels {
    fun text(id: Int) = context.getString(id)
    return TodayWidgetLabels(
        today = text(R.string.orders_section_today),
        late = text(R.string.widget_late),
        pickup = text(R.string.widget_pickup),
        returnTask = text(R.string.widget_return),
        notPrepared = text(R.string.orders_v2_not_prepared),
        moreFormat = text(R.string.widget_more),
        updatedFormat = text(R.string.widget_updated),
        doneFormat = text(R.string.widget_done),
        doneCaption = text(R.string.widget_done_caption),
        allDoneFormat = text(R.string.widget_all_done),
        todayAtFormat = text(R.string.widget_today_at),
        empty = text(R.string.widget_empty),
        tomorrowFormat = text(R.string.widget_tomorrow),
        loggedOut = text(R.string.widget_logged_out),
        loggedOutHint = text(R.string.widget_logged_out_hint),
        noAccess = text(R.string.widget_no_access),
        stale = text(R.string.widget_stale),
        staleFormat = text(R.string.widget_stale_detail),
        yesterday = text(R.string.widget_yesterday),
        hiddenName = text(R.string.widget_hidden_name),
        appName = text(R.string.app_name),
        pickupDayWord = text(R.string.orders_chip_pickup),
        returnDayWord = text(R.string.orders_chip_return),
        lateDays = { days -> context.resources.getQuantityString(R.plurals.orders_late_days, days, days) },
    )
}

/** An explicit activity, and the running app is reused rather than a second one stacked on it */
private fun openLink(context: Context, url: String): Action = actionStartActivity(
    Intent(Intent.ACTION_VIEW, Uri.parse(url))
        .setClass(context, MainActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
)

private fun color(@ColorRes id: Int) = ColorProvider(id)

private val onFill = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color.White)

private fun style(size: TextUnit, @ColorRes colorId: Int = R.color.widget_text, weight: FontWeight = FontWeight.Normal) =
    TextStyle(fontSize = size, fontWeight = weight, color = color(colorId))

@Composable
private fun WidgetContent(display: TodayWidgetDisplay, small: Boolean) {
    val context = LocalContext.current
    Box(
        GlanceModifier
            .fillMaxSize()
            .appWidgetBackground()
            .background(ImageProvider(R.drawable.widget_bg))
            .clickable(openLink(context, TodayWidgetLink.TODO_URL))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        val labels = display.labels
        when (display.kind) {
            TodayWidgetDisplay.Kind.WORK -> if (small) SmallWork(display) else MediumWork(display)
            TodayWidgetDisplay.Kind.EMPTY -> StateView(display, labels.empty, display.tomorrowText, display.updatedText, small)
            TodayWidgetDisplay.Kind.ALL_DONE -> StateView(
                display, display.allDoneText.orEmpty(), display.tomorrowText, display.updatedText, small, icon = R.drawable.ic_widget_check,
            )
            TodayWidgetDisplay.Kind.STALE -> StateView(display, labels.stale, display.staleDetail, null, small)
            TodayWidgetDisplay.Kind.NO_ACCESS -> StateView(display, labels.noAccess, null, null, small)
            TodayWidgetDisplay.Kind.LOGGED_OUT -> StateView(display, labels.loggedOut, labels.loggedOutHint, null, small, signedOut = true)
        }
    }
}

/** Small: the ring, then the three counters */
@Composable
private fun SmallWork(display: TodayWidgetDisplay) {
    Column(GlanceModifier.fillMaxSize()) {
        Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            ProgressRing(display.progress)
            Spacer(GlanceModifier.width(8.dp))
            Column(GlanceModifier.defaultWeight()) {
                Text(display.progressText, style = style(15.sp, weight = FontWeight.Bold), maxLines = 1)
                Text(display.labels.doneCaption, style = style(12.sp, R.color.widget_text_muted), maxLines = 2)
            }
        }
        Spacer(GlanceModifier.height(8.dp))
        Row(GlanceModifier.fillMaxWidth()) {
            CounterTile(display.counts.late, display.labels.late, TileColor.LATE, stacked = true, GlanceModifier.defaultWeight())
            Spacer(GlanceModifier.width(4.dp))
            CounterTile(display.counts.pickup, display.labels.pickup, TileColor.GIAO, stacked = true, GlanceModifier.defaultWeight())
            Spacer(GlanceModifier.width(4.dp))
            CounterTile(display.counts.returns, display.labels.returnTask, TileColor.TRA, stacked = true, GlanceModifier.defaultWeight())
        }
        Spacer(GlanceModifier.defaultWeight())
        display.updatedText?.let { Text(it, style = style(12.sp, R.color.widget_text_muted), maxLines = 1) }
    }
}

/** Medium: the header with ↻, the counters in a strip, the jobs of two lines, the footer */
@Composable
private fun MediumWork(display: TodayWidgetDisplay) {
    val context = LocalContext.current
    Column(GlanceModifier.fillMaxSize()) {
        Header(display, showsDay = true, showsRefresh = true)
        Spacer(GlanceModifier.height(4.dp))
        Row(GlanceModifier.fillMaxWidth()) {
            CounterTile(display.counts.late, display.labels.late, TileColor.LATE, stacked = false, GlanceModifier.defaultWeight())
            Spacer(GlanceModifier.width(6.dp))
            CounterTile(display.counts.pickup, display.labels.pickup, TileColor.GIAO, stacked = false, GlanceModifier.defaultWeight())
            Spacer(GlanceModifier.width(6.dp))
            CounterTile(display.counts.returns, display.labels.returnTask, TileColor.TRA, stacked = false, GlanceModifier.defaultWeight())
        }
        // A Glance column keeps 10 children and drops the rest without a word: the jobs have their own, or the footer goes
        Column(GlanceModifier.fillMaxWidth()) {
            display.lines.forEach { line ->
                Spacer(GlanceModifier.height(4.dp))
                JobRow(line, display.labels, GlanceModifier.fillMaxWidth().clickable(openLink(context, line.url)))
            }
        }
        Spacer(GlanceModifier.defaultWeight())
        Text(display.footerText, style = style(12.sp, R.color.widget_text_muted), maxLines = 1)
    }
}

/** One job: line 1 the chip, the customer and when; line 2 the first item and the warning (or the due day) */
@Composable
private fun JobRow(line: TodayWidgetDisplay.Line, labels: TodayWidgetLabels, modifier: GlanceModifier) {
    Column(modifier) {
        Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            KindChip(line)
            Spacer(GlanceModifier.width(6.dp))
            if (line.name.isEmpty()) {
                Text(labels.hiddenName, style = style(14.sp, R.color.widget_text_muted), maxLines = 1, modifier = GlanceModifier.defaultWeight())
            } else {
                Text(line.name, style = style(14.sp, weight = FontWeight.Bold), maxLines = 1, modifier = GlanceModifier.defaultWeight())
            }
            Spacer(GlanceModifier.width(4.dp))
            Text(
                line.rightText,
                style = if (line.rightIsLate) style(12.sp, R.color.widget_late_text, FontWeight.Bold)
                else style(12.sp, R.color.widget_text_muted, FontWeight.Medium),
                maxLines = 1,
            )
        }
        Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(line.productText, style = style(12.sp, R.color.widget_text_muted), maxLines = 1, modifier = GlanceModifier.defaultWeight())
            Spacer(GlanceModifier.width(4.dp))
            if (line.warningText != null) {
                // Orange text and a warning icon, no background: it must not be mistaken for the TRẢ chip
                Image(ImageProvider(R.drawable.ic_widget_warning), contentDescription = null, modifier = GlanceModifier.size(12.dp))
                Spacer(GlanceModifier.width(3.dp))
                Text(line.warningText, style = style(12.sp, R.color.widget_warning_text, FontWeight.Bold), maxLines = 1)
            } else if (line.dayText != null) {
                Text(line.dayText, style = style(12.sp, R.color.widget_text_muted), maxLines = 1)
            }
        }
    }
}

@Composable
private fun KindChip(line: TodayWidgetDisplay.Line) {
    val (fill, icon) = when (line.chip) {
        TodayWidgetDisplay.Chip.LATE -> R.drawable.widget_chip_late to R.drawable.ic_widget_clock
        TodayWidgetDisplay.Chip.PICKUP -> R.drawable.widget_chip_giao to R.drawable.ic_widget_out
        TodayWidgetDisplay.Chip.RETURN -> R.drawable.widget_chip_tra to R.drawable.ic_widget_in
    }
    Row(
        GlanceModifier.background(ImageProvider(fill)).padding(horizontal = 6.dp, vertical = 1.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(ImageProvider(icon), contentDescription = null, modifier = GlanceModifier.size(10.dp))
        Spacer(GlanceModifier.width(3.dp))
        Text(line.chipText, style = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, color = onFill), maxLines = 1)
    }
}

private enum class TileColor(@DrawableRes val on: Int, @DrawableRes val off: Int, @DrawableRes val icon: Int) {
    LATE(R.drawable.widget_tile_late, R.drawable.widget_tile_late_off, R.drawable.ic_widget_clock),
    GIAO(R.drawable.widget_tile_giao, R.drawable.widget_tile_giao_off, R.drawable.ic_widget_out),
    TRA(R.drawable.widget_tile_tra, R.drawable.widget_tile_tra_off, R.drawable.ic_widget_in),
}

/** A coloured counter: a number and its word on a solid fill; a counter at 0 is dimmed */
@Composable
private fun CounterTile(number: Int, word: String, tile: TileColor, stacked: Boolean, modifier: GlanceModifier) {
    val fill = modifier.background(ImageProvider(if (number == 0) tile.off else tile.on))
    val big = TextStyle(fontSize = if (stacked) 22.sp else 20.sp, fontWeight = FontWeight.Bold, color = onFill)
    val small = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Bold, color = onFill)
    if (stacked) {
        Column(fill.padding(horizontal = 6.dp, vertical = 4.dp)) {
            Text("$number", style = big, maxLines = 1)
            Text(word, style = small, maxLines = 1)
        }
    } else {
        Row(fill.padding(horizontal = 9.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
            Image(ImageProvider(tile.icon), contentDescription = null, modifier = GlanceModifier.size(11.dp))
            Spacer(GlanceModifier.width(4.dp))
            Text("$number", style = big, maxLines = 1)
            Spacer(GlanceModifier.width(4.dp))
            Text(word, style = small, maxLines = 1)
        }
    }
}

/** Glance has no canvas: two white rings drawn once, tinted by the widget's colours (so they follow the dark mode) */
@Composable
private fun ProgressRing(progress: Double) {
    val density = LocalContext.current.resources.displayMetrics.density
    val track = remember(density) { ringBitmap(density, 1.0) }
    val fill = remember(density, progress) { ringBitmap(density, progress) }
    Box(GlanceModifier.size(RING_DP.dp)) {
        Image(ImageProvider(track), null, GlanceModifier.size(RING_DP.dp), colorFilter = ColorFilter.tint(color(R.color.widget_ring_track)))
        Image(ImageProvider(fill), null, GlanceModifier.size(RING_DP.dp), colorFilter = ColorFilter.tint(color(R.color.widget_ring_fill)))
    }
}

private const val RING_DP = 34

private fun ringBitmap(density: Float, progress: Double): Bitmap {
    val side = (RING_DP * density).toInt().coerceAtLeast(1)
    val stroke = 5 * density
    val bitmap = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
        color = android.graphics.Color.WHITE
    }
    val inset = stroke / 2
    val oval = RectF(inset, inset, side - inset, side - inset)
    if (progress > 0) Canvas(bitmap).drawArc(oval, -90f, (360 * progress).toFloat(), false, paint)
    return bitmap
}

@Composable
private fun Header(display: TodayWidgetDisplay, showsDay: Boolean, showsRefresh: Boolean) {
    Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        val title = if (showsDay && display.dayText.isNotEmpty()) "${display.title} · ${display.dayText}" else display.title
        Text(title, style = style(14.sp, weight = FontWeight.Bold), maxLines = 1, modifier = GlanceModifier.defaultWeight())
        if (showsRefresh) {
            Image(
                ImageProvider(R.drawable.ic_widget_refresh),
                contentDescription = LocalContext.current.getString(R.string.widget_refresh),
                modifier = GlanceModifier.size(18.dp).clickable(actionRunCallback<TodayWidgetRefreshAction>()),
            )
        }
    }
}

@Composable
private fun StateView(
    display: TodayWidgetDisplay,
    headline: String,
    detail: String?,
    footer: String?,
    small: Boolean,
    signedOut: Boolean = false,
    @DrawableRes icon: Int? = null,
) {
    Column(GlanceModifier.fillMaxSize()) {
        // Signed out: "AnyRent" alone. Nothing to refresh: the worker calls no network then.
        Header(display, showsDay = !signedOut, showsRefresh = !signedOut && !small)
        Spacer(GlanceModifier.defaultWeight())
        if (icon != null) {
            Image(ImageProvider(icon), contentDescription = null, modifier = GlanceModifier.size(22.dp))
        }
        Text(headline, style = style(if (small) 15.sp else 17.sp, weight = FontWeight.Bold), maxLines = 3)
        detail?.let { Text(it, style = style(12.sp, R.color.widget_text_muted), maxLines = 2) }
        Spacer(GlanceModifier.defaultWeight())
        footer?.let { Text(it, style = style(12.sp, R.color.widget_text_muted), maxLines = 1) }
    }
}
