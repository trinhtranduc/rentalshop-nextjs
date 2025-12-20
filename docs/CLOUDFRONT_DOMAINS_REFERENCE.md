# 📋 CloudFront Distribution Domains Reference

## ✅ CloudFront Distributions

### **Development Distribution: AnyRent Images Dev**

- **Distribution Name:** `AnyRent Images Dev`
- **Distribution Domain:** `d2e6a656cqucti.cloudfront.net`
- **Distribution ID:** `E19S291JLEC5EE`
- **ARN:** `arn:aws:cloudfront::124328426706:distribution/E19S291JLEC5EE`
- **Custom Domain:** `dev-images.anyrent.shop`
- **SSL Certificate:** `*.anyrent.shop`
- **Origin:** `anyrent-images-dev.s3.ap-southeast-1.amazonaws.com`
- **Last Modified:** December 11, 2025 at 7:59:09 AM UTC

**DNS Record Target:**
```
Type:     CNAME
Name:     dev-images
Target:   d2e6a656cqucti.cloudfront.net  ← ĐÚNG
Proxy:    ⚪ DNS only (gray cloud)
```

---

### **Production Distribution: AnyRent Images Pro**

- **Distribution Name:** `AnyRent Images Pro`
- **Distribution Domain:** `dhdvaoq6ff050.cloudfront.net`
- **Distribution ID:** `E29YVDA77K7`
- **ARN:** `arn:aws:cloudfront::124328426706:distribution/E29YVDA77K7`
- **Custom Domain:** `images.anyrent.shop`
- **SSL Certificate:** `*.anyrent.shop`
- **Origin:** `anyrent-images-pro.s3.ap-southeast-1.amazonaws.com`
- **Last Modified:** December 11, 2025 at 7:58:37 AM UTC

**DNS Record Target:**
```
Type:     CNAME
Name:     images
Target:   dhdvaoq6ff050.cloudfront.net  ← ĐÚNG
Proxy:    ⚪ DNS only (gray cloud)
```

---

## 🔍 Verification Checklist

### **Check DNS Record Target:**

```bash
# Development
dig dev-images.anyrent.shop +short
# Expected: d2e6a656cqucti.cloudfront.net

# Production
dig images.anyrent.shop +short
# Expected: dhdvaoq6ff050.cloudfront.net
```

### **Check CloudFront Alternate Domain Names:**

**Development:**
- ✅ Alternate domain names: `dev-images.anyrent.shop
- ✅ Distribution domain: `d2e6a656cqucti.cloudfront.net`

**Production:**
- ✅ Alternate domain names: `images.anyrent.shop`
- ✅ Distribution domain: `dhdvaoq6ff050.cloudfront.net`

---

## ⚠️ Common Mistakes

### **❌ Wrong Target:**

```
dev-images → dhdvaoq6ff050.cloudfront.net  ← SAI (đây là production)
```

**Vấn đề:** Production distribution không có alternate domain `dev-images.anyrent.shop`

### **✅ Correct Target:**

```
dev-images → d2e6a656cqucti.cloudfront.net  ← ĐÚNG (development)
```

**Lý do:** Development distribution có alternate domain `dev-images.anyrent.shop`

---

## 📋 Quick Reference

| Custom Domain | CloudFront Domain | Distribution | Environment |
|---------------|------------------|--------------|-------------|
| `dev-images.anyrent.shop` | `d2e6a656cqucti.cloudfront.net` | AnyRent Images Dev | Development |
| `images.anyrent.shop` | `dhdvaoq6ff050.cloudfront.net` | AnyRent Images Pro | Production |

---

**Last Updated:** 2025-12-20  
**Source:** AWS CloudFront Console Screenshots

