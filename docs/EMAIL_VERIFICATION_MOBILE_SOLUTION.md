# 📱 Email Verification - Official Mobile Solution

## 🎯 Problem

Khi user click vào email verification link từ mobile app, có thể gặp:
- Browser cảnh báo "Dangerous site" nếu link trỏ đến API URL
- Không tự động mở mobile app
- User phải copy/paste token thủ công

## ✅ Official Solution

### **Approach: Web-based Verification with Smart Mobile Redirect**

Giải pháp này được sử dụng bởi các hệ thống lớn như:
- **Firebase Auth**: Link trỏ đến web, detect mobile và redirect
- **AWS Cognito**: Universal Links (iOS) / App Links (Android)
- **Auth0**: Web-based verification với deep link redirect

### **Flow Diagram**

```
Email Link (CLIENT_URL/verify-email?token=xxx)
    ↓
Web Page Loads
    ↓
Detect Mobile Device?
    ├─ YES → Check if App Installed?
    │   ├─ YES → Redirect to Deep Link (anyrent://verify-email?token=xxx)
    │   └─ NO → Show Web Verification Page
    └─ NO → Show Web Verification Page
```

## 🔧 Implementation

### **1. Email Link Format**

Link trong email **LUÔN** trỏ đến `CLIENT_URL` (web app), không phải API URL:

```typescript
// ✅ CORRECT: Web URL (trusted by browsers)
const verificationUrl = `${CLIENT_URL}/verify-email?token=${token}`;

// ❌ WRONG: API URL (may trigger browser warnings)
const verificationUrl = `${API_URL}/api/auth/verify-email?token=${token}`;
```

### **2. Web Page with Mobile Detection**

Web page `/verify-email` sẽ:
1. Detect nếu user đang dùng mobile device
2. Nếu mobile → thử redirect về deep link
3. Nếu không có app → fallback về web verification
4. Nếu desktop → hiển thị web verification

### **3. Deep Link Format**

**iOS (Universal Links):**
```
https://anyrent.shop/verify-email?token=xxx
→ Nếu app installed → mở app với deep link
→ Nếu không → mở web page
```

**Android (App Links):**
```
https://anyrent.shop/verify-email?token=xxx
→ Nếu app installed → mở app với deep link
→ Nếu không → mở web page
```

**Custom URL Scheme (Fallback):**
```
anyrent://verify-email?token=xxx
```

## 📋 Implementation Steps

### **Step 1: Update Email Service**

Link trong email đã được update để dùng `CLIENT_URL`:

```typescript
// packages/utils/src/services/email.ts
const clientUrl = env.CLIENT_URL || 'http://localhost:3000';
const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;
```

### **Step 2: Create Mobile Detection Utility**

```typescript
// packages/utils/src/core/mobile-detection.ts
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function getMobileDeepLink(token: string): string {
  // Custom URL scheme (works for both iOS and Android)
  return `anyrent://verify-email?token=${encodeURIComponent(token)}`;
}
```

### **Step 3: Update Verify Email Page**

Web page sẽ detect mobile và redirect:

```typescript
// apps/client/app/verify-email/page.tsx
useEffect(() => {
  const token = searchParams.get('token');
  
  if (token && isMobileDevice()) {
    // Try to open mobile app via deep link
    const deepLink = getMobileDeepLink(token);
    window.location.href = deepLink;
    
    // Fallback: If app doesn't open in 2 seconds, show web page
    setTimeout(() => {
      // Continue with web verification
      verifyToken(token);
    }, 2000);
  } else if (token) {
    // Desktop or no mobile detection → web verification
    verifyToken(token);
  }
}, []);
```

### **Step 4: Mobile App Deep Link Handler**

Mobile app cần handle deep link:

**iOS (Swift):**
```swift
// AppDelegate.swift hoặc SceneDelegate.swift
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    
    if url.scheme == "anyrent" && url.host == "verify-email" {
        if let token = url.queryParameters?["token"] {
            // Call API to verify email
            verifyEmail(token: token)
        }
    }
}
```

**Android (Kotlin):**
```kotlin
// MainActivity.kt
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    val data: Uri? = intent.data
    if (data?.scheme == "anyrent" && data.host == "verify-email") {
        val token = data.getQueryParameter("token")
        token?.let { verifyEmail(it) }
    }
}
```

## 🔒 Security Considerations

### **1. Token Validation**
- Token chỉ valid trong 24 giờ
- Token chỉ dùng được 1 lần
- Token được verify bởi API, không phải client

### **2. HTTPS Required**
- Tất cả links phải dùng HTTPS
- Deep links cũng nên validate token qua HTTPS API

### **3. Browser Trust**
- Link trỏ đến `CLIENT_URL` (web app) thay vì `API_URL`
- Web app domain phải có SSL certificate hợp lệ
- Domain không bị Google Safe Browsing đánh dấu

## 📱 Mobile App Integration

### **iOS Universal Links Setup**

1. **Add Associated Domains** trong Xcode:
   - `applinks:anyrent.shop`

2. **Create `apple-app-site-association` file**:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appID": "TEAM_ID.com.anyrent.app",
           "paths": ["/verify-email*"]
         }
       ]
     }
   }
   ```

3. **Host file tại**: `https://anyrent.shop/.well-known/apple-app-site-association`

### **Android App Links Setup**

1. **Add Intent Filter** trong `AndroidManifest.xml`:
   ```xml
   <activity android:name=".VerifyEmailActivity">
     <intent-filter android:autoVerify="true">
       <action android:name="android.intent.action.VIEW" />
       <category android:name="android.intent.category.DEFAULT" />
       <category android:name="android.intent.category.BROWSABLE" />
       <data
         android:scheme="https"
         android:host="anyrent.shop"
         android:pathPrefix="/verify-email" />
     </intent-filter>
   </activity>
   ```

2. **Create `assetlinks.json` file**:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.anyrent.app",
       "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
     }
   }]
   ```

3. **Host file tại**: `https://anyrent.shop/.well-known/assetlinks.json`

## 🧪 Testing

### **Test Cases**

1. **Desktop Browser**:
   - Click link → Opens web page → Verify email → Success

2. **Mobile Browser (App Installed)**:
   - Click link → Opens app → Verify email → Success

3. **Mobile Browser (App NOT Installed)**:
   - Click link → Opens web page → Verify email → Success

4. **Mobile App (Direct Deep Link)**:
   - App opens → Handle deep link → Verify email → Success

## 📚 References

- [Firebase Auth Email Verification](https://firebase.google.com/docs/auth/web/email-auth)
- [AWS Cognito Email Verification](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-email-verification.html)
- [iOS Universal Links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Android App Links](https://developer.android.com/training/app-links)

## ✅ Benefits

1. **Security**: Link trỏ đến trusted web domain
2. **User Experience**: Tự động mở app nếu installed
3. **Fallback**: Web page nếu app không installed
4. **Browser Trust**: Không bị cảnh báo "Dangerous site"
5. **Cross-platform**: Hoạt động trên cả iOS và Android

