#!/usr/bin/env python3
"""
Script to update ErrorCodes.swift and localization files from backend errors.json
"""

import json
import re
import os

# Paths
ERRORS_JSON_PATH = "/Users/trinhtran/Documents/Source Code/rentalshop-nextjs/locales/en/errors.json"
ERROR_CODES_SWIFT = "POS ADBD/Model/ErrorCodes.swift"
EN_LOCALIZABLE = "POS ADBD/en.lproj/Localizable.strings"
VI_LOCALIZABLE = "POS ADBD/vi-VN.lproj/Localizable.strings"

def read_errors_json():
    """Read error codes from backend errors.json"""
    with open(ERRORS_JSON_PATH, 'r') as f:
        data = json.load(f)
    # Filter out comments
    return {k: v for k, v in data.items() if not k.startswith('_')}

def read_swift_file():
    """Read ErrorCodes.swift and extract existing codes"""
    with open(ERROR_CODES_SWIFT, 'r') as f:
        return f.read()

def extract_existing_codes(swift_content):
    """Extract existing error code cases from Swift file"""
    pattern = r'case \w+ = "([A-Z_]+)"'
    return set(re.findall(pattern, swift_content))

def convert_to_swift_case(code):
    """Convert ERROR_CODE to errorCode format"""
    parts = code.lower().split('_')
    return ''.join([parts[0]] + [p.capitalize() for p in parts[1:]])

def categorize_error_code(code):
    """Categorize error code into section"""
    if code.startswith(('UNAUTHORIZED', 'FORBIDDEN', 'INVALID_TOKEN', 'TOKEN', 'EMAIL_NOT_VERIFIED', 'ACCOUNT_DEACTIVATED', 'ACCESS_', 'CROSS_MERCHANT', 'USER_NOT_ASSIGNED', 'MERCHANT_ASSOCIATION', 'NO_MERCHANT', 'NO_OUTLET', 'MERCHANT_ACCESS', 'DELETE_USER', 'UPDATE_USER', 'DELETE_OWN')):
        return "Authentication & Authorization"
    elif code.startswith(('VERIFICATION_', 'RATE_LIMIT', 'EMAIL_SEND')):
        return "Verification Errors"
    elif code.startswith(('VALIDATION_', 'INVALID_', 'MISSING_', 'BUSINESS_NAME', 'CATEGORY_NAME', 'OUTLET_NAME', '_ID_REQUIRED', 'CURRENCY_', 'OUTLET_REQUIRED', 'OUTLET_STOCK', 'MULTIPLE_ENTITIES', 'NO_VALID', 'VALIDATION_FAILED')):
        return "Validation Errors"
    elif code.startswith(('PASSWORD_', 'CURRENT_PASSWORD')):
        return "Password Errors"
    elif code.startswith(('DATABASE_', 'DUPLICATE_', 'FOREIGN_KEY', 'NOT_FOUND')):
        return "Database Errors"
    elif code.startswith(('PLAN_LIMIT', 'INSUFFICIENT_PERMISSIONS', 'BUSINESS_RULE', 'SUBSCRIPTION_', 'TRIAL_', 'ORDER_ALREADY', 'PRODUCT_OUT_OF_STOCK', 'INVALID_ORDER_STATUS', 'PAYMENT_', 'PRODUCT_NO_STOCK', 'ACCOUNT_ALREADY', 'ORDER_PAYMENT', 'SUBSCRIPTION_END_DATE', 'DEVICE_INFO', 'API_KEY_NAME', 'VALID_USER_ID', 'CANNOT_DELETE', 'CANNOT_DETECT', 'SESSION_CANNOT', 'CUSTOMER_HAS_ACTIVE', 'PLAN_HAS_ACTIVE', 'MERCHANT_HAS_ACTIVE')):
        return "Business Logic Errors"
    elif code.startswith(('EMAIL_EXISTS', 'PHONE_EXISTS', 'BUSINESS_NAME_EXISTS', 'USER_NOT_FOUND', 'MERCHANT_NOT_FOUND', 'OUTLET_NOT_FOUND', 'PRODUCT_NOT_FOUND', 'ORDER_NOT_FOUND', 'CUSTOMER_NOT_FOUND', 'CATEGORY_NOT_FOUND', 'PLAN_NOT_FOUND', 'SUBSCRIPTION_NOT_FOUND', 'PAYMENT_NOT_FOUND', 'AUDIT_LOG_NOT_FOUND', 'BILLING_CYCLE_NOT_FOUND', 'PLAN_VARIANT_NOT_FOUND', 'BANK_ACCOUNT_NOT_FOUND', 'NO_DEFAULT', 'NO_OUTLETS', 'NO_SUBSCRIPTION', 'NO_DATA_AVAILABLE', 'NO_ENTITIES', 'NO_FIELDS', 'NO_IMAGE', 'NO_ORPHANED', 'SESSION_NOT_FOUND', 'SOME_USERS_NOT_FOUND', 'PLAN_LIMIT_ADDON_NOT_FOUND', 'DEFAULT_OUTLET', 'PRODUCT_OUTLET', 'PRODUCT_ACCESS', 'MERCHANT_INACTIVE', 'FEATURE_NOT_IMPLEMENTED')):
        return "Resource Specific Errors"
    elif code.startswith(('CUSTOMER_DUPLICATE', 'OUTLET_NAME_EXISTS', 'CATEGORY_NAME_EXISTS', 'EMAIL_ALREADY_EXISTS', 'PHONE_ALREADY_EXISTS', 'MERCHANT_DUPLICATE', 'PLAN_NAME_EXISTS', 'PRODUCT_NAME_EXISTS')):
        return "Conflict Errors"
    elif code.startswith(('INTERNAL_SERVER', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'GATEWAY_ERROR', 'TIMEOUT_ERROR', 'FETCH_', 'CREATE_', 'UPDATE_', 'DELETE_', 'RETRIEVE_', 'CHANGE_PASSWORD', 'DEVICE_REGISTRATION', 'SYNC_', 'CLEANUP_', 'PASSWORD_HASH', 'PASSWORD_UPDATE', 'QR_CODE', 'SYNC_PARTIALLY', 'SYNC_RESUME')):
        return "System Errors"
    elif code.startswith(('FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'UPLOAD_', 'IMAGE_', 'NO_IMAGE', 'MULTIPLE_ENTITIES_IN_FILE')):
        return "File Upload Errors"
    elif code.endswith('_SUCCESS') or code.startswith(('LOGIN_SUCCESS', 'LOGOUT_SUCCESS', 'TOKEN_VALID', 'EMAIL_VERIFIED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'VERIFICATION_EMAIL', 'DEVICE_REGISTERED', 'SYNC_CHECK_SUCCESS', 'SYNC_COMPLETED', 'PREVIEW_SUCCESS', 'PAYLOAD_VALIDATION', 'DASHBOARD_DATA', 'GROWTH_METRICS', 'TODAY_METRICS', 'TOP_PRODUCTS', 'ORDER_ANALYTICS', 'SUBSCRIPTION_PAUSED_SUCCESS', 'SUBSCRIPTION_RENEWED', 'CATEGORIES_FETCHED', 'PRODUCTS_FETCHED', 'SYNC_DATA_FETCHED', 'OUTLETS_FOUND', 'PRODUCTS_FOUND', 'PRODUCT_AVAILABILITY', 'AVAILABILITY_CHECKED', 'SUBSCRIPTION_STATUS', 'MERCHANT_REGISTERED', 'MERCHANT_ACCOUNT_CREATED', 'USER_ACCOUNT_CREATED')):
        return "Success Messages"
    elif code.startswith(('DATA_INTEGRITY', 'CHECK_', 'ALL_ORDERS', 'ALL_ORDER_ITEMS', 'ALL_PAYMENTS', 'ALL_PRODUCTS', 'ALL_USERS', 'AUDIT_LOG_WORKING', 'RECENT_OPERATIONS', 'NO_ORPHANED')):
        return "Data Integrity Checks"
    elif code.startswith(('TEST_', 'API_KEYS_WORKING', 'AWS_S3')):
        return "Test Messages"
    else:
        return "Other Errors"

def add_error_codes_to_swift(swift_content, new_codes, errors_data):
    """Add new error codes to Swift enum"""
    # Find the last case before helper methods
    pattern = r'(case \w+ = "[A-Z_]+"\s*\n\s*// MARK: - Helper Methods)'
    match = re.search(pattern, swift_content)
    
    if not match:
        # Try to find before File Upload Errors section
        pattern = r'(case \w+ = "[A-Z_]+"\s*\n\s*// MARK: - File Upload Errors)'
        match = re.search(pattern, swift_content)
    
    if not match:
        # Find the last case statement
        pattern = r'(case \w+ = "[A-Z_]+"\s*\n\s*// MARK: - Helper Methods)'
        # If still not found, find last case
        pattern = r'(case \w+ = "[A-Z_]+"\s*\n)'
        matches = list(re.finditer(pattern, swift_content))
        if matches:
            match = matches[-1]
    
    if not match:
        print("Could not find insertion point in Swift file")
        return swift_content
    
    # Group new codes by category
    categorized = {}
    for code in sorted(new_codes):
        category = categorize_error_code(code)
        if category not in categorized:
            categorized[category] = []
        categorized[category].append(code)
    
    # Build new cases
    new_cases = []
    current_category = None
    
    for code in sorted(new_codes):
        category = categorize_error_code(code)
        if category != current_category:
            if current_category is not None:
                new_cases.append("")
            new_cases.append(f"    // MARK: - {category}")
            current_category = category
        
        swift_case = convert_to_swift_case(code)
        new_cases.append(f'    case {swift_case} = "{code}"')
    
    new_cases_text = "\n".join(new_cases)
    
    # Insert before helper methods
    insert_pos = match.start()
    # Find the newline before the match
    before_newline = swift_content.rfind('\n', 0, insert_pos)
    if before_newline != -1:
        insert_pos = before_newline + 1
    
    return swift_content[:insert_pos] + new_cases_text + "\n    \n" + swift_content[insert_pos:]

def add_messages_to_dict(swift_content, new_codes, errors_data):
    """Add error messages to APIErrorMessages dictionary"""
    # Find the messages dictionary
    pattern = r'(static let messages: \[APIErrorCode: String\] = \[)'
    match = re.search(pattern, swift_content)
    if not match:
        return swift_content
    
    # Find the closing bracket of messages dict
    start_pos = match.end()
    bracket_count = 1
    pos = start_pos
    while pos < len(swift_content) and bracket_count > 0:
        if swift_content[pos] == '[':
            bracket_count += 1
        elif swift_content[pos] == ']':
            bracket_count -= 1
        pos += 1
    
    # Insert new messages before closing bracket
    new_messages = []
    for code in sorted(new_codes):
        swift_case = convert_to_swift_case(code)
        message = errors_data.get(code, code.replace('_', ' ').title())
        new_messages.append(f'        .{swift_case}: "{message}",')
    
    new_messages_text = "\n".join(new_messages)
    return swift_content[:pos-1] + "\n" + new_messages_text + "\n        " + swift_content[pos-1:]

def add_status_codes(swift_content, new_codes):
    """Add HTTP status codes for new error codes"""
    # Find statusCodes dictionary
    pattern = r'(static let statusCodes: \[APIErrorCode: Int\] = \[)'
    match = re.search(pattern, swift_content)
    if not match:
        return swift_content
    
    # Find closing bracket
    start_pos = match.end()
    bracket_count = 1
    pos = start_pos
    while pos < len(swift_content) and bracket_count > 0:
        if swift_content[pos] == '[':
            bracket_count += 1
        elif swift_content[pos] == ']':
            bracket_count -= 1
        pos += 1
    
    # Determine status code based on error type
    def get_status_code(code):
        if code.endswith('_SUCCESS') or 'SUCCESS' in code:
            return 200
        elif code.startswith(('UNAUTHORIZED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'INVALID_CREDENTIALS')):
            return 401
        elif code.startswith(('FORBIDDEN', 'ACCESS_DENIED', 'INSUFFICIENT_PERMISSIONS', 'CROSS_MERCHANT', 'NO_MERCHANT', 'NO_OUTLET')):
            return 403
        elif code.startswith(('NOT_FOUND', 'NO_', 'DEFAULT_OUTLET_NOT_FOUND')):
            return 404
        elif code.startswith(('DUPLICATE', 'EXISTS', 'ALREADY_EXISTS', 'ALREADY_VERIFIED')):
            return 409
        elif code.startswith(('VALIDATION_', 'INVALID_', 'MISSING_', 'REQUIRED')):
            return 400
        elif code.startswith(('BUSINESS_RULE', 'PRODUCT_OUT_OF_STOCK', 'INVALID_ORDER_STATUS')):
            return 422
        elif code.startswith(('RATE_LIMIT')):
            return 429
        elif code.startswith(('FILE_TOO_LARGE')):
            return 413
        elif code.startswith(('INTERNAL_SERVER', 'DATABASE_ERROR', 'FETCH_', 'CREATE_', 'UPDATE_', 'DELETE_', 'SYNC_', 'CLEANUP_')):
            return 500
        elif code.startswith(('SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'GATEWAY_ERROR', 'TIMEOUT')):
            return 503
        elif code.startswith(('FEATURE_NOT_IMPLEMENTED')):
            return 501
        else:
            return 500
    
    new_status_codes = []
    for code in sorted(new_codes):
        swift_case = convert_to_swift_case(code)
        status_code = get_status_code(code)
        new_status_codes.append(f'        .{swift_case}: {status_code},')
    
    new_status_codes_text = "\n".join(new_status_codes)
    return swift_content[:pos-1] + "\n" + new_status_codes_text + "\n        " + swift_content[pos-1:]

def add_localization(localizable_path, new_codes, errors_data, is_vietnamese=False):
    """Add error codes to localization file"""
    with open(localizable_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if error codes section exists
    if '// MARK: - Error Codes' not in content:
        # Add at the end
        content += "\n\n// MARK: - Error Codes\n"
    else:
        # Find the end of error codes section
        pattern = r'(// MARK: - Error Codes\n)'
        match = re.search(pattern, content)
        if match:
            # Find the next MARK or end of file
            next_mark = re.search(r'\n// MARK: -', content[match.end():])
            if next_mark:
                insert_pos = match.end() + next_mark.start()
            else:
                insert_pos = len(content)
        else:
            insert_pos = len(content)
    
    # Add new localizations
    new_localizations = []
    for code in sorted(new_codes):
        if is_vietnamese:
            # For Vietnamese, we'll use a simple translation
            # In production, you'd want proper translations
            message = errors_data.get(code, code.replace('_', ' ').title())
            # Simple English to Vietnamese mapping (you should replace with proper translations)
            new_localizations.append(f'"{code}" = "{message}";')
        else:
            message = errors_data.get(code, code.replace('_', ' ').title())
            new_localizations.append(f'"{code}" = "{message}";')
    
    new_localizations_text = "\n".join(new_localizations)
    
    if '// MARK: - Error Codes' in content:
        # Insert after the MARK comment
        pattern = r'(// MARK: - Error Codes\n)'
        match = re.search(pattern, content)
        if match:
            return content[:match.end()] + new_localizations_text + "\n" + content[match.end():]
    
    return content + "\n" + new_localizations_text + "\n"

def main():
    print("Reading errors.json...")
    errors_data = read_errors_json()
    
    print("Reading ErrorCodes.swift...")
    swift_content = read_swift_file()
    
    print("Extracting existing codes...")
    existing_codes = extract_existing_codes(swift_content)
    
    print(f"Found {len(errors_data)} error codes in errors.json")
    print(f"Found {len(existing_codes)} existing codes in ErrorCodes.swift")
    
    new_codes = set(errors_data.keys()) - existing_codes
    print(f"Found {len(new_codes)} new error codes to add")
    
    if not new_codes:
        print("No new error codes to add!")
        return
    
    print("\nUpdating ErrorCodes.swift...")
    swift_content = add_error_codes_to_swift(swift_content, new_codes, errors_data)
    swift_content = add_messages_to_dict(swift_content, new_codes, errors_data)
    swift_content = add_status_codes(swift_content, new_codes)
    
    with open(ERROR_CODES_SWIFT, 'w') as f:
        f.write(swift_content)
    print(f"✓ Updated {ERROR_CODES_SWIFT}")
    
    print("\nUpdating English localization...")
    en_content = add_localization(EN_LOCALIZABLE, new_codes, errors_data, False)
    with open(EN_LOCALIZABLE, 'w', encoding='utf-8') as f:
        f.write(en_content)
    print(f"✓ Updated {EN_LOCALIZABLE}")
    
    print("\nUpdating Vietnamese localization...")
    vi_content = add_localization(VI_LOCALIZABLE, new_codes, errors_data, True)
    with open(VI_LOCALIZABLE, 'w', encoding='utf-8') as f:
        f.write(vi_content)
    print(f"✓ Updated {VI_LOCALIZABLE}")
    
    print(f"\n✓ Successfully added {len(new_codes)} error codes!")

if __name__ == "__main__":
    main()
