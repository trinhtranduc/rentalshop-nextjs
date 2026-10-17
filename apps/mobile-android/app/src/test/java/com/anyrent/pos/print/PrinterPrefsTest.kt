package com.anyrent.pos.print

import android.content.SharedPreferences
import androidx.compose.ui.text.input.KeyboardType
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * #1011 — what Cài đặt → Máy in saved is what printing uses (iOS `Utils.loadNotePrinter` / `loadBillPrinter`):
 * a cleared note stays cleared (the default only before anything was saved), the IP without stray spaces.
 */
class PrinterPrefsTest {
    @Test
    fun noteDefaultsOnlyBeforeAnythingWasSaved() {
        assertEquals(ThermalPrinter.DEFAULT_PRINTER_NOTE, ThermalPrinter.configFromPrefs(MemoryPrefs()).note)
    }

    @Test
    fun clearedNoteStaysCleared() {
        val prefs = MemoryPrefs(mapOf("printerNote" to ""))
        assertEquals("", ThermalPrinter.configFromPrefs(prefs).note)
    }

    @Test
    fun savedNoteIsPrintedAsSaved() {
        val prefs = MemoryPrefs(mapOf("printerNote" to "Cảm ơn quý khách"))
        assertEquals("Cảm ơn quý khách", ThermalPrinter.configFromPrefs(prefs).note)
    }

    @Test
    fun savedIpIsTrimmed() {
        val prefs = MemoryPrefs(mapOf("printerIp" to " 192.168.1.50 \n"))
        assertEquals("192.168.1.50", ThermalPrinter.configFromPrefs(prefs).ip)
    }

    /** #1028: a "," from a Vietnamese keyboard becomes ".", spaces go (iOS `PrinterSetup.normalizedIP`) */
    @Test
    fun normalizeIpTurnsCommasIntoDotsAndDropsSpaces() {
        assertEquals("192.168.1.50", ThermalPrinter.normalizeIp("192,168,1,50"))
        assertEquals("192.168.1.50", ThermalPrinter.normalizeIp(" 192.168.1.50 \n"))
        assertEquals("192.168.1.50", ThermalPrinter.normalizeIp("192. 168 ,1.50"))
        assertEquals("10.0.0.7", ThermalPrinter.normalizeIp("10.0.0.7"))
        assertEquals("", ThermalPrinter.normalizeIp(""))
    }

    /** #1028: an IP saved with commas still prints */
    @Test
    fun savedIpWithCommasIsRead() {
        val prefs = MemoryPrefs(mapOf("printerIp" to "192,168,1,50"))
        assertEquals("192.168.1.50", ThermalPrinter.configFromPrefs(prefs).ip)
    }

    /** #1028: `KeyboardType.Decimal` can show the locale "," and no "."; the IP field uses a keyboard with "." */
    @Test
    fun ipKeyboardHasADot() {
        assertEquals(KeyboardType.Uri, com.anyrent.pos.ui.settings.PrinterIpKeyboardOptions.keyboardType)
    }

    /** Read-only in-memory SharedPreferences for JVM tests */
    private class MemoryPrefs(private val values: Map<String, Any?> = emptyMap()) : SharedPreferences {
        override fun getAll(): MutableMap<String, *> = values.toMutableMap()
        override fun getString(key: String?, defValue: String?): String? =
            if (values.containsKey(key)) values[key] as String? else defValue
        @Suppress("UNCHECKED_CAST")
        override fun getStringSet(key: String?, defValues: MutableSet<String>?): MutableSet<String>? =
            (values[key] as? MutableSet<String>) ?: defValues
        override fun getInt(key: String?, defValue: Int): Int = values[key] as? Int ?: defValue
        override fun getLong(key: String?, defValue: Long): Long = values[key] as? Long ?: defValue
        override fun getFloat(key: String?, defValue: Float): Float = values[key] as? Float ?: defValue
        override fun getBoolean(key: String?, defValue: Boolean): Boolean = values[key] as? Boolean ?: defValue
        override fun contains(key: String?): Boolean = values.containsKey(key)
        override fun edit(): SharedPreferences.Editor = throw UnsupportedOperationException()
        override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit
        override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener?) = Unit
    }
}
