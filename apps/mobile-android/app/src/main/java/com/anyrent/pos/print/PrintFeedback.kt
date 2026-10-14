package com.anyrent.pos.print

import android.content.Context
import com.anyrent.pos.R

/** #970: one text for a failed print, on every print button and "In thử" (iOS `PrintFeedback`) */
object PrintFeedback {
    enum class Kind { NOT_CONFIGURED, CONNECT, RAW }

    fun kind(failure: ThermalPrinter.Result.Failure): Kind = when (failure.reason) {
        ThermalPrinter.FailureReason.NOT_CONFIGURED -> Kind.NOT_CONFIGURED
        ThermalPrinter.FailureReason.CONNECT -> Kind.CONNECT
        ThermalPrinter.FailureReason.OTHER -> Kind.RAW
    }

    /** "Chưa cấu hình máy in…", or "cannot connect to ip:port, check…", or the error text */
    fun message(context: Context, failure: ThermalPrinter.Result.Failure, config: ThermalPrinter.Config): String =
        when (kind(failure)) {
            Kind.NOT_CONFIGURED -> context.getString(R.string.printer_not_configured)
            Kind.CONNECT -> context.getString(R.string.printer_connect_failed, "${config.ip}:${config.port}")
            Kind.RAW -> failure.message
        }
}
