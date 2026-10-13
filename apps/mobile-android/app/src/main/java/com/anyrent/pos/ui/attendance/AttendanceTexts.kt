package com.anyrent.pos.ui.attendance

import android.content.Context
import com.anyrent.pos.R
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.domain.attendance.AttendanceLogic
import com.anyrent.pos.domain.attendance.AttendanceStatus
import com.anyrent.pos.domain.attendance.PunchRejection
import com.anyrent.pos.domain.attendance.PunchRejectionKind
import com.anyrent.pos.domain.attendance.PunchResult
import com.anyrent.pos.domain.error.ApiErrorMessages

/** Words of the attendance screens (#910, mockup "App (nhân viên)"); same copy as iOS #909 */
object AttendanceTexts {
    fun status(context: Context, status: AttendanceStatus): String = context.getString(
        when (status) {
            AttendanceStatus.NOT_IN -> R.string.attendance_status_not_in
            AttendanceStatus.IN_SHIFT -> R.string.attendance_status_in
            AttendanceStatus.DONE -> R.string.attendance_status_done
        },
    )

    /** Title and message of the one red card */
    fun rejection(context: Context, r: PunchRejection): Pair<String, String> = when (r.kind) {
        PunchRejectionKind.OUT_OF_RANGE -> context.getString(R.string.attendance_err_out_of_range) to
            if (r.distanceM != null && r.radiusM != null) context.getString(R.string.attendance_err_out_of_range_msg, r.distanceM, r.radiusM)
            else context.getString(R.string.attendance_err_out_of_range_msg_plain)
        PunchRejectionKind.MOCK_LOCATION -> context.getString(R.string.attendance_err_mock) to context.getString(R.string.attendance_err_mock_msg)
        PunchRejectionKind.QR_EXPIRED -> context.getString(R.string.attendance_err_qr_expired) to context.getString(R.string.attendance_err_qr_expired_msg)
        PunchRejectionKind.QR_WRONG_OUTLET -> context.getString(R.string.attendance_err_wrong_outlet) to
            (SessionStore.outletName?.takeIf { it.isNotBlank() }?.let { context.getString(R.string.attendance_err_wrong_outlet_msg, it) }
                ?: context.getString(R.string.attendance_err_wrong_outlet_msg_plain))
        PunchRejectionKind.GPS_INACCURATE -> context.getString(R.string.attendance_err_gps) to
            (r.accuracyM?.let { context.getString(R.string.attendance_err_gps_msg, it) } ?: context.getString(R.string.attendance_err_gps_msg_plain))
        PunchRejectionKind.NOT_CONFIGURED -> context.getString(R.string.attendance_err_not_configured) to
            context.getString(R.string.attendance_err_not_configured_msg)
        PunchRejectionKind.MODULE_OFF -> context.getString(R.string.attendance_err_module_off) to context.getString(R.string.attendance_err_module_off_msg)
        PunchRejectionKind.NO_LOCATION -> context.getString(R.string.attendance_err_no_location) to context.getString(R.string.attendance_err_no_location_msg)
        PunchRejectionKind.NOT_REQUIRED -> context.getString(R.string.attendance_err_not_required) to
            context.getString(R.string.attendance_err_not_required_msg)
        PunchRejectionKind.OTHER -> context.getString(R.string.attendance_err_other) to
            ApiErrorMessages.resolve(context, null, r.message.orEmpty())
    }

    /** #927 one line in the clock card: "✓ Đã vào ca 07:58 · Cách 11 m" / "✓ Đã ra ca 17:05 · 4,1 giờ" (as iOS) */
    fun cardSuccess(context: Context, p: PunchResult): String {
        val record = p.record
        val title = if (p.isIn) {
            context.getString(R.string.attendance_done_in, AttendanceLogic.hhmm(record?.checkInAt))
        } else {
            context.getString(R.string.attendance_done_out, AttendanceLogic.hhmm(record?.checkOutAt))
        }
        val detail = if (p.isIn) {
            p.distanceM?.let { context.getString(R.string.attendance_card_distance, it) }
        } else {
            AttendanceLogic.hours(record)?.let { context.getString(R.string.attendance_hours_value, AttendanceLogic.oneDecimal(it)) }
        }
        return listOfNotNull(title, detail).joinToString(" · ")
    }

    /** Title and detail of the green card */
    fun success(context: Context, p: PunchResult): Pair<String, String?> {
        val record = p.record
        return if (p.isIn) {
            context.getString(R.string.attendance_done_in, AttendanceLogic.hhmm(record?.checkInAt)) to
                if (p.distanceM != null && p.accuracyM != null) context.getString(R.string.attendance_done_in_detail, p.distanceM, p.accuracyM) else null
        } else {
            val hours = AttendanceLogic.hours(record)
            context.getString(R.string.attendance_done_out, AttendanceLogic.hhmm(record?.checkOutAt)) to
                hours?.let {
                    context.getString(
                        R.string.attendance_done_out_detail,
                        AttendanceLogic.oneDecimal(it),
                        AttendanceLogic.hhmm(record?.checkInAt),
                        AttendanceLogic.hhmm(record?.checkOutAt),
                    )
                }
        }
    }
}
