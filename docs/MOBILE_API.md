# Mobile API Documentation

## Base URL
```
https://your-api-domain.com/api
```

## Authentication
All API requests require authentication via Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

---

## 📱 QR Code Payment API

### Get QR Code for Order Payment

**Endpoint:** `GET /api/orders/[orderId]/qr-code`

**Description:** Get QR code string and bank account information for order payment. The QR code is a VietQR EMV QR Code string that can be used with any QR code library to generate the QR code image.

**Authorization:** Requires `orders.view` permission

**Request:**
```http
GET /api/orders/123/qr-code
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "qrCodeString": "00020101021238570010A00000072701270006...",
    "bankAccount": {
      "id": 1,
      "accountHolderName": "TRAN DUC TRINH",
      "accountNumber": "0764774647",
      "bankName": "BIDV",
      "bankCode": "970415",
      "branch": "Chi nhánh Hà Nội"
    },
    "amount": 110000,
    "orderNumber": "ORD-001-0001",
    "transferDescription": "Thu coc cho don ORD-001-0001"
  },
  "code": "QR_CODE_GENERATED",
  "message": "QR code generated successfully"
}
```

**Response Fields:**
- `qrCodeString`: VietQR EMV QR Code string (use with QR code libraries like `qrcode` in React Native, `ZXing` in Android, `CoreImage` in iOS)
- `bankAccount`: Bank account information
  - `id`: Bank account ID
  - `accountHolderName`: Account holder name
  - `accountNumber`: Account number
  - `bankName`: Bank name
  - `bankCode`: Bank BIN code (6 digits)
  - `branch`: Branch name (optional)
- `amount`: Amount to collect (0 if no amount, QR code will be static)
- `orderNumber`: Order number for reference
- `transferDescription`: Transfer description (Vietnamese, ASCII format)

**Response (Error - 404):**
```json
{
  "success": false,
  "code": "NO_DEFAULT_BANK_ACCOUNT",
  "message": "No default bank account found for this outlet"
}
```

**Amount Calculation Logic:**
- **SALE orders**: Always collect `totalAmount`
- **RENT RESERVED orders**: Collect `remainingAmount + securityDeposit`
- **RENT PICKUPED orders**: Collect `damageFee + lateFee`
- **Other RENT statuses**: Amount = 0 (static QR code)

**Transfer Description Logic:**
- **RENT RESERVED (deposit only)**: "Thu coc cho don {orderNumber}"
- **RENT RESERVED (remaining + collateral)**: "Thu tien con lai va the chan cho don {orderNumber}"
- **RENT RESERVED (remaining only)**: "Thu tien con lai cho don {orderNumber}"
- **RENT PICKUPED**: "Thanh toan don hang {orderNumber}"
- **SALE or other**: "Thanh toan don hang {orderNumber}"

**QR Code Generation:**
- If `amount > 0`: Dynamic QR code with amount
- If `amount <= 0`: Static QR code without amount
- QR code string is in EMV QR Code TLV format (VietQR standard)
- Use any QR code library to render the string as an image

**Example Usage (React Native):**
```javascript
import QRCode from 'react-native-qrcode-svg';

const response = await fetch(`/api/orders/${orderId}/qr-code`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// Render QR code
<QRCode value={data.data.qrCodeString} size={200} />
```

**Example Usage (Android - ZXing):**
```kotlin
val writer = QRCodeWriter()
val bitMatrix = writer.encode(qrCodeString, BarcodeFormat.QR_CODE, 200, 200)
val bitmap = Bitmap.createBitmap(200, 200, Bitmap.Config.RGB_565)
// Convert bitMatrix to bitmap
```

**Example Usage (iOS - CoreImage):**
```swift
let data = qrCodeString.data(using: .utf8)!
let filter = CIFilter(name: "CIQRCodeGenerator")
filter?.setValue(data, forKey: "inputMessage")
let qrImage = filter?.outputImage
```

---

## 🏦 Bank Account APIs

### Get All Bank Accounts for Outlet

**Endpoint:** `GET /api/merchants/[merchantId]/outlets/[outletId]/bank-accounts`

**Description:** Get all active bank accounts for a specific outlet, ordered by default status and creation date.

**Authorization:** ADMIN, MERCHANT (own merchant), OUTLET_ADMIN (own outlet), OUTLET_STAFF (own outlet)

**Request:**
```http
GET /api/merchants/1/outlets/2/bank-accounts
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "accountHolderName": "TRAN DUC TRINH",
      "accountNumber": "0764774647",
      "bankName": "BIDV",
      "bankCode": "970415",
      "branch": "Chi nhánh Hà Nội",
      "isDefault": true,
      "isActive": true,
      "notes": "Main account",
      "outletId": "outlet-cuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "code": "BANK_ACCOUNTS_FOUND",
  "message": "Bank accounts found successfully"
}
```

**Response Fields:**
- `id`: Bank account ID
- `accountHolderName`: Account holder name
- `accountNumber`: Account number (8-16 digits)
- `bankName`: Bank name
- `bankCode`: Bank BIN code (6 digits)
- `branch`: Branch name (optional)
- `isDefault`: Whether this is the default bank account
- `isActive`: Whether the account is active
- `notes`: Additional notes (optional)
- `outletId`: Outlet ID (CUID)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

---

### Get Specific Bank Account

**Endpoint:** `GET /api/merchants/[merchantId]/outlets/[outletId]/bank-accounts/[accountId]`

**Description:** Get a specific bank account by ID.

**Authorization:** ADMIN, MERCHANT (own merchant), OUTLET_ADMIN (own outlet), OUTLET_STAFF (own outlet)

**Request:**
```http
GET /api/merchants/1/outlets/2/bank-accounts/1
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "accountHolderName": "TRAN DUC TRINH",
    "accountNumber": "0764774647",
    "bankName": "BIDV",
    "bankCode": "970415",
    "branch": "Chi nhánh Hà Nội",
    "isDefault": true,
    "isActive": true,
    "notes": "Main account",
    "outletId": "outlet-cuid",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "code": "BANK_ACCOUNT_FOUND",
  "message": "Bank account found successfully"
}
```

---

## 👤 User Profile API

### Get Current User Profile

**Endpoint:** `GET /api/users/profile`

**Description:** Get current authenticated user's profile, including merchant, outlet, and default bank account information.

**Authorization:** Any authenticated user

**Request:**
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+84123456789",
    "role": "OUTLET_ADMIN",
    "merchantId": 1,
    "outletId": 2,
    "merchant": {
      "id": 1,
      "name": "My Merchant",
      "email": "merchant@example.com",
      "phone": "+84123456789",
      "address": "123 Main St",
      "city": "Hanoi",
      "state": "Hanoi",
      "zipCode": "100000",
      "country": "VN",
      "businessType": "RENTAL",
      "pricingType": "FIXED",
      "taxId": "123456789",
      "website": "https://example.com",
      "description": "My business",
      "isActive": true,
      "planId": 1,
      "totalRevenue": 1000000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastActiveAt": "2024-01-01T00:00:00.000Z"
    },
    "outlet": {
      "id": 2,
      "name": "Main Outlet",
      "address": "456 Outlet St",
      "phone": "+84123456789",
      "description": "Main store",
      "isActive": true,
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "merchant": {
        "id": 1,
        "name": "My Merchant"
      },
      "defaultBankAccount": {
        "id": 1,
        "accountHolderName": "TRAN DUC TRINH",
        "accountNumber": "0764774647",
        "bankName": "BIDV",
        "bankCode": "970415",
        "branch": "Chi nhánh Hà Nội",
        "isDefault": true,
        "isActive": true,
        "notes": "Main account",
        "outletId": "outlet-cuid"
      }
    }
  }
}
```

**Response Fields:**
- `id`: User ID
- `email`: User email
- `firstName`: First name
- `lastName`: Last name
- `phone`: Phone number
- `role`: User role (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
- `merchantId`: Merchant ID (if assigned)
- `outletId`: Outlet ID (if assigned)
- `merchant`: Complete merchant information (if assigned)
- `outlet`: Complete outlet information (if assigned)
  - `defaultBankAccount`: Default bank account for the outlet (if exists)

**Note:** The `defaultBankAccount` is automatically included in the outlet object if the user has an assigned outlet.

---

## 📸 Image Upload API

### Upload Image

**Endpoint:** `POST /api/upload/image`

**Description:** Upload an image file to AWS S3. Images are automatically compressed and optimized.

**Authorization:** Any authenticated user

**Request:**
```http
POST /api/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
- image: File (required) - Image file (JPG, PNG, WebP)
- originalName: string (optional) - Original filename
- preserveFilename: boolean (optional) - Whether to preserve original filename
```

**File Requirements:**
- **Allowed types:** JPG, JPEG, PNG, WebP
- **Max size:** 1MB (before compression)
- **Auto-compression:** Images are automatically compressed to max 1920px width, 85% quality JPEG

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/staging/image-123.jpg",
    "publicId": "staging/image-123.jpg",
    "stagingKey": "staging/image-123.jpg",
    "isStaging": true,
    "originalFileName": "my-image.jpg",
    "finalFileName": "image-123.jpg",
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "size": 245760,
    "expiresAt": "2024-01-02T00:00:00.000Z"
  },
  "code": "IMAGE_UPLOADED_SUCCESS",
  "message": "Image uploaded successfully to AWS S3 staging folder"
}
```

**Response Fields:**
- `url`: Public URL to access the image (CloudFront CDN if configured, otherwise presigned S3 URL)
- `publicId`: Public identifier for the image
- `stagingKey`: S3 key for cleanup operations
- `isStaging`: Whether the image is in staging folder
- `originalFileName`: Original filename from user
- `finalFileName`: Final filename on S3
- `width`: Image width (0 if not available)
- `height`: Image height (0 if not available)
- `format`: Image format (always "jpg" after compression)
- `size`: File size in bytes
- `expiresAt`: URL expiration time (24 hours for presigned URLs)

**Response (Error - 400):**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp"
}
```

**Example Usage (React Native):**
```javascript
const formData = new FormData();
formData.append('image', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'photo.jpg',
});
formData.append('originalName', 'photo.jpg');

const response = await fetch('/api/upload/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
  },
  body: formData,
});

const data = await response.json();
const imageUrl = data.data.url;
```

**Example Usage (Android - OkHttp):**
```kotlin
val requestBody = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart("image", "photo.jpg",
        RequestBody.create("image/jpeg".toMediaType(), imageFile))
    .addFormDataPart("originalName", "photo.jpg")
    .build()

val request = Request.Builder()
    .url("$baseUrl/api/upload/image")
    .addHeader("Authorization", "Bearer $token")
    .post(requestBody)
    .build()
```

**Example Usage (iOS - URLSession):**
```swift
let boundary = UUID().uuidString
var request = URLRequest(url: URL(string: "\(baseUrl)/api/upload/image")!)
request.httpMethod = "POST"
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

var body = Data()
body.append("--\(boundary)\r\n".data(using: .utf8)!)
body.append("Content-Disposition: form-data; name=\"image\"; filename=\"photo.jpg\"\r\n".data(using: .utf8)!)
body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
body.append(imageData)
body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

request.httpBody = body
```

---

## 🔐 Authentication

### Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "OUTLET_ADMIN",
      "merchant": { ... },
      "outlet": {
        ...,
        "defaultBankAccount": { ... }
      }
    }
  }
}
```

**Note:** The login response also includes `outlet.defaultBankAccount` if the user has an assigned outlet.

---

## 📋 Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

**Common Error Codes:**
- `INVALID_ID_FORMAT`: Invalid ID format (must be numeric)
- `ORDER_NOT_FOUND`: Order not found
- `OUTLET_NOT_FOUND`: Outlet not found
- `NO_DEFAULT_BANK_ACCOUNT`: No default bank account found
- `QR_CODE_GENERATION_FAILED`: Failed to generate QR code
- `FORBIDDEN`: Access denied
- `VALIDATION_ERROR`: Input validation failed
- `UPLOAD_IMAGE_FAILED`: Image upload failed

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

---

## 🎯 Quick Reference

### QR Code Payment Flow
1. Get order details: `GET /api/orders/[orderId]`
2. Get QR code: `GET /api/orders/[orderId]/qr-code`
3. Render QR code using `qrCodeString` with any QR code library
4. Display bank account info and amount to customer

### Bank Account Flow
1. Get user profile: `GET /api/users/profile` (includes `outlet.defaultBankAccount`)
2. Or get all bank accounts: `GET /api/merchants/[merchantId]/outlets/[outletId]/bank-accounts`
3. Use default bank account for QR code generation

### Image Upload Flow
1. Select image from device
2. Upload: `POST /api/upload/image` with FormData
3. Get `url` from response
4. Use `url` in your app (e.g., display in Image component)

---

## 📚 QR Code Libraries

### React Native
```bash
npm install react-native-qrcode-svg
# or
npm install react-native-qrcode
```

### Android
```gradle
implementation 'com.google.zxing:core:3.5.1'
implementation 'com.journeyapps:zxing-android-embedded:4.3.0'
```

### iOS
```swift
// Use CoreImage framework (built-in)
import CoreImage
```

---

## 🔗 Related Documentation

- [VietQR Specification](https://github.com/subiz/vietqr)
- [EMV QR Code Standard](https://www.emvco.com/emv-technologies/qrcodes/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)

---

## 📞 Support

For API support, contact the development team or check the API documentation at:
```
https://your-api-domain.com/api/docs
```

