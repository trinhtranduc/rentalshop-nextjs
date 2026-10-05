package com.anyrent.pos.domain.products

import com.anyrent.pos.data.model.Product
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** #472 — which photos the full-screen viewer gets and where it starts; thumbnail tap vs row tap */
class ProductImagesTest {
    private fun product(imageUrl: String? = null, images: List<String> = emptyList()) = Product(
        id = 1, name = "Áo dài", barcode = null, rentPrice = 300_000.0, salePrice = null,
        stock = 1, available = 1, renting = 0, categoryId = null, categoryName = null,
        imageUrl = imageUrl, images = images,
    )

    @Test
    fun viewerUrlsUseImagesWithoutBlanksElseImageUrl() {
        assertEquals(listOf("https://x/a.jpg", "https://x/b.jpg"), ProductImages.viewerUrls(product(images = listOf("https://x/a.jpg", " ", "https://x/b.jpg"))))
        assertEquals(listOf("https://x/avatar.jpg"), ProductImages.viewerUrls(product(imageUrl = "https://x/avatar.jpg", images = listOf("", "  "))))
        assertEquals(emptyList<String>(), ProductImages.viewerUrls(product(imageUrl = " ")))
    }

    @Test
    fun thumbnailTapOpensViewerAtTheThumbnailPhoto() {
        val urls = listOf("https://x/a.jpg", "https://x/b.jpg")
        assertEquals(ProductImageViewerRequest(urls, 0), ProductImages.thumbnailTap(product(images = urls)))
        // Only the avatar: one photo
        assertEquals(ProductImageViewerRequest(listOf("https://x/avatar.jpg"), 0), ProductImages.thumbnailTap(product(imageUrl = "https://x/avatar.jpg")))
    }

    @Test
    fun thumbnailTapWithoutPhotoFallsBackToRow() {
        assertNull(ProductImages.thumbnailUrl(product()))
        assertNull(ProductImages.thumbnailTap(product()))
        assertNull(ProductImages.thumbnailTap(product(imageUrl = "")))
    }

    @Test
    fun detailTapStartsAtTheVisiblePageClamped() {
        val p = product(images = listOf("https://x/a.jpg", "https://x/b.jpg", "https://x/c.jpg"))
        assertEquals(1, ProductImages.detailTap(p, 1)?.startIndex)
        assertEquals(2, ProductImages.detailTap(p, 9)?.startIndex)
        assertEquals(0, ProductImages.detailTap(p, -1)?.startIndex)
        assertNull(ProductImages.detailTap(product(), 0))
    }
}
