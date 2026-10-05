package com.anyrent.pos.ui.orders.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.domain.notifications.NoteEditorLogic
import com.anyrent.pos.domain.orders.OrderDetailLogic
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS
import java.io.File

/**
 * Note editor of the new UI (#477, board GC-ghi-chu): full screen, X (discard) + "Ghi chú #0057", "Nội dung"
 * field, 72dp photo tiles with a × badge, dashed "Thêm" tile, "Lưu ghi chú" pinned above the keyboard.
 * State lives with the caller (the gallery round-trip must not drop it). [showPhotos] false = cart (text only).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun NoteEditorV2(
    orderNumber: String?,
    text: String,
    onTextChange: (String) -> Unit,
    busy: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onSave: () -> Unit,
    showPhotos: Boolean = true,
    kept: List<String> = emptyList(),
    files: List<File> = emptyList(),
    onRemoveKept: (String) -> Unit = {},
    onRemoveFile: (File) -> Unit = {},
    onAdd: () -> Unit = {},
    onPreview: (Any) -> Unit = {},
) {
    val max = OrderDetailLogic.MAX_NOTE_PHOTOS
    val count = kept.size + files.size
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Column(
            Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding().imePadding(),
        ) {
            // Header
            Row(
                Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.notes_v2_discard), tint = DS.Colors.Text, modifier = Modifier.size(DS.Icon.Lg))
                }
                Text(
                    buildAnnotatedString {
                        append(stringResource(R.string.notes))
                        NoteEditorLogic.titleSuffix(orderNumber)?.let { suffix ->
                            withStyle(SpanStyle(fontSize = DS.TextSize.Body, fontWeight = FontWeight.Medium, color = DS.Colors.TextMuted)) {
                                append(" $suffix")
                            }
                        }
                    },
                    fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.semantics { heading() },
                )
            }
            HorizontalDivider(color = DS.Colors.Border, thickness = 1.dp)

            Column(
                Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                NoteContentField(text, onTextChange)
                if (showPhotos) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(stringResource(R.string.notes_v2_photos), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text, modifier = Modifier.weight(1f))
                            Text(stringResource(R.string.detail_photos_count, count, max), fontSize = DS.TextSize.Secondary, color = Color(0xFF64748B))
                        }
                        FlowRow(
                            Modifier.padding(top = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            kept.forEach { url -> PhotoTile(url, { onPreview(url) }) { onRemoveKept(url) } }
                            files.forEach { file -> PhotoTile(file, { onPreview(file) }) { onRemoveFile(file) } }
                            if (NoteEditorLogic.canAdd(count, max)) AddTile(onAdd)
                        }
                        Text(stringResource(R.string.notes_v2_photo_hint), fontSize = DS.TextSize.Secondary, color = Color(0xFF64748B))
                    }
                }
                error?.let { Text(it, color = DS.Status.Late.text, fontSize = DS.TextSize.Secondary) }
            }

            // Pinned save: rides on the keyboard (imePadding above), else above the navigation bar
            HorizontalDivider(color = DS.Colors.Border, thickness = 1.dp)
            Box(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp)) {
                Button(
                    onClick = onSave,
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary, contentColor = Color.White),
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
                    else Text(stringResource(R.string.notes_v2_save), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

/** 140dp area: 12dp radius, slate border; focused = 1.5dp blue border + 3dp light blue ring */
@Composable
private fun NoteContentField(text: String, onTextChange: (String) -> Unit) {
    val label = stringResource(R.string.notes_v2_content)
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(label, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        BasicTextField(
            value = text,
            onValueChange = onTextChange,
            interactionSource = interaction,
            textStyle = TextStyle(fontSize = DS.TextSize.Input, lineHeight = 24.sp, color = DS.Colors.Text),
            cursorBrush = SolidColor(DS.Colors.Primary),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
            modifier = Modifier
                .fillMaxWidth()
                .height(146.dp)
                .border(3.dp, if (focused) Color(0xFFDBEAFE) else Color.Transparent, RoundedCornerShape(15.dp))
                .padding(3.dp)
                .border(1.5.dp, if (focused) DS.Colors.Primary else V2Colors.Border, RoundedCornerShape(12.dp))
                .padding(horizontal = 14.dp, vertical = 12.dp)
                .semantics { contentDescription = label },
        )
    }
}

/** 72dp photo; tap opens the full-screen viewer, the dark × badge at the corner removes it */
@Composable
private fun PhotoTile(model: Any, onOpen: () -> Unit, onRemove: () -> Unit) {
    Box(Modifier.size(72.dp)) {
        AsyncImage(
            model = model,
            contentDescription = stringResource(R.string.notes_v2_photo),
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFE2E8F0))
                .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                .clickable(onClick = onOpen),
        )
        Box(
            Modifier
                .align(Alignment.TopEnd)
                .offset(x = 6.dp, y = (-6).dp)
                .size(24.dp)
                .background(Color.White, CircleShape)
                .padding(2.dp)
                .background(DS.Colors.Text, CircleShape)
                .clickable(role = Role.Button, onClick = onRemove),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Close, contentDescription = stringResource(R.string.delete), tint = Color.White, modifier = Modifier.size(14.dp))
        }
    }
}

/** Dashed "Thêm" tile: camera glyph over the word */
@Composable
private fun AddTile(onAdd: () -> Unit) {
    val dash = Color(0xFF94A3B8)
    Column(
        Modifier
            .size(72.dp)
            .background(V2Colors.Section, RoundedCornerShape(12.dp))
            .drawBehind {
                drawRoundRect(
                    color = dash,
                    style = Stroke(width = 1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 4.dp.toPx()))),
                    cornerRadius = CornerRadius(12.dp.toPx()),
                )
            }
            .clickable(role = Role.Button, onClick = onAdd),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Outlined.PhotoCamera, contentDescription = stringResource(R.string.add_photos), tint = DS.Colors.Primary, modifier = Modifier.size(DS.Icon.Lg))
        Spacer(Modifier.height(2.dp))
        Text(stringResource(R.string.notes_v2_add), fontSize = DS.TextSize.Secondary, fontWeight = FontWeight.SemiBold, color = DS.Colors.Primary)
    }
}
