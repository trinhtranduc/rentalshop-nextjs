package com.anyrent.pos.ui.attendance

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CurrentOutlet
import com.anyrent.pos.data.PunchOutcome
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.attendance.AttendanceCard
import com.anyrent.pos.domain.attendance.AttendanceLogic
import com.anyrent.pos.domain.attendance.ClockCard
import com.anyrent.pos.domain.attendance.ClockCardKind
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.time.Instant

/** Colors of the mockup (tabs "App (nhân viên)" and "phương án L") */
internal object AttendanceColors {
    val CardBorder = Color(0xFFE2E8F0)
    val OkFill = Color(0xFFECFDF5)
    val OkBorder = Color(0xFFA7F3D0)
    val OkText = Color(0xFF065F46)
    val ErrFill = Color(0xFFFEF2F2)
    val ErrText = Color(0xFF991B1B)
    val Dark = Color(0xFF0F172A)
    val Faint = Color(0xFF64748B)
    val Late = Color(0xFF92400E)
}

/** Re-reads `merchant.modules` from the profile each time Cài đặt shows (the owner may turn the module on later) */
@Composable
fun RefreshModulesOnShow() {
    LaunchedEffect(Unit) { withContext(Dispatchers.IO) { ApiClient.get().refreshModules() } }
}

private val PERMISSIONS = arrayOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION)

private fun hasPermissions(context: Context) = PERMISSIONS.all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }

private fun Context.activity(): Activity? {
    var c: Context? = this
    while (c is ContextWrapper) {
        if (c is Activity) return c
        c = c.baseContext
    }
    return null
}

/** Whether the app already asked for a permission (to tell "first time" from "don't ask again") */
private object AttendancePermissionMemory {
    private fun prefs(context: Context) = context.getSharedPreferences("anyrent.attendance", 0)
    fun wasAsked(context: Context, permission: String) = prefs(context).getBoolean(permission, false)
    fun markAsked(context: Context, permission: String) = prefs(context).edit().putBoolean(permission, true).apply()
}

/**
 * Top of Cài đặt (#927, mockup "phương án L"): a big clock card, only when the shop has the `attendance` module AND
 * picked this person (`me.required`, missing = true). Vào ca / Ra ca asks for camera + precise location, then
 * [onScan] opens the scanner at once; the result shows in the card (✓) or in a red box under it.
 */
@Composable
fun AttendanceClockCard(onScan: () -> Unit, onOpenMyShifts: () -> Unit, horizontalPadding: Dp = 16.dp) {
    val context = LocalContext.current
    val modules by SessionStore.modulesFlow.collectAsState()
    val snapshot by AttendanceCardStore.state.collectAsState()
    val scan by AttendanceCardStore.scan.collectAsState()
    var askRationale by remember { mutableStateOf(false) }
    var showDenied by remember { mutableStateOf(false) }
    var now by remember { mutableStateOf(Instant.now()) }

    LaunchedEffect(Unit) {
        AttendanceCardStore.onSettingsShown()
        AttendanceCardStore.refresh()
    }
    LaunchedEffect(Unit) {
        while (true) {
            now = Instant.now()
            delay(1_000)
        }
    }

    val me = AttendanceCardStore.meFor(snapshot)
    if (!AttendanceCard.visible(modules, me) || me == null) return

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        if (hasPermissions(context)) onScan() else showDenied = true
    }
    fun onButton() {
        AttendanceCardStore.clearScan()
        if (hasPermissions(context)) onScan() else askRationale = true
    }

    val card = AttendanceCard.state(me, snapshot.todayPairs, now)
    val inShift = card.kind == ClockCardKind.IN_SHIFT
    val shape = RoundedCornerShape(18.dp)
    Column(Modifier.padding(start = horizontalPadding, end = horizontalPadding, top = 4.dp, bottom = 12.dp)) {
        Column(
            Modifier.fillMaxWidth().clip(shape)
                .background(if (inShift) AttendanceColors.OkFill else Color.White)
                .border(1.dp, if (inShift) AttendanceColors.OkBorder else AttendanceColors.CardBorder, shape)
                .testTag("settings-attendance")
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                bigText(card), fontSize = 34.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                modifier = Modifier.testTag("attendance-card-big"),
            )
            Text(
                cardLine(context, card), fontSize = 12.5.sp, color = AttendanceColors.Faint, textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 4.dp, bottom = 10.dp).testTag("attendance-card-line"),
            )
            (scan?.outcome as? PunchOutcome.Done)?.let { done ->
                val (title, _) = AttendanceTexts.success(context, done.result)
                val line = listOfNotNull(title, done.result.distanceM?.let { context.getString(R.string.attendance_card_distance, it) })
                    .joinToString(" · ")
                Text(
                    line, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = AttendanceColors.OkText,
                    textAlign = TextAlign.Center, modifier = Modifier.padding(bottom = 10.dp).testTag("attendance-ok"),
                )
            }
            Row(
                Modifier.fillMaxWidth().height(46.dp).clip(RoundedCornerShape(12.dp))
                    .background(if (inShift) AttendanceColors.Dark else DS.Colors.Primary)
                    .clickable(onClick = ::onButton)
                    .testTag("attendance-punch"),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.QrCodeScanner, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    stringResource(if (inShift) R.string.attendance_clock_out else R.string.attendance_clock_in),
                    fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White,
                )
            }
            Text(
                stringResource(R.string.attendance_my_shifts_link), fontSize = 12.5.sp, color = DS.Colors.Primary,
                modifier = Modifier.padding(top = 4.dp).heightIn(min = 32.dp).clickable(onClick = onOpenMyShifts)
                    .padding(horizontal = 8.dp, vertical = 8.dp).testTag("attendance-my-shifts"),
            )
        }
        (scan?.outcome as? PunchOutcome.Rejected)?.let { refused ->
            val (title, message) = AttendanceTexts.rejection(context, refused.rejection)
            Column(
                Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(AttendanceColors.ErrFill)
                    .padding(horizontal = 14.dp, vertical = 12.dp).testTag("attendance-error"),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(title, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = AttendanceColors.ErrText)
                if (message.isNotBlank()) Text(message, fontSize = DS.TextSize.Secondary, color = AttendanceColors.ErrText)
            }
        }
    }

    if (askRationale) {
        AppAlertConfirm(
            title = stringResource(R.string.attendance_perm_title),
            message = stringResource(R.string.attendance_perm_message),
            confirmLabel = stringResource(R.string.attendance_perm_continue),
            onDismiss = { askRationale = false },
            onConfirm = {
                askRationale = false
                // Asked before and refused "don't ask again": the system shows nothing, so go to Settings
                val activity = context.activity()
                val blocked = activity != null && PERMISSIONS.any {
                    ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED &&
                        AttendancePermissionMemory.wasAsked(context, it) &&
                        !ActivityCompat.shouldShowRequestPermissionRationale(activity, it)
                }
                if (blocked) {
                    showDenied = true
                } else {
                    PERMISSIONS.forEach { AttendancePermissionMemory.markAsked(context, it) }
                    permissionLauncher.launch(PERMISSIONS)
                }
            },
        )
    }
    if (showDenied) {
        AppAlertConfirm(
            title = stringResource(R.string.attendance_perm_denied_title),
            message = stringResource(R.string.attendance_perm_denied_message),
            confirmLabel = stringResource(R.string.attendance_open_settings),
            onDismiss = { showDenied = false },
            onConfirm = {
                showDenied = false
                runCatching {
                    context.startActivity(
                        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                }
            },
        )
    }
}

@Composable
private fun bigText(card: ClockCard): String =
    if (card.kind == ClockCardKind.DONE) stringResource(R.string.attendance_hours_value, card.big) else card.big

/** Line under the big number for each face */
private fun cardLine(context: Context, card: ClockCard): String = when (card.kind) {
    ClockCardKind.IN_SHIFT -> listOfNotNull(
        context.getString(R.string.attendance_card_in_since, card.checkIn.orEmpty()),
        card.shift?.let { shift ->
            val name = shift.name ?: AttendanceLogic.shiftTimes(shift)
            shift.end?.let { context.getString(R.string.attendance_card_until, name, it) } ?: name
        },
    ).joinToString(" · ")
    ClockCardKind.DONE -> context.getString(R.string.attendance_card_today, card.pairs.orEmpty())
    ClockCardKind.IDLE -> AttendanceCard.idleLine(
        AttendanceLogic.dayShort(ShopTime.today()),
        card.shifts,
        SessionStore.outletName?.takeIf { it.isNotBlank() } ?: CurrentOutlet.name,
        AttendanceTexts.status(context, card.status),
    )
}

