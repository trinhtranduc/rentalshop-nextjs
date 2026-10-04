package com.anyrent.pos.domain.auth

import com.anyrent.pos.R

/** Chips of the old register screen (`RegisterStoreScreen`, flag `newAuth` off) and the values they send (#409) */
object LegacyRegisterTags {
    data class Chip(val apiValue: String, val labelRes: Int)

    /** On-screen order */
    val chips = listOf(
        Chip("AO_DAI", R.string.tag_ao_dai),
        Chip("COSTUME", R.string.tag_costume),
        Chip("WEDDING", R.string.tag_wedding),
        Chip("EQUIPMENT", R.string.tag_equipment),
        Chip("VEHICLE", R.string.tag_vehicle),
        Chip("FILM", R.string.tag_film),
        Chip("OTHER", R.string.tag_other),
    )

    /** `businessTags` for `POST /api/auth/register`: the selected chips, in chip order, no duplicates */
    fun payload(selected: Set<String>): List<String> =
        chips.map { it.apiValue }.filter { it in selected }.distinct()
}
