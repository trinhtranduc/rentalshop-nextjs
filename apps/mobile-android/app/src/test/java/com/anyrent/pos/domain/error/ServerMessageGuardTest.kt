package com.anyrent.pos.domain.error

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1408: a server message reaches the UI only when it reads like a sentence, never SQL, a path or a stack. */
class ServerMessageGuardTest {
    private val raw = """

        Invalid `t.attendanceScan.findFirst()` invocation in
        /app/apps/api/.next/server/chunks/1677.js:54:55586

          51 SELECT u."merchantId" AS id FROM "User" u
    """.trimIndent()

    @Test
    fun technicalTextIsDetected() {
        listOf(
            raw,
            "PrismaClientKnownRequestError: timed out",
            "at /srv/node_modules/x/index.js:12:3",
            "connect ECONNREFUSED 10.0.0.1:5432",
            "SELECT id FROM \"User\"",
            "a".repeat(401),
        ).forEach { assertTrue(it, ServerMessageGuard.looksTechnical(it)) }
    }

    @Test
    fun sentencesStay() {
        listOf(
            "Không tìm thấy đơn hàng",
            "Please select a product from the list",
            "Order 123456 has already been picked up",
            "Vui lòng thử lại sau 5 phút.",
        ).forEach {
            assertFalse(it, ServerMessageGuard.looksTechnical(it))
            assertEquals(it, ServerMessageGuard.safe(it, "x"))
        }
    }

    @Test
    fun safeUsesTheFallback() {
        assertEquals("generic", ServerMessageGuard.safe(raw, "generic"))
    }

    /** ApiClient.errorMessage() ends here: the error body of an unknown code, in the Kotlin org.json path */
    @Test
    fun resolveNeverReturnsServerText() {
        val text = ApiErrorMessages.resolve(null, null, raw)
        assertFalse(text, text.contains("invocation"))
        assertEquals("Request failed", text)
    }

    @Test
    fun attendanceServerTroubleSaysTryAgain() {
        for (code in listOf("SERVICE_UNAVAILABLE", "DATABASE_ERROR", "INTERNAL_SERVER_ERROR")) {
            val rejection = com.anyrent.pos.domain.attendance.AttendanceLogic.rejection(code, null, "Service temporarily unavailable")
            assertEquals(com.anyrent.pos.domain.attendance.PunchRejectionKind.OTHER, rejection.kind)
            assertEquals(null, rejection.message)
        }
    }

    @Test
    fun appErrorFromAThrowableNeverCarriesIt() {
        val error = AppError.from(IllegalStateException(raw))
        assertFalse(error.message, error.message.contains("SELECT"))
        assertEquals("kept", AppError.from(IllegalStateException("kept")).message)
    }
}
