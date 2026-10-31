package com.anyrent.pos.ui.orders.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.domain.orders.OrderActionSheet
import com.anyrent.pos.ui.theme.DS

/**
 * #519 ⋯ sheet of the order detail (board CT-thao-tac): only actions that are not already a button on the screen,
 * then a separate red group (Huỷ đơn, Xoá đơn when allowed). [rows] comes from [OrderActionSheet.rows]. #930: no icons.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun OrderActionsSheet(
    rows: OrderActionSheet.Rows,
    /** "Máy in 192.168.1.199"; null = no subtitle */
    printerSubtitle: String?,
    notes: String?,
    notePhotos: Int,
    /** "6 lần thay đổi · gần nhất 15:10 hôm nay"; null while unknown or without changes */
    historySubtitle: String?,
    onDismiss: () -> Unit,
    onAction: (OrderActionSheet.Action) -> Unit,
) {
    val notesSubtitle = OrderActionSheet.notesSubtitle(
        notes,
        notePhotos,
        OrderActionSheet.NotesTexts(
            withText = stringResource(R.string.order_sheet_notes_with_text),
            photos = pluralStringResource(R.plurals.order_sheet_notes_photos, notePhotos.coerceAtLeast(1)),
            photosOnly = pluralStringResource(R.plurals.order_sheet_notes_photos_only, notePhotos.coerceAtLeast(1)),
            add = stringResource(R.string.order_sheet_notes_add),
        ),
    )
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DS.Colors.Surface,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(
            Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp).padding(bottom = 20.dp),
        ) {
            // #1395: the title and the close button (the order number stays on the screen's top bar, #1297)
            OrderSheetTitle(stringResource(R.string.order_sheet_title_actions)) {
                val closeLabel = stringResource(R.string.close)
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).clickable(onClickLabel = closeLabel, onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Close, contentDescription = closeLabel, tint = DS.Colors.TextMuted, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.height(6.dp))
            rows.main.forEach { action ->
                when (action) {
                    OrderActionSheet.Action.PRINT -> ActionRow(stringResource(R.string.order_sheet_print), printerSubtitle) { onAction(action) }
                    OrderActionSheet.Action.NOTES -> ActionRow(stringResource(R.string.order_sheet_notes), notesSubtitle) { onAction(action) }
                    OrderActionSheet.Action.HISTORY -> ActionRow(stringResource(R.string.order_sheet_history), historySubtitle ?: stringResource(R.string.order_sheet_history_hint)) { onAction(action) }
                    OrderActionSheet.Action.EDIT -> ActionRow(stringResource(R.string.order_sheet_edit), stringResource(R.string.order_sheet_edit_hint)) { onAction(action) }
                    OrderActionSheet.Action.EXTEND -> ActionRow(stringResource(R.string.order_sheet_extend), stringResource(R.string.order_sheet_extend_hint)) { onAction(action) }
                    OrderActionSheet.Action.SHARE -> ActionRow(stringResource(R.string.order_sheet_share), stringResource(R.string.order_sheet_share_hint)) { onAction(action) }
                    else -> Unit
                }
            }
            if (rows.danger.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                rows.danger.forEach { action ->
                    when (action) {
                        OrderActionSheet.Action.CANCEL -> ActionRow(
                            stringResource(R.string.order_sheet_cancel), stringResource(R.string.order_sheet_cancel_hint), danger = true,
                        ) { onAction(action) }
                        OrderActionSheet.Action.DELETE -> ActionRow(
                            stringResource(R.string.order_sheet_delete), stringResource(R.string.order_sheet_delete_hint), danger = true,
                        ) { onAction(action) }
                        else -> Unit
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionRow(title: String, subtitle: String?, danger: Boolean = false, onClick: () -> Unit) {
    val red = Color(0xFFB91C1C)
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .semantics { role = Role.Button }
            .heightIn(min = 56.dp)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // #930: rows without icons, text only
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = if (danger) red else DS.Colors.Text)
            if (!subtitle.isNullOrBlank()) {
                Text(subtitle, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
        }
    }
    HorizontalDivider(color = DS.Colors.Divider)
}
