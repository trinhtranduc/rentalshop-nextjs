package com.anyrent.pos.print

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.ServerSocket

/** #970 — a blank printer IP is "not set up" (no socket); a refused connection is a connect failure */
class PrintFailureTest {
    @Test
    fun blankIpIsNotConfigured() {
        for (ip in listOf("", "   ")) {
            val result = ThermalPrinter.testPrint(ThermalPrinter.Config(ip = ip))
            assertTrue(result is ThermalPrinter.Result.Failure)
            assertEquals(ThermalPrinter.FailureReason.NOT_CONFIGURED, (result as ThermalPrinter.Result.Failure).reason)
        }
    }

    @Test
    fun refusedConnectionIsConnectFailure() {
        // A port that was free a moment ago: nothing listens there
        val port = ServerSocket(0).use { it.localPort }
        val result = ThermalPrinter.testPrint(ThermalPrinter.Config(ip = "127.0.0.1", port = port))
        assertTrue(result is ThermalPrinter.Result.Failure)
        assertEquals(ThermalPrinter.FailureReason.CONNECT, (result as ThermalPrinter.Result.Failure).reason)
    }

    @Test
    fun testPrintReachesAListeningPrinter() {
        ServerSocket(0).use { server ->
            val reader = Thread { server.accept().use { it.getInputStream().readBytes() } }.apply { start() }
            val result = ThermalPrinter.testPrint(ThermalPrinter.Config(ip = "127.0.0.1", port = server.localPort))
            reader.join(5_000)
            assertEquals(ThermalPrinter.Result.Success, result)
        }
    }

    @Test
    fun messageKindPerReason() {
        assertEquals(PrintFeedback.Kind.NOT_CONFIGURED, PrintFeedback.kind(ThermalPrinter.Result.Failure("x", ThermalPrinter.FailureReason.NOT_CONFIGURED)))
        assertEquals(PrintFeedback.Kind.CONNECT, PrintFeedback.kind(ThermalPrinter.Result.Failure("x", ThermalPrinter.FailureReason.CONNECT)))
        assertEquals(PrintFeedback.Kind.RAW, PrintFeedback.kind(ThermalPrinter.Result.Failure("x")))
    }
}
