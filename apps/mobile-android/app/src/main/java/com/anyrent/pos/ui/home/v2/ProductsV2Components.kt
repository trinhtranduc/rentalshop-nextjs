package com.anyrent.pos.ui.home.v2

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Checkroom
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import com.anyrent.pos.R
import com.anyrent.pos.ui.theme.DS

internal object V2Colors {
    val Border = Color(0xFFCBD5E1)
    val Chip = Color(0xFFF1F5F9)
    val Section = Color(0xFFF8FAFC)
    val Ok = Color(0xFF047857)
    val Warn = Color(0xFF9A3412)
    val Danger = Color(0xFFB91C1C)
    val Line = Color(0xFFE2E8F0)
}

/** Photo with a hanger glyph while there is none */
@Composable
internal fun ProductThumb(url: String?, size: Dp, radius: Dp, modifier: Modifier = Modifier) {
    Box(
        modifier
            .size(size)
            .clip(RoundedCornerShape(radius))
            .background(V2Colors.Chip),
        contentAlignment = Alignment.Center,
    ) {
        val placeholder = @Composable {
            Icon(Icons.Outlined.Checkroom, contentDescription = null, tint = DS.Colors.TextMuted, modifier = Modifier.size(size / 2.5f))
        }
        if (url.isNullOrBlank()) {
            placeholder()
        } else {
            SubcomposeAsyncImage(
                model = url,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(size),
                loading = { placeholder() },
                error = { placeholder() },
            )
        }
    }
}

/** Grey band with an upper-case title ("GIÁ", "KHO", "TIỀN") */
@Composable
internal fun SectionBand(title: String, trailing: (@Composable () -> Unit)? = null) {
    Column(Modifier.fillMaxWidth()) {
        Spacer(Modifier.fillMaxWidth().height(8.dp).background(DS.Colors.Background))
        Row(
            Modifier.fillMaxWidth().background(V2Colors.Section).padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(title.uppercase(), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = DS.Colors.TextMuted, modifier = Modifier.weight(1f))
            trailing?.invoke()
        }
    }
}

@Composable
internal fun ThinDivider() = HorizontalDivider(color = DS.Colors.Divider, thickness = 1.dp)

/** "Theo lần | Theo ngày", "Thuê | Bán" */
@Composable
internal fun V2Segmented(
    titles: List<String>,
    selected: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    enabled: Boolean = true,
    /** Equal widths across the whole row */
    fill: Boolean = false,
) {
    Row(
        modifier
            .clip(RoundedCornerShape(if (compact) 9.dp else 10.dp))
            .background(V2Colors.Chip)
            .padding(3.dp),
    ) {
        titles.forEachIndexed { index, title ->
            val on = index == selected
            Box(
                Modifier
                    .then(if (fill) Modifier.weight(1f) else Modifier)
                    .then(if (on) Modifier.shadow(1.dp, RoundedCornerShape(8.dp)) else Modifier)
                    .clip(RoundedCornerShape(if (compact) 7.dp else 8.dp))
                    .background(if (on) Color.White else Color.Transparent)
                    .clickable(enabled = enabled && !on) { onSelect(index) }
                    .heightIn(min = if (compact) 32.dp else 38.dp)
                    .padding(horizontal = if (compact) 10.dp else 16.dp)
                    .semantics {
                        role = Role.Tab
                        this.selected = on
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    title,
                    fontSize = if (compact) 13.sp else 14.sp,
                    fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (on) DS.Colors.Text else DS.Colors.TextMuted,
                )
            }
        }
    }
}

/** − n + */
@Composable
internal fun V2Stepper(value: Int, onChange: (Int) -> Unit, minimum: Int = 0, compact: Boolean = false) {
    val minus = stringResource(R.string.v2_stepper_minus)
    val plus = stringResource(R.string.v2_stepper_plus)
    Row(
        Modifier.border(1.dp, V2Colors.Line, RoundedCornerShape(10.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(width = 44.dp, height = if (compact) 38.dp else 44.dp)
                .clickable(enabled = value > minimum) { onChange(value - 1) }
                .semantics { contentDescription = minus; role = Role.Button },
            contentAlignment = Alignment.Center,
        ) { Text("−", fontSize = 20.sp, color = if (value > minimum) DS.Colors.Text else DS.Colors.TextMuted) }
        Text("$value", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, modifier = Modifier.widthIn(min = 28.dp))
        Box(
            Modifier
                .size(width = 44.dp, height = if (compact) 38.dp else 44.dp)
                .clickable { onChange(value + 1) }
                .semantics { contentDescription = plus; role = Role.Button },
            contentAlignment = Alignment.Center,
        ) { Text("+", fontSize = 20.sp) }
    }
}

/** "title ……… value ›" */
@Composable
internal fun V2ValueRow(
    title: String,
    value: String,
    onClick: (() -> Unit)? = null,
    valueColor: Color = DS.Colors.TextMuted,
    bold: Boolean = false,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .heightIn(min = 48.dp)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, fontSize = 15.sp, fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal, color = DS.Colors.Text, modifier = Modifier.weight(1f))
        Text(
            value,
            fontSize = if (bold) 18.sp else 15.sp,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = valueColor,
            maxLines = 1,
        )
        if (onClick != null) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
        }
    }
}
