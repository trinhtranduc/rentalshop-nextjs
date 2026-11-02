package com.anyrent.pos.ui.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.anyrent.pos.R
import com.anyrent.pos.domain.widget.TodayWidgetCounts
import com.anyrent.pos.domain.widget.TodayWidgetGuide
import com.anyrent.pos.ui.theme.DS

/** Whether a widget is on the home screen, read again each time the app comes back */
@Composable
fun rememberHasTodayWidget(): Boolean {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    var present by remember { mutableStateOf(TodayWidgetSync.hasWidget(context)) }
    DisposableEffect(owner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) present = TodayWidgetSync.hasWidget(context)
        }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
    return present
}

/** Asks the launcher to place the widget. False: it will not. True only means it may ask: Android never says how it ended. */
private fun requestPin(context: Context, manager: AppWidgetManager): Boolean =
    runCatching { manager.requestPinAppWidget(ComponentName(context, TodayWorkWidgetReceiver::class.java), null, null) }.getOrDefault(false)

/** The small card above "Việc cần làm": "Không hỏi lại" ends it for good */
@Composable
fun TodayWidgetHintCard(counts: TodayWidgetCounts, onHow: () -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier
            .fillMaxWidth()
            .testTag("orders.widgetHint")
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFEFF6FF))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(stringResource(R.string.widget_hint_title), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
        Text(
            stringResource(R.string.widget_hint_body, counts.pickup, counts.returns, counts.late),
            fontSize = DS.TextSize.Secondary,
            color = DS.Colors.TextMuted,
        )
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                Modifier
                    .testTag("orders.widgetHint.how")
                    .heightIn(min = 36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(DS.Colors.Primary)
                    .clickable(onClick = onHow)
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(stringResource(R.string.widget_hint_how), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = Color.White)
            }
            Box(
                Modifier
                    .testTag("orders.widgetHint.dismiss")
                    .heightIn(min = 36.dp)
                    .clickable(onClick = onDismiss)
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(stringResource(R.string.widget_dismiss), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.TextMuted)
            }
        }
    }
}

/**
 * "Thêm vào widget" (W11). "Thêm widget" asks the launcher; a launcher that cannot gets the three steps. Android does
 * not tell the app when pinning fails, so nothing here ever says it worked: after the call the sheet offers the steps as
 * a way out, and it closes by itself, silently, once a widget really is on the home screen.
 *
 * @param onNeverAsk only from the card ("Không hỏi lại"); Cài đặt does not offer it
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayWidgetGuideSheet(onDismiss: () -> Unit, onNeverAsk: (() -> Unit)? = null) {
    val context = LocalContext.current
    val manager = remember { AppWidgetManager.getInstance(context) }
    val supported = remember { manager.isRequestPinAppWidgetSupported }
    val hadWidget = remember { TodayWidgetSync.hasWidget(context) }
    val hasWidget = rememberHasTodayWidget()
    var requested by remember { mutableStateOf(false) }
    val guide = TodayWidgetGuide.of(pinSupported = supported, pinRequested = requested)

    // Placed while the system dialog was up
    if (requested && !hadWidget && hasWidget) {
        DisposableEffect(Unit) {
            onDismiss()
            onDispose { }
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .testTag("widget.guide")
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 16.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(stringResource(R.string.widget_guide_title), fontSize = DS.TextSize.Title, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            Text(
                stringResource(if (supported) R.string.widget_guide_subtitle_pin else R.string.widget_guide_subtitle_steps),
                fontSize = DS.TextSize.Body,
                color = DS.Colors.TextMuted,
            )
            PreviewCard()
            if (guide.showsNotAskedNote) {
                Text(stringResource(R.string.widget_guide_not_asked), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
            }
            if (guide.showsSteps) {
                Step(1, stringResource(R.string.widget_guide_step1))
                Step(2, stringResource(R.string.widget_guide_step2))
                Step(3, stringResource(R.string.widget_guide_step3))
            }
            if (guide.showsPinButton) {
                PrimaryButton(stringResource(R.string.widget_guide_add), "widget.guide.add") {
                    requestPin(context, manager)
                    requested = true
                }
            } else {
                PrimaryButton(stringResource(R.string.widget_guide_ok), "widget.guide.ok", onDismiss)
            }
            if (onNeverAsk != null) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .testTag("widget.guide.never")
                        .heightIn(min = 40.dp)
                        .clickable {
                            onNeverAsk()
                            onDismiss()
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(stringResource(R.string.widget_dismiss), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.TextMuted)
                }
            }
        }
    }
}

@Composable
private fun PrimaryButton(text: String, tag: String, onClick: () -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .testTag(tag)
            .height(48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(DS.Colors.Primary)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = Color.White)
    }
}

/** A drawing of the small widget with made-up numbers, like iOS */
@Composable
private fun PreviewCard() {
    val shape = RoundedCornerShape(22.dp)
    Column(
        Modifier.fillMaxWidth().clip(shape).background(Color(0xFFF8FAFC)).border(1.dp, DS.Colors.Border, shape).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.widget_done, 4, 10), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            Text(stringResource(R.string.widget_done_caption), fontSize = DS.TextSize.Pill, color = DS.Colors.TextMuted)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Tile(1, stringResource(R.string.widget_late), Color(0xFFB91C1C), Modifier.weight(1f))
            Tile(3, stringResource(R.string.widget_pickup), Color(0xFF1D4ED8), Modifier.weight(1f))
            Tile(2, stringResource(R.string.widget_return), Color(0xFFC2410C), Modifier.weight(1f))
        }
    }
}

@Composable
private fun Tile(number: Int, word: String, fill: Color, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(10.dp)).background(fill).padding(horizontal = 8.dp, vertical = 4.dp)) {
        Text("$number", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text(word, fontSize = DS.TextSize.Pill, fontWeight = FontWeight.Bold, color = Color.White)
    }
}

@Composable
private fun Step(number: Int, text: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(28.dp).clip(CircleShape).background(DS.Colors.Primary), contentAlignment = Alignment.Center) {
            Text("$number", fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Text(text, fontSize = DS.TextSize.Body, color = DS.Colors.Text, modifier = Modifier.weight(1f))
    }
}
