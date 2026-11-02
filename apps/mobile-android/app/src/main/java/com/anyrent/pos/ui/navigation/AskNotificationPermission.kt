package com.anyrent.pos.ui.navigation

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.notifications.NotificationPromptRule

/** #1413: the one place that asks. The FCM token does not need this permission: `PushRegistrar` runs without it. */
@Composable
internal fun AskNotificationPermissionOnHome(homeInFront: Boolean) {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op */ }
    LaunchedEffect(homeInFront) {
        val activity = context.findActivity() ?: return@LaunchedEffect
        val permission = Manifest.permission.POST_NOTIFICATIONS
        val asks = NotificationPromptRule.shouldAsk(
            sdkInt = Build.VERSION.SDK_INT,
            granted = ContextCompat.checkSelfPermission(activity, permission) == PackageManager.PERMISSION_GRANTED,
            onboardingDone = SessionStore.onboardingDone,
            homeInFront = homeInFront,
            alreadyAsked = SessionStore.notificationPermissionAsked,
            declinedBefore = ActivityCompat.shouldShowRequestPermissionRationale(activity, permission),
        )
        if (asks) {
            SessionStore.notificationPermissionAsked = true
            launcher.launch(permission)
        }
    }
}

private fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
