package com.anyrent.pos.data

import com.anyrent.pos.domain.orders.OrderPhotoField
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/** #1418 the queue on the device, the uploader and the additive parsing */
@OptIn(ExperimentalCoroutinesApi::class)
class OrderPhotoQueueTest {
    @get:Rule
    val folder = TemporaryFolder()

    private val photo = byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 1)
    private val field = OrderPhotoField.PICKUP

    @Test
    fun queueSurvivesANewInstance() {
        OrderPhotoQueue(folder.root).enqueue("u1_m1", 9, field, 1, listOf(photo, photo))
        val entry = OrderPhotoQueue(folder.root).entry("u1_m1", 9, field)!!
        assertEquals(1, entry.baseline)
        assertEquals(2, entry.files.size)
        assertArrayEquals(photo, entry.files[0].readBytes())
    }

    @Test
    fun anotherUserOrShopSeesNothing() {
        val queue = OrderPhotoQueue(folder.root)
        queue.enqueue(OrderPhotoQueue.scope(1, 7), 9, field, 0, listOf(photo))
        assertNull(queue.entry(OrderPhotoQueue.scope(2, 7), 9, field))
        assertNull(queue.entry(OrderPhotoQueue.scope(1, 8), 9, field))
        assertNotNull(queue.entry(OrderPhotoQueue.scope(1, 7), 9, field))
    }

    @Test
    fun queuesExpire() {
        var today = 1_000_000L
        val queue = OrderPhotoQueue(folder.root, now = { today })
        queue.enqueue("u1_m1", 9, field, 0, listOf(photo))
        today += OrderPhotoQueue.MAX_AGE_MS + 60_000
        queue.purgeExpired()
        assertNull(queue.entry("u1_m1", 9, field))
    }

    private class Fake {
        var scope: String? = "u1_m1"
        var serverCount: Int? = 0
        var sendResult = true
        val sent = mutableListOf<Int>()
    }

    private fun TestScope.uploader(fake: Fake) = OrderPhotoUploader(
        queue = OrderPhotoQueue(folder.root),
        scopeKey = { fake.scope },
        loadServerCount = { _, _ -> fake.serverCount },
        send = { _, _, photos ->
            fake.sent += photos.size
            fake.sendResult
        },
        coroutines = CoroutineScope(StandardTestDispatcher(testScheduler)),
    )

    private fun run(block: suspend TestScope.() -> Unit) = kotlinx.coroutines.test.runTest { block() }

    @Test
    fun successEmptiesTheQueue() = run {
        val fake = Fake()
        val sut = uploader(fake)
        assertTrue(sut.add(9, field, 0, listOf(photo, photo, photo)))
        advanceUntilIdle()
        assertEquals(listOf(3), fake.sent)
        assertNull(sut.pending(9, field))
        assertEquals(OrderPhotoUploadState.IDLE, sut.state(9, field))
    }

    @Test
    fun failureKeepsThePhotosAndRetryThenSends() = run {
        val fake = Fake().apply { sendResult = false }
        val sut = uploader(fake)
        sut.add(9, field, 0, listOf(photo))
        advanceUntilIdle()
        assertEquals(OrderPhotoUploadState.FAILED, sut.state(9, field))
        assertNotNull(sut.pending(9, field))
        fake.sendResult = true
        sut.resume(9, field)
        advanceUntilIdle()
        assertEquals(listOf(1, 1), fake.sent)
        assertNull(sut.pending(9, field))
    }

    @Test
    fun retryAfterALostReplySkipsTheResend() = run {
        val fake = Fake().apply { sendResult = false }
        val sut = uploader(fake)
        sut.add(9, field, 0, listOf(photo))
        advanceUntilIdle()
        fake.serverCount = 1
        sut.resume(9, field)
        advanceUntilIdle()
        assertEquals(listOf(1), fake.sent)
        assertNull(sut.pending(9, field))
    }

    @Test
    fun orderCannotBeReadCountsAsFailedAndSendsNothing() = run {
        val fake = Fake().apply { serverCount = null }
        val sut = uploader(fake)
        sut.add(9, field, 0, listOf(photo))
        advanceUntilIdle()
        assertEquals(emptyList<Int>(), fake.sent)
        assertEquals(OrderPhotoUploadState.FAILED, sut.state(9, field))
    }

    @Test
    fun anotherLoginNeitherSeesNorSendsAndTheOwnerGetsThemBack() = run {
        val fake = Fake().apply { sendResult = false }
        val sut = uploader(fake)
        sut.add(9, field, 0, listOf(photo))
        advanceUntilIdle()
        fake.scope = "u2_m7"
        assertNull(sut.pending(9, field))
        assertEquals(OrderPhotoUploadState.IDLE, sut.state(9, field))
        sut.resume(9, field)
        advanceUntilIdle()
        assertEquals(listOf(1), fake.sent)
        fake.scope = null
        sut.resume(9, field)
        advanceUntilIdle()
        assertEquals("logged out: nothing is sent", listOf(1), fake.sent)
        fake.scope = "u1_m1"
        assertNotNull(sut.pending(9, field))
    }

    @Test
    fun uploadInFlightIsNotStartedTwice() = run {
        val fake = Fake()
        val sut = uploader(fake)
        sut.add(9, field, 0, listOf(photo))
        sut.resume(9, field)
        advanceUntilIdle()
        assertEquals(listOf(1), fake.sent)
    }

    @Test
    fun photoRequestIsNeverRepeatedByOkHttpAndCarriesOnlyThePhotos() {
        val body = ApiParity.orderPhotosBody(field, listOf(photo, photo))
        assertTrue("a silent retry would store the photos twice", body.isOneShot())
        val sink = okio.Buffer()
        body.writeTo(sink)
        val sent = sink.readUtf8()
        assertEquals(2, Regex("name=\"pickupNotesImages\"").findAll(sent).count())
        assertTrue(sent.contains("name=\"data\""))
        assertTrue(sent.contains("{}"))
    }

    @Test
    fun warningAtTheTopOnlyWhileAnUploadFailed() {
        assertEquals(3, OrderPhotoUploadState.FAILED.failedCount(waiting = 3))
        assertNull("a retry is running: no second way to start one", OrderPhotoUploadState.UPLOADING.failedCount(waiting = 3))
        assertNull(OrderPhotoUploadState.IDLE.failedCount(waiting = 3))
        assertNull(OrderPhotoUploadState.FAILED.failedCount(waiting = 0))
    }

    @Test
    fun parsingToleratesEveryShape() {
        fun urls(json: String) = JSONObject(json).photoUrls("pickupNotesImages")
        assertEquals(emptyList<String>(), urls("""{}"""))
        assertEquals(emptyList<String>(), urls("""{"pickupNotesImages":null}"""))
        assertEquals(emptyList<String>(), urls("""{"pickupNotesImages":"https://x/a.jpg"}"""))
        assertEquals(emptyList<String>(), urls("""{"pickupNotesImages":[]}"""))
        assertEquals(listOf("https://x/a.jpg"), urls("""{"pickupNotesImages":[null,"","https://x/a.jpg",5]}"""))
    }
}
