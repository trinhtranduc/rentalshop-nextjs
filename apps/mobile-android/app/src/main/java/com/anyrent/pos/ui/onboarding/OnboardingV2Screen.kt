package com.anyrent.pos.ui.onboarding

import android.provider.Settings
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.anyrent.pos.R
import com.anyrent.pos.ui.auth.v2.AuthBrandBar
import com.anyrent.pos.ui.theme.DS
import kotlinx.coroutines.delay

private val DotOff = Color(0xFFBFDBFE)
private val PageTexts = listOf(
    R.string.onboarding_v2_p1_title to R.string.onboarding_v2_p1_body,
    R.string.onboarding_v2_p2_title to R.string.onboarding_v2_p2_body,
    R.string.onboarding_v2_p3_title to R.string.onboarding_v2_p3_body,
)

/**
 * First-login onboarding (#387, flag `newAuth`). #1404: three pages that show the app's best features, with one photo
 * travelling through them (tab "★ 3 trang hướng dẫn", variant A). The caller keeps the "show once" storage
 * (`SessionStore.onboardingDone`). The logic lives in `OnboardingV2Cycle.kt`, the picture in `OnboardingV2Stage.kt`.
 */
@Composable
fun OnboardingV2Screen(onFinished: () -> Unit) {
    // The app's body style adds tracking; the mockup has none, and small phones need the room
    CompositionLocalProvider(LocalTextStyle provides LocalTextStyle.current.copy(letterSpacing = 0.sp)) {
        OnboardingV2Content(onFinished)
    }
}

@Composable
private fun OnboardingV2Content(onFinished: () -> Unit) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val palette = if (isSystemInDarkTheme()) OnboardingV2Palette.Dark else OnboardingV2Palette.Light
    val sample = OnboardingV2Sample(stringResource(R.string.onboarding_v2_sample_lang))

    BoxWithConstraints(Modifier.fillMaxSize().background(palette.screen)) {
        val safeTop = with(density) { WindowInsets.statusBars.getTop(this).toDp().value }
        val safeBottom = with(density) { WindowInsets.navigationBars.getBottom(this).toDp().value }
        val metrics = remember(maxWidth, maxHeight, safeTop, safeBottom, density.fontScale) {
            OnboardingV2Metrics(maxWidth.value, maxHeight.value, safeTop, safeBottom, density.fontScale)
        }
        val cycle = remember { OnboardingV2Cycle() }
        val stage = remember { OnboardingV2StageState(metrics) }
        stage.metrics = metrics
        var run by remember { mutableStateOf<OnboardingV2Run?>(null) }
        var page by remember { mutableStateOf(cycle.page) }

        fun play(next: OnboardingV2Run) {
            stage.begin(next)
            page = next.page
            run = next
        }
        val latestPlay by rememberUpdatedState(::play)

        fun reducedMotion(): Boolean = isReducedMotion(
            Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f),
        )

        // Leaving the screen or going to background stops everything; coming back replays the page's own effect
        DisposableEffect(lifecycleOwner) {
            val observer = LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_START -> latestPlay(cycle.start(reducedMotion()))
                    Lifecycle.Event.ON_STOP -> {
                        cycle.stop()
                        run = null
                        stage.finish()
                    }
                    else -> Unit
                }
            }
            lifecycleOwner.lifecycle.addObserver(observer)
            onDispose {
                lifecycleOwner.lifecycle.removeObserver(observer)
                cycle.stop()
                run = null
            }
        }

        // `run` changing cancels the block below at once, whichever page it was on: no two cycles can overlap
        LaunchedEffect(run) {
            val current = run ?: return@LaunchedEffect
            if (!current.animated) return@LaunchedEffect
            val offset = stage.clock
            val zero = withFrameNanos { it }
            while (stage.clock < OnboardingV2Timing.EFFECT) {
                stage.clock = withFrameNanos { (it - zero) / 1_000_000_000f } + offset
            }
            if (cycle.effectEnded(current.generation)) {
                delay((OnboardingV2Timing.HOLD * 1000).toLong())
                cycle.holdEnded(current.generation)?.let { latestPlay(it) }
            }
        }

        fun go(target: Int) {
            cycle.goTo(target)?.let { latestPlay(it) }
        }
        val latestGo by rememberUpdatedState(::go)

        val isLast = page == ONBOARDING_V2_PAGE_COUNT - 1
        Box(
            Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    var total = 0f
                    detectHorizontalDragGestures(
                        onDragStart = { total = 0f },
                        onDragEnd = {
                            if (total < -80) latestGo(cycle.page + 1)
                            if (total > 80) latestGo(cycle.page - 1)
                        },
                    ) { _, amount -> total += amount }
                },
        ) {
            OnboardingV2Stage(stage, palette, sample)

            Box(
                Modifier
                    .offset(y = metrics.textTop.dp)
                    .padding(horizontal = metrics.textInset.dp)
                    .fillMaxWidth()
                    .height(metrics.textHeight.dp),
            ) {
                PageTexts.forEachIndexed { index, (title, body) ->
                    PageText(stage, index, title, body, palette, metrics)
                }
            }

            Row(
                Modifier
                    .offset(y = metrics.topBarTop.dp)
                    .fillMaxWidth()
                    .padding(start = 24.dp, end = 16.dp)
                    .heightIn(min = DS.TouchTarget),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // The photo on page 1 is light in both themes
                AuthBrandBar(nameColor = if (page == 0) OnboardingV2Palette.Light.wordmark else palette.wordmark)
                Spacer(Modifier.weight(1f))
                if (!isLast) {
                    TextButton(
                        onClick = onFinished,
                        modifier = Modifier
                            .heightIn(min = DS.TouchTarget)
                            .shadow(2.dp, CircleShape, ambientColor = Color(0x1F0F172A), spotColor = Color(0x1F0F172A))
                            .clip(CircleShape)
                            .background(Color.White),
                    ) {
                        Text(stringResource(R.string.onboarding_v2_skip), fontSize = DS.TextSize.Body, fontWeight = FontWeight.SemiBold, color = OnboardingV2Palette.Light.muted)
                    }
                }
            }

            Row(
                Modifier
                    .offset(y = metrics.footerTop.dp)
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .height(metrics.footerHeight.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(ONBOARDING_V2_PAGE_COUNT) { i -> PageDot(i == page, palette, animated = run?.animated != false) }
                }
                Button(
                    onClick = { if (isLast) onFinished() else latestGo(cycle.page + 1) },
                    modifier = Modifier.height(metrics.footerHeight.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = palette.primary, contentColor = Color.White),
                    contentPadding = PaddingValues(horizontal = 28.dp),
                ) {
                    Text(stringResource(if (isLast) R.string.onboarding_v2_start else R.string.onboarding_v2_next), fontSize = DS.TextSize.Input, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun PageText(stage: OnboardingV2StageState, index: Int, title: Int, body: Int, palette: OnboardingV2Palette, metrics: OnboardingV2Metrics) {
    val density = LocalDensity.current
    val current = stage.page == index
    val visibleModifier = if (current) Modifier else Modifier.clearAndSetSemantics { }
    Column(
        visibleModifier
            .fillMaxWidth()
            .graphicsLayer {
                alpha = stage.cardAlpha(index)
                translationX = stage.textOffset(index) * density.density
            },
    ) {
        // The title stays at the mockup's size so it keeps its two lines; the body follows the system font, up to the limit
        Text(
            stringResource(title),
            fontSize = (metrics.titleSize / density.fontScale).sp,
            lineHeight = (metrics.titleLine / density.fontScale).sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = (-0.022).em,
            color = palette.ink,
            maxLines = 2,
            modifier = Modifier.semantics { heading() },
        )
        Spacer(Modifier.height(metrics.textGap.dp))
        Text(
            stringResource(body),
            fontSize = (metrics.bodySize * metrics.bodyScale / density.fontScale).sp,
            lineHeight = (metrics.bodyLine * metrics.bodyScale / density.fontScale).sp,
            color = palette.muted,
        )
    }
}

@Composable
private fun PageDot(on: Boolean, palette: OnboardingV2Palette, animated: Boolean) {
    val width: Dp by animateDpAsState(if (on) 24.dp else 8.dp, if (animated) tween(300) else snap(), label = "dot")
    Box(
        Modifier
            .height(8.dp)
            .width(width)
            .clip(CircleShape)
            .background(if (on) palette.primary else DotOff),
    )
}
