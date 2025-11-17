# AWS SES Production Access Request Response (Simple Version)

## 📧 Email Response Template

---

**Subject: Re: Request for Production Access**

Hello AWS SES Support Team,

Thank you for reviewing our request. Below is the information about our use case:

## 🏢 **About Our Platform**

We are **AnyRent** (https://anyrent.shop), a rental shop management SaaS platform.

## 📧 **Email Use Cases**

We send two types of emails:

1. **Account Verification Emails (Transactional)**
   - Verify user email addresses during registration
   - Sent immediately when user registers (one-time)
   - Volume: ~50-100 emails/month

2. **Marketing Emails (Promotional)**
   - Product updates, newsletters, and promotional content
   - Frequency: 1-2 times per month
   - Volume: ~200-500 emails/month
   - **Opt-in Required**: Users must explicitly opt-in through account settings

**Total Expected Volume**: ~250-600 emails/month (8-20 emails/day)

## 📋 **Email Sending Practices**

- **Recipients**: Only registered users who provide their email addresses during registration
- **Marketing Opt-in**: Users must explicitly enable marketing emails in account settings
- **Unsubscribe**: All marketing emails include unsubscribe link, users can opt-out anytime
- **Verified Identity**: Domain `anyrent.shop` is verified in Asia Pacific (Singapore) region

## 🎯 **Requested Limits**

- Daily Quota: 1,000 emails/day
- Send Rate: 2 emails/second

Thank you for your consideration.

Best regards,
[Your Name]
AnyRent Platform Team
