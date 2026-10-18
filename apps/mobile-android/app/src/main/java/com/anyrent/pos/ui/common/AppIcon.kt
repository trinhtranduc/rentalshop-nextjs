package com.anyrent.pos.ui.common

import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.anyrent.pos.ui.theme.DS

/** An outline icon at a board size (`DS.Icon.*`) (#396) */
@Composable
fun AppIcon(
    imageVector: ImageVector,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    size: Dp = DS.Icon.Md,
    tint: Color = LocalContentColor.current,
) {
    Icon(imageVector, contentDescription = contentDescription, tint = tint, modifier = modifier.size(size))
}

/** Outline glyphs the boards use that Material lacks; 24 viewport, 2px round stroke like the boards */
object AppIcons {
    /** Barcode scan (board `Quét mã vạch`) */
    val Barcode: ImageVector by lazy {
        strokeIcon("Barcode", "M4 7V5h3M17 5h3v2M20 17v2h-3M7 19H4v-2M8 9v6M11 9v6M14 9v6M17 9v6")
    }

    /**
     * #1061 (owner: "đổi icon edit không giống", "icon đúng mockup"): the cart's one edit icon, the mockup's Lucide
     * "pen-line" (pencil + underline), stroke 2.2 (iOS `DS.editIcon`)
     */
    val EditLine: ImageVector by lazy {
        strokeIcon("EditLine", "M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z", strokeWidth = 2.2f)
    }

    private fun strokeIcon(name: String, vararg paths: String, strokeWidth: Float = 2f): ImageVector =
        ImageVector.Builder(name = name, defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = 24f, viewportHeight = 24f)
            .apply {
                paths.forEach { pathData ->
                    addPath(
                        pathData = PathParser().parsePathString(pathData).toNodes(),
                        fill = null,
                        stroke = SolidColor(Color.Black),
                        strokeLineWidth = strokeWidth,
                        strokeLineCap = StrokeCap.Round,
                        strokeLineJoin = StrokeJoin.Round,
                    )
                }
            }
            .build()
}
