package com.anyrent.pos.ui.orders

import android.content.Context
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.SessionStore
import com.anyrent.pos.data.model.OrderDetail
import com.anyrent.pos.domain.orders.OrderShareModel
import com.anyrent.pos.domain.products.blockLines
import com.anyrent.pos.print.ThermalPrinter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Order detail ⋯ → Chia sẻ đơn and the old preview's share (#640): the share image of [order] (spec
 * `.agent/changes/640-share-image/spec.md`), drawn by [OrderShareRenderer], then the system share sheet.
 * The VietQR card follows the printed bill: the "QR chuyển khoản trên hoá đơn" switch and the bill's account.
 */
internal suspend fun shareOrderReceipt(context: Context, order: OrderDetail) {
    val printBankQr = com.anyrent.pos.domain.print.OutletPrintSettings.printsBankQr(order.outletPrintBankQr) // #1308: the order's outlet
    val account = if (printBankQr) withContext(Dispatchers.IO) { ThermalPrinter.lookupBankAccount(order) } else null
    // #1354: read the shop's switch right before the image (at most once a minute; 3 s at most, then the saved value)
    withTimeoutOrNull(3_000) { withContext(Dispatchers.IO) { ApiClient.get().refreshShareOrderNote() } }
    val model = OrderShareModel.from(
        order = order,
        shop = shareShop(order.outletName),
        vi = context.shareIsVietnamese(),
        printBankQr = printBankQr,
        bankAccount = account,
        blockFormula = { it.blockLines(context.resources)?.second },
        blockSummary = { it.blockLines(context.resources)?.first },
        showOrderNote = SessionStore.shareOrderNote,
    )
    shareOrderImage(context, model, subject = order.summary.orderNumber)
}
