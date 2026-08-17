package com.anyrent.pos.ui.home

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.net.Uri
import android.provider.Settings
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.data.ApiClient
import com.anyrent.pos.data.CartStore
import com.anyrent.pos.data.model.Product
import com.anyrent.pos.ui.common.AppAlertError
import com.anyrent.pos.ui.common.bitmapToImageSearchJpeg
import com.anyrent.pos.ui.common.copyUriToCacheFile
import com.anyrent.pos.ui.common.fileToJpegBytes
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.roundToInt

@SuppressLint("UnsafeOptInUsageError")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageSearchScreen(
    onDismiss: () -> Unit,
    onCheckAvailability: (Product) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val imageCapture = remember {
        ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build()
    }
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val analyzing = remember { AtomicBoolean(true) }
    val lastAnalysisMs = remember { AtomicLong(0) }

    var hasCamera by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    var quality by remember { mutableStateOf<ImageQualityResult?>(null) }
    var searching by remember { mutableStateOf(false) }
    var frozenPreview by remember { mutableStateOf<Bitmap?>(null) }
    var results by remember { mutableStateOf<List<Product>?>(null) }
    var resultsTotal by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf<String?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> hasCamera = granted }

    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        analyzing.set(false)
        searching = true
        scope.launch {
            val result = withContext(Dispatchers.IO) {
                runCatching {
                    val cache = context.copyUriToCacheFile(uri, "search")
                    try {
                        fileToJpegBytes(cache, maxSide = 1024, maxBytes = 20 * 1024)
                    } finally {
                        cache.delete()
                    }
                }.mapCatching { jpeg ->
                    ApiClient.get().searchProductsByImage(jpeg).getOrThrow()
                }
            }
            searching = false
            result.onSuccess {
                results = it.items
                resultsTotal = it.total ?: it.items.size
            }.onFailure {
                analyzing.set(true)
                error = it.message
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            analyzing.set(false)
            cameraExecutor.shutdown()
            frozenPreview?.recycle()
        }
    }

    fun searchJpeg(jpeg: ByteArray) {
        scope.launch {
            searching = true
            analyzing.set(false)
            val result = withContext(Dispatchers.IO) {
                ApiClient.get().searchProductsByImage(jpeg)
            }
            searching = false
            result.onSuccess {
                results = it.items
                resultsTotal = it.total ?: it.items.size
            }.onFailure {
                frozenPreview?.recycle()
                frozenPreview = null
                analyzing.set(true)
                error = it.message
            }
        }
    }

    fun capture() {
        imageCapture.takePicture(
            cameraExecutor,
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    var bmp = image.toBitmap()
                    bmp = rotateBitmap(bmp, image.imageInfo.rotationDegrees)
                    image.close()
                    scope.launch {
                        frozenPreview?.recycle()
                        frozenPreview = bmp
                        val jpeg = withContext(Dispatchers.Default) {
                            bitmapToImageSearchJpeg(bmp)
                        }
                        searchJpeg(jpeg)
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    error = exception.message
                }
            },
        )
    }

    fun resumeCamera() {
        results = null
        frozenPreview?.recycle()
        frozenPreview = null
        analyzing.set(true)
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        if (!hasCamera) {
            androidx.compose.material3.Button(
                onClick = {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                        PackageManager.PERMISSION_DENIED
                    ) {
                        permissionLauncher.launch(Manifest.permission.CAMERA)
                    } else {
                        context.startActivity(
                            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = Uri.fromParts("package", context.packageName, null)
                            },
                        )
                    }
                },
                modifier = Modifier.align(Alignment.Center),
            ) { Text(stringResource(R.string.grant_camera_permission)) }
        } else {
            AndroidView(
                factory = { ctx ->
                    val previewView = PreviewView(ctx).apply {
                        scaleType = PreviewView.ScaleType.FILL_CENTER
                    }
                    val future = ProcessCameraProvider.getInstance(ctx)
                    future.addListener({
                        val provider = future.get()
                        val preview = Preview.Builder().build().also {
                            it.surfaceProvider = previewView.surfaceProvider
                        }
                        val analysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                        analysis.setAnalyzer(cameraExecutor) { proxy ->
                            val now = android.os.SystemClock.elapsedRealtime()
                            if (!analyzing.get() || now - lastAnalysisMs.get() < 500L) {
                                proxy.close()
                                return@setAnalyzer
                            }
                            lastAnalysisMs.set(now)
                            try {
                                var bmp = proxy.toBitmap()
                                bmp = rotateBitmap(bmp, proxy.imageInfo.rotationDegrees)
                                val frame = ImageQualityAnalyzer.analyze(bmp)
                                bmp.recycle()
                                previewView.post { quality = frame }
                            } catch (_: Exception) {
                            } finally {
                                proxy.close()
                            }
                        }
                        provider.unbindAll()
                        provider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            analysis,
                            imageCapture,
                        )
                    }, ContextCompat.getMainExecutor(ctx))
                    previewView
                },
                modifier = Modifier.fillMaxSize(),
            )
        }

        frozenPreview?.let { bmp ->
            AsyncImage(
                model = bmp,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }

        if (frozenPreview == null && hasCamera) {
            ProductCenterOverlay(quality = quality)
        }

        Box(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing),
        ) {
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp)
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f)),
            ) {
                Icon(Icons.Default.Close, contentDescription = stringResource(R.string.close), tint = Color.White)
            }

            IconButton(
                onClick = {
                    galleryLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                    )
                },
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 20.dp, bottom = 40.dp)
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f)),
            ) {
                Icon(
                    Icons.Default.PhotoLibrary,
                    contentDescription = stringResource(R.string.photo_library),
                    tint = Color.White,
                )
            }

            IconButton(
                onClick = { if (!searching) capture() },
                enabled = hasCamera && !searching,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 36.dp)
                    .size(70.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f)),
            ) {
                Icon(
                    Icons.Default.PhotoCamera,
                    contentDescription = stringResource(R.string.image_search_capture),
                    tint = Color.White,
                    modifier = Modifier.size(32.dp),
                )
            }
        }

        if (searching) {
            Box(
                Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.35f)),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = Color.White)
            }
        }
    }

    results?.let { products ->
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = false)
        ModalBottomSheet(
            onDismissRequest = { resumeCamera() },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.surface,
        ) {
            Text(
                if (products.isEmpty()) {
                    stringResource(R.string.image_search_empty)
                } else {
                    stringResource(R.string.image_search_results, resultsTotal)
                },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                style = MaterialTheme.typography.titleLarge,
            )
            if (products.isEmpty()) {
                Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
                    Text(
                        stringResource(R.string.image_search_empty),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    items(products, key = { it.id }) { product ->
                        ProductCard(
                            product = product,
                            onClick = {},
                            onEdit = {},
                            onDelete = {},
                            onCheckAvailability = { onCheckAvailability(product) },
                            showManageActions = false,
                            onAddToCart = {
                                CartStore.addProduct(product)
                                Toast.makeText(
                                    context,
                                    context.getString(R.string.added_to_cart),
                                    Toast.LENGTH_SHORT,
                                ).show()
                            },
                        )
                    }
                }
            }
        }
    }

    error?.let { message ->
        AppAlertError(message = message, onDismiss = { error = null })
    }
}

@Composable
private fun ProductCenterOverlay(quality: ImageQualityResult?) {
    val density = LocalDensity.current
    BoxWithConstraints(Modifier.fillMaxSize()) {
        quality?.productCenter?.let { (nx, ny) ->
            val sizePx = with(density) { 16.dp.roundToPx() }
            val x = (nx * constraints.maxWidth) - sizePx / 2f
            val y = (ny * constraints.maxHeight) - sizePx / 2f
            Box(
                Modifier
                    .offset { IntOffset(x.roundToInt(), y.roundToInt()) }
                    .size(16.dp)
                    .border(2.dp, Color.White, CircleShape),
            )
        }
    }
}

private fun rotateBitmap(source: Bitmap, degrees: Int): Bitmap {
    val normalized = ((degrees % 360) + 360) % 360
    if (normalized == 0) return source
    val matrix = Matrix().apply { postRotate(normalized.toFloat()) }
    val rotated = Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    if (rotated !== source) source.recycle()
    return rotated
}
