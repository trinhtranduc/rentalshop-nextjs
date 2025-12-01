/**
 * Simple Node.js test runner for VietQR tests
 * 
 * Run with: node packages/utils/src/core/__tests__/run-bank-qr-tests.js
 * 
 * This script can be run without any test framework dependencies
 */

// Import from built dist folder
// Note: Run 'yarn build --filter=@rentalshop/utils' first
const path = require('path');
const fs = require('fs');

// Try to find the built file (bank-qr is exported from @rentalshop/utils)
const distPath = path.join(__dirname, '../../../dist/index.js');
const distPathMjs = path.join(__dirname, '../../../dist/index.mjs');

let generateVietQRString;

if (fs.existsSync(distPath)) {
  const utils = require(distPath);
  generateVietQRString = utils.generateVietQRString;
  
  if (!generateVietQRString) {
    console.error('generateVietQRString not found in exports. Available exports:', Object.keys(utils));
    process.exit(1);
  }
} else if (fs.existsSync(distPathMjs)) {
  // For ESM, we'd need dynamic import, but for simplicity, use CJS
  console.error('Please build the package first: yarn build --filter=@rentalshop/utils');
  process.exit(1);
} else {
  console.error('Built files not found. Please run: yarn build --filter=@rentalshop/utils');
  process.exit(1);
}

// Test helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

// Test cases from Go implementation
const testCases = [
  {
    name: 'Example from Go test: ủng hộ lũ lụt',
    info: {
      accountNumber: '0011001932418',
      accountHolderName: 'Test Account',
      bankName: 'Vietinbank',
      bankCode: 'ICB',
    },
    amount: 120000,
    content: 'ủng hộ lũ lụt',
    expected: '00020101021238570010A00000072701270006970415011300110019324180208QRIBFTTA530370454061200005802VN62170813ung ho lu lut6304C15C',
  },
  {
    name: 'Static QR without amount',
    info: {
      accountNumber: '0099999999',
      accountHolderName: 'Test Account',
      bankName: 'TPBank',
      bankCode: 'TPB',
    },
    amount: undefined,
    content: '',
    expected: '00020101021138540010A00000072701240006970423011000999999990208QRIBFTTA53037045802VN6304CBB4',
  },
  {
    name: 'With amount and Vietnamese content',
    info: {
      accountNumber: '0023457923442',
      accountHolderName: 'Test Account',
      bankName: 'MBBank',
      bankCode: 'MB',
    },
    amount: 40123,
    content: 'chuyển khoản',
    expected: '00020101021238570010A00000072701270006970422011300234579234420208QRIBFTTA53037045405401235802VN62160812chuyen khoan6304722F',
  },
];

console.log('🧪 Running VietQR Generation Tests\n');

let passed = 0;
let failed = 0;

// Run test cases
testCases.forEach((testCase) => {
  const result = test(testCase.name, () => {
    const qrCode = generateVietQRString(
      testCase.info,
      testCase.amount,
      testCase.content
    );
    
    assert(
      qrCode === testCase.expected,
      `Expected:\n${testCase.expected}\nGot:\n${qrCode}`
    );
  });
  
  if (result) {
    passed++;
  } else {
    failed++;
  }
});

// Test ASCII conversion
test('ASCII conversion: Vietnamese to ASCII', () => {
  const info = {
    accountNumber: '0011001932418',
    accountHolderName: 'Test Account',
    bankName: 'Vietinbank',
    bankCode: 'ICB',
  };
  
  const qrCode = generateVietQRString(info, 120000, 'ủng hộ lũ lụt');
  
  // Content should be converted to ASCII
  assert(
    qrCode.includes('ung ho lu lut'),
    'Content should be converted to ASCII'
  );
  assert(
    !qrCode.includes('ủng'),
    'Should not contain Vietnamese characters'
  );
  
  if (qrCode.includes('ung ho lu lut') && !qrCode.includes('ủng')) {
    passed++;
  } else {
    failed++;
  }
});

// Test validation
test('Validation: Missing account number', () => {
  try {
    generateVietQRString({
      accountNumber: '',
      accountHolderName: 'Test',
      bankName: 'Vietinbank',
    }, 100000, 'test');
    assert(false, 'Should throw error for missing account number');
  } catch (error) {
    assert(
      error.message.includes('required'),
      `Expected error about required fields, got: ${error.message}`
    );
    passed++;
  }
});

test('Validation: Invalid account number format', () => {
  try {
    generateVietQRString({
      accountNumber: '123', // Too short
      accountHolderName: 'Test',
      bankName: 'Vietinbank',
    }, 100000, 'test');
    assert(false, 'Should throw error for invalid account number');
  } catch (error) {
    assert(
      error.message.includes('8-16 digits'),
      `Expected error about account number format, got: ${error.message}`
    );
    passed++;
  }
});

test('Validation: Unknown bank', () => {
  try {
    generateVietQRString({
      accountNumber: '0011001932418',
      accountHolderName: 'Test',
      bankName: 'UnknownBank',
    }, 100000, 'test');
    assert(false, 'Should throw error for unknown bank');
  } catch (error) {
    assert(
      error.message.includes('BIN code not found'),
      `Expected error about BIN code, got: ${error.message}`
    );
    passed++;
  }
});

// Test amount handling
test('Amount handling: Zero amount should not be included', () => {
  const info = {
    accountNumber: '0011001932418',
    accountHolderName: 'Test Account',
    bankName: 'Vietinbank',
    bankCode: 'ICB',
  };
  
  const qrCode = generateVietQRString(info, 0, 'test');
  
  // Should not contain amount tag (54)
  assert(
    !qrCode.includes('540'),
    'Zero amount should not be included in QR code'
  );
  
  passed++;
});

test('Amount handling: Negative amount should not be included', () => {
  const info = {
    accountNumber: '0011001932418',
    accountHolderName: 'Test Account',
    bankName: 'Vietinbank',
    bankCode: 'ICB',
  };
  
  const qrCode = generateVietQRString(info, -100, 'test');
  
  // Should not contain amount tag (54)
  assert(
    !qrCode.includes('540'),
    'Negative amount should not be included in QR code'
  );
  
  passed++;
});

// Summary
console.log('\n📊 Test Summary:');
console.log(`   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed');
  process.exit(1);
}

