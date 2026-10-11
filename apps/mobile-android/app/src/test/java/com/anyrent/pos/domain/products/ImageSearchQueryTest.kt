package com.anyrent.pos.domain.products

import com.anyrent.pos.R
import com.anyrent.pos.domain.error.ApiErrorMessages
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * #654: the image-search query photo is 512 px on the long side at JPEG 70 (same numbers as the iOS
 * `ImageSearchQueryTests`), the search codes map to en/vi text, and NO_PRODUCTS_FOUND is the empty state.
 */
class ImageSearchQueryTest {
    @Test
    fun `numbers match iOS`() {
        assertEquals(512, ImageSearchQuery.MAX_LONG_SIDE)
        assertEquals(70, ImageSearchQuery.JPEG_QUALITY)
        assertTrue(ImageSearchQuery.REQUEST_TIMEOUT_SECONDS >= 25)
    }

    @Test
    fun `target size caps the long side and keeps the aspect`() {
        assertEquals(512 to 384, ImageSearchQuery.targetSize(4032, 3024))
        assertEquals(384 to 512, ImageSearchQuery.targetSize(3024, 4032))
        assertEquals(512 to 512, ImageSearchQuery.targetSize(1080, 1080))
        assertEquals(512 to 288, ImageSearchQuery.targetSize(1920, 1080))
    }

    @Test
    fun `target size never upscales`() {
        assertEquals(400 to 300, ImageSearchQuery.targetSize(400, 300))
        assertEquals(512 to 100, ImageSearchQuery.targetSize(512, 100))
    }

    @Test
    fun `NO_PRODUCTS_FOUND is the empty state`() {
        assertTrue(ImageSearchQuery.isNoMatch("NO_PRODUCTS_FOUND"))
        assertTrue(ImageSearchQuery.isNoMatch("no_products_found"))
        assertFalse(ImageSearchQuery.isNoMatch("SEARCH_FAILED"))
        assertFalse(ImageSearchQuery.isNoMatch(null))
    }

    @Test
    fun `search codes map to localized strings`() {
        assertEquals(R.string.api_error_search_failed, ApiErrorMessages.stringId("SEARCH_FAILED"))
        assertEquals(R.string.api_error_search_timeout, ApiErrorMessages.stringId("SEARCH_TIMEOUT"))
        assertEquals(R.string.api_error_invalid_limit, ApiErrorMessages.stringId("INVALID_LIMIT"))
        assertEquals(R.string.api_error_invalid_min_similarity, ApiErrorMessages.stringId("INVALID_MIN_SIMILARITY"))
        assertEquals(R.string.image_search_empty, ApiErrorMessages.stringId("NO_PRODUCTS_FOUND"))
    }

    @Test
    fun `en and vi carry every search error string`() {
        val keys = listOf(
            "api_error_search_failed",
            "api_error_search_timeout",
            "api_error_invalid_limit",
            "api_error_invalid_min_similarity",
            "image_search_empty",
        )
        val en = strings("values")
        val vi = strings("values-vi")
        for (key in keys) {
            assertTrue(key, en[key].orEmpty().isNotBlank())
            assertTrue(key, vi[key].orEmpty().isNotBlank())
            assertNotEquals(key, en[key], vi[key])
        }
    }

    // #672 results sheet

    @Test
    fun `results are a list or the empty state`() {
        assertEquals(ImageSearchResults.Content.EMPTY, ImageSearchResults.content(0))
        assertEquals(ImageSearchResults.Content.EMPTY, ImageSearchResults.content(-1))
        assertEquals(ImageSearchResults.Content.LIST, ImageSearchResults.content(1))
        assertEquals(ImageSearchResults.Content.LIST, ImageSearchResults.content(50))
    }

    @Test
    fun `title counts the shown products or says no match`() {
        assertEquals(ImageSearchResults.Title.NoMatch, ImageSearchResults.title(0))
        assertEquals(ImageSearchResults.Title.Count(1), ImageSearchResults.title(1))
        assertEquals(ImageSearchResults.Title.Count(4), ImageSearchResults.title(4))
    }

    @Test
    fun `en and vi carry the results sheet strings`() {
        val keys = listOf(
            "image_search_results_empty_title",
            "image_search_results_subtitle",
            "image_search_retake",
            "image_search_by_name",
            "image_search_empty_headline",
            "image_search_empty_message",
            "image_search_tip_whole",
            "image_search_tip_background",
            "image_search_tip_photo",
        )
        val en = strings("values")
        val vi = strings("values-vi")
        for (key in keys) {
            assertTrue(key, en[key].orEmpty().isNotBlank())
            assertTrue(key, vi[key].orEmpty().isNotBlank())
        }
        assertEquals("Không thấy sản phẩm giống", vi["image_search_results_empty_title"])
        assertEquals("Chụp lại", vi["image_search_retake"])
        assertEquals("%1\$d sản phẩm giống", plurals("values-vi", "image_search_results_title")["other"])
        assertEquals("%1\$d similar products", plurals("values", "image_search_results_title")["other"])
        assertEquals("%1\$d similar product", plurals("values", "image_search_results_title")["one"])
    }

    private fun plurals(folder: String, name: String): Map<String, String> {
        val nodes = document(folder).documentElement.getElementsByTagName("plurals")
        val element = (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .first { it.getAttribute("name") == name }
        val items = element.getElementsByTagName("item")
        return (0 until items.length).associate {
            val item = items.item(it) as org.w3c.dom.Element
            item.getAttribute("quantity") to item.textContent
        }
    }

    private fun document(folder: String): org.w3c.dom.Document {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml")
            .map(::File).first { it.exists() }
        return DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file)
    }

    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml")
            .map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file)
            .documentElement.getElementsByTagName("string")
        return (0 until nodes.length).associate {
            val element = nodes.item(it) as org.w3c.dom.Element
            element.getAttribute("name") to element.textContent
        }
    }
}
