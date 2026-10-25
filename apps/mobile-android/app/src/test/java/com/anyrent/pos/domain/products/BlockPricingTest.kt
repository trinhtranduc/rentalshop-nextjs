package com.anyrent.pos.domain.products

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * #1189 day-block pricing: the port of `calculateBlockRent` against the shared golden file
 * `tests/fixtures/block-pricing-golden.json` (one source of truth with the API, the web and iOS), then the table
 * readers and the form parser.
 */
class BlockPricingTest {
    private class Golden(val tables: Map<String, Pair<BlockTable, String>>, val cases: List<Triple<String, Int, Double>>)

    private fun goldenFile(): File {
        // Gradle runs unit tests with the module directory (apps/mobile-android/app) as the working directory
        var dir: File? = File("").absoluteFile
        while (dir != null) {
            val candidate = File(dir, "tests/fixtures/block-pricing-golden.json")
            if (candidate.exists()) return candidate
            dir = dir.parentFile
        }
        error("tests/fixtures/block-pricing-golden.json not found from ${File("").absolutePath}")
    }

    private fun golden(): Golden {
        val json = JSONObject(goldenFile().readText())
        val tablesJson = json.getJSONObject("tables")
        val tables = tablesJson.keys().asSequence().associateWith { name ->
            val t = tablesJson.getJSONObject(name)
            val tiers = (0 until t.getJSONArray("tiers").length()).map { t.getJSONArray("tiers").getDouble(it) }
            BlockTable(
                tiers, t.getInt("startDay"), t.getString("extraMode"),
                if (t.isNull("extraPrice")) null else t.getDouble("extraPrice"),
            ) to t.getString("currency")
        }
        val casesJson = json.getJSONArray("cases")
        val cases = (0 until casesJson.length()).map {
            val c = casesJson.getJSONObject(it)
            Triple(c.getString("table"), c.getInt("days"), c.getDouble("total"))
        }
        return Golden(tables, cases)
    }

    @Test
    fun `every golden case matches`() {
        val golden = golden()
        assertTrue("golden has cases", golden.cases.size >= 20)
        for ((name, days, total) in golden.cases) {
            val (table, currency) = golden.tables.getValue(name)
            val got = BlockPricing.calculateBlockRent(
                table.tiers, table.startDay, table.extraMode, table.extraPrice, days, BlockPricing.minorUnit(currency),
            )
            assertEquals("$name $days days", total, got ?: Double.NaN, 0.0001)
        }
    }

    @Test
    fun `invalid tables are refused`() {
        assertNull(BlockPricing.rent(BlockTable(emptyList()), 1))
        assertNull(BlockPricing.rent(BlockTable(listOf(-1.0)), 1))
        assertNull(BlockPricing.rent(BlockTable(List(32) { 1.0 }), 1))
        assertNull(BlockPricing.rent(BlockTable(listOf(1.0), startDay = 0), 1))
        assertNull(BlockPricing.rent(BlockTable(listOf(1.0), extraMode = "WEEKLY"), 1))
        assertNull(BlockPricing.rent(BlockTable(listOf(1.0), extraPrice = -5.0), 1))
    }

    private val owner = BlockTable(listOf(80_000.0, 100_000.0, 120_000.0), 1, BlockTable.EXTRA_PER_DAY, 20_000.0)

    @Test
    fun `the owner's example reads block and extra days`() {
        val five = BlockPricing.detail(owner, 5)!!
        assertEquals(160_000.0, five.total, 0.0)
        assertEquals(3, five.tierDay)
        assertEquals(2, five.extraDays)
        assertEquals(120_000.0, five.basePrice, 0.0)
        assertEquals(0, BlockPricing.detail(owner, 3)!!.extraDays)
        assertEquals(80_000.0, BlockPricing.rent(owner, 0)!!, 0.0)
    }

    @Test
    fun `a table is read from the API option, numbers may be strings`() {
        val option = JSONObject("""{"type":"BLOCK","price":80000,"blockTiers":[80000,"100000.00",120000],"blockStartDay":1,"blockExtraMode":"EXTRA_PER_DAY","blockExtraPrice":"20000.00"}""")
        assertEquals(owner, BlockPricing.tableFrom(option))
        // an old payload has none of it
        assertNull(BlockPricing.tableFrom(JSONObject("""{"type":"FIXED","price":80000}""")))
        assertNull(BlockPricing.tableFrom(JSONObject("""{"type":"BLOCK","price":1,"blockTiers":[1,"x"]}""")))
        assertNull(BlockPricing.tableFrom(JSONObject("""{"type":"BLOCK","price":1,"blockTiers":[]}""")))
    }

    @Test
    fun `a snapshot is read and an unreadable one is none`() {
        val snap = BlockSnapshot.from(JSONObject("""{"type":"BLOCK","tiers":[80000,100000,120000],"startDay":1,"extraMode":"EXTRA_PER_DAY","extraPrice":20000,"currency":"VND","days":5,"unitPrice":160000}"""))
        assertNotNull(snap)
        assertEquals(owner, snap!!.table)
        assertEquals(160_000.0, snap.detail()!!.total, 0.0)
        assertEquals(120_000.0, snap.detail(3)!!.total, 0.0)
        assertNull(BlockSnapshot.from(JSONObject("""{"type":"BLOCK"}""")))
        assertNull(BlockSnapshot.from(null))
    }

    @Test
    fun `option json carries the table and the day-1 price`() {
        val json = BlockPricing.optionJson(owner, isDefault = true)
        assertEquals("BLOCK", json.getString("type"))
        assertEquals(80_000.0, json.getDouble("price"), 0.0)
        assertTrue(json.getBoolean("isDefault"))
        assertEquals(3, json.getJSONArray("blockTiers").length())
        assertEquals("EXTRA_PER_DAY", json.getString("blockExtraMode"))
        assertEquals(20_000.0, json.getDouble("blockExtraPrice"), 0.0)
        // HOLD_LAST has no extra price key
        assertFalse(BlockPricing.optionJson(BlockTable(listOf(1.0), 1, BlockTable.HOLD_LAST), false).has("blockExtraPrice"))
    }

    @Test
    fun `the price screen boxes become a table`() {
        assertEquals(BlockPricing.Input.Empty, BlockPricing.parse(listOf(""), 1, BlockTable.EXTRA_PER_DAY, ""))
        assertEquals(BlockPricing.Input.Invalid, BlockPricing.parse(listOf("80.000", ""), 1, BlockTable.EXTRA_PER_DAY, "20.000"))
        assertEquals(BlockPricing.Input.Invalid, BlockPricing.parse(listOf("80.000"), 1, BlockTable.EXTRA_PER_DAY, ""))
        assertEquals(
            BlockPricing.Input.Table(owner),
            BlockPricing.parse(listOf("80.000", "100.000", "120.000"), 1, BlockTable.EXTRA_PER_DAY, "20.000"),
        )
        assertEquals(
            BlockPricing.Input.Table(BlockTable(listOf(80_000.0), 1, BlockTable.HOLD_LAST, null)),
            BlockPricing.parse(listOf("80.000"), 1, BlockTable.HOLD_LAST, "20.000"),
        )
    }
}
