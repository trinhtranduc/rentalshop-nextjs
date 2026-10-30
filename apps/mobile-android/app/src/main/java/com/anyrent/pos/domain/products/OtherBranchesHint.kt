package com.anyrent.pos.domain.products

import com.anyrent.pos.data.UserRole
import org.json.JSONObject
import java.time.LocalDate

// STUB so the tests compile and fail for the right reason (#1353)

data class OtherBranchStock(val outletId: Int, val outletName: String, val available: Int)

object OtherBranchesHint {
    const val PATH = ""
    fun canAsk(role: UserRole?): Boolean = false
    fun asks(role: UserRole?, activeOutletCount: Int): Boolean = false
    fun shortProductIds(quantities: Map<Int, Int>, available: Map<Int, Int>, conflictProductIds: Set<Int>): List<Int> = emptyList()
    fun requestBody(productIds: List<Int>, isSale: Boolean, pickup: LocalDate?, returnDate: LocalDate?, outletId: Int?): JSONObject? = null
    fun key(productIds: List<Int>, isSale: Boolean, pickup: LocalDate?, returnDate: LocalDate?, outletId: Int?, today: LocalDate): String = "x"
    fun list(outlets: List<OtherBranchStock>): String = ""
    fun parse(root: JSONObject?): Map<Int, List<OtherBranchStock>> = mapOf(1 to emptyList())
}
