package com.anyrent.pos.domain.outlet

import org.json.JSONArray
import org.json.JSONObject

/** One branch of the merchant, as `GET /api/outlets` returns it (#828) */
data class OutletChoice(
    val id: Int,
    val name: String,
    val address: String? = null,
    val phone: String? = null,
    val isDefault: Boolean = false,
    /** Absent in the answer counts as active (iOS `isActive != false`) */
    val isActive: Boolean = true,
)

/** What the small line above the Home title shows (board SP-dong, #828 mockup; iOS `OutletHeaderMode`) */
sealed interface OutletHeaderMode {
    object Hidden : OutletHeaderMode

    /** Store icon + name in grey, not tappable (outlet users, a shop with one active branch) */
    data class Plain(val name: String) : OutletHeaderMode

    /** "🏬 <name> ▾" button; [highlighted] (soft blue pill) when it is not the default branch */
    data class Button(val name: String, val highlighted: Boolean) : OutletHeaderMode
}

/** The remembered branch when it is still active, else the default. [fellBack]: a remembered branch is gone */
data class ResolvedOutlet(val outlet: OutletChoice?, val fellBack: Boolean)

/** Pure rules of the branch picker (#828, iOS `CurrentOutletLogic`); unit tested */
object CurrentOutletLogic {
    const val MERCHANT = "MERCHANT"

    /** Active outlets, the default first, the rest in the API order */
    fun activeOutlets(outlets: List<OutletChoice>): List<OutletChoice> {
        val active = outlets.filter { it.isActive }
        return active.filter { it.isDefault } + active.filterNot { it.isDefault }
    }

    fun defaultOutlet(active: List<OutletChoice>): OutletChoice? = active.firstOrNull { it.isDefault } ?: active.firstOrNull()

    fun resolve(remembered: Int?, active: List<OutletChoice>): ResolvedOutlet {
        if (remembered != null) {
            active.firstOrNull { it.id == remembered }?.let { return ResolvedOutlet(it, false) }
        }
        return ResolvedOutlet(defaultOutlet(active), remembered != null && active.isNotEmpty())
    }

    /** Only a MERCHANT switches, and only with two or more active branches */
    fun canSwitch(role: String?, activeCount: Int): Boolean = role == MERCHANT && activeCount >= 2

    fun headerMode(role: String?, activeCount: Int, name: String?, isDefault: Boolean): OutletHeaderMode {
        if (name.isNullOrBlank()) return OutletHeaderMode.Hidden
        return if (canSwitch(role, activeCount)) OutletHeaderMode.Button(name, highlighted = !isDefault)
        else OutletHeaderMode.Plain(name)
    }

    /** Switching drops the cart; ask first only when it has lines */
    fun needsCartConfirm(itemCount: Int): Boolean = itemCount > 0

    /** `data.outlets` of `GET /api/outlets` (also a bare array); rows without an id or a name are skipped */
    fun parseOutlets(json: JSONObject): List<OutletChoice> {
        val array = json.optJSONObject("data")?.optJSONArray("outlets")
            ?: json.optJSONArray("data")
            ?: json.optJSONArray("outlets")
            ?: JSONArray()
        return parseArray(array)
    }

    /** Cache of the active list on the device, so the header and the filters are right before the first load */
    fun encode(outlets: List<OutletChoice>): String = JSONArray().apply {
        outlets.forEach { o ->
            put(
                JSONObject()
                    .put("id", o.id)
                    .put("name", o.name)
                    .put("address", o.address ?: JSONObject.NULL)
                    .put("phone", o.phone ?: JSONObject.NULL)
                    .put("isDefault", o.isDefault)
                    .put("isActive", o.isActive)
            )
        }
    }.toString()

    fun decode(raw: String?): List<OutletChoice> =
        raw?.let { runCatching { parseArray(JSONArray(it)) }.getOrNull() } ?: emptyList()

    private fun parseArray(array: JSONArray): List<OutletChoice> = (0 until array.length()).mapNotNull { i ->
        val o = array.optJSONObject(i) ?: return@mapNotNull null
        val id = o.optInt("id").takeIf { it > 0 } ?: return@mapNotNull null
        val name = o.text("name") ?: return@mapNotNull null
        OutletChoice(
            id = id,
            name = name,
            address = o.text("address"),
            phone = o.text("phone"),
            isDefault = o.optBoolean("isDefault", false),
            isActive = if (o.has("isActive") && !o.isNull("isActive")) o.optBoolean("isActive", true) else true,
        )
    }

    private fun JSONObject.text(key: String): String? =
        if (isNull(key)) null else optString(key).trim().takeIf { it.isNotEmpty() }
}
