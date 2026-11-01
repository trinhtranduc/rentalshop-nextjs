package com.anyrent.pos.domain.orders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1418 same cases as iOS `OrderPhotoQueueTests` */
class OrderPhotoLogicTest {
    @Test
    fun conditionPhotosStopAtThreeAndNotePhotosStayAtFive() {
        assertEquals(3, OrderPhotoLogic.MAX_PHOTOS)
        assertEquals(5, OrderDetailLogic.MAX_NOTE_PHOTOS)
        assertTrue(OrderPhotoLogic.canAdd(2))
        assertFalse(OrderPhotoLogic.canAdd(3))
        assertEquals("2/3", OrderPhotoLogic.countLabel(2))
    }

    @Test
    fun aLostReplyIsNotSentAgain() {
        assertEquals(OrderPhotoDecision.AlreadyUploaded, OrderPhotoLogic.decide(3, 0, 3))
        assertEquals(OrderPhotoDecision.AlreadyUploaded, OrderPhotoLogic.decide(3, 2, 1))
    }

    @Test
    fun nothingArrivedSendsEverything() {
        assertEquals(OrderPhotoDecision.Send(3), OrderPhotoLogic.decide(0, 0, 3))
    }

    @Test
    fun aPhotoFromAnotherDeviceLeavesOnlyTheRoom() {
        assertEquals(OrderPhotoDecision.Send(2), OrderPhotoLogic.decide(1, 0, 3))
        assertEquals(OrderPhotoDecision.NoRoom, OrderPhotoLogic.decide(3, 0, 4))
    }

    @Test
    fun addLaterOnlyWhileOutWithRoomAndNothingWaiting() {
        assertTrue(OrderPhotoLogic.canAddLater("PICKUPED", 2, 0, true))
        assertFalse("3/3 hides it", OrderPhotoLogic.canAddLater("PICKUPED", 3, 0, true))
        assertFalse(OrderPhotoLogic.canAddLater("PICKUPED", 2, 1, true))
        assertFalse(OrderPhotoLogic.canAddLater("PICKUPED", 2, 0, false))
        assertFalse(OrderPhotoLogic.canAddLater("RETURNED", 2, 0, true))
        assertFalse("no photos: the detail stays as today", OrderPhotoLogic.canAddLater("PICKUPED", 0, 0, true))
    }
}
