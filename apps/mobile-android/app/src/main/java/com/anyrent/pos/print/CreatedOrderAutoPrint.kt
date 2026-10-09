package com.anyrent.pos.print

import android.content.Context
import android.util.Log
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * #700 (owner): after Tạo đơn, print the new order's bill when a bill printer is saved in Settings → Máy in.
 * No printer: nothing. A failed print shows no message; the order flow does not wait for it (iOS
 * `CreatedOrderAutoPrint`).
 */
object CreatedOrderAutoPrint {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun shouldPrint(printerIp: String?): Boolean = !printerIp.isNullOrBlank()

    fun run(context: Context, orderId: Int) {
        val app = context.applicationContext
        val prefs = app.getSharedPreferences("anyrent.printer", 0)
        val config = ThermalPrinter.configFromPrefs(
            prefs,
            app.getString(R.string.bill_bank_qr_title),
            app.getString(R.string.bill_bank_qr_account),
        )
        if (!shouldPrint(config.ip)) return
        scope.launch {
            // The bill needs the full order (customer, outlet, items), as "In hoá đơn" on the detail prints it
            val detail = ApiClient.get().getOrder(orderId).getOrNull() ?: return@launch
            val result = ThermalPrinter.printOrder(config, detail)
            if (result is ThermalPrinter.Result.Failure) Log.i("AutoPrint", "skipped: ${result.message}")
        }
    }
}
