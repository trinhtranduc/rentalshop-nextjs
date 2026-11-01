package com.anyrent.pos.ui.orders.v2

import android.annotation.SuppressLint
import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import com.anyrent.pos.R
import com.anyrent.pos.domain.orders.OrderPhotoLogic
import com.anyrent.pos.ui.theme.DS
import java.io.File
import java.util.concurrent.Executors

private val TileSize = 64.dp

/** #1418 layout A: photos chosen so far, × to drop one, the two buttons until 3/3 (iOS `OrderPhotoBlockView`) */
@Composable
internal fun OrderPhotoBlock(
    photos: List<ByteArray>,
    compressing: Int,
    onCamera: () -> Unit,
    onLibrary: () -> Unit,
    onRemove: (Int) -> Unit,
    onPreview: (ByteArray) -> Unit,
) {
    val used = photos.size + compressing
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.order_photos_title), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted)
            Text(stringResource(R.string.order_photos_optional), fontSize = 12.sp, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
            Text(
                OrderPhotoLogic.countLabel(used),
                fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted,
                modifier = Modifier.testTag("orderPhotos.count"),
            )
        }
        if (used > 0) {
            Row(Modifier.padding(top = 6.dp, end = 6.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                photos.forEachIndexed { index, bytes ->
                    Box {
                        Thumb(bytes, TileSize) { onPreview(bytes) }
                        val remove = stringResource(R.string.order_photos_remove)
                        Box(
                            Modifier
                                .align(Alignment.TopEnd)
                                .offset(x = 6.dp, y = (-6).dp)
                                .size(24.dp)
                                .background(DS.Colors.Text, CircleShape)
                                .border(1.dp, Color.White, CircleShape)
                                .clickable { onRemove(index) }
                                .testTag("orderPhotos.remove.$index")
                                .semantics { contentDescription = remove },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Outlined.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        }
                    }
                }
                repeat(compressing) {
                    Box(
                        Modifier.size(TileSize).background(Color(0xFFE2E8F0), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center,
                    ) { CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) }
                }
            }
        }
        if (OrderPhotoLogic.canAdd(used)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PhotoButton(
                    stringResource(if (used == 0) R.string.order_photos_take else R.string.order_photos_take_more),
                    Icons.Outlined.CameraAlt, primary = true, tag = "orderPhotos.camera",
                    modifier = Modifier.weight(2f), onClick = onCamera,
                )
                PhotoButton(
                    stringResource(R.string.order_photos_library), Icons.Outlined.Image, primary = false, tag = "orderPhotos.library",
                    modifier = Modifier.weight(1.15f), onClick = onLibrary,
                )
            }
        } else {
            Text(
                stringResource(R.string.order_photos_full, OrderPhotoLogic.MAX_PHOTOS),
                fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted,
                modifier = Modifier.testTag("orderPhotos.full"),
            )
        }
    }
}

@Composable
private fun PhotoButton(
    text: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    primary: Boolean,
    tag: String,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    val tint = if (primary) DS.Colors.Primary else DS.Colors.Text
    Row(
        modifier
            .height(52.dp)
            .background(if (primary) Color(0xFFEFF6FF) else Color.White, shape)
            .border(BorderStroke(if (primary) 1.5.dp else 1.dp, if (primary) DS.Colors.Primary else Color(0xFFCBD5E1)), shape)
            .clickable(onClick = onClick)
            .testTag(tag)
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Text(
            text, color = tint, fontWeight = FontWeight.Bold, maxLines = 1,
            fontSize = if (primary) DS.TextSize.Input else DS.TextSize.Body,
            modifier = Modifier.padding(start = 6.dp),
        )
    }
}

/**
 * The section of the order detail: uploaded photos, those still waiting (faded), "Thêm" and the failure line.
 * There is no delete: an uploaded photo stays.
 */
@Composable
internal fun OrderPhotoTiles(
    urls: List<String>,
    waiting: List<File>,
    failed: Boolean,
    id: String,
    onPreview: (Any) -> Unit,
    onAdd: (() -> Unit)?,
    onRetry: () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            urls.forEach { url -> Thumb(url, TileSize) { onPreview(url) } }
            waiting.forEach { file ->
                Box(Modifier.alpha(0.45f).testTag("$id.waiting")) { Thumb(file, TileSize) { onPreview(file) } }
            }
            onAdd?.let { add ->
                Column(
                    Modifier
                        .size(TileSize)
                        .background(Color(0xFFEFF6FF), RoundedCornerShape(10.dp))
                        .border(1.dp, Color(0xFF93C5FD), RoundedCornerShape(10.dp))
                        .clickable(onClick = add)
                        .testTag("$id.add"),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Icon(Icons.Outlined.CameraAlt, contentDescription = null, tint = DS.Colors.Primary, modifier = Modifier.size(22.dp))
                    Text(stringResource(R.string.order_photos_add), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Primary)
                }
            }
        }
        if (failed) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFFFEDD5), RoundedCornerShape(10.dp))
                    .padding(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(R.string.order_photos_not_uploaded, waiting.size),
                    fontSize = DS.TextSize.Secondary, color = Color(0xFF9A3412),
                    modifier = Modifier.weight(1f).testTag("$id.failed"),
                )
                TextButton(onClick = onRetry, modifier = Modifier.testTag("$id.retry")) {
                    Text(stringResource(R.string.retry), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

/**
 * Full-screen camera of a condition photo: CameraX, as the image search (`ImageSearchScreen`). A shot goes straight to
 * the block, where × drops a bad one, so there is no review step. [onCaptured] gets a file in the cache.
 */
@SuppressLint("UnusedBoxWithConstraintsScope")
@Composable
internal fun OrderPhotoCamera(onDismiss: () -> Unit, onCaptured: (File) -> Unit, onError: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val capture = remember { ImageCapture.Builder().build() }
    val executor = remember { Executors.newSingleThreadExecutor() }
    var busy by remember { mutableStateOf(false) }
    DisposableEffect(Unit) {
        onDispose {
            runCatching { ProcessCameraProvider.getInstance(context).get().unbindAll() }
            executor.shutdown()
        }
    }
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    val view = PreviewView(ctx).apply { scaleType = PreviewView.ScaleType.FILL_CENTER }
                    val future = ProcessCameraProvider.getInstance(ctx)
                    future.addListener({
                        val provider = future.get()
                        val preview = Preview.Builder().build().also { it.surfaceProvider = view.surfaceProvider }
                        provider.unbindAll()
                        runCatching {
                            provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, capture)
                        }.onFailure { onError(it.message.orEmpty()) }
                    }, ContextCompat.getMainExecutor(ctx))
                    view
                },
            )
            IconButton(onClick = onDismiss, modifier = Modifier.align(Alignment.TopStart).padding(top = 36.dp, start = 8.dp).testTag("orderPhotos.camera.close")) {
                Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.cancel), tint = Color.White)
            }
            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(bottom = 28.dp)
                    .size(76.dp)
                    .border(4.dp, Color.White, CircleShape)
                    .padding(8.dp)
                    .background(if (busy) Color.Gray else Color.White, CircleShape)
                    .testTag("orderPhotos.camera.shutter")
                    .clickable(enabled = !busy) {
                        busy = true
                        takePhoto(context, capture, executor, onCaptured = { file ->
                            ContextCompat.getMainExecutor(context).execute { onCaptured(file) }
                        }, onFailed = { message ->
                            ContextCompat.getMainExecutor(context).execute {
                                busy = false
                                onError(message)
                            }
                        })
                    },
            )
        }
    }
}

private fun takePhoto(
    context: Context,
    capture: ImageCapture,
    executor: java.util.concurrent.Executor,
    onCaptured: (File) -> Unit,
    onFailed: (String) -> Unit,
) {
    val file = File.createTempFile("order_photo", ".jpg", context.cacheDir)
    capture.takePicture(
        ImageCapture.OutputFileOptions.Builder(file).build(),
        executor,
        object : ImageCapture.OnImageSavedCallback {
            override fun onImageSaved(output: ImageCapture.OutputFileResults) = onCaptured(file)

            override fun onError(exception: ImageCaptureException) {
                file.delete()
                onFailed(exception.message.orEmpty())
            }
        },
    )
}
