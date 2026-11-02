package com.anyrent.pos.domain.widget

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.URI

/** `anyrent://order/<id>` opens that order, `anyrent://todo` opens Đơn hàng on Việc cần làm */
sealed interface TodayWidgetLink {
    data class Order(val id: Int) : TodayWidgetLink
    data object Todo : TodayWidgetLink

    companion object {
        const val TODO_URL = "anyrent://todo"

        fun orderUrl(id: Int) = "anyrent://order/$id"

        /** null for anything else: a bad link opens nothing */
        fun parse(url: String?): TodayWidgetLink? {
            val uri = runCatching { URI(url.orEmpty()) }.getOrNull() ?: return null
            if (!uri.scheme.equals("anyrent", ignoreCase = true)) return null
            val path = uri.path.orEmpty()
            return when (uri.host?.lowercase()) {
                "todo" -> Todo
                "order" -> path.removePrefix("/").toIntOrNull()?.takeIf { it > 0 }?.let(::Order)
                else -> null
            }
        }
    }
}

/**
 * The link the app was opened with, kept until the navigation can apply it (the sign-in screen may be first, and the
 * root navigation is not always composed yet: same reason as `MainTabRouter`, #433).
 */
object TodayWidgetLinks {
    private val _pending = MutableStateFlow<TodayWidgetLink?>(null)
    val pending: StateFlow<TodayWidgetLink?> = _pending.asStateFlow()

    fun request(link: TodayWidgetLink) {
        _pending.value = link
    }

    fun consume(): TodayWidgetLink? {
        val link = _pending.value
        _pending.value = null
        return link
    }
}

/** W11: the small card in the Đơn tab, shown until "Không hỏi lại" or until a widget is on the phone. It never opens a sheet by itself. */
object TodayWidgetHint {
    fun shouldShow(todayAvailable: Boolean, hasWork: Boolean, hasWidget: Boolean, dismissed: Boolean): Boolean =
        todayAvailable && hasWork && !hasWidget && !dismissed

    fun hasWork(counts: TodayWidgetCounts?): Boolean = (counts?.total ?: 0) > 0
}

/**
 * What the "Thêm vào widget" sheet offers. Android tells the app nothing when pinning fails, so a request never leads to
 * a success state: after it the sheet only shows the steps as a way out.
 */
data class TodayWidgetGuide(val showsPinButton: Boolean, val showsSteps: Boolean, val showsNotAskedNote: Boolean) {
    companion object {
        fun of(pinSupported: Boolean, pinRequested: Boolean) = TodayWidgetGuide(
            showsPinButton = pinSupported && !pinRequested,
            showsSteps = !pinSupported || pinRequested,
            showsNotAskedNote = pinSupported && pinRequested,
        )
    }
}

/** How much the widget draws at a given size */
object TodayWidgetLayout {
    const val MAX_ROWS = 3
    const val SMALL_BELOW_WIDTH_DP = 180f

    /** Padding, header, counters and footer of the medium widget */
    private const val CHROME_HEIGHT_DP = 92f
    private const val ROW_HEIGHT_DP = 34f

    fun isSmall(widthDp: Float): Boolean = widthDp < SMALL_BELOW_WIDTH_DP

    fun rowLimit(widthDp: Float, heightDp: Float): Int =
        if (isSmall(widthDp)) 0 else ((heightDp - CHROME_HEIGHT_DP) / ROW_HEIGHT_DP).toInt().coerceIn(0, MAX_ROWS)
}
