package com.anyrent.pos.domain.error

import android.content.Context
import com.anyrent.pos.R

/**
 * Maps API `code` values to user-facing copy.
 *
 * Why: the backend sends English `message` plus a machine `code` like
 * `PLAN_LIMIT_EXCEEDED`. iOS translates via Localizable.strings keyed by that
 * code. Android used to show both strings at once (and often as red text under
 * the save bar instead of a dialog).
 */
object ApiErrorMessages {
    /** [params] are the API's `data.messageParams` (e.g. `outlets`), filled into `{name}` placeholders (#859) */
    fun resolve(context: Context?, code: String?, fallback: String, params: Map<String, String> = emptyMap()): String {
        val id = stringId(code)
        if (context != null && id != 0) {
            val noParams = noParamsStringId(code).takeIf { it != 0 }?.let { context.getString(it) }
            return fillParams(context.getString(id), params, noParams)
        }

        val cleaned = fallback.trim()
        if (cleaned.matches(SNAKE_CODE)) {
            return context?.getString(R.string.request_failed) ?: "Request failed"
        }
        return cleaned.ifBlank {
            context?.getString(R.string.request_failed) ?: "Request failed"
        }
    }

    internal fun stringId(code: String?): Int = when (code?.uppercase()) {
        // #986: codes in locales/vi/errors-mobile.json, sentences from locales/en and locales/vi errors.json
        "ACCESS_DENIED" -> R.string.api_error_access_denied
        "ACCESS_TOKEN_REQUIRED" -> R.string.api_error_access_token_required
        "ACCOUNT_ALREADY_DELETED" -> R.string.api_error_account_already_deleted
        "ACCOUNT_DEACTIVATED" -> R.string.api_error_account_deactivated
        "ACCOUNT_DELETED_SUCCESS" -> R.string.api_error_account_deleted_success
        "ADMIN_OUTLET_ID_REQUIRED" -> R.string.api_error_admin_outlet_id_required
        "ALL_ORDER_ITEMS_VALID_PRODUCTS" -> R.string.api_error_all_order_items_valid_products
        "ALL_ORDERS_VALID_AMOUNTS" -> R.string.api_error_all_orders_valid_amounts
        "ALL_ORDERS_VALID_CUSTOMERS" -> R.string.api_error_all_orders_valid_customers
        "ALL_PAYMENTS_VALID_ORDERS" -> R.string.api_error_all_payments_valid_orders
        "ALL_PRODUCTS_VALID_LEVELS" -> R.string.api_error_all_products_valid_levels
        "ALL_PRODUCTS_VALID_STOCK" -> R.string.api_error_all_products_valid_stock
        "ALL_USERS_VALID_OUTLETS" -> R.string.api_error_all_users_valid_outlets
        "API_KEY_NAME_REQUIRED" -> R.string.api_error_api_key_name_required
        "API_KEYS_WORKING" -> R.string.api_error_api_keys_working
        "AUDIT_LOG_NOT_FOUND" -> R.string.api_error_audit_log_not_found
        "AUDIT_LOG_RETRIEVED_SUCCESS" -> R.string.api_error_audit_log_retrieved_success
        "AUDIT_LOG_WORKING" -> R.string.api_error_audit_log_working
        "AVAILABILITY_CHECKED" -> R.string.api_error_availability_checked
        "AWS_S3_TEST_FAILED" -> R.string.api_error_aws_s3_test_failed
        "BANK_ACCOUNT_NOT_FOUND" -> R.string.api_error_bank_account_not_found
        "BILLING_CONFIG_UPDATED_SUCCESS" -> R.string.api_error_billing_config_updated_success
        "BILLING_CYCLE_NOT_FOUND" -> R.string.api_error_billing_cycle_not_found
        "BUSINESS_NAME_EXISTS" -> R.string.api_error_business_name_exists
        "BUSINESS_NAME_REQUIRED" -> R.string.api_error_business_name_required
        "BUSINESS_RULE_VIOLATION" -> R.string.api_error_business_rule_violation
        "CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT" -> R.string.api_error_cannot_create_order_for_other_merchant
        "CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET" -> R.string.api_error_cannot_create_order_for_other_outlet
        "CANNOT_DELETE_ADDON_LIMIT_EXCEEDED" -> R.string.api_error_cannot_delete_addon_limit_exceeded
        "CANNOT_DELETE_DEFAULT_CATEGORY" -> R.string.api_error_cannot_delete_default_category
        "CANNOT_DELETE_DEFAULT_OUTLET" -> R.string.api_error_cannot_delete_default_outlet
        "CANNOT_DELETE_LAST_ADMIN" -> R.string.api_error_cannot_delete_last_admin
        "CANNOT_DELETE_SELF" -> R.string.api_error_cannot_delete_self
        "CANNOT_DETECT_ENTITY" -> R.string.api_error_cannot_detect_entity
        "CANNOT_EDIT_DEPOSIT_AFTER_ORDER_CREATED" -> R.string.api_error_cannot_edit_deposit_after_order_created
        "CANNOT_TRANSFER_LAST_MERCHANT_OWNER" -> R.string.api_error_cannot_transfer_last_merchant_owner
        "CANNOT_UPDATE_ORDER_FROM_OTHER_MERCHANT" -> R.string.api_error_cannot_update_order_from_other_merchant
        "CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET" -> R.string.api_error_order_other_outlet
        "CATEGORIES_FETCHED" -> R.string.api_error_categories_fetched
        "CATEGORY_CREATED_SUCCESS" -> R.string.api_error_category_created_success
        "CATEGORY_DELETED_SUCCESS" -> R.string.api_error_category_deleted_success
        "CATEGORY_NAME_EXISTS" -> R.string.api_error_category_name_exists
        "CATEGORY_NAME_REQUIRED" -> R.string.api_error_category_name_required
        "CATEGORY_NOT_FOUND" -> R.string.api_error_category_not_found
        "CATEGORY_RETRIEVED_SUCCESS" -> R.string.api_error_category_retrieved_success
        "CATEGORY_UPDATED_SUCCESS" -> R.string.api_error_category_updated_success
        "CHANGE_PASSWORD_FAILED" -> R.string.api_error_change_password_failed
        "CHECK_AUDIT_LOG_FAILED" -> R.string.api_error_check_audit_log_failed
        "CHECK_DATA_CONSISTENCY_FAILED" -> R.string.api_error_check_data_consistency_failed
        "CHECK_ORDER_CUSTOMER_INTEGRITY_FAILED" -> R.string.api_error_check_order_customer_integrity_failed
        "CHECK_ORDER_PRODUCT_INTEGRITY_FAILED" -> R.string.api_error_check_order_product_integrity_failed
        "CHECK_ORPHANED_RECORDS_FAILED" -> R.string.api_error_check_orphaned_records_failed
        "CHECK_PAYMENT_ORDER_INTEGRITY_FAILED" -> R.string.api_error_check_payment_order_integrity_failed
        "CHECK_PRODUCT_STOCK_FAILED" -> R.string.api_error_check_product_stock_failed
        "CHECK_USER_OUTLET_INTEGRITY_FAILED" -> R.string.api_error_check_user_outlet_integrity_failed
        "CLEANUP_FAILED" -> R.string.api_error_cleanup_failed
        "CREATE_CUSTOMER_FAILED" -> R.string.api_error_create_customer_failed
        "CREATE_OUTLET_FAILED" -> R.string.api_error_create_outlet_failed
        "CROSS_MERCHANT_ACCESS_DENIED" -> R.string.api_error_cross_merchant_access_denied
        "CURRENCY_REQUIRED" -> R.string.api_error_currency_required
        "CURRENCY_UPDATED_SUCCESS" -> R.string.api_error_currency_updated_success
        "CURRENT_PASSWORD_INCORRECT" -> R.string.api_error_current_password_incorrect
        "CURRENT_PASSWORD_REQUIRED" -> R.string.api_error_current_password_required
        "CUSTOMER_CREATED_SUCCESS" -> R.string.api_error_customer_created_success
        "CUSTOMER_DELETED_SUCCESS" -> R.string.api_error_customer_deleted_success
        "CUSTOMER_DUPLICATE" -> R.string.api_error_customer_duplicate
        "CUSTOMER_HAS_ACTIVE_ORDERS" -> R.string.api_error_customer_has_active_orders
        "CUSTOMER_ID_REQUIRED" -> R.string.api_error_customer_id_required
        "CUSTOMER_NOT_FOUND" -> R.string.api_error_customer_not_found
        "CUSTOMER_RETRIEVED_SUCCESS" -> R.string.api_error_customer_retrieved_success
        "CUSTOMER_UPDATED_SUCCESS" -> R.string.api_error_customer_updated_success
        "DASHBOARD_DATA_SUCCESS" -> R.string.api_error_dashboard_data_success
        "DATA_INTEGRITY_CHECK_PASSED" -> R.string.api_error_data_integrity_check_passed
        "DATABASE_ERROR" -> R.string.api_error_database_error
        "DEFAULT_OUTLET_NOT_FOUND" -> R.string.api_error_default_outlet_not_found
        "DELETE_ACCOUNT_FAILED" -> R.string.api_error_delete_account_failed
        "DELETE_CATEGORY_FAILED" -> R.string.api_error_delete_category_failed
        "DELETE_OWN_ACCOUNT_ONLY" -> R.string.api_error_delete_own_account_only
        "DELETE_USER_FAILED" -> R.string.api_error_delete_user_failed
        "DELETE_USER_OUT_OF_SCOPE" -> R.string.api_error_delete_user_out_of_scope
        "DEPOSIT_AMOUNT_REQUIRED" -> R.string.api_error_deposit_amount_required
        "DEPOSIT_AMOUNT_UPDATED" -> R.string.api_error_deposit_amount_updated
        "DEPOSIT_AUTO_CALCULATED" -> R.string.api_error_deposit_auto_calculated
        "DEPOSIT_EDIT_FAILED" -> R.string.api_error_deposit_edit_failed
        "DEPOSIT_EDIT_SUCCESS" -> R.string.api_error_deposit_edit_success
        "DEPOSIT_MANUALLY_OVERRIDDEN" -> R.string.api_error_deposit_manually_overridden
        "DEVICE_INFO_REQUIRED" -> R.string.api_error_device_info_required
        "DEVICE_REGISTERED_SUCCESS" -> R.string.api_error_device_registered_success
        "DEVICE_REGISTRATION_FAILED" -> R.string.api_error_device_registration_failed
        "DUPLICATE_ENTRY" -> R.string.api_error_duplicate_entry
        "EMAIL_ALREADY_EXISTS" -> R.string.api_error_email_already_exists
        "EMAIL_ALREADY_VERIFIED" -> R.string.api_error_email_already_verified
        "EMAIL_EXISTS" -> R.string.api_error_email_exists
        "EMAIL_NOT_VERIFIED" -> R.string.api_error_email_not_verified
        "EMAIL_SEND_FAILED" -> R.string.api_error_email_send_failed
        "EMAIL_VERIFICATION_FAILED" -> R.string.api_error_email_verification_failed
        "EMAIL_VERIFIED_SUCCESS" -> R.string.api_error_email_verified_success
        "FEATURE_NOT_IMPLEMENTED" -> R.string.api_error_feature_not_implemented
        "FETCH_BILLING_CYCLES_FAILED" -> R.string.api_error_fetch_billing_cycles_failed
        "FETCH_BILLING_FAILED" -> R.string.api_error_fetch_billing_failed
        "FETCH_CATEGORIES_FAILED" -> R.string.api_error_fetch_categories_failed
        "FETCH_MERCHANTS_FAILED" -> R.string.api_error_fetch_merchants_failed
        "FETCH_ORDERS_FAILED" -> R.string.api_error_fetch_orders_failed
        "FETCH_OUTLETS_FAILED" -> R.string.api_error_fetch_outlets_failed
        "FETCH_PLAN_FAILED" -> R.string.api_error_fetch_plan_failed
        "FETCH_PRICING_FAILED" -> R.string.api_error_fetch_pricing_failed
        "FETCH_PRODUCTS_FAILED" -> R.string.api_error_fetch_products_failed
        "FETCH_SYSTEM_ANALYTICS_FAILED" -> R.string.api_error_fetch_system_analytics_failed
        "FILE_TOO_LARGE" -> R.string.api_error_file_too_large
        "FORBIDDEN" -> R.string.api_error_forbidden
        "FOREIGN_KEY_CONSTRAINT" -> R.string.api_error_foreign_key_constraint
        "GATEWAY_ERROR" -> R.string.api_error_gateway_error
        "GROWTH_METRICS_SUCCESS" -> R.string.api_error_growth_metrics_success
        "IMAGE_UPLOAD_FAILED" -> R.string.api_error_image_upload_failed
        "IMAGE_VALIDATION_FAILED" -> R.string.api_error_image_validation_failed
        "INSUFFICIENT_PERMISSIONS" -> R.string.api_error_insufficient_permissions
        "INTERNAL_SERVER_ERROR" -> R.string.api_error_internal_server_error
        "INVALID_ACTION" -> R.string.api_error_invalid_action
        "INVALID_AMOUNT" -> R.string.api_error_invalid_amount
        "INVALID_AUDIT_LOG_ID_FORMAT" -> R.string.api_error_invalid_audit_log_id_format
        "INVALID_BILLING_CONFIG" -> R.string.api_error_invalid_billing_config
        "INVALID_BUSINESS_TYPE" -> R.string.api_error_invalid_business_type
        "INVALID_CATEGORY_ID" -> R.string.api_error_invalid_category_id
        "INVALID_CREDENTIALS" -> R.string.api_error_invalid_credentials
        "INVALID_CURRENCY" -> R.string.api_error_invalid_currency
        "INVALID_CUSTOMER_ID_FORMAT" -> R.string.api_error_invalid_customer_id_format
        "INVALID_DATE" -> R.string.api_error_invalid_date
        "INVALID_DATE_FORMAT" -> R.string.api_error_invalid_date_format
        "INVALID_DATE_RANGE" -> R.string.api_error_invalid_date_range
        "INVALID_DEPOSIT_AMOUNT" -> R.string.api_error_invalid_deposit_amount
        "INVALID_END_DATE" -> R.string.api_error_invalid_end_date
        "INVALID_ENTITY_TYPE" -> R.string.api_error_invalid_entity_type
        "INVALID_FEATURES_FORMAT" -> R.string.api_error_invalid_features_format
        "INVALID_FILE_TYPE" -> R.string.api_error_invalid_file_type
        "INVALID_ID_FORMAT" -> R.string.api_error_invalid_id_format
        "INVALID_INPUT" -> R.string.api_error_invalid_input
        "INVALID_INTERVAL_CONFIG" -> R.string.api_error_invalid_interval_config
        "INVALID_JSON" -> R.string.api_error_invalid_json
        "INVALID_JSON_DATA" -> R.string.api_error_invalid_json_data
        "INVALID_LIMIT" -> R.string.api_error_invalid_limit
        "INVALID_LIMITS_FORMAT" -> R.string.api_error_invalid_limits_format
        "INVALID_MERCHANT_ID" -> R.string.api_error_invalid_merchant_id
        "INVALID_MERCHANT_ID_FORMAT" -> R.string.api_error_invalid_merchant_id_format
        "INVALID_MIN_SIMILARITY" -> R.string.api_error_invalid_min_similarity
        "INVALID_ORDER_ID_FORMAT" -> R.string.api_error_invalid_order_id_format
        "INVALID_ORDER_STATUS" -> R.string.api_error_invalid_order_status
        "INVALID_OUTLET_ID" -> R.string.api_error_invalid_outlet_id
        "INVALID_OUTLET_STOCK" -> R.string.api_error_invalid_outlet_stock
        "INVALID_PAYLOAD" -> R.string.api_error_invalid_payload
        "INVALID_PAYMENT_METHOD" -> R.string.api_error_invalid_payment_method
        "INVALID_PLAN_ID_FORMAT" -> R.string.api_error_invalid_plan_id_format
        "INVALID_PLATFORM" -> R.string.api_error_invalid_platform
        "INVALID_PRICING_TYPE" -> R.string.api_error_invalid_pricing_type
        "INVALID_PRODUCT_ID_FORMAT" -> R.string.api_error_invalid_product_id_format
        "INVALID_QUERY" -> R.string.api_error_invalid_query
        "INVALID_QUERY_PARAMETERS" -> R.string.api_error_invalid_query_parameters
        "INVALID_RENTAL_DATES" -> R.string.api_error_invalid_rental_dates
        "INVALID_REQUEST" -> R.string.api_error_invalid_request
        "INVALID_SESSION_ID" -> R.string.api_error_invalid_session_id
        "INVALID_SUBSCRIPTION_ID" -> R.string.api_error_invalid_subscription_id
        "INVALID_TENANT_KEY" -> R.string.api_error_invalid_tenant_key
        "INVALID_TIMEZONE" -> R.string.api_error_invalid_timezone
        "INVALID_TOKEN" -> R.string.api_error_invalid_token
        "INVALID_UPDATE_DATA" -> R.string.api_error_invalid_update_data
        "INVALID_USER_DATA" -> R.string.api_error_invalid_user_data
        "INVALID_USER_ID" -> R.string.api_error_invalid_user_id
        "INVALID_USER_ID_FORMAT" -> R.string.api_error_invalid_user_id_format
        "INVALID_USER_ROLE" -> R.string.api_error_invalid_user_role
        "LOGIN_SUCCESS" -> R.string.api_error_login_success
        "LOGOUT_SUCCESS" -> R.string.api_error_logout_success
        "MANUAL_PAYMENT_CREATED_SUCCESS" -> R.string.api_error_manual_payment_created_success
        "MERCHANT_ACCESS_REQUIRED" -> R.string.api_error_merchant_access_required
        "MERCHANT_ACCOUNT_CREATED_PENDING_VERIFICATION" -> R.string.api_error_merchant_account_created_pending_verification
        "MERCHANT_ACCOUNT_CREATED_SUCCESS" -> R.string.api_error_merchant_account_created_success
        "MERCHANT_ASSOCIATION_REQUIRED" -> R.string.api_error_merchant_association_required
        "MERCHANT_CREATED_SUCCESS" -> R.string.api_error_merchant_created_success
        "MERCHANT_DELETED_SUCCESS" -> R.string.api_error_merchant_deleted_success
        "MERCHANT_DUPLICATE" -> R.string.api_error_merchant_duplicate
        "MERCHANT_HAS_ACTIVE_SUBSCRIPTION" -> R.string.api_error_merchant_has_active_subscription
        "MERCHANT_ID_REQUIRED" -> R.string.api_error_merchant_id_required
        "MERCHANT_INACTIVE" -> R.string.api_error_merchant_inactive
        "MERCHANT_INFO_UPDATED_SUCCESS" -> R.string.api_error_merchant_info_updated_success
        "MERCHANT_NOT_FOUND" -> R.string.api_error_merchant_not_found
        "MERCHANT_REGISTERED_TRIAL_SUCCESS" -> R.string.api_error_merchant_registered_trial_success
        "MERCHANT_RETRIEVED_SUCCESS" -> R.string.api_error_merchant_retrieved_success
        "MERCHANT_UPDATED_SUCCESS" -> R.string.api_error_merchant_updated_success
        "MISSING_ENDPOINT_OR_TOKEN" -> R.string.api_error_missing_endpoint_or_token
        "MISSING_ENTITIES" -> R.string.api_error_missing_entities
        "MISSING_ENTITY_TYPE" -> R.string.api_error_missing_entity_type
        "MISSING_FILE" -> R.string.api_error_missing_file
        "MISSING_MERCHANT_ID" -> R.string.api_error_missing_merchant_id
        "MISSING_PRODUCT_DATA" -> R.string.api_error_missing_product_data
        "MISSING_REQUIRED_FIELD" -> R.string.api_error_missing_required_field
        "MISSING_SESSION_ID" -> R.string.api_error_missing_session_id
        "MISSING_STAGING_KEYS" -> R.string.api_error_missing_staging_keys
        "MOBILE_LOGIN_SUCCESS" -> R.string.api_error_mobile_login_success
        "MULTIPLE_ENTITIES_FOUND" -> R.string.api_error_multiple_entities_found
        "MULTIPLE_ENTITIES_IN_FILE" -> R.string.api_error_multiple_entities_in_file
        "NETWORK_ERROR" -> R.string.api_error_network_error
        "NO_DATA_AVAILABLE" -> R.string.api_error_no_data_available
        "NO_DEFAULT_BANK_ACCOUNT" -> R.string.api_error_no_default_bank_account
        "NO_DEFAULT_OUTLET" -> R.string.api_error_no_default_outlet
        "NO_ENTITIES_TO_IMPORT" -> R.string.api_error_no_entities_to_import
        "NO_FIELDS_TO_UPDATE" -> R.string.api_error_no_fields_to_update
        "NO_IMAGE_FILE" -> R.string.api_error_no_image_file
        "NO_MERCHANT_ACCESS" -> R.string.api_error_no_merchant_access
        "NO_ORPHANED_ORDER_ITEMS" -> R.string.api_error_no_orphaned_order_items
        "NO_OUTLET_ACCESS" -> R.string.api_error_no_outlet_access
        "NO_OUTLETS_FOUND" -> R.string.api_error_no_outlets_found
        "NO_PRODUCTS_FOUND" -> R.string.image_search_empty
        "NO_SUBSCRIPTION" -> R.string.api_error_no_subscription
        "NO_SUBSCRIPTION_FOUND" -> R.string.api_error_no_subscription_found
        "NO_VALID_FIELDS" -> R.string.api_error_no_valid_fields
        "NOT_FOUND" -> R.string.api_error_not_found
        "ORDER_ALREADY_EXISTS" -> R.string.api_error_order_already_exists
        "ORDER_ANALYTICS_SUCCESS" -> R.string.api_error_order_analytics_success
        "ORDER_CREATED_SUCCESS" -> R.string.api_error_order_created_success
        "ORDER_ID_REQUIRED" -> R.string.api_error_order_id_required
        "ORDER_NOT_FOUND" -> R.string.api_error_order_not_found
        "ORDER_PAYMENT_REQUIRED" -> R.string.api_error_order_payment_required
        "ORDER_RETRIEVED_SUCCESS" -> R.string.api_error_order_retrieved_success
        "ORDER_SCHEDULE_CONFLICT" -> R.string.api_error_order_schedule_conflict
        "ORDER_UPDATED_SUCCESS" -> R.string.api_error_order_updated_success
        "OUTLET_CREATED_SUCCESS" -> R.string.api_error_outlet_created_success
        "OUTLET_DEACTIVATED" -> R.string.api_error_outlet_deactivated
        "OUTLET_DELETED_SUCCESS" -> R.string.api_error_outlet_deleted_success
        "OUTLET_HAS_OPEN_ORDERS" -> R.string.api_error_outlet_has_open_orders
        "INSTALLMENT_EXCEEDS_TOTAL" -> R.string.api_error_installment_exceeds_total
        "INSTALLMENT_OVERPAID" -> R.string.api_error_installment_overpaid
        "INSTALLMENT_ALREADY_PAID" -> R.string.api_error_installment_already_paid
        "INSTALLMENT_FORBIDDEN_ROLE" -> R.string.api_error_installment_forbidden_role
        "INSTALLMENT_UNPAID_AT_PICKUP" -> R.string.api_error_installment_unpaid_at_pickup
        "INSTALLMENT_NOT_FOUND" -> R.string.api_error_installment_not_found
        "INSTALLMENT_NO_PLAN" -> R.string.api_error_installment_no_plan
        "INSTALLMENT_LOYALTY_UNSUPPORTED" -> R.string.api_error_installment_loyalty_unsupported
        "CANCEL_AMOUNTS_MISMATCH" -> R.string.api_error_cancel_amounts_mismatch
        "CANCELLED_ORDER_KEEPS_AMOUNT" -> R.string.api_error_cancelled_order_keeps_amount
        "DEPOSIT_SETTINGS_INVALID" -> R.string.api_error_deposit_settings_invalid
        "BLOCK_PRICE_MISMATCH" -> R.string.api_error_block_price_mismatch
        "PRICING_TYPE_REQUIRES_UPDATE" -> R.string.api_error_pricing_type_requires_update
        "BLOCK_TABLE_INVALID" -> R.string.api_error_block_table_invalid
        "OUTLET_ID_REQUIRED" -> R.string.api_error_outlet_id_required
        "OUTLET_INFO_UPDATED_SUCCESS" -> R.string.api_error_outlet_info_updated_success
        "OUTLET_NAME_ADDRESS_REQUIRED" -> R.string.api_error_outlet_name_address_required
        "OUTLET_NAME_EXISTS" -> R.string.api_error_outlet_name_exists
        "OUTLET_NOT_FOUND" -> R.string.api_error_outlet_not_found
        "OUTLET_OPERATIONS_SUCCESS" -> R.string.api_error_outlet_operations_success
        "OUTLET_REQUIRED" -> R.string.api_error_outlet_required
        "OUTLET_STOCK_REQUIRED" -> R.string.api_error_outlet_stock_required
        "OUTLET_UPDATED_SUCCESS" -> R.string.api_error_outlet_updated_success
        "OUTLETS_FOUND" -> R.string.api_error_outlets_found
        "PASSWORD_CHANGED_SUCCESS" -> R.string.api_error_password_changed_success
        "PASSWORD_HASH_FAILED" -> R.string.api_error_password_hash_failed
        "PASSWORD_MIN_LENGTH" -> R.string.api_error_password_min_length
        "PASSWORD_MISMATCH" -> R.string.api_error_password_mismatch
        "PASSWORD_RESET_LINK_SENT" -> R.string.api_error_password_reset_link_sent
        "PASSWORD_RESET_SUCCESS" -> R.string.api_error_password_reset_success
        "PASSWORD_RESET_TOKEN_EXPIRED" -> R.string.api_error_password_reset_token_expired
        "PASSWORD_RESET_TOKEN_INVALID" -> R.string.api_error_password_reset_token_invalid
        "PASSWORD_RESET_TOKEN_USED" -> R.string.api_error_password_reset_token_used
        "PASSWORD_UPDATE_FAILED" -> R.string.api_error_password_update_failed
        "PAYLOAD_VALIDATION_SUCCESS" -> R.string.api_error_payload_validation_success
        "PAYMENT_FAILED" -> R.string.api_error_payment_failed
        "PAYMENT_METHOD_AND_TRANSACTION_ID_REQUIRED" -> R.string.api_error_payment_method_and_transaction_id_required
        "PAYMENT_NOT_FOUND" -> R.string.api_error_payment_not_found
        "PHONE_ALREADY_EXISTS" -> R.string.api_error_phone_already_exists
        "PHONE_EXISTS" -> R.string.api_error_phone_exists
        "PLAN_CREATED_SUCCESS" -> R.string.api_error_plan_created_success
        "PLAN_DELETED_SUCCESS" -> R.string.api_error_plan_deleted_success
        "PLAN_HAS_ACTIVE_SUBSCRIPTIONS" -> R.string.api_error_plan_has_active_subscriptions
        "PLAN_ID_REQUIRED" -> R.string.api_error_plan_id_required
        "PLAN_LIMIT_ADDON_NOT_FOUND" -> R.string.api_error_plan_limit_addon_not_found
        "PLAN_LIMIT_EXCEEDED" -> R.string.api_error_plan_limit_exceeded
        "PLAN_NAME_EXISTS" -> R.string.api_error_plan_name_exists
        "PLAN_NOT_FOUND" -> R.string.api_error_plan_not_found
        "PLAN_RETRIEVED_SUCCESS" -> R.string.api_error_plan_retrieved_success
        "PLAN_UPDATED_SUCCESS" -> R.string.api_error_plan_updated_success
        "PLAN_UPGRADE_REQUIRED" -> R.string.api_error_plan_upgrade_required
        "PLAN_VARIANT_NOT_FOUND" -> R.string.api_error_plan_variant_not_found
        "PLATFORM_ACCESS_DENIED" -> R.string.api_error_platform_access_denied
        "PREVIEW_SUCCESS" -> R.string.api_error_preview_success
        "PRICING_CONFIG_UPDATED_SUCCESS" -> R.string.api_error_pricing_config_updated_success
        "PRODUCT_ACCESS_DENIED" -> R.string.api_error_product_access_denied
        "PRODUCT_AVAILABILITY_FOUND" -> R.string.api_error_product_availability_found
        "PRODUCT_CREATED_SUCCESS" -> R.string.api_error_product_created_success
        "PRODUCT_DELETE_MERCHANT_ONLY" -> R.string.api_error_product_delete_merchant_only
        "PRODUCT_DELETED_SUCCESS" -> R.string.api_error_product_deleted_success
        "PRODUCT_HAS_NO_IMAGES" -> R.string.api_error_product_has_no_images
        "PRODUCT_HAS_OPEN_ORDERS" -> R.string.api_error_product_has_open_orders
        "PRODUCT_HELD_BY_OTHER_OUTLETS" -> R.string.api_error_product_held_by_other_outlets
        "PRODUCT_ID_REQUIRED" -> R.string.api_error_product_id_required
        "PRODUCT_NAME_EXISTS" -> R.string.api_error_product_name_exists
        "PRODUCT_NO_STOCK_ENTRY" -> R.string.api_error_product_no_stock_entry
        "PRODUCT_NOT_FOUND" -> R.string.api_error_product_not_found
        "PRODUCT_OUT_OF_STOCK" -> R.string.api_error_product_out_of_stock
        "PRODUCT_OUTLET_NOT_FOUND" -> R.string.api_error_product_outlet_not_found
        "PRODUCT_RETRIEVED_SUCCESS" -> R.string.api_error_product_retrieved_success
        "PRODUCT_SHARED_FIELDS_MERCHANT_ONLY" -> R.string.api_error_product_shared_fields_merchant_only
        "PRODUCT_UPDATED_SUCCESS" -> R.string.api_error_product_updated_success
        "PRODUCTS_FETCHED" -> R.string.api_error_products_fetched
        "PRODUCTS_FOUND" -> R.string.api_error_products_found
        "PROFILE_UPDATED_SUCCESS" -> R.string.api_error_profile_updated_success
        "QR_CODE_GENERATION_FAILED" -> R.string.api_error_qr_code_generation_failed
        "RATE_LIMIT_EXCEEDED" -> R.string.api_error_rate_limit_exceeded
        "RATING_ALREADY_REQUESTED" -> R.string.api_error_rating_already_requested
        "RATING_REQUEST_FAILED" -> R.string.api_error_rating_request_failed
        "RATING_REQUEST_SHOWN" -> R.string.api_error_rating_request_shown
        "RECENT_OPERATIONS_WITHOUT_LOGS" -> R.string.api_error_recent_operations_without_logs
        "REFRESH_TOKEN_INVALID" -> R.string.api_error_refresh_token_invalid
        "REFRESH_TOKEN_REQUIRED" -> R.string.api_error_refresh_token_required
        "RETRIEVE_USERS_FAILED" -> R.string.api_error_retrieve_users_failed
        "ROLE_NOT_AVAILABLE" -> R.string.api_error_role_not_available
        "SEARCH_FAILED" -> R.string.api_error_search_failed
        "SEARCH_TIMEOUT" -> R.string.api_error_search_timeout
        "SERVICE_UNAVAILABLE" -> R.string.api_error_service_unavailable
        "SESSION_CANNOT_BE_RESUMED" -> R.string.api_error_session_cannot_be_resumed
        "SESSION_CANNOT_BE_ROLLED_BACK" -> R.string.api_error_session_cannot_be_rolled_back
        "SESSION_EXPIRED" -> R.string.api_error_session_expired
        "SESSION_NOT_FOUND" -> R.string.api_error_session_not_found
        "SESSION_REPLACED" -> R.string.api_error_session_replaced
        "SOME_USERS_NOT_FOUND" -> R.string.api_error_some_users_not_found
        "STOCK_BELOW_RENTED" -> R.string.api_error_stock_below_rented
        "SUBSCRIPTION_CANCELLED" -> R.string.api_error_subscription_cancelled
        "SUBSCRIPTION_CREATED_SUCCESS" -> R.string.api_error_subscription_created_success
        "SUBSCRIPTION_END_DATE_REQUIRED" -> R.string.api_error_subscription_end_date_required
        "SUBSCRIPTION_ERROR" -> R.string.api_error_subscription_error
        "SUBSCRIPTION_EXPIRED" -> R.string.api_error_subscription_expired
        "SUBSCRIPTION_NOT_FOUND" -> R.string.api_error_subscription_not_found
        "SUBSCRIPTION_PAST_DUE" -> R.string.api_error_subscription_past_due
        "SUBSCRIPTION_PAUSED" -> R.string.api_error_subscription_paused
        "SUBSCRIPTION_PAUSED_SUCCESS" -> R.string.api_error_subscription_paused_success
        "SUBSCRIPTION_PERIOD_ENDED" -> R.string.api_error_subscription_period_ended
        "SUBSCRIPTION_RENEWED_SUCCESS" -> R.string.api_error_subscription_renewed_success
        "SUBSCRIPTION_STATUS_RETRIEVED" -> R.string.api_error_subscription_status_retrieved
        "SYNC_CHECK_FAILED" -> R.string.api_error_sync_check_failed
        "SYNC_CHECK_SUCCESS" -> R.string.api_error_sync_check_success
        "SYNC_COMPLETED" -> R.string.api_error_sync_completed
        "SYNC_DATA_FETCHED" -> R.string.api_error_sync_data_fetched
        "SYNC_FAILED" -> R.string.api_error_sync_failed
        "SYNC_PARTIALLY_FAILED" -> R.string.api_error_sync_partially_failed
        "SYNC_RESUME_FAILED" -> R.string.api_error_sync_resume_failed
        "TEST_API_WORKING" -> R.string.api_error_test_api_working
        "TEST_POST_WORKING" -> R.string.api_error_test_post_working
        "TIMEOUT_ERROR" -> R.string.api_error_timeout_error
        "TODAY_METRICS_SUCCESS" -> R.string.api_error_today_metrics_success
        "TOKEN_EXPIRED" -> R.string.api_error_token_expired
        "TOKEN_INVALIDATED_PASSWORD_CHANGED" -> R.string.api_error_token_invalidated_password_changed
        "TOKEN_INVALIDATED_PERMISSIONS_CHANGED" -> R.string.api_error_token_invalidated_permissions_changed
        "TOKEN_REQUIRED" -> R.string.api_error_token_required
        "TOKEN_VALID" -> R.string.api_error_token_valid
        "TOP_PRODUCTS_SUCCESS" -> R.string.api_error_top_products_success
        "TRIAL_EXPIRED" -> R.string.api_error_trial_expired
        "UNAUTHORIZED" -> R.string.api_error_unauthorized
        "UNKNOWN_ERROR" -> R.string.api_error_unknown_error
        "UPDATE_CATEGORY_FAILED" -> R.string.api_error_update_category_failed
        "UPDATE_ORDER_FAILED" -> R.string.api_error_update_order_failed
        "UPDATE_OUTLET_FAILED" -> R.string.api_error_update_outlet_failed
        "UPDATE_PLAN_FAILED" -> R.string.api_error_update_plan_failed
        "UPDATE_PRICING_FAILED" -> R.string.api_error_update_pricing_failed
        "UPDATE_PROFILE_FAILED" -> R.string.api_error_update_profile_failed
        "UPDATE_USER_FAILED" -> R.string.api_error_update_user_failed
        "UPDATE_USER_OUT_OF_SCOPE" -> R.string.api_error_update_user_out_of_scope
        "UPLOAD_FAILED" -> R.string.api_error_upload_failed
        "UPLOAD_IMAGE_FAILED" -> R.string.api_error_upload_image_failed
        "USER_ACCOUNT_CREATED_PENDING_VERIFICATION" -> R.string.api_error_user_account_created_pending_verification
        "USER_ACCOUNT_CREATED_SUCCESS" -> R.string.api_error_user_account_created_success
        "USER_CREATED_SUCCESS" -> R.string.api_error_user_created_success
        "USER_DEACTIVATED_SUCCESS" -> R.string.api_error_user_deactivated_success
        "USER_DELETED_SUCCESS" -> R.string.api_error_user_deleted_success
        "USER_ID_REQUIRED" -> R.string.api_error_user_id_required
        "USER_NOT_ASSIGNED" -> R.string.api_error_user_not_assigned
        "USER_NOT_FOUND" -> R.string.api_error_user_not_found
        "USER_NOT_FOUND_OR_INACTIVE" -> R.string.api_error_user_not_found_or_inactive
        "USER_RETRIEVED_SUCCESS" -> R.string.api_error_user_retrieved_success
        "USER_UPDATED_SUCCESS" -> R.string.api_error_user_updated_success
        "VALID_USER_ID_REQUIRED" -> R.string.api_error_valid_user_id_required
        "VALIDATION_ERROR" -> R.string.api_error_validation
        "VALIDATION_FAILED" -> R.string.api_error_validation_failed
        "VERIFICATION_EMAIL_SENT" -> R.string.api_error_verification_email_sent
        else -> if (isSubscriptionFamily(code)) R.string.api_error_subscription_generic else 0
    }

    internal fun noParamsStringId(code: String?): Int = when (code?.uppercase()) {
        "PRODUCT_HELD_BY_OTHER_OUTLETS" -> R.string.api_error_product_held_by_other_outlets_no_params
        else -> 0
    }

    /**
     * #859: `{name}` placeholders filled from `data.messageParams` (`{outlets}` → "Main (3), Kho (0)").
     * A sentence still holding a placeholder uses [noParams] when there is one.
     */
    internal fun fillParams(text: String, params: Map<String, String>, noParams: String?): String {
        var out = text
        for ((name, value) in params) {
            if (value.isNotEmpty()) out = out.replace("{$name}", value)
        }
        if (!PLACEHOLDER.containsMatchIn(out)) return out
        return noParams ?: out
    }

    /** Toast when a 401 ends the session: another device, a branch turned off (#859), or a plain expiry */
    fun sessionEndStringId(code: String?): Int = when (code?.uppercase()) {
        "SESSION_REPLACED" -> R.string.api_error_session_replaced
        "OUTLET_DEACTIVATED" -> R.string.api_error_outlet_deactivated
        else -> R.string.api_error_session_expired
    }

    internal fun isSubscriptionFamily(code: String?): Boolean {
        val c = code?.uppercase() ?: return false
        return c.startsWith("SUBSCRIPTION_") || c.startsWith("PLAN_") || c.startsWith("TRIAL_")
    }

    private val PLACEHOLDER = Regex("\\{[A-Za-z]+\\}")
    private val SNAKE_CODE = Regex("^[A-Z][A-Z0-9_]{3,}$")
}
