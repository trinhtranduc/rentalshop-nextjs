package com.anyrent.pos.domain.auth

import com.anyrent.pos.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** #409 — the old register screen must send values the API `businessTags` enum accepts */
class LegacyRegisterTagsTest {
    /** `registerSchema.businessTags` in packages/utils/src/core/validation-schemas.ts */
    private val apiEnum = listOf("AO_DAI", "COSTUME", "WEDDING_DRESS", "EQUIPMENT", "VEHICLE", "FILM_EQUIPMENT", "OTHER")

    private fun valueOf(labelRes: Int) = LegacyRegisterTags.chips.first { it.labelRes == labelRes }.apiValue

    @Test
    fun everyChipSendsAnApiValue() {
        LegacyRegisterTags.chips.forEach {
            assertTrue("chip ${it.apiValue} is not in the API enum", it.apiValue in apiEnum)
        }
    }

    @Test
    fun weddingAndFilmChipsSendTheApiNames() {
        assertEquals("WEDDING_DRESS", valueOf(R.string.tag_wedding))
        assertEquals("FILM_EQUIPMENT", valueOf(R.string.tag_film))
    }

    @Test
    fun chipsCoverTheCatalogOnceInScreenOrder() {
        assertEquals(apiEnum, LegacyRegisterTags.chips.map { it.apiValue })
        assertEquals(
            listOf(R.string.tag_ao_dai, R.string.tag_costume, R.string.tag_wedding, R.string.tag_equipment, R.string.tag_vehicle, R.string.tag_film, R.string.tag_other),
            LegacyRegisterTags.chips.map { it.labelRes },
        )
    }

    @Test
    fun payloadHoldsOnlySelectedValuesInCatalogOrder() {
        val wedding = valueOf(R.string.tag_wedding)
        val film = valueOf(R.string.tag_film)
        assertEquals(listOf("WEDDING_DRESS", "FILM_EQUIPMENT"), LegacyRegisterTags.payload(setOf(film, wedding)))
        assertEquals(emptyList<String>(), LegacyRegisterTags.payload(setOf("UNKNOWN")))
    }
}
