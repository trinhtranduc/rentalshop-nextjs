package com.anyrent.pos.ui.attendance

import android.annotation.SuppressLint
import android.location.Location
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.anyrent.pos.BuildConfig
import com.anyrent.pos.R
import com.anyrent.pos.data.AttendanceApi
import com.anyrent.pos.data.PunchOutcome
import com.anyrent.pos.domain.attendance.PunchRejection
import com.anyrent.pos.domain.attendance.PunchRejectionKind
import com.anyrent.pos.ui.common.AppAlertConfirm
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * In-app QR scan (#910, mockup screen 3): full-screen camera, white rounded frame, "Đưa mã QR ở quầy vào khung" and
 * "Đang kiểm tra vị trí…". A location fix starts at once; the first QR read is sent with it to
 * `POST /api/attendance/punch`. Debug builds can type a code (emulators have no counter to film).
 */
@SuppressLint("UnsafeOptInUsageError")
@Composable
fun AttendanceScanScreen(onClose: () -> Unit, onResult: (PunchOutcome) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val handled = remember { AtomicBoolean(false) }
    val fix = remember { CompletableDeferred<Location?>() }
    var sending by remember { mutableStateOf(false) }
    var typing by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { fix.complete(AttendanceLocation.current(context)) }

    fun submit(code: String) {
        if (sending) return
        sending = true
        scope.launch {
            val location = fix.await()
            val outcome = if (location == null) {
                PunchOutcome.Rejected(PunchRejection(PunchRejectionKind.NO_LOCATION))
            } else {
                withContext(Dispatchers.IO) { AttendanceApi.punch(code, AttendanceLocation.toPunch(location)) }
            }
            onResult(outcome)
        }
    }

    val executor = remember { Executors.newSingleThreadExecutor() }
    DisposableEffect(Unit) { onDispose { executor.shutdown() } }

    Box(Modifier.fillMaxSize().background(Color(0xFF0F172A))) {
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val providerFuture = ProcessCameraProvider.getInstance(ctx)
                providerFuture.addListener({
                    val provider = providerFuture.get()
                    val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
                    val scanner = BarcodeScanning.getClient(BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build())
                    val analysis = ImageAnalysis.Builder().setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
                    analysis.setAnalyzer(executor) { proxy ->
                        val media = proxy.image
                        if (media == null || handled.get()) {
                            proxy.close()
                            return@setAnalyzer
                        }
                        scanner.process(InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees))
                            .addOnSuccessListener { codes ->
                                val raw = codes.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue?.trim()
                                if (!raw.isNullOrEmpty() && handled.compareAndSet(false, true)) submit(raw)
                            }
                            .addOnCompleteListener { proxy.close() }
                    }
                    runCatching {
                        provider.unbindAll()
                        provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                    }
                }, ContextCompat.getMainExecutor(ctx))
                previewView
            },
            modifier = Modifier.fillMaxSize(),
        )
        ScanFrame()
        IconButton(onClick = onClose, modifier = Modifier.statusBarsPadding().padding(8.dp).align(Alignment.TopStart)) {
            Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.close), tint = Color.White)
        }
        Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 120.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(stringResource(R.string.attendance_scan_prompt), color = Color.White, fontSize = 15.sp, textAlign = TextAlign.Center)
            Text(
                stringResource(if (sending) R.string.attendance_scan_sending else R.string.attendance_scan_locating),
                color = Color.White.copy(alpha = 0.8f), fontSize = 14.sp, textAlign = TextAlign.Center,
            )
            if (sending) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.padding(top = 8.dp).size(24.dp))
            if (BuildConfig.DEBUG && !sending) {
                TextButton(onClick = { typing = true }, modifier = Modifier.testTag("attendance-debug-code")) {
                    Text(stringResource(R.string.attendance_scan_debug), color = Color.White)
                }
            }
        }
    }

    if (typing) {
        var code by remember { mutableStateOf("") }
        AppAlertConfirm(
            title = stringResource(R.string.attendance_scan_debug),
            message = "",
            confirmLabel = stringResource(R.string.attendance_scan_debug_send),
            confirmEnabled = code.isNotBlank(),
            onDismiss = { typing = false },
            onConfirm = {
                typing = false
                if (handled.compareAndSet(false, true)) submit(code.trim())
            },
        ) {
            OutlinedTextField(value = code, onValueChange = { code = it }, singleLine = true, modifier = Modifier.fillMaxWidth().testTag("attendance-debug-input"))
        }
    }
}

/** 210dp white rounded frame at 38% height, the rest dimmed (mockup `.frame`) */
@Composable
private fun ScanFrame() {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val side = 210.dp
        val centerY = maxHeight * 0.38f
        val density = LocalDensity.current
        Canvas(Modifier.fillMaxSize().graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)) {
            drawRect(Color.Black.copy(alpha = 0.35f))
            val s = with(density) { side.toPx() }
            val top = with(density) { centerY.toPx() } - s / 2
            drawRoundRect(
                color = Color.Transparent,
                topLeft = Offset((size.width - s) / 2, top),
                size = Size(s, s),
                cornerRadius = CornerRadius(with(density) { 22.dp.toPx() }),
                blendMode = BlendMode.Clear,
            )
        }
        Box(
            Modifier.align(Alignment.TopCenter).offset(y = centerY - side / 2).size(side)
                .border(4.dp, Color.White, RoundedCornerShape(22.dp)),
        )
    }
}
