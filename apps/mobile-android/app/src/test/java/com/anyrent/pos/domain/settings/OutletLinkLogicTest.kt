package com.anyrent.pos.domain.settings

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1643: links of a branch. Same cases as the web `tests/outlet-links.test.ts` and iOS `OutletLinksTests`. */
class OutletLinkLogicTest {
    private fun ok(type: OutletLinkType, url: String, label: String? = null): OutletLinkEntry {
        val result = OutletLinkLogic.normalize(type, url, label)
        assertTrue("expected ok for $url, got $result", result is OutletLinkResult.Ok)
        return (result as OutletLinkResult.Ok).link
    }

    private fun bad(type: OutletLinkType, url: String, label: String? = null): OutletLinkError? =
        (OutletLinkLogic.normalize(type, url, label) as? OutletLinkResult.Bad)?.error

    private val web = OutletLinkType.WEBSITE

    @Test
    fun addsHttpsLowerCasesHostTrimsAndDropsBareTrailingSlash() {
        assertEquals(OutletLinkEntry(web, "https://tenshop.vn"), ok(web, "  Tenshop.VN "))
        assertEquals(OutletLinkEntry(web, "http://tenshop.vn"), ok(web, "http://tenshop.vn/"))
        assertEquals("https://tenshop.vn/dat-lich?x=1", ok(web, "https://tenshop.vn/dat-lich?x=1").url)
        assertEquals("https://tenshop.vn:8080/x", ok(web, "tenshop.vn:8080/x").url)
    }

    @Test
    fun refusesAnythingThatIsNotAUsableHttpAddress() {
        val urls = listOf(
            "", "   ", "facebook", "javascript:alert(1)", "mailto:a@b.com", "ftp://tenshop.vn", "data:text/html,hi",
            "https://user:pw@tenshop.vn", "https://.vn", "ht tp://x.vn", "https://tenshop.vn/" + "a".repeat(300),
        )
        for (url in urls) assertEquals(url, OutletLinkError.INVALID, bad(web, url))
    }

    @Test
    fun eachNetworkAcceptsItsOwnHostsAndRefusesOthers() {
        assertEquals("https://www.facebook.com/tenshop", ok(OutletLinkType.FACEBOOK, "www.facebook.com/tenshop").url)
        assertEquals(OutletLinkType.FACEBOOK, ok(OutletLinkType.FACEBOOK, "fb.me/tenshop").type)
        assertEquals(OutletLinkType.INSTAGRAM, ok(OutletLinkType.INSTAGRAM, "instagram.com/tenshop").type)
        assertEquals(OutletLinkType.TIKTOK, ok(OutletLinkType.TIKTOK, "https://www.tiktok.com/@tenshop").type)
        assertEquals(OutletLinkType.YOUTUBE, ok(OutletLinkType.YOUTUBE, "youtu.be/abc").type)
        assertEquals("https://zalo.me/0901234567", ok(OutletLinkType.ZALO, "https://zalo.me/0901234567").url)
        assertEquals("https://m.facebook.com/x", ok(OutletLinkType.FACEBOOK, "m.facebook.com/x").url)
        assertEquals(OutletLinkError.PLATFORM, bad(OutletLinkType.INSTAGRAM, "tiktok.com/@tenshop"))
        assertEquals(OutletLinkError.PLATFORM, bad(OutletLinkType.FACEBOOK, "notfacebook.com/x"))
        assertEquals(OutletLinkError.PLATFORM, bad(OutletLinkType.ZALO, "https://evilzalo.me/1"))
        assertEquals(OutletLinkError.PLATFORM, bad(OutletLinkType.TIKTOK, "https://tiktok.com.evil.vn/x"))
    }

    @Test
    fun websiteAndOtherTakeAnyHostAndOtherNeedsAName() {
        assertEquals(OutletLinkType.WEBSITE, ok(web, "https://shopee.vn/tenshop").type)
        assertEquals(OutletLinkEntry(OutletLinkType.OTHER, "https://shopee.vn/tenshop", "Shopee"), ok(OutletLinkType.OTHER, "https://shopee.vn/tenshop", " Shopee "))
        assertEquals(OutletLinkError.LABEL_REQUIRED, bad(OutletLinkType.OTHER, "https://shopee.vn/x"))
        assertEquals(OutletLinkError.LABEL_REQUIRED, bad(OutletLinkType.OTHER, "https://shopee.vn/x", "   "))
        assertEquals(OutletLinkError.LABEL_TOO_LONG, bad(OutletLinkType.OTHER, "https://shopee.vn/x", "x".repeat(31)))
        assertEquals(30, ok(OutletLinkType.OTHER, "https://shopee.vn/x", "x".repeat(30)).label!!.length)
        // a name on any other type is ignored, never stored
        assertEquals(OutletLinkEntry(web, "https://a.vn"), ok(web, "https://a.vn", "ignored"))
    }

    private fun entry(type: OutletLinkType, url: String) = OutletLinkEntry(type, url)

    @Test
    fun wholeListNormalisesAndDropsRepeats() {
        val result = OutletLinkLogic.normalizeAll(
            listOf(entry(web, "a.vn"), entry(web, "https://a.vn/"), entry(OutletLinkType.INSTAGRAM, "instagram.com/a")),
        )
        assertEquals(
            OutletLinksResult.Ok(listOf(entry(web, "https://a.vn"), entry(OutletLinkType.INSTAGRAM, "https://instagram.com/a"))),
            result,
        )
        assertEquals(OutletLinksResult.Ok(emptyList()), OutletLinkLogic.normalizeAll(emptyList()))
    }

    @Test
    fun sixLinksPassSevenDoNot() {
        val six = (0 until 6).map { entry(web, "https://s$it.vn") }
        assertTrue(OutletLinkLogic.normalizeAll(six) is OutletLinksResult.Ok)
        assertEquals(OutletLinksResult.TooMany, OutletLinkLogic.normalizeAll(six + entry(web, "https://s9.vn")))
        // repeats do not count toward the limit
        val same = (0 until 8).map { entry(web, "https://same.vn") }
        assertEquals(OutletLinksResult.Ok(listOf(entry(web, "https://same.vn"))), OutletLinkLogic.normalizeAll(same))
    }

    @Test
    fun namesTheBadRowAndWhy() {
        assertEquals(
            OutletLinksResult.Bad(1, OutletLinkError.INVALID),
            OutletLinkLogic.normalizeAll(listOf(entry(web, "a.vn"), entry(OutletLinkType.FACEBOOK, "facebook"))),
        )
        assertEquals(
            OutletLinksResult.Bad(0, OutletLinkError.PLATFORM),
            OutletLinkLogic.normalizeAll(listOf(entry(OutletLinkType.INSTAGRAM, "tiktok.com/@a"))),
        )
    }

    @Test
    fun storedLinksKeepGoodOnesAndDropJunkWithoutThrowing() {
        assertNull(OutletLinkLogic.parseStored(null))
        assertEquals(emptyList<OutletLinkEntry>(), OutletLinkLogic.parseStored(emptyList()))
        val stored = listOf(
            Triple<String?, String?, String?>("website", "https://a.vn", null),
            Triple<String?, String?, String?>("website", "javascript:alert(1)", null),
            Triple<String?, String?, String?>("instagram", "https://tiktok.com/@a", null),
            Triple<String?, String?, String?>("nope", "https://a.vn", null),
            Triple<String?, String?, String?>("zalo", "zalo.me/0901234567", null),
            Triple<String?, String?, String?>(null, null, null),
            Triple<String?, String?, String?>("website", null, null),
            Triple<String?, String?, String?>("other", "https://shopee.vn/x", "Shopee"),
        )
        assertEquals(
            listOf(
                entry(web, "https://a.vn"),
                entry(OutletLinkType.ZALO, "https://zalo.me/0901234567"),
                OutletLinkEntry(OutletLinkType.OTHER, "https://shopee.vn/x", "Shopee"),
            ),
            OutletLinkLogic.parseStored(stored),
        )
    }

    @Test
    fun neverServesMoreThanSix() {
        val stored = (0 until 10).map { Triple<String?, String?, String?>("website", "https://s$it.vn", null) }
        assertEquals(OutletLinkLogic.MAX, OutletLinkLogic.parseStored(stored)!!.size)
    }

    @Test
    fun bodyCarriesLinksOnlyWhenKnown() {
        // not known (the API did not send them): the key is left out, so an old payload keeps the stored links
        assertFalse(OutletLinkLogic.putLinks(JSONObject().put("name", "A"), null).has("links"))
        // known and cleared: an empty list is sent
        val cleared = OutletLinkLogic.putLinks(JSONObject().put("name", "A"), emptyList())
        assertTrue(cleared.has("links"))
        assertEquals(0, cleared.getJSONArray("links").length())
        // known: type, url and the name of "other" only
        val body = OutletLinkLogic.putLinks(
            JSONObject(),
            listOf(entry(web, "https://a.vn"), OutletLinkEntry(OutletLinkType.OTHER, "https://shopee.vn/x", "Shopee")),
        )
        val array = body.getJSONArray("links")
        assertEquals("website", array.getJSONObject(0).getString("type"))
        assertFalse(array.getJSONObject(0).has("label"))
        assertEquals("Shopee", array.getJSONObject(1).getString("label"))
    }

    @Test
    fun brandNamesAreNotTranslatedAndTheTwoGenericTypesAre() {
        assertEquals("TikTok", OutletLinkLogic.brandName(OutletLinkType.TIKTOK))
        assertEquals("YouTube", OutletLinkLogic.brandName(OutletLinkType.YOUTUBE))
        assertNull(OutletLinkLogic.brandName(OutletLinkType.WEBSITE))
        assertNull(OutletLinkLogic.brandName(OutletLinkType.OTHER))
    }
}
