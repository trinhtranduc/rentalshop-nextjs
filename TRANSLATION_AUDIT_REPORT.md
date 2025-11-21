# Translation Audit Report

Generated: 2025-11-21T06:54:27.906Z

## Summary

- **Total Issues Found**: 1319
- **Critical** (Missing Translation Keys): 0
- **High** (Hardcoded UI Strings): 837
- **Medium** (Hardcoded API Messages): 91
- **Low** (Console/Alert Messages): 391

## 1. Translation Files Comparison

**Total Files**: 16
**Total Keys (EN)**: 2076
**Total Keys (VI)**: 2106

✅ All translation files are complete!

### Orphan Keys in Vietnamese (not in English)

#### orders.json

- `messages.createOrder`: "Tạo đơn hàng"
- `messages.rentalPeriodDaily`: "Thời gian thuê (Theo ngày)"
- `messages.rentalPeriodWeekly`: "Thời gian thuê (Theo tuần)"
- `messages.orderType`: "Loại đơn"
- `messages.outlet`: "Cửa hàng"
- `messages.customer`: "Khách hàng"
- `messages.searchCustomers`: "Tìm kiếm khách hàng theo tên hoặc số điện thoại..."
- `messages.searchProducts`: "Tìm kiếm sản phẩm theo tên, mã vạch hoặc mô tả..."
- `messages.searchProductsAbove`: "Tìm kiếm sản phẩm ở trên để thêm vào đơn hàng. Bạn có thể tìm kiếm theo tên, mã vạch hoặc mô tả."
- `messages.addNewCustomer`: "Thêm khách hàng mới"
- `messages.cannotChangeWhenEditing`: "Không thể thay đổi khi chỉnh sửa"
- `messages.orderNotes`: "Ghi chú đơn hàng"
- `messages.enterOrderNotes`: "Nhập ghi chú đơn hàng..."
- `messages.discount`: "Giảm giá"
- `messages.discountAmount`: "Số tiền giảm giá..."
- `messages.amount`: "Số tiền"
- `messages.percentage`: "Phần trăm"
- `summary.rentalDuration`: "Thời gian thuê"
- `summary.from`: "Từ"
- `summary.to`: "Đến"
- `summary.subtotal`: "Tạm tính"
- `summary.deposit`: "Tiền cọc"
- `summary.grandTotal`: "Tổng cộng"
- `summary.orderRequirements`: "Yêu cầu đơn hàng"
- `summary.discount`: "Giảm giá"
- `requirements.selectAtLeastOneProduct`: "Chọn ít nhất một sản phẩm"
- `requirements.selected`: "đã chọn"
- `requirements.customerInformationRequired`: "Thông tin khách hàng bắt buộc"
- `requirements.rentalPeriodRequired`: "Thời gian thuê bắt buộc (ngày lấy & trả)"
- `requirements.outletSelectionRequired`: "Chọn cửa hàng bắt buộc"

## 2. Hardcoded Strings in Components

**Total Found**: 837

### packages/ui/src/components/ui/product-availability-badge.tsx

- **Line 91** (ui): `"Date conflict: ${conflictingQuantity} items rented during this period"`
  ```
  return `Date conflict: ${conflictingQuantity} items rented during this period`;
  ```

### packages/ui/src/components/ui/date-range-picker.tsx

- **Line 30** (placeholder): `"Select date range"`
  ```
  placeholder = "Select date range",
  ```

- **Line 30** (placeholder): `"Select date range"`
  ```
  placeholder = "Select date range",
  ```

- **Line 89** (ui): `"To ${formatDate(value.to, 'long')}"`
  ```
  return `To ${formatDate(value.to, 'long')}`;
  ```

- **Line 233** (ui): `"absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2"`
  ```
  "absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2",
  ```

### packages/ui/src/components/ui/searchable-country-select.tsx

- **Line 27** (placeholder): `"Select country..."`
  ```
  placeholder = 'Select country...',
  ```

- **Line 27** (placeholder): `"Select country..."`
  ```
  placeholder = 'Select country...',
  ```

- **Line 149** (ui): `"absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5"`
  ```
  <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5">
  ```

### packages/ui/src/components/ui/loading-indicator.tsx

- **Line 44** (ui): `"animate-progress"`
  ```
  'animate-progress',
  ```

- **Line 99** (ui): `"animate-spin text-green-600"`
  ```
  className={cn('animate-spin text-green-600', sizes.spinner)}
  ```

- **Line 147** (ui): `"animate-spin"`
  ```
  className={cn('animate-spin', sizes.spinner, className)}
  ```

### packages/ui/src/components/ui/radio-group.tsx

- **Line 31** (ui): `"aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"`
  ```
  "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  ```

### packages/ui/src/components/ui/searchable-select.tsx

- **Line 29** (ui): `"Add New"`
  ```
  showAddNew?: boolean; // Show "Add New" option at top
  ```

- **Line 31** (ui): `"Add New"`
  ```
  onAddNew?: () => void; // Callback when "Add New" is clicked
  ```

- **Line 46** (ui): `"Add New"`
  ```
  addNewText = 'Add New',
  ```

- **Line 273** (ui): `"absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5"`
  ```
  <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5">
  ```

### packages/ui/src/components/ui/limit-input.tsx

- **Line 35** (ui): `"Use -1 for unlimited"`
  ```
  helpText = "Use -1 for unlimited"
  ```

### packages/ui/src/components/ui/numeric-input-demo.tsx

- **Line 24** (ui): `"Price Inputs (with decimals)"`
  ```
  <CardTitle>Price Inputs (with decimals)</CardTitle>
  ```

- **Line 28** (ui): `"Price with Currency"`
  ```
  label="Price with Currency"
  ```

- **Line 38** (ui): `"Price with VND"`
  ```
  label="Price with VND"
  ```

- **Line 74** (ui): `"Weight in grams"`
  ```
  label="Weight in grams"
  ```

### packages/ui/src/components/ui/logo.tsx

- **Line 76** (ui): `"AnyRent Logo"`
  ```
  alt="AnyRent Logo"
  ```

- **Line 83** (ui): `"AnyRent Logo"`
  ```
  alt="AnyRent Logo"
  ```

### packages/ui/src/components/ui/dialog.tsx

- **Line 44** (ui): `"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"`
  ```
  <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
  ```

### packages/ui/src/components/ui/toast.tsx

- **Line 114** (ui): `"animate-slide-in-from-right"`
  ```
  className="animate-slide-in-from-right"
  ```

### packages/ui/src/components/ui/dropdown-menu.tsx

- **Line 90** (ui): `"absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-gray-900 shadow-md animate-in fade-in-0 zoom-in-95"`
  ```
  "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-gray-900 shadow-md animate-in fade-in-0 zoom-in-95",
  ```

- **Line 170** (ui): `"absolute left-2 flex h-3.5 w-3.5 items-center justify-center"`
  ```
  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
  ```

- **Line 192** (ui): `"absolute left-2 flex h-3.5 w-3.5 items-center justify-center"`
  ```
  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
  ```

### packages/ui/src/components/ui/select.tsx

- **Line 131** (ui): `"absolute left-2 flex h-3.5 w-3.5 items-center justify-center"`
  ```
  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
  ```

### packages/ui/src/components/ui/confirmation-dialog-with-reason.tsx

- **Line 89** (placeholder): `"Enter reason..."`
  ```
  reasonPlaceholder = 'Enter reason...',
  ```

- **Line 89** (placeholder): `"Enter reason..."`
  ```
  reasonPlaceholder = 'Enter reason...',
  ```

### packages/ui/src/components/ui/skeleton.tsx

- **Line 11** (ui): `"animate-pulse rounded-md bg-gray-200 dark:bg-gray-700"`
  ```
  "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
  ```

### packages/ui/src/components/forms/LoginForm.tsx

- **Line 113** (ui): `"absolute inset-0 pointer-events-none"`
  ```
  <div className="absolute inset-0 pointer-events-none" style={{
  ```

- **Line 120** (ui): `"absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"`
  ```
  <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
  ```

- **Line 121** (ui): `"absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"`
  ```
  <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
  ```

- **Line 122** (ui): `"absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"`
  ```
  <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
  ```

- **Line 123** (ui): `"absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"`
  ```
  <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
  ```

- **Line 126** (ui): `"absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none"`
  ```
  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
  ```

- **Line 130** (ui): `"absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none"`
  ```
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
  ```

- **Line 136** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

- **Line 266** (ui): `"animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"`
  ```
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
  ```

- **Line 297** (ui): `"AnyRent Admin"`
  ```
  © {new Date().getFullYear()} {isAdmin ? "AnyRent Admin" : "AnyRent"}. Crafted with{" "}
  ```

### packages/ui/src/components/forms/RegisterForm.tsx

- **Line 624** (ui): `"acceptTermsAndPrivacy"`
  ```
  name="acceptTermsAndPrivacy"
  ```

### packages/ui/src/components/forms/ResetPasswordForm.tsx

- **Line 113** (ui): `"absolute inset-0 pointer-events-none"`
  ```
  <div className="absolute inset-0 pointer-events-none" style={{
  ```

- **Line 120** (ui): `"absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"`
  ```
  <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
  ```

- **Line 121** (ui): `"absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"`
  ```
  <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
  ```

- **Line 122** (ui): `"absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"`
  ```
  <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
  ```

- **Line 123** (ui): `"absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"`
  ```
  <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
  ```

- **Line 126** (ui): `"absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none"`
  ```
  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
  ```

- **Line 130** (ui): `"absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none"`
  ```
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
  ```

- **Line 136** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

- **Line 232** (ui): `"absolute inset-0 pointer-events-none"`
  ```
  <div className="absolute inset-0 pointer-events-none" style={{
  ```

- **Line 239** (ui): `"absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"`
  ```
  <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
  ```

- **Line 240** (ui): `"absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"`
  ```
  <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
  ```

- **Line 241** (ui): `"absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"`
  ```
  <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
  ```

- **Line 242** (ui): `"absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"`
  ```
  <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
  ```

- **Line 245** (ui): `"absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none"`
  ```
  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
  ```

- **Line 249** (ui): `"absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none"`
  ```
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
  ```

- **Line 255** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

- **Line 369** (ui): `"animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"`
  ```
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
  ```

### packages/ui/src/components/forms/ForgetPasswordForm.tsx

- **Line 104** (ui): `"absolute inset-0 pointer-events-none"`
  ```
  <div className="absolute inset-0 pointer-events-none" style={{
  ```

- **Line 111** (ui): `"absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"`
  ```
  <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
  ```

- **Line 112** (ui): `"absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"`
  ```
  <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
  ```

- **Line 113** (ui): `"absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"`
  ```
  <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
  ```

- **Line 114** (ui): `"absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"`
  ```
  <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
  ```

- **Line 117** (ui): `"absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none"`
  ```
  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
  ```

- **Line 121** (ui): `"absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none"`
  ```
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
  ```

- **Line 127** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

- **Line 237** (ui): `"absolute inset-0 pointer-events-none"`
  ```
  <div className="absolute inset-0 pointer-events-none" style={{
  ```

- **Line 244** (ui): `"absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"`
  ```
  <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
  ```

- **Line 245** (ui): `"absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"`
  ```
  <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
  ```

- **Line 246** (ui): `"absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"`
  ```
  <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
  ```

- **Line 247** (ui): `"absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"`
  ```
  <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
  ```

- **Line 250** (ui): `"absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none"`
  ```
  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
  ```

- **Line 254** (ui): `"absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none"`
  ```
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
  ```

- **Line 260** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

- **Line 328** (ui): `"animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"`
  ```
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
  ```

### packages/ui/src/components/forms/CreateOrderForm/CreateOrderForm.tsx

- **Line 190** (ui): `"Available: ${product.outletStock?.[0]?.available || 0}"`
  ```
  `Available: ${product.outletStock?.[0]?.available || 0}`,
  ```

- **Line 244** (ui): `"Out of Stock (need ${requestedQuantity}, have ${availabilityData.totalAvailableStock})"`
  ```
  text: `Out of Stock (need ${requestedQuantity}, have ${availabilityData.totalAvailableStock})`,
  ```

- **Line 257** (ui): `"Unavailable for selected dates"`
  ```
  : 'Unavailable for selected dates',
  ```

- **Line 271** (ui): `"Available (${effectivelyAvailable} units)"`
  ```
  text: `Available (${effectivelyAvailable} units)`,
  ```

### packages/ui/src/components/forms/CreateOrderForm/components/OrderPreviewForm.tsx

- **Line 140** (ui): `"Review your order details before confirming"`
  ```
  subtitle = 'Review your order details before confirming',
  ```

- **Line 290** (ui): `"No items added to this order"`
  ```
  <p>No items added to this order</p>
  ```

### packages/ui/src/components/forms/CreateOrderForm/components/OrderInfoSection.tsx

- **Line 295** (placeholder): `"Select outlet..."`
  ```
  <SelectValue placeholder="Select outlet..." />
  ```

- **Line 295** (placeholder): `"Select outlet..."`
  ```
  <SelectValue placeholder="Select outlet..." />
  ```

- **Line 373** (ui): `"absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"`
  ```
  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
  ```

- **Line 445** (placeholder): `"Enter deposit amount..."`
  ```
  placeholder="Enter deposit amount..."
  ```

- **Line 445** (placeholder): `"Enter deposit amount..."`
  ```
  placeholder="Enter deposit amount..."
  ```

### packages/ui/src/components/forms/CreateOrderForm/components/ProductsSection.tsx

- **Line 168** (placeholder): `"Type to search products..."`
  ```
  searchPlaceholder="Type to search products..."
  ```

- **Line 168** (placeholder): `"Type to search products..."`
  ```
  searchPlaceholder="Type to search products..."
  ```

- **Line 333** (placeholder): `"Add notes about this product..."`
  ```
  placeholder="Add notes about this product..."
  ```

- **Line 333** (placeholder): `"Add notes about this product..."`
  ```
  placeholder="Add notes about this product..."
  ```

- **Line 482** (placeholder): `"Add notes for this item..."`
  ```
  placeholder="Add notes for this item..."
  ```

- **Line 482** (placeholder): `"Add notes for this item..."`
  ```
  placeholder="Add notes for this item..."
  ```

### packages/ui/src/components/forms/CreateOrderForm/hooks/useMerchantData.ts

- **Line 39** (ui): `"User not logged in"`
  ```
  return 'User not logged in';
  ```

- **Line 42** (ui): `"No merchant associated with user"`
  ```
  return 'No merchant associated with user';
  ```

### packages/ui/src/components/forms/ProductForm.tsx

- **Line 732** (ui): `"Out of Stock"`
  ```
  if (formData.totalStock === 0) return { status: 'Out of Stock', variant: 'destructive' as const };
  ```

- **Line 733** (ui): `"In Stock"`
  ```
  return { status: 'In Stock', variant: 'default' as const };
  ```

- **Line 760** (ui): `"animate-spin rounded-full h-3 w-3 border-b-2 border-text-secondary"`
  ```
  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-text-secondary" />
  ```

- **Line 1184** (ui): `"absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 h-6 w-6"`
  ```
  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 h-6 w-6"
  ```

- **Line 1238** (ui): `"absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 h-6 w-6"`
  ```
  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 h-6 w-6"
  ```

- **Line 1268** (ui): `"animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"`
  ```
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
  ```

### packages/ui/src/components/forms/CustomerForm.tsx

- **Line 142** (placeholder): `"Enter first name"`
  ```
  placeholder="Enter first name"
  ```

- **Line 142** (placeholder): `"Enter first name"`
  ```
  placeholder="Enter first name"
  ```

- **Line 161** (placeholder): `"Enter last name"`
  ```
  placeholder="Enter last name"
  ```

- **Line 161** (placeholder): `"Enter last name"`
  ```
  placeholder="Enter last name"
  ```

- **Line 180** (placeholder): `"Enter email address"`
  ```
  placeholder="Enter email address"
  ```

- **Line 180** (placeholder): `"Enter email address"`
  ```
  placeholder="Enter email address"
  ```

- **Line 199** (placeholder): `"Enter phone number"`
  ```
  placeholder="Enter phone number"
  ```

- **Line 199** (placeholder): `"Enter phone number"`
  ```
  placeholder="Enter phone number"
  ```

- **Line 218** (placeholder): `"Select date of birth"`
  ```
  placeholder="Select date of birth"
  ```

- **Line 218** (placeholder): `"Select date of birth"`
  ```
  placeholder="Select date of birth"
  ```

- **Line 242** (placeholder): `"Enter street address"`
  ```
  placeholder="Enter street address"
  ```

- **Line 242** (placeholder): `"Enter street address"`
  ```
  placeholder="Enter street address"
  ```

- **Line 256** (placeholder): `"Enter city"`
  ```
  placeholder="Enter city"
  ```

- **Line 256** (placeholder): `"Enter city"`
  ```
  placeholder="Enter city"
  ```

- **Line 269** (placeholder): `"Enter state"`
  ```
  placeholder="Enter state"
  ```

- **Line 269** (placeholder): `"Enter state"`
  ```
  placeholder="Enter state"
  ```

- **Line 282** (placeholder): `"Enter ZIP code"`
  ```
  placeholder="Enter ZIP code"
  ```

- **Line 282** (placeholder): `"Enter ZIP code"`
  ```
  placeholder="Enter ZIP code"
  ```

- **Line 296** (placeholder): `"Enter country"`
  ```
  placeholder="Enter country"
  ```

- **Line 296** (placeholder): `"Enter country"`
  ```
  placeholder="Enter country"
  ```

- **Line 320** (placeholder): `"Enter any additional notes about the customer"`
  ```
  placeholder="Enter any additional notes about the customer"
  ```

- **Line 320** (placeholder): `"Enter any additional notes about the customer"`
  ```
  placeholder="Enter any additional notes about the customer"
  ```

### packages/ui/src/components/forms/PlanForm.tsx

- **Line 249** (placeholder): `"Enter plan name"`
  ```
  placeholder="Enter plan name"
  ```

- **Line 249** (placeholder): `"Enter plan name"`
  ```
  placeholder="Enter plan name"
  ```

- **Line 274** (placeholder): `"Describe what this plan offers"`
  ```
  placeholder="Describe what this plan offers"
  ```

- **Line 274** (placeholder): `"Describe what this plan offers"`
  ```
  placeholder="Describe what this plan offers"
  ```

- **Line 288** (ui): `"Active Plan"`
  ```
  <Label htmlFor="isActive">Active Plan</Label>
  ```

- **Line 438** (ui): `"Use -1 for unlimited"`
  ```
  helpText="Use -1 for unlimited"
  ```

- **Line 449** (ui): `"Use -1 for unlimited"`
  ```
  helpText="Use -1 for unlimited"
  ```

- **Line 460** (ui): `"Use -1 for unlimited"`
  ```
  helpText="Use -1 for unlimited"
  ```

- **Line 471** (ui): `"Use -1 for unlimited"`
  ```
  helpText="Use -1 for unlimited"
  ```

- **Line 527** (placeholder): `"Add a feature..."`
  ```
  placeholder="Add a feature..."
  ```

- **Line 527** (placeholder): `"Add a feature..."`
  ```
  placeholder="Add a feature..."
  ```

- **Line 573** (ui): `"animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"`
  ```
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
  ```

### packages/ui/src/components/layout/SubscriptionStatus.tsx

- **Line 102** (ui): `"Expires in ${daysUntilExpiry} days"`
  ```
  case 'ACTIVE': return isExpiringSoon ? `Expires in ${daysUntilExpiry} days` : 'Active';
  ```

### packages/ui/src/components/layout/TodaysFocus.tsx

- **Line 31** (ui): `"Items to be picked up"`
  ```
  <p className="text-xs text-gray-400">Items to be picked up</p>
  ```

- **Line 46** (ui): `"Items to be returned"`
  ```
  <p className="text-xs text-gray-400">Items to be returned</p>
  ```

- **Line 75** (ui): `"Active Rentals"`
  ```
  <p className="font-medium text-gray-900 text-sm">Active Rentals</p>
  ```

- **Line 121** (ui): `"Notify upcoming returns"`
  ```
  <div className="text-sm text-gray-500">Notify upcoming returns</div>
  ```

### packages/ui/src/components/layout/ClientSidebar.tsx

- **Line 432** (ui): `"absolute -top-1 -right-1 w-3 h-3 bg-action-primary rounded-full text-xs text-white flex items-center justify-center"`
  ```
  <span className="absolute -top-1 -right-1 w-3 h-3 bg-action-primary rounded-full text-xs text-white flex items-center justify-center">
  ```

- **Line 450** (ui): `"absolute -top-1 -right-1 w-3 h-3 bg-action-danger rounded-full text-xs text-white flex items-center justify-center"`
  ```
  <span className="absolute -top-1 -right-1 w-3 h-3 bg-action-danger rounded-full text-xs text-white flex items-center justify-center">
  ```

- **Line 458** (ui): `"absolute -top-1 -right-1 w-3 h-3 bg-action-primary rounded-full text-xs text-white flex items-center justify-center"`
  ```
  <span className="absolute -top-1 -right-1 w-3 h-3 bg-action-primary rounded-full text-xs text-white flex items-center justify-center">
  ```

### packages/ui/src/components/layout/AdminSidebar.tsx

- **Line 93** (ui): `"Admin Info"`
  ```
  label: 'Admin Info',
  ```

### packages/ui/src/components/layout/ColorfulTodaysFocus.tsx

- **Line 19** (ui): `"Items to be picked up"`
  ```
  description: 'Items to be picked up',
  ```

- **Line 28** (ui): `"Items to be returned"`
  ```
  description: 'Items to be returned',
  ```

- **Line 45** (ui): `"Active Rentals"`
  ```
  title: 'Active Rentals',
  ```

- **Line 76** (ui): `"Notify upcoming returns"`
  ```
  description: 'Notify upcoming returns',
  ```

- **Line 92** (ui): `"absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${operation.color}"`
  ```
  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${operation.color}`}></div>
  ```

- **Line 127** (ui): `"absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${action.color}"`
  ```
  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${action.color}`}></div>
  ```

### packages/ui/src/components/layout/QuickActionsGrid.tsx

- **Line 58** (ui): `"Add Product"`
  ```
  title: 'Add Product',
  ```

- **Line 59** (ui): `"Add new item"`
  ```
  description: 'Add new item',
  ```

### packages/ui/src/components/layout/EnhancedStatCard.tsx

- **Line 65** (ui): `"Needs Attention"`
  ```
  {trend === 'up' ? 'Good' : 'Needs Attention'}
  ```

### packages/ui/src/components/layout/TimePeriodSelector.tsx

- **Line 16** (ui): `"This Week"`
  ```
  { key: 'week', label: 'This Week', icon: '📅' },
  ```

- **Line 17** (ui): `"This Month"`
  ```
  { key: 'month', label: 'This Month', icon: '📊' },
  ```

- **Line 18** (ui): `"This Quarter"`
  ```
  { key: 'quarter', label: 'This Quarter', icon: '📈' },
  ```

- **Line 19** (ui): `"This Year"`
  ```
  { key: 'year', label: 'This Year', icon: '📈' }
  ```

### packages/ui/src/components/layout/layout.tsx

- **Line 66** (ui): `"Admin Panel"`
  ```
  {variant === 'admin' ? 'Admin Panel' : 'Rental Shop'}
  ```

### packages/ui/src/components/layout/ColorfulQuickActions.tsx

- **Line 20** (ui): `"absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}"`
  ```
  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`}></div>
  ```

- **Line 61** (ui): `"Add Product"`
  ```
  title: 'Add Product',
  ```

- **Line 62** (ui): `"Add new item"`
  ```
  description: 'Add new item',
  ```

### packages/ui/src/components/layout/ServerTopNavigation.tsx

- **Line 139** (ui): `"absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"`
  ```
  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
  ```

### packages/ui/src/components/layout/TopNavigation.tsx

- **Line 90** (ui): `"Audit Logs"`
  ```
  { href: '/system/audit-logs', label: 'Audit Logs', icon: FileText }
  ```

- **Line 170** (ui): `"absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"`
  ```
  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
  ```

- **Line 235** (ui): `"absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"`
  ```
  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
  ```

### packages/ui/src/components/layout/SearchInput.tsx

- **Line 83** (ui): `"animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
  ```

### packages/ui/src/components/features/Customers/components/CustomerInfoCard.tsx

- **Line 77** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### packages/ui/src/components/features/Customers/components/CustomerActions.tsx

- **Line 88** (ui): `"add-customer"`
  ```
  id: 'add-customer',
  ```

- **Line 89** (ui): `"Add Customer"`
  ```
  label: 'Add Customer',
  ```

### packages/ui/src/components/features/Customers/components/CustomerPageHeader.tsx

- **Line 19** (ui): `"Back to Customers"`
  ```
  backText = 'Back to Customers',
  ```

### packages/ui/src/components/features/Customers/components/CustomerOrdersSummaryCard.tsx

- **Line 63** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### packages/ui/src/components/features/Customers/components/CustomerStats.tsx

- **Line 121** (ui): `"New This Month"`
  ```
  <span className="text-sm text-gray-600 dark:text-gray-400">New This Month</span>
  ```

- **Line 143** (ui): `"Average Order Value"`
  ```
  <span className="text-sm text-gray-600 dark:text-gray-400">Average Order Value</span>
  ```

- **Line 148** (ui): `"New This Month"`
  ```
  <span className="text-sm text-gray-600 dark:text-gray-400">New This Month</span>
  ```

### packages/ui/src/components/features/Customers/components/CustomerForm.tsx

- **Line 158** (placeholder): `"Enter first name"`
  ```
  placeholder="Enter first name"
  ```

- **Line 158** (placeholder): `"Enter first name"`
  ```
  placeholder="Enter first name"
  ```

- **Line 174** (placeholder): `"Enter last name"`
  ```
  placeholder="Enter last name"
  ```

- **Line 174** (placeholder): `"Enter last name"`
  ```
  placeholder="Enter last name"
  ```

- **Line 191** (placeholder): `"Enter email address"`
  ```
  placeholder="Enter email address"
  ```

- **Line 191** (placeholder): `"Enter email address"`
  ```
  placeholder="Enter email address"
  ```

- **Line 207** (placeholder): `"Enter phone number"`
  ```
  placeholder="Enter phone number"
  ```

- **Line 207** (placeholder): `"Enter phone number"`
  ```
  placeholder="Enter phone number"
  ```

- **Line 223** (placeholder): `"Enter company name"`
  ```
  placeholder="Enter company name"
  ```

- **Line 223** (placeholder): `"Enter company name"`
  ```
  placeholder="Enter company name"
  ```

- **Line 230** (ui): `"Date of Birth"`
  ```
  <Label htmlFor="dateOfBirth">Date of Birth</Label>
  ```

- **Line 249** (placeholder): `"Select ID type"`
  ```
  <SelectValue placeholder="Select ID type" />
  ```

- **Line 249** (placeholder): `"Select ID type"`
  ```
  <SelectValue placeholder="Select ID type" />
  ```

- **Line 267** (placeholder): `"Enter ID number"`
  ```
  placeholder="Enter ID number"
  ```

- **Line 267** (placeholder): `"Enter ID number"`
  ```
  placeholder="Enter ID number"
  ```

- **Line 280** (placeholder): `"Enter street address"`
  ```
  placeholder="Enter street address"
  ```

- **Line 280** (placeholder): `"Enter street address"`
  ```
  placeholder="Enter street address"
  ```

- **Line 293** (placeholder): `"Enter city"`
  ```
  placeholder="Enter city"
  ```

- **Line 293** (placeholder): `"Enter city"`
  ```
  placeholder="Enter city"
  ```

- **Line 305** (placeholder): `"Enter state"`
  ```
  placeholder="Enter state"
  ```

- **Line 305** (placeholder): `"Enter state"`
  ```
  placeholder="Enter state"
  ```

- **Line 317** (placeholder): `"Enter zip code"`
  ```
  placeholder="Enter zip code"
  ```

- **Line 317** (placeholder): `"Enter zip code"`
  ```
  placeholder="Enter zip code"
  ```

- **Line 330** (placeholder): `"Enter country"`
  ```
  placeholder="Enter country"
  ```

- **Line 330** (placeholder): `"Enter country"`
  ```
  placeholder="Enter country"
  ```

- **Line 342** (placeholder): `"Enter any additional notes"`
  ```
  placeholder="Enter any additional notes"
  ```

- **Line 342** (placeholder): `"Enter any additional notes"`
  ```
  placeholder="Enter any additional notes"
  ```

### packages/ui/src/components/features/Customers/Customers.tsx

- **Line 78** (ui): `"Manage customers in the system"`
  ```
  subtitle = "Manage customers in the system",
  ```

- **Line 81** (ui): `"Add Customer"`
  ```
  addButtonText = "Add Customer",
  ```

- **Line 106** (ui): `"Add customer functionality should be implemented in page"`
  ```
  console.log('Add customer functionality should be implemented in page');
  ```

### packages/ui/src/components/features/Settings/components/SubscriptionSection.tsx

- **Line 46** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
  ```

### packages/ui/src/components/features/Settings/components/CurrencySection.tsx

- **Line 204** (ui): `"absolute top-2 right-2"`
  ```
  <div className="absolute top-2 right-2">
  ```

### packages/ui/src/components/features/Settings/components/SettingsLayout.tsx

- **Line 62** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto mb-4"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto mb-4"></div>
  ```

### packages/ui/src/components/features/Settings/components/PricingSection.tsx

- **Line 125** (ui): `"Access denied"`
  ```
  <CardDescription>Access denied</CardDescription>
  ```

- **Line 184** (ui): `"Various items and services"`
  ```
  <div className="text-sm text-gray-500">Various items and services</div>
  ```

### packages/ui/src/components/features/Settings/components/SecuritySection.tsx

- **Line 30** (ui): `"Manage your password and account security settings"`
  ```
  <p className="text-gray-600">Manage your password and account security settings</p>
  ```

- **Line 41** (ui): `"Change your password to keep your account secure"`
  ```
  <p className="text-sm text-gray-600">Change your password to keep your account secure</p>
  ```

### packages/ui/src/components/features/Settings/components/MerchantSection.tsx

- **Line 465** (placeholder): `"Type to search countries..."`
  ```
  placeholder="Type to search countries..."
  ```

- **Line 465** (placeholder): `"Type to search countries..."`
  ```
  placeholder="Type to search countries..."
  ```

- **Line 506** (ui): `"Click to copy link"`
  ```
  title="Click to copy link"
  ```

### packages/ui/src/components/features/Payments/components/PaymentForm.tsx

- **Line 348** (placeholder): `"Type to search merchants..."`
  ```
  searchPlaceholder="Type to search merchants..."
  ```

- **Line 348** (placeholder): `"Type to search merchants..."`
  ```
  searchPlaceholder="Type to search merchants..."
  ```

- **Line 376** (placeholder): `"Type to search plans..."`
  ```
  searchPlaceholder="Type to search plans..."
  ```

- **Line 376** (placeholder): `"Type to search plans..."`
  ```
  searchPlaceholder="Type to search plans..."
  ```

- **Line 377** (ui): `"No plans found. Please add plans first."`
  ```
  emptyText="No plans found. Please add plans first."
  ```

- **Line 381** (ui): `"No plans available. Please add plans first."`
  ```
  <p className="text-sm text-red-500">No plans available. Please add plans first.</p>
  ```

- **Line 404** (ui): `"Save $${variant.savings} with ${variant.discount}% discount"`
  ```
  ? `Save $${variant.savings} with ${variant.discount}% discount`
  ```

- **Line 409** (placeholder): `"Type to search plan variants..."`
  ```
  searchPlaceholder="Type to search plan variants..."
  ```

- **Line 409** (placeholder): `"Type to search plan variants..."`
  ```
  searchPlaceholder="Type to search plan variants..."
  ```

- **Line 410** (ui): `"No plan variants found for this plan."`
  ```
  emptyText="No plan variants found for this plan."
  ```

- **Line 414** (ui): `"No plan variants available for this plan. Please add plan variants first."`
  ```
  <p className="text-sm text-red-500">No plan variants available for this plan. Please add plan variants first.</p>
  ```

- **Line 461** (placeholder): `"Select payment method"`
  ```
  <SelectValue placeholder="Select payment method" />
  ```

- **Line 461** (placeholder): `"Select payment method"`
  ```
  <SelectValue placeholder="Select payment method" />
  ```

- **Line 493** (ui): `"Months to Extend *"`
  ```
  <Label htmlFor="monthsToExtend">Months to Extend *</Label>
  ```

- **Line 500** (placeholder): `"Enter number of months"`
  ```
  placeholder="Enter number of months"
  ```

- **Line 500** (placeholder): `"Enter number of months"`
  ```
  placeholder="Enter number of months"
  ```

- **Line 553** (placeholder): `"Payment description or notes..."`
  ```
  placeholder="Payment description or notes..."
  ```

- **Line 553** (placeholder): `"Payment description or notes..."`
  ```
  placeholder="Payment description or notes..."
  ```

### packages/ui/src/components/features/Payments/components/PaymentTable.tsx

- **Line 123** (ui): `"animate-pulse space-y-4 p-6"`
  ```
  <div className="animate-pulse space-y-4 p-6">
  ```

### packages/ui/src/components/features/Products/components/ProductDetailList.tsx

- **Line 256** (ui): `"aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-all hover:scale-105"`
  ```
  className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-300 transition-all hover:scale-105"
  ```

### packages/ui/src/components/features/Products/components/ProductCard.tsx

- **Line 185** (ui): `"absolute top-2 left-2"`
  ```
  <div className="absolute top-2 left-2">
  ```

- **Line 191** (ui): `"absolute top-2 right-2 flex gap-1"`
  ```
  <div className="absolute top-2 right-2 flex gap-1">
  ```

### packages/ui/src/components/features/Products/components/ProductOrdersView.tsx

- **Line 285** (ui): `"Export orders for product:"`
  ```
  console.log('Export orders for product:', productId);
  ```

### packages/ui/src/components/features/Products/components/ProductActions.tsx

- **Line 68** (ui): `"add-product"`
  ```
  id: 'add-product',
  ```

- **Line 69** (ui): `"Add Product"`
  ```
  label: 'Add Product',
  ```

### packages/ui/src/components/features/Products/components/ProductPageHeader.tsx

- **Line 19** (ui): `"Back to Products"`
  ```
  backText = 'Back to Products',
  ```

### packages/ui/src/components/features/Products/components/ProductOrdersDialog.tsx

- **Line 156** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
  ```

### packages/ui/src/components/features/Products/components/ProductsLoading.tsx

- **Line 45** (ui): `"aspect-square w-full bg-gray-200 rounded-lg animate-pulse"`
  ```
  <div className="aspect-square w-full bg-gray-200 rounded-lg animate-pulse" />
  ```

### packages/ui/src/components/features/Products/Products.tsx

- **Line 74** (ui): `"Manage your product catalog"`
  ```
  subtitle = "Manage your product catalog",
  ```

- **Line 77** (ui): `"Add Product"`
  ```
  addButtonText = "Add Product",
  ```

- **Line 102** (ui): `"Add product functionality should be implemented in page"`
  ```
  console.log('Add product functionality should be implemented in page');
  ```

### packages/ui/src/components/features/Plans/components/PlanDialog.tsx

- **Line 51** (ui): `"Create a new subscription plan for merchants"`
  ```
  return 'Create a new subscription plan for merchants';
  ```

- **Line 53** (ui): `"Update the plan information and settings"`
  ```
  return 'Update the plan information and settings';
  ```

- **Line 55** (ui): `"View plan details and configuration"`
  ```
  return 'View plan details and configuration';
  ```

### packages/ui/src/components/features/Plans/components/PlanSelection.tsx

- **Line 112** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

- **Line 130** (ui): `"Choose how often you'd like to be billed"`
  ```
  <p className="text-text-secondary">Choose how often you'd like to be billed</p>
  ```

- **Line 168** (ui): `"Select Your Plan"`
  ```
  <h3 className="text-lg font-medium text-text-primary mb-2">Select Your Plan</h3>
  ```

- **Line 169** (ui): `"Choose the plan that best fits your business needs"`
  ```
  <p className="text-text-secondary">Choose the plan that best fits your business needs</p>
  ```

### packages/ui/src/components/features/Plans/components/PlanTable.tsx

- **Line 93** (ui): `"animate-pulse space-y-4 p-6"`
  ```
  <div className="animate-pulse space-y-4 p-6">
  ```

### packages/ui/src/components/features/Plans/components/PlanFilters.tsx

- **Line 69** (ui): `"All Plans"`
  ```
  <SelectItem value="all">All Plans</SelectItem>
  ```

### packages/ui/src/components/features/Plans/components/PlanStats.tsx

- **Line 48** (ui): `"Active Plans"`
  ```
  <div className="text-sm text-text-secondary">Active Plans</div>
  ```

- **Line 68** (ui): `"Plans with Trial"`
  ```
  <div className="text-sm text-text-secondary">Plans with Trial</div>
  ```

### packages/ui/src/components/features/Auth/BusinessTypeSelector.tsx

- **Line 44** (ui): `"Various items and services"`
  ```
  description: 'Various items and services',
  ```

- **Line 52** (ui): `"Choose Your Business Type"`
  ```
  <h3 className="text-lg font-semibold mb-2">Choose Your Business Type</h3>
  ```

### packages/ui/src/components/features/BillingCycles/components/BillingCycleForm.tsx

- **Line 240** (placeholder): `"Describe this billing cycle..."`
  ```
  placeholder="Describe this billing cycle..."
  ```

- **Line 240** (placeholder): `"Describe this billing cycle..."`
  ```
  placeholder="Describe this billing cycle..."
  ```

### packages/ui/src/components/features/BillingCycles/components/BillingCycleTable.tsx

- **Line 81** (ui): `"animate-pulse space-y-4"`
  ```
  <div className="animate-pulse space-y-4">
  ```

### packages/ui/src/components/features/Outlets/components/OutletFilters.tsx

- **Line 70** (ui): `"All Status"`
  ```
  <SelectItem value="all">All Status</SelectItem>
  ```

### packages/ui/src/components/features/Outlets/components/OutletGrid.tsx

- **Line 34** (ui): `"No outlets match your current filters."`
  ```
  <p className="text-sm">No outlets match your current filters.</p>
  ```

### packages/ui/src/components/features/Admin/components/SettingsFields.tsx

- **Line 21** (placeholder): `"Enter site name"`
  ```
  placeholder: 'Enter site name',
  ```

- **Line 39** (placeholder): `"Enter site description"`
  ```
  placeholder: 'Enter site description',
  ```

- **Line 107** (ui): `"Force all users to enable 2FA"`
  ```
  description: 'Force all users to enable 2FA'
  ```

- **Line 111** (ui): `"allowRegistration"`
  ```
  name: 'allowRegistration',
  ```

- **Line 112** (ui): `"Allow User Registration"`
  ```
  label: 'Allow User Registration',
  ```

- **Line 113** (ui): `"Allow new users to register accounts"`
  ```
  description: 'Allow new users to register accounts'
  ```

- **Line 137** (placeholder): `"your-email@gmail.com"`
  ```
  placeholder: 'your-email@gmail.com'
  ```

- **Line 143** (placeholder): `"Your email password"`
  ```
  placeholder: 'Your email password'
  ```

- **Line 155** (placeholder): `"Your Company Name"`
  ```
  placeholder: 'Your Company Name'
  ```

- **Line 165** (ui): `"Send email notifications for system events"`
  ```
  description: 'Send email notifications for system events'
  ```

- **Line 171** (ui): `"Show system alerts in the admin dashboard"`
  ```
  description: 'Show system alerts in the admin dashboard'
  ```

- **Line 177** (ui): `"Put the system in maintenance mode"`
  ```
  description: 'Put the system in maintenance mode'
  ```

- **Line 189** (ui): `"Maximum file size allowed for uploads"`
  ```
  description: 'Maximum file size allowed for uploads'
  ```

- **Line 208** (ui): `"How long to keep system logs"`
  ```
  description: 'How long to keep system logs'
  ```

- **Line 212** (ui): `"allowedFileTypes"`
  ```
  name: 'allowedFileTypes',
  ```

- **Line 213** (ui): `"Allowed File Types"`
  ```
  label: 'Allowed File Types',
  ```

- **Line 215** (ui): `"Comma-separated list of allowed file extensions"`
  ```
  description: 'Comma-separated list of allowed file extensions'
  ```

### packages/ui/src/components/features/Admin/components/DataTable.tsx

- **Line 33** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### packages/ui/src/components/features/Shops/components/OutletsLoading.tsx

- **Line 29** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### packages/ui/src/components/features/Shops/components/ShopsLoading.tsx

- **Line 45** (ui): `"aspect-video w-full bg-gray-200 rounded-lg animate-pulse"`
  ```
  <div className="aspect-video w-full bg-gray-200 rounded-lg animate-pulse" />
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionExtendDialog.tsx

- **Line 41** (ui): `"ADMIN_EXTENSION"`
  ```
  { value: 'ADMIN_EXTENSION', label: 'Admin Extension' },
  ```

- **Line 41** (ui): `"Admin Extension"`
  ```
  { value: 'ADMIN_EXTENSION', label: 'Admin Extension' },
  ```

- **Line 160** (placeholder): `"Reason for extension..."`
  ```
  placeholder="Reason for extension..."
  ```

- **Line 160** (placeholder): `"Reason for extension..."`
  ```
  placeholder="Reason for extension..."
  ```

### packages/ui/src/components/features/Subscriptions/components/UpgradeTrialModal.tsx

- **Line 124** (ui): `"Currently on Trial"`
  ```
  <p className="font-medium text-yellow-900">Currently on Trial</p>
  ```

- **Line 314** (ui): `"You save:"`
  ```
  <span>You save:</span>
  ```

- **Line 331** (ui): `"animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"`
  ```
  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionCancelDialog.tsx

- **Line 38** (ui): `"Switching to different plan"`
  ```
  'Switching to different plan',
  ```

- **Line 124** (ui): `"What happens when you cancel:"`
  ```
  <p className="font-medium">What happens when you cancel:</p>
  ```

- **Line 126** (ui): `"Auto-renewal will be stopped immediately"`
  ```
  <li>Auto-renewal will be stopped immediately</li>
  ```

- **Line 127** (ui): `"All data will be preserved and accessible"`
  ```
  <li>All data will be preserved and accessible</li>
  ```

- **Line 162** (ui): `"Please specify *"`
  ```
  <Label htmlFor="customReason">Please specify *</Label>
  ```

- **Line 167** (placeholder): `"Please provide details about the cancellation reason..."`
  ```
  placeholder="Please provide details about the cancellation reason..."
  ```

- **Line 167** (placeholder): `"Please provide details about the cancellation reason..."`
  ```
  placeholder="Please provide details about the cancellation reason..."
  ```

- **Line 178** (ui): `"Additional Information"`
  ```
  <CardTitle className="text-sm">Additional Information</CardTitle>
  ```

- **Line 185** (ui): `"Trial ends on ${formatDate(subscription.endDate!)}"`
  ```
  ? `Trial ends on ${formatDate(subscription.endDate!)}`
  ```

- **Line 186** (ui): `"Subscription ends on ${formatDate(subscription.endDate!)}"`
  ```
  : `Subscription ends on ${formatDate(subscription.endDate!)}`
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionForm.tsx

- **Line 55** (ui): `"all-platforms"`
  ```
  platform: 'web-only' | 'mobile-only' | 'web-mobile' | 'desktop-only' | 'all-platforms';
  ```

- **Line 323** (placeholder): `"Search for a merchant..."`
  ```
  placeholder="Search for a merchant..."
  ```

- **Line 323** (placeholder): `"Search for a merchant..."`
  ```
  placeholder="Search for a merchant..."
  ```

- **Line 324** (placeholder): `"Type merchant name, email, or location..."`
  ```
  searchPlaceholder="Type merchant name, email, or location..."
  ```

- **Line 324** (placeholder): `"Type merchant name, email, or location..."`
  ```
  searchPlaceholder="Type merchant name, email, or location..."
  ```

- **Line 349** (placeholder): `"Select a plan"`
  ```
  <SelectValue placeholder="Select a plan" />
  ```

- **Line 349** (placeholder): `"Select a plan"`
  ```
  <SelectValue placeholder="Select a plan" />
  ```

- **Line 382** (placeholder): `"Select a plan variant"`
  ```
  <SelectValue placeholder="Select a plan variant" />
  ```

- **Line 382** (placeholder): `"Select a plan variant"`
  ```
  <SelectValue placeholder="Select a plan variant" />
  ```

- **Line 508** (ui): `"Amount *"`
  ```
  <span>Amount *</span>
  ```

- **Line 581** (placeholder): `"Select platform support"`
  ```
  <SelectValue placeholder="Select platform support" />
  ```

- **Line 581** (placeholder): `"Select platform support"`
  ```
  <SelectValue placeholder="Select platform support" />
  ```

- **Line 588** (ui): `"all-platforms"`
  ```
  <SelectItem value="all-platforms">All Platforms</SelectItem>
  ```

- **Line 588** (ui): `"All Platforms"`
  ```
  <SelectItem value="all-platforms">All Platforms</SelectItem>
  ```

- **Line 604** (ui): `"Auto-renew subscription"`
  ```
  <Label htmlFor="autoRenew">Auto-renew subscription</Label>
  ```

- **Line 612** (placeholder): `"Reason for this subscription change..."`
  ```
  placeholder="Reason for this subscription change..."
  ```

- **Line 612** (placeholder): `"Reason for this subscription change..."`
  ```
  placeholder="Reason for this subscription change..."
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionEditDialog.tsx

- **Line 39** (ui): `"all-platforms"`
  ```
  platform: 'web-only' | 'mobile-only' | 'web-mobile' | 'desktop-only' | 'all-platforms';
  ```

- **Line 289** (ui): `"all-platforms"`
  ```
  formData.platform === 'all-platforms' ? 'All Platforms' :
  ```

- **Line 289** (ui): `"All Platforms"`
  ```
  formData.platform === 'all-platforms' ? 'All Platforms' :
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionEditDemo.tsx

- **Line 37** (ui): `"Professional features for growing businesses"`
  ```
  description: 'Professional features for growing businesses',
  ```

- **Line 47** (ui): `"Advanced Analytics"`
  ```
  features: ['Advanced Analytics', 'Priority Support', 'Custom Branding'],
  ```

- **Line 59** (ui): `"Professional features for growing businesses"`
  ```
  description: 'Professional features for growing businesses',
  ```

- **Line 69** (ui): `"Advanced Analytics"`
  ```
  features: ['Advanced Analytics', 'Priority Support', 'Custom Branding'],
  ```

- **Line 78** (ui): `"Enterprise features for large businesses"`
  ```
  description: 'Enterprise features for large businesses',
  ```

- **Line 88** (ui): `"Advanced Analytics"`
  ```
  features: ['Advanced Analytics', 'Priority Support', 'Custom Branding', 'API Access', 'White Label'],
  ```

- **Line 88** (ui): `"API Access"`
  ```
  features: ['Advanced Analytics', 'Priority Support', 'Custom Branding', 'API Access', 'White Label'],
  ```

- **Line 113** (ui): `"Acme Corporation"`
  ```
  name: 'Acme Corporation',
  ```

- **Line 128** (ui): `"info@techsolutions.com"`
  ```
  email: 'info@techsolutions.com',
  ```

- **Line 176** (ui): `"Updating subscription with data:"`
  ```
  console.log('Updating subscription with data:', data);
  ```

- **Line 194** (ui): `"Subscription Edit Dialog with Searchable Merchant Field"`
  ```
  <CardTitle>Subscription Edit Dialog with Searchable Merchant Field</CardTitle>
  ```

- **Line 217** (ui): `"See merchant details in the dropdown"`
  ```
  <li>See merchant details in the dropdown</li>
  ```

- **Line 218** (ui): `"Handle large numbers of merchants efficiently"`
  ```
  <li>Handle large numbers of merchants efficiently</li>
  ```

### packages/ui/src/components/features/Subscriptions/components/ManualRenewalModal.tsx

- **Line 170** (placeholder): `"Choose renewal period..."`
  ```
  <SelectValue placeholder="Choose renewal period..." />
  ```

- **Line 170** (placeholder): `"Choose renewal period..."`
  ```
  <SelectValue placeholder="Choose renewal period..." />
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionActivityTimeline.tsx

- **Line 240** (ui): `"animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"`
  ```
  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
  ```

- **Line 270** (ui): `"absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"`
  ```
  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
  ```

- **Line 281** (ui): `"absolute left-3 w-6 h-6 rounded-full ${colorClass} flex items-center justify-center"`
  ```
  <div className={`absolute left-3 w-6 h-6 rounded-full ${colorClass} flex items-center justify-center`}>
  ```

- **Line 402** (ui): `"absolute left-3 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"`
  ```
  <div className="absolute left-3 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionFormSimple.tsx

- **Line 55** (ui): `"all-platforms"`
  ```
  platform: 'web-only' | 'mobile-only' | 'web-mobile' | 'desktop-only' | 'all-platforms';
  ```

- **Line 290** (placeholder): `"Search for a merchant..."`
  ```
  placeholder="Search for a merchant..."
  ```

- **Line 290** (placeholder): `"Search for a merchant..."`
  ```
  placeholder="Search for a merchant..."
  ```

- **Line 291** (placeholder): `"Type merchant name, email, or location..."`
  ```
  searchPlaceholder="Type merchant name, email, or location..."
  ```

- **Line 291** (placeholder): `"Type merchant name, email, or location..."`
  ```
  searchPlaceholder="Type merchant name, email, or location..."
  ```

- **Line 316** (placeholder): `"Select a plan"`
  ```
  <SelectValue placeholder="Select a plan" />
  ```

- **Line 316** (placeholder): `"Select a plan"`
  ```
  <SelectValue placeholder="Select a plan" />
  ```

- **Line 357** (placeholder): `"Select status"`
  ```
  <SelectValue placeholder="Select status" />
  ```

- **Line 357** (placeholder): `"Select status"`
  ```
  <SelectValue placeholder="Select status" />
  ```

- **Line 373** (ui): `"Amount *"`
  ```
  <span>Amount *</span>
  ```

- **Line 401** (placeholder): `"Select currency"`
  ```
  <SelectValue placeholder="Select currency" />
  ```

- **Line 401** (placeholder): `"Select currency"`
  ```
  <SelectValue placeholder="Select currency" />
  ```

- **Line 424** (placeholder): `"Select platform support"`
  ```
  <SelectValue placeholder="Select platform support" />
  ```

- **Line 424** (placeholder): `"Select platform support"`
  ```
  <SelectValue placeholder="Select platform support" />
  ```

- **Line 431** (ui): `"all-platforms"`
  ```
  <SelectItem value="all-platforms">All Platforms</SelectItem>
  ```

- **Line 431** (ui): `"All Platforms"`
  ```
  <SelectItem value="all-platforms">All Platforms</SelectItem>
  ```

- **Line 448** (placeholder): `"Select interval"`
  ```
  <SelectValue placeholder="Select interval" />
  ```

- **Line 448** (placeholder): `"Select interval"`
  ```
  <SelectValue placeholder="Select interval" />
  ```

- **Line 487** (ui): `"Auto Renew"`
  ```
  <Label htmlFor="autoRenew">Auto Renew</Label>
  ```

- **Line 497** (placeholder): `"Reason for this change..."`
  ```
  placeholder="Reason for this change..."
  ```

- **Line 497** (placeholder): `"Reason for this change..."`
  ```
  placeholder="Reason for this change..."
  ```

### packages/ui/src/components/features/Subscriptions/components/RestrictedButton.tsx

- **Line 48** (ui): `"Cannot create with current subscription"`
  ```
  return 'Cannot create with current subscription';
  ```

- **Line 50** (ui): `"Cannot edit with current subscription"`
  ```
  return 'Cannot edit with current subscription';
  ```

- **Line 52** (ui): `"Cannot delete with current subscription"`
  ```
  return 'Cannot delete with current subscription';
  ```

- **Line 54** (ui): `"User management not available with current subscription"`
  ```
  return 'User management not available with current subscription';
  ```

- **Line 56** (ui): `"Outlet management not available with current subscription"`
  ```
  return 'Outlet management not available with current subscription';
  ```

- **Line 58** (ui): `"Product management not available with current subscription"`
  ```
  return 'Product management not available with current subscription';
  ```

- **Line 60** (ui): `"Order processing not available with current subscription"`
  ```
  return 'Order processing not available with current subscription';
  ```

- **Line 62** (ui): `"Action not available with current subscription"`
  ```
  return 'Action not available with current subscription';
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionStatusError.tsx

- **Line 33** (ui): `"Your subscription has been paused. Some features may be limited."`
  ```
  message: 'Your subscription has been paused. Some features may be limited.',
  ```

- **Line 46** (ui): `"Your subscription has expired. Please renew to continue using the service."`
  ```
  message: 'Your subscription has expired. Please renew to continue using the service.',
  ```

- **Line 59** (ui): `"Your subscription has been cancelled. You can reactivate or choose a new plan."`
  ```
  message: 'Your subscription has been cancelled. You can reactivate or choose a new plan.',
  ```

- **Line 72** (ui): `"Your payment is past due. Please update your payment method to avoid service interruption."`
  ```
  message: 'Your payment is past due. Please update your payment method to avoid service interruption.',
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionPreviewPage.tsx

- **Line 132** (ui): `"all-platforms"`
  ```
  case 'all-platforms': return 'All Platforms';
  ```

- **Line 132** (ui): `"All Platforms"`
  ```
  case 'all-platforms': return 'All Platforms';
  ```

- **Line 143** (ui): `"all-platforms"`
  ```
  case 'all-platforms': return <Check className="w-4 h-4" />;
  ```

- **Line 153** (ui): `"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"`
  ```
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
  ```

- **Line 262** (ui): `"absolute -top-1 -right-1"`
  ```
  <div className="absolute -top-1 -right-1">
  ```

- **Line 455** (ui): `"API Access"`
  ```
  <span className="text-gray-700">API Access</span>
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionList.tsx

- **Line 187** (ui): `"animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
  ```

### packages/ui/src/components/features/Subscriptions/components/AdminExtensionModal.tsx

- **Line 67** (ui): `"Admin granted extension"`
  ```
  { value: 'MANUAL_EXTENSION', label: 'Manual Extension', description: 'Admin granted extension' },
  ```

- **Line 68** (ui): `"Account Credit"`
  ```
  { value: 'CREDIT', label: 'Account Credit', description: 'Applied account credit' }
  ```

- **Line 68** (ui): `"Applied account credit"`
  ```
  { value: 'CREDIT', label: 'Account Credit', description: 'Applied account credit' }
  ```

- **Line 104** (ui): `"Manual extension for ${subscription.merchant?.name || 'merchant'}"`
  ```
  description: `Manual extension for ${subscription.merchant?.name || 'merchant'}`
  ```

- **Line 272** (placeholder): `"Select payment method"`
  ```
  <SelectValue placeholder="Select payment method" />
  ```

- **Line 272** (placeholder): `"Select payment method"`
  ```
  <SelectValue placeholder="Select payment method" />
  ```

- **Line 298** (placeholder): `"Enter payment details, reference number, or notes..."`
  ```
  placeholder="Enter payment details, reference number, or notes..."
  ```

- **Line 298** (placeholder): `"Enter payment details, reference number, or notes..."`
  ```
  placeholder="Enter payment details, reference number, or notes..."
  ```

### packages/ui/src/components/features/Subscriptions/components/PlanSelectionModal.tsx

- **Line 77** (ui): `"Save 10% with quarterly billing"`
  ```
  description: 'Save 10% with quarterly billing'
  ```

- **Line 84** (ui): `"Save 15% with semi-annual billing"`
  ```
  description: 'Save 15% with semi-annual billing'
  ```

- **Line 91** (ui): `"Save 25% with annual billing"`
  ```
  description: 'Save 25% with annual billing'
  ```

- **Line 202** (ui): `"Choose Your Plan"`
  ```
  <h3 className="text-lg font-semibold">Choose Your Plan</h3>
  ```

- **Line 287** (placeholder): `"Select payment method"`
  ```
  <SelectValue placeholder="Select payment method" />
  ```

- **Line 287** (placeholder): `"Select payment method"`
  ```
  <SelectValue placeholder="Select payment method" />
  ```

- **Line 351** (ui): `"Continue with Payment"`
  ```
  {loading ? 'Processing...' : 'Continue with Payment'}
  ```

### packages/ui/src/components/features/Subscriptions/components/PaymentHistoryTable.tsx

- **Line 102** (ui): `"animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"`
  ```
  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionExpiryBanner.tsx

- **Line 47** (ui): `"Your subscription has expired. Please renew to continue using the service."`
  ```
  message: 'Your subscription has expired. Please renew to continue using the service.',
  ```

- **Line 56** (ui): `"Your subscription expires on ${new Date(subscription.endDate!).toLocaleDateString()}. Renew now to avoid service interruption."`
  ```
  message: `Your subscription expires on ${new Date(subscription.endDate!).toLocaleDateString()}. Renew now to avoid service interruption.`,
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionChangePlanDialog.tsx

- **Line 102** (placeholder): `"Select billing period"`
  ```
  <SelectValue placeholder="Select billing period" />
  ```

- **Line 102** (placeholder): `"Select billing period"`
  ```
  <SelectValue placeholder="Select billing period" />
  ```

### packages/ui/src/components/features/Subscriptions/SubscriptionPeriodCard.tsx

- **Line 39** (ui): `"alert-triangle"`
  ```
  case 'alert-triangle': return <AlertTriangle className="w-4 h-4" />;
  ```

### packages/ui/src/components/features/AuditLogs/AuditLogViewer.tsx

- **Line 260** (placeholder): `"All actions"`
  ```
  <SelectValue placeholder="All actions" />
  ```

- **Line 260** (placeholder): `"All actions"`
  ```
  <SelectValue placeholder="All actions" />
  ```

- **Line 263** (ui): `"All actions"`
  ```
  <SelectItem value="all">All actions</SelectItem>
  ```

- **Line 281** (placeholder): `"All entities"`
  ```
  <SelectValue placeholder="All entities" />
  ```

- **Line 281** (placeholder): `"All entities"`
  ```
  <SelectValue placeholder="All entities" />
  ```

- **Line 284** (ui): `"All entities"`
  ```
  <SelectItem value="all">All entities</SelectItem>
  ```

- **Line 303** (placeholder): `"All severities"`
  ```
  <SelectValue placeholder="All severities" />
  ```

- **Line 303** (placeholder): `"All severities"`
  ```
  <SelectValue placeholder="All severities" />
  ```

- **Line 306** (ui): `"All severities"`
  ```
  <SelectItem value="all">All severities</SelectItem>
  ```

- **Line 322** (placeholder): `"All categories"`
  ```
  <SelectValue placeholder="All categories" />
  ```

- **Line 322** (placeholder): `"All categories"`
  ```
  <SelectValue placeholder="All categories" />
  ```

- **Line 325** (ui): `"All categories"`
  ```
  <SelectItem value="all">All categories</SelectItem>
  ```

- **Line 356** (placeholder): `"Enter entity ID"`
  ```
  placeholder="Enter entity ID"
  ```

- **Line 356** (placeholder): `"Enter entity ID"`
  ```
  placeholder="Enter entity ID"
  ```

- **Line 365** (placeholder): `"Enter user ID"`
  ```
  placeholder="Enter user ID"
  ```

- **Line 365** (placeholder): `"Enter user ID"`
  ```
  placeholder="Enter user ID"
  ```

- **Line 437** (ui): `"Audit Logs"`
  ```
  <h1 className="text-2xl font-bold text-text-primary mb-2">Audit Logs</h1>
  ```

- **Line 478** (ui): `"animate-spin"`
  ```
  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
  ```

### packages/ui/src/components/features/AuditLogs/AuditLogDetail.tsx

- **Line 267** (ui): `"Audit Log Details"`
  ```
  <DialogTitle>Audit Log Details</DialogTitle>
  ```

### packages/ui/src/components/features/Merchants/components/MerchantPlanManagement.tsx

- **Line 47** (ui): `"No discount for monthly billing"`
  ```
  description: 'No discount for monthly billing',
  ```

- **Line 370** (ui): `"animate-pulse space-y-4"`
  ```
  <div className="animate-pulse space-y-4">
  ```

- **Line 456** (ui): `"Trial ends in:"`
  ```
  {(currentSubscription as any).status === 'trial' ? 'Trial ends in:' : 'Renews in:'}
  ```

- **Line 456** (ui): `"Renews in:"`
  ```
  {(currentSubscription as any).status === 'trial' ? 'Trial ends in:' : 'Renews in:'}
  ```

- **Line 558** (ui): `"This merchant doesn't have an active subscription."`
  ```
  <p className="text-gray-500 mb-4">This merchant doesn't have an active subscription.</p>
  ```

- **Line 685** (placeholder): `"Choose a plan..."`
  ```
  <SelectValue placeholder="Choose a plan..." />
  ```

- **Line 685** (placeholder): `"Choose a plan..."`
  ```
  <SelectValue placeholder="Choose a plan..." />
  ```

- **Line 751** (ui): `"Reason for Change (Optional)"`
  ```
  <Label htmlFor="changeReason">Reason for Change (Optional)</Label>
  ```

- **Line 825** (ui): `"End of Current Period (Recommended)"`
  ```
  <SelectItem value="end_of_period">End of Current Period (Recommended)</SelectItem>
  ```

- **Line 838** (ui): `"Reason for Cancellation"`
  ```
  <Label htmlFor="cancelReason">Reason for Cancellation</Label>
  ```

- **Line 843** (placeholder): `"Enter reason for canceling this plan..."`
  ```
  placeholder="Enter reason for canceling this plan..."
  ```

- **Line 843** (placeholder): `"Enter reason for canceling this plan..."`
  ```
  placeholder="Enter reason for canceling this plan..."
  ```

- **Line 892** (ui): `"Reason for Pausing"`
  ```
  <Label htmlFor="suspendReason">Reason for Pausing</Label>
  ```

- **Line 897** (placeholder): `"Enter reason for pausing this plan..."`
  ```
  placeholder="Enter reason for pausing this plan..."
  ```

- **Line 897** (placeholder): `"Enter reason for pausing this plan..."`
  ```
  placeholder="Enter reason for pausing this plan..."
  ```

### packages/ui/src/components/features/Merchants/components/MerchantPlanDialog.tsx

- **Line 209** (placeholder): `"Choose a plan..."`
  ```
  <SelectValue placeholder="Choose a plan..." />
  ```

- **Line 209** (placeholder): `"Choose a plan..."`
  ```
  <SelectValue placeholder="Choose a plan..." />
  ```

- **Line 245** (placeholder): `"Choose billing cycle..."`
  ```
  <SelectValue placeholder="Choose billing cycle..." />
  ```

- **Line 245** (placeholder): `"Choose billing cycle..."`
  ```
  <SelectValue placeholder="Choose billing cycle..." />
  ```

- **Line 331** (ui): `"You Save:"`
  ```
  <span className="text-sm">You Save:</span>
  ```

- **Line 452** (ui): `"Reason for Change (Optional)"`
  ```
  <Label htmlFor="reason">Reason for Change (Optional)</Label>
  ```

- **Line 457** (placeholder): `"Enter reason for plan change..."`
  ```
  placeholder="Enter reason for plan change..."
  ```

- **Line 457** (placeholder): `"Enter reason for plan change..."`
  ```
  placeholder="Enter reason for plan change..."
  ```

### packages/ui/src/components/features/Merchants/components/MerchantFilters.tsx

- **Line 78** (ui): `"All Status"`
  ```
  <SelectItem value="all">All Status</SelectItem>
  ```

- **Line 92** (ui): `"All Plans"`
  ```
  <SelectItem value="all">All Plans</SelectItem>
  ```

### packages/ui/src/components/features/Merchants/components/MerchantListHeader.tsx

- **Line 25** (ui): `"All registered merchants"`
  ```
  <p className="text-xs text-gray-500 dark:text-gray-400">All registered merchants</p>
  ```

- **Line 34** (ui): `"Active Merchants"`
  ```
  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Merchants</p>
  ```

### packages/ui/src/components/features/Merchants/components/MerchantDetail.tsx

- **Line 94** (ui): `"Not provided"`
  ```
  <p className="text-sm text-gray-900 dark:text-white">{data.merchant.phone || 'Not provided'}</p>
  ```

- **Line 98** (ui): `"Not provided"`
  ```
  <p className="text-sm text-gray-900 dark:text-white">{data.merchant.address || 'Not provided'}</p>
  ```

### packages/ui/src/components/features/Dashboard/utils.ts

- **Line 24** (ui): `"This Week"`
  ```
  week: 'This Week',
  ```

- **Line 25** (ui): `"This Month"`
  ```
  month: 'This Month',
  ```

- **Line 26** (ui): `"This Year"`
  ```
  year: 'This Year'
  ```

### packages/ui/src/components/features/Dashboard/components/DashboardFocus.tsx

- **Line 71** (ui): `"No focus items for today"`
  ```
  <p>No focus items for today</p>
  ```

- **Line 72** (ui): `"Great job staying on top of everything!"`
  ```
  <p className="text-sm">Great job staying on top of everything!</p>
  ```

### packages/ui/src/components/features/Dashboard/components/DashboardActions.tsx

- **Line 14** (ui): `"Start a new rental or sale order"`
  ```
  description: 'Start a new rental or sale order',
  ```

- **Line 19** (ui): `"add-product"`
  ```
  id: 'add-product',
  ```

- **Line 20** (ui): `"Add Product"`
  ```
  label: 'Add Product',
  ```

- **Line 21** (ui): `"Add new product to inventory"`
  ```
  description: 'Add new product to inventory',
  ```

- **Line 26** (ui): `"add-customer"`
  ```
  id: 'add-customer',
  ```

- **Line 27** (ui): `"Add Customer"`
  ```
  label: 'Add Customer',
  ```

- **Line 42** (ui): `"Check stock levels and availability"`
  ```
  description: 'Check stock levels and availability',
  ```

### packages/ui/src/components/features/Dashboard/components/DashboardNavigation.tsx

- **Line 12** (ui): `"Order management and tracking"`
  ```
  { id: 'orders', label: 'Orders', description: 'Order management and tracking' },
  ```

- **Line 13** (ui): `"Customer insights and data"`
  ```
  { id: 'customers', label: 'Customers', description: 'Customer insights and data' },
  ```

- **Line 14** (ui): `"Inventory and product analytics"`
  ```
  { id: 'products', label: 'Products', description: 'Inventory and product analytics' },
  ```

- **Line 15** (ui): `"Revenue and expense tracking"`
  ```
  { id: 'financial', label: 'Financial', description: 'Revenue and expense tracking' },
  ```

### packages/ui/src/components/features/Dashboard/components/DashboardStats.tsx

- **Line 16** (ui): `"Total orders this period"`
  ```
  description: 'Total orders this period'
  ```

- **Line 23** (ui): `"Total revenue this period"`
  ```
  description: 'Total revenue this period'
  ```

- **Line 30** (ui): `"Active customers"`
  ```
  description: 'Active customers'
  ```

- **Line 37** (ui): `"Available products"`
  ```
  description: 'Available products'
  ```

- **Line 51** (ui): `"Successfully completed orders"`
  ```
  description: 'Successfully completed orders'
  ```

### packages/ui/src/components/features/Users/components/UserFormValidation.ts

- **Line 51** (ui): `"Phone number must be at least 8 digits"`
  ```
  return 'Phone number must be at least 8 digits';
  ```

- **Line 81** (ui): `"Password must be at least 6 characters"`
  ```
  return 'Password must be at least 6 characters';
  ```

### packages/ui/src/components/features/Users/components/AccountManagementCard.tsx

- **Line 30** (ui): `"Account Management"`
  ```
  <h2 className="text-lg font-medium text-gray-900">Account Management</h2>
  ```

- **Line 37** (ui): `"Account Status"`
  ```
  <h3 className="text-sm font-medium text-gray-900">Account Status</h3>
  ```

- **Line 40** (ui): `"User can currently log in and access the system"`
  ```
  ? 'User can currently log in and access the system'
  ```

- **Line 41** (ui): `"User is currently disabled and cannot access the system"`
  ```
  : 'User is currently disabled and cannot access the system'
  ```

### packages/ui/src/components/features/Users/components/UserPageHeader.tsx

- **Line 19** (ui): `"Manage users in the system"`
  ```
  subtitle = "Manage users in the system",
  ```

- **Line 24** (ui): `"Add User"`
  ```
  addButtonText = "Add User",
  ```

### packages/ui/src/components/features/Users/components/UserFilters.tsx

- **Line 68** (ui): `"All Roles"`
  ```
  <SelectItem value="all">All Roles</SelectItem>
  ```

### packages/ui/src/components/features/Users/components/UserFormFields.tsx

- **Line 161** (placeholder): `"Loading merchants..."`
  ```
  placeholder={loading ? "Loading merchants..." : "Search and select merchant"}
  ```

- **Line 161** (ui): `"Search and select merchant"`
  ```
  placeholder={loading ? "Loading merchants..." : "Search and select merchant"}
  ```

- **Line 224** (ui): `"Search and select outlet"`
  ```
  "Search and select outlet"
  ```

### packages/ui/src/components/features/Users/components/ChangePasswordDialog.tsx

- **Line 145** (placeholder): `"Enter new password"`
  ```
  placeholder="Enter new password"
  ```

- **Line 145** (placeholder): `"Enter new password"`
  ```
  placeholder="Enter new password"
  ```

- **Line 161** (ui): `"Password must be at least 8 characters long"`
  ```
  <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
  ```

### packages/ui/src/components/features/Users/components/UserActions.tsx

- **Line 138** (ui): `"Are you sure you want to deactivate ${userToDeactivate?.name}? This action will prevent them from accessing the system."`
  ```
  description={`Are you sure you want to deactivate ${userToDeactivate?.name}? This action will prevent them from accessing the system.`}
  ```

### packages/ui/src/components/features/Users/Users.tsx

- **Line 78** (ui): `"Manage users in the system"`
  ```
  subtitle = "Manage users in the system",
  ```

- **Line 81** (ui): `"Add User"`
  ```
  addButtonText = "Add User",
  ```

- **Line 119** (ui): `"Add user functionality should be implemented in page"`
  ```
  console.log('Add user functionality should be implemented in page');
  ```

### packages/ui/src/components/features/SystemLogs/components/LogFilters.tsx

- **Line 45** (ui): `"This Week"`
  ```
  { value: 'week', label: 'This Week' },
  ```

- **Line 46** (ui): `"This Month"`
  ```
  { value: 'month', label: 'This Month' }
  ```

- **Line 137** (ui): `"animate-spin"`
  ```
  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
  ```

### packages/ui/src/components/features/OrderDetail/OrderDetail.tsx

- **Line 427** (ui): `"Please wait while settings are being saved"`
  ```
  toastInfo('Saving...', 'Please wait while settings are being saved');
  ```

### packages/ui/src/components/features/OrderDetail/utils.ts

- **Line 105** (ui): `"Return to customer"`
  ```
  return 'Return to customer';
  ```

- **Line 107** (ui): `"Already returned"`
  ```
  return 'Already returned';
  ```

- **Line 117** (ui): `"Sale Order - What to Collect"`
  ```
  title: 'Sale Order - What to Collect',
  ```

- **Line 118** (ui): `"Collect the full sale amount"`
  ```
  description: 'Collect the full sale amount',
  ```

- **Line 138** (ui): `"Rental Order - What to Collect"`
  ```
  title: 'Rental Order - What to Collect',
  ```

- **Line 140** (ui): `"Collect remaining amount, security deposit, and collateral"`
  ```
  ? 'Collect remaining amount, security deposit, and collateral'
  ```

- **Line 176** (ui): `"Order is already picked up"`
  ```
  description: 'Order is already picked up',
  ```

- **Line 214** (ui): `"Rental Order - What to Return"`
  ```
  title: 'Rental Order - What to Return',
  ```

- **Line 227** (ui): `"Return to customer"`
  ```
  label: 'Return to customer',
  ```

- **Line 237** (ui): `"Already Returned"`
  ```
  title: 'Already Returned',
  ```

### packages/ui/src/components/features/OrderDetail/components/OrderSettings.tsx

- **Line 67** (placeholder): `"Enter material"`
  ```
  placeholder="Enter material"
  ```

- **Line 67** (placeholder): `"Enter material"`
  ```
  placeholder="Enter material"
  ```

- **Line 82** (placeholder): `"Enter order notes"`
  ```
  placeholder="Enter order notes"
  ```

- **Line 82** (placeholder): `"Enter order notes"`
  ```
  placeholder="Enter order notes"
  ```

- **Line 100** (ui): `"Not specified"`
  ```
  <span className="text-sm font-medium">{settingsForm.material || 'Not specified'}</span>
  ```

- **Line 123** (ui): `"Settings are only available for rental orders."`
  ```
  <p>Settings are only available for rental orders.</p>
  ```

### packages/ui/src/components/features/OrderDetail/components/OrderHeader.tsx

- **Line 71** (ui): `"RENT orders can only be edited when status is RESERVED"`
  ```
  ? 'RENT orders can only be edited when status is RESERVED'
  ```

- **Line 72** (ui): `"SALE orders can only be edited when status is COMPLETED"`
  ```
  : 'SALE orders can only be edited when status is COMPLETED'
  ```

### packages/ui/src/components/features/OrderDetail/components/OrderActions.tsx

- **Line 130** (ui): `"Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone."`
  ```
  description={`Are you sure you want to cancel order #${order.orderNumber}? This action cannot be undone.`}
  ```

### packages/ui/src/components/features/OrderDetail/components/CollectionReturnModal.tsx

- **Line 122** (ui): `"Return to Customer"`
  ```
  {isCollectionMode ? 'Collect from Customer' : 'Return to Customer'}
  ```

### packages/ui/src/components/features/OrderDetail/components/OrderSettingsCard.tsx

- **Line 135** (placeholder): `"Select collateral type"`
  ```
  <SelectValue placeholder="Select collateral type" />
  ```

- **Line 135** (placeholder): `"Select collateral type"`
  ```
  <SelectValue placeholder="Select collateral type" />
  ```

- **Line 159** (placeholder): `"Enter collateral details"`
  ```
  placeholder="Enter collateral details"
  ```

- **Line 159** (placeholder): `"Enter collateral details"`
  ```
  placeholder="Enter collateral details"
  ```

- **Line 175** (placeholder): `"Enter order notes"`
  ```
  placeholder="Enter order notes"
  ```

- **Line 175** (placeholder): `"Enter order notes"`
  ```
  placeholder="Enter order notes"
  ```

- **Line 224** (ui): `"Not specified"`
  ```
  ? (settingsForm.collateralType || 'Not specified')
  ```

### packages/ui/src/components/features/OrderDetail/components/NotesSection.tsx

- **Line 39** (ui): `"No notes or additional information available"`
  ```
  <p className="text-sm">No notes or additional information available</p>
  ```

### packages/ui/src/components/features/OrderDetail/components/OrderActionsSection.tsx

- **Line 80** (ui): `"RENT orders can only be edited when status is RESERVED"`
  ```
  ? 'RENT orders can only be edited when status is RESERVED'
  ```

- **Line 81** (ui): `"SALE orders can only be edited when status is COMPLETED"`
  ```
  : 'SALE orders can only be edited when status is COMPLETED'
  ```

### packages/ui/src/components/features/Maintenance/components/MaintenanceTaskCard.tsx

- **Line 147** (ui): `"Affected Services:"`
  ```
  <p className="text-xs text-text-tertiary mb-1">Affected Services:</p>
  ```

### packages/ui/src/components/features/Maintenance/components/MaintenanceWindowCard.tsx

- **Line 94** (ui): `"Affected Services:"`
  ```
  <p className="text-xs text-text-tertiary mb-1">Affected Services:</p>
  ```

- **Line 105** (ui): `"Notifications:"`
  ```
  <p className="text-xs text-text-tertiary mb-1">Notifications:</p>
  ```

### packages/ui/src/components/features/Orders/RentalPeriodSelector.tsx

- **Line 188** (placeholder): `"Select pickup and return dates"`
  ```
  placeholder="Select pickup and return dates"
  ```

- **Line 188** (placeholder): `"Select pickup and return dates"`
  ```
  placeholder="Select pickup and return dates"
  ```

- **Line 255** (placeholder): `"Select rental date"`
  ```
  placeholder="Select rental date"
  ```

- **Line 255** (placeholder): `"Select rental date"`
  ```
  placeholder="Select rental date"
  ```

### packages/ui/src/components/features/Orders/components/OrderStats.tsx

- **Line 97** (ui): `"Average Order Value"`
  ```
  <span className="text-sm text-gray-600 dark:text-gray-400">Average Order Value</span>
  ```

- **Line 129** (ui): `"Active Rentals"`
  ```
  <span className="text-sm text-gray-600 dark:text-gray-400">Active Rentals</span>
  ```

### packages/ui/src/components/features/Orders/components/OrderActions.tsx

- **Line 14** (ui): `"Start a new rental or sale order"`
  ```
  description: 'Start a new rental or sale order',
  ```

### packages/ui/src/components/features/Orders/components/OrderDateRangeFilter.tsx

- **Line 94** (ui): `"Annual view"`
  ```
  description: 'Annual view'
  ```

- **Line 98** (ui): `"All time"`
  ```
  label: 'All time',
  ```

- **Line 100** (ui): `"May be slow with large datasets"`
  ```
  description: 'May be slow with large datasets'
  ```

- **Line 171** (ui): `"All time"`
  ```
  <span>All time</span>
  ```

### packages/ui/src/components/features/Orders/components/OrderFilters.tsx

- **Line 280** (ui): `"All Outlets"`
  ```
  ? (userRole === 'ADMIN' ? 'Select merchant first' : 'All Outlets')
  ```

### packages/ui/src/components/features/Orders/components/OrderQuickFilters.tsx

- **Line 101** (ui): `"This Week"`
  ```
  label: 'This Week',
  ```

- **Line 105** (ui): `"Orders from this week"`
  ```
  description: 'Orders from this week'
  ```

- **Line 117** (ui): `"This Quarter"`
  ```
  label: 'This Quarter',
  ```

### packages/ui/src/components/features/Categories/components/CategoryActions.tsx

- **Line 36** (ui): `"add-category"`
  ```
  id: 'add-category',
  ```

- **Line 37** (ui): `"Add Category"`
  ```
  label: 'Add Category',
  ```

### packages/ui/src/components/features/Categories/components/CategoriesLoading.tsx

- **Line 29** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### packages/ui/src/components/features/Categories/components/CategoryHeader.tsx

- **Line 29** (ui): `"Add Category"`
  ```
  <span>Add Category</span>
  ```

### packages/ui/src/components/charts/IncomeChart.tsx

- **Line 45** (ui): `"Actual Revenue"`
  ```
  actualLabel = "Actual Revenue",
  ```

### packages/ui/src/components/charts/ColorfulList.tsx

- **Line 108** (ui): `"absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-500"`
  ```
  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-500"></div>
  ```

### packages/ui/src/components/examples/ErrorHandlingUsage.tsx

- **Line 32** (ui): `"Unauthorized access - please log in again"`
  ```
  message: 'Unauthorized access - please log in again'
  ```

- **Line 40** (ui): `"Insufficient permissions to perform this action"`
  ```
  message: 'Insufficient permissions to perform this action'
  ```

- **Line 48** (ui): `"Your subscription has expired or is insufficient for this action"`
  ```
  message: 'Your subscription has expired or is insufficient for this action',
  ```

- **Line 158** (ui): `"Uses the same toast system as the rest of the app"`
  ```
  <li>• <strong>Consistent styling:</strong> Uses the same toast system as the rest of the app</li>
  ```

### apps/admin/app/audit-logs/page.tsx

- **Line 242** (placeholder): `"All actions"`
  ```
  <SelectValue placeholder="All actions" />
  ```

- **Line 242** (placeholder): `"All actions"`
  ```
  <SelectValue placeholder="All actions" />
  ```

- **Line 245** (ui): `"All actions"`
  ```
  <SelectItem value="all">All actions</SelectItem>
  ```

- **Line 263** (placeholder): `"All entities"`
  ```
  <SelectValue placeholder="All entities" />
  ```

- **Line 263** (placeholder): `"All entities"`
  ```
  <SelectValue placeholder="All entities" />
  ```

- **Line 266** (ui): `"All entities"`
  ```
  <SelectItem value="all">All entities</SelectItem>
  ```

- **Line 285** (placeholder): `"All severities"`
  ```
  <SelectValue placeholder="All severities" />
  ```

- **Line 285** (placeholder): `"All severities"`
  ```
  <SelectValue placeholder="All severities" />
  ```

- **Line 288** (ui): `"All severities"`
  ```
  <SelectItem value="all">All severities</SelectItem>
  ```

- **Line 304** (placeholder): `"All categories"`
  ```
  <SelectValue placeholder="All categories" />
  ```

- **Line 304** (placeholder): `"All categories"`
  ```
  <SelectValue placeholder="All categories" />
  ```

- **Line 307** (ui): `"All categories"`
  ```
  <SelectItem value="all">All categories</SelectItem>
  ```

- **Line 338** (placeholder): `"Enter entity ID"`
  ```
  placeholder="Enter entity ID"
  ```

- **Line 338** (placeholder): `"Enter entity ID"`
  ```
  placeholder="Enter entity ID"
  ```

- **Line 347** (placeholder): `"Enter user ID"`
  ```
  placeholder="Enter user ID"
  ```

- **Line 347** (placeholder): `"Enter user ID"`
  ```
  placeholder="Enter user ID"
  ```

- **Line 411** (ui): `"Please try again later."`
  ```
  toastError('Failed to load audit logs', result.message || 'Please try again later.');
  ```

- **Line 478** (ui): `"Audit Logs"`
  ```
  <h1 className="text-2xl font-bold text-text-primary mb-2">Audit Logs</h1>
  ```

- **Line 519** (ui): `"animate-spin"`
  ```
  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
  ```

- **Line 554** (ui): `"audit logs"`
  ```
  itemName="audit logs"
  ```

- **Line 632** (ui): `"Audit Log Details"`
  ```
  <CardTitle>Audit Log Details</CardTitle>
  ```

### apps/admin/app/payments/page.tsx

- **Line 136** (ui): `"Downloading receipt for payment:"`
  ```
  console.log('Downloading receipt for payment:', payment.id);
  ```

- **Line 207** (ui): `"Track platform revenue, payments, and financial metrics"`
  ```
  <PageTitle subtitle="Track platform revenue, payments, and financial metrics">
  ```

- **Line 298** (placeholder): `"Search by merchant, invoice, or transaction ID..."`
  ```
  placeholder="Search by merchant, invoice, or transaction ID..."
  ```

- **Line 298** (placeholder): `"Search by merchant, invoice, or transaction ID..."`
  ```
  placeholder="Search by merchant, invoice, or transaction ID..."
  ```

- **Line 313** (ui): `"All Status"`
  ```
  <option value="all">All Status</option>
  ```

- **Line 325** (ui): `"All Time"`
  ```
  <option value="all">All Time</option>
  ```

- **Line 327** (ui): `"This Month"`
  ```
  <option value="this_month">This Month</option>
  ```

- **Line 328** (ui): `"This Year"`
  ```
  <option value="this_year">This Year</option>
  ```

### apps/admin/app/plans/page.tsx

- **Line 277** (ui): `"Create and manage subscription plans for merchants"`
  ```
  <PageTitle subtitle="Create and manage subscription plans for merchants">
  ```

- **Line 307** (ui): `"All Status"`
  ```
  <SelectItem value="all">All Status</SelectItem>
  ```

- **Line 396** (ui): `"Are you sure you want to delete plan "${deletingPlan?.name}"? This action cannot be undone."`
  ```
  description={`Are you sure you want to delete plan "${deletingPlan?.name}"? This action cannot be undone.`}
  ```

### apps/admin/app/plan-variants/page.tsx

- **Line 204** (ui): `"Applied ${discount}% discount to variants"`
  ```
  toastSuccess(`Applied ${discount}% discount to variants`);
  ```

- **Line 284** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

- **Line 299** (ui): `"Manage plan variants with different pricing and durations"`
  ```
  <PageTitle subtitle="Manage plan variants with different pricing and durations">
  ```

- **Line 362** (ui): `"All Plans"`
  ```
  <SelectItem value="all">All Plans</SelectItem>
  ```

- **Line 376** (ui): `"All Status"`
  ```
  <SelectItem value="all">All Status</SelectItem>
  ```

- **Line 412** (ui): `"Active Plan Variants"`
  ```
  {activeTab === 'active' ? 'Active Plan Variants' : 'Deleted Plan Variants'} ({activeTab === 'active' ? sortedVariants.length : deletedVariants.length})
  ```

- **Line 423** (ui): `"Try adjusting your filters to see more results."`
  ```
  ? 'Try adjusting your filters to see more results.'
  ```

- **Line 424** (ui): `"Get started by creating your first plan variant"`
  ```
  : 'Get started by creating your first plan variant'
  ```

- **Line 561** (ui): `"Recycle bin is empty"`
  ```
  <h3 className="text-lg font-medium text-text-primary mb-2">Recycle bin is empty</h3>
  ```

- **Line 720** (ui): `"Apply Bulk Discount"`
  ```
  <DialogTitle>Apply Bulk Discount</DialogTitle>
  ```

### apps/admin/app/subscriptions/[id]/edit/page.tsx

- **Line 94** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
  ```

- **Line 103** (ui): `"The subscription you're trying to edit doesn't exist."`
  ```
  <p className="text-gray-600 mt-2">The subscription you're trying to edit doesn't exist.</p>
  ```

### apps/admin/app/subscriptions/[id]/preview/page.tsx

- **Line 216** (ui): `"animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"`
  ```
  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
  ```

- **Line 228** (ui): `"The subscription you're looking for doesn't exist."`
  ```
  <p className="text-gray-600 mb-4">The subscription you're looking for doesn't exist.</p>
  ```

- **Line 462** (ui): `"Activity log coming in Phase 2..."`
  ```
  <p className="font-medium">Activity log coming in Phase 2...</p>
  ```

- **Line 463** (ui): `"Track all changes, upgrades, and admin actions"`
  ```
  <p className="text-sm mt-2">Track all changes, upgrades, and admin actions</p>
  ```

### apps/admin/app/subscriptions/[id]/page-enhanced.tsx

- **Line 214** (ui): `"animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"`
  ```
  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
  ```

- **Line 226** (ui): `"The subscription you're looking for doesn't exist."`
  ```
  <p className="text-gray-600 mb-4">The subscription you're looking for doesn't exist.</p>
  ```

### apps/admin/app/subscriptions/[id]/page.tsx

- **Line 165** (ui): `"Admin suspended subscription"`
  ```
  reason: 'Admin suspended subscription'
  ```

- **Line 245** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
  ```

- **Line 254** (ui): `"The subscription you're looking for doesn't exist."`
  ```
  <p className="text-gray-600 mt-2">The subscription you're looking for doesn't exist.</p>
  ```

- **Line 347** (ui): `"This subscription expired on ${formatDate(subscription.currentPeriodEnd!)}"`
  ```
  ? `This subscription expired on ${formatDate(subscription.currentPeriodEnd!)}`
  ```

- **Line 348** (ui): `"This subscription expires on ${formatDate(subscription.currentPeriodEnd!)}"`
  ```
  : `This subscription expires on ${formatDate(subscription.currentPeriodEnd!)}`
  ```

- **Line 413** (ui): `"Auto Renew"`
  ```
  <Label className="text-sm font-medium text-gray-600">Auto Renew</Label>
  ```

- **Line 633** (placeholder): `"Optional description about this extension..."`
  ```
  placeholder="Optional description about this extension..."
  ```

- **Line 633** (placeholder): `"Optional description about this extension..."`
  ```
  placeholder="Optional description about this extension..."
  ```

- **Line 663** (ui): `"Are you sure you want to suspend this subscription for ${subscription?.merchant?.name || 'this merchant'}? The subscription will be paused and billing will stop immediately. You can reactivate it later if needed."`
  ```
  `Are you sure you want to suspend this subscription for ${subscription?.merchant?.name || 'this merchant'}? The subscription will be paused and billing will stop immediately. You can reactivate it later if needed.` :
  ```

- **Line 665** (ui): `"Are you sure you want to cancel this subscription for ${subscription?.merchant?.name || 'this merchant'}? This will stop billing and the subscription will end at the current period. This action cannot be undone."`
  ```
  `Are you sure you want to cancel this subscription for ${subscription?.merchant?.name || 'this merchant'}? This will stop billing and the subscription will end at the current period. This action cannot be undone.` :
  ```

- **Line 666** (ui): `"Are you sure you want to permanently delete this subscription for ${subscription?.merchant?.name || 'this merchant'}? This action cannot be undone and will permanently remove all subscription data."`
  ```
  `Are you sure you want to permanently delete this subscription for ${subscription?.merchant?.name || 'this merchant'}? This action cannot be undone and will permanently remove all subscription data.`
  ```

### apps/admin/app/subscriptions/page.tsx

- **Line 170** (ui): `"Updating subscription with data:"`
  ```
  console.log('Updating subscription with data:', editData);
  ```

- **Line 349** (ui): `"Manage merchant subscriptions with modern pricing tiers (Monthly, Quarterly, Yearly)"`
  ```
  <PageTitle subtitle="Manage merchant subscriptions with modern pricing tiers (Monthly, Quarterly, Yearly)">
  ```

- **Line 394** (ui): `"Active Subscriptions"`
  ```
  <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
  ```

- **Line 459** (ui): `"All Plans"`
  ```
  <option value="">All Plans</option>
  ```

- **Line 536** (ui): `"Are you sure you want to cancel this subscription for ${confirmationDialog.subscription?.merchant?.name || 'this merchant'}? This action cannot be undone and will stop billing at the current period."`
  ```
  `Are you sure you want to cancel this subscription for ${confirmationDialog.subscription?.merchant?.name || 'this merchant'}? This action cannot be undone and will stop billing at the current period.` :
  ```

- **Line 537** (ui): `"Are you sure you want to change the subscription plan for ${confirmationDialog.subscription?.merchant?.name || 'this merchant'}? This will update the billing and may affect the subscription amount."`
  ```
  `Are you sure you want to change the subscription plan for ${confirmationDialog.subscription?.merchant?.name || 'this merchant'}? This will update the billing and may affect the subscription amount.`
  ```

- **Line 549** (ui): `"Enter reason for cancelling this subscription..."`
  ```
  'Enter reason for cancelling this subscription...' :
  ```

- **Line 550** (ui): `"Enter reason for changing this subscription plan..."`
  ```
  'Enter reason for changing this subscription plan...'
  ```

### apps/admin/app/subscriptions/create/page.tsx

- **Line 81** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
  ```

### apps/admin/app/merchants/[id]/products/[productId]/orders/page.tsx

- **Line 158** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary"></div>
  ```

- **Line 212** (ui): `"Orders for ${product?.name || 'Product'}"`
  ```
  <PageTitle subtitle={`Orders for ${product?.name || 'Product'}`}>
  ```

- **Line 264** (ui): `"This product hasn"`
  ```
  description="This product hasn't been ordered yet."
  ```

### apps/admin/app/merchants/[id]/products/page.tsx

- **Line 235** (ui): `"Manage products for ${merchantName}"`
  ```
  subtitle={`Manage products for ${merchantName}`}
  ```

- **Line 238** (ui): `"Add Product"`
  ```
  addButtonText="Add Product"
  ```

### apps/admin/app/merchants/[id]/edit/page.tsx

- **Line 216** (placeholder): `"Enter business name"`
  ```
  placeholder="Enter business name"
  ```

- **Line 216** (placeholder): `"Enter business name"`
  ```
  placeholder="Enter business name"
  ```

- **Line 226** (placeholder): `"Enter business email"`
  ```
  placeholder="Enter business email"
  ```

- **Line 226** (placeholder): `"Enter business email"`
  ```
  placeholder="Enter business email"
  ```

- **Line 235** (placeholder): `"Enter business phone"`
  ```
  placeholder="Enter business phone"
  ```

- **Line 235** (placeholder): `"Enter business phone"`
  ```
  placeholder="Enter business phone"
  ```

- **Line 244** (placeholder): `"Enter business type"`
  ```
  placeholder="Enter business type"
  ```

- **Line 244** (placeholder): `"Enter business type"`
  ```
  placeholder="Enter business type"
  ```

- **Line 253** (placeholder): `"Enter tax ID"`
  ```
  placeholder="Enter tax ID"
  ```

- **Line 253** (placeholder): `"Enter tax ID"`
  ```
  placeholder="Enter tax ID"
  ```

- **Line 262** (placeholder): `"Enter website URL"`
  ```
  placeholder="Enter website URL"
  ```

- **Line 262** (placeholder): `"Enter website URL"`
  ```
  placeholder="Enter website URL"
  ```

- **Line 271** (placeholder): `"Enter business address"`
  ```
  placeholder="Enter business address"
  ```

- **Line 271** (placeholder): `"Enter business address"`
  ```
  placeholder="Enter business address"
  ```

- **Line 280** (placeholder): `"Enter city"`
  ```
  placeholder="Enter city"
  ```

- **Line 280** (placeholder): `"Enter city"`
  ```
  placeholder="Enter city"
  ```

- **Line 289** (placeholder): `"Enter state"`
  ```
  placeholder="Enter state"
  ```

- **Line 289** (placeholder): `"Enter state"`
  ```
  placeholder="Enter state"
  ```

- **Line 298** (placeholder): `"Enter zip code"`
  ```
  placeholder="Enter zip code"
  ```

- **Line 298** (placeholder): `"Enter zip code"`
  ```
  placeholder="Enter zip code"
  ```

- **Line 307** (placeholder): `"Enter country"`
  ```
  placeholder="Enter country"
  ```

- **Line 307** (placeholder): `"Enter country"`
  ```
  placeholder="Enter country"
  ```

- **Line 316** (placeholder): `"Enter description"`
  ```
  placeholder="Enter description"
  ```

- **Line 316** (placeholder): `"Enter description"`
  ```
  placeholder="Enter description"
  ```

### apps/admin/app/merchants/[id]/users/[userId]/page.tsx

- **Line 331** (ui): `"Are you sure you want to deactivate "${userDetails.user.name}"? This will prevent the user from logging in and accessing the system."`
  ```
  description={`Are you sure you want to deactivate "${userDetails.user.name}"? This will prevent the user from logging in and accessing the system.`}
  ```

- **Line 342** (ui): `"Are you sure you want to deactivate "${userDetails.user.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator."`
  ```
  description={`Are you sure you want to deactivate "${userDetails.user.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator.`}
  ```

### apps/admin/app/merchants/[id]/orders/[orderId]/page.tsx

- **Line 140** (ui): `"Order status updated to ${newStatus}"`
  ```
  toastSuccess(`Order status updated to ${newStatus}`);
  ```

- **Line 234** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### apps/admin/app/merchants/[id]/page.tsx

- **Line 254** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### apps/admin/app/merchants/page.tsx

- **Line 142** (ui): `"Change plan for merchant:"`
  ```
  console.log('Change plan for merchant:', merchantId);
  ```

- **Line 210** (ui): `"Manage all merchants across the platform"`
  ```
  <PageTitle subtitle="Manage all merchants across the platform">
  ```

### apps/admin/app/dashboard/page.tsx

- **Line 727** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

- **Line 859** (ui): `"Active Subscriptions"`
  ```
  <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
  ```

- **Line 875** (ui): `"In trial period"`
  ```
  <p className="text-xs text-gray-500">In trial period</p>
  ```

### apps/admin/app/system/audit-logs/page.tsx

- **Line 330** (placeholder): `"All actions"`
  ```
  <SelectValue placeholder="All actions" />
  ```

- **Line 330** (placeholder): `"All actions"`
  ```
  <SelectValue placeholder="All actions" />
  ```

- **Line 333** (ui): `"All actions"`
  ```
  <SelectItem value="all">All actions</SelectItem>
  ```

- **Line 351** (placeholder): `"All severities"`
  ```
  <SelectValue placeholder="All severities" />
  ```

- **Line 351** (placeholder): `"All severities"`
  ```
  <SelectValue placeholder="All severities" />
  ```

- **Line 354** (ui): `"All severities"`
  ```
  <SelectItem value="all">All severities</SelectItem>
  ```

- **Line 370** (placeholder): `"All categories"`
  ```
  <SelectValue placeholder="All categories" />
  ```

- **Line 370** (placeholder): `"All categories"`
  ```
  <SelectValue placeholder="All categories" />
  ```

- **Line 373** (ui): `"All categories"`
  ```
  <SelectItem value="all">All categories</SelectItem>
  ```

- **Line 399** (placeholder): `"Enter entity ID"`
  ```
  placeholder="Enter entity ID"
  ```

- **Line 399** (placeholder): `"Enter entity ID"`
  ```
  placeholder="Enter entity ID"
  ```

- **Line 408** (placeholder): `"Enter user ID"`
  ```
  placeholder="Enter user ID"
  ```

- **Line 408** (placeholder): `"Enter user ID"`
  ```
  placeholder="Enter user ID"
  ```

- **Line 481** (ui): `"Please try again later."`
  ```
  toastError('Failed to load audit logs', result.message || 'Please try again later.');
  ```

- **Line 549** (ui): `"Track all system changes, user actions, and security events across the platform"`
  ```
  <PageTitle subtitle="Track all system changes, user actions, and security events across the platform">
  ```

- **Line 562** (ui): `"animate-spin"`
  ```
  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
  ```

- **Line 598** (ui): `"Audit Logs"`
  ```
  <span>Audit Logs</span>
  ```

- **Line 642** (ui): `"audit logs"`
  ```
  itemName="audit logs"
  ```

### apps/admin/app/system/integrity/page.tsx

- **Line 162** (ui): `"audit_log_completeness"`
  ```
  case 'audit_log_completeness':
  ```

- **Line 185** (ui): `"Monitor data consistency and relationship integrity"`
  ```
  <PageTitle subtitle="Monitor data consistency and relationship integrity">
  ```

- **Line 198** (ui): `"animate-spin"`
  ```
  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
  ```

- **Line 302** (ui): `"Products with Negative Stock:"`
  ```
  <p className="font-medium">Products with Negative Stock:</p>
  ```

- **Line 314** (ui): `"audit_log_completeness"`
  ```
  {check.name === 'audit_log_completeness' && check.details && (
  ```

### apps/admin/app/system/backup/page.tsx

- **Line 192** (ui): `"Manage database backups and restore operations"`
  ```
  <PageTitle subtitle="Manage database backups and restore operations">
  ```

- **Line 268** (ui): `"animate-spin"`
  ```
  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
  ```

- **Line 343** (ui): `"animate-spin"`
  ```
  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
  ```

- **Line 369** (ui): `"Not scheduled"`
  ```
  Next run: {schedule.nextRun ? formatDate(schedule.nextRun) : 'Not scheduled'}
  ```

### apps/admin/app/components/AdminLayout.tsx

- **Line 29** (ui): `"animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"`
  ```
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
  ```

### apps/admin/app/components/AdminNavigation.tsx

- **Line 188** (ui): `"absolute right-0 mt-2 w-48 bg-bg-card rounded-md shadow-lg py-1 z-50"`
  ```
  <div className="absolute right-0 mt-2 w-48 bg-bg-card rounded-md shadow-lg py-1 z-50">
  ```

### apps/admin/app/components/PlanVariantForm.tsx

- **Line 159** (placeholder): `"Select a plan"`
  ```
  <SelectValue placeholder="Select a plan" />
  ```

- **Line 159** (placeholder): `"Select a plan"`
  ```
  <SelectValue placeholder="Select a plan" />
  ```

- **Line 182** (placeholder): `"Select period"`
  ```
  <SelectValue placeholder="Select period" />
  ```

- **Line 182** (placeholder): `"Select period"`
  ```
  <SelectValue placeholder="Select period" />
  ```

- **Line 272** (placeholder): `"Leave empty to use calculated amount"`
  ```
  placeholder="Leave empty to use calculated amount"
  ```

- **Line 272** (placeholder): `"Leave empty to use calculated amount"`
  ```
  placeholder="Leave empty to use calculated amount"
  ```

- **Line 294** (placeholder): `"Select status"`
  ```
  <SelectValue placeholder="Select status" />
  ```

- **Line 294** (placeholder): `"Select status"`
  ```
  <SelectValue placeholder="Select status" />
  ```

- **Line 316** (placeholder): `"Select currency"`
  ```
  <SelectValue placeholder="Select currency" />
  ```

- **Line 316** (placeholder): `"Select currency"`
  ```
  <SelectValue placeholder="Select currency" />
  ```

### apps/admin/app/layout.tsx

- **Line 16** (ui): `"AnyRent - Admin"`
  ```
  title: 'AnyRent - Admin',
  ```

- **Line 17** (ui): `"AnyRent administration system"`
  ```
  description: 'AnyRent administration system',
  ```

- **Line 33** (ui): `"AnyRent Admin"`
  ```
  title: 'AnyRent Admin',
  ```

### apps/admin/app/users/page.tsx

- **Line 240** (ui): `"Manage all users across the platform"`
  ```
  subtitle="Manage all users across the platform"
  ```

- **Line 243** (ui): `"Add User"`
  ```
  addButtonText="Add User"
  ```

### apps/admin/app/orders/[orderId]/page.tsx

- **Line 306** (ui): `"animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"`
  ```
  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
  ```

### apps/admin/app/orders/page.tsx

- **Line 223** (ui): `"You are viewing all ${data.total.toLocaleString()} orders. This may be slow. Consider using a shorter date range for better performance."`
  ```
  `You are viewing all ${data.total.toLocaleString()} orders. This may be slow. Consider using a shorter date range for better performance.`
  ```

- **Line 311** (ui): `"All Orders"`
  ```
  <PageTitle>All Orders</PageTitle>
  ```

- **Line 312** (ui): `"View and manage all orders from all merchants"`
  ```
  <p className="text-sm text-gray-600">View and manage all orders from all merchants</p>
  ```

- **Line 324** (ui): `"All Orders"`
  ```
  <PageTitle>All Orders</PageTitle>
  ```

- **Line 325** (ui): `"View and manage all orders from all merchants"`
  ```
  <p className="text-sm text-gray-600">View and manage all orders from all merchants</p>
  ```

### apps/admin/app/billing-cycles/page.tsx

- **Line 205** (ui): `"All Status"`
  ```
  <option value="all">All Status</option>
  ```

- **Line 263** (ui): `"Are you sure you want to delete the billing cycle "${deletingCycle?.name}"? This action cannot be undone."`
  ```
  description={`Are you sure you want to delete the billing cycle "${deletingCycle?.name}"? This action cannot be undone.`}
  ```

### apps/admin/app/sync/page.tsx

- **Line 174** (ui): `"User not authenticated or still loading, skipping merchants fetch"`
  ```
  console.log('User not authenticated or still loading, skipping merchants fetch');
  ```

- **Line 326** (ui): `"Sync API success: execute completed"`
  ```
  addLog('info', `Sync API success: execute completed`);
  ```

- **Line 660** (ui): `"Preview Success"`
  ```
  toastSuccess('Preview Success', `Found ${customersCount} customers, ${productsCount} products, ${ordersCount} orders`);
  ```

- **Line 677** (ui): `"Are you sure you want to execute sync? This will create records in the database."`
  ```
  if (!confirm('Are you sure you want to execute sync? This will create records in the database.')) {
  ```

- **Line 819** (placeholder): `"Search and select a merchant..."`
  ```
  placeholder="Search and select a merchant..."
  ```

- **Line 819** (placeholder): `"Search and select a merchant..."`
  ```
  placeholder="Search and select a merchant..."
  ```

- **Line 820** (placeholder): `"Search by name or email..."`
  ```
  searchPlaceholder="Search by name or email..."
  ```

- **Line 820** (placeholder): `"Search by name or email..."`
  ```
  searchPlaceholder="Search by name or email..."
  ```

- **Line 876** (placeholder): `"Enter old server admin token"`
  ```
  placeholder="Enter old server admin token"
  ```

- **Line 876** (placeholder): `"Enter old server admin token"`
  ```
  placeholder="Enter old server admin token"
  ```

- **Line 880** (ui): `"Token is not secured (plain text)"`
  ```
  <p className="text-xs text-gray-500 mt-1">Token is not secured (plain text)</p>
  ```

- **Line 890** (ui): `"Select Entities to Sync"`
  ```
  <h3 className="font-medium text-sm">Select Entities to Sync</h3>
  ```

- **Line 972** (ui): `"After Time"`
  ```
  <label className="block text-xs text-gray-600 mb-1">After Time</label>
  ```

- **Line 986** (placeholder): `"After time (optional)"`
  ```
  placeholder="After time (optional)"
  ```

- **Line 986** (placeholder): `"After time (optional)"`
  ```
  placeholder="After time (optional)"
  ```

- **Line 1287** (ui): `"Activity logs will appear here"`
  ```
  <p className="text-xs mt-1">Activity logs will appear here</p>
  ```

### apps/admin/app/page.tsx

- **Line 28** (ui): `"animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"`
  ```
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-primary mx-auto mb-4"></div>
  ```

### apps/admin/app/login/page.tsx

- **Line 95** (ui): `"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"`
  ```
  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
  ```

- **Line 106** (placeholder): `"appearance-none relative block w-full pl-10 pr-3 py-2 border border-border rounded-lg placeholder-text-tertiary text-text-primary bg-bg-card focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent focus:z-10 sm:text-sm"`
  ```
  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-border rounded-lg placeholder-text-tertiary text-text-primary bg-bg-card focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent focus:z-10 sm:text-sm"
  ```

- **Line 107** (placeholder): `"Enter your email"`
  ```
  placeholder="Enter your email"
  ```

- **Line 107** (placeholder): `"Enter your email"`
  ```
  placeholder="Enter your email"
  ```

- **Line 117** (ui): `"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"`
  ```
  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
  ```

- **Line 128** (placeholder): `"appearance-none relative block w-full pl-10 pr-10 py-2 border border-border rounded-lg placeholder-text-tertiary text-text-primary bg-bg-card focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent focus:z-10 sm:text-sm"`
  ```
  className="appearance-none relative block w-full pl-10 pr-10 py-2 border border-border rounded-lg placeholder-text-tertiary text-text-primary bg-bg-card focus:outline-none focus:ring-2 focus:ring-action-primary focus:border-transparent focus:z-10 sm:text-sm"
  ```

- **Line 129** (placeholder): `"Enter your password"`
  ```
  placeholder="Enter your password"
  ```

- **Line 129** (placeholder): `"Enter your password"`
  ```
  placeholder="Enter your password"
  ```

- **Line 136** (ui): `"absolute inset-y-0 right-0 h-full px-3"`
  ```
  className="absolute inset-y-0 right-0 h-full px-3"
  ```

- **Line 154** (ui): `"Signing in..."`
  ```
  {authLoading ? 'Signing in...' : 'Sign in'}
  ```

- **Line 154** (ui): `"Sign in"`
  ```
  {authLoading ? 'Signing in...' : 'Sign in'}
  ```

### apps/client/app/customers/add/page.tsx

- **Line 120** (ui): `"Add New Customer"`
  ```
  title="Add New Customer"
  ```

- **Line 121** (ui): `"Create a new customer account with basic information"`
  ```
  subtitle="Create a new customer account with basic information"
  ```

### apps/client/app/customers/loading.tsx

- **Line 18** (ui): `"Manage customers in the system"`
  ```
  <p className="text-sm text-gray-600">Manage customers in the system</p>
  ```

### apps/client/app/customers/[id]/edit/page.tsx

- **Line 112** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

- **Line 133** (ui): `"The customer you're looking for doesn't exist or has been removed."`
  ```
  <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
  ```

- **Line 152** (ui): `"Update customer information and contact details"`
  ```
  subtitle="Update customer information and contact details"
  ```

- **Line 154** (ui): `"Back to Customer"`
  ```
  backText="Back to Customer"
  ```

### apps/client/app/customers/[id]/orders/page.tsx

- **Line 227** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

- **Line 246** (ui): `"The customer you're looking for doesn't exist or has been removed."`
  ```
  <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
  ```

### apps/client/app/customers/[id]/page.tsx

- **Line 248** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

### apps/client/app/email-verification/page.tsx

- **Line 48** (ui): `"absolute inset-0 pointer-events-none"`
  ```
  <div className="absolute inset-0 pointer-events-none" style={{
  ```

- **Line 55** (ui): `"absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"`
  ```
  <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
  ```

- **Line 56** (ui): `"absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"`
  ```
  <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
  ```

- **Line 57** (ui): `"absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"`
  ```
  <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
  ```

- **Line 58** (ui): `"absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"`
  ```
  <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
  ```

- **Line 61** (ui): `"absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none"`
  ```
  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
  ```

- **Line 65** (ui): `"absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none"`
  ```
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
  ```

- **Line 71** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

### apps/client/app/calendar/page.tsx

- **Line 56** (ui): `"Optimized for calendar display with date grouping"`
  ```
  reason: 'Optimized for calendar display with date grouping'
  ```

- **Line 215** (ui): `"Please log in to view order details"`
  ```
  console.log('Please log in to view order details');
  ```

### apps/client/app/products/add/page.tsx

- **Line 204** (ui): `"Categories help organize your product catalog."`
  ```
  {categories.length === 0 && ' Categories help organize your product catalog.'}
  ```

### apps/client/app/products/loading.tsx

- **Line 12** (ui): `"Manage your product catalog"`
  ```
  <p className="text-sm text-gray-600">Manage your product catalog</p>
  ```

### apps/client/app/privacy/page.tsx

- **Line 30** (ui): `"Business Information: Shop name and address"`
  ```
  <li>{isVi ? 'Thông tin doanh nghiệp: Tên và địa chỉ cửa hàng' : 'Business Information: Shop name and address'}</li>
  ```

- **Line 31** (ui): `"Device and usage logs"`
  ```
  <li>{isVi ? 'Dữ liệu thiết bị & nhật ký sử dụng' : 'Device and usage logs'}</li>
  ```

- **Line 40** (ui): `"Contractual necessity to provide core functions"`
  ```
  <li>{isVi ? 'Cần thiết để thực hiện chức năng dịch vụ' : 'Contractual necessity to provide core functions'}</li>
  ```

- **Line 49** (ui): `"Register and manage your account"`
  ```
  <li>{isVi ? 'Đăng ký và quản lý tài khoản' : 'Register and manage your account'}</li>
  ```

- **Line 50** (ui): `"Support rental orders, products and revenue management"`
  ```
  <li>{isVi ? 'Hỗ trợ quản lý đơn thuê, sản phẩm, doanh thu' : 'Support rental orders, products and revenue management'}</li>
  ```

- **Line 51** (ui): `"Improve product and send relevant notices"`
  ```
  <li>{isVi ? 'Cải thiện sản phẩm và gửi thông báo liên quan' : 'Improve product and send relevant notices'}</li>
  ```

- **Line 59** (ui): `"Until you request deletion or as necessary to fulfill the purposes."`
  ```
  {isVi ? 'Cho đến khi bạn yêu cầu xóa hoặc cần thiết cho mục đích thu thập.' : 'Until you request deletion or as necessary to fulfill the purposes.'}
  ```

- **Line 67** (ui): `"Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu. Không hệ thống nào an toàn tuyệt đối."`
  ```
  {isVi ? 'Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu. Không hệ thống nào an toàn tuyệt đối.' : 'We apply appropriate technical and organizational measures. No system is 100% secure.'}
  ```

- **Line 67** (ui): `"We apply appropriate technical and organizational measures. No system is 100% secure."`
  ```
  {isVi ? 'Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu. Không hệ thống nào an toàn tuyệt đối.' : 'We apply appropriate technical and organizational measures. No system is 100% secure.'}
  ```

- **Line 83** (ui): `"You may access, rectify, delete, object or withdraw consent."`
  ```
  {isVi ? 'Bạn có quyền truy cập, chỉnh sửa, xóa, phản đối hoặc rút lại sự đồng ý.' : 'You may access, rectify, delete, object or withdraw consent.'}
  ```

### apps/client/app/plans/page.tsx

- **Line 194** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
  ```

- **Line 204** (ui): `"Choose Your Plan"`
  ```
  <h1 className="text-4xl font-bold text-gray-900">Choose Your Plan</h1>
  ```

- **Line 220** (ui): `"Your trial ends soon."`
  ```
  {currentSubscription.status === 'trial' && ' Your trial ends soon.'}
  ```

- **Line 249** (ui): `"absolute -top-3 right-4"`
  ```
  <div className="absolute -top-3 right-4">
  ```

- **Line 389** (ui): `"Complete Your Purchase"`
  ```
  <DialogTitle>Complete Your Purchase</DialogTitle>
  ```

### apps/client/app/outlets/loading.tsx

- **Line 12** (ui): `"Manage your business outlets"`
  ```
  <p className="text-sm text-gray-600">Manage your business outlets</p>
  ```

### apps/client/app/terms/page.tsx

- **Line 17** (ui): `"Terms of Service – AnyRent"`
  ```
  {isVi ? 'Điều khoản dịch vụ – AnyRent' : 'Terms of Service – AnyRent'}
  ```

- **Line 37** (ui): `"The app does not process payments or logistics; all transactions are managed by the user."`
  ```
  : 'The app does not process payments or logistics; all transactions are managed by the user.'}
  ```

- **Line 45** (ui): `"Provide accurate and complete information during registration."`
  ```
  <li>{isVi ? 'Cung cấp thông tin chính xác khi đăng ký.' : 'Provide accurate and complete information during registration.'}</li>
  ```

- **Line 46** (ui): `"You are responsible for keeping your account and password secure."`
  ```
  <li>{isVi ? 'Tự chịu trách nhiệm bảo mật tài khoản/mật khẩu.' : 'You are responsible for keeping your account and password secure.'}</li>
  ```

- **Line 47** (ui): `"Accounts may be terminated if misuse is detected."`
  ```
  <li>{isVi ? 'Tài khoản có thể bị chấm dứt nếu vi phạm.' : 'Accounts may be terminated if misuse is detected.'}</li>
  ```

- **Line 55** (ui): `"Non‑exclusive, non‑transferable right to use the app for managing your store."`
  ```
  <li>{isVi ? 'Cấp quyền sử dụng không độc quyền, không chuyển nhượng cho mục đích quản lý cửa hàng.' : 'Non‑exclusive, non‑transferable right to use the app for managing your store.'}</li>
  ```

- **Line 56** (ui): `"Do not copy, modify, distribute, or reverse engineer the app."`
  ```
  <li>{isVi ? 'Không sao chép, chỉnh sửa, phân phối hoặc đảo ngược mã nguồn.' : 'Do not copy, modify, distribute, or reverse engineer the app.'}</li>
  ```

- **Line 65** (ui): `"You may request account deletion at any time."`
  ```
  <li>{isVi ? 'Bạn có thể yêu cầu xóa tài khoản bất kỳ lúc nào.' : 'You may request account deletion at any time.'}</li>
  ```

- **Line 74** (ui): `"Users are responsible for their data and activities."`
  ```
  <li>{isVi ? 'Người dùng chịu trách nhiệm dữ liệu và hoạt động của mình.' : 'Users are responsible for their data and activities.'}</li>
  ```

- **Line 82** (ui): `"We may update these Terms and will notify you when changes occur."`
  ```
  {isVi ? 'Chúng tôi có thể cập nhật Điều khoản và sẽ thông báo khi có thay đổi.' : 'We may update these Terms and will notify you when changes occur.'}
  ```

### apps/client/app/register-merchant/page.tsx

- **Line 21** (ui): `"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"`
  ```
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
  ```

- **Line 22** (ui): `"Redirecting to registration..."`
  ```
  <p className="text-gray-600">Redirecting to registration...</p>
  ```

### apps/client/app/subscription/page.tsx

- **Line 198** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
  ```

- **Line 207** (ui): `"You don't have an active subscription."`
  ```
  <p className="text-gray-600 mt-2">You don't have an active subscription.</p>
  ```

- **Line 226** (ui): `"Manage your subscription and billing"`
  ```
  <p className="text-gray-600">Manage your subscription and billing</p>
  ```

- **Line 265** (ui): `"Your subscription expired on ${formatDate(subscription.currentPeriodEnd!)}. Please renew to continue using the service."`
  ```
  ? `Your subscription expired on ${formatDate(subscription.currentPeriodEnd!)}. Please renew to continue using the service.`
  ```

- **Line 266** (ui): `"Your subscription expires on ${formatDate(subscription.currentPeriodEnd!)}. Consider renewing to avoid service interruption."`
  ```
  : `Your subscription expires on ${formatDate(subscription.currentPeriodEnd!)}. Consider renewing to avoid service interruption.`
  ```

- **Line 355** (ui): `"Auto Renew"`
  ```
  <Label className="text-sm font-medium text-gray-600">Auto Renew</Label>
  ```

- **Line 466** (ui): `"Upgrade Your Plan"`
  ```
  <DialogTitle>Upgrade Your Plan</DialogTitle>
  ```

### apps/client/app/dashboard/page.tsx

- **Line 109** (ui): `"absolute bottom-full right-0 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg z-50 w-80 whitespace-normal break-words leading-relaxed"`
  ```
  return "absolute bottom-full right-0 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg z-50 w-80 whitespace-normal break-words leading-relaxed";
  ```

- **Line 111** (ui): `"absolute bottom-full left-0 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg z-50 w-80 whitespace-normal break-words leading-relaxed"`
  ```
  return "absolute bottom-full left-0 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg z-50 w-80 whitespace-normal break-words leading-relaxed";
  ```

- **Line 119** (ui): `"absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"`
  ```
  return "absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800";
  ```

- **Line 121** (ui): `"absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"`
  ```
  return "absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800";
  ```

- **Line 267** (ui): `"Loaded outlets for product dialog:"`
  ```
  console.log('Loaded outlets for product dialog:', outletsList.length);
  ```

### apps/client/app/components/ServerTopNavigation.tsx

- **Line 191** (ui): `"absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"`
  ```
  className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
  ```

### apps/client/app/register/step-1/page.tsx

- **Line 14** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

### apps/client/app/register/step-2/page.tsx

- **Line 14** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

### apps/client/app/register/page.tsx

- **Line 57** (ui): `"absolute inset-0 pointer-events-none"`
  ```
  <div className="absolute inset-0 pointer-events-none" style={{
  ```

- **Line 64** (ui): `"absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"`
  ```
  <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400 rounded-full opacity-30 blur-2xl pointer-events-none float-1 pulse-glow"></div>
  ```

- **Line 65** (ui): `"absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"`
  ```
  <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-400 rounded-full opacity-40 blur-2xl pointer-events-none float-2 pulse-glow"></div>
  ```

- **Line 66** (ui): `"absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"`
  ```
  <div className="absolute bottom-32 left-20 w-20 h-20 bg-purple-400 rounded-full opacity-35 blur-2xl pointer-events-none float-3 pulse-glow"></div>
  ```

- **Line 67** (ui): `"absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"`
  ```
  <div className="absolute bottom-20 right-32 w-36 h-36 bg-blue-500 rounded-full opacity-30 blur-2xl pointer-events-none float-4 pulse-glow"></div>
  ```

- **Line 70** (ui): `"absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none"`
  ```
  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-200 to-transparent rounded-full opacity-40 blur-3xl pointer-events-none" style={{
  ```

- **Line 74** (ui): `"absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none"`
  ```
  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-35 blur-3xl pointer-events-none" style={{
  ```

- **Line 80** (ui): `"absolute top-4 right-4 z-10"`
  ```
  <div className="absolute top-4 right-4 z-10">
  ```

### apps/client/app/layout.tsx

- **Line 50** (ui): `"AnyRent - Client"`
  ```
  title: 'AnyRent - Client',
  ```

- **Line 51** (ui): `"AnyRent management system for shop owners"`
  ```
  description: 'AnyRent management system for shop owners',
  ```

- **Line 67** (ui): `"AnyRent Client"`
  ```
  title: 'AnyRent Client',
  ```

### apps/client/app/users/add/page.tsx

- **Line 38** (ui): `"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"`
  ```
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
  ```

### apps/client/app/users/loading.tsx

- **Line 12** (ui): `"Manage users in the system"`
  ```
  <p className="text-sm text-gray-600">Manage users in the system</p>
  ```

### apps/client/app/users/[id]/page.tsx

- **Line 258** (ui): `"animate-pulse"`
  ```
  <div className="animate-pulse">
  ```

- **Line 276** (ui): `"The user you're looking for doesn't exist or has been removed."`
  ```
  <p className="text-gray-600 mb-6">The user you're looking for doesn't exist or has been removed.</p>
  ```

- **Line 378** (ui): `"Are you sure you want to deactivate "${userData.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator."`
  ```
  description={`Are you sure you want to deactivate "${userData.name}"? This will prevent the user from logging in and accessing the system. This action can be reversed by an administrator.`}
  ```

### apps/client/app/orders/loading.tsx

- **Line 12** (ui): `"Manage orders and transactions"`
  ```
  <p className="text-sm text-gray-600">Manage orders and transactions</p>
  ```

### apps/client/app/orders/[id]/page.tsx

- **Line 66** (ui): `"Are you sure you want to cancel this order? This action cannot be undone."`
  ```
  if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
  ```

- **Line 281** (ui): `"The order you're looking for could not be found."`
  ```
  <p className="text-gray-600 mb-6">The order you're looking for could not be found.</p>
  ```

### apps/client/app/orders/page.tsx

- **Line 257** (ui): `"You are viewing all ${data.total.toLocaleString()} orders. This may be slow. Consider using a shorter date range for better performance."`
  ```
  `You are viewing all ${data.total.toLocaleString()} orders. This may be slow. Consider using a shorter date range for better performance.`
  ```

### apps/client/app/page.tsx

- **Line 112** (ui): `"absolute top-0 left-0 w-full h-full overflow-hidden -z-10"`
  ```
  <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
  ```

- **Line 169** (ui): `"AnyRent iPhone Splashscreen"`
  ```
  alt="AnyRent iPhone Splashscreen"
  ```

- **Line 365** (ui): `"Active Stores"`
  ```
  <div className="text-text-inverted/70">Active Stores</div>
  ```

- **Line 407** (ui): `"AnyRent has helped me manage my rental business efficiently. The interface is easy to use and features are comprehensive."`
  ```
  "AnyRent has helped me manage my rental business efficiently. The interface is easy to use and features are comprehensive."
  ```

- **Line 427** (ui): `"The order management feature is very convenient. I can track all orders easily and manage my inventory effectively."`
  ```
  "The order management feature is very convenient. I can track all orders easily and manage my inventory effectively."
  ```

- **Line 447** (ui): `"The mobile app is very convenient. I can manage my shop from anywhere and the interface is intuitive."`
  ```
  "The mobile app is very convenient. I can manage my shop from anywhere and the interface is intuitive."
  ```

- **Line 830** (ui): `"No plans available at the moment."`
  ```
  <p className="text-text-secondary">No plans available at the moment.</p>
  ```

- **Line 838** (ui): `"allPlansInclude"`
  ```
  {tPricing('allPlansInclude')}
  ```

### apps/client/app/categories/loading.tsx

- **Line 12** (ui): `"Manage your product categories"`
  ```
  <p className="text-sm text-gray-600">Manage your product categories</p>
  ```

### apps/client/app/pricing/page.tsx

- **Line 78** (ui): `"Share product links via WhatsApp, email, or social media"`
  ```
  <span>Share product links via WhatsApp, email, or social media</span>
  ```

- **Line 82** (ui): `"Customers can view prices and availability instantly"`
  ```
  <span>Customers can view prices and availability instantly</span>
  ```

- **Line 90** (ui): `"Perfect for marketing and customer outreach"`
  ```
  <span>Perfect for marketing and customer outreach</span>
  ```

## 3. Hardcoded Messages in API Routes

**Total Found**: 91

### apps/api/app/api/customers/route.ts

- **Line 33**: `"Invalid query"`
  ```
  message: 'Invalid query',
  ```

- **Line 69**: `"Access denied: Cannot view customers from other merchants"`
  ```
  message: 'Access denied: Cannot view customers from other merchants'
  ```

- **Line 153**: `"Invalid payload"`
  ```
  message: 'Invalid payload',
  ```

- **Line 294**: `"Invalid payload"`
  ```
  message: 'Invalid payload',
  ```

### apps/api/app/api/customers/debug/route.ts

- **Line 26**: `"Missing required fields"`
  ```
  message: 'Missing required fields',
  ```

- **Line 40**: `"Validation failed"`
  ```
  message: 'Validation failed',
  ```

### apps/api/app/api/audit-logs/[id]/route.ts

- **Line 47**: `"Audit log retrieved successfully"`
  ```
  message: 'Audit log retrieved successfully'
  ```

### apps/api/app/api/settings/currency/route.ts

- **Line 30**: `"Currency is required"`
  Code: `CURRENCY_REQUIRED`
  ```
  ResponseBuilder.error('CURRENCY_REQUIRED', 'Currency is required'),
  ```

- **Line 37**: `"Invalid currency code. Supported currencies: USD, VND"`
  Code: `INVALID_CURRENCY`
  ```
  ResponseBuilder.error('INVALID_CURRENCY', 'Invalid currency code. Supported currencies: USD, VND'),
  ```

### apps/api/app/api/products/availability/route.ts

- **Line 53**: `"Date cannot be in the past"`
  Code: `INVALID_DATE`
  ```
  ResponseBuilder.error('INVALID_DATE', 'Date cannot be in the past'),
  ```

- **Line 68**: `"Outlet ID is required for merchants"`
  Code: `OUTLET_REQUIRED`
  ```
  ResponseBuilder.error('OUTLET_REQUIRED', 'Outlet ID is required for merchants'),
  ```

- **Line 77**: `"Outlet ID is required for admins"`
  Code: `OUTLET_REQUIRED`
  ```
  ResponseBuilder.error('OUTLET_REQUIRED', 'Outlet ID is required for admins'),
  ```

- **Line 103**: `"Product not found in specified outlet"`
  Code: `PRODUCT_OUTLET_NOT_FOUND`
  ```
  ResponseBuilder.error('PRODUCT_OUTLET_NOT_FOUND', 'Product not found in specified outlet'),
  ```

### apps/api/app/api/products/[id]/availability/route.ts

- **Line 92**: `"Outlet ID is required for merchants and admins"`
  Code: `OUTLET_REQUIRED`
  ```
  ResponseBuilder.error('OUTLET_REQUIRED', 'Outlet ID is required for merchants and admins'),
  ```

- **Line 100**: `"Invalid user role"`
  Code: `INVALID_USER_ROLE`
  ```
  ResponseBuilder.error('INVALID_USER_ROLE', 'Invalid user role'),
  ```

- **Line 108**: `"Invalid outlet ID"`
  Code: `INVALID_OUTLET_ID`
  ```
  ResponseBuilder.error('INVALID_OUTLET_ID', 'Invalid outlet ID'),
  ```

- **Line 149**: `"Product not found in specified outlet"`
  Code: `PRODUCT_OUTLET_NOT_FOUND`
  ```
  ResponseBuilder.error('PRODUCT_OUTLET_NOT_FOUND', 'Product not found in specified outlet'),
  ```

### apps/api/app/api/plans/public/route.ts

- **Line 124**: `"Unknown error"`
  ```
  throw new Error(`Failed to transform plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  ```

### apps/api/app/api/plans/[id]/route.ts

- **Line 54**: `"Failed to fetch plan"`
  ```
  ResponseBuilder.error('FETCH_PLAN_FAILED', error instanceof Error ? error.message : 'Failed to fetch plan'),
  ```

- **Line 110**: `"Failed to update plan"`
  ```
  ResponseBuilder.error('UPDATE_PLAN_FAILED', error instanceof Error ? error.message : 'Failed to update plan'),
  ```

### apps/api/app/api/auth/verify/route.ts

- **Line 30**: `"Token is valid"`
  ```
  message: 'Token is valid'
  ```

### apps/api/app/api/auth/forgot-password/route.ts

- **Line 46**: `"Invalid JSON format in request body"`
  Code: `INVALID_REQUEST`
  ```
  ResponseBuilder.error('INVALID_REQUEST', 'Invalid JSON format in request body'),
  ```

### apps/api/app/api/health/database/route.ts

- **Line 66**: `"Unknown error"`
  ```
  message: error instanceof Error ? error.message : 'Unknown error',
  ```

### apps/api/app/api/outlets/route.ts

- **Line 111**: `"Invalid payload"`
  ```
  message: 'Invalid payload',
  ```

- **Line 372**: `"Cannot delete the default outlet. This is the main outlet created during registration and must remain active."`
  ```
  message: 'Cannot delete the default outlet. This is the main outlet created during registration and must remain active.'
  ```

### apps/api/app/api/merchants/route.ts

- **Line 229**: `"Unknown error"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  ```

### apps/api/app/api/merchants/[id]/route.ts

- **Line 57**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 142**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 192**: `"Cannot delete merchant with active subscription. Please cancel the subscription first."`
  ```
  message: 'Cannot delete merchant with active subscription. Please cancel the subscription first.'
  ```

### apps/api/app/api/system/health/route.ts

- **Line 64**: `"Database connection failed"`
  ```
  error: error instanceof Error ? error.message : 'Database connection failed'
  ```

- **Line 104**: `"API health check failed"`
  ```
  error: error instanceof Error ? error.message : 'API health check failed'
  ```

- **Line 126**: `"External services check failed"`
  ```
  error: error instanceof Error ? error.message : 'External services check failed'
  ```

- **Line 198**: `"System health check failed"`
  ```
  error: error instanceof Error ? error.message : 'System health check failed'
  ```

### apps/api/app/api/system/api-keys/test/route.ts

- **Line 7**: `"API Keys endpoint is working!"`
  ```
  message: 'API Keys endpoint is working!',
  ```

### apps/api/app/api/system/integrity/route.ts

- **Line 121**: `"All orders have valid customer references"`
  ```
  message: 'All orders have valid customer references',
  ```

- **Line 130**: `"Failed to check order-customer integrity"`
  ```
  message: 'Failed to check order-customer integrity',
  ```

- **Line 132**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 160**: `"All order items have valid product references"`
  ```
  message: 'All order items have valid product references',
  ```

- **Line 169**: `"Failed to check order-product integrity"`
  ```
  message: 'Failed to check order-product integrity',
  ```

- **Line 171**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 199**: `"All users have valid outlet assignments"`
  ```
  message: 'All users have valid outlet assignments',
  ```

- **Line 208**: `"Failed to check user-outlet integrity"`
  ```
  message: 'Failed to check user-outlet integrity',
  ```

- **Line 210**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 238**: `"All products have valid stock levels"`
  ```
  message: 'All products have valid stock levels',
  ```

- **Line 264**: `"All products have consistent available stock calculations"`
  ```
  message: 'All products have consistent available stock calculations',
  ```

- **Line 273**: `"Failed to check product stock consistency"`
  ```
  message: 'Failed to check product stock consistency',
  ```

- **Line 275**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 303**: `"All payments have valid order references"`
  ```
  message: 'All payments have valid order references',
  ```

- **Line 312**: `"Failed to check payment-order integrity"`
  ```
  message: 'Failed to check payment-order integrity',
  ```

- **Line 314**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 352**: `"Audit logging appears to be working correctly"`
  ```
  message: 'Audit logging appears to be working correctly',
  ```

- **Line 362**: `"Failed to check audit log completeness"`
  ```
  message: 'Failed to check audit log completeness',
  ```

- **Line 364**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 391**: `"All non-cancelled orders have valid amounts"`
  ```
  message: 'All non-cancelled orders have valid amounts',
  ```

- **Line 400**: `"Failed to check data consistency"`
  ```
  message: 'Failed to check data consistency',
  ```

- **Line 402**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 439**: `"Failed to check for orphaned records"`
  ```
  message: 'Failed to check for orphaned records',
  ```

- **Line 441**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

### apps/api/app/api/mobile/sync/check/route.ts

- **Line 75**: `"User ID is required"`
  ```
  message: 'User ID is required'
  ```

- **Line 109**: `"Sync check failed"`
  ```
  message: 'Sync check failed',
  ```

- **Line 110**: `"Internal server error"`
  ```
  error: apiConfig.logging.level === 'debug' ? error.message : 'Internal server error'
  ```

### apps/api/app/api/mobile/notifications/register-device/route.ts

- **Line 77**: `"Missing required fields: deviceId, pushToken, platform"`
  ```
  message: 'Missing required fields: deviceId, pushToken, platform'
  ```

- **Line 86**: `"Invalid platform. Must be "`
  ```
  message: 'Invalid platform. Must be "ios" or "android"'
  ```

- **Line 114**: `"Device registration failed"`
  ```
  message: 'Device registration failed',
  ```

- **Line 115**: `"Internal server error"`
  ```
  error: apiConfig.logging.level === 'debug' ? error.message : 'Internal server error'
  ```

### apps/api/app/api/users/delete-account/route.ts

- **Line 50**: `"Account deleted successfully"`
  ```
  message: 'Account deleted successfully',
  ```

### apps/api/app/api/users/profile/route.ts

- **Line 157**: `"No valid fields to update"`
  Code: `NO_VALID_FIELDS`
  ```
  ResponseBuilder.error('NO_VALID_FIELDS', 'No valid fields to update'),
  ```

- **Line 241**: `"Unknown error"`
  ```
  message: error instanceof Error ? error.message : 'Unknown error',
  ```

- **Line 246**: `"Failed to update user profile"`
  ```
  ResponseBuilder.error('UPDATE_PROFILE_FAILED', error instanceof Error ? error.message : 'Failed to update user profile'),
  ```

### apps/api/app/api/users/route.ts

- **Line 133**: `"Failed to retrieve users"`
  Code: `RETRIEVE_USERS_FAILED`
  ```
  ResponseBuilder.error('RETRIEVE_USERS_FAILED', 'Failed to retrieve users'),
  ```

- **Line 245**: `"User ID is required in request body"`
  Code: `USER_ID_REQUIRED`
  ```
  ResponseBuilder.error('USER_ID_REQUIRED', 'User ID is required in request body'),
  ```

- **Line 262**: `"Cannot update user outside your scope"`
  Code: `UPDATE_USER_OUT_OF_SCOPE`
  ```
  ResponseBuilder.error('UPDATE_USER_OUT_OF_SCOPE', 'Cannot update user outside your scope'),
  ```

- **Line 281**: `"Failed to update user"`
  Code: `UPDATE_USER_FAILED`
  ```
  ResponseBuilder.error('UPDATE_USER_FAILED', 'Failed to update user'),
  ```

- **Line 301**: `"User ID is required"`
  Code: `USER_ID_REQUIRED`
  ```
  ResponseBuilder.error('USER_ID_REQUIRED', 'User ID is required'),
  ```

- **Line 318**: `"Cannot delete user outside your scope"`
  Code: `DELETE_USER_OUT_OF_SCOPE`
  ```
  ResponseBuilder.error('DELETE_USER_OUT_OF_SCOPE', 'Cannot delete user outside your scope'),
  ```

- **Line 337**: `"Failed to delete user"`
  Code: `DELETE_USER_FAILED`
  ```
  ResponseBuilder.error('DELETE_USER_FAILED', 'Failed to delete user'),
  ```

### apps/api/app/api/users/[id]/route.ts

- **Line 152**: `"You cannot delete your own account. Please contact another administrator."`
  Code: `CANNOT_DELETE_SELF`
  ```
  ResponseBuilder.error('CANNOT_DELETE_SELF', 'You cannot delete your own account. Please contact another administrator.'),
  ```

- **Line 168**: `"Cannot delete the last administrator. Please assign another administrator first."`
  Code: `CANNOT_DELETE_LAST_ADMIN`
  ```
  ResponseBuilder.error('CANNOT_DELETE_LAST_ADMIN', 'Cannot delete the last administrator. Please assign another administrator first.'),
  ```

### apps/api/app/api/users/[id]/change-password/route.ts

- **Line 98**: `"Insufficient permissions to change password for this user"`
  Code: `INSUFFICIENT_PERMISSIONS`
  ```
  ResponseBuilder.error('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to change password for this user'),
  ```

- **Line 124**: `"Failed to change password"`
  Code: `CHANGE_PASSWORD_FAILED`
  ```
  ResponseBuilder.error('CHANGE_PASSWORD_FAILED', 'Failed to change password'),
  ```

### apps/api/app/api/orders/route.ts

- **Line 28**: `"User must be associated with a merchant"`
  Code: `MERCHANT_ASSOCIATION_REQUIRED`
  ```
  ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED', 'User must be associated with a merchant'),
  ```

### apps/api/app/api/billing-cycles/[id]/route.ts

- **Line 32**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

- **Line 65**: `"Unknown error"`
  ```
  details: error instanceof Error ? error.message : 'Unknown error'
  ```

### apps/api/app/api/test-aws/route.ts

- **Line 30**: `"AWS credentials check completed"`
  ```
  message: 'AWS credentials check completed',
  ```

- **Line 40**: `"Unknown error"`
  ```
  ResponseBuilder.error('AWS_S3_TEST_FAILED', error instanceof Error ? error.message : 'Unknown error'),
  ```

### apps/api/app/api/categories/[id]/route.ts

- **Line 256**: `"Cannot delete the default category. This category was created during registration and must remain active."`
  ```
  message: 'Cannot delete the default category. This category was created during registration and must remain active.'
  ```

### apps/api/app/api/upload/image/route.ts

- **Line 207**: `"Image uploaded successfully to AWS S3 staging folder"`
  ```
  message: 'Image uploaded successfully to AWS S3 staging folder'
  ```

- **Line 217**: `"Failed to upload image"`
  ```
  ResponseBuilder.error('UPLOAD_IMAGE_FAILED', error instanceof Error ? error.message : 'Failed to upload image'),
  ```

### apps/api/app/api/upload/cleanup/route.ts

- **Line 55**: `"Unknown error"`
  ```
  ResponseBuilder.error('CLEANUP_FAILED', error instanceof Error ? error.message : 'Unknown error'),
  ```

### apps/api/app/api/analytics/dashboard/route.ts

- **Line 72**: `"No outlets found for merchant"`
  ```
  message: 'No outlets found for merchant'
  ```

### apps/api/app/api/debug/subscription-status/route.ts

- **Line 65**: `"Unknown error"`
  ```
  error: error instanceof Error ? error.message : 'Unknown error'
  ```

## 4. Hardcoded Validation Messages

**Total Found**: 709

### packages/ui/src/components/ui/product-availability-async-display.tsx

- **Line 56**: `"Failed to check availability"`
  ```
  setError('Failed to check availability');
  ```

- **Line 57**: `"Availability check error:"`
  ```
  console.error('Availability check error:', err);
  ```

### packages/ui/src/components/forms/LoginForm.tsx

- **Line 63**: `"Login failed:"`
  ```
  console.error("Login failed:", error);
  ```

### packages/ui/src/components/forms/RegisterForm.tsx

- **Line 208**: `"Registration failed"`
  ```
  throw new Error(result.message || result.error || 'Registration failed');
  ```

### packages/ui/src/components/forms/OrderForm.tsx

- **Line 200**: `"Validation Error"`
  ```
  toastError('Validation Error', 'Please select an outlet');
  ```

- **Line 200**: `"Please select an outlet"`
  ```
  toastError('Validation Error', 'Please select an outlet');
  ```

- **Line 205**: `"Validation Error"`
  ```
  toastError('Validation Error', 'Please add at least one product');
  ```

- **Line 205**: `"Please add at least one product"`
  ```
  toastError('Validation Error', 'Please add at least one product');
  ```

- **Line 210**: `"Validation Error"`
  ```
  toastError('Validation Error', 'Please select a product for all items');
  ```

- **Line 210**: `"Please select a product for all items"`
  ```
  toastError('Validation Error', 'Please select a product for all items');
  ```

### packages/ui/src/components/forms/ResetPasswordForm.tsx

- **Line 66**: `"Password reset failed:"`
  ```
  console.error("Password reset failed:", error);
  ```

### packages/ui/src/components/forms/ForgetPasswordForm.tsx

- **Line 57**: `"Password reset failed:"`
  ```
  console.error("Password reset failed:", error);
  ```

### packages/ui/src/components/forms/CreateOrderForm/CreateOrderForm.tsx

- **Line 197**: `"Error searching products:"`
  ```
  console.error('Error searching products:', error);
  ```

- **Line 283**: `"Availability API failed, falling back to basic stock check"`
  ```
  console.warn('Availability API failed, falling back to basic stock check');
  ```

- **Line 284**: `"API call failed"`
  ```
  throw new Error('API call failed');
  ```

- **Line 287**: `"Error checking availability via API:"`
  ```
  console.error('Error checking availability via API:', error);
  ```

- **Line 317**: `"Fallback availability check also failed:"`
  ```
  console.error('Fallback availability check also failed:', fallbackError);
  ```

- **Line 336**: `"Merchant ID is required to create a customer. Please ensure the form has access to merchant information."`
  ```
  const errorMsg = 'Merchant ID is required to create a customer. Please ensure the form has access to merchant information.';
  ```

- **Line 357**: `"A customer with phone number "${customerData.phone}" already exists (${localDuplicate.firstName} ${localDuplicate.lastName || ''}). Please use a different phone number or search for the existing customer."`
  ```
  const errorMsg = `A customer with phone number "${customerData.phone}" already exists (${localDuplicate.firstName} ${localDuplicate.lastName || ''}). Please use a different phone number or search for the existing customer.`;
  ```

- **Line 375**: `"A customer with phone number "${customerData.phone}" already exists (${existingCustomer.firstName} ${existingCustomer.lastName || ''}). Please use a different phone number or search for the existing customer."`
  ```
  const errorMsg = `A customer with phone number "${customerData.phone}" already exists (${existingCustomer.firstName} ${existingCustomer.lastName || ''}). Please use a different phone number or search for the existing customer.`;
  ```

### packages/ui/src/components/forms/CreateOrderForm/components/CustomerCreationDialog.tsx

- **Line 50**: `"Merchant ID is required to create a customer. Please ensure the form has access to merchant information."`
  ```
  throw new Error('Merchant ID is required to create a customer. Please ensure the form has access to merchant information.');
  ```

### packages/ui/src/components/forms/CreateOrderForm/components/OrderPreviewForm.tsx

- **Line 405**: `"Deposit Required:"`
  ```
  <span className="text-gray-600">Deposit Required:</span>
  ```

### packages/ui/src/components/forms/CreateOrderForm/hooks/useProductSearch.ts

- **Line 55**: `"Error searching products:"`
  ```
  console.error('Error searching products:', error);
  ```

- **Line 80**: `"Error searching products:"`
  ```
  console.error('Error searching products:', error);
  ```

### packages/ui/src/components/forms/CreateOrderForm/hooks/useCreateOrderForm.ts

- **Line 313**: `"Please add at least one product to the order before submitting."`
  ```
  throw new Error('Please add at least one product to the order before submitting.');
  ```

### packages/ui/src/components/forms/CreateOrderForm/hooks/useOrderValidation.ts

- **Line 33**: `"Customer selection is required"`
  ```
  errors.customerId = 'Customer selection is required';
  ```

- **Line 37**: `"Outlet selection is required"`
  ```
  errors.outletId = 'Outlet selection is required';
  ```

- **Line 41**: `"At least one product is required"`
  ```
  errors.orderItems = 'At least one product is required';
  ```

- **Line 46**: `"Pickup date is required for rentals"`
  ```
  errors.pickupPlanAt = 'Pickup date is required for rentals';
  ```

- **Line 49**: `"Return date is required for rentals"`
  ```
  errors.returnPlanAt = 'Return date is required for rentals';
  ```

- **Line 54**: `"Rental must be at least ${BUSINESS.MIN_RENTAL_DAYS} day"`
  ```
  errors.returnPlanAt = `Rental must be at least ${BUSINESS.MIN_RENTAL_DAYS} day`;
  ```

### packages/ui/src/components/forms/CreateOrderForm/hooks/useCustomerSearch.ts

- **Line 47**: `"Error searching customers:"`
  ```
  console.error('Error searching customers:', error);
  ```

### packages/ui/src/components/forms/ProductForm.tsx

- **Line 198**: `"Error parsing durationConfig:"`
  ```
  console.error('Error parsing durationConfig:', e);
  ```

- **Line 319**: `"Product name is required"`
  ```
  newErrors.name = 'Product name is required';
  ```

- **Line 323**: `"Category is required"`
  ```
  newErrors.categoryId = 'Category is required';
  ```

- **Line 327**: `"Rent price is required and must be greater than 0"`
  ```
  newErrors.rentPrice = 'Rent price is required and must be greater than 0';
  ```

- **Line 331**: `"Sale price is required and must be greater than 0"`
  ```
  newErrors.salePrice = 'Sale price is required and must be greater than 0';
  ```

- **Line 335**: `"Deposit is required and cannot be negative"`
  ```
  newErrors.deposit = 'Deposit is required and cannot be negative';
  ```

- **Line 339**: `"Total stock is required and must be greater than 0"`
  ```
  newErrors.totalStock = 'Total stock is required and must be greater than 0';
  ```

- **Line 345**: `"Duration configuration is required for HOURLY and DAILY pricing types"`
  ```
  newErrors.durationConfig = 'Duration configuration is required for HOURLY and DAILY pricing types';
  ```

- **Line 349**: `"Minimum duration is required and must be greater than 0"`
  ```
  newErrors.durationConfig = 'Minimum duration is required and must be greater than 0';
  ```

- **Line 352**: `"Maximum duration is required and must be greater than 0"`
  ```
  newErrors.durationConfig = 'Maximum duration is required and must be greater than 0';
  ```

- **Line 355**: `"Minimum duration must be less than or equal to maximum duration"`
  ```
  newErrors.durationConfig = 'Minimum duration must be less than or equal to maximum duration';
  ```

- **Line 358**: `"Default duration is required and must be greater than 0"`
  ```
  newErrors.durationConfig = 'Default duration is required and must be greater than 0';
  ```

- **Line 361**: `"Default duration must be at least the minimum duration"`
  ```
  newErrors.durationConfig = 'Default duration must be at least the minimum duration';
  ```

- **Line 371**: `"No outlets available. Please contact your administrator to set up outlets."`
  ```
  newErrors.outletStock = 'No outlets available. Please contact your administrator to set up outlets.';
  ```

- **Line 377**: `"Outlet stock is required. Please specify stock levels for at least one outlet."`
  ```
  newErrors.outletStock = 'Outlet stock is required. Please specify stock levels for at least one outlet.';
  ```

- **Line 408**: `"Product name is required"`
  ```
  newErrors.name = 'Product name is required';
  ```

- **Line 412**: `"Category is required"`
  ```
  newErrors.categoryId = 'Category is required';
  ```

- **Line 416**: `"Rent price is required and must be greater than 0"`
  ```
  newErrors.rentPrice = 'Rent price is required and must be greater than 0';
  ```

- **Line 420**: `"Sale price is required and must be greater than 0"`
  ```
  newErrors.salePrice = 'Sale price is required and must be greater than 0';
  ```

- **Line 424**: `"Deposit is required and cannot be negative"`
  ```
  newErrors.deposit = 'Deposit is required and cannot be negative';
  ```

- **Line 428**: `"Total stock is required and must be greater than 0"`
  ```
  newErrors.totalStock = 'Total stock is required and must be greater than 0';
  ```

- **Line 433**: `"Outlet stock is required. Please specify stock levels for at least one outlet."`
  ```
  newErrors.outletStock = 'Outlet stock is required. Please specify stock levels for at least one outlet.';
  ```

- **Line 601**: `"Authentication required. Please log in again."`
  ```
  general: 'Authentication required. Please log in again.'
  ```

- **Line 669**: `"Upload failed:"`
  ```
  console.error('Upload failed:', uploadResult.error);
  ```

- **Line 672**: `"Upload failed"`
  ```
  [fileId]: uploadResult.error || 'Upload failed'
  ```

- **Line 682**: `"Upload error:"`
  ```
  console.error('Upload error:', error);
  ```

- **Line 685**: `"Upload failed"`
  ```
  [fileId]: error instanceof Error ? error.message : 'Upload failed'
  ```

### packages/ui/src/components/forms/CustomerForm.tsx

- **Line 77**: `"First name is required"`
  ```
  newErrors.firstName = 'First name is required';
  ```

- **Line 84**: `"Invalid email format"`
  ```
  newErrors.email = 'Invalid email format';
  ```

- **Line 88**: `"Merchant is required"`
  ```
  newErrors.merchantId = 'Merchant is required';
  ```

### packages/ui/src/components/forms/PlanForm.tsx

- **Line 140**: `"Plan name is required"`
  ```
  newErrors.name = 'Plan name is required';
  ```

- **Line 144**: `"Plan description is required"`
  ```
  newErrors.description = 'Plan description is required';
  ```

- **Line 156**: `"Max outlets must be -1 (unlimited) or positive"`
  ```
  newErrors.maxOutlets = 'Max outlets must be -1 (unlimited) or positive';
  ```

- **Line 160**: `"Max users must be -1 (unlimited) or positive"`
  ```
  newErrors.maxUsers = 'Max users must be -1 (unlimited) or positive';
  ```

- **Line 164**: `"Max products must be -1 (unlimited) or positive"`
  ```
  newErrors.maxProducts = 'Max products must be -1 (unlimited) or positive';
  ```

- **Line 168**: `"Max customers must be -1 (unlimited) or positive"`
  ```
  newErrors.maxCustomers = 'Max customers must be -1 (unlimited) or positive';
  ```

- **Line 186**: `"Error submitting plan:"`
  ```
  console.error('Error submitting plan:', error);
  ```

### packages/ui/src/components/features/Customers/utils.ts

- **Line 172**: `"First name is required"`
  ```
  errors.push('First name is required');
  ```

- **Line 176**: `"Last name is required"`
  ```
  errors.push('Last name is required');
  ```

- **Line 180**: `"Email is required"`
  ```
  errors.push('Email is required');
  ```

- **Line 182**: `"Invalid email format"`
  ```
  errors.push('Invalid email format');
  ```

- **Line 186**: `"Phone number is required"`
  ```
  errors.push('Phone number is required');
  ```

### packages/ui/src/components/features/Customers/utils/customerApi.ts

- **Line 35**: `"Auth token not available in server context"`
  ```
  throw new Error('Auth token not available in server context');
  ```

- **Line 39**: `"Authentication token not found"`
  ```
  throw new Error('Authentication token not found');
  ```

- **Line 62**: `"API request failed with status ${response.status}"`
  ```
  throw new Error(result.message || `API request failed with status ${response.status}`);
  ```

### packages/ui/src/components/features/Customers/utils/customerApiClient.ts

- **Line 67**: `"Request failed"`
  ```
  message: data.message || 'Request failed'
  ```

- **Line 79**: `"Network error"`
  ```
  error: error instanceof Error ? error.message : 'Network error',
  ```

- **Line 80**: `"Request failed"`
  ```
  message: 'Request failed'
  ```

- **Line 206**: `"First name is required"`
  ```
  if (!data.firstName?.trim()) errors.push('First name is required');
  ```

- **Line 207**: `"Last name is required"`
  ```
  if (!data.lastName?.trim()) errors.push('Last name is required');
  ```

- **Line 208**: `"Email is required"`
  ```
  if (!data.email?.trim()) errors.push('Email is required');
  ```

- **Line 209**: `"Phone is required"`
  ```
  if (!data.phone?.trim()) errors.push('Phone is required');
  ```

- **Line 210**: `"Merchant ID is required"`
  ```
  if (!data.merchantId?.trim()) errors.push('Merchant ID is required');
  ```

- **Line 214**: `"Invalid email format"`
  ```
  errors.push('Invalid email format');
  ```

- **Line 219**: `"Phone number contains invalid characters"`
  ```
  errors.push('Phone number contains invalid characters');
  ```

- **Line 223**: `"Phone number must be at least 8 characters"`
  ```
  errors.push('Phone number must be at least 8 characters');
  ```

- **Line 228**: `"Invalid ID type"`
  ```
  errors.push('Invalid ID type');
  ```

### packages/ui/src/components/features/Customers/components/AddCustomerDialog.tsx

- **Line 46**: `"Failed to create customer"`
  ```
  onError(error instanceof Error ? error.message : 'Failed to create customer');
  ```

### packages/ui/src/components/features/Customers/components/AddCustomerForm.tsx

- **Line 110**: `"An unexpected error occurred"`
  ```
  let errorMsg = "An unexpected error occurred";
  ```

- **Line 114**: `"A customer with this phone number already exists"`
  ```
  errorMsg = "A customer with this phone number already exists";
  ```

- **Line 116**: `"A customer with this email address already exists"`
  ```
  errorMsg = "A customer with this email address already exists";
  ```

### packages/ui/src/components/features/Customers/components/CustomerOrdersDialog.tsx

- **Line 102**: `"Failed to fetch customer orders"`
  ```
  setError('Failed to fetch customer orders');
  ```

- **Line 103**: `"Error fetching customer orders:"`
  ```
  console.error('Error fetching customer orders:', err);
  ```

### packages/ui/src/components/features/Customers/components/CustomerActions.tsx

- **Line 43**: `"Customer missing id for navigation:"`
  ```
  console.error('Customer missing id for navigation:', customer);
  ```

- **Line 52**: `"Customer missing id for navigation:"`
  ```
  console.error('Customer missing id for navigation:', customer);
  ```

### packages/ui/src/components/features/Customers/components/CustomerDetailDialog.tsx

- **Line 107**: `"Error deleting customer:"`
  ```
  console.error('Error deleting customer:', error);
  ```

### packages/ui/src/components/features/Customers/components/EditCustomerForm.tsx

- **Line 193**: `"An unexpected error occurred"`
  ```
  : "An unexpected error occurred";
  ```

### packages/ui/src/components/features/Customers/components/CustomerForm.tsx

- **Line 83**: `"First name is required"`
  ```
  newErrors.firstName = 'First name is required';
  ```

- **Line 92**: `"Invalid email format"`
  ```
  newErrors.email = 'Invalid email format';
  ```

- **Line 131**: `"Error saving customer:"`
  ```
  console.error('Error saving customer:', error);
  ```

### packages/ui/src/components/features/Settings/Settings.tsx

- **Line 264**: `"Error fetching subscription data:"`
  ```
  console.error('Error fetching subscription data:', error);
  ```

- **Line 456**: `"Error signing out:"`
  ```
  console.error('Error signing out:', error);
  ```

### packages/ui/src/components/features/Settings/components/PricingSection.tsx

- **Line 57**: `"Failed to load merchant data:"`
  ```
  console.error('Failed to load merchant data:', error);
  ```

- **Line 74**: `"Validation failed:"`
  ```
  console.error('Validation failed:', validation.error);
  ```

- **Line 87**: `"Failed to update pricing configuration"`
  ```
  throw new Error(response.message || 'Failed to update pricing configuration');
  ```

- **Line 91**: `"Failed to update pricing config:"`
  ```
  console.error('Failed to update pricing config:', error);
  ```

### packages/ui/src/components/features/Settings/components/MerchantSection.tsx

- **Line 163**: `"Failed to auto-update currency:"`
  ```
  console.error('Failed to auto-update currency:', error);
  ```

- **Line 192**: `"Failed to copy link:"`
  ```
  console.error('Failed to copy link:', error);
  ```

### packages/ui/src/components/features/Products/components/ProductAddDialog.tsx

- **Line 54**: `"Failed to create product"`
  ```
  onError(error instanceof Error ? error.message : 'Failed to create product');
  ```

### packages/ui/src/components/features/Products/components/ProductOrdersView.tsx

- **Line 125**: `"Failed to fetch product orders"`
  ```
  setError('Failed to fetch product orders');
  ```

- **Line 274**: `"Failed to fetch product orders"`
  ```
  setError('Failed to fetch product orders');
  ```

- **Line 275**: `"Error refreshing product orders:"`
  ```
  console.error('Error refreshing product orders:', err);
  ```

### packages/ui/src/components/features/Products/components/ProductOrdersDialog.tsx

- **Line 64**: `"Failed to fetch orders"`
  ```
  setError('Failed to fetch orders');
  ```

- **Line 67**: `"Error fetching product orders:"`
  ```
  console.error('Error fetching product orders:', error);
  ```

- **Line 68**: `"Failed to fetch orders"`
  ```
  setError('Failed to fetch orders');
  ```

- **Line 162**: `"Error Loading Orders"`
  ```
  <h3 className="text-lg font-medium text-text-primary mb-2">Error Loading Orders</h3>
  ```

### packages/ui/src/components/features/Plans/components/PlanDialog.tsx

- **Line 66**: `"Error submitting plan:"`
  ```
  console.error('Error submitting plan:', error);
  ```

### packages/ui/src/components/features/BillingCycles/components/BillingCycleForm.tsx

- **Line 79**: `"Name is required"`
  ```
  newErrors.name = 'Name is required';
  ```

- **Line 83**: `"Value is required"`
  ```
  newErrors.value = 'Value is required';
  ```

- **Line 85**: `"Value must contain only lowercase letters and underscores"`
  ```
  newErrors.value = 'Value must contain only lowercase letters and underscores';
  ```

- **Line 89**: `"Months must be at least 1"`
  ```
  newErrors.months = 'Months must be at least 1';
  ```

- **Line 93**: `"Discount must be between 0 and 100"`
  ```
  newErrors.discount = 'Discount must be between 0 and 100';
  ```

### packages/ui/src/components/features/Outlets/components/AddOutletForm.tsx

- **Line 43**: `"Outlet name is required"`
  ```
  newErrors.name = 'Outlet name is required';
  ```

- **Line 60**: `"Error saving outlet:"`
  ```
  console.error('Error saving outlet:', error);
  ```

### packages/ui/src/components/features/Outlets/components/AddOutletDialog.tsx

- **Line 48**: `"Failed to create outlet"`
  ```
  onError(error instanceof Error ? error.message : 'Failed to create outlet');
  ```

### packages/ui/src/components/features/Admin/components/SettingsFields.tsx

- **Line 85**: `"How long users stay logged in before being required to log in again"`
  ```
  description: 'How long users stay logged in before being required to log in again'
  ```

- **Line 93**: `"Number of failed login attempts before account lockout"`
  ```
  description: 'Number of failed login attempts before account lockout'
  ```

- **Line 101**: `"Minimum number of characters required for passwords"`
  ```
  description: 'Minimum number of characters required for passwords'
  ```

### packages/ui/src/components/features/Subscriptions/components/UpgradeTrialModal.tsx

- **Line 102**: `"Upgrade failed:"`
  ```
  console.error('Upgrade failed:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionCancelDialog.tsx

- **Line 36**: `"Payment failed"`
  ```
  'Payment failed',
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionForm.tsx

- **Line 220**: `"Merchant is required"`
  ```
  newErrors.merchantId = 'Merchant is required';
  ```

- **Line 224**: `"Plan is required"`
  ```
  newErrors.planId = 'Plan is required';
  ```

- **Line 228**: `"Start date is required"`
  ```
  newErrors.startDate = 'Start date is required';
  ```

- **Line 232**: `"Next billing date is required"`
  ```
  newErrors.nextBillingDate = 'Next billing date is required';
  ```

- **Line 236**: `"Amount cannot be negative"`
  ```
  newErrors.amount = 'Amount cannot be negative';
  ```

- **Line 240**: `"End date is required for trial subscriptions"`
  ```
  newErrors.endDate = 'End date is required for trial subscriptions';
  ```

- **Line 264**: `"Error submitting subscription:"`
  ```
  console.error('Error submitting subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionEditDialog.tsx

- **Line 101**: `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionEditDemo.tsx

- **Line 184**: `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/ManualRenewalModal.tsx

- **Line 105**: `"Transaction ID is required"`
  ```
  newErrors.transactionId = 'Transaction ID is required';
  ```

- **Line 132**: `"Renewal failed:"`
  ```
  console.error('Renewal failed:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionHistoryDialog.tsx

- **Line 38**: `"Error fetching subscription history:"`
  ```
  console.error('Error fetching subscription history:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionFormSimple.tsx

- **Line 154**: `"Merchant is required"`
  ```
  newErrors.merchantId = 'Merchant is required';
  ```

- **Line 158**: `"Plan is required"`
  ```
  newErrors.planId = 'Plan is required';
  ```

- **Line 162**: `"Amount must be greater than 0"`
  ```
  newErrors.amount = 'Amount must be greater than 0';
  ```

- **Line 202**: `"Error submitting subscription:"`
  ```
  console.error('Error submitting subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionPreviewPage.tsx

- **Line 64**: `"Failed to fetch plans"`
  ```
  setError(response.error || 'Failed to fetch plans');
  ```

- **Line 67**: `"Error fetching plans:"`
  ```
  console.error('Error fetching plans:', err);
  ```

- **Line 68**: `"Failed to fetch plans"`
  ```
  setError('Failed to fetch plans');
  ```

### packages/ui/src/components/features/Subscriptions/components/AdminExtensionModal.tsx

- **Line 122**: `"End date is required"`
  ```
  newErrors.newEndDate = 'End date is required';
  ```

- **Line 124**: `"End date must be in the future"`
  ```
  newErrors.newEndDate = 'End date must be in the future';
  ```

- **Line 128**: `"Amount must be greater than 0"`
  ```
  newErrors.amount = 'Amount must be greater than 0';
  ```

- **Line 132**: `"Payment method is required"`
  ```
  newErrors.method = 'Payment method is required';
  ```

- **Line 136**: `"Description is required"`
  ```
  newErrors.description = 'Description is required';
  ```

### packages/ui/src/components/features/Merchants/components/MerchantPlanManagement.tsx

- **Line 275**: `"Failed to renew subscription:"`
  ```
  console.error('Failed to renew subscription:', error);
  ```

- **Line 292**: `"Error canceling subscription:"`
  ```
  console.error('Error canceling subscription:', error);
  ```

- **Line 324**: `"Error changing plan:"`
  ```
  console.error('Error changing plan:', error);
  ```

- **Line 340**: `"Error suspending subscription:"`
  ```
  console.error('Error suspending subscription:', error);
  ```

- **Line 354**: `"Error reactivating subscription:"`
  ```
  console.error('Error reactivating subscription:', error);
  ```

### packages/ui/src/components/features/Merchants/components/MerchantPlanDialog.tsx

- **Line 133**: `"Error changing plan:"`
  ```
  console.error('Error changing plan:', error);
  ```

### packages/ui/src/components/features/Merchants/components/MerchantSubscriptionSection.tsx

- **Line 73**: `"Activities not yet implemented or error:"`
  ```
  console.log('Activities not yet implemented or error:', err);
  ```

- **Line 84**: `"Payments not yet implemented or error:"`
  ```
  console.log('Payments not yet implemented or error:', err);
  ```

- **Line 88**: `"Error fetching history:"`
  ```
  console.error('Error fetching history:', error);
  ```

- **Line 127**: `"Error calculating days remaining:"`
  ```
  console.error('Error calculating days remaining:', error);
  ```

### packages/ui/src/components/features/Users/components/UserFormValidation.ts

- **Line 34**: `"Email is required"`
  ```
  return 'Email is required';
  ```

- **Line 37**: `"Email is invalid"`
  ```
  return 'Email is invalid';
  ```

- **Line 44**: `"Phone number is required"`
  ```
  return 'Phone number is required';
  ```

- **Line 60**: `"Phone number contains invalid characters"`
  ```
  return 'Phone number contains invalid characters';
  ```

- **Line 78**: `"Password is required"`
  ```
  return 'Password is required';
  ```

- **Line 123**: `"Role is required"`
  ```
  errors.role = 'Role is required';
  ```

- **Line 133**: `"Merchant is required for this role"`
  ```
  errors.merchantId = 'Merchant is required for this role';
  ```

- **Line 136**: `"Outlet should not be selected for merchant role"`
  ```
  errors.outletId = 'Outlet should not be selected for merchant role';
  ```

- **Line 141**: `"Merchant is required for this role"`
  ```
  errors.merchantId = 'Merchant is required for this role';
  ```

- **Line 144**: `"Outlet is required for this role"`
  ```
  errors.outletId = 'Outlet is required for this role';
  ```

- **Line 185**: `"Role is required"`
  ```
  errors.role = 'Role is required';
  ```

- **Line 195**: `"Merchant is required for this role"`
  ```
  errors.merchantId = 'Merchant is required for this role';
  ```

- **Line 198**: `"Outlet should not be selected for merchant role"`
  ```
  errors.outletId = 'Outlet should not be selected for merchant role';
  ```

- **Line 203**: `"Merchant is required for this role"`
  ```
  errors.merchantId = 'Merchant is required for this role';
  ```

- **Line 206**: `"Outlet is required for this role"`
  ```
  errors.outletId = 'Outlet is required for this role';
  ```

### packages/ui/src/components/features/Users/components/UserDetailDialog.tsx

- **Line 60**: `"Failed to deactivate user"`
  ```
  onError?.(response.error || 'Failed to deactivate user');
  ```

- **Line 63**: `"An error occurred"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'An error occurred';
  ```

- **Line 83**: `"Failed to activate user"`
  ```
  onError?.(response.error || 'Failed to activate user');
  ```

- **Line 86**: `"An error occurred"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'An error occurred';
  ```

- **Line 112**: `"Failed to delete user"`
  ```
  onError?.(response.error || 'Failed to delete user');
  ```

- **Line 115**: `"An error occurred"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'An error occurred';
  ```

### packages/ui/src/components/features/Users/components/AddUserDialog.tsx

- **Line 48**: `"Failed to create user"`
  ```
  onError(error instanceof Error ? error.message : 'Failed to create user');
  ```

### packages/ui/src/components/features/Users/components/UserForm.tsx

- **Line 181**: `"Error loading merchants:"`
  ```
  console.error('Error loading merchants:', error);
  ```

### packages/ui/src/components/features/Users/components/ChangePasswordDialog.tsx

- **Line 63**: `"New password is required"`
  ```
  newErrors.newPassword = 'New password is required';
  ```

- **Line 65**: `"New password must be at least 8 characters long"`
  ```
  newErrors.newPassword = 'New password must be at least 8 characters long';
  ```

- **Line 69**: `"Please confirm your new password"`
  ```
  newErrors.confirmPassword = 'Please confirm your new password';
  ```

- **Line 102**: `"Failed to change password"`
  ```
  onError?.(response.error || 'Failed to change password');
  ```

- **Line 105**: `"An error occurred"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'An error occurred';
  ```

### packages/ui/src/components/features/Users/components/UserActions.tsx

- **Line 107**: `"Cannot edit user: Missing or invalid id"`
  ```
  onError?.('Cannot edit user: Missing or invalid id');
  ```

### packages/ui/src/components/features/Users/lib/UserApiClient.ts

- **Line 41**: `"HTTP error! status: ${response.status}"`
  ```
  throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  ```

- **Line 46**: `"API request failed for ${endpoint}:"`
  ```
  console.error(`API request failed for ${endpoint}:`, error);
  ```

### packages/ui/src/components/features/OrderDetail/OrderDetail.tsx

- **Line 457**: `"Print Error"`
  ```
  toastError('Print Error', 'Failed to start printing. Please try again.');
  ```

- **Line 457**: `"Failed to start printing. Please try again."`
  ```
  toastError('Print Error', 'Failed to start printing. Please try again.');
  ```

- **Line 474**: `"Pickup Failed"`
  ```
  toastError('Pickup Failed', 'Failed to process order pickup. Please try again.');
  ```

- **Line 474**: `"Failed to process order pickup. Please try again."`
  ```
  toastError('Pickup Failed', 'Failed to process order pickup. Please try again.');
  ```

- **Line 493**: `"Return Failed"`
  ```
  toastError('Return Failed', 'Failed to process order return. Please try again.');
  ```

- **Line 493**: `"Failed to process order return. Please try again."`
  ```
  toastError('Return Failed', 'Failed to process order return. Please try again.');
  ```

- **Line 515**: `"Cancellation Failed"`
  ```
  toastError('Cancellation Failed', 'Failed to cancel order. Please try again.');
  ```

- **Line 515**: `"Failed to cancel order. Please try again."`
  ```
  toastError('Cancellation Failed', 'Failed to cancel order. Please try again.');
  ```

- **Line 538**: `"Edit Failed"`
  ```
  toastError('Edit Failed', 'Failed to enter edit mode. Please try again.');
  ```

- **Line 538**: `"Failed to enter edit mode. Please try again."`
  ```
  toastError('Edit Failed', 'Failed to enter edit mode. Please try again.');
  ```

- **Line 560**: `"Edit Failed"`
  ```
  toastError('Edit Failed', 'Failed to enter edit mode. Please try again.');
  ```

- **Line 560**: `"Failed to enter edit mode. Please try again."`
  ```
  toastError('Edit Failed', 'Failed to enter edit mode. Please try again.');
  ```

### packages/ui/src/components/features/OrderDetail/utils.ts

- **Line 190**: `"No collection required"`
  ```
  description: 'No collection required',
  ```

- **Line 245**: `"No return required"`
  ```
  description: 'No return required',
  ```

### packages/ui/src/components/features/OrderDetail/components/CollectionReturnModal.tsx

- **Line 86**: `"Error in modal confirmation:"`
  ```
  console.error('Error in modal confirmation:', error);
  ```

### packages/ui/src/components/features/Orders/RentalPeriodSelector.tsx

- **Line 97**: `"Price calculation error:"`
  ```
  console.error('Price calculation error:', error);
  ```

### packages/ui/src/components/features/Orders/utils.ts

- **Line 58**: `"Client-side sorting not supported for ${orders.length} records. Use server-side sorting."`
  ```
  throw new Error(`Client-side sorting not supported for ${orders.length} records. Use server-side sorting.`);
  ```

- **Line 208**: `"Order number is required"`
  ```
  errors.push('Order number is required');
  ```

- **Line 212**: `"Customer is required"`
  ```
  errors.push('Customer is required');
  ```

- **Line 216**: `"Outlet is required"`
  ```
  errors.push('Outlet is required');
  ```

- **Line 228**: `"Order must contain at least one item"`
  ```
  errors.push('Order must contain at least one item');
  ```

### packages/ui/src/components/features/Orders/components/OrderFilters.tsx

- **Line 117**: `"Failed to load outlets"`
  ```
  setOutletError('Failed to load outlets');
  ```

- **Line 121**: `"Error fetching outlets:"`
  ```
  console.error('Error fetching outlets:', error);
  ```

- **Line 122**: `"Failed to load outlets"`
  ```
  setOutletError('Failed to load outlets');
  ```

- **Line 150**: `"Failed to load merchants"`
  ```
  setMerchantError('Failed to load merchants');
  ```

- **Line 154**: `"Error fetching merchants:"`
  ```
  console.error('Error fetching merchants:', error);
  ```

- **Line 155**: `"Failed to load merchants"`
  ```
  setMerchantError('Failed to load merchants');
  ```

### packages/ui/src/components/features/Categories/components/AddCategoryDialog.tsx

- **Line 46**: `"Failed to create category"`
  ```
  onError(error instanceof Error ? error.message : 'Failed to create category');
  ```

### packages/ui/src/components/features/Categories/components/CategoryFormContent.tsx

- **Line 102**: `"Error saving category:"`
  ```
  console.error('Error saving category:', error);
  ```

### packages/ui/src/components/examples/ErrorHandlingUsage.tsx

- **Line 58**: `"Invalid token"`
  ```
  message: 'Invalid token',
  ```

- **Line 69**: `"Failed to fetch - check your connection"`
  ```
  message: 'Failed to fetch - check your connection'
  ```

- **Line 77**: `"Validation failed: Email is required"`
  ```
  message: 'Validation failed: Email is required',
  ```

- **Line 78**: `"VALIDATION_ERROR"`
  ```
  errorCode: 'VALIDATION_ERROR'
  ```

- **Line 90**: `"Error Handling with Toast Notifications"`
  ```
  <CardTitle>Error Handling with Toast Notifications</CardTitle>
  ```

- **Line 127**: `"Invalid Token"`
  ```
  Cancelled Plan "Invalid Token"
  ```

- **Line 149**: `"Error Handling Behavior:"`
  ```
  <strong>Error Handling Behavior:</strong>
  ```

- **Line 152**: `"Auto-redirect to login + toast with "log in again""`
  ```
  <li>• <strong>401 Auth errors:</strong> Auto-redirect to login + toast with "log in again"</li>
  ```

- **Line 153**: `"Toast only + "log in with different account""`
  ```
  <li>• <strong>403 Permission errors:</strong> Toast only + "log in with different account"</li>
  ```

- **Line 154**: `"Toast only + "log in and upgrade your plan""`
  ```
  <li>• <strong>Subscription errors:</strong> Toast only + "log in and upgrade your plan"</li>
  ```

- **Line 155**: `"Invalid token"`
  ```
  <li>• <strong>Cancelled plan "Invalid token":</strong> Correctly detected as subscription error</li>
  ```

- **Line 155**: `"Cancelled plan "Invalid token":"`
  ```
  <li>• <strong>Cancelled plan "Invalid token":</strong> Correctly detected as subscription error</li>
  ```

- **Line 155**: `"Correctly detected as subscription error"`
  ```
  <li>• <strong>Cancelled plan "Invalid token":</strong> Correctly detected as subscription error</li>
  ```

- **Line 156**: `"Warning toast with retry options"`
  ```
  <li>• <strong>Network errors:</strong> Warning toast with retry options</li>
  ```

- **Line 157**: `"Validation errors:"`
  ```
  <li>• <strong>Validation errors:</strong> Info toast for user guidance</li>
  ```

- **Line 157**: `"Info toast for user guidance"`
  ```
  <li>• <strong>Validation errors:</strong> Info toast for user guidance</li>
  ```

### apps/admin/app/audit-logs/page.tsx

- **Line 411**: `"Failed to load audit logs"`
  ```
  toastError('Failed to load audit logs', result.message || 'Please try again later.');
  ```

- **Line 414**: `"Failed to load audit logs"`
  ```
  toastError('Failed to load audit logs', error.message || 'Please try again later.');
  ```

- **Line 414**: `"Please try again later."`
  ```
  toastError('Failed to load audit logs', error.message || 'Please try again later.');
  ```

- **Line 430**: `"Failed to load audit statistics:"`
  ```
  console.error('Failed to load audit statistics:', error);
  ```

### apps/admin/app/settings/billing/page.tsx

- **Line 110**: `"Error saving billing config:"`
  ```
  console.error('Error saving billing config:', error);
  ```

### apps/admin/app/payments/page.tsx

- **Line 119**: `"Error processing payment:"`
  ```
  console.error('Error processing payment:', error);
  ```

- **Line 120**: `"Failed to process payment. Please try again."`
  ```
  toastError('Error', 'Failed to process payment. Please try again.');
  ```

- **Line 129**: `"Error refunding payment:"`
  ```
  console.error('Error refunding payment:', error);
  ```

- **Line 130**: `"Failed to refund payment. Please try again."`
  ```
  toastError('Error', 'Failed to refund payment. Please try again.');
  ```

- **Line 139**: `"Error downloading receipt:"`
  ```
  console.error('Error downloading receipt:', error);
  ```

- **Line 140**: `"Failed to download receipt. Please try again."`
  ```
  toastError('Error', 'Failed to download receipt. Please try again.');
  ```

- **Line 273**: `"Failed Payments"`
  ```
  <p className="text-sm font-medium text-text-secondary mb-2">Failed Payments</p>
  ```

### apps/admin/app/plans/page.tsx

- **Line 200**: `"Delete Failed"`
  ```
  toastError('Delete Failed', response.error || 'Failed to delete plan');
  ```

- **Line 200**: `"Failed to delete plan"`
  ```
  toastError('Delete Failed', response.error || 'Failed to delete plan');
  ```

- **Line 203**: `"Error deleting plan:"`
  ```
  console.error('Error deleting plan:', error);
  ```

- **Line 204**: `"Delete Failed"`
  ```
  toastError('Delete Failed', 'An error occurred while deleting the plan');
  ```

- **Line 204**: `"An error occurred while deleting the plan"`
  ```
  toastError('Delete Failed', 'An error occurred while deleting the plan');
  ```

- **Line 220**: `"Update Failed"`
  ```
  toastError('Update Failed', response.error || 'Failed to update plan');
  ```

- **Line 220**: `"Failed to update plan"`
  ```
  toastError('Update Failed', response.error || 'Failed to update plan');
  ```

- **Line 230**: `"Create Failed"`
  ```
  toastError('Create Failed', response.error || 'Failed to create plan');
  ```

- **Line 230**: `"Failed to create plan"`
  ```
  toastError('Create Failed', response.error || 'Failed to create plan');
  ```

- **Line 236**: `"Error saving plan:"`
  ```
  console.error('Error saving plan:', error);
  ```

- **Line 237**: `"Save Failed"`
  ```
  toastError('Save Failed', 'An error occurred while saving the plan');
  ```

- **Line 237**: `"An error occurred while saving the plan"`
  ```
  toastError('Save Failed', 'An error occurred while saving the plan');
  ```

- **Line 257**: `"Update Failed"`
  ```
  toastError('Update Failed', response.error || 'Failed to update plan status');
  ```

- **Line 257**: `"Failed to update plan status"`
  ```
  toastError('Update Failed', response.error || 'Failed to update plan status');
  ```

- **Line 260**: `"Error toggling plan status:"`
  ```
  console.error('Error toggling plan status:', error);
  ```

- **Line 261**: `"Update Failed"`
  ```
  toastError('Update Failed', 'An error occurred while updating plan status');
  ```

- **Line 261**: `"An error occurred while updating plan status"`
  ```
  toastError('Update Failed', 'An error occurred while updating plan status');
  ```

### apps/admin/app/plan-variants/page.tsx

- **Line 123**: `"Failed to fetch plan variants:"`
  ```
  console.error('Failed to fetch plan variants:', response.error);
  ```

- **Line 126**: `"Error fetching plan variants:"`
  ```
  console.error('Error fetching plan variants:', error);
  ```

- **Line 141**: `"Error fetching plans:"`
  ```
  console.error('Error fetching plans:', error);
  ```

- **Line 154**: `"Error fetching deleted variants:"`
  ```
  console.error('Error fetching deleted variants:', error);
  ```

- **Line 169**: `"Failed to delete plan variant: ${response.error}"`
  ```
  toastError(`Failed to delete plan variant: ${response.error}`);
  ```

- **Line 172**: `"Error deleting plan variant:"`
  ```
  console.error('Error deleting plan variant:', error);
  ```

- **Line 173**: `"Error deleting plan variant"`
  ```
  toastError("Error deleting plan variant");
  ```

- **Line 188**: `"Failed to restore plan variant: ${response.error}"`
  ```
  toastError(`Failed to restore plan variant: ${response.error}`);
  ```

- **Line 191**: `"Error restoring plan variant:"`
  ```
  console.error('Error restoring plan variant:', error);
  ```

- **Line 192**: `"Error restoring plan variant"`
  ```
  toastError("Error restoring plan variant");
  ```

- **Line 206**: `"Failed to apply discount: ${response.error}"`
  ```
  toastError(`Failed to apply discount: ${response.error}`);
  ```

- **Line 209**: `"Error applying discount:"`
  ```
  console.error('Error applying discount:', error);
  ```

- **Line 210**: `"Error applying discount"`
  ```
  toastError("Error applying discount");
  ```

- **Line 228**: `"Failed to save plan variant: ${response.error}"`
  ```
  toastError(`Failed to save plan variant: ${response.error}`);
  ```

- **Line 231**: `"Error saving plan variant:"`
  ```
  console.error('Error saving plan variant:', error);
  ```

- **Line 232**: `"Error saving plan variant"`
  ```
  toastError("Error saving plan variant");
  ```

### apps/admin/app/subscriptions/[id]/edit/page.tsx

- **Line 57**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 80**: `"Error updating subscription:"`
  ```
  console.error('Error updating subscription:', error);
  ```

### apps/admin/app/subscriptions/[id]/preview/page.tsx

- **Line 101**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 102**: `"Failed to load subscription details"`
  ```
  toastError('Failed to load subscription details');
  ```

- **Line 128**: `"Failed to renew subscription"`
  ```
  toastError(result.message || 'Failed to renew subscription');
  ```

- **Line 131**: `"Renewal error:"`
  ```
  console.error('Renewal error:', error);
  ```

- **Line 132**: `"An error occurred while renewing subscription"`
  ```
  toastError('An error occurred while renewing subscription');
  ```

- **Line 161**: `"Failed to upgrade plan"`
  ```
  toastError(result.message || 'Failed to upgrade plan');
  ```

- **Line 164**: `"Upgrade error:"`
  ```
  console.error('Upgrade error:', error);
  ```

- **Line 165**: `"An error occurred while upgrading plan"`
  ```
  toastError('An error occurred while upgrading plan');
  ```

- **Line 185**: `"Failed to pause subscription"`
  ```
  toastError(result.message || 'Failed to pause subscription');
  ```

- **Line 188**: `"An error occurred"`
  ```
  toastError('An error occurred');
  ```

- **Line 206**: `"Failed to resume subscription"`
  ```
  toastError(result.message || 'Failed to resume subscription');
  ```

- **Line 209**: `"An error occurred"`
  ```
  toastError('An error occurred');
  ```

### apps/admin/app/subscriptions/[id]/page-enhanced.tsx

- **Line 99**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 100**: `"Failed to load subscription details"`
  ```
  toastError('Failed to load subscription details');
  ```

- **Line 126**: `"Failed to renew subscription"`
  ```
  toastError(result.message || 'Failed to renew subscription');
  ```

- **Line 129**: `"Renewal error:"`
  ```
  console.error('Renewal error:', error);
  ```

- **Line 130**: `"An error occurred while renewing subscription"`
  ```
  toastError('An error occurred while renewing subscription');
  ```

- **Line 159**: `"Failed to upgrade plan"`
  ```
  toastError(result.message || 'Failed to upgrade plan');
  ```

- **Line 162**: `"Upgrade error:"`
  ```
  console.error('Upgrade error:', error);
  ```

- **Line 163**: `"An error occurred while upgrading plan"`
  ```
  toastError('An error occurred while upgrading plan');
  ```

- **Line 183**: `"Failed to pause subscription"`
  ```
  toastError(result.message || 'Failed to pause subscription');
  ```

- **Line 186**: `"An error occurred"`
  ```
  toastError('An error occurred');
  ```

- **Line 204**: `"Failed to resume subscription"`
  ```
  toastError(result.message || 'Failed to resume subscription');
  ```

- **Line 207**: `"An error occurred"`
  ```
  toastError('An error occurred');
  ```

### apps/admin/app/subscriptions/[id]/page.tsx

- **Line 94**: `"Failed to fetch subscription"`
  ```
  throw new Error(result.message || 'Failed to fetch subscription');
  ```

- **Line 97**: `"Error fetching subscription:"`
  ```
  console.error('Error fetching subscription:', error);
  ```

- **Line 121**: `"Extension Failed"`
  ```
  toastError('Extension Failed', result.message || 'Failed to extend subscription');
  ```

- **Line 121**: `"Failed to extend subscription"`
  ```
  toastError('Extension Failed', result.message || 'Failed to extend subscription');
  ```

- **Line 124**: `"Error extending subscription:"`
  ```
  console.error('Error extending subscription:', error);
  ```

- **Line 125**: `"Extension Failed"`
  ```
  toastError('Extension Failed', 'Error extending subscription. Please try again.');
  ```

- **Line 125**: `"Error extending subscription. Please try again."`
  ```
  toastError('Extension Failed', 'Error extending subscription. Please try again.');
  ```

- **Line 145**: `"Deletion Failed"`
  ```
  toastError('Deletion Failed', result.message || 'Failed to delete subscription');
  ```

- **Line 145**: `"Failed to delete subscription"`
  ```
  toastError('Deletion Failed', result.message || 'Failed to delete subscription');
  ```

- **Line 148**: `"Error deleting subscription:"`
  ```
  console.error('Error deleting subscription:', error);
  ```

- **Line 149**: `"Deletion Failed"`
  ```
  toastError('Deletion Failed', 'Error deleting subscription. Please try again.');
  ```

- **Line 149**: `"Error deleting subscription. Please try again."`
  ```
  toastError('Deletion Failed', 'Error deleting subscription. Please try again.');
  ```

- **Line 172**: `"Suspension Failed"`
  ```
  toastError('Suspension Failed', result.message || 'Failed to suspend subscription');
  ```

- **Line 172**: `"Failed to suspend subscription"`
  ```
  toastError('Suspension Failed', result.message || 'Failed to suspend subscription');
  ```

- **Line 175**: `"Error suspending subscription:"`
  ```
  console.error('Error suspending subscription:', error);
  ```

- **Line 176**: `"Suspension Failed"`
  ```
  toastError('Suspension Failed', 'Error suspending subscription. Please try again.');
  ```

- **Line 176**: `"Error suspending subscription. Please try again."`
  ```
  toastError('Suspension Failed', 'Error suspending subscription. Please try again.');
  ```

- **Line 198**: `"Cancellation Failed"`
  ```
  toastError('Cancellation Failed', result.message || 'Failed to cancel subscription');
  ```

- **Line 198**: `"Failed to cancel subscription"`
  ```
  toastError('Cancellation Failed', result.message || 'Failed to cancel subscription');
  ```

- **Line 201**: `"Error cancelling subscription:"`
  ```
  console.error('Error cancelling subscription:', error);
  ```

- **Line 202**: `"Cancellation Failed"`
  ```
  toastError('Cancellation Failed', 'Error cancelling subscription. Please try again.');
  ```

- **Line 202**: `"Error cancelling subscription. Please try again."`
  ```
  toastError('Cancellation Failed', 'Error cancelling subscription. Please try again.');
  ```

### apps/admin/app/subscriptions/page.tsx

- **Line 124**: `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', error);
  ```

- **Line 182**: `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

- **Line 184**: `"Update Failed"`
  ```
  'Update Failed',
  ```

- **Line 185**: `"Failed to update subscription. Please try again."`
  ```
  'Failed to update subscription. Please try again.'
  ```

- **Line 237**: `"Operation Failed"`
  ```
  'Operation Failed',
  ```

- **Line 244**: `"Operation Failed"`
  ```
  'Operation Failed',
  ```

- **Line 245**: `"Error ${type}ing subscription. Please try again."`
  ```
  `Error ${type}ing subscription. Please try again.`
  ```

- **Line 277**: `"Creation Failed"`
  ```
  'Creation Failed',
  ```

- **Line 278**: `"Failed to create subscription"`
  ```
  result.message || 'Failed to create subscription'
  ```

- **Line 282**: `"Error creating subscription:"`
  ```
  console.error('Error creating subscription:', error);
  ```

- **Line 284**: `"Creation Failed"`
  ```
  'Creation Failed',
  ```

- **Line 285**: `"Error creating subscription. Please try again."`
  ```
  'Error creating subscription. Please try again.'
  ```

### apps/admin/app/subscriptions/create/page.tsx

- **Line 44**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 67**: `"Error creating subscription:"`
  ```
  console.error('Error creating subscription:', error);
  ```

### apps/admin/app/subscription/page.tsx

- **Line 43**: `"Failed to fetch data:"`
  ```
  console.error('Failed to fetch data:', error);
  ```

- **Line 72**: `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

### apps/admin/app/merchants/[id]/products/[productId]/orders/page.tsx

- **Line 57**: `"Failed to fetch product details"`
  ```
  setError('Failed to fetch product details');
  ```

- **Line 70**: `"Failed to fetch product orders"`
  ```
  setError('Failed to fetch product orders');
  ```

- **Line 73**: `"Error fetching product and orders:"`
  ```
  console.error('Error fetching product and orders:', err);
  ```

- **Line 74**: `"An error occurred while fetching data"`
  ```
  setError('An error occurred while fetching data');
  ```

- **Line 185**: `"Error Loading Orders"`
  ```
  <h3 className="text-lg font-medium text-text-primary mb-2">Error Loading Orders</h3>
  ```

### apps/admin/app/merchants/[id]/products/[productId]/page.tsx

- **Line 50**: `"Failed to fetch product details"`
  ```
  setError(data.message || 'Failed to fetch product details');
  ```

- **Line 53**: `"Error fetching product details:"`
  ```
  console.error('Error fetching product details:', error);
  ```

- **Line 54**: `"Failed to fetch product details"`
  ```
  setError('Failed to fetch product details');
  ```

- **Line 73**: `"Failed to update product"`
  ```
  const msg = data.message || 'Failed to update product';
  ```

- **Line 75**: `"Update failed"`
  ```
  toastError('Update failed', msg);
  ```

- **Line 78**: `"Error updating product:"`
  ```
  console.error('Error updating product:', error);
  ```

- **Line 79**: `"Failed to update product"`
  ```
  setError('Failed to update product');
  ```

- **Line 80**: `"Update failed"`
  ```
  toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
  ```

- **Line 80**: `"Unknown error"`
  ```
  toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
  ```

### apps/admin/app/merchants/[id]/products/page.tsx

- **Line 77**: `"Failed to fetch products"`
  ```
  setError(productsData.message || 'Failed to fetch products');
  ```

- **Line 80**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 81**: `"Failed to fetch data"`
  ```
  setError('Failed to fetch data');
  ```

- **Line 208**: `"Error Loading Products"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Products</h3>
  ```

### apps/admin/app/merchants/[id]/outlets/[outletId]/page.tsx

- **Line 78**: `"Failed to fetch outlet details"`
  ```
  setError(data.message || 'Failed to fetch outlet details');
  ```

- **Line 81**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 82**: `"Failed to fetch data"`
  ```
  setError('Failed to fetch data');
  ```

- **Line 100**: `"Failed to update outlet"`
  ```
  const msg = data.message || 'Failed to update outlet';
  ```

- **Line 102**: `"Update failed"`
  ```
  toastError('Update failed', msg);
  ```

- **Line 105**: `"Error updating outlet:"`
  ```
  console.error('Error updating outlet:', error);
  ```

- **Line 106**: `"Failed to update outlet"`
  ```
  setError('Failed to update outlet');
  ```

- **Line 107**: `"Update failed"`
  ```
  toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
  ```

- **Line 107**: `"Unknown error"`
  ```
  toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
  ```

### apps/admin/app/merchants/[id]/outlets/page.tsx

- **Line 78**: `"Failed to fetch outlets"`
  ```
  setError(outletsData.message || 'Failed to fetch outlets');
  ```

- **Line 81**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 82**: `"Failed to fetch data"`
  ```
  setError('Failed to fetch data');
  ```

- **Line 201**: `"Error Loading Outlets"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Outlets</h3>
  ```

### apps/admin/app/merchants/[id]/edit/page.tsx

- **Line 97**: `"Failed to fetch merchant details"`
  ```
  setError(result.message || 'Failed to fetch merchant details');
  ```

- **Line 100**: `"Error fetching merchant details:"`
  ```
  console.error('Error fetching merchant details:', error);
  ```

- **Line 101**: `"Failed to fetch merchant details"`
  ```
  setError('Failed to fetch merchant details');
  ```

- **Line 119**: `"Failed to update merchant"`
  ```
  const msg = result.message || 'Failed to update merchant';
  ```

- **Line 121**: `"Update failed"`
  ```
  toastError('Update failed', msg);
  ```

- **Line 124**: `"Error updating merchant:"`
  ```
  console.error('Error updating merchant:', err);
  ```

- **Line 125**: `"Failed to update merchant"`
  ```
  setError('Failed to update merchant');
  ```

- **Line 126**: `"Update failed"`
  ```
  toastError('Update failed', err instanceof Error ? err.message : 'Unknown error');
  ```

- **Line 126**: `"Unknown error"`
  ```
  toastError('Update failed', err instanceof Error ? err.message : 'Unknown error');
  ```

### apps/admin/app/merchants/[id]/users/page.tsx

- **Line 89**: `"Failed to fetch users"`
  ```
  setError(usersData.message || 'Failed to fetch users');
  ```

- **Line 94**: `"Failed to fetch data"`
  ```
  setError('Failed to fetch data');
  ```

- **Line 236**: `"Error Loading Users"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Users</h3>
  ```

### apps/admin/app/merchants/[id]/users/[userId]/page.tsx

- **Line 61**: `"Failed to fetch user details"`
  ```
  setError(data.message || 'Failed to fetch user details');
  ```

- **Line 64**: `"Error fetching user details:"`
  ```
  console.error('Error fetching user details:', error);
  ```

- **Line 65**: `"Failed to fetch user details"`
  ```
  setError('Failed to fetch user details');
  ```

- **Line 95**: `"Failed to update user"`
  ```
  const msg = data.message || 'Failed to update user';
  ```

- **Line 96**: `"Update failed"`
  ```
  toastError('Update failed', msg);
  ```

- **Line 99**: `"Error updating user:"`
  ```
  console.error('Error updating user:', error);
  ```

- **Line 100**: `"Update failed"`
  ```
  toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
  ```

- **Line 100**: `"Unknown error"`
  ```
  toastError('Update failed', error instanceof Error ? error.message : 'Unknown error');
  ```

- **Line 127**: `"Activation Failed"`
  ```
  toastError('Activation Failed', data.message || 'Failed to activate user');
  ```

- **Line 127**: `"Failed to activate user"`
  ```
  toastError('Activation Failed', data.message || 'Failed to activate user');
  ```

- **Line 130**: `"Error activating user:"`
  ```
  console.error('Error activating user:', error);
  ```

- **Line 131**: `"Activation Failed"`
  ```
  toastError('Activation Failed', 'An error occurred while activating the user');
  ```

- **Line 131**: `"An error occurred while activating the user"`
  ```
  toastError('Activation Failed', 'An error occurred while activating the user');
  ```

- **Line 155**: `"Deactivation Failed"`
  ```
  toastError('Deactivation Failed', data.message || 'Failed to deactivate user');
  ```

- **Line 155**: `"Failed to deactivate user"`
  ```
  toastError('Deactivation Failed', data.message || 'Failed to deactivate user');
  ```

- **Line 158**: `"Error deactivating user:"`
  ```
  console.error('Error deactivating user:', error);
  ```

- **Line 159**: `"Deactivation Failed"`
  ```
  toastError('Deactivation Failed', 'An error occurred while deactivating the user');
  ```

- **Line 159**: `"An error occurred while deactivating the user"`
  ```
  toastError('Deactivation Failed', 'An error occurred while deactivating the user');
  ```

- **Line 179**: `"Deactivation Failed"`
  ```
  toastError('Deactivation Failed', data.message || 'Failed to deactivate user');
  ```

- **Line 179**: `"Failed to deactivate user"`
  ```
  toastError('Deactivation Failed', data.message || 'Failed to deactivate user');
  ```

- **Line 182**: `"Error deactivating user:"`
  ```
  console.error('Error deactivating user:', error);
  ```

- **Line 183**: `"Deactivation Failed"`
  ```
  toastError('Deactivation Failed', 'An error occurred while deactivating the user');
  ```

- **Line 183**: `"An error occurred while deactivating the user"`
  ```
  toastError('Deactivation Failed', 'An error occurred while deactivating the user');
  ```

- **Line 195**: `"Password Change Failed"`
  ```
  toastError('Password Change Failed', errorMessage);
  ```

### apps/admin/app/merchants/[id]/orders/[orderId]/edit/page.tsx

- **Line 66**: `"Authentication required"`
  ```
  setError('Authentication required');
  ```

- **Line 90**: `"Failed to fetch order details"`
  ```
  setError('Failed to fetch order details');
  ```

- **Line 93**: `"Failed to fetch order details"`
  ```
  setError('Failed to fetch order details');
  ```

- **Line 97**: `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 98**: `"An error occurred while fetching order details"`
  ```
  setError('An error occurred while fetching order details');
  ```

- **Line 142**: `"Failed to fetch customers:"`
  ```
  console.error('Failed to fetch customers:', customersRes.error);
  ```

- **Line 150**: `"Failed to fetch products:"`
  ```
  console.error('Failed to fetch products:', productsRes.error);
  ```

- **Line 162**: `"Failed to fetch outlets:"`
  ```
  console.error('Failed to fetch outlets:', outletsRes.error);
  ```

- **Line 170**: `"Failed to fetch categories:"`
  ```
  console.error('Failed to fetch categories:', categoriesRes.error);
  ```

- **Line 173**: `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

- **Line 193**: `"Authentication required"`
  ```
  toastError('Authentication required');
  ```

- **Line 212**: `"Failed to update order"`
  ```
  throw new Error(result.error || 'Failed to update order');
  ```

- **Line 215**: `"Error updating order:"`
  ```
  console.error('Error updating order:', err);
  ```

- **Line 216**: `"Failed to update order:"`
  ```
  toastError('Failed to update order: ' + (err instanceof Error ? err.message : 'Unknown error'));
  ```

- **Line 216**: `"Unknown error"`
  ```
  toastError('Failed to update order: ' + (err instanceof Error ? err.message : 'Unknown error'));
  ```

- **Line 260**: `"Error Loading Order"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Order</h3>
  ```

### apps/admin/app/merchants/[id]/orders/[orderId]/page.tsx

- **Line 43**: `"Authentication required"`
  ```
  setError('Authentication required');
  ```

- **Line 67**: `"Failed to fetch order details"`
  ```
  setError('Failed to fetch order details');
  ```

- **Line 70**: `"Failed to fetch order details"`
  ```
  setError('Failed to fetch order details');
  ```

- **Line 74**: `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 75**: `"An error occurred while fetching order details"`
  ```
  setError('An error occurred while fetching order details');
  ```

- **Line 100**: `"Authentication required"`
  ```
  toastError('Authentication required');
  ```

- **Line 112**: `"Failed to cancel order"`
  ```
  toastError(result.error || 'Failed to cancel order');
  ```

- **Line 115**: `"Error cancelling order:"`
  ```
  console.error('Error cancelling order:', err);
  ```

- **Line 116**: `"An error occurred while cancelling the order"`
  ```
  toastError('An error occurred while cancelling the order');
  ```

- **Line 130**: `"Authentication required"`
  ```
  toastError('Authentication required');
  ```

- **Line 142**: `"Failed to update order status"`
  ```
  toastError(result.error || 'Failed to update order status');
  ```

- **Line 145**: `"Error updating order status:"`
  ```
  console.error('Error updating order status:', err);
  ```

- **Line 146**: `"An error occurred while updating the order status"`
  ```
  toastError('An error occurred while updating the order status');
  ```

- **Line 160**: `"Authentication required"`
  ```
  toastError('Authentication required');
  ```

- **Line 177**: `"Failed to mark order as picked up"`
  ```
  toastError(result.error || 'Failed to mark order as picked up');
  ```

- **Line 180**: `"Error marking order as picked up:"`
  ```
  console.error('Error marking order as picked up:', err);
  ```

- **Line 181**: `"An error occurred while marking the order as picked up"`
  ```
  toastError('An error occurred while marking the order as picked up');
  ```

- **Line 195**: `"Authentication required"`
  ```
  toastError('Authentication required');
  ```

- **Line 212**: `"Failed to mark order as returned"`
  ```
  toastError(result.error || 'Failed to mark order as returned');
  ```

- **Line 215**: `"Error marking order as returned:"`
  ```
  console.error('Error marking order as returned:', err);
  ```

- **Line 216**: `"An error occurred while marking the order as returned"`
  ```
  toastError('An error occurred while marking the order as returned');
  ```

- **Line 257**: `"Error Loading Order"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Order</h3>
  ```

### apps/admin/app/merchants/[id]/orders/page.tsx

- **Line 108**: `"Failed to fetch orders"`
  ```
  setError(ordersData.message || 'Failed to fetch orders');
  ```

- **Line 111**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 112**: `"Failed to fetch data"`
  ```
  setError('Failed to fetch data');
  ```

- **Line 250**: `"Error Loading Orders"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Orders</h3>
  ```

### apps/admin/app/merchants/[id]/orders/create/page.tsx

- **Line 61**: `"Authentication required"`
  ```
  setError('Authentication required');
  ```

- **Line 78**: `"Failed to fetch customers:"`
  ```
  console.error('Failed to fetch customers:', customersRes.error);
  ```

- **Line 86**: `"Failed to fetch products:"`
  ```
  console.error('Failed to fetch products:', productsRes.error);
  ```

- **Line 98**: `"Failed to fetch outlets:"`
  ```
  console.error('Failed to fetch outlets:', outletsRes.error);
  ```

- **Line 106**: `"Failed to fetch categories:"`
  ```
  console.error('Failed to fetch categories:', categoriesRes.error);
  ```

- **Line 109**: `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

- **Line 110**: `"Failed to load form data"`
  ```
  setError('Failed to load form data');
  ```

- **Line 129**: `"Authentication required"`
  ```
  toastError('Authentication required');
  ```

- **Line 142**: `"Failed to create order"`
  ```
  throw new Error(result.error || 'Failed to create order');
  ```

- **Line 145**: `"Error creating order:"`
  ```
  console.error('Error creating order:', err);
  ```

- **Line 146**: `"Failed to create order:"`
  ```
  toastError('Failed to create order: ' + (err instanceof Error ? err.message : 'Unknown error'));
  ```

- **Line 146**: `"Unknown error"`
  ```
  toastError('Failed to create order: ' + (err instanceof Error ? err.message : 'Unknown error'));
  ```

- **Line 190**: `"Error Loading Form Data"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Form Data</h3>
  ```

### apps/admin/app/merchants/[id]/page.tsx

- **Line 50**: `"Failed to fetch merchant details"`
  ```
  setError(response.message || 'Failed to fetch merchant details');
  ```

- **Line 60**: `"Error fetching merchant details:"`
  ```
  console.error('Error fetching merchant details:', error);
  ```

- **Line 61**: `"Failed to fetch merchant details"`
  ```
  setError('Failed to fetch merchant details');
  ```

- **Line 129**: `"Failed to change plan:"`
  ```
  console.error('Failed to change plan:', response.message);
  ```

- **Line 132**: `"Error changing plan:"`
  ```
  console.error('Error changing plan:', error);
  ```

- **Line 144**: `"Failed to disable plan:"`
  ```
  console.error('Failed to disable plan:', response.message);
  ```

- **Line 147**: `"Error disabling plan:"`
  ```
  console.error('Error disabling plan:', error);
  ```

- **Line 159**: `"Failed to delete plan:"`
  ```
  console.error('Failed to delete plan:', response.message);
  ```

- **Line 162**: `"Error deleting plan:"`
  ```
  console.error('Error deleting plan:', error);
  ```

- **Line 192**: `"Failed to renew subscription"`
  ```
  throw new Error(result.message || 'Failed to renew subscription');
  ```

- **Line 195**: `"Error extending subscription:"`
  ```
  console.error('Error extending subscription:', error);
  ```

- **Line 211**: `"Failed to cancel subscription:"`
  ```
  console.error('Failed to cancel subscription:', response.message);
  ```

- **Line 214**: `"Error cancelling subscription:"`
  ```
  console.error('Error cancelling subscription:', error);
  ```

- **Line 226**: `"Failed to suspend subscription:"`
  ```
  console.error('Failed to suspend subscription:', response.message);
  ```

- **Line 229**: `"Error suspending subscription:"`
  ```
  console.error('Error suspending subscription:', error);
  ```

- **Line 243**: `"Failed to reactivate subscription:"`
  ```
  console.error('Failed to reactivate subscription:', response.message);
  ```

- **Line 246**: `"Error reactivating subscription:"`
  ```
  console.error('Error reactivating subscription:', error);
  ```

- **Line 274**: `"Error Loading Merchant"`
  ```
  <h3 className="text-lg font-medium mb-2">Error Loading Merchant</h3>
  ```

### apps/admin/app/dashboard/page.tsx

- **Line 684**: `"Error fetching system metrics:"`
  ```
  console.error('Error fetching system metrics:', error);
  ```

- **Line 685**: `"Failed to fetch system metrics"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system metrics';
  ```

- **Line 706**: `"Please log in again"`
  ```
  toastError('Session Expired', 'Please log in again');
  ```

### apps/admin/app/system/audit-logs/page.tsx

- **Line 481**: `"Failed to load audit logs"`
  ```
  toastError('Failed to load audit logs', result.message || 'Please try again later.');
  ```

- **Line 484**: `"Failed to load audit logs"`
  ```
  toastError('Failed to load audit logs', error.message || 'Please try again later.');
  ```

- **Line 484**: `"Please try again later."`
  ```
  toastError('Failed to load audit logs', error.message || 'Please try again later.');
  ```

- **Line 498**: `"Failed to load audit statistics:"`
  ```
  console.error('Failed to load audit statistics:', error);
  ```

### apps/admin/app/system/integrity/page.tsx

- **Line 70**: `"Failed to get integrity report"`
  ```
  setError('Failed to get integrity report');
  ```

- **Line 73**: `"Failed to run integrity check"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to run integrity check');
  ```

- **Line 288**: `"Invalid Orders:"`
  ```
  <p className="font-medium">Invalid Orders:</p>
  ```

### apps/admin/app/system/backup/page.tsx

- **Line 82**: `"Failed to fetch backups"`
  ```
  setError(result.error || 'Failed to fetch backups');
  ```

- **Line 85**: `"Failed to fetch backups"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to fetch backups');
  ```

- **Line 96**: `"Failed to fetch schedules"`
  ```
  setError(result.error || 'Failed to fetch schedules');
  ```

- **Line 99**: `"Failed to fetch schedules"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
  ```

- **Line 112**: `"Failed to create backup"`
  ```
  setError(result.error || 'Failed to create backup');
  ```

- **Line 115**: `"Failed to create backup"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to create backup');
  ```

- **Line 130**: `"Failed to verify backup"`
  ```
  setError(result.error || 'Failed to verify backup');
  ```

- **Line 133**: `"Failed to verify backup"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to verify backup');
  ```

### apps/admin/app/users/page.tsx

- **Line 188**: `"Failed to update user"`
  ```
  throw new Error(response.error || 'Failed to update user');
  ```

- **Line 191**: `"Failed to update user"`
  ```
  toastError('Failed to update user', (error as Error).message);
  ```

- **Line 273**: `"Failed to create user"`
  ```
  throw new Error(response.error || 'Failed to create user');
  ```

- **Line 276**: `"Error creating user:"`
  ```
  console.error('Error creating user:', error);
  ```

- **Line 277**: `"Failed to create user"`
  ```
  toastError('Failed to create user', error instanceof Error ? error.message : 'Unknown error');
  ```

- **Line 277**: `"Unknown error"`
  ```
  toastError('Failed to create user', error instanceof Error ? error.message : 'Unknown error');
  ```

### apps/admin/app/reset-password/page.tsx

- **Line 19**: `"Invalid reset link. Please request a new password reset."`
  ```
  setError('Invalid reset link. Please request a new password reset.');
  ```

- **Line 35**: `"Reset link is invalid or has expired. Please request a new password reset."`
  ```
  throw new Error('Reset link is invalid or has expired. Please request a new password reset.');
  ```

- **Line 37**: `"This reset link has already been used. Please request a new password reset."`
  ```
  throw new Error('This reset link has already been used. Please request a new password reset.');
  ```

- **Line 39**: `"Failed to reset password"`
  ```
  throw new Error(result.message || 'Failed to reset password');
  ```

- **Line 51**: `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

- **Line 52**: `"Failed to reset password. Please try again."`
  ```
  setError(error.message || 'Failed to reset password. Please try again.');
  ```

- **Line 67**: `"Invalid reset link. Please request a new password reset."`
  ```
  <p>{error || 'Invalid reset link. Please request a new password reset.'}</p>
  ```

### apps/admin/app/orders/[orderId]/page.tsx

- **Line 100**: `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 101**: `"An error occurred while fetching order details"`
  ```
  setError('An error occurred while fetching order details');
  ```

- **Line 141**: `"Failed to cancel order"`
  ```
  toastError(result.error || 'Failed to cancel order');
  ```

- **Line 144**: `"Error cancelling order:"`
  ```
  console.error('Error cancelling order:', err);
  ```

- **Line 145**: `"An error occurred while cancelling order"`
  ```
  toastError('An error occurred while cancelling order');
  ```

- **Line 174**: `"Failed to update order status"`
  ```
  toastError(result.error || 'Failed to update order status');
  ```

- **Line 177**: `"Error updating order status:"`
  ```
  console.error('Error updating order status:', err);
  ```

- **Line 178**: `"An error occurred while updating order status"`
  ```
  toastError('An error occurred while updating order status');
  ```

- **Line 207**: `"Failed to pickup order"`
  ```
  toastError(result.error || 'Failed to pickup order');
  ```

- **Line 210**: `"Error picking up order:"`
  ```
  console.error('Error picking up order:', err);
  ```

- **Line 211**: `"An error occurred while picking up order"`
  ```
  toastError('An error occurred while picking up order');
  ```

- **Line 240**: `"Failed to return order"`
  ```
  toastError(result.error || 'Failed to return order');
  ```

- **Line 243**: `"Error returning order:"`
  ```
  console.error('Error returning order:', err);
  ```

- **Line 244**: `"An error occurred while returning order"`
  ```
  toastError('An error occurred while returning order');
  ```

- **Line 282**: `"Failed to save order settings"`
  ```
  toastError(result.error || 'Failed to save order settings');
  ```

- **Line 285**: `"Error saving order settings:"`
  ```
  console.error('Error saving order settings:', err);
  ```

- **Line 286**: `"An error occurred while saving order settings"`
  ```
  toastError('An error occurred while saving order settings');
  ```

### apps/admin/app/billing-cycles/page.tsx

- **Line 51**: `"Failed to fetch billing cycles:"`
  ```
  console.error('Failed to fetch billing cycles:', response.message);
  ```

- **Line 52**: `"Failed to fetch billing cycles"`
  ```
  toastError('Error', 'Failed to fetch billing cycles');
  ```

- **Line 55**: `"Error fetching billing cycles:"`
  ```
  console.error('Error fetching billing cycles:', err);
  ```

- **Line 56**: `"Failed to fetch billing cycles"`
  ```
  toastError('Error', 'Failed to fetch billing cycles');
  ```

- **Line 71**: `"Failed to create billing cycle"`
  ```
  toastError('Error', response.message || 'Failed to create billing cycle');
  ```

- **Line 74**: `"Error creating billing cycle:"`
  ```
  console.error('Error creating billing cycle:', err);
  ```

- **Line 75**: `"Failed to create billing cycle"`
  ```
  toastError('Error', 'Failed to create billing cycle');
  ```

- **Line 94**: `"Failed to update billing cycle"`
  ```
  toastError('Error', response.message || 'Failed to update billing cycle');
  ```

- **Line 97**: `"Error updating billing cycle:"`
  ```
  console.error('Error updating billing cycle:', err);
  ```

- **Line 98**: `"Failed to update billing cycle"`
  ```
  toastError('Error', 'Failed to update billing cycle');
  ```

- **Line 113**: `"Failed to delete billing cycle"`
  ```
  toastError('Error', response.message || 'Failed to delete billing cycle');
  ```

- **Line 116**: `"Error deleting billing cycle:"`
  ```
  console.error('Error deleting billing cycle:', err);
  ```

- **Line 117**: `"Failed to delete billing cycle"`
  ```
  toastError('Error', 'Failed to delete billing cycle');
  ```

- **Line 135**: `"Failed to update billing cycle status"`
  ```
  toastError('Error', response.message || 'Failed to update billing cycle status');
  ```

- **Line 138**: `"Error updating billing cycle status:"`
  ```
  console.error('Error updating billing cycle status:', err);
  ```

- **Line 139**: `"Failed to update billing cycle status"`
  ```
  toastError('Error', 'Failed to update billing cycle status');
  ```

### apps/admin/app/sync/page.tsx

- **Line 195**: `"Unknown error"`
  ```
  addLog('error', `Failed to load merchants: ${response.message || 'Unknown error'}`);
  ```

- **Line 195**: `"Failed to load merchants: ${response.message || 'Unknown error'}"`
  ```
  addLog('error', `Failed to load merchants: ${response.message || 'Unknown error'}`);
  ```

- **Line 198**: `"Error fetching merchants:"`
  ```
  console.error('Error fetching merchants:', error);
  ```

- **Line 199**: `"Unknown error"`
  ```
  addLog('error', `Error fetching merchants: ${error.message || 'Unknown error'}`);
  ```

- **Line 199**: `"Error fetching merchants: ${error.message || 'Unknown error'}"`
  ```
  addLog('error', `Error fetching merchants: ${error.message || 'Unknown error'}`);
  ```

- **Line 282**: `"Request failed: ${error.message}"`
  ```
  addLog('error', `Request failed: ${error.message}`);
  ```

- **Line 315**: `"Authentication failed: ${errorData.message || 'Unauthorized'}"`
  ```
  addLog('error', `Authentication failed: ${errorData.message || 'Unauthorized'}`);
  ```

- **Line 321**: `"API error: ${errorData.message ||"`
  ```
  addLog('error', `API error: ${errorData.message || `HTTP ${response.status}`}`);
  ```

- **Line 361**: `"Failed to fetch first page: ${error.message}"`
  ```
  addLog('error', `Failed to fetch first page: ${error.message}`);
  ```

- **Line 433**: `"Failed to fetch first page: ${error.message}"`
  ```
  addLog('error', `Failed to fetch first page: ${error.message}`);
  ```

- **Line 517**: `"Failed to fetch first page: ${error.message}"`
  ```
  addLog('error', `Failed to fetch first page: ${error.message}`);
  ```

- **Line 559**: `"Validation Error"`
  ```
  toastError('Validation Error', 'Please fill in all required fields');
  ```

- **Line 559**: `"Please fill in all required fields"`
  ```
  toastError('Validation Error', 'Please fill in all required fields');
  ```

- **Line 560**: `"Preview failed: Missing required fields"`
  ```
  addLog('error', 'Preview failed: Missing required fields');
  ```

- **Line 596**: `"Failed to fetch customers"`
  ```
  error: error.message || 'Failed to fetch customers'
  ```

- **Line 619**: `"Failed to fetch products"`
  ```
  error: error.message || 'Failed to fetch products'
  ```

- **Line 648**: `"Failed to fetch orders"`
  ```
  error: error.message || 'Failed to fetch orders'
  ```

- **Line 662**: `"Preview error:"`
  ```
  console.error('Preview error:', error);
  ```

- **Line 663**: `"Unknown error"`
  ```
  addLog('error', `Preview error: ${error.message || 'Unknown error'}`);
  ```

- **Line 663**: `"Preview error: ${error.message || 'Unknown error'}"`
  ```
  addLog('error', `Preview error: ${error.message || 'Unknown error'}`);
  ```

- **Line 664**: `"Preview Error"`
  ```
  toastError('Preview Error', error.message || 'Failed to fetch preview');
  ```

- **Line 664**: `"Failed to fetch preview"`
  ```
  toastError('Preview Error', error.message || 'Failed to fetch preview');
  ```

- **Line 672**: `"Validation Error"`
  ```
  toastError('Validation Error', 'Please fill in all required fields');
  ```

- **Line 672**: `"Please fill in all required fields"`
  ```
  toastError('Validation Error', 'Please fill in all required fields');
  ```

- **Line 673**: `"Execute failed: Missing required fields"`
  ```
  addLog('error', 'Execute failed: Missing required fields');
  ```

- **Line 722**: `"Unknown error"`
  ```
  addLog('error', `Sync failed: ${data.message || 'Unknown error'}`);
  ```

- **Line 722**: `"Sync failed: ${data.message || 'Unknown error'}"`
  ```
  addLog('error', `Sync failed: ${data.message || 'Unknown error'}`);
  ```

- **Line 723**: `"Sync Failed"`
  ```
  toastError('Sync Failed', data.message || 'Sync failed');
  ```

- **Line 723**: `"Sync failed"`
  ```
  toastError('Sync Failed', data.message || 'Sync failed');
  ```

- **Line 735**: `"Sync error:"`
  ```
  console.error('Sync error:', error);
  ```

- **Line 736**: `"Unknown error"`
  ```
  addLog('error', `Sync error: ${error.message || 'Unknown error'}`);
  ```

- **Line 736**: `"Sync error: ${error.message || 'Unknown error'}"`
  ```
  addLog('error', `Sync error: ${error.message || 'Unknown error'}`);
  ```

- **Line 740**: `"Authentication Error"`
  ```
  toastError('Authentication Error', 'Your session has expired. Please log in again.');
  ```

- **Line 740**: `"Your session has expired. Please log in again."`
  ```
  toastError('Authentication Error', 'Your session has expired. Please log in again.');
  ```

- **Line 745**: `"Sync Error"`
  ```
  toastError('Sync Error', error.message || 'Failed to execute sync');
  ```

- **Line 745**: `"Failed to execute sync"`
  ```
  toastError('Sync Error', error.message || 'Failed to execute sync');
  ```

### apps/admin/app/forget-password/page.tsx

- **Line 22**: `"Failed to send reset email"`
  ```
  throw new Error(result.message || 'Failed to send reset email');
  ```

- **Line 29**: `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

- **Line 30**: `"Failed to send reset email. Please try again."`
  ```
  setError(error.message || 'Failed to send reset email. Please try again.');
  ```

### apps/admin/app/login/page.tsx

- **Line 48**: `"Login error:"`
  ```
  console.error('Login error:', err);
  ```

- **Line 49**: `"Network error. Please try again."`
  ```
  setLocalError('Network error. Please try again.');
  ```

### apps/client/app/customers/add/page.tsx

- **Line 68**: `"Failed to create customer"`
  ```
  throw new Error(response.error || 'Failed to create customer');
  ```

### apps/client/app/customers/[id]/edit/page.tsx

- **Line 56**: `"Failed to fetch customer"`
  ```
  throw new Error(response.error || 'Failed to fetch customer');
  ```

- **Line 92**: `"Failed to update customer"`
  ```
  throw new Error(response.error || 'Failed to update customer');
  ```

### apps/client/app/customers/[id]/orders/page.tsx

- **Line 95**: `"Failed to fetch customer"`
  ```
  throw new Error(response.error || 'Failed to fetch customer');
  ```

### apps/client/app/customers/[id]/page.tsx

- **Line 92**: `"Failed to fetch customer details"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer details';
  ```

### apps/client/app/customers/page.tsx

- **Line 368**: `"Error creating customer:"`
  ```
  console.error('Error creating customer:', error);
  ```

### apps/client/app/calendar/page.tsx

- **Line 91**: `"Failed to fetch calendar data"`
  ```
  setError(result.message || 'Failed to fetch calendar data');
  ```

- **Line 97**: `"An error occurred while fetching calendar data"`
  ```
  setError('An error occurred while fetching calendar data');
  ```

### apps/client/app/products/add/page.tsx

- **Line 50**: `"You must be associated with a merchant to create products. Please contact your administrator."`
  ```
  setError('You must be associated with a merchant to create products. Please contact your administrator.');
  ```

- **Line 74**: `"No product categories found. You need to create at least one category before you can add products."`
  ```
  setError('No product categories found. You need to create at least one category before you can add products.');
  ```

- **Line 79**: `"Failed to load categories. Please try again."`
  ```
  setError('Failed to load categories. Please try again.');
  ```

- **Line 89**: `"No outlets found for your merchant. You need to create at least one outlet before you can add products."`
  ```
  setError('No outlets found for your merchant. You need to create at least one outlet before you can add products.');
  ```

- **Line 94**: `"Failed to load outlets. Please try again."`
  ```
  setError('Failed to load outlets. Please try again.');
  ```

- **Line 100**: `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

- **Line 101**: `"Failed to load form data"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to load form data');
  ```

- **Line 172**: `"Failed to Load Form"`
  ```
  <h3 className="text-lg font-semibold mb-2">Failed to Load Form</h3>
  ```

- **Line 201**: `"Missing Required Data"`
  ```
  <h3 className="text-lg font-semibold mb-2">Missing Required Data</h3>
  ```

- **Line 205**: `"Outlets are required for inventory management."`
  ```
  {outlets.length === 0 && ' Outlets are required for inventory management.'}
  ```

### apps/client/app/products/[id]/edit/page.tsx

- **Line 73**: `"You must be associated with a merchant to edit products. Please contact your administrator."`
  ```
  throw new Error('You must be associated with a merchant to edit products. Please contact your administrator.');
  ```

- **Line 87**: `"Invalid merchant ID. Please contact your administrator."`
  ```
  throw new Error('Invalid merchant ID. Please contact your administrator.');
  ```

- **Line 107**: `"No outlets found for your merchant. You need to create at least one outlet before you can edit products."`
  ```
  setError('No outlets found for your merchant. You need to create at least one outlet before you can edit products.');
  ```

- **Line 113**: `"Failed to load outlets. Please try again."`
  ```
  setError('Failed to load outlets. Please try again.');
  ```

- **Line 119**: `"Error fetching product:"`
  ```
  console.error('Error fetching product:', err);
  ```

- **Line 120**: `"Failed to fetch product"`
  ```
  const errorMessage = err instanceof Error ? err.message : 'Failed to fetch product';
  ```

- **Line 201**: `"The product you are trying to edit could not be found."`
  ```
  {error || 'The product you are trying to edit could not be found.'}
  ```

### apps/client/app/products/[id]/orders/page.tsx

- **Line 59**: `"Error fetching product:"`
  ```
  console.error('Error fetching product:', err);
  ```

- **Line 60**: `"Failed to fetch product"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to fetch product');
  ```

- **Line 93**: `"The product you are looking for could not be found."`
  ```
  {error || 'The product you are looking for could not be found.'}
  ```

### apps/client/app/products/[id]/page.tsx

- **Line 73**: `"Error fetching product:"`
  ```
  console.error('Error fetching product:', err);
  ```

- **Line 74**: `"Failed to fetch product"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to fetch product');
  ```

- **Line 100**: `"Error deleting product:"`
  ```
  console.error('Error deleting product:', err);
  ```

### apps/client/app/products/page.tsx

- **Line 330**: `"Error creating product:"`
  ```
  console.error('Error creating product:', error);
  ```

### apps/client/app/[tenantKey]/products/page.tsx

- **Line 46**: `"Failed to fetch products: ${response.statusText}"`
  ```
  throw new Error(`Failed to fetch products: ${response.statusText}`);
  ```

### apps/client/app/plans/page.tsx

- **Line 115**: `"Error fetching data:"`
  ```
  console.error('Error fetching data:', err);
  ```

- **Line 116**: `"Failed to fetch plans data"`
  ```
  const errorMessage = err instanceof Error ? err.message : 'Failed to fetch plans data';
  ```

- **Line 170**: `"Error purchasing plan: ${result.message}"`
  ```
  toastError('Error', `Error purchasing plan: ${result.message}`);
  ```

- **Line 173**: `"Error purchasing plan:"`
  ```
  console.error('Error purchasing plan:', err);
  ```

- **Line 174**: `"Error purchasing plan"`
  ```
  const errorMessage = err instanceof Error ? err.message : 'Error purchasing plan';
  ```

### apps/client/app/outlets/page.tsx

- **Line 642**: `"Error creating outlet:"`
  ```
  console.error("Error creating outlet:", error);
  ```

### apps/client/app/terms/page.tsx

- **Line 73**: `"The app is provided"`
  ```
  <li>{isVi ? 'Ứng dụng cung cấp "như hiện có"; không bảo đảm không lỗi/không gián đoạn.' : 'The app is provided "as is"; no guarantees of error‑free or uninterrupted service.'}</li>
  ```

### apps/client/app/subscription/page.tsx

- **Line 118**: `"Error fetching subscription:"`
  ```
  console.error('Error fetching subscription:', error);
  ```

- **Line 119**: `"Failed to fetch subscription data"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'Failed to fetch subscription data';
  ```

### apps/client/app/dashboard/page.tsx

- **Line 537**: `"Error fetching dashboard data:"`
  ```
  console.error('Error fetching dashboard data:', error);
  ```

- **Line 538**: `"Failed to fetch dashboard data"`
  ```
  const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
  ```

- **Line 802**: `"Error creating customer:"`
  ```
  console.error('Error creating customer:', error);
  ```

- **Line 827**: `"Error creating product:"`
  ```
  console.error('Error creating product:', error);
  ```

### apps/client/app/users/[id]/page.tsx

- **Line 80**: `"Failed to fetch user"`
  ```
  throw new Error(response.error || 'Failed to fetch user');
  ```

- **Line 105**: `"Invalid user ID format:"`
  ```
  console.error('Invalid user ID format:', userId);
  ```

- **Line 114**: `"Error refreshing user data:"`
  ```
  console.error('Error refreshing user data:', error);
  ```

- **Line 140**: `"Invalid user ID format"`
  ```
  throw new Error('Invalid user ID format');
  ```

- **Line 166**: `"Failed to update user"`
  ```
  throw new Error(response.error || 'Failed to update user');
  ```

- **Line 171**: `"An error occurred while updating the user"`
  ```
  const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating the user';
  ```

- **Line 172**: `"Update Failed"`
  ```
  toastError('Update Failed', errorMessage);
  ```

- **Line 191**: `"Activation Failed"`
  ```
  toastError('Activation Failed', response.error || 'Failed to activate user');
  ```

- **Line 191**: `"Failed to activate user"`
  ```
  toastError('Activation Failed', response.error || 'Failed to activate user');
  ```

- **Line 194**: `"Error activating user:"`
  ```
  console.error('Error activating user:', err);
  ```

- **Line 195**: `"Activation Failed"`
  ```
  toastError('Activation Failed', 'An error occurred while activating the user');
  ```

- **Line 195**: `"An error occurred while activating the user"`
  ```
  toastError('Activation Failed', 'An error occurred while activating the user');
  ```

- **Line 221**: `"Deactivation Failed"`
  ```
  toastError('Deactivation Failed', response.error || 'Failed to deactivate user');
  ```

- **Line 221**: `"Failed to deactivate user"`
  ```
  toastError('Deactivation Failed', response.error || 'Failed to deactivate user');
  ```

- **Line 224**: `"Error deactivating user:"`
  ```
  console.error('Error deactivating user:', err);
  ```

- **Line 225**: `"Deactivation Failed"`
  ```
  toastError('Deactivation Failed', 'An error occurred while deactivating the user');
  ```

- **Line 225**: `"An error occurred while deactivating the user"`
  ```
  toastError('Deactivation Failed', 'An error occurred while deactivating the user');
  ```

- **Line 242**: `"Deletion Failed"`
  ```
  toastError('Deletion Failed', response.error || 'Failed to delete user');
  ```

- **Line 242**: `"Failed to delete user"`
  ```
  toastError('Deletion Failed', response.error || 'Failed to delete user');
  ```

- **Line 245**: `"Error deleting user:"`
  ```
  console.error('Error deleting user:', err);
  ```

- **Line 246**: `"Deletion Failed"`
  ```
  toastError('Deletion Failed', 'An error occurred while deleting the user');
  ```

- **Line 246**: `"An error occurred while deleting the user"`
  ```
  toastError('Deletion Failed', 'An error occurred while deleting the user');
  ```

### apps/client/app/users/page.tsx

- **Line 417**: `"Error creating user:"`
  ```
  console.error('Error creating user:', error);
  ```

### apps/client/app/reset-password/page.tsx

- **Line 19**: `"Invalid reset link. Please request a new password reset."`
  ```
  setError('Invalid reset link. Please request a new password reset.');
  ```

- **Line 35**: `"Reset link is invalid or has expired. Please request a new password reset."`
  ```
  throw new Error('Reset link is invalid or has expired. Please request a new password reset.');
  ```

- **Line 37**: `"This reset link has already been used. Please request a new password reset."`
  ```
  throw new Error('This reset link has already been used. Please request a new password reset.');
  ```

- **Line 39**: `"Failed to reset password"`
  ```
  throw new Error(result.message || 'Failed to reset password');
  ```

- **Line 51**: `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

- **Line 52**: `"Failed to reset password. Please try again."`
  ```
  setError(error.message || 'Failed to reset password. Please try again.');
  ```

- **Line 67**: `"Invalid reset link. Please request a new password reset."`
  ```
  <p>{error || 'Invalid reset link. Please request a new password reset.'}</p>
  ```

### apps/client/app/orders/[id]/edit/page.tsx

- **Line 104**: `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 201**: `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

- **Line 254**: `"Error fetching outlet products:"`
  ```
  console.error('Error fetching outlet products:', err);
  ```

- **Line 297**: `"Error updating order:"`
  ```
  console.error('Error updating order:', err);
  ```

### apps/client/app/orders/[id]/page.tsx

- **Line 48**: `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 80**: `"Failed to cancel order"`
  ```
  throw new Error(result.error || 'Failed to cancel order');
  ```

- **Line 83**: `"Error cancelling order:"`
  ```
  console.error('Error cancelling order:', err);
  ```

- **Line 103**: `"Failed to update order status"`
  ```
  throw new Error(result.error || 'Failed to update order status');
  ```

- **Line 106**: `"Error updating order status:"`
  ```
  console.error('Error updating order status:', err);
  ```

- **Line 129**: `"Failed to pickup order"`
  ```
  throw new Error(result.error || 'Failed to pickup order');
  ```

- **Line 132**: `"Error picking up order:"`
  ```
  console.error('Error picking up order:', err);
  ```

- **Line 154**: `"Failed to return order"`
  ```
  throw new Error(result.error || 'Failed to return order');
  ```

- **Line 157**: `"Error returning order:"`
  ```
  console.error('Error returning order:', err);
  ```

- **Line 195**: `"Failed to save order settings"`
  ```
  throw new Error(result.error || 'Failed to save order settings');
  ```

- **Line 198**: `"Error saving order settings:"`
  ```
  console.error('Error saving order settings:', err);
  ```

- **Line 199**: `"Save Failed"`
  ```
  toastError('Save Failed', 'Failed to save order settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
  ```

- **Line 199**: `"Failed to save order settings:"`
  ```
  toastError('Save Failed', 'Failed to save order settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
  ```

- **Line 199**: `"Unknown error"`
  ```
  toastError('Save Failed', 'Failed to save order settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
  ```

- **Line 253**: `"Error Loading Order"`
  ```
  <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Order</h1>
  ```

### apps/client/app/orders/page.tsx

- **Line 289**: `"Update Failed"`
  ```
  toastError('Update Failed', (error as Error).message);
  ```

- **Line 307**: `"Update Failed"`
  ```
  toastError('Update Failed', (error as Error).message);
  ```

### apps/client/app/orders/create/page.tsx

- **Line 73**: `"Failed to fetch customers:"`
  ```
  console.error('Failed to fetch customers:', customersRes.error);
  ```

- **Line 82**: `"Failed to fetch products:"`
  ```
  console.error('Failed to fetch products:', productsRes.error);
  ```

- **Line 117**: `"Failed to fetch outlets:"`
  ```
  console.error('Failed to fetch outlets:', outletsRes.error);
  ```

- **Line 120**: `"Error loading data for order creation:"`
  ```
  console.error('Error loading data for order creation:', error);
  ```

- **Line 139**: `"Failed to create order"`
  ```
  throw new Error(result.error || 'Failed to create order');
  ```

- **Line 142**: `"Create order failed:"`
  ```
  console.error('Create order failed:', err);
  ```

### apps/client/app/forget-password/page.tsx

- **Line 22**: `"Failed to send reset email"`
  ```
  throw new Error(result.message || 'Failed to send reset email');
  ```

- **Line 29**: `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

- **Line 30**: `"Failed to send reset email. Please try again."`
  ```
  setError(error.message || 'Failed to send reset email. Please try again.');
  ```

### apps/client/app/page.tsx

- **Line 608**: `"Failed to load plans"`
  ```
  setError(response.error || 'Failed to load plans');
  ```

- **Line 612**: `"Failed to load plans"`
  ```
  setError(err instanceof Error ? err.message : 'Failed to load plans');
  ```

- **Line 667**: `"Failed to parse features JSON:"`
  ```
  console.warn('Failed to parse features JSON:', e);
  ```

### apps/client/app/categories/page.tsx

- **Line 299**: `"Error creating category:"`
  ```
  console.error('Error creating category:', error);
  ```

- **Line 338**: `"Error updating category:"`
  ```
  console.error('Error updating category:', error);
  ```

### apps/client/app/pricing/page.tsx

- **Line 86**: `"No login required for customers"`
  ```
  <span>No login required for customers</span>
  ```

### apps/client/app/login/page.tsx

- **Line 49**: `"Login failed. Please try again."`
  ```
  setLocalError(error.message || 'Login failed. Please try again.');
  ```

## 5. Console/Alert Messages

**Total Found**: 391

### packages/ui/src/components/ui/product-availability-async-display.tsx

- **Line 57** (console.error): `"Availability check error:"`
  ```
  console.error('Availability check error:', err);
  ```

### packages/ui/src/components/forms/LoginForm.tsx

- **Line 63** (console.error): `"Login failed:"`
  ```
  console.error("Login failed:", error);
  ```

### packages/ui/src/components/forms/ResetPasswordForm.tsx

- **Line 66** (console.error): `"Password reset failed:"`
  ```
  console.error("Password reset failed:", error);
  ```

### packages/ui/src/components/forms/ForgetPasswordForm.tsx

- **Line 57** (console.error): `"Password reset failed:"`
  ```
  console.error("Password reset failed:", error);
  ```

### packages/ui/src/components/forms/CreateOrderForm/CreateOrderForm.tsx

- **Line 197** (console.error): `"Error searching products:"`
  ```
  console.error('Error searching products:', error);
  ```

- **Line 283** (console.warn): `"Availability API failed, falling back to basic stock check"`
  ```
  console.warn('Availability API failed, falling back to basic stock check');
  ```

- **Line 287** (console.error): `"Error checking availability via API:"`
  ```
  console.error('Error checking availability via API:', error);
  ```

- **Line 317** (console.error): `"Fallback availability check also failed:"`
  ```
  console.error('Fallback availability check also failed:', fallbackError);
  ```

### packages/ui/src/components/forms/CreateOrderForm/hooks/useProductSearch.ts

- **Line 55** (console.error): `"Error searching products:"`
  ```
  console.error('Error searching products:', error);
  ```

- **Line 80** (console.error): `"Error searching products:"`
  ```
  console.error('Error searching products:', error);
  ```

### packages/ui/src/components/forms/CreateOrderForm/hooks/useCustomerSearch.ts

- **Line 47** (console.error): `"Error searching customers:"`
  ```
  console.error('Error searching customers:', error);
  ```

### packages/ui/src/components/forms/ProductForm.tsx

- **Line 198** (console.error): `"Error parsing durationConfig:"`
  ```
  console.error('Error parsing durationConfig:', e);
  ```

- **Line 669** (console.error): `"Upload failed:"`
  ```
  console.error('Upload failed:', uploadResult.error);
  ```

- **Line 682** (console.error): `"Upload error:"`
  ```
  console.error('Upload error:', error);
  ```

### packages/ui/src/components/forms/PlanForm.tsx

- **Line 186** (console.error): `"Error submitting plan:"`
  ```
  console.error('Error submitting plan:', error);
  ```

### packages/ui/src/components/features/Customers/components/CustomerOrdersDialog.tsx

- **Line 103** (console.error): `"Error fetching customer orders:"`
  ```
  console.error('Error fetching customer orders:', err);
  ```

### packages/ui/src/components/features/Customers/components/CustomerActions.tsx

- **Line 43** (console.error): `"Customer missing id for navigation:"`
  ```
  console.error('Customer missing id for navigation:', customer);
  ```

- **Line 52** (console.error): `"Customer missing id for navigation:"`
  ```
  console.error('Customer missing id for navigation:', customer);
  ```

### packages/ui/src/components/features/Customers/components/CustomerDetailDialog.tsx

- **Line 107** (console.error): `"Error deleting customer:"`
  ```
  console.error('Error deleting customer:', error);
  ```

### packages/ui/src/components/features/Customers/components/CustomerForm.tsx

- **Line 131** (console.error): `"Error saving customer:"`
  ```
  console.error('Error saving customer:', error);
  ```

### packages/ui/src/components/features/Customers/Customers.tsx

- **Line 106** (console.log): `"Add customer functionality should be implemented in page"`
  ```
  console.log('Add customer functionality should be implemented in page');
  ```

### packages/ui/src/components/features/Settings/Settings.tsx

- **Line 264** (console.error): `"Error fetching subscription data:"`
  ```
  console.error('Error fetching subscription data:', error);
  ```

- **Line 456** (console.error): `"Error signing out:"`
  ```
  console.error('Error signing out:', error);
  ```

### packages/ui/src/components/features/Settings/components/PricingSection.tsx

- **Line 57** (console.error): `"Failed to load merchant data:"`
  ```
  console.error('Failed to load merchant data:', error);
  ```

- **Line 74** (console.error): `"Validation failed:"`
  ```
  console.error('Validation failed:', validation.error);
  ```

- **Line 91** (console.error): `"Failed to update pricing config:"`
  ```
  console.error('Failed to update pricing config:', error);
  ```

### packages/ui/src/components/features/Settings/components/MerchantSection.tsx

- **Line 163** (console.error): `"Failed to auto-update currency:"`
  ```
  console.error('Failed to auto-update currency:', error);
  ```

- **Line 192** (console.error): `"Failed to copy link:"`
  ```
  console.error('Failed to copy link:', error);
  ```

### packages/ui/src/components/features/Payments/components/PaymentForm.tsx

- **Line 303** (alert): `"Please specify months to extend when extending subscription"`
  ```
  alert('Please specify months to extend when extending subscription');
  ```

### packages/ui/src/components/features/Products/components/ProductOrdersView.tsx

- **Line 275** (console.error): `"Error refreshing product orders:"`
  ```
  console.error('Error refreshing product orders:', err);
  ```

- **Line 285** (console.log): `"Export orders for product:"`
  ```
  console.log('Export orders for product:', productId);
  ```

### packages/ui/src/components/features/Products/components/ProductOrdersDialog.tsx

- **Line 67** (console.error): `"Error fetching product orders:"`
  ```
  console.error('Error fetching product orders:', error);
  ```

### packages/ui/src/components/features/Products/Products.tsx

- **Line 102** (console.log): `"Add product functionality should be implemented in page"`
  ```
  console.log('Add product functionality should be implemented in page');
  ```

### packages/ui/src/components/features/Plans/components/PlanDialog.tsx

- **Line 66** (console.error): `"Error submitting plan:"`
  ```
  console.error('Error submitting plan:', error);
  ```

### packages/ui/src/components/features/Outlets/components/AddOutletForm.tsx

- **Line 60** (console.error): `"Error saving outlet:"`
  ```
  console.error('Error saving outlet:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/UpgradeTrialModal.tsx

- **Line 102** (console.error): `"Upgrade failed:"`
  ```
  console.error('Upgrade failed:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionForm.tsx

- **Line 264** (console.error): `"Error submitting subscription:"`
  ```
  console.error('Error submitting subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionEditDialog.tsx

- **Line 101** (console.error): `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionEditDemo.tsx

- **Line 176** (console.log): `"Updating subscription with data:"`
  ```
  console.log('Updating subscription with data:', data);
  ```

- **Line 184** (console.error): `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/ManualRenewalModal.tsx

- **Line 132** (console.error): `"Renewal failed:"`
  ```
  console.error('Renewal failed:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionHistoryDialog.tsx

- **Line 38** (console.error): `"Error fetching subscription history:"`
  ```
  console.error('Error fetching subscription history:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionFormSimple.tsx

- **Line 202** (console.error): `"Error submitting subscription:"`
  ```
  console.error('Error submitting subscription:', error);
  ```

### packages/ui/src/components/features/Subscriptions/components/SubscriptionPreviewPage.tsx

- **Line 67** (console.error): `"Error fetching plans:"`
  ```
  console.error('Error fetching plans:', err);
  ```

### packages/ui/src/components/features/Merchants/components/MerchantPlanManagement.tsx

- **Line 275** (console.error): `"Failed to renew subscription:"`
  ```
  console.error('Failed to renew subscription:', error);
  ```

- **Line 292** (console.error): `"Error canceling subscription:"`
  ```
  console.error('Error canceling subscription:', error);
  ```

- **Line 324** (console.error): `"Error changing plan:"`
  ```
  console.error('Error changing plan:', error);
  ```

- **Line 340** (console.error): `"Error suspending subscription:"`
  ```
  console.error('Error suspending subscription:', error);
  ```

- **Line 354** (console.error): `"Error reactivating subscription:"`
  ```
  console.error('Error reactivating subscription:', error);
  ```

### packages/ui/src/components/features/Merchants/components/MerchantPlanDialog.tsx

- **Line 133** (console.error): `"Error changing plan:"`
  ```
  console.error('Error changing plan:', error);
  ```

### packages/ui/src/components/features/Merchants/components/MerchantSubscriptionSection.tsx

- **Line 73** (console.log): `"Activities not yet implemented or error:"`
  ```
  console.log('Activities not yet implemented or error:', err);
  ```

- **Line 84** (console.log): `"Payments not yet implemented or error:"`
  ```
  console.log('Payments not yet implemented or error:', err);
  ```

- **Line 88** (console.error): `"Error fetching history:"`
  ```
  console.error('Error fetching history:', error);
  ```

- **Line 127** (console.error): `"Error calculating days remaining:"`
  ```
  console.error('Error calculating days remaining:', error);
  ```

### packages/ui/src/components/features/Users/components/UserForm.tsx

- **Line 181** (console.error): `"Error loading merchants:"`
  ```
  console.error('Error loading merchants:', error);
  ```

### packages/ui/src/components/features/Users/Users.tsx

- **Line 119** (console.log): `"Add user functionality should be implemented in page"`
  ```
  console.log('Add user functionality should be implemented in page');
  ```

### packages/ui/src/components/features/OrderDetail/components/CollectionReturnModal.tsx

- **Line 86** (console.error): `"Error in modal confirmation:"`
  ```
  console.error('Error in modal confirmation:', error);
  ```

### packages/ui/src/components/features/Orders/RentalPeriodSelector.tsx

- **Line 97** (console.error): `"Price calculation error:"`
  ```
  console.error('Price calculation error:', error);
  ```

### packages/ui/src/components/features/Orders/components/OrderFilters.tsx

- **Line 121** (console.error): `"Error fetching outlets:"`
  ```
  console.error('Error fetching outlets:', error);
  ```

- **Line 154** (console.error): `"Error fetching merchants:"`
  ```
  console.error('Error fetching merchants:', error);
  ```

### packages/ui/src/components/features/Categories/components/CategoryFormContent.tsx

- **Line 102** (console.error): `"Error saving category:"`
  ```
  console.error('Error saving category:', error);
  ```

### packages/middleware/src/subscription-manager.ts

- **Line 183** (console.error): `"Subscription validation error:"`
  ```
  console.error('Subscription validation error:', error);
  ```

- **Line 318** (console.error): `"Subscription validation middleware error:"`
  ```
  console.error('Subscription validation middleware error:', error);
  ```

### packages/middleware/src/auth/auth.ts

- **Line 90** (console.error): `"Auth middleware error:"`
  ```
  console.error('Auth middleware error:', error);
  ```

### packages/middleware/src/audit/audit-context.ts

- **Line 68** (console.error): `"Error extracting user context for audit:"`
  ```
  console.error('Error extracting user context for audit:', error);
  ```

### packages/database/src/subscription.ts

- **Line 594** (console.error): `"Error cancelling subscription:"`
  ```
  console.error('Error cancelling subscription:', error);
  ```

### packages/database/src/plan.ts

- **Line 60** (console.error): `"Error getting plan by public ID:"`
  ```
  console.error('Error getting plan by public ID:', error);
  ```

- **Line 92** (console.error): `"Error getting all plans:"`
  ```
  console.error('Error getting all plans:', error);
  ```

- **Line 154** (console.error): `"Error searching plans:"`
  ```
  console.error('Error searching plans:', error);
  ```

- **Line 196** (console.error): `"Error creating plan:"`
  ```
  console.error('Error creating plan:', error);
  ```

- **Line 241** (console.error): `"Error updating plan:"`
  ```
  console.error('Error updating plan:', error);
  ```

- **Line 260** (console.error): `"Error deleting plan:"`
  ```
  console.error('Error deleting plan:', error);
  ```

- **Line 295** (console.error): `"Error getting active plans:"`
  ```
  console.error('Error getting active plans:', error);
  ```

- **Line 317** (console.error): `"Error getting plan stats:"`
  ```
  console.error('Error getting plan stats:', error);
  ```

### packages/database/src/registration.ts

- **Line 88** (console.error): `"Registration error:"`
  ```
  console.error('Registration error:', error);
  ```

### packages/auth/src/middleware.ts

- **Line 72** (console.error): `"Optional authentication error:"`
  ```
  console.error('Optional authentication error:', error);
  ```

### packages/auth/src/core.ts

- **Line 153** (console.error): `"Subscription status check error:"`
  ```
  console.error('Subscription status check error:', error);
  ```

- **Line 399** (console.error): `"Authentication error:"`
  ```
  console.error('Authentication error:', error);
  ```

### packages/utils/src/core/validation.ts

- **Line 657** (console.error): `"Error getting entity counts:"`
  ```
  console.error('Error getting entity counts:', error);
  ```

- **Line 721** (console.error): `"Error getting plan limits info:"`
  ```
  console.error('Error getting plan limits info:', error);
  ```

- **Line 770** (console.error): `"Error validating plan limits:"`
  ```
  console.error('Error validating plan limits:', error);
  ```

### packages/utils/src/core/date.ts

- **Line 217** (console.warn): `"Date formatting error:"`
  ```
  console.warn('Date formatting error:', error);
  ```

### packages/utils/src/core/subscription-manager.ts

- **Line 124** (console.error): `"Error checking subscription status:"`
  ```
  console.error('Error checking subscription status:', error);
  ```

- **Line 141** (console.error): `"Error checking subscription status:"`
  ```
  console.error('Error checking subscription status:', error);
  ```

- **Line 284** (console.error): `"Subscription validation error:"`
  ```
  console.error('Subscription validation error:', error);
  ```

### packages/utils/src/core/common.ts

- **Line 485** (console.error): `"Operation failed:"`
  ```
  console.error('Operation failed:', error);
  ```

- **Line 560** (console.warn): `"Failed to parse authData:"`
  ```
  console.warn('Failed to parse authData:', error);
  ```

- **Line 584** (console.warn): `"Failed to decode JWT token for expiration check:"`
  ```
  console.warn('Failed to decode JWT token for expiration check:', error);
  ```

- **Line 631** (console.error): `"Failed to parse stored user data:"`
  ```
  console.error('Failed to parse stored user data:', error);
  ```

- **Line 655** (console.warn): `"Failed to decode JWT token for expiration time:"`
  ```
  console.warn('Failed to decode JWT token for expiration time:', error);
  ```

### packages/utils/src/core/audit-helper.ts

- **Line 87** (console.error): `"Failed to log CREATE audit:"`
  ```
  console.error('Failed to log CREATE audit:', error);
  ```

- **Line 160** (console.error): `"Failed to log UPDATE audit:"`
  ```
  console.error('Failed to log UPDATE audit:', error);
  ```

- **Line 193** (console.error): `"Failed to log DELETE audit:"`
  ```
  console.error('Failed to log DELETE audit:', error);
  ```

- **Line 229** (console.error): `"Failed to log CUSTOM audit:"`
  ```
  console.error('Failed to log CUSTOM audit:', error);
  ```

### packages/utils/src/core/pricing-calculator.ts

- **Line 563** (console.error): `"Error parsing product duration limits:"`
  ```
  console.error('Error parsing product duration limits:', error);
  ```

- **Line 690** (console.error): `"Error getting duration limits:"`
  ```
  console.error('Error getting duration limits:', error);
  ```

### packages/utils/src/api/aws-s3.ts

- **Line 337** (console.error): `"AWS S3 stream upload error:"`
  ```
  console.error('AWS S3 stream upload error:', {
  ```

- **Line 372** (console.error): `"AWS S3 delete error:"`
  ```
  console.error('AWS S3 delete error:', error);
  ```

- **Line 495** (console.error): `"AWS S3 presigned URL error:"`
  ```
  console.error('AWS S3 presigned URL error:', error);
  ```

- **Line 529** (console.error): `"AWS S3 access URL error:"`
  ```
  console.error('AWS S3 access URL error:', error);
  ```

- **Line 564** (console.warn): `"Failed to normalize image key:"`
  ```
  console.warn('Failed to normalize image key:', error);
  ```

- **Line 589** (console.warn): `"Failed to normalize image URL:"`
  ```
  console.warn('Failed to normalize image URL:', error);
  ```

- **Line 605** (console.error): `"Error extracting S3 key from URL:"`
  ```
  console.error('Error extracting S3 key from URL:', error);
  ```

### packages/utils/src/api/upload.ts

- **Line 189** (console.warn): `"Image compression failed, using original file:"`
  ```
  console.warn('Image compression failed, using original file:', error);
  ```

- **Line 451** (console.warn): `"Image compression failed, trying resize fallback:"`
  ```
  console.warn('Image compression failed, trying resize fallback:', compressionError);
  ```

- **Line 463** (console.warn): `"Client-side resize also failed, uploading original:"`
  ```
  console.warn('Client-side resize also failed, uploading original:', resizeError);
  ```

- **Line 478** (console.warn): `"Client-side resize failed, uploading original:"`
  ```
  console.warn('Client-side resize failed, uploading original:', resizeError);
  ```

- **Line 496** (console.error): `"Railway Volume upload failed:"`
  ```
  console.error('Railway Volume upload failed:', error);
  ```

### packages/utils/src/api/auth.ts

- **Line 38** (console.error): `"Login error:"`
  ```
  console.error('Login error:', error);
  ```

- **Line 124** (console.error): `"Resend verification error:"`
  ```
  console.error('Resend verification error:', error);
  ```

### packages/utils/src/sync/imageSync.ts

- **Line 92** (console.error): `"Error processing product images:"`
  ```
  console.error('Error processing product images:', error);
  ```

### packages/hooks/src/hooks/useAuthErrorHandler.ts

- **Line 10** (console.error): `"Authentication error detected:"`
  ```
  console.error('Authentication error detected:', error);
  ```

### packages/hooks/src/hooks/useSubscriptionError.ts

- **Line 33** (console.error): `"Subscription error:"`
  ```
  console.error('Subscription error:', error);
  ```

### packages/hooks/src/hooks/useSubscriptionStatusInfo.ts

- **Line 162** (console.error): `"Error fetching subscription status:"`
  ```
  console.error('Error fetching subscription status:', error);
  ```

### packages/hooks/src/hooks/useCurrency.tsx

- **Line 138** (console.warn): `"Failed to load currency settings from localStorage:"`
  ```
  console.warn('Failed to load currency settings from localStorage:', error);
  ```

### packages/hooks/src/hooks/useSubscriptionsData.ts

- **Line 100** (console.error): `"Invalid subscriptions data structure:"`
  ```
  console.error('Invalid subscriptions data structure:', apiData);
  ```

### packages/hooks/src/hooks/useAuth.ts

- **Line 178** (console.error): `"Error refreshing user:"`
  ```
  console.error('Error refreshing user:', err);
  ```

### packages/errors/src/index.ts

- **Line 25** (console.error): `"Unexpected error:"`
  ```
  console.error('Unexpected error:', error);
  ```

### apps/admin/app/audit-logs/page.tsx

- **Line 430** (console.error): `"Failed to load audit statistics:"`
  ```
  console.error('Failed to load audit statistics:', error);
  ```

### apps/admin/app/settings/billing/page.tsx

- **Line 110** (console.error): `"Error saving billing config:"`
  ```
  console.error('Error saving billing config:', error);
  ```

### apps/admin/app/payments/page.tsx

- **Line 119** (console.error): `"Error processing payment:"`
  ```
  console.error('Error processing payment:', error);
  ```

- **Line 129** (console.error): `"Error refunding payment:"`
  ```
  console.error('Error refunding payment:', error);
  ```

- **Line 136** (console.log): `"Downloading receipt for payment:"`
  ```
  console.log('Downloading receipt for payment:', payment.id);
  ```

- **Line 139** (console.error): `"Error downloading receipt:"`
  ```
  console.error('Error downloading receipt:', error);
  ```

### apps/admin/app/plans/page.tsx

- **Line 203** (console.error): `"Error deleting plan:"`
  ```
  console.error('Error deleting plan:', error);
  ```

- **Line 236** (console.error): `"Error saving plan:"`
  ```
  console.error('Error saving plan:', error);
  ```

- **Line 260** (console.error): `"Error toggling plan status:"`
  ```
  console.error('Error toggling plan status:', error);
  ```

### apps/admin/app/plan-variants/page.tsx

- **Line 123** (console.error): `"Failed to fetch plan variants:"`
  ```
  console.error('Failed to fetch plan variants:', response.error);
  ```

- **Line 126** (console.error): `"Error fetching plan variants:"`
  ```
  console.error('Error fetching plan variants:', error);
  ```

- **Line 141** (console.error): `"Error fetching plans:"`
  ```
  console.error('Error fetching plans:', error);
  ```

- **Line 154** (console.error): `"Error fetching deleted variants:"`
  ```
  console.error('Error fetching deleted variants:', error);
  ```

- **Line 172** (console.error): `"Error deleting plan variant:"`
  ```
  console.error('Error deleting plan variant:', error);
  ```

- **Line 191** (console.error): `"Error restoring plan variant:"`
  ```
  console.error('Error restoring plan variant:', error);
  ```

- **Line 209** (console.error): `"Error applying discount:"`
  ```
  console.error('Error applying discount:', error);
  ```

- **Line 231** (console.error): `"Error saving plan variant:"`
  ```
  console.error('Error saving plan variant:', error);
  ```

### apps/admin/app/subscriptions/[id]/edit/page.tsx

- **Line 57** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 80** (console.error): `"Error updating subscription:"`
  ```
  console.error('Error updating subscription:', error);
  ```

- **Line 81** (alert): `"Error updating subscription. Please try again."`
  ```
  alert('Error updating subscription. Please try again.');
  ```

### apps/admin/app/subscriptions/[id]/preview/page.tsx

- **Line 101** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 131** (console.error): `"Renewal error:"`
  ```
  console.error('Renewal error:', error);
  ```

- **Line 164** (console.error): `"Upgrade error:"`
  ```
  console.error('Upgrade error:', error);
  ```

### apps/admin/app/subscriptions/[id]/page-enhanced.tsx

- **Line 99** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 129** (console.error): `"Renewal error:"`
  ```
  console.error('Renewal error:', error);
  ```

- **Line 162** (console.error): `"Upgrade error:"`
  ```
  console.error('Upgrade error:', error);
  ```

### apps/admin/app/subscriptions/[id]/page.tsx

- **Line 97** (console.error): `"Error fetching subscription:"`
  ```
  console.error('Error fetching subscription:', error);
  ```

- **Line 124** (console.error): `"Error extending subscription:"`
  ```
  console.error('Error extending subscription:', error);
  ```

- **Line 148** (console.error): `"Error deleting subscription:"`
  ```
  console.error('Error deleting subscription:', error);
  ```

- **Line 175** (console.error): `"Error suspending subscription:"`
  ```
  console.error('Error suspending subscription:', error);
  ```

- **Line 201** (console.error): `"Error cancelling subscription:"`
  ```
  console.error('Error cancelling subscription:', error);
  ```

### apps/admin/app/subscriptions/page.tsx

- **Line 124** (console.error): `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', error);
  ```

- **Line 170** (console.log): `"Updating subscription with data:"`
  ```
  console.log('Updating subscription with data:', editData);
  ```

- **Line 182** (console.error): `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

- **Line 282** (console.error): `"Error creating subscription:"`
  ```
  console.error('Error creating subscription:', error);
  ```

### apps/admin/app/subscriptions/create/page.tsx

- **Line 44** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 67** (console.error): `"Error creating subscription:"`
  ```
  console.error('Error creating subscription:', error);
  ```

- **Line 68** (alert): `"Error creating subscription. Please try again."`
  ```
  alert('Error creating subscription. Please try again.');
  ```

### apps/admin/app/subscription/page.tsx

- **Line 43** (console.error): `"Failed to fetch data:"`
  ```
  console.error('Failed to fetch data:', error);
  ```

- **Line 72** (console.error): `"Failed to update subscription:"`
  ```
  console.error('Failed to update subscription:', error);
  ```

### apps/admin/app/merchants/[id]/products/[productId]/orders/page.tsx

- **Line 73** (console.error): `"Error fetching product and orders:"`
  ```
  console.error('Error fetching product and orders:', err);
  ```

### apps/admin/app/merchants/[id]/products/[productId]/page.tsx

- **Line 53** (console.error): `"Error fetching product details:"`
  ```
  console.error('Error fetching product details:', error);
  ```

- **Line 78** (console.error): `"Error updating product:"`
  ```
  console.error('Error updating product:', error);
  ```

### apps/admin/app/merchants/[id]/products/page.tsx

- **Line 80** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

### apps/admin/app/merchants/[id]/outlets/[outletId]/page.tsx

- **Line 81** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

- **Line 105** (console.error): `"Error updating outlet:"`
  ```
  console.error('Error updating outlet:', error);
  ```

### apps/admin/app/merchants/[id]/outlets/page.tsx

- **Line 81** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

### apps/admin/app/merchants/[id]/edit/page.tsx

- **Line 100** (console.error): `"Error fetching merchant details:"`
  ```
  console.error('Error fetching merchant details:', error);
  ```

- **Line 124** (console.error): `"Error updating merchant:"`
  ```
  console.error('Error updating merchant:', err);
  ```

### apps/admin/app/merchants/[id]/users/[userId]/page.tsx

- **Line 64** (console.error): `"Error fetching user details:"`
  ```
  console.error('Error fetching user details:', error);
  ```

- **Line 99** (console.error): `"Error updating user:"`
  ```
  console.error('Error updating user:', error);
  ```

- **Line 130** (console.error): `"Error activating user:"`
  ```
  console.error('Error activating user:', error);
  ```

- **Line 158** (console.error): `"Error deactivating user:"`
  ```
  console.error('Error deactivating user:', error);
  ```

- **Line 182** (console.error): `"Error deactivating user:"`
  ```
  console.error('Error deactivating user:', error);
  ```

### apps/admin/app/merchants/[id]/orders/[orderId]/edit/page.tsx

- **Line 97** (console.error): `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 142** (console.error): `"Failed to fetch customers:"`
  ```
  console.error('Failed to fetch customers:', customersRes.error);
  ```

- **Line 150** (console.error): `"Failed to fetch products:"`
  ```
  console.error('Failed to fetch products:', productsRes.error);
  ```

- **Line 162** (console.error): `"Failed to fetch outlets:"`
  ```
  console.error('Failed to fetch outlets:', outletsRes.error);
  ```

- **Line 170** (console.error): `"Failed to fetch categories:"`
  ```
  console.error('Failed to fetch categories:', categoriesRes.error);
  ```

- **Line 173** (console.error): `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

- **Line 215** (console.error): `"Error updating order:"`
  ```
  console.error('Error updating order:', err);
  ```

### apps/admin/app/merchants/[id]/orders/[orderId]/page.tsx

- **Line 74** (console.error): `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 115** (console.error): `"Error cancelling order:"`
  ```
  console.error('Error cancelling order:', err);
  ```

- **Line 145** (console.error): `"Error updating order status:"`
  ```
  console.error('Error updating order status:', err);
  ```

- **Line 180** (console.error): `"Error marking order as picked up:"`
  ```
  console.error('Error marking order as picked up:', err);
  ```

- **Line 215** (console.error): `"Error marking order as returned:"`
  ```
  console.error('Error marking order as returned:', err);
  ```

### apps/admin/app/merchants/[id]/orders/page.tsx

- **Line 111** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', error);
  ```

### apps/admin/app/merchants/[id]/orders/create/page.tsx

- **Line 78** (console.error): `"Failed to fetch customers:"`
  ```
  console.error('Failed to fetch customers:', customersRes.error);
  ```

- **Line 86** (console.error): `"Failed to fetch products:"`
  ```
  console.error('Failed to fetch products:', productsRes.error);
  ```

- **Line 98** (console.error): `"Failed to fetch outlets:"`
  ```
  console.error('Failed to fetch outlets:', outletsRes.error);
  ```

- **Line 106** (console.error): `"Failed to fetch categories:"`
  ```
  console.error('Failed to fetch categories:', categoriesRes.error);
  ```

- **Line 109** (console.error): `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

- **Line 145** (console.error): `"Error creating order:"`
  ```
  console.error('Error creating order:', err);
  ```

### apps/admin/app/merchants/[id]/page.tsx

- **Line 60** (console.error): `"Error fetching merchant details:"`
  ```
  console.error('Error fetching merchant details:', error);
  ```

- **Line 129** (console.error): `"Failed to change plan:"`
  ```
  console.error('Failed to change plan:', response.message);
  ```

- **Line 132** (console.error): `"Error changing plan:"`
  ```
  console.error('Error changing plan:', error);
  ```

- **Line 144** (console.error): `"Failed to disable plan:"`
  ```
  console.error('Failed to disable plan:', response.message);
  ```

- **Line 147** (console.error): `"Error disabling plan:"`
  ```
  console.error('Error disabling plan:', error);
  ```

- **Line 159** (console.error): `"Failed to delete plan:"`
  ```
  console.error('Failed to delete plan:', response.message);
  ```

- **Line 162** (console.error): `"Error deleting plan:"`
  ```
  console.error('Error deleting plan:', error);
  ```

- **Line 195** (console.error): `"Error extending subscription:"`
  ```
  console.error('Error extending subscription:', error);
  ```

- **Line 211** (console.error): `"Failed to cancel subscription:"`
  ```
  console.error('Failed to cancel subscription:', response.message);
  ```

- **Line 214** (console.error): `"Error cancelling subscription:"`
  ```
  console.error('Error cancelling subscription:', error);
  ```

- **Line 226** (console.error): `"Failed to suspend subscription:"`
  ```
  console.error('Failed to suspend subscription:', response.message);
  ```

- **Line 229** (console.error): `"Error suspending subscription:"`
  ```
  console.error('Error suspending subscription:', error);
  ```

- **Line 243** (console.error): `"Failed to reactivate subscription:"`
  ```
  console.error('Failed to reactivate subscription:', response.message);
  ```

- **Line 246** (console.error): `"Error reactivating subscription:"`
  ```
  console.error('Error reactivating subscription:', error);
  ```

### apps/admin/app/merchants/page.tsx

- **Line 142** (console.log): `"Change plan for merchant:"`
  ```
  console.log('Change plan for merchant:', merchantId);
  ```

### apps/admin/app/dashboard/page.tsx

- **Line 684** (console.error): `"Error fetching system metrics:"`
  ```
  console.error('Error fetching system metrics:', error);
  ```

### apps/admin/app/system/audit-logs/page.tsx

- **Line 498** (console.error): `"Failed to load audit statistics:"`
  ```
  console.error('Failed to load audit statistics:', error);
  ```

### apps/admin/app/users/page.tsx

- **Line 276** (console.error): `"Error creating user:"`
  ```
  console.error('Error creating user:', error);
  ```

### apps/admin/app/reset-password/page.tsx

- **Line 51** (console.error): `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

### apps/admin/app/orders/[orderId]/page.tsx

- **Line 100** (console.error): `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 144** (console.error): `"Error cancelling order:"`
  ```
  console.error('Error cancelling order:', err);
  ```

- **Line 177** (console.error): `"Error updating order status:"`
  ```
  console.error('Error updating order status:', err);
  ```

- **Line 210** (console.error): `"Error picking up order:"`
  ```
  console.error('Error picking up order:', err);
  ```

- **Line 243** (console.error): `"Error returning order:"`
  ```
  console.error('Error returning order:', err);
  ```

- **Line 285** (console.error): `"Error saving order settings:"`
  ```
  console.error('Error saving order settings:', err);
  ```

### apps/admin/app/billing-cycles/page.tsx

- **Line 51** (console.error): `"Failed to fetch billing cycles:"`
  ```
  console.error('Failed to fetch billing cycles:', response.message);
  ```

- **Line 55** (console.error): `"Error fetching billing cycles:"`
  ```
  console.error('Error fetching billing cycles:', err);
  ```

- **Line 74** (console.error): `"Error creating billing cycle:"`
  ```
  console.error('Error creating billing cycle:', err);
  ```

- **Line 97** (console.error): `"Error updating billing cycle:"`
  ```
  console.error('Error updating billing cycle:', err);
  ```

- **Line 116** (console.error): `"Error deleting billing cycle:"`
  ```
  console.error('Error deleting billing cycle:', err);
  ```

- **Line 138** (console.error): `"Error updating billing cycle status:"`
  ```
  console.error('Error updating billing cycle status:', err);
  ```

### apps/admin/app/sync/page.tsx

- **Line 174** (console.log): `"User not authenticated or still loading, skipping merchants fetch"`
  ```
  console.log('User not authenticated or still loading, skipping merchants fetch');
  ```

- **Line 198** (console.error): `"Error fetching merchants:"`
  ```
  console.error('Error fetching merchants:', error);
  ```

- **Line 662** (console.error): `"Preview error:"`
  ```
  console.error('Preview error:', error);
  ```

- **Line 677** (confirm): `"Are you sure you want to execute sync? This will create records in the database."`
  ```
  if (!confirm('Are you sure you want to execute sync? This will create records in the database.')) {
  ```

- **Line 735** (console.error): `"Sync error:"`
  ```
  console.error('Sync error:', error);
  ```

### apps/admin/app/forget-password/page.tsx

- **Line 29** (console.error): `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

### apps/admin/app/login/page.tsx

- **Line 48** (console.error): `"Login error:"`
  ```
  console.error('Login error:', err);
  ```

### apps/admin/lib/auth/auth.ts

- **Line 77** (console.error): `"Error verifying token:"`
  ```
  console.error('Error verifying token:', error);
  ```

- **Line 165** (console.error): `"Failed to get current user:"`
  ```
  console.error('Failed to get current user:', error);
  ```

### apps/api/app/api/customers/route.ts

- **Line 29** (console.log): `"Validation error:"`
  ```
  console.log('Validation error:', parsed.error.flatten());
  ```

- **Line 130** (console.error): `"Error fetching customers:"`
  ```
  console.error('Error fetching customers:', error);
  ```

### apps/api/app/api/customers/export/route.ts

- **Line 96** (console.error): `"Error exporting customers:"`
  ```
  console.error('Error exporting customers:', error);
  ```

### apps/api/app/api/customers/[id]/orders/route.ts

- **Line 45** (console.error): `"Error fetching customer orders:"`
  ```
  console.error('Error fetching customer orders:', error);
  ```

### apps/api/app/api/customers/debug/route.ts

- **Line 22** (console.log): `"Missing required fields:"`
  ```
  console.log('Missing required fields:', missingFields);
  ```

- **Line 36** (console.log): `"Validation errors:"`
  ```
  console.log('Validation errors:', parsedBody.error.flatten());
  ```

- **Line 74** (console.log): `"Validation successful"`
  ```
  console.log('Validation successful');
  ```

- **Line 90** (console.error): `"Error in debug endpoint:"`
  ```
  console.error('Error in debug endpoint:', error);
  ```

### apps/api/app/api/audit-logs/route.ts

- **Line 61** (console.error): `"Error fetching audit logs:"`
  ```
  console.error('Error fetching audit logs:', error);
  ```

### apps/api/app/api/audit-logs/stats/route.ts

- **Line 44** (console.error): `"Error fetching audit statistics:"`
  ```
  console.error('Error fetching audit statistics:', error);
  ```

### apps/api/app/api/settings/outlet/route.ts

- **Line 97** (console.error): `"Error updating outlet information:"`
  ```
  console.error('Error updating outlet information:', error);
  ```

### apps/api/app/api/payments/manual/route.ts

- **Line 129** (console.error): `"Manual payment creation error:"`
  ```
  console.error('Manual payment creation error:', error);
  ```

### apps/api/app/api/payments/route.ts

- **Line 101** (console.error): `"Error fetching payments:"`
  ```
  console.error('Error fetching payments:', error);
  ```

### apps/api/app/api/payments/process/route.ts

- **Line 40** (console.error): `"Error processing payment:"`
  ```
  console.error('Error processing payment:', error);
  ```

### apps/api/app/api/products/route.ts

- **Line 29** (console.log): `"Validation error:"`
  ```
  console.log('Validation error:', parsed.error.flatten());
  ```

- **Line 139** (console.error): `"Error details:"`
  ```
  console.error('Error details:', {
  ```

### apps/api/app/api/products/availability/route.ts

- **Line 377** (console.error): `"Error checking product availability:"`
  ```
  console.error('Error checking product availability:', error);
  ```

### apps/api/app/api/products/export/route.ts

- **Line 114** (console.error): `"Error exporting products:"`
  ```
  console.error('Error exporting products:', error);
  ```

### apps/api/app/api/plans/public/route.ts

- **Line 123** (console.error): `"Error transforming plan:"`
  ```
  console.error('Error transforming plan:', error, plan);
  ```

- **Line 150** (console.error): `"Invalid result structure from db.plans.search:"`
  ```
  console.error('Invalid result structure from db.plans.search:', result);
  ```

- **Line 165** (console.error): `"Error fetching public plans:"`
  ```
  console.error('Error fetching public plans:', error);
  ```

### apps/api/app/api/plans/route.ts

- **Line 45** (console.error): `"Error fetching plans:"`
  ```
  console.error('Error fetching plans:', error);
  ```

- **Line 70** (console.error): `"Error creating plan:"`
  ```
  console.error('Error creating plan:', error);
  ```

### apps/api/app/api/plans/[id]/variants/route.ts

- **Line 29** (console.error): `"Error fetching plan variants:"`
  ```
  console.error('Error fetching plan variants:', error);
  ```

- **Line 60** (console.error): `"Error creating plan variant:"`
  ```
  console.error('Error creating plan variant:', error);
  ```

### apps/api/app/api/plans/stats/route.ts

- **Line 23** (console.error): `"Error fetching plan stats:"`
  ```
  console.error('Error fetching plan stats:', error);
  ```

### apps/api/app/api/auth/verify/route.ts

- **Line 34** (console.error): `"Error verifying token:"`
  ```
  console.error('Error verifying token:', error);
  ```

### apps/api/app/api/auth/logout/route.ts

- **Line 46** (console.error): `"Logout error:"`
  ```
  console.error('Logout error:', error);
  ```

### apps/api/app/api/auth/verify-email/route.ts

- **Line 62** (console.error): `"Email verification error:"`
  ```
  console.error('Email verification error:', error);
  ```

- **Line 122** (console.error): `"Email verification error:"`
  ```
  console.error('Email verification error:', error);
  ```

- **Line 174** (console.error): `"Failed to send verification email:"`
  ```
  console.error('Failed to send verification email:', emailResult.error);
  ```

- **Line 187** (console.error): `"Resend verification error:"`
  ```
  console.error('Resend verification error:', error);
  ```

### apps/api/app/api/auth/register/route.ts

- **Line 374** (console.error): `"Registration error:"`
  ```
  console.error('Registration error:', error);
  ```

### apps/api/app/api/auth/login/route.ts

- **Line 182** (console.error): `"Login error:"`
  ```
  console.error('Login error:', error);
  ```

### apps/api/app/api/health/database/route.ts

- **Line 62** (console.error): `"Database health check failed:"`
  ```
  console.error('Database health check failed:', error);
  ```

- **Line 71** (console.error): `"Error details:"`
  ```
  console.error('Error details:', errorDetails);
  ```

### apps/api/app/api/outlets/route.ts

- **Line 21** (console.log): `"Validation error:"`
  ```
  console.log('Validation error:', parsed.error.flatten());
  ```

### apps/api/app/api/subscriptions/extend/route.ts

- **Line 84** (console.error): `"Error extending subscription:"`
  ```
  console.error('Error extending subscription:', error);
  ```

### apps/api/app/api/subscriptions/status/route.ts

- **Line 201** (console.error): `"Error fetching subscription status:"`
  ```
  console.error('Error fetching subscription status:', error);
  ```

### apps/api/app/api/subscriptions/route.ts

- **Line 47** (console.error): `"Error fetching subscriptions:"`
  ```
  console.error('Error fetching subscriptions:', error);
  ```

- **Line 84** (console.error): `"Error creating subscription:"`
  ```
  console.error('Error creating subscription:', error);
  ```

### apps/api/app/api/subscriptions/[id]/pause/route.ts

- **Line 68** (console.error): `"Error pausing subscription:"`
  ```
  console.error('Error pausing subscription:', error);
  ```

### apps/api/app/api/subscriptions/[id]/cancel/route.ts

- **Line 65** (console.error): `"Error cancelling subscription:"`
  ```
  console.error('Error cancelling subscription:', error);
  ```

### apps/api/app/api/subscriptions/[id]/payments/route.ts

- **Line 47** (console.error): `"Error fetching subscription payments:"`
  ```
  console.error('Error fetching subscription payments:', error);
  ```

### apps/api/app/api/subscriptions/[id]/change-plan/route.ts

- **Line 43** (console.error): `"Error changing subscription plan:"`
  ```
  console.error('Error changing subscription plan:', error);
  ```

### apps/api/app/api/subscriptions/[id]/renew/route.ts

- **Line 122** (console.error): `"Error renewing subscription:"`
  ```
  console.error('Error renewing subscription:', error);
  ```

### apps/api/app/api/subscriptions/[id]/resume/route.ts

- **Line 63** (console.error): `"Error resuming subscription:"`
  ```
  console.error('Error resuming subscription:', error);
  ```

### apps/api/app/api/subscriptions/[id]/route.ts

- **Line 30** (console.error): `"Error fetching subscription:"`
  ```
  console.error('Error fetching subscription:', error);
  ```

- **Line 65** (console.error): `"Error updating subscription:"`
  ```
  console.error('Error updating subscription:', error);
  ```

- **Line 103** (console.error): `"Error cancelling subscription:"`
  ```
  console.error('Error cancelling subscription:', error);
  ```

### apps/api/app/api/subscriptions/[id]/activities/route.ts

- **Line 70** (console.error): `"Error fetching subscription activities:"`
  ```
  console.error('Error fetching subscription activities:', error);
  ```

### apps/api/app/api/subscriptions/stats/route.ts

- **Line 20** (console.error): `"Error fetching subscription stats:"`
  ```
  console.error('Error fetching subscription stats:', error);
  ```

### apps/api/app/api/subscriptions/expired/route.ts

- **Line 20** (console.error): `"Error fetching expired subscriptions:"`
  ```
  console.error('Error fetching expired subscriptions:', error);
  ```

### apps/api/app/api/merchants/register/route.ts

- **Line 125** (console.error): `"Merchant registration error:"`
  ```
  console.error('Merchant registration error:', error);
  ```

### apps/api/app/api/merchants/route.ts

- **Line 228** (console.error): `"Error fetching merchants:"`
  ```
  console.error('Error fetching merchants:', error);
  ```

- **Line 329** (console.error): `"Error creating merchant:"`
  ```
  console.error('Error creating merchant:', error);
  ```

### apps/api/app/api/merchants/[id]/payments/route.ts

- **Line 40** (console.error): `"Error fetching merchant payments:"`
  ```
  console.error('Error fetching merchant payments:', error);
  ```

### apps/api/app/api/merchants/[id]/products/[productId]/route.ts

- **Line 77** (console.error): `"Error fetching product detail:"`
  ```
  console.error('Error fetching product detail:', error);
  ```

- **Line 186** (console.error): `"Error updating product:"`
  ```
  console.error('Error updating product:', error);
  ```

### apps/api/app/api/merchants/[id]/products/route.ts

- **Line 50** (console.error): `"Error fetching merchant products:"`
  ```
  console.error('Error fetching merchant products:', error);
  ```

- **Line 109** (console.error): `"Error creating product:"`
  ```
  console.error('Error creating product:', error);
  ```

### apps/api/app/api/merchants/[id]/plan/route.ts

- **Line 46** (console.error): `"Error fetching merchant plan:"`
  ```
  console.error('Error fetching merchant plan:', error);
  ```

- **Line 185** (console.error): `"Error updating merchant plan:"`
  ```
  console.error('Error updating merchant plan:', error);
  ```

### apps/api/app/api/merchants/[id]/outlets/[outletId]/route.ts

- **Line 36** (console.error): `"Error fetching outlet:"`
  ```
  console.error('Error fetching outlet:', error);
  ```

- **Line 115** (console.error): `"Error updating outlet:"`
  ```
  console.error('Error updating outlet:', error);
  ```

- **Line 164** (console.error): `"Error deleting outlet:"`
  ```
  console.error('Error deleting outlet:', error);
  ```

### apps/api/app/api/merchants/[id]/outlets/route.ts

- **Line 52** (console.error): `"Error fetching merchant outlets:"`
  ```
  console.error('Error fetching merchant outlets:', error);
  ```

- **Line 115** (console.error): `"Error creating outlet:"`
  ```
  console.error('Error creating outlet:', error);
  ```

### apps/api/app/api/merchants/[id]/users/route.ts

- **Line 46** (console.error): `"Error fetching merchant users:"`
  ```
  console.error('Error fetching merchant users:', error);
  ```

- **Line 102** (console.error): `"Error creating user:"`
  ```
  console.error('Error creating user:', error);
  ```

### apps/api/app/api/merchants/[id]/users/[userId]/route.ts

- **Line 36** (console.error): `"Error fetching user:"`
  ```
  console.error('Error fetching user:', error);
  ```

- **Line 77** (console.error): `"Error updating user:"`
  ```
  console.error('Error updating user:', error);
  ```

- **Line 118** (console.error): `"Error deleting user:"`
  ```
  console.error('Error deleting user:', error);
  ```

### apps/api/app/api/merchants/[id]/orders/route.ts

- **Line 45** (console.error): `"Error fetching merchant orders:"`
  ```
  console.error('Error fetching merchant orders:', error);
  ```

- **Line 101** (console.error): `"Error creating order:"`
  ```
  console.error('Error creating order:', error);
  ```

### apps/api/app/api/merchants/[id]/pricing/route.ts

- **Line 177** (console.error): `"Error updating merchant pricing:"`
  ```
  console.error('Error updating merchant pricing:', error);
  ```

### apps/api/app/api/system/health/route.ts

- **Line 186** (console.error): `"System health check failed:"`
  ```
  console.error('System health check failed:', error);
  ```

### apps/api/app/api/system/api-keys/route.ts

- **Line 21** (console.error): `"Error fetching API keys:"`
  ```
  console.error('Error fetching API keys:', error);
  ```

- **Line 54** (console.error): `"Error creating API key:"`
  ```
  console.error('Error creating API key:', error);
  ```

### apps/api/app/api/public/[tenantKey]/products/route.ts

- **Line 214** (console.error): `"Error fetching public products:"`
  ```
  console.error('Error fetching public products:', error);
  ```

### apps/api/app/api/public/[tenantKey]/categories/route.ts

- **Line 123** (console.error): `"Error fetching public categories:"`
  ```
  console.error('Error fetching public categories:', error);
  ```

### apps/api/app/api/mobile/auth/login/route.ts

- **Line 111** (console.error): `"Mobile login error:"`
  ```
  console.error('Mobile login error:', error);
  ```

### apps/api/app/api/mobile/sync/check/route.ts

- **Line 104** (console.error): `"Sync check error:"`
  ```
  console.error('Sync check error:', error);
  ```

### apps/api/app/api/mobile/notifications/register-device/route.ts

- **Line 109** (console.error): `"Device registration error:"`
  ```
  console.error('Device registration error:', error);
  ```

### apps/api/app/api/users/profile/route.ts

- **Line 239** (console.error): `"Error details:"`
  ```
  console.error('Error details:', {
  ```

### apps/api/app/api/sync-standalone/route.ts

- **Line 174** (console.error): `"Error in GET sync-standalone:"`
  ```
  console.error('Error in GET sync-standalone:', error);
  ```

- **Line 782** (console.error): `"Error in standalone sync:"`
  ```
  console.error('Error in standalone sync:', error);
  ```

### apps/api/app/api/orders/[orderId]/status/route.ts

- **Line 177** (console.error): `"Error updating order status:"`
  ```
  console.error('Error updating order status:', error);
  ```

### apps/api/app/api/orders/route.ts

- **Line 39** (console.log): `"Validation error:"`
  ```
  console.log('Validation error:', parsed.error.flatten());
  ```

- **Line 313** (console.error): `"Pricing calculation error:"`
  ```
  console.error('Pricing calculation error:', pricingError);
  ```

### apps/api/app/api/orders/export/route.ts

- **Line 108** (console.error): `"Error exporting orders:"`
  ```
  console.error('Error exporting orders:', error);
  ```

### apps/api/app/api/orders/stats/route.ts

- **Line 98** (console.error): `"Error getting order stats:"`
  ```
  console.error('Error getting order stats:', error);
  ```

### apps/api/app/api/billing-cycles/route.ts

- **Line 19** (console.error): `"Error fetching billing cycles:"`
  ```
  console.error('Error fetching billing cycles:', error);
  ```

- **Line 41** (console.error): `"Error creating billing cycle:"`
  ```
  console.error('Error creating billing cycle:', error);
  ```

### apps/api/app/api/test-aws/route.ts

- **Line 38** (console.error): `"Error testing AWS S3:"`
  ```
  console.error('Error testing AWS S3:', error);
  ```

### apps/api/app/api/categories/route.ts

- **Line 62** (console.log): `"Validation error:"`
  ```
  console.log('Validation error:', parsed.error.flatten());
  ```

### apps/api/app/api/categories/[id]/route.ts

- **Line 83** (console.error): `"Error fetching category:"`
  ```
  console.error('Error fetching category:', error);
  ```

- **Line 200** (console.error): `"Error updating category:"`
  ```
  console.error('Error updating category:', error);
  ```

- **Line 286** (console.error): `"Error deleting category:"`
  ```
  console.error('Error deleting category:', error);
  ```

### apps/api/app/api/upload/image/route.ts

- **Line 215** (console.error): `"Error uploading image:"`
  ```
  console.error('Error uploading image:', error);
  ```

### apps/api/app/api/upload/cleanup/route.ts

- **Line 53** (console.error): `"Error cleaning up staging files:"`
  ```
  console.error('Error cleaning up staging files:', error);
  ```

### apps/api/app/api/analytics/recent-orders/route.ts

- **Line 131** (console.error): `"Error fetching recent orders:"`
  ```
  console.error('Error fetching recent orders:', error);
  ```

### apps/api/app/api/analytics/top-customers/route.ts

- **Line 138** (console.error): `"Error fetching top customers analytics:"`
  ```
  console.error('Error fetching top customers analytics:', error);
  ```

### apps/api/app/api/analytics/income/route.ts

- **Line 44** (console.error): `"Error parsing outletIds:"`
  ```
  console.error('Error parsing outletIds:', error);
  ```

- **Line 286** (console.error): `"Error fetching income analytics:"`
  ```
  console.error('Error fetching income analytics:', error);
  ```

### apps/api/app/api/analytics/dashboard/route.ts

- **Line 281** (console.error): `"Error fetching dashboard stats:"`
  ```
  console.error('Error fetching dashboard stats:', error);
  ```

### apps/api/app/api/analytics/system/route.ts

- **Line 202** (console.error): `"Error fetching system analytics:"`
  ```
  console.error('Error fetching system analytics:', error);
  ```

### apps/api/app/api/analytics/orders/route.ts

- **Line 30** (console.error): `"Error parsing outletIds:"`
  ```
  console.error('Error parsing outletIds:', error);
  ```

### apps/api/app/api/analytics/recent-activities/route.ts

- **Line 103** (console.error): `"Error fetching recent activities:"`
  ```
  console.error('Error fetching recent activities:', error);
  ```

### apps/api/app/api/debug/subscription-status/route.ts

- **Line 62** (console.error): `"Debug endpoint error:"`
  ```
  console.error('Debug endpoint error:', error);
  ```

### apps/api/components/SwaggerUI.tsx

- **Line 93** (console.error): `"Error in request interceptor:"`
  ```
  console.error('Error in request interceptor:', err);
  ```

- **Line 107** (console.error): `"Error in response interceptor:"`
  ```
  console.error('Error in response interceptor:', err);
  ```

- **Line 132** (console.error): `"Error in SwaggerUI onComplete:"`
  ```
  console.error('Error in SwaggerUI onComplete:', err);
  ```

### apps/client/app/customers/page.tsx

- **Line 368** (console.error): `"Error creating customer:"`
  ```
  console.error('Error creating customer:', error);
  ```

### apps/client/app/calendar/page.tsx

- **Line 215** (console.log): `"Please log in to view order details"`
  ```
  console.log('Please log in to view order details');
  ```

### apps/client/app/products/add/page.tsx

- **Line 100** (console.error): `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

### apps/client/app/products/[id]/edit/page.tsx

- **Line 119** (console.error): `"Error fetching product:"`
  ```
  console.error('Error fetching product:', err);
  ```

### apps/client/app/products/[id]/orders/page.tsx

- **Line 59** (console.error): `"Error fetching product:"`
  ```
  console.error('Error fetching product:', err);
  ```

### apps/client/app/products/[id]/page.tsx

- **Line 73** (console.error): `"Error fetching product:"`
  ```
  console.error('Error fetching product:', err);
  ```

- **Line 100** (console.error): `"Error deleting product:"`
  ```
  console.error('Error deleting product:', err);
  ```

### apps/client/app/products/page.tsx

- **Line 330** (console.error): `"Error creating product:"`
  ```
  console.error('Error creating product:', error);
  ```

### apps/client/app/plans/page.tsx

- **Line 115** (console.error): `"Error fetching data:"`
  ```
  console.error('Error fetching data:', err);
  ```

- **Line 173** (console.error): `"Error purchasing plan:"`
  ```
  console.error('Error purchasing plan:', err);
  ```

### apps/client/app/outlets/page.tsx

- **Line 642** (console.error): `"Error creating outlet:"`
  ```
  console.error("Error creating outlet:", error);
  ```

### apps/client/app/subscription/page.tsx

- **Line 118** (console.error): `"Error fetching subscription:"`
  ```
  console.error('Error fetching subscription:', error);
  ```

### apps/client/app/dashboard/page.tsx

- **Line 267** (console.log): `"Loaded outlets for product dialog:"`
  ```
  console.log('Loaded outlets for product dialog:', outletsList.length);
  ```

- **Line 537** (console.error): `"Error fetching dashboard data:"`
  ```
  console.error('Error fetching dashboard data:', error);
  ```

- **Line 802** (console.error): `"Error creating customer:"`
  ```
  console.error('Error creating customer:', error);
  ```

- **Line 827** (console.error): `"Error creating product:"`
  ```
  console.error('Error creating product:', error);
  ```

### apps/client/app/users/[id]/page.tsx

- **Line 105** (console.error): `"Invalid user ID format:"`
  ```
  console.error('Invalid user ID format:', userId);
  ```

- **Line 114** (console.error): `"Error refreshing user data:"`
  ```
  console.error('Error refreshing user data:', error);
  ```

- **Line 194** (console.error): `"Error activating user:"`
  ```
  console.error('Error activating user:', err);
  ```

- **Line 224** (console.error): `"Error deactivating user:"`
  ```
  console.error('Error deactivating user:', err);
  ```

- **Line 245** (console.error): `"Error deleting user:"`
  ```
  console.error('Error deleting user:', err);
  ```

### apps/client/app/users/page.tsx

- **Line 417** (console.error): `"Error creating user:"`
  ```
  console.error('Error creating user:', error);
  ```

### apps/client/app/reset-password/page.tsx

- **Line 51** (console.error): `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

### apps/client/app/orders/[id]/edit/page.tsx

- **Line 104** (console.error): `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 201** (console.error): `"Error fetching form data:"`
  ```
  console.error('Error fetching form data:', err);
  ```

- **Line 254** (console.error): `"Error fetching outlet products:"`
  ```
  console.error('Error fetching outlet products:', err);
  ```

- **Line 297** (console.error): `"Error updating order:"`
  ```
  console.error('Error updating order:', err);
  ```

### apps/client/app/orders/[id]/page.tsx

- **Line 48** (console.error): `"Error fetching order details:"`
  ```
  console.error('Error fetching order details:', err);
  ```

- **Line 66** (confirm): `"Are you sure you want to cancel this order? This action cannot be undone."`
  ```
  if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
  ```

- **Line 83** (console.error): `"Error cancelling order:"`
  ```
  console.error('Error cancelling order:', err);
  ```

- **Line 106** (console.error): `"Error updating order status:"`
  ```
  console.error('Error updating order status:', err);
  ```

- **Line 132** (console.error): `"Error picking up order:"`
  ```
  console.error('Error picking up order:', err);
  ```

- **Line 157** (console.error): `"Error returning order:"`
  ```
  console.error('Error returning order:', err);
  ```

- **Line 198** (console.error): `"Error saving order settings:"`
  ```
  console.error('Error saving order settings:', err);
  ```

### apps/client/app/orders/create/page.tsx

- **Line 73** (console.error): `"Failed to fetch customers:"`
  ```
  console.error('Failed to fetch customers:', customersRes.error);
  ```

- **Line 82** (console.error): `"Failed to fetch products:"`
  ```
  console.error('Failed to fetch products:', productsRes.error);
  ```

- **Line 117** (console.error): `"Failed to fetch outlets:"`
  ```
  console.error('Failed to fetch outlets:', outletsRes.error);
  ```

- **Line 120** (console.error): `"Error loading data for order creation:"`
  ```
  console.error('Error loading data for order creation:', error);
  ```

- **Line 142** (console.error): `"Create order failed:"`
  ```
  console.error('Create order failed:', err);
  ```

### apps/client/app/forget-password/page.tsx

- **Line 29** (console.error): `"Password reset failed:"`
  ```
  console.error('Password reset failed:', error);
  ```

### apps/client/app/page.tsx

- **Line 667** (console.warn): `"Failed to parse features JSON:"`
  ```
  console.warn('Failed to parse features JSON:', e);
  ```

### apps/client/app/categories/page.tsx

- **Line 299** (console.error): `"Error creating category:"`
  ```
  console.error('Error creating category:', error);
  ```

- **Line 338** (console.error): `"Error updating category:"`
  ```
  console.error('Error updating category:', error);
  ```

### apps/client/lib/auth/auth.ts

- **Line 62** (console.error): `"Error verifying token:"`
  ```
  console.error('Error verifying token:', error);
  ```

- **Line 131** (console.error): `"Failed to get current user:"`
  ```
  console.error('Failed to get current user:', error);
  ```

### apps/client/lib/locale.ts

- **Line 21** (console.error): `"Error reading locale from localStorage:"`
  ```
  console.error('Error reading locale from localStorage:', error);
  ```

- **Line 41** (console.error): `"Error saving locale to localStorage:"`
  ```
  console.error('Error saving locale to localStorage:', error);
  ```

## Recommendations

1. **Priority 1 (Critical)**: Add missing translation keys to Vietnamese files
2. **Priority 2 (High)**: Replace hardcoded UI strings with translation keys
3. **Priority 3 (Medium)**: Move API error messages to translation files
4. **Priority 4 (Low)**: Consider translating console/alert messages for better UX

## Next Steps

1. Review this report and prioritize fixes
2. Add missing translation keys to `locales/vi/*.json` files
3. Replace hardcoded strings with `t('namespace.key')` calls
4. Run this script again to verify fixes

