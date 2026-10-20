package com.anyrent.pos.domain.money

import com.anyrent.pos.domain.history.ChangeHistory
import com.anyrent.pos.domain.orders.EntityOrdersLogic
import com.anyrent.pos.domain.orders.OrderShareModel
import com.anyrent.pos.domain.overview.OverviewDashLogic
import com.anyrent.pos.ui.common.formatMoneyVnd
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test

/** #1145 — one money formatter for VND and USD; VND output is what the helpers printed before */
class ShopMoneyTest {
    private val vnd = ShopCurrency.VND
    private val usd = ShopCurrency.USD

    @After fun reset() = ShopMoney.publish(ShopCurrency.VND)

    @Test
    fun vndUnchanged() {
        assertEquals("220.000", ShopMoney.format(220_000.0, vnd))
        assertEquals("1.150.000", ShopMoney.format(1_150_000.0, vnd))
        assertEquals("−50.000", ShopMoney.format(-50_000.0, vnd))
        assertEquals("0", ShopMoney.format(0.0, vnd))
        assertEquals("0", ShopMoney.format(-0.4, vnd))
        assertEquals("1.235", ShopMoney.format(1234.5, vnd))
        assertEquals("150.000đ", ShopMoney.withUnit(150_000.0, vnd))
        assertEquals("−50.000đ", ShopMoney.withUnit(-50_000.0, vnd))
    }

    @Test
    fun usd() {
        assertEquals("$220,000", ShopMoney.format(220_000.0, usd))
        assertEquals("$1,234.50", ShopMoney.format(1234.5, usd))
        assertEquals("$0.05", ShopMoney.format(0.05, usd))
        assertEquals("−$50", ShopMoney.format(-50.0, usd))
        assertEquals("−$50,000", ShopMoney.format(-50_000.0, usd))
        assertEquals("$0", ShopMoney.format(0.0, usd))
        assertEquals("$0", ShopMoney.format(-0.001, usd))
        assertEquals("$150,000", ShopMoney.withUnit(150_000.0, usd))
        assertEquals("$999", ShopMoney.format(999.0, usd))
        assertEquals("$1,000,000.10", ShopMoney.format(1_000_000.1, usd))
    }

    @Test
    fun compact() {
        assertEquals("450.000", ShopMoney.compact(450_000.0, vietnamese = true, currency = vnd))
        assertEquals("18,65 tr", ShopMoney.compact(18_650_000.0, vietnamese = true, currency = vnd))
        assertEquals("18.65M", ShopMoney.compact(18_650_000.0, vietnamese = false, currency = vnd))
        assertEquals("1,2 tỷ", ShopMoney.compact(1_200_000_000.0, vietnamese = true, currency = vnd))
        assertEquals("−2 tr", ShopMoney.compact(-2_000_000.0, vietnamese = true, currency = vnd))
        assertEquals("$450,000", ShopMoney.compact(450_000.0, vietnamese = true, currency = usd))
        assertEquals("$18.65M", ShopMoney.compact(18_650_000.0, vietnamese = true, currency = usd))
        assertEquals("$1.2B", ShopMoney.compact(1_200_000_000.0, vietnamese = false, currency = usd))
        assertEquals("−$2M", ShopMoney.compact(-2_000_000.0, vietnamese = true, currency = usd))
    }

    @Test
    fun normalise() {
        assertEquals(usd, ShopCurrency.from("USD"))
        assertEquals(usd, ShopCurrency.from(" usd "))
        assertEquals(vnd, ShopCurrency.from("VND"))
        assertEquals(vnd, ShopCurrency.from(""))
        assertEquals(vnd, ShopCurrency.from(null))
        assertEquals(vnd, ShopCurrency.from("EUR"))
    }

    @Test
    fun labelsAndConfirmExample() {
        assertEquals("VND (đ)", ShopMoney.label(vnd))
        assertEquals("USD ($)", ShopMoney.label(usd))
        assertEquals("220.000 → $220,000", ShopMoney.example(vnd, usd))
        assertEquals("$220,000 → 220.000", ShopMoney.example(usd, vnd))
    }

    /** The v2 helpers delegate: VND as before, USD once the shop's currency is USD */
    @Test
    fun helpersFollowTheShopCurrency() {
        assertEquals("1.150.000", formatMoneyVnd(1_150_000.0))
        assertEquals("−1.234", OverviewDashLogic.money(-1234.0))
        assertEquals("+1.234", OverviewDashLogic.signedMoney(1234.0))
        assertEquals("18,65 tr", OverviewDashLogic.compact(18_650_000.0, vietnamese = true))
        assertEquals("1.150.000đ", OrderShareModel.money(1_150_000.0))
        assertEquals("− 50.000đ", OrderShareModel.money(-50_000.0))
        assertEquals("1.000.000đ", ChangeHistory.money(1_000_000.0))
        assertEquals("2,1tr", EntityOrdersLogic.compactMoney(2_100_000.0, ::formatMoneyVnd))

        ShopMoney.publish(usd)
        assertEquals("$1,150,000", formatMoneyVnd(1_150_000.0))
        assertEquals("−$1,234", OverviewDashLogic.money(-1234.0))
        assertEquals("+$1,234", OverviewDashLogic.signedMoney(1234.0))
        assertEquals("−$1,234", OverviewDashLogic.signedMoney(-1234.0))
        assertEquals("$18.65M", OverviewDashLogic.compact(18_650_000.0, vietnamese = true))
        assertEquals("$1,150,000", OrderShareModel.money(1_150_000.0))
        assertEquals("− $50", OrderShareModel.money(-50.0))
        assertEquals("$1,000,000", ChangeHistory.money(1_000_000.0))
        assertEquals("$2.1M", EntityOrdersLogic.compactMoney(2_100_000.0, ::formatMoneyVnd))
        assertEquals("$450,000", EntityOrdersLogic.compactMoney(450_000.0, ::formatMoneyVnd))
    }
}
