package com.anyrent.pos.domain.bank

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** #1320 — the bank account printed on bills is cached per outlet; the cache expires after 5 minutes (as iOS) */
class BankAccountCacheTest {
    private val cachedAt = 1_800_000_000_000L

    @Test fun timeToLiveIsFiveMinutes() {
        assertEquals(300_000L, BankAccountRules.CACHE_TTL_MS)
    }

    @Test fun freshRightAfterCaching() {
        assertTrue(BankAccountRules.isCacheFresh(cachedAt, cachedAt))
        assertTrue(BankAccountRules.isCacheFresh(cachedAt, cachedAt + 60_000))
    }

    @Test fun stillFreshJustBeforeTheLimit() {
        assertTrue(BankAccountRules.isCacheFresh(cachedAt, cachedAt + 299_999))
    }

    @Test fun staleAtTheLimitAndAfter() {
        assertFalse(BankAccountRules.isCacheFresh(cachedAt, cachedAt + 300_000))
        assertFalse(BankAccountRules.isCacheFresh(cachedAt, cachedAt + 3_600_000))
    }

    @Test fun staleWhenTheClockWentBackwards() {
        assertFalse(BankAccountRules.isCacheFresh(cachedAt, cachedAt - 1))
    }
}
