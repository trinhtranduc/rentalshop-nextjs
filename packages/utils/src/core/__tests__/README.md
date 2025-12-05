# VietQR Generation Tests

Tests for VietQR EMV QR Code generation based on [subiz/vietqr](https://github.com/subiz/vietqr) Go implementation.

## Test Files

- **`bank-qr.test.ts`** - TypeScript test file using Jest/Vitest format
- **`run-bank-qr-tests.js`** - Standalone Node.js test runner (no dependencies required)

## Running Tests

### Option 1: Using Standalone Test Runner (Recommended)

No test framework setup required. Just build the package and run:

```bash
# Build the package first
yarn build --filter=@rentalshop/utils

# Run tests
node packages/utils/src/core/__tests__/run-bank-qr-tests.js
```

### Option 2: Using Vitest (If installed)

```bash
# Install Vitest (if not already installed)
yarn add -D vitest @vitest/ui

# Run tests
yarn vitest packages/utils/src/core/__tests__/bank-qr.test.ts
```

### Option 3: Using Jest (If installed)

```bash
# Install Jest (if not already installed)
yarn add -D jest @types/jest ts-jest

# Run tests
yarn jest packages/utils/src/core/__tests__/bank-qr.test.ts
```

## Test Coverage

The tests cover:

1. **Basic QR Code Generation**
   - Example from Go test case
   - Static QR (no amount)
   - Dynamic QR (with amount and content)

2. **ASCII Conversion**
   - Vietnamese characters to ASCII conversion
   - Mixed Vietnamese and English content

3. **Validation**
   - Missing account number
   - Invalid account number format (too short/long)
   - Unknown bank BIN code

4. **Amount Handling**
   - Zero amount should not be included
   - Negative amount should not be included
   - Positive amount should be included

5. **CRC16 Calculation**
   - Validates CRC checksum matches Go implementation

## Test Cases from Go Implementation

The tests include exact test cases from the Go implementation:

```go
// From vietqr_test.go
vietqr.Generate(120000, "970415", "0011001932418", "ủng hộ lũ lụt")
// Expected: 00020101021238570010A00000072701270006970415011300110019324180208QRIBFTTA530370454061200005802VN62170813ung ho lu lut6304C15C
```

## Expected Output

When running the standalone test runner, you should see:

```
🧪 Running VietQR Generation Tests

✅ Example from Go test: ủng hộ lũ lụt
✅ Static QR without amount
✅ With amount and Vietnamese content
✅ ASCII conversion: Vietnamese to ASCII
✅ Validation: Missing account number
✅ Validation: Invalid account number format
✅ Validation: Unknown bank
✅ Amount handling: Zero amount should not be included
✅ Amount handling: Negative amount should not be included

📊 Test Summary:
   Passed: 9
   Failed: 0
   Total:  9

✅ All tests passed!
```

## Notes

- All QR codes are validated against the Go implementation from `subiz/vietqr`
- CRC16 calculation uses ISO/IEC 13239 algorithm (CRC-16/CCITT-FALSE)
- Vietnamese content is automatically converted to ASCII (removes accents)
- Amount is only included in QR code if > 0

