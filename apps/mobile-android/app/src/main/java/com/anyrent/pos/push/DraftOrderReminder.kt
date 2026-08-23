package com.anyrent.pos.push

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.MainActivity
import com.anyrent.pos.R
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.ui.common.formatMoney
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Pins a quiet ongoing notification while the merchant has an unfinished cart.
 *
 * Posted from MainActivity.onStop (not a delayed ProcessLifecycle job). Why:
 * some devices never dispatch Process ON_STOP, and custom RemoteViews can be
 * dropped silently — the standard BigText pin always goes out first.
 */
object DraftOrderReminder {
    const val EXTRA_OPEN_CART = "openDraftCart"
    private const val TAG = "DraftOrderReminder"
    private const val NOTIFICATION_ID = 71001
    private const val REQUEST_CODE = 71001

    private val _pendingOpenCart = MutableStateFlow(false)
    val pendingOpenCart: StateFlow<Boolean> = _pendingOpenCart.asStateFlow()

    fun install() {
        // Channel is created in AnyRentApp. Trigger is MainActivity onStop/onStart.
    }

    fun onAppBackgrounded() {
        CartStore.persistToDisk()
        showIfNeeded()
    }

    fun onAppForegrounded() {
        cancel()
    }

    fun requestOpenCart() {
        _pendingOpenCart.value = true
    }

    fun consumeOpenCart(): Boolean {
        if (!_pendingOpenCart.value) return false
        _pendingOpenCart.value = false
        return true
    }

    fun cancel() {
        val app = AnyRentApp.instance ?: return
        NotificationManagerCompat.from(app).cancel(NOTIFICATION_ID)
    }

    private fun showIfNeeded() {
        val app = AnyRentApp.instance ?: return
        if (!SessionStore.isLoggedIn || CartStore.lines.value.isEmpty()) {
            cancel()
            return
        }
        ensureDraftChannel(app)
        if (!canPostNotifications(app)) {
            android.util.Log.w(TAG, "Skip draft pin: notifications disabled")
            Toast.makeText(app, R.string.draft_notify_permission, Toast.LENGTH_LONG).show()
            return
        }

        val lines = CartStore.lines.value
        val title = app.getString(
            if (CartStore.isEditing) R.string.draft_order_unsaved_title
            else R.string.draft_order_unfinished_title,
        )
        val customerName = CartStore.customer.value?.displayName.orEmpty().trim()
        val isSale = CartStore.orderType.value.equals("SALE", ignoreCase = true)
        val productName = lines.firstOrNull()?.product?.name.orEmpty().trim().ifEmpty { title }
        val itemLine = "$productName · ${app.getString(R.string.draft_live_item_count, CartStore.itemCount)}"
        val badge = if (isSale) {
            app.getString(R.string.sale)
        } else {
            val days = CartStore.rentalDaysInclusive()
            val unit = app.getString(
                if (days == 1) R.string.draft_chart_day_unit
                else R.string.draft_chart_days_unit,
            )
            "$days $unit"
        }
        val locale = Locale.getDefault()
        val dateFmt = DateTimeFormatter.ofPattern(
            if (locale.language.startsWith("vi")) "dd/MM" else "d MMM",
            locale,
        )
        val pickupText = CartStore.pickupDate.value.format(dateFmt)
        val returnText = CartStore.returnDate.value.format(dateFmt)
        val missingLabel = app.getString(R.string.draft_missing_customer)
        val price = formatMoney(CartStore.totalAmount)
        val customerLine = customerName.ifEmpty { missingLabel }
        val dateLine = if (isSale) badge else "$pickupText → $returnText · $badge"
        val plainBody = "$itemLine · $customerLine · $dateLine · $price"

        val intent = Intent(app, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(EXTRA_OPEN_CART, true)
        }
        val pending = PendingIntent.getActivity(
            app,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(app, AnyRentApp.DRAFT_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_cart)
            .setColor(ContextCompat.getColor(app, R.color.notify_brand))
            .setContentTitle(title)
            .setContentText("$itemLine · $price")
            .setStyle(NotificationCompat.BigTextStyle().bigText(plainBody))
            .setOngoing(true)
            .setAutoCancel(false)
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pending)

        runCatching {
            val expanded = RemoteViews(app.packageName, R.layout.notification_draft_expanded).apply {
                setTextViewText(R.id.notify_title, title)
                setTextViewText(R.id.notify_items, itemLine)
                setTextViewText(R.id.notify_badge, badge)
                setTextViewText(R.id.notify_price, price)
                bindCustomer(this, customerName, missingLabel)
                if (isSale) {
                    setViewVisibility(R.id.notify_ticket, View.GONE)
                } else {
                    setViewVisibility(R.id.notify_ticket, View.VISIBLE)
                    setTextViewText(R.id.notify_pickup_date, pickupText)
                    setTextViewText(R.id.notify_return_date, returnText)
                }
                setOnClickPendingIntent(R.id.notify_cta, pending)
            }
            builder.setCustomBigContentView(expanded)
        }

        try {
            NotificationManagerCompat.from(app).notify(NOTIFICATION_ID, builder.build())
            android.util.Log.i(TAG, "Pinned draft cart (${CartStore.itemCount} items)")
        } catch (e: Exception) {
            android.util.Log.w(TAG, "Could not pin draft notification: ${e.message}")
        }
    }

    private fun bindCustomer(views: RemoteViews, customerName: String, missingLabel: String) {
        if (customerName.isNotEmpty()) {
            views.setTextViewText(R.id.notify_customer, customerName)
            views.setViewVisibility(R.id.notify_customer, View.VISIBLE)
            views.setViewVisibility(R.id.notify_missing, View.GONE)
        } else {
            views.setTextViewText(R.id.notify_missing, missingLabel)
            views.setViewVisibility(R.id.notify_customer, View.GONE)
            views.setViewVisibility(R.id.notify_missing, View.VISIBLE)
        }
    }

    private fun ensureDraftChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                AnyRentApp.DRAFT_CHANNEL_ID,
                context.getString(R.string.draft_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = context.getString(R.string.draft_channel_desc)
                setSound(null, null)
                enableVibration(false)
                enableLights(false)
                setShowBadge(false)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            },
        )
    }

    private fun canPostNotifications(context: Context): Boolean {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }
}
