package com.anyrent.pos.ui.payment

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Environment
import android.widget.ImageView
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import com.anyrent.pos.R
import com.anyrent.pos.domain.payment.PaymentQr
import com.anyrent.pos.ui.common.formatMoney
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.google.zxing.common.BitMatrix
import java.io.File
import java.io.FileOutputStream

@Composable
fun PaymentQrDialog(
    qr: PaymentQr,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val bitmap = remember(qr.qrCodeString) { qrBitmap(qr.qrCodeString) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.payment_qr)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AndroidView(
                    factory = { ImageView(it).apply { contentDescription = "Payment QR code" } },
                    update = { it.setImageBitmap(bitmap) },
                    modifier = Modifier.size(280.dp),
                )
                Text(
                    if (qr.amount > 0) formatMoney(qr.amount)
                    else stringResource(R.string.scan_to_pay),
                    style = MaterialTheme.typography.titleLarge,
                )
                Text("${stringResource(R.string.order_number)}: ${qr.orderNumber}")
                Text("${stringResource(R.string.bank_name)}: ${qr.bankAccount.bankName}")
                Text("${stringResource(R.string.account_number)}: ${qr.bankAccount.accountNumber}")
                Text("${stringResource(R.string.account_holder)}: ${qr.bankAccount.accountHolderName}")
                qr.transferDescription?.let {
                    Text("${stringResource(R.string.transfer_description)}: $it")
                }
                Button(
                    onClick = {
                        runCatching { saveQr(context, bitmap, qr.orderNumber, cacheOnly = false) }
                            .onSuccess {
                                Toast.makeText(context, R.string.qr_saved, Toast.LENGTH_SHORT).show()
                            }
                            .onFailure {
                                Toast.makeText(context, it.message, Toast.LENGTH_SHORT).show()
                            }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.save_qr))
                }
                Button(
                    onClick = { shareQr(context, bitmap, qr) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.share_qr))
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.close)) }
        },
    )
}

private fun qrBitmap(payload: String, size: Int = 900): Bitmap {
    val matrix: BitMatrix = MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, size, size)
    val pixels = IntArray(size * size)
    for (y in 0 until size) {
        for (x in 0 until size) {
            pixels[y * size + x] = if (matrix[x, y]) 0xFF000000.toInt() else 0xFFFFFFFF.toInt()
        }
    }
    return Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).apply {
        setPixels(pixels, 0, size, 0, 0, size, size)
    }
}

private fun saveQr(
    context: Context,
    bitmap: Bitmap,
    orderNumber: String,
    cacheOnly: Boolean,
): File {
    val directory = if (cacheOnly) {
        File(context.cacheDir, "shared-qr")
    } else {
        File(context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "AnyRent")
    }
    check(directory.exists() || directory.mkdirs()) { "Could not create QR folder" }
    val safeOrderNumber = orderNumber.replace(Regex("[^A-Za-z0-9_-]"), "_")
    val file = File(directory, "payment-qr-$safeOrderNumber.png")
    FileOutputStream(file).use { output ->
        check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
            "Could not save QR image"
        }
    }
    return file
}

private fun shareQr(context: Context, bitmap: Bitmap, qr: PaymentQr) {
    val file = saveQr(context, bitmap, qr.orderNumber, cacheOnly = true)
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(
            Intent.EXTRA_TEXT,
            "${qr.orderNumber} · ${qr.bankAccount.bankName} · ${qr.bankAccount.accountNumber}",
        )
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, context.getString(R.string.share_qr)))
}
