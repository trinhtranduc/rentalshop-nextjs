package com.anyrent.pos.ui.attendance

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.BackHandler
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.anyrent.pos.R
import com.anyrent.pos.data.AttendanceApi
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.ShopTime
import com.anyrent.pos.domain.attendance.AttendanceLogic
import com.anyrent.pos.domain.attendance.AttendanceMe
import com.anyrent.pos.domain.attendance.AttendanceStatus
import com.anyrent.pos.domain.attendance.PunchRejection
import com.anyrent.pos.domain.attendance.PunchResult
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.anyrent.pos.ui.settings.v2.SettingsDetailPage
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Colors of the mockup (tab "App (nhân viên)") */
internal object AttendanceColors {
    val CardBorder = Color(0xFFE2E8F0)
    val OkFill = Color(0xFFECFDF5)
    val OkText = Color(0xFF065F46)
    val ErrFill = Color(0xFFFEF2F2)
    val ErrText = Color(0xFF991B1B)
    val Dark = Color(0xFF0F172A)
    val Faint = Color(0xFF64748B)
    val Late = Color(0xFF92400E)
    val RowBlueFill = Color(0xFFEFF6FF)
    val RowBlueBorder = Color(0xFFBFDBFE)
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

/** Last punch shown on the screen: one green or one red card */
private sealed interface PunchCard {
    data class Ok(val result: PunchResult) : PunchCard
    data class Refused(val rejection: PunchRejection) : PunchCard
}

/**
 * "Chấm công" (#910, mockup screens 2, 4, 5, 6): today's shift card, ONE button (Vào ca / Ra ca), the result of the
 * last scan, and "Ca và công của tôi". The button asks for the camera and precise location, then opens the scanner.
 */
@Composable
fun AttendanceScreen(onBack: () -> Unit, onOpenMyShifts: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var me by remember { mutableStateOf<AttendanceMe?>(null) }
    var loading by remember { mutableStateOf(true) }
    var card by remember { mutableStateOf<PunchCard?>(null) }
    var scanning by remember { mutableStateOf(false) }
    var askRationale by remember { mutableStateOf(false) }
    var showDenied by remember { mutableStateOf(false) }

    fun reload() {
        scope.launch {
            withContext(Dispatchers.IO) { AttendanceApi.me() }.onSuccess { me = it }
            loading = false
        }
    }
    LaunchedEffect(Unit) { reload() }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        if (hasPermissions(context)) scanning = true else showDenied = true
    }

    fun onButton() {
        when {
            hasPermissions(context) -> scanning = true
            else -> askRationale = true
        }
    }

    if (scanning) {
        BackHandler { scanning = false }
        AttendanceScanScreen(
            onClose = { scanning = false },
            onResult = { outcome ->
                scanning = false
                card = when (outcome) {
                    is com.anyrent.pos.data.PunchOutcome.Done -> PunchCard.Ok(outcome.result)
                    is com.anyrent.pos.data.PunchOutcome.Rejected -> PunchCard.Refused(outcome.rejection)
                }
                if (outcome is com.anyrent.pos.data.PunchOutcome.Done) {
                    // The button flips at once; `me` confirms it
                    me = me?.copy(
                        openRecord = if (outcome.result.isIn) outcome.result.record else null,
                        lastAction = outcome.result.action,
                        lastActionAt = outcome.result.record?.checkOutAt ?: outcome.result.record?.checkInAt,
                    )
                    reload()
                }
            },
        )
        return
    }

    SettingsDetailPage(title = stringResource(R.string.attendance_title), onBack = onBack) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val status = me?.status() ?: AttendanceStatus.NOT_IN
            ShiftCard(me, status)
            card?.let { PunchCardView(it) }
            val inShift = status == AttendanceStatus.IN_SHIFT
            BigButton(
                text = stringResource(if (inShift) R.string.attendance_clock_out else R.string.attendance_clock_in),
                dark = inShift,
                enabled = !loading,
                onClick = ::onButton,
            )
            val hint = when {
                inShift -> null
                card is PunchCard.Ok -> R.string.attendance_hint_again
                else -> R.string.attendance_hint_scan
            }
            hint?.let { Text(stringResource(it), fontSize = DS.TextSize.Secondary, color = AttendanceColors.Faint) }
            Column {
                Row(
                    Modifier.fillMaxWidth().clickable(onClick = onOpenMyShifts).testTag("attendance-my-shifts").heightIn(min = 48.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(stringResource(R.string.attendance_my_shifts), fontSize = DS.TextSize.Body, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                    Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(DS.Icon.Sm))
                }
                HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)
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

/** Whether the app already asked for a permission (to tell "first time" from "don't ask again") */
private object AttendancePermissionMemory {
    private fun prefs(context: Context) = context.getSharedPreferences("anyrent.attendance", 0)
    fun wasAsked(context: Context, permission: String) = prefs(context).getBoolean(permission, false)
    fun markAsked(context: Context, permission: String) = prefs(context).edit().putBoolean(permission, true).apply()
}

/** "Hôm nay · T2 12/10/26" / "Ca sáng 08:00 – 12:00" / "Chi nhánh chính · chưa vào ca" */
@Composable
private fun ShiftCard(me: AttendanceMe?, status: AttendanceStatus) {
    val context = LocalContext.current
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, AttendanceColors.CardBorder, RoundedCornerShape(16.dp)).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(stringResource(R.string.attendance_today, AttendanceLogic.dayLong(ShopTime.today())), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
        val shifts = me?.todayShifts.orEmpty()
        Text(
            if (shifts.isEmpty()) stringResource(R.string.attendance_no_shift)
            else shifts.joinToString("\n") { AttendanceLogic.shiftLine(it, spaced = true) },
            fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
        )
        val outlet = SessionStore.outletName?.takeIf { it.isNotBlank() } ?: com.anyrent.pos.data.CurrentOutlet.name?.takeIf { it.isNotBlank() }
        Text(
            listOfNotNull(outlet, me?.let { AttendanceTexts.status(context, status) }).joinToString(" · "),
            fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
        )
    }
}

@Composable
private fun PunchCardView(card: PunchCard) {
    val context = LocalContext.current
    val (title, message, ok) = when (card) {
        is PunchCard.Ok -> AttendanceTexts.success(context, card.result).let { Triple(it.first, it.second, true) }
        is PunchCard.Refused -> AttendanceTexts.rejection(context, card.rejection).let { Triple(it.first, it.second, false) }
    }
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
            .background(if (ok) AttendanceColors.OkFill else AttendanceColors.ErrFill)
            .padding(horizontal = 14.dp, vertical = 12.dp)
            .testTag(if (ok) "attendance-ok" else "attendance-error"),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        val color = if (ok) AttendanceColors.OkText else AttendanceColors.ErrText
        Text(title, fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = color)
        if (!message.isNullOrBlank()) Text(message, fontSize = DS.TextSize.Secondary, color = color)
    }
}

/** 60dp button: blue "Vào ca", dark "Ra ca" */
@Composable
private fun BigButton(text: String, dark: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(16.dp))
            .background(if (dark) AttendanceColors.Dark else DS.Colors.Primary)
            .clickable(enabled = enabled, onClick = onClick)
            .testTag("attendance-punch"),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (!enabled) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
        } else {
            Icon(Icons.Outlined.QrCodeScanner, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(10.dp))
            Text(text, fontSize = 19.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }
    }
}
