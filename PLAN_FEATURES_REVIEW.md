# 📋 DANH SÁCH FEATURES THEO TỪNG PLAN

## 🆓 TRIAL PLAN (Free Trial)
**Giá:** 0 VND  
**Platform:** Mobile only  
**Limits:**
- Outlets: 1
- Users: 3
- Products: 500
- Customers: 2,000
- Orders: 2,000/tháng

### Features:
1. ✅ **Mobile app access** - Access your business on mobile devices
2. ✅ **Basic inventory management** - Track products and stock levels
3. ✅ **Customer management** - Store customer information and history
4. ✅ **Order processing** - Create and manage rental orders
5. ✅ **Basic reporting** - View sales and rental reports
6. ✅ **Public product catalog** - Share product list publicly with customers
7. ✅ **Product public check** - Send public links to customers to view products and pricing

---

## 🔵 BASIC PLAN
**Giá:** 79,000 VND/tháng  
**Platform:** Mobile only  
**Limits:**
- Outlets: 1
- Users: 3
- Products: 500
- Customers: 2,000
- Orders: 2,000/tháng

### Features:
1. ✅ **Mobile app access** - Access your business on mobile devices
2. ✅ **Basic inventory management** - Track products and stock levels
3. ✅ **Customer management** - Store customer information and history
4. ✅ **Order processing** - Create and manage rental orders
5. ✅ **Basic reporting** - View sales and rental reports
6. ❌ **Public product catalog** - Share product list publicly with customers *(Ẩn trên landing page)*
7. ❌ **Product public check** - Send public links to customers to view products and pricing *(Ẩn trên landing page)*

**Lưu ý:** 2 features cuối (Public product catalog & Product public check) sẽ bị ẩn trên landing page nhưng vẫn có trong config.

---

## 🟣 PROFESSIONAL PLAN (Most Popular)
**Giá:** 199,000 VND/tháng  
**Platform:** Mobile + Web  
**Limits:**
- Outlets: 1
- Users: 8
- Products: 5,000
- Customers: 10,000
- Orders: 10,000/tháng

### Features:
1. ✅ **All Basic features** - Includes all Basic plan features
   - Mobile app access
   - Basic inventory management
   - Customer management
   - Order processing
   - Basic reporting
   - Public product catalog *(Hiển thị)*
   - Product public check *(Hiển thị)*
2. ✅ **Web dashboard access** - Full web-based management interface
3. ✅ **Advanced reporting & analytics** - Detailed business insights and trends
4. ✅ **Inventory forecasting** - Predict demand and optimize stock levels *(Ẩn trên landing page)*
5. ✅ **Online payments** - Accept online payments and deposits *(Ẩn trên landing page)*
6. ✅ **API integration** - Connect with third-party tools *(Ẩn trên landing page)*
7. ✅ **Team collaboration tools** - Manage team permissions and workflows *(Ẩn trên landing page)*
8. ✅ **Priority support** - Fast response times for support

**Lưu ý:** Một số features bị ẩn trên landing page nhưng vẫn có trong config.

---

## 🟡 ENTERPRISE PLAN (Premium)
**Giá:** 399,000 VND/tháng  
**Platform:** Mobile + Web  
**Limits:**
- Outlets: 3
- Users: 15
- Products: 15,000
- Customers: 50,000
- Orders: 50,000/tháng

### Features:
1. ✅ **All Professional features** - Includes all Professional plan features
   - All Basic features
   - Web dashboard access
   - Advanced reporting & analytics
   - Inventory forecasting
   - Online payments
   - API integration
   - Team collaboration tools
   - Priority support
2. ✅ **Multiple outlets** - Manage multiple rental locations
3. ✅ **Advanced team management** - Sophisticated user roles and permissions
4. ✅ **Custom integrations** - Tailored third-party integrations *(Ẩn trên landing page)*
5. ✅ **Dedicated account manager** - Personal support representative
6. ✅ **Custom reporting** - Tailored analytics and reporting
7. ✅ **White-label solution** - Brand the platform with your company identity
8. ✅ **24/7 phone support** - Round-the-clock support via phone

---

## 📊 TỔNG HỢP FEATURES BỊ ẨN TRÊN LANDING PAGE

Các features sau sẽ **KHÔNG hiển thị** trên landing page pricing section:

### Tất cả Plans:
- ❌ `inventoryForecasting` - Inventory forecasting
- ❌ `onlinePayments` - Online payments
- ❌ `customIntegrations` - Custom integrations
- ❌ `teamCollaborationTools` - Team collaboration tools
- ❌ `apiIntegration` - API integration

### Chỉ Basic Plan:
- ❌ `publicProductCatalog` - Public product catalog
- ❌ `productPublicCheck` - Product public check

---

## 🔄 MAPPING FEATURES KEY

### Basic Plan Features (theo plan-features.ts):
- `mobileAppAccess`
- `basicInventoryManagement`
- `customerManagement`
- `orderProcessing`
- `basicReporting`

### Professional Plan Features (theo plan-features.ts):
- `allBasicFeatures` (includes all Basic features)
- `webDashboardAccess`
- `advancedReportingAnalytics`
- `apiIntegration`
- `prioritySupport`

### Enterprise Plan Features (theo plan-features.ts):
- `allProfessionalFeatures` (includes all Professional features)
- `multipleOutlets`
- `advancedTeamManagement`
- `dedicatedAccountManager`
- `customReporting`
- `247PhoneSupport`

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Basic Plan:** 2 features (Public product catalog & Product public check) có trong config nhưng bị ẩn trên landing page
2. **Professional Plan:** Có "All Basic features" nên sẽ bao gồm cả Public product catalog & Product public check
3. **Landing Page Filter:** Logic filter sẽ ẩn một số features không mong muốn trên UI nhưng vẫn giữ trong database/config

