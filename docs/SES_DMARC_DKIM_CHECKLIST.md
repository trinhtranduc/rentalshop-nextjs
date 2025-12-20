# ✅ AWS SES DMARC & DKIM Setup Checklist

Checklist để fix các vấn đề email authentication (DMARC & DKIM) cho AWS SES identity `anyrent.shop`.

## 🔍 **1. Xác Nhận Vấn Đề**

**Từ AWS SES Console:**
- **Identity Status**: Verification temporary failed ⚠️
- **High Impact Issues**:
  1. ❌ **DMARC configuration was not found** (50 days old)
  2. ❌ **DKIM verification has failed** (3 days old)

**Nguyên nhân:**
- DNS records cho DMARC và DKIM chưa được tạo hoặc chưa đúng
- DNS records có thể đã expire hoặc bị xóa

---

## 🔐 **2. DKIM Configuration (Priority 1)**

### **2.1. Lấy DKIM Records từ AWS SES**

1. Vào **AWS Console** → **SES** → **Identities**
2. Click vào identity: `anyrent.shop`
3. Tab **Authentication** → Section **DKIM**
4. **Kiểm tra:**
   - [ ] DKIM signing: **Enabled**
   - [ ] DKIM status: **Success** (nếu chưa → cần add DNS records)

**Nếu DKIM chưa enabled:**
1. Click **Edit** trong DKIM section
2. Select **Easy DKIM** (recommended)
3. Click **Save changes**

**Lấy DKIM Records:**
- AWS sẽ generate 3 CNAME records
- Format: `[selector]._domainkey.anyrent.shop`
- Example:
  ```
  abc123._domainkey.anyrent.shop → abc123.anyrent.shop.dkim.amazonses.com
  def456._domainkey.anyrent.shop → def456.anyrent.shop.dkim.amazonses.com
  ghi789._domainkey.anyrent.shop → ghi789.anyrent.shop.dkim.amazonses.com
  ```

**✅ Checklist:**
- [ ] DKIM signing: **Enabled**
- [ ] 3 DKIM CNAME records đã được copy từ AWS SES
- [ ] Ghi lại 3 selectors (ví dụ: `abc123`, `def456`, `ghi789`)

---

### **2.2. Tạo DKIM DNS Records trong Cloudflare**

1. **Đăng nhập Cloudflare Dashboard**
   - Vào: https://dash.cloudflare.com
   - Chọn domain: `anyrent.shop`

2. **Vào DNS Settings**
   - Click **DNS** → **Records**

3. **Tạo 3 CNAME Records cho DKIM**

   **Record 1:**
   - **Type**: `CNAME`
   - **Name**: `abc123._domainkey` (chỉ phần selector._domainkey, không có `.anyrent.shop`)
   - **Target**: `abc123.anyrent.shop.dkim.amazonses.com` (copy từ AWS SES)
   - **Proxy status**: **DNS only** (gray cloud) ⚠️ **QUAN TRỌNG**
   - **TTL**: `Auto` hoặc `3600`
   - Click **Save**

   **Record 2:**
   - **Type**: `CNAME`
   - **Name**: `def456._domainkey`
   - **Target**: `def456.anyrent.shop.dkim.amazonses.com`
   - **Proxy status**: **DNS only**
   - **TTL**: `Auto`
   - Click **Save**

   **Record 3:**
   - **Type**: `CNAME`
   - **Name**: `ghi789._domainkey`
   - **Target**: `ghi789.anyrent.shop.dkim.amazonses.com`
   - **Proxy status**: **DNS only**
   - **TTL**: `Auto`
   - Click **Save**

**⚠️ Lưu ý quan trọng:**
- **Proxy status phải là DNS only** (gray cloud) - không được bật proxy (orange cloud)
- Nếu bật proxy, DKIM verification sẽ fail vì Cloudflare sẽ thay đổi DNS response

**✅ Checklist:**
- [ ] 3 DKIM CNAME records đã được tạo trong Cloudflare
- [ ] Tất cả records có **Proxy: DNS only** (gray cloud)
- [ ] Target values đúng format: `[selector].anyrent.shop.dkim.amazonses.com`

---

### **2.3. Verify DKIM DNS Records**

Sau khi tạo records, chờ 1-5 phút rồi test:

```bash
# Test DKIM record 1
dig abc123._domainkey.anyrent.shop CNAME

# Test DKIM record 2
dig def456._domainkey.anyrent.shop CNAME

# Test DKIM record 3
dig ghi789._domainkey.anyrent.shop CNAME
```

**Expected Result:**
```
abc123._domainkey.anyrent.shop. 3600 IN CNAME abc123.anyrent.shop.dkim.amazonses.com.
```

**✅ Checklist:**
- [ ] Tất cả 3 DKIM records resolve đúng
- [ ] Records trỏ về `*.dkim.amazonses.com` domain

---

### **2.4. Verify DKIM trong AWS SES**

1. Vào **AWS Console** → **SES** → **Identities** → `anyrent.shop`
2. Tab **Authentication** → Section **DKIM**
3. Click **Check for recommendations** hoặc đợi 5-10 phút
4. **Kiểm tra:**
   - [ ] DKIM status: **Success** ✅
   - [ ] Không còn warning về DKIM verification failed

**Nếu vẫn fail:**
- Check DNS records có đúng format không
- Verify Proxy status là **DNS only**
- Chờ thêm 10-15 phút để AWS re-check

---

## 🛡️ **3. DMARC Configuration (Priority 2)**

### **3.1. Tạo DMARC DNS Record**

DMARC (Domain-based Message Authentication, Reporting & Conformance) giúp bảo vệ domain khỏi email spoofing.

**DMARC Policy Options:**
- `none`: Monitor only (khuyến nghị cho bắt đầu)
- `quarantine`: Quarantine emails that fail
- `reject`: Reject emails that fail

**Recommended cho bắt đầu:**
```
v=DMARC1; p=none; rua=mailto:dmarc@anyrent.shop; ruf=mailto:dmarc@anyrent.shop; fo=1
```

**Giải thích:**
- `v=DMARC1`: DMARC version 1
- `p=none`: Policy = monitor only (không reject emails)
- `rua`: Aggregate reports email
- `ruf`: Forensic reports email
- `fo=1`: Generate reports for all failures

---

### **3.2. Tạo DMARC TXT Record trong Cloudflare**

1. **Vào Cloudflare Dashboard** → **DNS** → **Records**

2. **Tạo TXT Record:**
   - **Type**: `TXT`
   - **Name**: `_dmarc` (chỉ `_dmarc`, không có `.anyrent.shop`)
   - **Content**: 
     ```
     v=DMARC1; p=none; rua=mailto:dmarc@anyrent.shop; ruf=mailto:dmarc@anyrent.shop; fo=1
     ```
   - **Proxy status**: **DNS only** (gray cloud)
   - **TTL**: `Auto` hoặc `3600`
   - Click **Save**

**✅ Checklist:**
- [ ] DMARC TXT record đã được tạo: `_dmarc` → DMARC policy
- [ ] Proxy status: **DNS only**
- [ ] Policy: `p=none` (monitor only - safe for start)

---

### **3.3. Verify DMARC DNS Record**

```bash
# Test DMARC record
dig _dmarc.anyrent.shop TXT
```

**Expected Result:**
```
_dmarc.anyrent.shop. 3600 IN TXT "v=DMARC1; p=none; rua=mailto:dmarc@anyrent.shop; ruf=mailto:dmarc@anyrent.shop; fo=1"
```

**✅ Checklist:**
- [ ] DMARC record resolve đúng
- [ ] Record có format đúng: `v=DMARC1; p=...`

---

### **3.4. Verify DMARC trong AWS SES**

1. Vào **AWS Console** → **SES** → **Identities** → `anyrent.shop`
2. Tab **Authentication** → Section **DMARC**
3. Click **Check for recommendations** hoặc đợi 5-10 phút
4. **Kiểm tra:**
   - [ ] DMARC status: **Success** ✅
   - [ ] Không còn warning về DMARC configuration not found

---

## 📧 **4. SPF Configuration (Optional but Recommended)**

SPF (Sender Policy Framework) giúp xác định server nào được phép gửi email từ domain.

### **4.1. Check Existing SPF Record**

```bash
# Check SPF record
dig anyrent.shop TXT | grep -i spf
```

**Nếu đã có SPF record:**
- Verify nó includes AWS SES: `include:amazonses.com`

**Nếu chưa có SPF record:**
- Tạo TXT record với SPF policy

### **4.2. Tạo SPF TXT Record (nếu chưa có)**

1. **Vào Cloudflare Dashboard** → **DNS** → **Records**

2. **Tạo TXT Record:**
   - **Type**: `TXT`
   - **Name**: `@` (root domain) hoặc `anyrent.shop`
   - **Content**: 
     ```
     v=spf1 include:amazonses.com ~all
     ```
   - **Proxy status**: **DNS only**
   - **TTL**: `Auto`
   - Click **Save**

**Giải thích:**
- `v=spf1`: SPF version 1
- `include:amazonses.com`: Allow AWS SES to send emails
- `~all`: Soft fail for other servers (có thể dùng `-all` cho hard fail)

**✅ Checklist:**
- [ ] SPF record đã được tạo hoặc updated
- [ ] SPF includes: `include:amazonses.com`
- [ ] Proxy status: **DNS only**

---

## 🔄 **5. Verification Process**

### **5.1. Wait for DNS Propagation**

Sau khi tạo tất cả DNS records:
- **DKIM**: Chờ 5-10 phút
- **DMARC**: Chờ 5-10 phút
- **SPF**: Chờ 5-10 phút

**Total wait time**: 10-15 phút để tất cả records propagate

---

### **5.2. Refresh AWS SES Recommendations**

1. Vào **AWS Console** → **SES** → **Identities** → `anyrent.shop`
2. Tab **Authentication**
3. Click **Check for recommendations** button
4. Đợi 1-2 phút để AWS re-check

**Expected Result:**
- ✅ DKIM: **Success**
- ✅ DMARC: **Success**
- ✅ Identity status: **Verified** (thay vì "Verification temporary failed")

---

### **5.3. Test Email Sending**

Sau khi tất cả verified, test gửi email:

```bash
# Test via API (nếu có endpoint)
curl -X POST https://dev-api.anyrent.shop/api/test-email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test", "html": "<p>Test</p>"}'
```

**Hoặc test trong AWS SES Console:**
1. Vào **SES** → **Identities** → `anyrent.shop`
2. Click **Send test email**
3. Nhập email test
4. Click **Send test email**

**✅ Checklist:**
- [ ] Email được gửi thành công
- [ ] Email không vào spam folder
- [ ] Email headers có DKIM signature
- [ ] Email pass DMARC check

---

## 📋 **6. Complete Checklist Summary**

### **DNS Records to Create:**

**DKIM (3 records):**
- [ ] `abc123._domainkey` → CNAME → `abc123.anyrent.shop.dkim.amazonses.com`
- [ ] `def456._domainkey` → CNAME → `def456.anyrent.shop.dkim.amazonses.com`
- [ ] `ghi789._domainkey` → CNAME → `ghi789.anyrent.shop.dkim.amazonses.com`

**DMARC (1 record):**
- [ ] `_dmarc` → TXT → `v=DMARC1; p=none; rua=mailto:dmarc@anyrent.shop; ruf=mailto:dmarc@anyrent.shop; fo=1`

**SPF (1 record - optional):**
- [ ] `@` → TXT → `v=spf1 include:amazonses.com ~all`

### **AWS SES Configuration:**
- [ ] Identity: `anyrent.shop` status: **Verified**
- [ ] DKIM signing: **Enabled**
- [ ] DKIM status: **Success**
- [ ] DMARC status: **Success**
- [ ] No high-impact recommendations

### **Testing:**
- [ ] DNS records resolve correctly
- [ ] Test email sent successfully
- [ ] Email không vào spam
- [ ] Email headers có DKIM signature

---

## 🔧 **7. Troubleshooting**

### **Issue 1: DKIM Still Failing After Adding Records**

**Causes:**
- DNS records chưa propagate
- Proxy status bật (orange cloud) thay vì DNS only
- Wrong record format

**Solutions:**
1. ✅ Verify Proxy status: **DNS only** (gray cloud) cho tất cả DKIM records
2. ✅ Check record format: `[selector]._domainkey` → `[selector].anyrent.shop.dkim.amazonses.com`
3. ✅ Wait 15-30 phút và refresh recommendations
4. ✅ Test DNS resolution: `dig [selector]._domainkey.anyrent.shop CNAME`

### **Issue 2: DMARC Still Not Found**

**Causes:**
- TXT record chưa được tạo
- Record name sai (phải là `_dmarc`, không phải `dmarc`)
- DNS chưa propagate

**Solutions:**
1. ✅ Verify record name: `_dmarc` (với underscore)
2. ✅ Check record type: `TXT`
3. ✅ Verify content format: `v=DMARC1; p=...`
4. ✅ Wait 15-30 phút và refresh recommendations

### **Issue 3: Identity Status Still "Verification Temporary Failed"**

**Causes:**
- DKIM hoặc DMARC vẫn chưa verified
- DNS records chưa propagate đủ

**Solutions:**
1. ✅ Fix tất cả DKIM và DMARC issues trước
2. ✅ Wait 30 phút sau khi fix
3. ✅ Click **Check for recommendations** trong AWS SES
4. ✅ Verify tất cả records resolve correctly

---

## 📞 **8. Quick Reference**

### **DKIM Records Format:**
```
[selector]._domainkey.anyrent.shop → CNAME → [selector].anyrent.shop.dkim.amazonses.com
```

### **DMARC Record Format:**
```
_dmarc.anyrent.shop → TXT → v=DMARC1; p=none; rua=mailto:dmarc@anyrent.shop; ruf=mailto:dmarc@anyrent.shop; fo=1
```

### **SPF Record Format:**
```
anyrent.shop → TXT → v=spf1 include:amazonses.com ~all
```

### **Important Notes:**
- ⚠️ **Tất cả records phải có Proxy: DNS only** (gray cloud)
- ⚠️ **Không được bật proxy** (orange cloud) cho email authentication records
- ⚠️ **Chờ 10-15 phút** sau khi tạo records để DNS propagate
- ⚠️ **Refresh recommendations** trong AWS SES sau khi fix

---

**Last Updated:** 2025-01-20
**Maintained by:** Development Team

