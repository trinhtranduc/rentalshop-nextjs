// ============================================================================
// BANK QR CODE UTILITIES (Vietnam Bank Transfer)
// ============================================================================

/**
 * Vietnam bank codes mapping
 * Common bank codes for major Vietnamese banks
 */
export const VIETNAM_BANK_CODES: Record<string, string> = {
  'Vietcombank': 'VCB',
  'Vietinbank': 'CTG',
  'BIDV': 'BID',
  'Techcombank': 'TCB',
  'ACB': 'ACB',
  'VPBank': 'VPB',
  'MBBank': 'MBB',
  'TPBank': 'TPB',
  'VietABank': 'VAB',
  'SHB': 'SHB',
  'HDBank': 'HDB',
  'MSB': 'MSB',
  'Sacombank': 'STB',
  'Eximbank': 'EIB',
  'VIB': 'VIB',
  'OCB': 'OCB',
  'SeABank': 'SSB',
  'PGBank': 'PGB',
  'NamABank': 'NAB',
  'BacABank': 'BAB',
  'ABBank': 'ABB',
  'VietBank': 'VCC',
  'PVcomBank': 'PVC',
  'GPBank': 'GPB',
  'Agribank': 'VBA',
  'LienVietPostBank': 'LPB',
  'DongABank': 'DAB',
  'KienLongBank': 'KLB',
  'NCB': 'NCB',
  'OceanBank': 'OCE',
  'PublicBank': 'PBV',
  'SCB': 'SCB',
  'VietCapitalBank': 'VCB',
  'VietnamBank': 'VNB',
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
 * Get bank code from bank name
 * 
 * @param bankName - Bank name
 * @returns Bank code or empty string if not found
 */
export function getBankCode(bankName: string): string {
  return VIETNAM_BANK_CODES[bankName] || '';
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

