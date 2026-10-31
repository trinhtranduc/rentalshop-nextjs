package com.anyrent.pos.res

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #1381: the widget's words are iOS's words, in both languages; the manifest and the widget description are in place */
class Issue1381ResourcesTest {
    private fun app(path: String): File = listOf(path, "app/$path").map(::File).first { it.exists() }

    private fun strings(folder: String): Map<String, String> {
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(app("src/main/res/$folder/strings.xml"))
            .documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent.replace("\\'", "'") }
    }

    private fun iosStrings(language: String): Map<String, String> {
        val file = listOf("..", "../..").map { File(it, "mobile/POS ADBD/$language.lproj/Localizable.strings") }.first { it.exists() }
        val line = Regex("^\"(.+?)\"\\s*=\\s*\"(.*)\";\\s*$")
        return file.readLines().mapNotNull { line.find(it) }.associate { it.groupValues[1] to it.groupValues[2] }
    }

    /** Android key to iOS key: the same words on both phones (spec 4.15) */
    private val shared = mapOf(
        "widget_name" to "widget.name", "widget_description" to "widget.description", "widget_late" to "widget.late",
        "widget_pickup" to "widget.pickup", "widget_return" to "widget.return", "widget_more" to "widget.more",
        "widget_updated" to "widget.updated", "widget_done" to "widget.done", "widget_done_caption" to "widget.doneCaption",
        "widget_all_done" to "widget.allDone", "widget_today_at" to "widget.todayAt", "widget_empty" to "widget.empty",
        "widget_tomorrow" to "widget.tomorrow", "widget_logged_out" to "widget.loggedOut",
        "widget_logged_out_hint" to "widget.loggedOutHint", "widget_no_access" to "widget.noAccess", "widget_stale" to "widget.stale",
        "widget_stale_detail" to "widget.staleDetail", "widget_yesterday" to "widget.yesterday", "widget_hidden_name" to "widget.hiddenName",
        "widget_hint_title" to "widget.hint.title", "widget_hint_body" to "widget.hint.body", "widget_hint_how" to "widget.hint.how",
        "widget_dismiss" to "widget.dismiss", "widget_guide_title" to "widget.guide.title", "widget_guide_ok" to "widget.guide.ok",
        "widget_settings_row" to "widget.settings.row", "widget_hide_names_title" to "widget.hideNames.title",
        "widget_hide_names_subtitle" to "widget.hideNames.subtitle",
    )

    /** `%1$d`, `%2$s` to the iOS `%d`, `%@` */
    private fun plain(text: String) = text.replace(Regex("%\\d\\$"), "%").replace("%s", "%@")

    @Test
    fun theWordsAreTheWordsOfIos() {
        for ((android, ios) in listOf("values" to "en", "values-vi" to "vi-VN")) {
            val mine = strings(android)
            val theirs = iosStrings(ios)
            shared.forEach { (key, iosKey) ->
                assertEquals("$android $key", theirs[iosKey], mine[key]?.let(::plain))
            }
        }
    }

    @Test
    fun androidOnlyWordsExistInBothLanguages() {
        val keys = listOf(
            "widget_guide_subtitle_pin", "widget_guide_subtitle_steps", "widget_guide_step1", "widget_guide_step2", "widget_guide_step3",
            "widget_guide_add", "widget_guide_not_asked", "widget_refresh",
        )
        for (folder in listOf("values", "values-vi")) {
            val mine = strings(folder)
            keys.forEach { assertTrue("$folder $it", !mine[it].isNullOrBlank()) }
        }
    }

    /** No text may announce that the widget was added: the app is not told when pinning fails */
    @Test
    fun noSuccessMessageForPinning() {
        val vi = strings("values-vi").filterKeys { it.startsWith("widget_") }
        val en = strings("values").filterKeys { it.startsWith("widget_") }
        vi.forEach { (key, text) -> assertFalse(key, text.contains("đã thêm", ignoreCase = true)) }
        en.forEach { (key, text) -> assertFalse(key, Regex("\\b(added|success)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)) }
    }

    @Test
    fun manifestDeclaresTheReceiverAndTheTodoLink() {
        val manifest = app("src/main/AndroidManifest.xml").readText()
        assertTrue(manifest.contains("TodayWorkWidgetReceiver"))
        assertTrue(manifest.contains("android.appwidget.action.APPWIDGET_UPDATE"))
        assertTrue(manifest.contains("@xml/today_work_widget_info"))
        assertTrue(manifest.contains("android:host=\"todo\""))
        assertTrue(manifest.contains("android:host=\"order\""))
        assertFalse("everything stays in the app's process", manifest.contains("android:process"))
    }

    @Test
    fun widgetInfoIsOneResizableHomeScreenWidget() {
        val info = app("src/main/res/xml/today_work_widget_info.xml").readText()
        assertTrue(info.contains("android:targetCellWidth=\"4\""))
        assertTrue(info.contains("android:targetCellHeight=\"2\""))
        assertTrue(info.contains("android:resizeMode=\"horizontal|vertical\""))
        assertTrue(info.contains("android:widgetCategory=\"home_screen\""))
        assertFalse("not on the lock screen", info.contains("keyguard"))
    }
}
