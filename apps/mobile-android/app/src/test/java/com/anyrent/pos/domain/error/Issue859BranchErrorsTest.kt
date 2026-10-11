package com.anyrent.pos.domain.error

import com.anyrent.pos.R
import com.anyrent.pos.domain.auth.AuthErrorMapping
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** #859: the branch error codes of #823 show the user's-language sentence, same texts as iOS (PR #862). */
class Issue859BranchErrorsTest {
    @Test
    fun branchCodesHaveOwnStrings() {
        assertEquals(R.string.api_error_outlet_deactivated, ApiErrorMessages.stringId("OUTLET_DEACTIVATED"))
        assertEquals(
            R.string.api_error_product_shared_fields_merchant_only,
            ApiErrorMessages.stringId("PRODUCT_SHARED_FIELDS_MERCHANT_ONLY"),
        )
        assertEquals(R.string.api_error_product_delete_merchant_only, ApiErrorMessages.stringId("PRODUCT_DELETE_MERCHANT_ONLY"))
        assertEquals(R.string.api_error_product_held_by_other_outlets, ApiErrorMessages.stringId("PRODUCT_HELD_BY_OTHER_OUTLETS"))
        assertEquals(R.string.api_error_outlet_has_open_orders, ApiErrorMessages.stringId("outlet_has_open_orders"))
        assertEquals(
            R.string.api_error_product_held_by_other_outlets_no_params,
            ApiErrorMessages.noParamsStringId("PRODUCT_HELD_BY_OTHER_OUTLETS"),
        )
        assertEquals(0, ApiErrorMessages.noParamsStringId("PRODUCT_HAS_OPEN_ORDERS"))
    }

    @Test
    fun outletNamesFillThePlaceholder() {
        val text = "{outlets} còn sản phẩm này; chỉ chủ shop xóa được."
        assertEquals(
            "Main (3), Kho (0) còn sản phẩm này; chỉ chủ shop xóa được.",
            ApiErrorMessages.fillParams(text, mapOf("outlets" to "Main (3), Kho (0)"), "fallback"),
        )
    }

    @Test
    fun missingOrEmptyNamesUseTheNoNamesSentence() {
        val text = "{outlets} còn sản phẩm này."
        assertEquals("Chi nhánh khác còn sản phẩm này.", ApiErrorMessages.fillParams(text, emptyMap(), "Chi nhánh khác còn sản phẩm này."))
        assertEquals("Chi nhánh khác còn sản phẩm này.", ApiErrorMessages.fillParams(text, mapOf("outlets" to ""), "Chi nhánh khác còn sản phẩm này."))
        // no fallback string: keep the sentence as it is
        assertEquals(text, ApiErrorMessages.fillParams(text, emptyMap(), null))
        // a sentence without placeholders is left alone
        assertEquals("Xong.", ApiErrorMessages.fillParams("Xong.", mapOf("outlets" to "Main"), "fallback"))
    }

    @Test
    fun sessionEndSaysTheBranchWasTurnedOff() {
        assertEquals(R.string.api_error_outlet_deactivated, ApiErrorMessages.sessionEndStringId("OUTLET_DEACTIVATED"))
        assertEquals(R.string.api_error_session_replaced, ApiErrorMessages.sessionEndStringId("SESSION_REPLACED"))
        assertEquals(R.string.api_error_session_expired, ApiErrorMessages.sessionEndStringId("TOKEN_EXPIRED"))
        assertEquals(R.string.api_error_session_expired, ApiErrorMessages.sessionEndStringId(null))
    }

    @Test
    fun loginShowsTheBranchSentence() {
        assertEquals(R.string.api_error_outlet_deactivated, AuthErrorMapping.messageRes("OUTLET_DEACTIVATED", status = 403))
        assertEquals(AuthErrorMapping.Placement.General, AuthErrorMapping.login("OUTLET_DEACTIVATED"))
    }

    private fun strings(folder: String): Map<String, String> {
        val file = listOf("src/main/res/$folder/strings.xml", "app/src/main/res/$folder/strings.xml").map(::File).first { it.exists() }
        val nodes = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(file).documentElement.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) as org.w3c.dom.Element }
            .associate { it.getAttribute("name") to it.textContent.replace("\\'", "'") }
    }

    @Test
    fun textsEqualIos() {
        val vi = mapOf(
            "api_error_outlet_deactivated" to "Chi nhánh đã ngừng hoạt động, liên hệ chủ shop.",
            "api_error_product_shared_fields_merchant_only" to "Nhân viên không sửa được tên, giá, ảnh, danh mục và thông tin chung của sản phẩm; hãy nhờ chủ shop, quản lý chi nhánh hoặc nhân viên kho. Bạn chỉ sửa được tồn kho của chi nhánh mình.",
            "api_error_product_delete_merchant_only" to "Nhân viên không xóa được sản phẩm; hãy nhờ chủ shop, quản lý chi nhánh hoặc nhân viên kho.",
            "api_error_product_held_by_other_outlets" to "{outlets} còn sản phẩm này; chỉ chủ shop xóa được. Muốn ngừng bán ở chi nhánh mình, hãy đặt tồn về 0.",
            "api_error_product_held_by_other_outlets_no_params" to "Chi nhánh khác còn sản phẩm này; chỉ chủ shop xóa được. Muốn ngừng bán ở chi nhánh mình, hãy đặt tồn về 0.",
            "api_error_outlet_has_open_orders" to "Chi nhánh còn đơn đã đặt hoặc đang thuê. Hãy hoàn tất hoặc huỷ các đơn đó trước khi tắt chi nhánh.",
        )
        val en = mapOf(
            "api_error_outlet_deactivated" to "This branch has been deactivated. Please contact the shop owner.",
            "api_error_product_shared_fields_merchant_only" to "Staff cannot change the name, prices, photos, category or other shared details of a product; ask the shop owner, the branch manager or the warehouse staff. You can update your branch's stock.",
            "api_error_product_delete_merchant_only" to "Staff cannot delete products; ask the shop owner, the branch manager or the warehouse staff.",
            "api_error_product_held_by_other_outlets" to "{outlets} still has this product; only the shop owner can delete it. To stop selling it at your branch, set your stock to 0.",
            "api_error_product_held_by_other_outlets_no_params" to "Another branch still has this product; only the shop owner can delete it. To stop selling it at your branch, set your stock to 0.",
            "api_error_outlet_has_open_orders" to "This branch still has orders that are reserved or being rented. Complete or cancel them before turning the branch off.",
        )
        val viFile = strings("values-vi")
        val enFile = strings("values")
        for ((k, v) in vi) assertEquals(k, v, viFile[k])
        for ((k, v) in en) assertEquals(k, v, enFile[k])
    }
}
