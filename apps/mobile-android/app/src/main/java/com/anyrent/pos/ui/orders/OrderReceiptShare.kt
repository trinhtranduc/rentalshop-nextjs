package com.anyrent.pos.ui.orders

import android.content.Context
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.orders.OrderShareModel
import com.anyrent.pos.print.ThermalPrinter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Order detail ⋯ → Chia sẻ đơn and the old preview's share (#640): the share image of [order] (spec
 * `.agent/changes/640-share-image/spec.md`), drawn by [OrderShareRenderer], then the system share sheet.
 * The VietQR card follows the printed bill: the "QR chuyển khoản trên hoá đơn" switch and the bill's account.
 */
internal suspend fun shareOrderReceipt(context: Context, order: OrderDetail) {
    val printBankQr = context.getSharedPreferences("anyrent.printer", 0).getBoolean(ThermalPrinter.KEY_PRINT_BANK_QR, false)
    val account = if (printBankQr) withContext(Dispatchers.IO) { ThermalPrinter.lookupBankAccount(order) } else null
    val model = OrderShareModel.from(
        order = order,
        shop = shareShop(order.outletName),
        vi = context.shareIsVietnamese(),
        printBankQr = printBankQr,
        bankAccount = account,
    )
    shareOrderImage(context, model, subject = order.summary.orderNumber)
}
