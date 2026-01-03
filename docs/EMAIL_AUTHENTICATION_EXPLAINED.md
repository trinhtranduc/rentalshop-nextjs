# 📧 Email Authentication Explained: DMARC, DKIM, SPF & More

Tài liệu giải thích các khái niệm email authentication trong AWS SES và tại sao chúng lại quan trọng.

---

## 🎯 **Tại Sao Cần Email Authentication?**

### **Vấn Đề Email Spoofing (Giả Mạo Email)**

Khi gửi email, bất kỳ ai cũng có thể giả mạo địa chỉ email người gửi. Ví dụ:

```
❌ Hacker có thể gửi email từ: noreply@anyrent.shop
   Nhưng thực tế email này không đến từ server của bạn!
```

### **Hậu Quả Nếu Không Có Authentication:**

1. **Email bị chặn vào Spam/Junk** 📮
   - Gmail, Outlook không tin tưởng email của bạn
   - Tỷ lệ deliverability thấp (emails không đến inbox)

2. **Domain Reputation bị hủy hoại** ⚠️
   - Domain bị blacklist
   - Không thể gửi email từ domain đó nữa

3. **Phishing & Spoofing** 🚨
   - Hacker có thể giả mạo email từ domain của bạn
   - Khách hàng bị lừa đảo, mất niềm tin

4. **Compliance Issues** 📋
   - Không đáp ứng các tiêu chuẩn bảo mật email
   - Có thể vi phạm các quy định về email marketing

---

## 🔐 **Các Loại Email Authentication**

### **1. SPF (Sender Policy Framework)** 📝

#### **SPF Là Gì?**

SPF là một DNS record (TXT) cho phép bạn **khai báo các server nào được phép gửi email** từ domain của bạn.

#### **SPF Hoạt Động Như Thế Nào?**

```
1. Bạn thêm SPF record vào DNS: 
   "v=spf1 include:amazonses.com ~all"

2. Khi email được gửi, email server nhận email sẽ:
   - Kiểm tra IP của server gửi email
   - So sánh với SPF record trong DNS
   - Quyết định có chấp nhận email không
```

#### **Ví Dụ SPF Record:**

```
Type: TXT
Name: anyrent.shop (root domain)
Value: v=spf1 include:amazonses.com ~all
```

**Giải thích:**
- `v=spf1`: SPF version 1
- `include:amazonses.com`: Cho phép AWS SES gửi email từ domain này
- `~all`: Soft fail cho các server khác (có thể dùng `-all` cho hard fail)

#### **Tại Sao Cần SPF?**

✅ **Chống Email Spoofing:** Ngăn hacker giả mạo email từ domain của bạn  
✅ **Tăng Deliverability:** Email servers tin tưởng email của bạn hơn  
✅ **Bắt Buộc cho DMARC:** SPF là một phần của DMARC policy

---

### **2. DKIM (DomainKeys Identified Mail)** 🔑

#### **DKIM Là Gì?**

DKIM là một hệ thống **chữ ký số** (digital signature) để xác thực email thực sự đến từ domain của bạn và không bị sửa đổi.

#### **DKIM Hoạt Động Như Thế Nào?**

**🔑 Public Key Cryptography (Mã Hóa Khóa Công Khai):**

DKIM sử dụng **asymmetric cryptography** (mã hóa bất đối xứng) với 2 keys:

1. **Private Key (Khóa Riêng):**
   - Giữ bí mật, chỉ AWS SES có
   - Dùng để **SIGN** (ký) email → tạo signature
   - ❌ Không thể dùng để verify signature

2. **Public Key (Khóa Công Khai):**
   - Công khai, publish trong DNS
   - Dùng để **VERIFY** (xác thực) signature
   - ✅ Bất kỳ ai cũng có thể dùng để verify
   - ❌ Không thể dùng để tạo signature giả

**Quy Trình DKIM:**

```
📤 Khi Gửi Email (AWS SES):
1. AWS SES có Private Key (bí mật)
2. AWS SES dùng Private Key để SIGN email:
   - Tạo hash từ email content + headers
   - Ký hash bằng Private Key → tạo Signature
   - Thêm Signature vào email headers

📬 Khi Nhận Email (Gmail, Outlook, etc.):
1. Email server lấy Public Key từ DNS:
   - Query DNS: _domainkey.anyrent.shop
   - Nhận được Public Key (công khai)

2. Email server VERIFY signature:
   - Lấy Signature từ email headers
   - Dùng Public Key để decrypt signature
   - So sánh với hash của email content
   - Nếu match → ✅ Signature hợp lệ
   - Nếu không match → ❌ Signature không hợp lệ

🎯 Điểm Quan Trọng:
- ✅ Public Key có thể VERIFY signature (không cần Private Key)
- ❌ Public Key KHÔNG THỂ tạo signature giả (chỉ Private Key mới làm được)
- 🔒 Chỉ người có Private Key (AWS SES) mới có thể tạo signature hợp lệ
```

**Ví Dụ Đơn Giản:**

Giống như **chữ ký tay**:
- **Private Key** = Bút của bạn (chỉ bạn mới có)
- **Public Key** = Mẫu chữ ký của bạn (mọi người đều có thể xem)
- **Signature** = Chữ ký thực tế trên giấy

→ Mọi người có thể **so sánh** chữ ký trên giấy với mẫu chữ ký để **xác thực** đó là chữ ký của bạn
→ Nhưng **không ai** có thể **giả mạo** chữ ký của bạn mà không có bút của bạn

#### **Ví Dụ DKIM Records:**

AWS SES tạo **3 CNAME records** cho DKIM:

```
Record 1:
Type: CNAME
Name: abc123._domainkey.anyrent.shop
Value: abc123.anyrent.shop.dkim.amazonses.com

Record 2:
Type: CNAME
Name: def456._domainkey.anyrent.shop
Value: def456.anyrent.shop.dkim.amazonses.com

Record 3:
Type: CNAME
Name: ghi789._domainkey.anyrent.shop
Value: ghi789.anyrent.shop.dkim.amazonses.com
```

#### **Tại Sao Cần DKIM?**

✅ **Xác Thực Email Gốc:** Chứng minh email thực sự đến từ domain của bạn  
✅ **Bảo Vệ Khỏi Tampering:** Đảm bảo email không bị sửa đổi trên đường truyền  
✅ **Tăng Deliverability:** Gmail, Outlook tin tưởng email có DKIM signature  
✅ **Bắt Buộc cho DMARC:** DKIM là một phần của DMARC policy

---

### **3. DMARC (Domain-based Message Authentication, Reporting & Conformance)** 🛡️

#### **DMARC Là Gì?**

DMARC là một **policy framework** kết hợp SPF và DKIM để:
- **Kiểm soát** cách email servers xử lý email không pass authentication
- **Nhận reports** về email authentication từ các email servers
- **Bảo vệ domain** khỏi email spoofing

#### **DMARC Hoạt Động Như Thế Nào?**

```
1. Bạn tạo DMARC record trong DNS:
   "v=DMARC1; p=none; rua=mailto:dmarc@anyrent.shop"

2. Email servers (Gmail, Outlook, etc.) sẽ:
   - Kiểm tra SPF: Email có pass SPF không?
   - Kiểm tra DKIM: Email có pass DKIM không?
   - Áp dụng DMARC policy:
     * p=none: Chỉ monitor, không làm gì (recommended cho bắt đầu)
     * p=quarantine: Đưa vào spam/junk folder
     * p=reject: Từ chối email hoàn toàn

3. Gửi reports về email authentication:
   - Aggregate reports (rua): Hàng ngày/tuần
   - Forensic reports (ruf): Ngay lập tức khi có failure
```

#### **Ví Dụ DMARC Record:**

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@anyrent.shop; pct=100
```

**Giải thích:**
- `v=DMARC1`: DMARC version 1
- `p=none`: Policy = monitor only (không reject/quarantine)
- `rua=mailto:dmarc@anyrent.shop`: Email để nhận aggregate reports
- `pct=100`: Áp dụng cho 100% emails

#### **DMARC Policy Levels:**

| Policy | Mô Tả | Khi Nào Dùng |
|--------|-------|--------------|
| **p=none** | Monitor only, không làm gì với emails fail | ✅ Bắt đầu (recommended) |
| **p=quarantine** | Đưa emails fail vào spam/junk | Sau khi monitor 1-2 tuần |
| **p=reject** | Từ chối hoàn toàn emails fail | Sau khi đã test kỹ |

#### **Tại Sao Cần DMARC?**

✅ **Chống Email Spoofing Mạnh Mẽ:** Ngăn hacker giả mạo email từ domain  
✅ **Kiểm Soát Domain Reputation:** Bảo vệ domain khỏi bị abuse  
✅ **Nhận Reports:** Biết được ai đang cố gắng giả mạo domain của bạn  
✅ **Tăng Deliverability:** Email servers tin tưởng domain có DMARC  
✅ **Industry Standard:** Được yêu cầu bởi nhiều email providers (Microsoft, Google)

---

### **4. Custom MAIL FROM Domain** 📬

#### **MAIL FROM Domain Là Gì?**

MAIL FROM domain là domain được dùng trong **SMTP transaction** (envelope sender), khác với "From" address mà người nhận thấy.

#### **Sự Khác Biệt:**

```
📧 Email Người Nhận Thấy:
From: AnyRent <noreply@anyrent.shop>

📬 MAIL FROM Domain (Technical):
mail.anyrent.shop (hoặc amazonses.com subdomain)
```

#### **Tại Sao Cần Custom MAIL FROM?**

**Không có Custom MAIL FROM:**
- MAIL FROM domain: `010101xxxxx.amazonses.com` (subdomain của AWS)
- Có thể gây confusion cho một số email servers
- DMARC alignment có thể không pass

**Có Custom MAIL FROM:**
- MAIL FROM domain: `mail.anyrent.shop` (subdomain của bạn)
- Email branding tốt hơn
- DMARC alignment pass dễ dàng hơn
- Tăng deliverability

#### **Cách Setup Custom MAIL FROM:**

1. **Tạo MAIL FROM domain:** `mail.anyrent.shop` trong AWS SES
2. **Thêm MX Record:**
   ```
   Type: MX
   Name: mail
   Priority: 10
   Value: feedback-smtp.ap-southeast-1.amazonses.com
   ```
3. **Thêm SPF Record:**
   ```
   Type: TXT
   Name: mail
   Value: v=spf1 include:amazonses.com ~all
   ```

#### **Tại Sao Cần Custom MAIL FROM?**

✅ **DMARC Alignment:** Giúp DMARC alignment pass dễ dàng hơn  
✅ **Email Branding:** Email từ domain của bạn thay vì AWS subdomain  
✅ **Deliverability:** Một số email servers tin tưởng hơn  
⚠️ **Không Bắt Buộc:** Email vẫn hoạt động tốt nếu không có

---

## 📊 **So Sánh Các Authentication Methods**

| Method | Bắt Buộc? | Mức Độ Quan Trọng | Khó Setup? |
|--------|-----------|-------------------|------------|
| **SPF** | ✅ Recommended | ⭐⭐⭐ High | 🟢 Easy |
| **DKIM** | ✅ Recommended | ⭐⭐⭐ High | 🟢 Easy (AWS tự động) |
| **DMARC** | ✅ Highly Recommended | ⭐⭐⭐ High | 🟡 Medium |
| **Custom MAIL FROM** | ⚠️ Optional | ⭐⭐ Medium | 🟡 Medium |
| **BIMI** | ⚠️ Optional | ⭐ Low | 🔴 Hard |

---

## 🔄 **Quy Trình Email Authentication**

### **Khi Email Được Gửi:**

```
1. AWS SES gửi email từ noreply@anyrent.shop

2. Email Server Nhận Email (Gmail, Outlook, etc.):

   Step 1: Kiểm Tra SPF
   ├─ Lấy SPF record từ DNS: anyrent.shop
   ├─ So sánh IP của AWS SES với SPF record
   └─ ✅ PASS hoặc ❌ FAIL

   Step 2: Kiểm Tra DKIM
   ├─ Lấy DKIM public key từ DNS
   ├─ Xác thực signature trong email header
   └─ ✅ PASS hoặc ❌ FAIL

   Step 3: Áp Dụng DMARC Policy
   ├─ Kiểm tra SPF result
   ├─ Kiểm tra DKIM result
   ├─ Áp dụng policy (none/quarantine/reject)
   └─ Quyết định: Inbox / Spam / Reject

3. Gửi DMARC Reports (nếu có cấu hình)
   └─ Aggregate reports → dmarc@anyrent.shop
```

---

## ✅ **Checklist Setup Email Authentication**

### **Bước 1: SPF (Bắt Buộc)**
- [ ] Thêm SPF TXT record vào DNS
- [ ] Include `amazonses.com` trong SPF record
- [ ] Verify SPF record resolve đúng

### **Bước 2: DKIM (Bắt Buộc)**
- [ ] Enable DKIM trong AWS SES
- [ ] Thêm 3 DKIM CNAME records vào DNS
- [ ] Verify DKIM status = "Success" trong AWS SES

### **Bước 3: DMARC (Highly Recommended)**
- [ ] Thêm DMARC TXT record vào DNS
- [ ] Bắt đầu với policy `p=none` (monitor only)
- [ ] Monitor reports trong 1-2 tuần
- [ ] Nâng cấp policy lên `p=quarantine` hoặc `p=reject` (tùy chọn)

### **Bước 4: Custom MAIL FROM (Optional)**
- [ ] Setup Custom MAIL FROM domain trong AWS SES
- [ ] Thêm MX record cho MAIL FROM domain
- [ ] Thêm SPF record cho MAIL FROM domain
- [ ] Verify status = "Success" trong AWS SES

---

## 🎯 **Kết Luận**

### **Tại Sao Cần Email Authentication?**

1. **Bảo Vệ Domain:** Ngăn hacker giả mạo email từ domain của bạn
2. **Tăng Deliverability:** Email đến inbox thay vì spam/junk
3. **Domain Reputation:** Bảo vệ reputation của domain
4. **Compliance:** Đáp ứng các tiêu chuẩn bảo mật email
5. **Trust & Security:** Khách hàng tin tưởng email từ domain của bạn

### **Thứ Tự Ưu Tiên Setup:**

1. **DKIM** (Easy, AWS tự động) ⭐⭐⭐
2. **SPF** (Easy, chỉ cần 1 TXT record) ⭐⭐⭐
3. **DMARC** (Medium, nhưng rất quan trọng) ⭐⭐⭐
4. **Custom MAIL FROM** (Optional, nhưng recommended) ⭐⭐

---

## 📚 **Tài Liệu Tham Khảo**

- [AWS SES Email Authentication](https://docs.aws.amazon.com/ses/latest/dg/email-authentication.html)
- [DMARC.org](https://dmarc.org/)
- [DKIM.org](https://dkim.org/)
- [SPF Record Syntax](https://tools.ietf.org/html/rfc7208)

---

**Last Updated:** 2025-01-20  
**Maintained by:** Development Team

