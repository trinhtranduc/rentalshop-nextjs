// ============================================================================
// BANK QR CODE UTILITIES (Vietnam Bank Transfer)
// ============================================================================

/**
 * Vietnam bank codes mapping (Bank Name -> BIN Code)
 * BIN codes are 6-digit codes used for VietQR generation
 * Based on official bank list from State Bank of Vietnam
 * Reference: https://github.com/subiz/vietqr
 */
export const VIETNAM_BANK_CODES: Record<string, string> = {
  // Major banks
  'Vietcombank': '970436', // VCB - TMCP Ngoại thương Việt Nam
  'Vietinbank': '970415', // ICB - TMCP Công thương Việt Nam
  'BIDV': '970418', // BIDV - Đầu tư và Phát triển Việt Nam
  'Techcombank': '970407', // TCB - TMCP Kỹ thương
  'ACB': '970416', // ACB - TMCP Á Châu
  'VPBank': '970432', // VPB - TMCP Việt Nam Thịnh Vượng
  'MBBank': '970422', // MB - TMCP Quân Đội
  'TPBank': '970423', // TPB - TMCP Tiên Phong
  'VietABank': '970427', // VAB - TMCP Việt Á
  'SHB': '970443', // SHB - TMCP Sài Gòn – Hà Nội
  'HDBank': '970437', // HDB - TMCP Phát triển TP.HCM
  'MSB': '970426', // MSB - TMCP Hàng Hải
  'Sacombank': '970403', // STP - TMCP Sài Gòn Thương tín
  'Eximbank': '970431', // EIB - TMCP Xuất Nhập khẩu Việt Nam
  'VIB': '970441', // VIB - TMCP Quốc Tế Việt Nam
  'OCB': '970448', // OCB - TMCP Phương Đông
  'SeABank': '970440', // SEAB - TMCP Đông Nam Á
  'PGBank': '970430', // PGB - TMCP Xăng dầu Petrolimex
  'NamABank': '970428', // NAB - TMCP Nam Á
  'BacABank': '970409', // BAB - TMCP Bắc Á
  'ABBank': '970425', // ABB - TMCP An Bình
  'VietBank': '970433', // VIETBANK - TMCP Việt Nam Thương Tín
  'PVcomBank': '970412', // PVCB - TMCP Đại chúng Việt Nam
  'GPBank': '970408', // GPB - Thương mại TNHH MTV Dầu Khí Toàn Cầu
  'Agribank': '970405', // VBA - Nông nghiệp và Phát triển Nông thôn Việt Nam
  'LienVietPostBank': '970449', // LPB - TMCP Bưu điện Liên Việt
  'DongABank': '970406', // DOB - TMCP Đông Á
  'KienLongBank': '970452', // KLB - TMCP Kiên Long
  'NCB': '970419', // NCB - TMCP Quốc dân
  'OceanBank': '970410', // Oceanbank - TNHH MTV Đại Dương
  'PublicBank': '970439', // PBVN - liên doanh VID PUBLIC BANK
  'SCB': '970429', // SCB - TMCP Sài Gòn
  'VietCapitalBank': '970454', // VCCB - TMCP Bản Việt
  'VietnamBank': '970433', // VIETBANK - TMCP Việt Nam Thương Tín
  
  // Additional banks
  'SaigonBank': '970400', // SGICB - TMCP Sài Gòn Công thương
  'StandardChartered': '970410', // SCVN - TNHH MTV Standard Chartered
  'VRBank': '970421', // VRB - liên doanh Việt Nga
  'ShinhanBank': '970424', // SHBVN - TNHH MTV Shinhan Việt Nam
  'IndovinaBank': '970434', // IVB - TNHH Indovina
  'BaoVietBank': '970438', // BVB - TMCP Bảo Việt
  'CBBank': '970444', // CBB - Thương mại TNHH MTV Xây dựng Việt Nam
  'COOPBANK': '970446', // COOPBANK - Hợp tác xã Việt Nam
  'HongLeong': '970442', // HLBVN - TNHH MTV Hong Leong Việt Nam
  'Woori': '970457', // WVN - Ngân hàng TNHH Một Thành Viên Woori Bank Việt Nam
  'UnitedOverseas': '970458', // UOB - Ngân hàng TNHH Một Thành Viên UOB Việt Nam
  'CIMBBank': '970459', // CIMB - Ngân hàng TNHH Một Thành Viên CIMB Việt Nam
  'KookminHN': '970462', // KBHN - Ngân hàng Kookmin - Chi nhánh Hà Nội
  'KookminHCM': '970463', // KBHCM - Ngân hàng Kookmin - Chi nhánh Tp. Hồ Chí Minh
  'SINOPAC': '970465', // SINOPAC - Ngân hàng SINOPAC - Chi nhánh Tp. Hồ Chí Minh
  'KEBHanaHCM': '970466', // KEBHANAHCM - Ngân hàng KEB HANA - Chi nhánh Tp. Hồ Chí Minh
  'KEBHANAHN': '970467', // KEBHANAHN - Ngân hàng KEB HANA - Chi nhánh Hà Nội
  'IBKHN': '970455', // IBKHN - Công nghiệp Hàn Quốc - Chi nhánh Hà Nội
  'IBKHCM': '970456', // IBKHCM - Industrial Bank of Korea - Chi nhánh Hồ Chí Minh
};

/**
 * Bank information interface for selection
 */
export interface BankOption {
  name: string;
  code: string;
  binCode: string;
  displayName: string; // Vietnamese display name
}

/**
 * Get list of all banks as options for selection
 * Returns sorted array of bank options with display names
 * 
 * @returns Array of bank options sorted by display name
 */
export function getBankOptions(): BankOption[] {
  const banks: BankOption[] = [];
  
  // Map bank names to Vietnamese display names
  const displayNames: Record<string, string> = {
    'Vietcombank': 'Vietcombank (VCB)',
    'Vietinbank': 'Vietinbank (ICB)',
    'BIDV': 'BIDV',
    'Techcombank': 'Techcombank (TCB)',
    'ACB': 'ACB',
    'VPBank': 'VPBank',
    'MBBank': 'MB Bank',
    'TPBank': 'TPBank',
    'VietABank': 'VietABank',
    'SHB': 'SHB',
    'HDBank': 'HDBank',
    'MSB': 'MSB',
    'Sacombank': 'Sacombank',
    'Eximbank': 'Eximbank',
    'VIB': 'VIB',
    'OCB': 'OCB',
    'SeABank': 'SeABank',
    'PGBank': 'PGBank',
    'NamABank': 'NamABank',
    'BacABank': 'BacABank',
    'ABBank': 'ABBank',
    'VietBank': 'VietBank',
    'PVcomBank': 'PVcomBank',
    'GPBank': 'GPBank',
    'Agribank': 'Agribank',
    'LienVietPostBank': 'LienVietPostBank',
    'DongABank': 'DongABank',
    'KienLongBank': 'KienLongBank',
    'NCB': 'NCB',
    'OceanBank': 'OceanBank',
    'PublicBank': 'PublicBank',
    'SCB': 'SCB',
    'VietCapitalBank': 'VietCapitalBank',
    'VietnamBank': 'VietnamBank',
    'SaigonBank': 'SaigonBank',
    'StandardChartered': 'Standard Chartered',
    'VRBank': 'VRBank',
    'ShinhanBank': 'Shinhan Bank',
    'IndovinaBank': 'Indovina Bank',
    'BaoVietBank': 'BaoVietBank',
    'CBBank': 'CBBank',
    'COOPBANK': 'COOPBANK',
    'HongLeong': 'Hong Leong Bank',
    'Woori': 'Woori Bank',
    'UnitedOverseas': 'United Overseas Bank (UOB)',
    'CIMBBank': 'CIMB Bank',
    'KookminHN': 'Kookmin Bank - Hà Nội',
    'KookminHCM': 'Kookmin Bank - TP.HCM',
    'SINOPAC': 'SINOPAC',
    'KEBHanaHCM': 'KEB HANA - TP.HCM',
    'KEBHANAHN': 'KEB HANA - Hà Nội',
    'IBKHN': 'Industrial Bank of Korea - Hà Nội',
    'IBKHCM': 'Industrial Bank of Korea - TP.HCM',
  };
  
  // Convert bank codes to options array
  for (const [name, binCode] of Object.entries(VIETNAM_BANK_CODES)) {
    // Get bank code from BIN codes mapping if available
    const bankCode = Object.entries(VIETNAM_BANK_BIN_CODES).find(
      ([_, code]) => code === binCode
    )?.[0] || name;
    
    banks.push({
      name,
      code: bankCode,
      binCode,
      displayName: displayNames[name] || name,
    });
  }
  
  // Remove duplicates (some banks have same BIN code)
  const uniqueBanks = banks.filter((bank, index, self) =>
    index === self.findIndex((b) => b.binCode === bank.binCode)
  );
  
  // Sort by display name
  return uniqueBanks.sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
}

/**
 * Get bank names as simple array for select/dropdown
 * Returns sorted array of bank names
 * 
 * @returns Array of bank names sorted alphabetically
 */
export function getBankNames(): string[] {
  return getBankOptions().map(bank => bank.name).sort();
}

/**
 * Get bank display names as array for select/dropdown
 * Returns sorted array of display names
 * 
 * @returns Array of bank display names sorted alphabetically
 */
export function getBankDisplayNames(): string[] {
  return getBankOptions().map(bank => bank.displayName).sort();
}

/**
 * Find bank by name or code
 * 
 * @param searchTerm - Bank name or code to search for
 * @returns Bank option if found, null otherwise
 */
export function findBank(searchTerm: string): BankOption | null {
  const options = getBankOptions();
  
  // Search by name (case insensitive)
  let found = options.find(
    bank => bank.name.toLowerCase() === searchTerm.toLowerCase()
  );
  
  if (found) return found;
  
  // Search by code (case insensitive)
  found = options.find(
    bank => bank.code.toLowerCase() === searchTerm.toLowerCase()
  );
  
  if (found) return found;
  
  // Search by display name (case insensitive, partial match)
  found = options.find(
    bank => bank.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return found || null;
}

/**
 * Get bank BIN code by name or code
 * 
 * @param searchTerm - Bank name, code, or display name
 * @returns BIN code (6 digits) or empty string if not found
 */
export function getBankBINCodeByNameOrCode(searchTerm: string): string {
  const bank = findBank(searchTerm);
  return bank?.binCode || '';
}

/**
 * Vietnam bank BIN codes mapping (Bank Code -> BIN Code)
 * For backward compatibility and direct bank code lookup
 */
export const VIETNAM_BANK_BIN_CODES: Record<string, string> = {
  'VCB': '970436',
  'CTG': '970415',
  'ICB': '970415',
  'BID': '970418',
  'BIDV': '970418',
  'TCB': '970407',
  'ACB': '970416',
  'VPB': '970432',
  'VPBank': '970432',
  'MBB': '970422',
  'MB': '970422',
  'TPB': '970423',
  'TPBank': '970423',
  'VAB': '970427',
  'SHB': '970443',
  'HDB': '970437',
  'HDBank': '970437',
  'MSB': '970426',
  'STB': '970403',
  'STP': '970403',
  'EIB': '970431',
  'VIB': '970441',
  'OCB': '970448',
  'SSB': '970440',
  'SEAB': '970440',
  'PGB': '970430',
  'NAB': '970428',
  'BAB': '970409',
  'ABB': '970425',
  'VCC': '970433',
  'VIETBANK': '970433',
  'PVC': '970412',
  'PVCB': '970412',
  'GPB': '970408',
  'VBA': '970405',
  'LPB': '970449',
  'DAB': '970406',
  'DOB': '970406',
  'KLB': '970452',
  'NCB': '970419',
  'OCE': '970410',
  'PBV': '970439',
  'PBVN': '970439',
  'SCB': '970429',
  'VCCB': '970454',
  'VNB': '970433',
  'SGICB': '970400',
  'SCVN': '970410',
  'VRB': '970421',
  'SHBVN': '970424',
  'IVB': '970434',
  'BVB': '970438',
  'CBB': '970444',
  'COOPBANK': '970446',
  'HLBVN': '970442',
  'WVN': '970457',
  'UOB': '970458',
  'CIMB': '970459',
  'KBHN': '970462',
  'KBHCM': '970463',
  'SINOPAC': '970465',
  'KEBHANAHCM': '970466',
  'KEBHANAHN': '970467',
  'IBKHN': '970455',
  'IBKHCM': '970456',
};

/**
 * Bank account information for QR code generation
 */
export interface BankAccountInfo {
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  bankCode?: string;
  branch?: string;
  amount?: number; // Optional: amount to transfer
  content?: string; // Optional: transfer content/note
}

/**
 * Generate VietQR format string for bank transfer
 * 
 * Format: accountNumber|accountHolderName|bankCode
 * 
 * This is a simplified format. For full VietQR specification,
 * you may need to use VietQR API or library.
 * 
 * @param info - Bank account information
 * @returns QR code data string
 */
export function generateVietQRCode(info: BankAccountInfo): string {
  const { accountNumber, accountHolderName, bankCode, bankName } = info;
  
  // Get bank code from mapping if not provided
  const code = bankCode || VIETNAM_BANK_CODES[bankName] || '';
  
  // Simple format: accountNumber|accountHolderName|bankCode
  // This format is commonly used for Vietnam bank transfers
  const qrData = `${accountNumber}|${accountHolderName}|${code}`;
  
  return qrData;
}

/**
 * Generate full VietQR format with amount and content
 * 
 * Format: accountNumber|accountHolderName|bankCode|amount|content
 * 
 * @param info - Bank account information with optional amount and content
 * @returns QR code data string
 */
export function generateVietQRCodeWithAmount(info: BankAccountInfo): string {
  const { accountNumber, accountHolderName, bankCode, bankName, amount, content } = info;
  
  // Get bank code from mapping if not provided
  const code = bankCode || VIETNAM_BANK_CODES[bankName] || '';
  
  // Build QR data parts
  const parts = [
    accountNumber,
    accountHolderName,
    code
  ];
  
  // Add amount if provided
  if (amount !== undefined && amount > 0) {
    parts.push(amount.toString());
  }
  
  // Add content if provided
  if (content) {
    parts.push(content);
  }
  
  return parts.join('|');
}

/**
 * Generate QR code data URL for display
 * 
 * This function generates a data string that can be used with QR code libraries
 * like 'qrcode' or 'qrcode.react' to generate QR code images.
 * 
 * @param info - Bank account information
 * @param includeAmount - Whether to include amount in QR code
 * @returns QR code data string
 */
export function generateBankQRCodeData(
  info: BankAccountInfo,
  includeAmount: boolean = false
): string {
  if (includeAmount && (info.amount !== undefined || info.content)) {
    return generateVietQRCodeWithAmount(info);
  }
  
  return generateVietQRCode(info);
}

/**
 * Parse QR code data string back to bank account info
 * 
 * @param qrData - QR code data string
 * @returns Parsed bank account information
 */
export function parseVietQRCode(qrData: string): Partial<BankAccountInfo> {
  const parts = qrData.split('|');
  
  if (parts.length < 3) {
    throw new Error('Invalid QR code format');
  }
  
  const [accountNumber, accountHolderName, bankCode, amount, content] = parts;
  
  return {
    accountNumber,
    accountHolderName,
    bankCode,
    amount: amount ? parseFloat(amount) : undefined,
    content
  };
}

/**
 * Get bank code from bank name (returns BIN code)
 * 
 * @param bankName - Bank name
 * @returns BIN code (6 digits) or empty string if not found
 */
export function getBankCode(bankName: string): string {
  return VIETNAM_BANK_CODES[bankName] || '';
}

/**
 * Get bank BIN code from bank name or code
 * Alias for getBankBINCode for convenience
 * 
 * @param bankName - Bank name
 * @param bankCode - Bank code (optional)
 * @returns BIN code (6 digits) or empty string if not found
 */
export function getBankCodeFromNameOrCode(bankName?: string, bankCode?: string): string {
  return getBankBINCode(bankName, bankCode);
}

/**
 * Validate bank account information
 * 
 * @param info - Bank account information
 * @returns Validation result
 */
export function validateBankAccountInfo(info: BankAccountInfo): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!info.accountNumber || info.accountNumber.trim().length === 0) {
    errors.push('Account number is required');
  }
  
  if (!info.accountHolderName || info.accountHolderName.trim().length === 0) {
    errors.push('Account holder name is required');
  }
  
  if (!info.bankName || info.bankName.trim().length === 0) {
    errors.push('Bank name is required');
  }
  
  // Validate account number format (should be numeric, 8-16 digits)
  if (info.accountNumber && !/^\d{8,16}$/.test(info.accountNumber)) {
    errors.push('Account number should be 8-16 digits');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get bank BIN code from bank name or code
 * 
 * @param bankName - Bank name
 * @param bankCode - Bank code (optional, for direct lookup)
 * @returns BIN code (6 digits) or empty string if not found
 */
export function getBankBINCode(bankName?: string, bankCode?: string): string {
  // First try bank code lookup (for backward compatibility)
  if (bankCode && VIETNAM_BANK_BIN_CODES[bankCode]) {
    return VIETNAM_BANK_BIN_CODES[bankCode];
  }
  
  // Then try bank name lookup
  if (bankName && VIETNAM_BANK_CODES[bankName]) {
    return VIETNAM_BANK_CODES[bankName];
  }
  
  return '';
}

/**
 * Convert Vietnamese text to ASCII (remove accents)
 * Based on subiz/vietqr Go implementation Ascii() function
 * 
 * This function replaces Vietnamese characters with their ASCII equivalents
 * and removes all non-ASCII characters that don't have equivalents
 * 
 * @param text - Text to convert
 * @returns ASCII text without Vietnamese accents
 */
function convertToASCII(text: string): string {
  const VNMAP: Record<string, string> = {
    'ạ': 'a', 'ả': 'a', 'ã': 'a', 'à': 'a', 'á': 'a', 'â': 'a', 'ậ': 'a', 'ầ': 'a', 'ấ': 'a',
    'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'ó': 'o', 'ò': 'o', 'ọ': 'o', 'õ': 'o', 'ỏ': 'o', 'ô': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ồ': 'o', 'ố': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẹ': 'e', 'ẽ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ú': 'u', 'ù': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ự': 'u', 'ữ': 'u', 'ử': 'u', 'ừ': 'u', 'ứ': 'u',
    'í': 'i', 'ì': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỵ': 'y', 'ỹ': 'y',
    'đ': 'd',
    'Ạ': 'A', 'Ả': 'A', 'Ã': 'A', 'À': 'A', 'Á': 'A', 'Â': 'A', 'Ậ': 'A', 'Ầ': 'A', 'Ấ': 'A',
    'Ẩ': 'A', 'Ẫ': 'A', 'Ă': 'A', 'Ắ': 'A', 'Ằ': 'A', 'Ặ': 'A', 'Ẳ': 'A', 'Ẵ': 'A',
    'Ó': 'O', 'Ò': 'O', 'Ọ': 'O', 'Õ': 'O', 'Ỏ': 'O', 'Ô': 'O', 'Ộ': 'O', 'Ổ': 'O', 'Ỗ': 'O',
    'Ồ': 'O', 'Ố': 'O', 'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ợ': 'O', 'Ở': 'O', 'Ỡ': 'O',
    'É': 'E', 'È': 'E', 'Ẻ': 'E', 'Ẹ': 'E', 'Ẽ': 'E', 'Ê': 'E', 'Ế': 'E', 'Ề': 'E', 'Ệ': 'E', 'Ể': 'E', 'Ễ': 'E',
    'Ú': 'U', 'Ù': 'U', 'Ụ': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ư': 'U', 'Ự': 'U', 'Ữ': 'U', 'Ử': 'U', 'Ừ': 'U', 'Ứ': 'U',
    'Í': 'I', 'Ì': 'I', 'Ị': 'I', 'Ỉ': 'I', 'Ĩ': 'I',
    'Ý': 'Y', 'Ỳ': 'Y', 'Ỷ': 'Y', 'Ỵ': 'Y', 'Ỹ': 'Y',
    'Đ': 'D',
  };

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    
    // Keep ASCII characters as-is
    if (code <= 127) {
      result += char;
    } else if (VNMAP[char]) {
      // Replace Vietnamese character with ASCII equivalent
      result += VNMAP[char];
    }
    // Remove all other non-ASCII characters (no equivalent)
  }
  
  return result;
}

/**
 * Generate VietQR string according to EMV QR Code specification (internal helper)
 * Based on official VietQR spec from https://github.com/subiz/vietqr
 * 
 * Format: EMV QR Code TLV (Tag-Length-Value) format
 * Example: vietqr.Generate(120000, "970415", "0011001932418", "ủng hộ lũ lụt")
 * 
 * @param amount - Amount to transfer in VND (optional, only if > 0)
 * @param bankBIN - Bank BIN code (6 digits)
 * @param accountNumber - Account number
 * @param accountHolderName - Account holder name (not used in QR code, for display only)
 * @param content - Transfer content/note (optional, will be converted to ASCII)
 * @returns VietQR EMV QR Code string
 */
function generateVietQRStringInternal(
  amount: number | undefined,
  bankBIN: string,
  accountNumber: string,
  accountHolderName: string,
  content?: string
): string {
  // Helper function to create TLV (Tag-Length-Value) field
  const createTLV = (tag: string, value: string): string => {
    const length = value.length.toString().padStart(2, '0');
    return `${tag}${length}${value}`;
  };

  // Helper function to create nested TLV
  const createNestedTLV = (tag: string, nestedValue: string): string => {
    const length = nestedValue.length.toString().padStart(2, '0');
    return `${tag}${length}${nestedValue}`;
  };

  let payload = '';

  // Payload Format Indicator (00) - fixed value "01"
  payload += createTLV('00', '01');

  // Point of Initiation Method (01) - "11" for static, "12" for dynamic
  // Use "12" (dynamic) if amount or content is present (different each time)
  // Use "11" (static) if no amount/content (same QR code every time)
  const isDynamic = (amount !== undefined && amount > 0) || !!content;
  payload += createTLV('01', isDynamic ? '12' : '11');

  // Merchant Account Information (38) - nested TLV
  // According to VietQR spec from subiz/vietqr, this contains:
  // - 00: GUID (A000000727 for VietQR)
  // - 01: Nested structure containing Bank BIN and Account Number:
  //   - 00: Bank BIN (6 digits)  
  //   - 01: Account Number
  // - 02: Additional field (QRIBFTTA - seems to be a constant in their example)
  let merchantInfo = '';
  
  // GUID (00) - "A000000727" for VietQR
  merchantInfo += createTLV('00', 'A000000727');
  
  // Bank BIN and Account Number in nested structure (01)
  // Based on subiz/vietqr example: Tag 01 contains nested TLV with Bank BIN (00) and Account Number (01)
  let bankAccountInfo = '';
  bankAccountInfo += createTLV('00', bankBIN);
  bankAccountInfo += createTLV('01', accountNumber);
  merchantInfo += createNestedTLV('01', bankAccountInfo);
  
  // Service Code (02) - Required field
  // "QRIBFTTA": Chuyển tiền nhanh 24/7 bằng QR đến tài khoản (account transfer)
  // "QRIBFTTC": Chuyển tiền nhanh 24/7 bằng QR đến thẻ (card transfer)
  // According to subiz/vietqr implementation, this is mandatory
  merchantInfo += createTLV('02', 'QRIBFTTA');

  // Add merchant account info to payload
  payload += createNestedTLV('38', merchantInfo);

  // Transaction Currency (53) - "704" for VND (ISO 4217)
  payload += createTLV('53', '704');

  // Transaction Amount (54) - Only if amount > 0
  if (amount !== undefined && amount > 0) {
    // Format amount without decimals (VND doesn't have decimals)
    // Amount must be a string representation of the amount
    const amountStr = Math.round(amount).toString();
    payload += createTLV('54', amountStr);
  }

  // Country Code (58) - "VN" for Vietnam (ISO 3166-1 alpha 2)
  payload += createTLV('58', 'VN');

  // Additional Data Field Template (62) - nested TLV for content
  if (content) {
    // Content (08) - Transfer content/note (Purpose of Transaction)
    // IMPORTANT: Content must be converted to ASCII (remove Vietnamese accents)
    // This matches subiz/vietqr Go implementation which uses Ascii() function
    const asciiContent = convertToASCII(content);
    let additionalData = '';
    additionalData += createTLV('08', asciiContent);
    payload += createNestedTLV('62', additionalData);
  }

  // CRC16 Checksum (63)
  // According to subiz/vietqr Go implementation:
  // 1. Add "6304" (tag 63, length 04) to payload
  // 2. Calculate CRC on the payload INCLUDING "6304"
  // 3. Append CRC value to complete the QR code
  payload += '6304'; // Tag 63 with length 04 (CRC will be 4 hex digits)
  const crc = calculateCRC16(payload);
  payload += crc;

  return payload;
}

/**
 * ISO/IEC 13239 CRC lookup table
 * Pre-computed table for CRC16-CCITT calculation (polynomial 0x1021)
 * Based on subiz/vietqr Go implementation
 */
let ISO_IEC_13239_TABLE: number[] | null = null;

/**
 * Initialize CRC lookup table (lazy initialization)
 * Based on subiz/vietqr Go implementation
 */
function initCRCTable(): void {
  if (ISO_IEC_13239_TABLE !== null) return;
  
  const polynomial = 0x1021;
  ISO_IEC_13239_TABLE = new Array(256);
  
  for (let n = 0; n < 256; n++) {
    let crc = n << 8;
    for (let i = 0; i < 8; i++) {
      const bit = (crc & 0x8000) !== 0;
      crc <<= 1;
      if (bit) {
        crc ^= polynomial;
      }
      crc = crc & 0xFFFF; // Keep within 16 bits
    }
    ISO_IEC_13239_TABLE[n] = crc & 0xFFFF;
  }
}

/**
 * Calculate CRC16-CCITT checksum using ISO/IEC 13239 algorithm
 * Used for VietQR EMV QR Code validation
 * 
 * Algorithm: ISO/IEC 13239 CRC (polynomial 0x1021, initial value 0xFFFF)
 * Uses lookup table for efficient calculation
 * Based on subiz/vietqr Go implementation
 * 
 * @param data - Data string to calculate checksum for
 * @returns 4-character hexadecimal CRC16 checksum (uppercase)
 */
function calculateCRC16(data: string): string {
  // Initialize lookup table if not already done
  initCRCTable();
  
  // Use charCodeAt to get bytes directly from string (same as Go's []byte conversion)
  let crc = 0xFFFF; // CRC_INIT
  
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i) & 0xFF;
    // CRC calculation using lookup table: crc = (crc << 8) ^ table[(crc >> 8) ^ byte]
    crc = ((crc << 8) ^ ISO_IEC_13239_TABLE![(crc >> 8) ^ byte]) & 0xFFFF;
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate VietQR EMV QR Code string for payment
 * Based on official spec from https://github.com/subiz/vietqr
 * 
 * This function generates a VietQR string that can be used with QR code libraries
 * to render QR code images (e.g., QRCodeSVG from qrcode.react)
 * 
 * @param info - Bank account information
 * @param amount - Amount to transfer in VND (optional, only included if > 0)
 * @param description - Transfer description/note (optional)
 * @returns VietQR EMV QR Code string
 */
export function generateVietQRString(
  info: BankAccountInfo,
  amount?: number,
  description?: string
): string {
  const { accountNumber, accountHolderName, bankCode, bankName } = info;
  
  // Validate required fields
  if (!accountNumber || !accountHolderName) {
    throw new Error('Account number and account holder name are required for VietQR');
  }
  
  // Get BIN code (6 digits) from mapping
  const bankBIN = getBankBINCode(bankName, bankCode);
  
  if (!bankBIN) {
    throw new Error(`Bank BIN code not found for bank: ${bankName || bankCode || 'unknown'}`);
  }
  
  // Validate account number (should be numeric, 8-16 digits)
  if (!/^\d{8,16}$/.test(accountNumber)) {
    throw new Error('Account number must be 8-16 digits');
  }

  // Only include amount if > 0
  const finalAmount = (amount !== undefined && amount > 0) ? amount : undefined;

  // Generate VietQR EMV QR Code string
  return generateVietQRStringInternal(
    finalAmount, 
    bankBIN, 
    accountNumber, 
    accountHolderName,
    description
  );
}

