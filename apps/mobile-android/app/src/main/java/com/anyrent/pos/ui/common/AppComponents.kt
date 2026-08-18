package com.anyrent.pos.ui.common

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuDefaults
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.anyrent.pos.R

@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    shape: Shape = MaterialTheme.shapes.medium,
    content: @Composable () -> Unit,
) {
    val clickable = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
    Card(
        modifier = modifier.then(clickable),
        shape = shape,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        content = { content() },
    )
}

/**
 * Phone row with iOS-style mask/unmask (`09xxxx099` + eye toggle).
 * [onToggle] should stop card navigation — nest this inside a clickable card carefully.
 */
@Composable
fun MaskedPhoneRow(
    phone: String,
    revealed: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val trimmed = phone.trim()
    if (trimmed.isEmpty()) return
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = if (revealed) trimmed else maskedPhoneNumber(trimmed),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f, fill = false),
        )
        Icon(
            imageVector = if (revealed) Icons.Default.VisibilityOff else Icons.Default.Visibility,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier
                .size(18.dp)
                .clickable(onClick = onToggle),
        )
    }
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    // iOS section captions: Medium 12, tertiary, uppercase
    Text(
        text.uppercase(),
        modifier = modifier.padding(start = 16.dp, bottom = 8.dp),
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontWeight = FontWeight.Medium,
        letterSpacing = 0.6.sp,
    )
}

@Composable
fun AppSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    /**
     * Called when the user presses the keyboard Search key (or clear→search).
     * Matches iOS `searchBarSearchButtonClicked` — typing alone must not hit the API.
     */
    onSearch: (() -> Unit)? = null,
    onClear: (() -> Unit)? = null,
) {
    val keyboard = LocalSoftwareKeyboardController.current
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = {
            Text(
                placeholder,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        leadingIcon = {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingIcon = if (value.isNotEmpty() && onClear != null) {
            {
                IconButton(onClick = onClear) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = stringResource(R.string.clear),
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        } else null,
        singleLine = true,
        textStyle = appInputTextStyle(),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(
            onSearch = {
                keyboard?.hide()
                onSearch?.invoke()
            },
        ),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = Color.Transparent,
            cursorColor = MaterialTheme.colorScheme.primary,
        ),
        modifier = modifier.fillMaxWidth().heightIn(min = 56.dp),
    )
}

/**
 * Shared form field matching iOS `LabeledTextField` + `RCSimpleTextField`:
 * label above (Medium 14), value Regular 16, radius 12.
 * Material outlined fields need ≥56dp; a hard 50dp height clipped descenders (g, y, p).
 */
@Composable
fun AppInputField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    leadingIcon: ImageVector? = null,
    trailingContent: (@Composable () -> Unit)? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true,
    minLines: Int = 1,
    isError: Boolean = false,
    supportingText: String? = null,
    enabled: Boolean = true,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        RequiredFieldLabel(text = label)
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            placeholder = placeholder?.let { hint ->
                {
                    Text(
                        hint,
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            },
            leadingIcon = leadingIcon?.let { icon ->
                {
                    Icon(
                        icon,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            },
            trailingIcon = trailingContent,
            keyboardOptions = keyboardOptions,
            visualTransformation = visualTransformation,
            singleLine = singleLine,
            minLines = minLines,
            isError = isError,
            enabled = enabled,
            textStyle = appInputTextStyle(),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                disabledContainerColor = MaterialTheme.colorScheme.surface,
                errorContainerColor = MaterialTheme.colorScheme.surface,
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                errorBorderColor = MaterialTheme.colorScheme.error,
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                cursorColor = MaterialTheme.colorScheme.primary,
                disabledBorderColor = MaterialTheme.colorScheme.outlineVariant,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 56.dp),
        )
        if (supportingText != null || isError) {
            supportingText?.let { message ->
                Text(
                    message,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
                    color = if (isError) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
        }
    }
}

@Composable
internal fun appInputTextStyle(): TextStyle =
    MaterialTheme.typography.bodyLarge.copy(
        lineHeight = 22.sp,
        lineHeightStyle = LineHeightStyle(
            alignment = LineHeightStyle.Alignment.Center,
            trim = LineHeightStyle.Trim.None,
        ),
        platformStyle = PlatformTextStyle(includeFontPadding = true),
    )

/**
 * iOS NewProductViewController colors the `*` in required titles with actionDanger.
 * Keep the rest of the label on the normal onSurface color.
 */
@Composable
fun RequiredFieldLabel(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodyMedium.copy(
        fontWeight = FontWeight.Medium,
    ),
) {
    val annotated = remember(text) {
        buildAnnotatedString {
            val star = text.indexOf('*')
            if (star < 0) {
                append(text)
            } else {
                append(text.substring(0, star))
                withStyle(SpanStyle(color = Color(0xFFE83F48))) {
                    append('*')
                }
                if (star + 1 < text.length) append(text.substring(star + 1))
            }
        }
    }
    Text(
        text = annotated,
        modifier = modifier,
        style = style,
        color = MaterialTheme.colorScheme.onSurface,
    )
}

/**
 * Neutral choice chip matching iOS Order Filter.
 * Selected = white fill + black 1.5pt border. Unselected = gray fill, no border.
 */
@Composable
fun AppFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.height(44.dp),
        shape = RoundedCornerShape(10.dp),
        color = if (selected) {
            MaterialTheme.colorScheme.surface
        } else {
            MaterialTheme.colorScheme.surfaceVariant
        },
        border = BorderStroke(
            1.5.dp,
            if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent,
        ),
    ) {
        Box(
            Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/** Circular close control matching iOS filter/sheet dismiss button. */
@Composable
fun AppCloseIconButton(
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    IconButton(
        onClick = onClick,
        modifier = modifier
            .size(30.dp)
            .background(
                MaterialTheme.colorScheme.surfaceVariant,
                CircleShape,
            ),
    ) {
        Icon(
            Icons.Default.Close,
            contentDescription = contentDescription,
            modifier = Modifier.size(14.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val background = when (status.uppercase()) {
        "RESERVED" -> Color(0xFFE83F48)
        "PICKUPED" -> Color(0xFFE88A19)
        "RETURNED", "COMPLETED" -> Color(0xFF23844A)
        "CANCELLED" -> Color(0xFF8E2930)
        else -> MaterialTheme.colorScheme.secondary
    }
    // Match iOS OrderStatusBadgeMetrics: ~10sp bold, 9×5 insets, 12pt corner, min ~26dp.
    Box(
        modifier = modifier
            .heightIn(min = 26.dp)
            .background(background, RoundedCornerShape(12.dp))
            .padding(horizontal = 9.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            status,
            color = Color.White,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                lineHeight = 12.sp,
                fontWeight = FontWeight.Bold,
            ),
            maxLines = 1,
        )
    }
}

@Composable
fun SettingsCardRow(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    trailing: @Composable RowScope.() -> Unit = {
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.outline,
        )
    },
) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 58.dp)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(icon, contentDescription = null, tint = tint)
        Text(title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
        trailing()
    }
}

@Composable
fun RankingCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    content: @Composable () -> Unit,
) {
    AppCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            content()
        }
    }
}

/**
 * Price / deposit keypad as a filter-style sheet: centered title, one blue
 * Confirm, no Cancel. Swipe the grabber to dismiss.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNumericPadSheet(
    title: String,
    rawValue: String,
    onRawValueChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    formattedValue: String = formatMoney(rawValue.toDoubleOrNull() ?: 0.0),
    extraContent: @Composable ColumnScope.() -> Unit = {},
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        dragHandle = {
            Box(
                Modifier
                    .padding(top = 8.dp)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(width = 36.dp, height = 5.dp)
                        .background(
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.32f),
                            RoundedCornerShape(2.5.dp),
                        ),
                )
            }
        },
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
    ) {
        Column(Modifier.fillMaxWidth()) {
            AppSheetHeader(title = title)
            // iOS NumberPicker valueLabel: bold 48pt, 65pt row. headlineMedium (~28sp) looked tiny.
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(65.dp)
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    formattedValue,
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Column(Modifier.fillMaxWidth()) {
                listOf(
                    listOf("1", "2", "3"),
                    listOf("4", "5", "6"),
                    listOf("7", "8", "9"),
                    listOf("0", "000", "⌫"),
                ).forEach { keys ->
                    Row(Modifier.fillMaxWidth()) {
                        keys.forEach { key ->
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(58.dp)
                                    .clickable {
                                        onRawValueChange(
                                            when (key) {
                                                "⌫" -> rawValue.dropLast(1).ifBlank { "0" }
                                                else -> if (rawValue == "0") key else rawValue + key
                                            }.take(12),
                                        )
                                    },
                                shape = RectangleShape,
                                color = MaterialTheme.colorScheme.surface,
                                border = BorderStroke(
                                    0.5.dp,
                                    MaterialTheme.colorScheme.outlineVariant,
                                ),
                            ) {
                                Box(
                                    Modifier.fillMaxSize(),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        key,
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }
                }
            }
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 16.dp, bottom = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                extraContent()
                AppPrimaryButton(
                    text = stringResource(R.string.confirm),
                    onClick = onConfirm,
                )
            }
        }
    }
}

/**
 * Half-sheet chrome: centered title, no hairline.
 * Extra top padding sits the title below the grabber. Confirm stays at the bottom.
 */
@Composable
fun AppSheetHeader(
    title: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/**
 * Primary CTA matching iOS `RCPrimaryButton`: bold 18pt, ~50pt tall.
 * Why shared: Material Button defaults were ~14sp, so Save/Add looked smaller than iOS.
 */
@Composable
fun AppPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().height(50.dp),
        shape = RoundedCornerShape(12.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        } else {
            Text(
                text,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
            )
        }
    }
}

/** Outline action button with the same 18pt bold label as iOS primary actions. */
@Composable
fun AppSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.fillMaxWidth().height(50.dp),
        shape = RoundedCornerShape(12.dp),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
        )
    }
}

/**
 * One row in an overflow ("…") menu. Mirrors iOS `UIAction`:
 * icon + title, with optional destructive styling (delete).
 */
data class AppMenuAction(
    val label: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
    val destructive: Boolean = false,
    val enabled: Boolean = true,
)

/**
 * Soft ellipsis trigger — vertical 3-dot for Android list cells.
 *
 * Why Icon (not Text "⋮"): some OEM fonts omit U+22EE so the glyph paints blank —
 * customer cells looked like they had no overflow control. Icons.MoreVert is a vector
 * and always draws. Do not force IconButton below 48.dp (clips the 24.dp glyph).
 */
@Composable
fun AppOverflowIconButton(
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    IconButton(
        onClick = onClick,
        modifier = modifier,
    ) {
        Icon(
            imageVector = Icons.Filled.MoreVert,
            contentDescription = contentDescription,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(24.dp),
        )
    }
}

/**
 * Modern overflow popover shared by Product / Customer / User list cells.
 * Why shared: raw Material DropdownMenu looked flat (no icons on product,
 * inconsistent delete color). This matches iOS UIMenu — rounded card, icons,
 * divider before destructive actions, Medium 15 labels.
 */
@Composable
fun AppOverflowMenu(
    expanded: Boolean,
    onDismiss: () -> Unit,
    actions: List<AppMenuAction>,
    modifier: Modifier = Modifier,
    offset: DpOffset = DpOffset(0.dp, 4.dp),
) {
    if (actions.isEmpty()) return

    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        modifier = modifier.widthIn(min = 220.dp),
        offset = offset,
        shape = RoundedCornerShape(14.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
        shadowElevation = 10.dp,
        border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        actions.forEachIndexed { index, action ->
            val previousDestructive = index > 0 && actions[index - 1].destructive
            if (action.destructive && index > 0 && !previousDestructive) {
                HorizontalDivider(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.8f),
                )
            }
            AppOverflowMenuItem(action = action, onDismiss = onDismiss)
        }
    }
}

@Composable
private fun ColumnScope.AppOverflowMenuItem(
    action: AppMenuAction,
    onDismiss: () -> Unit,
) {
    val contentColor = if (action.destructive) {
        MaterialTheme.colorScheme.error
    } else {
        MaterialTheme.colorScheme.onSurface
    }
    val iconColor = if (action.destructive) {
        MaterialTheme.colorScheme.error
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    DropdownMenuItem(
        text = {
            Text(
                action.label,
                style = MaterialTheme.typography.titleSmall,
                color = contentColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        leadingIcon = {
            Icon(
                action.icon,
                contentDescription = null,
                tint = iconColor,
                modifier = Modifier.size(20.dp),
            )
        },
        onClick = {
            onDismiss()
            action.onClick()
        },
        enabled = action.enabled,
        colors = MenuDefaults.itemColors(
            textColor = contentColor,
            leadingIconColor = iconColor,
            disabledTextColor = contentColor.copy(alpha = 0.38f),
            disabledLeadingIconColor = iconColor.copy(alpha = 0.38f),
        ),
        modifier = Modifier.padding(horizontal = 4.dp),
    )
}

/**
 * Convenience: ellipsis button + popover anchored together (typical list-cell chrome).
 */
@Composable
fun AppOverflowMenuAnchor(
    contentDescription: String,
    actions: List<AppMenuAction>,
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    // requiredSize: Row + weight(1f) siblings can otherwise shrink this Box to 0
    // in LazyColumn cards (customer list looked like it had no ⋮ at all).
    Box(
        modifier = modifier.requiredSize(48.dp),
        contentAlignment = Alignment.Center,
    ) {
        AppOverflowIconButton(
            onClick = { onExpandedChange(true) },
            contentDescription = contentDescription,
            modifier = Modifier.fillMaxSize(),
        )
        AppOverflowMenu(
            expanded = expanded,
            onDismiss = { onExpandedChange(false) },
            actions = actions,
        )
    }
}

/**
 * Shared presentation helper.
 *
 * - Default / [nested]: page sheet (~90%). Select customer, add/edit customer.
 * - [fullScreen]: covers the window. Product and user forms (photo, long fields).
 *   Order history is a NavHost destination, not this sheet.
 * - [nested]: second 90% card as a Dialog because Compose cannot stack two
 *   ModalBottomSheets (add/edit customer on top of the cart picker).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppFormSheet(
    onDismiss: () -> Unit,
    fullScreen: Boolean = false,
    nested: Boolean = false,
    content: @Composable () -> Unit,
) {
    if (fullScreen) {
        Dialog(
            onDismissRequest = onDismiss,
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                dismissOnBackPress = true,
                dismissOnClickOutside = false,
            ),
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.surface,
            ) {
                content()
            }
        }
        return
    }

    val configuration = LocalConfiguration.current
    val pageSheetHeight = (configuration.screenHeightDp * 0.9f).dp
    val grabber: @Composable () -> Unit = {
        Box(
            Modifier
                .padding(top = 6.dp, bottom = 0.dp)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier
                    .size(width = 36.dp, height = 5.dp)
                    .background(
                        MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.32f),
                        RoundedCornerShape(2.5.dp),
                    ),
            )
        }
    }

    if (nested) {
        Dialog(
            onDismissRequest = onDismiss,
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                dismissOnBackPress = true,
                dismissOnClickOutside = true,
            ),
        ) {
            Box(Modifier.fillMaxSize()) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.32f))
                        .clickable(
                            indication = null,
                            interactionSource = remember { MutableInteractionSource() },
                            onClick = onDismiss,
                        ),
                )
                Surface(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .height(pageSheetHeight),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp,
                    shadowElevation = 0.dp,
                ) {
                    Column(Modifier.fillMaxSize()) {
                        grabber()
                        Box(Modifier.fillMaxWidth().weight(1f)) {
                            content()
                        }
                    }
                }
            }
        }
        return
    }

    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        dragHandle = grabber,
        containerColor = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        tonalElevation = 0.dp,
        scrimColor = Color.Black.copy(alpha = 0.32f),
        // Avoid double system insets; form Scaffold / TopAppBar own padding explicitly.
        contentWindowInsets = { WindowInsets(0, 0, 0, 0) },
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(pageSheetHeight),
        ) {
            content()
        }
    }
}

/**
 * Shared modern alert chrome (confirm + error).
 *
 * Why one frame: raw Material `AlertDialog` TextButtons looked inconsistent across
 * Product/Customer/Cart/Settings. This matches a single POS pattern — rounded card,
 * optional status icon, Bold title, Regular message, full-width action row.
 */
@Composable
private fun AppAlertFrame(
    onDismissRequest: () -> Unit,
    dismissOnBackPress: Boolean = true,
    dismissOnClickOutside: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(
        onDismissRequest = onDismissRequest,
        properties = DialogProperties(
            dismissOnBackPress = dismissOnBackPress,
            dismissOnClickOutside = dismissOnClickOutside,
            usePlatformDefaultWidth = false,
        ),
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 28.dp),
            shape = RoundedCornerShape(22.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 0.dp,
            shadowElevation = 12.dp,
            border = BorderStroke(0.5.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 22.dp, vertical = 22.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
                content = content,
            )
        }
    }
}

@Composable
private fun AppAlertIconBadge(
    icon: ImageVector,
    tint: Color,
    background: Color,
) {
    Box(
        Modifier
            .size(52.dp)
            .background(background, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(26.dp),
        )
    }
}

@Composable
private fun AppAlertTitle(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        color = MaterialTheme.colorScheme.onSurface,
        textAlign = TextAlign.Center,
    )
}

@Composable
private fun AppAlertMessage(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodyMedium,
        fontSize = 15.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
    )
}

@Composable
private fun AppAlertDialogButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    filled: Boolean = false,
    destructive: Boolean = false,
    loading: Boolean = false,
) {
    val container = when {
        !filled -> Color.Transparent
        destructive -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.primary
    }
    val content = when {
        filled -> MaterialTheme.colorScheme.onPrimary
        destructive -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurface
    }
    val border = when {
        filled -> null
        destructive -> BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.35f))
        else -> BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    }

    OutlinedButton(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.height(46.dp),
        shape = RoundedCornerShape(12.dp),
        border = border,
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = container,
            contentColor = content,
            disabledContainerColor = container.copy(alpha = 0.45f),
            disabledContentColor = content.copy(alpha = 0.55f),
        ),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = content,
            )
        } else {
            Text(
                text,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/**
 * Error alert — one dismiss action (OK). Use for API/validation failures that
 * need a modal acknowledgment (cart create order, etc.).
 */
@Composable
fun AppAlertError(
    message: String,
    onDismiss: () -> Unit,
    title: String = stringResource(R.string.error),
    confirmLabel: String = stringResource(R.string.ok),
) {
    AppAlertFrame(onDismissRequest = onDismiss) {
        AppAlertIconBadge(
            icon = Icons.Outlined.ErrorOutline,
            tint = MaterialTheme.colorScheme.error,
            background = MaterialTheme.colorScheme.error.copy(alpha = 0.10f),
        )
        AppAlertTitle(title)
        AppAlertMessage(message)
        AppAlertDialogButton(
            text = confirmLabel,
            onClick = onDismiss,
            modifier = Modifier.fillMaxWidth(),
            filled = true,
        )
    }
}

/**
 * Confirm alert — Cancel + Confirm. Set [destructive] for delete/clear actions
 * so the confirm button uses error styling.
 *
 * Optional [content] slot for forms inside the alert (e.g. change password).
 */
@Composable
fun AppAlertConfirm(
    title: String,
    message: String,
    confirmLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    cancelLabel: String = stringResource(R.string.cancel),
    destructive: Boolean = false,
    confirmEnabled: Boolean = true,
    dismissEnabled: Boolean = true,
    confirmLoading: Boolean = false,
    content: (@Composable ColumnScope.() -> Unit)? = null,
) {
    AppAlertFrame(
        onDismissRequest = {
            if (dismissEnabled && !confirmLoading) onDismiss()
        },
        dismissOnBackPress = dismissEnabled && !confirmLoading,
        dismissOnClickOutside = dismissEnabled && !confirmLoading,
    ) {
        if (destructive) {
            AppAlertIconBadge(
                icon = Icons.Outlined.WarningAmber,
                tint = MaterialTheme.colorScheme.error,
                background = MaterialTheme.colorScheme.error.copy(alpha = 0.10f),
            )
        }
        AppAlertTitle(title)
        if (message.isNotBlank()) {
            AppAlertMessage(message)
        }
        if (content != null) {
            Column(
                Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.Start,
                content = content,
            )
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            AppAlertDialogButton(
                text = cancelLabel,
                onClick = onDismiss,
                modifier = Modifier.weight(1f),
                enabled = dismissEnabled && !confirmLoading,
            )
            AppAlertDialogButton(
                text = confirmLabel,
                onClick = onConfirm,
                modifier = Modifier.weight(1f),
                enabled = confirmEnabled,
                filled = true,
                destructive = destructive,
                loading = confirmLoading,
            )
        }
    }
}
