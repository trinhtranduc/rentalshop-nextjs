package com.anyrent.pos.push

import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.anyrent.pos.AnyRentApp
import com.anyrent.pos.MainActivity
import com.anyrent.pos.R
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.ui.inbox.InboxUnread
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class AnyRentFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        Log.i(TAG, "New FCM token")
        PushRegistrar.register(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.app_name)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: ""
        // #910: a schedule change opens "Ca và công của tôi", never an order
        val shiftChanged = AttendancePush.isShiftChanged(message.data["type"])
        // #1124: a booking request opens its detail (it has no orderId)
        val bookingRequestId = com.anyrent.pos.domain.booking.BookingLogic.requestIdFromPush(message.data)
        val orderId = if (shiftChanged || bookingRequestId != null) null else message.data["orderId"]?.toIntOrNull()
        InboxUnread.invalidate() // #674: the home badge asks the server again (the row is already saved)
        if (orderId != null) {
            SessionStore.pendingOrderId = orderId
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            if (orderId != null) putExtra(MainActivity.EXTRA_ORDER_ID, orderId)
            if (shiftChanged) putExtra(AttendancePush.EXTRA_OPEN_MY_SHIFTS, true)
            if (bookingRequestId != null) putExtra(BookingPush.EXTRA_BOOKING_REQUEST_ID, bookingRequestId)
        }
        val pending = PendingIntent.getActivity(
            this,
            orderId ?: bookingRequestId?.let { BOOKING_REQUEST_BASE + it } ?: if (shiftChanged) SHIFT_CHANGED_REQUEST else 0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, AnyRentApp.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pending)
            .build()

        try {
            NotificationManagerCompat.from(this).notify(orderId ?: System.currentTimeMillis().toInt(), notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "Notification permission missing: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "AnyRentFCM"
        private const val SHIFT_CHANGED_REQUEST = 910
        /** PendingIntent request codes of booking pushes, apart from order ids */
        private const val BOOKING_REQUEST_BASE = 1_124_000_000
    }
}
