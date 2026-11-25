package com.anyrent.pos.domain.settings

import org.json.JSONArray
import org.json.JSONObject
import java.net.URI

/** #1643: the networks a branch can link to on its public shop page. `wire` is what the API stores and serves. */
enum class OutletLinkType(val wire: String) {
    WEBSITE("website"),
    FACEBOOK("facebook"),
    INSTAGRAM("instagram"),
    TIKTOK("tiktok"),
    YOUTUBE("youtube"),
    ZALO("zalo"),
    OTHER("other");

    companion object {
        fun fromWire(value: String?): OutletLinkType? = values().firstOrNull { it.wire == value }
    }
}

/** One link of a branch. `label` only for [OutletLinkType.OTHER]. */
data class OutletLinkEntry(val type: OutletLinkType, val url: String, val label: String? = null)

/** `INVALID` = not a usable http(s) address; `PLATFORM` = a valid address but not of the chosen network */
enum class OutletLinkError { INVALID, PLATFORM, LABEL_REQUIRED, LABEL_TOO_LONG }

sealed class OutletLinkResult {
    data class Ok(val link: OutletLinkEntry) : OutletLinkResult()
    data class Bad(val error: OutletLinkError) : OutletLinkResult()
}

sealed class OutletLinksResult {
    data class Ok(val links: List<OutletLinkEntry>) : OutletLinksResult()
    object TooMany : OutletLinksResult()
    data class Bad(val index: Int, val error: OutletLinkError) : OutletLinksResult()
}

/**
 * #1643: the rules for a branch's links, the same as the API and the web form (`packages/utils/src/core/outlet-links.ts`).
 * iOS: `OutletLinks.swift`. Pure: no I/O.
 */
object OutletLinkLogic {
    const val MAX = 6
    const val URL_MAX = 300
    const val LABEL_MAX = 30

    /** The order of the type list */
    val typeOrder: List<OutletLinkType> = OutletLinkType.values().toList()

    /** Hosts each network may use (a subdomain such as `www.` or `m.` also counts); null = any host */
    private fun hosts(type: OutletLinkType): List<String>? = when (type) {
        OutletLinkType.WEBSITE, OutletLinkType.OTHER -> null
        OutletLinkType.FACEBOOK -> listOf("facebook.com", "fb.com", "fb.me")
        OutletLinkType.INSTAGRAM -> listOf("instagram.com")
        OutletLinkType.TIKTOK -> listOf("tiktok.com")
        OutletLinkType.YOUTUBE -> listOf("youtube.com", "youtu.be")
        OutletLinkType.ZALO -> listOf("zalo.me", "zalo.com")
    }

    /** Names of the networks, the same in every language; website and other are translated by the screen (null here) */
    fun brandName(type: OutletLinkType): String? = when (type) {
        OutletLinkType.FACEBOOK -> "Facebook"
        OutletLinkType.INSTAGRAM -> "Instagram"
        OutletLinkType.TIKTOK -> "TikTok"
        OutletLinkType.YOUTUBE -> "YouTube"
        OutletLinkType.ZALO -> "Zalo"
        else -> null
    }

    /** What the example under the URL field shows */
    fun example(type: OutletLinkType): String = when (type) {
        OutletLinkType.WEBSITE -> "tenshop.vn"
        OutletLinkType.FACEBOOK -> "facebook.com/tenshop"
        OutletLinkType.INSTAGRAM -> "instagram.com/tenshop"
        OutletLinkType.TIKTOK -> "tiktok.com/@tenshop"
        OutletLinkType.YOUTUBE -> "youtube.com/@tenshop"
        OutletLinkType.ZALO -> "zalo.me/0901234567"
        OutletLinkType.OTHER -> "shopee.vn/tenshop"
    }

    private val hasHttp = Regex("^https?://", RegexOption.IGNORE_CASE)
    private val hasScheme = Regex("^[a-z][a-z0-9+.-]*:", RegexOption.IGNORE_CASE)
    private val hostPort = Regex("^[^/\\s:]+\\.[^/\\s:]+:\\d+")

    private fun hostMatches(host: String, allowed: List<String>) = allowed.any { host == it || host.endsWith(".$it") }

    /** `https://` added when the owner typed no scheme; anything else with a scheme (`javascript:`, `mailto:`) is refused. Returns the stored text. */
    private fun toStored(raw: String): String? {
        val text = raw.trim()
        if (text.isEmpty() || text.length > URL_MAX) return null
        val http = hasHttp.containsMatchIn(text)
        if (!http && hasScheme.containsMatchIn(text) && !hostPort.containsMatchIn(text)) return null
        val uri = try {
            URI(if (http) text else "https://$text")
        } catch (_: Exception) {
            return null
        }
        val scheme = uri.scheme?.lowercase() ?: return null
        if (scheme != "http" && scheme != "https") return null
        if (uri.rawUserInfo != null) return null
        val host = uri.host?.lowercase() ?: return null
        if (!host.contains('.') || host.startsWith(".") || host.endsWith(".")) return null
        val defaultPort = if (scheme == "https") 443 else 80
        val port = if (uri.port == -1 || uri.port == defaultPort) "" else ":${uri.port}"
        val path = uri.rawPath.orEmpty().ifEmpty { "/" }
        val query = uri.rawQuery?.let { "?$it" }.orEmpty()
        val fragment = uri.rawFragment?.let { "#$it" }.orEmpty()
        val bare = path == "/" && query.isEmpty() && fragment.isEmpty()
        return "$scheme://$host$port${if (bare) "" else path}$query$fragment"
    }

    fun normalize(type: OutletLinkType, url: String, label: String? = null): OutletLinkResult {
        val stored = toStored(url) ?: return OutletLinkResult.Bad(OutletLinkError.INVALID)
        val allowed = hosts(type)
        if (allowed != null) {
            val host = URI(stored).host.lowercase()
            if (!hostMatches(host, allowed)) return OutletLinkResult.Bad(OutletLinkError.PLATFORM)
        }
        if (type == OutletLinkType.OTHER) {
            val name = label.orEmpty().trim()
            if (name.isEmpty()) return OutletLinkResult.Bad(OutletLinkError.LABEL_REQUIRED)
            if (name.length > LABEL_MAX) return OutletLinkResult.Bad(OutletLinkError.LABEL_TOO_LONG)
            return OutletLinkResult.Ok(OutletLinkEntry(type, stored, name))
        }
        return OutletLinkResult.Ok(OutletLinkEntry(type, stored))
    }

    /** Checks a whole list (form submit): normalises each, drops exact repeats, at most 6 */
    fun normalizeAll(list: List<OutletLinkEntry>): OutletLinksResult {
        val links = mutableListOf<OutletLinkEntry>()
        val seen = mutableSetOf<String>()
        for ((index, item) in list.withIndex()) {
            when (val result = normalize(item.type, item.url, item.label)) {
                is OutletLinkResult.Bad -> return OutletLinksResult.Bad(index, result.error)
                is OutletLinkResult.Ok -> {
                    val key = "${result.link.type}|${result.link.url}|${result.link.label.orEmpty()}"
                    if (seen.add(key)) links += result.link
                }
            }
        }
        if (links.size > MAX) return OutletLinksResult.TooMany
        return OutletLinksResult.Ok(links)
    }

    /**
     * Reads what the API served (`links` of an outlet) into a clean list: junk, an unknown type or an address that no longer
     * passes is dropped, never thrown. Null stays null (the key was absent = not known).
     */
    fun parseStored(raw: List<Triple<String?, String?, String?>>?): List<OutletLinkEntry>? {
        if (raw == null) return null
        val out = mutableListOf<OutletLinkEntry>()
        for ((type, url, label) in raw) {
            if (out.size >= MAX) break
            val known = OutletLinkType.fromWire(type) ?: continue
            if (url == null) continue
            val result = try {
                normalize(known, url, label)
            } catch (_: Exception) {
                continue
            }
            if (result is OutletLinkResult.Ok) out += result.link
        }
        return out
    }

    /**
     * Adds `links` to a PUT /api/outlets body, only when the links are known: `[]` clears them, null leaves the key out so the
     * API keeps the stored ones (an old payload never has the key).
     */
    fun putLinks(body: JSONObject, links: List<OutletLinkEntry>?): JSONObject {
        if (links == null) return body
        val array = JSONArray()
        for (link in links) {
            val item = JSONObject().put("type", link.type.wire).put("url", link.url)
            if (link.type == OutletLinkType.OTHER && !link.label.isNullOrBlank()) item.put("label", link.label.trim())
            array.put(item)
        }
        return body.put("links", array)
    }
}
