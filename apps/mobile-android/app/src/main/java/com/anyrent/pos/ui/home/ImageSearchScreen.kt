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
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.anyrent.pos.data.model.CartLine
import com.anyrent.pos.domain.products.ImageSearchResults
import com.anyrent.pos.domain.products.ProductImageViewerRequest
import com.anyrent.pos.domain.products.ProductImages
import com.anyrent.pos.domain.products.ProductRowLogic
import com.anyrent.pos.ui.common.FullScreenImagePreview
import com.anyrent.pos.ui.home.v2.ProductRow
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
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
import com.anyrent.pos.ui.common.fileToImageSearchJpeg
import com.anyrent.pos.domain.error.AppError
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.InterruptedIOException
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.roundToInt

@SuppressLint("UnsafeOptInUsageError")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageSearchScreen(
    onDismiss: () -> Unit,
    /** #654: tapping a result row opens the product detail (same as iOS) */
    onOpenProduct: (Product) -> Unit,
    /** #672: "Tìm bằng tên" on empty results; by default it just closes image search */
    onSearchByName: () -> Unit = onDismiss,
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
    /** #672: the picked photo (Uri) for the results header; a camera shot uses [frozenPreview] */
    var pickedPhoto by remember { mutableStateOf<Uri?>(null) }
    var viewer by remember { mutableStateOf<ProductImageViewerRequest?>(null) }
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
                        fileToImageSearchJpeg(cache)
                    } finally {
                        cache.delete()
                    }
                }.mapCatching { jpeg ->
                    ApiClient.get().searchProductsByImage(jpeg).getOrThrow()
                }
            }
            searching = false
            result.onSuccess {
                pickedPhoto = uri
                results = it.items
            }.onFailure {
                analyzing.set(true)
                error = imageSearchErrorMessage(context, it)
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
            }.onFailure {
                frozenPreview?.recycle()
                frozenPreview = null
                analyzing.set(true)
                error = imageSearchErrorMessage(context, it)
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
        pickedPhoto = null
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
        val lines by CartStore.lines.collectAsState()
        val added = stringResource(R.string.added_to_cart)
        ModalBottomSheet(
            onDismissRequest = { resumeCamera() },
            sheetState = sheetState,
            containerColor = Color.White,
        ) {
            ImageSearchResultsSheet(
                products = products,
                photo = pickedPhoto ?: frozenPreview,
                lines = lines,
                onRetake = {
                    scope.launch { sheetState.hide() }.invokeOnCompletion { resumeCamera() }
                },
                onSearchByName = {
                    resumeCamera()
                    onSearchByName()
                },
                onOpen = onOpenProduct,
                // #472: the thumbnail opens the photo full screen; without a photo, detail like the row
                onImage = { product -> viewer = ProductImages.thumbnailTap(product) ?: run { onOpenProduct(product); null } },
                onAdd = { product ->
                    CartStore.addProduct(product)
                    Toast.makeText(context, added, Toast.LENGTH_SHORT).show()
                },
            )
        }
    }
    viewer?.let { FullScreenImagePreview(models = it.urls, startIndex = it.startIndex, onDismiss = { viewer = null }) }

    error?.let { message ->
        AppAlertError(message = message, onDismiss = { error = null })
    }
}

/**
 * #672: header with the photo just taken and "Chụp lại", then the Products home rows ([ProductRow]) in API
 * order; no matches shows tips with "Chụp lại" and "Tìm bằng tên". Same layout as iOS
 * `ImageSearchResultsViewController`.
 */
@Composable
private fun ImageSearchResultsSheet(
    products: List<Product>,
    photo: Any?,
    lines: List<CartLine>,
    onRetake: () -> Unit,
    onSearchByName: () -> Unit,
    onOpen: (Product) -> Unit,
    onImage: (Product) -> Unit,
    onAdd: (Product) -> Unit,
) {
    val content = ImageSearchResults.content(products.size)
    Column(Modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = DS.Spacing.lg).padding(bottom = DS.Spacing.lg),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(Modifier.size(52.dp).clip(RoundedCornerShape(12.dp)).background(V2Colors.Chip)) {
                if (photo != null) {
                    AsyncImage(model = photo, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                val title = when (val t = ImageSearchResults.title(products.size)) {
                    is ImageSearchResults.Title.Count -> pluralStringResource(R.plurals.image_search_results_title, t.count, t.count)
                    ImageSearchResults.Title.NoMatch -> stringResource(R.string.image_search_results_empty_title)
                }
                Text(
                    title,
                    fontSize = DS.TextSize.Amount,
                    fontWeight = FontWeight.Bold,
                    color = DS.Colors.Text,
                    maxLines = 2,
                    modifier = Modifier.semantics { heading() },
                )
                Text(stringResource(R.string.image_search_results_subtitle), fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted, maxLines = 1)
            }
            if (content == ImageSearchResults.Content.LIST) {
                Row(
                    Modifier
                        .height(44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(1.dp, V2Colors.Border, RoundedCornerShape(12.dp))
                        .clickable(role = Role.Button, onClick = onRetake)
                        .padding(start = 12.dp, end = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(Icons.Outlined.PhotoCamera, contentDescription = null, tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Sm))
                    Text(stringResource(R.string.image_search_retake), fontSize = DS.TextSize.Body, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
                }
            }
        }
        HorizontalDivider(color = DS.Colors.Border)
        when (content) {
            ImageSearchResults.Content.LIST -> LazyColumn(Modifier.fillMaxWidth()) {
                items(products, key = { it.id }) { product ->
                    ProductRow(
                        product = product,
                        inCart = ProductRowLogic.cartCount(product.id, lines),
                        onOpen = { onOpen(product) },
                        onImage = { onImage(product) },
                        onAdd = { onAdd(product) },
                    )
                }
            }
            ImageSearchResults.Content.EMPTY -> NoMatchState(onRetake = onRetake, onSearchByName = onSearchByName)
        }
    }
}

@Composable
private fun NoMatchState(onRetake: () -> Unit, onSearchByName: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = DS.Spacing.xl)
            .padding(top = 40.dp, bottom = DS.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.size(64.dp).clip(CircleShape).background(Color(0xFFEEF2FF)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Search, contentDescription = null, tint = Color(0xFF3730A3), modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.height(16.dp))
        Text(
            stringResource(R.string.image_search_empty_headline),
            fontSize = DS.TextSize.Amount,
            fontWeight = FontWeight.Bold,
            color = DS.Colors.Text,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            stringResource(R.string.image_search_empty_message),
            fontSize = DS.TextSize.Body,
            color = DS.Colors.TextMuted,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(R.string.image_search_tip_whole, R.string.image_search_tip_background, R.string.image_search_tip_photo).forEach { tip ->
                Text("•  " + stringResource(tip), fontSize = DS.TextSize.Body, color = DS.Colors.Text)
            }
        }
        Spacer(Modifier.height(28.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(DS.Colors.Primary)
                .clickable(role = Role.Button, onClick = onRetake),
            contentAlignment = Alignment.Center,
        ) {
            Text(stringResource(R.string.image_search_retake), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = Color.White)
        }
        Spacer(Modifier.height(12.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(14.dp))
                .border(1.dp, V2Colors.Border, RoundedCornerShape(14.dp))
                .clickable(role = Role.Button, onClick = onSearchByName),
            contentAlignment = Alignment.Center,
        ) {
            Text(stringResource(R.string.image_search_by_name), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold, color = DS.Colors.Text)
        }
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

/**
 * #654: server codes come localized from [com.anyrent.pos.domain.error.ApiErrorMessages]; when the app's own
 * 30 s timeout fires first, show the same text as the server's SEARCH_TIMEOUT instead of "timeout".
 */
private fun imageSearchErrorMessage(context: android.content.Context, error: Throwable): String {
    val timedOut = error is AppError.Network && error.cause is InterruptedIOException
    if (timedOut) return context.getString(R.string.api_error_search_timeout)
    return error.message?.takeIf { it.isNotBlank() } ?: context.getString(R.string.request_failed)
}

private fun rotateBitmap(source: Bitmap, degrees: Int): Bitmap {
    val normalized = ((degrees % 360) + 360) % 360
    if (normalized == 0) return source
    val matrix = Matrix().apply { postRotate(normalized.toFloat()) }
    val rotated = Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    if (rotated !== source) source.recycle()
    return rotated
}
