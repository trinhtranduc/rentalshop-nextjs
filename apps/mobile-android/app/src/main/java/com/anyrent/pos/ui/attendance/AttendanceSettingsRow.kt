package com.anyrent.pos.ui.attendance

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.AttendanceApi
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.attendance.AttendanceLogic
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Re-reads `merchant.modules` from the profile each time Cài đặt shows (the owner may turn the module on later) */
@Composable
fun RefreshModulesOnShow() {
    LaunchedEffect(Unit) { withContext(Dispatchers.IO) { ApiClient.get().refreshModules() } }
}

/**
 * First row of Cài đặt (#910, mockup screen 1): "⏱ Chấm công" + today's shift and status, only when the shop has
 * the `attendance` module. Nothing at all otherwise (old API without `merchant.modules` included).
 */
@Composable
fun AttendanceSettingsRow(onClick: () -> Unit, horizontalPadding: Dp = 16.dp) {
    val modules by SessionStore.modulesFlow.collectAsState()
    if (!AttendanceLogic.hasAttendance(modules)) return
    val context = LocalContext.current
    var subtitle by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) { AttendanceApi.me() }.onSuccess { subtitle = AttendanceTexts.settingsSubtitle(context, it) }
    }
    val shape = RoundedCornerShape(16.dp)
    Row(
        Modifier.padding(horizontal = horizontalPadding, vertical = 8.dp).fillMaxWidth().clip(shape)
            .background(AttendanceColors.RowBlueFill).border(1.dp, AttendanceColors.RowBlueBorder, shape)
            .clickable(onClick = onClick).testTag("settings-attendance").padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(stringResource(R.string.attendance_settings_row), fontSize = DS.TextSize.Name, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
            subtitle?.let { Text(it, fontSize = DS.TextSize.Pill, color = DS.Colors.TextMuted) }
        }
        Text("›", fontSize = 22.sp, color = DS.Colors.Primary)
    }
}
