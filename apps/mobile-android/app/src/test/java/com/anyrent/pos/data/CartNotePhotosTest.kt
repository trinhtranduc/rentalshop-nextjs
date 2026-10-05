package com.anyrent.pos.data

import okhttp3.MultipartBody
import okio.Buffer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

/** #480 — note photos picked in the cart note editor: kept by the cart (memory only), sent on create as `notesImages` */
class CartNotePhotosTest {
    @get:Rule val tmp = TemporaryFolder()

    @Before fun setUp() = CartStore.clear(persistToDisk = false)
    @After fun tearDown() = CartStore.clear(persistToDisk = false)

    private fun file(name: String): File = tmp.newFile(name).also { it.writeBytes(byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 1)) }

    @Test fun cartKeepsAtMostFivePhotos() {
        CartStore.setNoteImageFiles((1..7).map { file("p$it.jpg") })
        assertEquals(5, CartStore.noteImageFiles.value.size)
        assertEquals("p1.jpg", CartStore.noteImageFiles.value.first().name)
    }

    @Test fun clearEmptiesThePhotosAndDeletesTheFiles() {
        val photo = file("p.jpg")
        CartStore.setNoteImageFiles(listOf(photo))
        CartStore.clear(persistToDisk = false)
        assertTrue(CartStore.noteImageFiles.value.isEmpty())
        assertTrue(!photo.exists())
    }

    // Create payload

    @Test fun withoutPhotosTheCreateBodyIsTheSameJson() {
        val body = ApiClient.createOrderBody("""{"orderType":"RENT"}""", emptyList())
        assertEquals("application/json; charset=utf-8", body.contentType().toString())
        val buffer = Buffer().also { body.writeTo(it) }
        assertEquals("""{"orderType":"RENT"}""", buffer.readUtf8())
    }

    @Test fun withPhotosTheCreateBodyIsMultipartDataPlusNotesImages() {
        val body = ApiClient.createOrderBody("""{"orderType":"RENT"}""", listOf(byteArrayOf(1), byteArrayOf(2)))
        assertTrue(body is MultipartBody)
        val parts = (body as MultipartBody).parts
        val dispositions = parts.map { it.headers?.get("Content-Disposition").orEmpty() }
        assertEquals(3, parts.size)
        assertTrue(dispositions[0].contains("name=\"data\""))
        assertTrue(dispositions[1].contains("name=\"notesImages\"") && dispositions[1].contains("notes_image_0.jpg"))
        assertTrue(dispositions[2].contains("name=\"notesImages\"") && dispositions[2].contains("notes_image_1.jpg"))
        assertEquals("image/jpeg", parts[1].body.contentType().toString())
        val data = Buffer().also { parts[0].body.writeTo(it) }.readUtf8()
        assertEquals("""{"orderType":"RENT"}""", data)
    }
}
