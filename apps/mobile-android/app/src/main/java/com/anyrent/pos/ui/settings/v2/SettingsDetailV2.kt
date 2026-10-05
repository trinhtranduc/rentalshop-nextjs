package com.anyrent.pos.ui.settings.v2

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.anyrent.pos.R
import com.anyrent.pos.ui.common.AppIcon
import com.anyrent.pos.ui.home.v2.ThinDivider
import com.anyrent.pos.ui.home.v2.V2Colors
import com.anyrent.pos.ui.theme.DS

/*
 * Pieces of the Settings detail pages in the new style (#459), opened from Settings v2 when `newSettings` is on.
 * Same look as the redesigned customer screens (#387): ‹ + 20sp title, grey bands, thin dividers, 52dp fields,
 * 14dp-radius buttons.
 */

/** White page under the status bar with the v2 header; [bottomBar] sits above the navigation bar */
@Composable
internal fun SettingsDetailPage(
    title: String,
    onBack: () -> Unit,
    actions: (@Composable RowScope.() -> Unit)? = null,
    bottomBar: (@Composable ColumnScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(Modifier.fillMaxSize().background(DS.Colors.Surface).statusBarsPadding()) {
        Row(
            Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 8.dp).heightIn(min = 48.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                AppIcon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = stringResource(R.string.back), size = DS.Icon.Lg, tint = DS.Colors.Text)
            }
            Text(
                title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = DS.Colors.Text, maxLines = 1, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f).semantics { heading() },
            )
            actions?.invoke(this)
        }
        HorizontalDivider(color = DS.Colors.Border, thickness = 1.dp)
        Column(Modifier.weight(1f).fillMaxWidth(), content = content)
        if (bottomBar != null) {
            HorizontalDivider(color = DS.Colors.Border, thickness = 1.dp)
            Column(
                Modifier.fillMaxWidth().background(DS.Colors.Surface).navigationBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                content = bottomBar,
            )
        }
    }
}

/** "title ……… value" with an optional leading icon, a check (selected) or a chevron (link) */
@Composable
internal fun SettingsDetailRow(
    title: String,
    value: String? = null,
    icon: ImageVector? = null,
    selected: Boolean = false,
    chevron: Boolean = false,
    onClick: (() -> Unit)? = null,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .heightIn(min = 52.dp)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (icon != null) AppIcon(icon, contentDescription = null, size = DS.Icon.Md, tint = DS.Colors.TextMuted)
        Text(title, fontSize = DS.TextSize.Body, color = DS.Colors.Text, modifier = Modifier.weight(1f, fill = value.isNullOrBlank()))
        if (!value.isNullOrBlank()) {
            Text(
                value, fontSize = DS.TextSize.Body, color = DS.Colors.TextMuted, maxLines = 2, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f, fill = false).widthIn(max = 240.dp),
            )
        }
        if (selected) AppIcon(Icons.Outlined.Check, contentDescription = null, size = DS.Icon.Md, tint = DS.Colors.Primary)
        if (chevron) {
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(DS.Icon.Sm))
        }
    }
    ThinDivider()
}

/** Bold label over a 52dp outlined field (new customer / product form) */
@Composable
internal fun SettingsDetailField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    singleLine: Boolean = true,
    minLines: Int = 1,
    isError: Boolean = false,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = DS.Colors.Text)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = singleLine,
            minLines = minLines,
            isError = isError,
            keyboardOptions = keyboardOptions,
            visualTransformation = visualTransformation,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = V2Colors.Border,
                focusedBorderColor = DS.Colors.Primary,
                disabledBorderColor = V2Colors.Border,
                disabledTextColor = DS.Colors.TextMuted,
                disabledContainerColor = V2Colors.Section,
            ),
            textStyle = TextStyle(fontSize = DS.TextSize.Input, color = DS.Colors.Text),
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).semantics { contentDescription = label },
        )
    }
}

@Composable
internal fun SettingsDetailPrimaryButton(text: String, onClick: () -> Unit, enabled: Boolean = true, loading: Boolean = false) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = DS.Colors.Primary, contentColor = Color.White),
    ) {
        if (loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
        else Text(text, fontSize = DS.TextSize.Input, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
internal fun SettingsDetailSecondaryButton(text: String, onClick: () -> Unit, enabled: Boolean = true) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(52.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = DS.Colors.Surface, contentColor = DS.Colors.Text),
        border = BorderStroke(1.dp, V2Colors.Border),
    ) {
        Text(text, fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold)
    }
}

/** Small coloured pill ("Hoạt động" / "Đã tắt") */
@Composable
internal fun SettingsDetailPill(text: String, pill: DS.Pill) {
    Box(
        Modifier.background(pill.fill, RoundedCornerShape(10.dp)).padding(horizontal = 8.dp, vertical = 2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, fontSize = DS.TextSize.Pill, fontWeight = FontWeight.SemiBold, color = pill.text, maxLines = 1)
    }
}

/** Muted helper text under a field block */
@Composable
internal fun SettingsDetailNote(text: String, color: Color = DS.Colors.TextMuted) {
    Text(text, fontSize = DS.TextSize.Secondary, color = color)
}

@Composable
internal fun SettingsDetailGap() = Spacer(Modifier.height(8.dp))
