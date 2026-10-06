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
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.EditCalendar
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.Share
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
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
 * then a separate red group (Huỷ đơn, Xoá đơn when allowed). [rows] comes from [OrderActionSheet.rows].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun OrderActionsSheet(
    orderNumber: String,
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
            Row(Modifier.fillMaxWidth().padding(start = 4.dp, end = 4.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.order_sheet_title, orderNumber),
                    fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text,
                    modifier = Modifier.weight(1f).semantics { heading() },
                )
                val closeLabel = stringResource(R.string.close)
                Box(
                    Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFF1F5F9)).clickable(onClickLabel = closeLabel, onClick = onDismiss),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Close, contentDescription = closeLabel, tint = DS.Colors.TextMuted, modifier = Modifier.size(18.dp))
                }
            }
            rows.main.forEach { action ->
                when (action) {
                    OrderActionSheet.Action.PRINT -> ActionRow(Icons.Outlined.Print, stringResource(R.string.order_sheet_print), printerSubtitle) { onAction(action) }
                    OrderActionSheet.Action.NOTES -> ActionRow(Icons.Outlined.EditNote, stringResource(R.string.order_sheet_notes), notesSubtitle) { onAction(action) }
                    OrderActionSheet.Action.HISTORY -> ActionRow(Icons.Outlined.History, stringResource(R.string.order_sheet_history), historySubtitle) { onAction(action) }
                    OrderActionSheet.Action.EDIT -> ActionRow(Icons.Outlined.Edit, stringResource(R.string.order_sheet_edit), null) { onAction(action) }
                    OrderActionSheet.Action.EXTEND -> ActionRow(Icons.Outlined.EditCalendar, stringResource(R.string.order_sheet_extend), null) { onAction(action) }
                    OrderActionSheet.Action.SHARE -> ActionRow(Icons.Outlined.Share, stringResource(R.string.order_sheet_share), null) { onAction(action) }
                    else -> Unit
                }
            }
            if (rows.danger.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                rows.danger.forEach { action ->
                    when (action) {
                        OrderActionSheet.Action.CANCEL -> ActionRow(
                            Icons.Outlined.Cancel, stringResource(R.string.order_sheet_cancel), stringResource(R.string.order_sheet_cancel_hint), danger = true,
                        ) { onAction(action) }
                        OrderActionSheet.Action.DELETE -> ActionRow(
                            Icons.Outlined.Delete, stringResource(R.string.order_sheet_delete), null, danger = true,
                        ) { onAction(action) }
                        else -> Unit
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionRow(icon: ImageVector, title: String, subtitle: String?, danger: Boolean = false, onClick: () -> Unit) {
    val red = Color(0xFFB91C1C)
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .semantics { role = Role.Button }
            .heightIn(min = 56.dp)
            .padding(horizontal = 4.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(if (danger) Color(0xFFFEF2F2) else Color(0xFFF1F5F9)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = if (danger) red else DS.Colors.Text, modifier = Modifier.size(DS.Icon.Md))
        }
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = if (danger) red else DS.Colors.Text)
            if (!subtitle.isNullOrBlank()) {
                Text(subtitle, fontSize = DS.TextSize.Secondary, color = DS.Colors.TextMuted)
            }
        }
    }
    HorizontalDivider(color = DS.Colors.Divider)
}
