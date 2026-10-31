package com.anyrent.pos.ui.widget

import android.content.Context
import android.content.SharedPreferences
import com.anyrent.pos.domain.widget.TodayWidgetFile
import com.anyrent.pos.domain.widget.TodayWidgetSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * The widget's file and its two switches, in the app's private storage (#1381). Separate from `SessionStore`: nothing
 * here is a credential. The switches are per phone and survive a sign-out, like iOS; the file does not.
 */
object TodayWidgetStore : TodayWidgetFile {
    private const val PREFS = "anyrent.todayWidget"
    private const val KEY_SNAPSHOT = "snapshot"
    private const val KEY_HIDE_NAMES = "hideCustomerNames"
    private const val KEY_HINT_DISMISSED = "hintDismissed"

    private var prefs: SharedPreferences? = null

    /** Bumped at every change: the widget redraws, and reads "now" again */
    private val _version = MutableStateFlow(0L)
    val version: StateFlow<Long> = _version.asStateFlow()

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    fun touch() = _version.update { it + 1 }

    override fun read(): TodayWidgetSnapshot? = TodayWidgetSnapshot.fromJson(prefs?.getString(KEY_SNAPSHOT, null))

    override fun write(snapshot: TodayWidgetSnapshot) {
        prefs?.edit()?.putString(KEY_SNAPSHOT, snapshot.toJson())?.apply()
        touch()
    }

    override fun clear() {
        prefs?.edit()?.remove(KEY_SNAPSHOT)?.apply()
        touch()
    }

    /** "Ẩn tên khách trên widget", off by default */
    var hideNames: Boolean
        get() = prefs?.getBoolean(KEY_HIDE_NAMES, false) ?: false
        set(value) { prefs?.edit()?.putBoolean(KEY_HIDE_NAMES, value)?.apply() }

    /** "Không hỏi lại": per phone, for good */
    var hintDismissed: Boolean
        get() = prefs?.getBoolean(KEY_HINT_DISMISSED, false) ?: false
        set(value) { prefs?.edit()?.putBoolean(KEY_HINT_DISMISSED, value)?.apply() }
}
