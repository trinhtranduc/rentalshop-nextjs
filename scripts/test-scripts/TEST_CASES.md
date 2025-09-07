# 🧪 Test Cases for Plan and Subscription Management

## 📋 **PLAN CHANGE TEST CASES**

### **1. Authentication & Authorization Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-001** | Admin can change any merchant's plan | ✅ Success | High |
| **PC-002** | Merchant can change their own plan | ✅ Success | High |
| **PC-003** | Outlet admin cannot change plans | ❌ Forbidden | High |
| **PC-004** | Outlet staff cannot change plans | ❌ Forbidden | High |
| **PC-005** | Unauthenticated user cannot change plans | ❌ Unauthorized | High |
| **PC-006** | Invalid token cannot change plans | ❌ Unauthorized | High |

### **2. Plan Validation Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-007** | Change to valid existing plan | ✅ Success | High |
| **PC-008** | Change to non-existent plan | ❌ Invalid plan | High |
| **PC-009** | Change to inactive plan | ❌ Plan not available | High |
| **PC-010** | Change to same plan | ⚠️ No change needed | Medium |
| **PC-011** | Change to plan with insufficient limits | ❌ Resource limit exceeded | High |

### **3. Resource Limit Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-012** | Change to plan with higher limits | ✅ Success | High |
| **PC-013** | Change to plan with lower limits (within current usage) | ✅ Success | High |
| **PC-014** | Change to plan with lower limits (exceeds current usage) | ❌ Resource limit exceeded | High |
| **PC-015** | Check outlet count limits | ✅ Validated | High |
| **PC-016** | Check user count limits | ✅ Validated | High |
| **PC-017** | Check product count limits | ✅ Validated | High |
| **PC-018** | Check order count limits | ✅ Validated | High |

### **4. Proration Calculation Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-019** | Upgrade mid-cycle (proration credit) | ✅ Credit calculated | High |
| **PC-020** | Downgrade mid-cycle (proration charge) | ✅ Charge calculated | High |
| **PC-021** | Same price plan change | ✅ No proration | Medium |
| **PC-022** | Proration with different billing cycles | ✅ Calculated correctly | High |
| **PC-023** | Proration with discounts | ✅ Discounts applied | Medium |

### **5. Date Calculation Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-024** | Plan change preserves current end date | ✅ End date unchanged | High |
| **PC-025** | Plan change with immediate effect (today) | ✅ Start date = 2025-09-07T00:00:00Z | High |
| **PC-026** | Plan change with future start date (2025-09-15) | ✅ Start date = 2025-09-15T00:00:00Z | High |
| **PC-027** | Plan change with specific end date (2025-12-07) | ✅ End date = 2025-12-07T23:59:59Z | High |
| **PC-028** | Plan change maintains billing cycle | ✅ Billing cycle preserved | High |
| **PC-029** | Plan change with exact timestamp validation | ✅ Dates match exactly | High |

### **6. Billing Duration Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-030** | Change to monthly billing | ✅ Monthly pricing | High |
| **PC-031** | Change to quarterly billing (5% discount) | ✅ Quarterly pricing with discount | High |
| **PC-032** | Change to yearly billing (10% discount) | ✅ Yearly pricing with discount | High |
| **PC-033** | Invalid billing duration | ❌ Invalid duration | High |
| **PC-034** | Billing duration change only | ✅ Duration updated | Medium |
| **PC-035** | Monthly billing with exact dates (2025-09-07 to 2025-10-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2025-10-07T23:59:59Z | High |
| **PC-036** | Quarterly billing with exact dates (2025-09-07 to 2025-12-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2025-12-07T23:59:59Z | High |
| **PC-037** | Yearly billing with exact dates (2025-09-07 to 2026-09-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2026-09-07T23:59:59Z | High |
| **PC-038** | Billing duration change mid-cycle | ✅ Proration calculated correctly | High |
| **PC-039** | Billing duration with leap year handling | ✅ Correct date calculation | Medium |
| **PC-040** | Billing duration with timezone handling | ✅ UTC dates preserved | High |

### **7. Proration Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-041** | Proration calculation for mid-cycle plan change | ✅ Correct proration amount | High |
| **PC-042** | Proration with monthly billing (15 days remaining) | ✅ 50% proration | High |
| **PC-043** | Proration with quarterly billing (45 days remaining) | ✅ 50% proration | High |
| **PC-044** | Proration with yearly billing (6 months remaining) | ✅ 50% proration | High |
| **PC-045** | Proration with upgrade (higher price plan) | ✅ Additional charge calculated | High |
| **PC-046** | Proration with downgrade (lower price plan) | ✅ Credit calculated | High |
| **PC-047** | Proration with exact dates (2025-09-07 to 2025-09-22) | ✅ 15-day proration | High |
| **PC-048** | Proration with timezone handling | ✅ UTC dates preserved | High |
| **PC-049** | Proration with leap year calculation | ✅ Correct calculation | Medium |
| **PC-050** | Proration with different billing cycles | ✅ Cross-cycle proration | High |

### **8. API Integration Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-033** | Admin change plan API call | ✅ Success response | High |
| **PC-034** | Merchant change plan API call | ✅ Success response | High |
| **PC-035** | Invalid merchant ID | ❌ Merchant not found | High |
| **PC-036** | Missing required fields | ❌ Validation error | High |
| **PC-037** | API response format validation | ✅ Correct format | Medium |

### **8. Database Update Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-038** | Merchant plan updated in database | ✅ Plan updated | High |
| **PC-039** | Subscription dates updated | ✅ Dates updated | High |
| **PC-040** | Plan change history recorded | ✅ History logged | Medium |
| **PC-041** | Resource limits updated | ✅ Limits updated | High |

### **9. Merchant Detail Update Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-042** | Merchant.planId updated correctly | ✅ Plan ID updated | High |
| **PC-043** | Merchant.subscriptionStatus updated | ✅ Status updated | High |
| **PC-044** | Merchant.updatedAt timestamp updated | ✅ Timestamp updated | High |
| **PC-045** | Merchant plan details match subscription | ✅ Data consistency | High |
| **PC-046** | Merchant subscription dates match | ✅ Date consistency | High |
| **PC-047** | Merchant billing cycle updated | ✅ Billing cycle updated | High |
| **PC-048** | Merchant resource limits updated | ✅ Limits updated | High |

### **10. Expired Merchant API Access Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **PC-049** | Expired merchant cannot access merchant APIs | ❌ Subscription expired error | High |
| **PC-050** | Expired merchant cannot access outlet APIs | ❌ Subscription expired error | High |
| **PC-051** | Expired merchant cannot access product APIs | ❌ Subscription expired error | High |
| **PC-052** | Expired merchant cannot access order APIs | ❌ Subscription expired error | High |
| **PC-053** | Expired merchant cannot access customer APIs | ❌ Subscription expired error | High |
| **PC-054** | Expired merchant cannot access user APIs | ❌ Subscription expired error | High |
| **PC-055** | Expired merchant cannot access analytics APIs | ❌ Subscription expired error | High |
| **PC-056** | Expired merchant cannot access payment APIs | ❌ Subscription expired error | High |
| **PC-057** | Expired merchant cannot access plan change APIs | ❌ Subscription expired error | High |
| **PC-058** | Expired merchant can only access extension APIs | ✅ Extension APIs only | High |

---

## 📋 **SUBSCRIPTION EXTENSION TEST CASES**

### **1. Authentication & Authorization Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-001** | Admin can extend any merchant's subscription | ✅ Success | High |
| **SE-002** | Merchant can extend their own subscription | ✅ Success | High |
| **SE-003** | Outlet admin cannot extend subscriptions | ❌ Forbidden | High |
| **SE-004** | Outlet staff cannot extend subscriptions | ❌ Forbidden | High |
| **SE-005** | Unauthenticated user cannot extend | ❌ Unauthorized | High |
| **SE-006** | Invalid token cannot extend | ❌ Unauthorized | High |

### **2. Expiration Detection Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-007** | Subscription expires in 1 day (Critical) | ⚠️ Critical alert | High |
| **SE-008** | Subscription expires in 3 days (High) | ⚠️ High alert | High |
| **SE-009** | Subscription expires in 7 days (Medium) | ⚠️ Medium alert | High |
| **SE-010** | Subscription expires in 30 days (Low) | ℹ️ Info alert | Medium |
| **SE-011** | Subscription already expired | ❌ Expired subscription | High |
| **SE-012** | No active subscription | ❌ No subscription | High |

### **3. Extension Period Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-013** | Extend by 1 month | ✅ 1 month added | High |
| **SE-014** | Extend by 3 months | ✅ 3 months added | High |
| **SE-015** | Extend by 6 months | ✅ 6 months added | High |
| **SE-016** | Extend by 1 year | ✅ 1 year added | High |
| **SE-017** | Invalid extension period | ❌ Invalid period | High |
| **SE-018** | Zero extension period | ❌ Invalid period | High |
| **SE-019** | Extend by 1 month with exact dates (2025-09-07 to 2025-10-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2025-10-07T23:59:59Z | High |
| **SE-020** | Extend by 3 months with exact dates (2025-09-07 to 2025-12-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2025-12-07T23:59:59Z | High |
| **SE-021** | Extend by 6 months with exact dates (2025-09-07 to 2026-03-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2026-03-07T23:59:59Z | High |
| **SE-022** | Extend by 1 year with exact dates (2025-09-07 to 2026-09-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2026-09-07T23:59:59Z | High |
| **SE-023** | Extend with specific start date (2025-09-15) | ✅ Start date = 2025-09-15T00:00:00Z | High |
| **SE-024** | Extend with specific end date (2025-12-31) | ✅ End date = 2025-12-31T23:59:59Z | High |

### **4. Date Calculation Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-019** | Extend from current end date | ✅ End date updated | High |
| **SE-020** | Extend from today (if expired) | ✅ Start from today | High |
| **SE-021** | Extend preserves billing cycle | ✅ Billing cycle maintained | High |
| **SE-022** | Extend with different billing cycles | ✅ Calculated correctly | Medium |

### **5. Billing Duration Tests for Extensions**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-025** | Extend with monthly billing | ✅ Monthly pricing | High |
| **SE-026** | Extend with quarterly billing (5% discount) | ✅ Quarterly pricing | High |
| **SE-027** | Extend with yearly billing (10% discount) | ✅ Yearly pricing | High |
| **SE-028** | Change billing duration during extension | ✅ Duration updated | Medium |
| **SE-029** | Monthly extension with exact dates (2025-09-07 to 2025-10-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2025-10-07T23:59:59Z | High |
| **SE-030** | Quarterly extension with exact dates (2025-09-07 to 2025-12-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2025-12-07T23:59:59Z | High |
| **SE-031** | Yearly extension with exact dates (2025-09-07 to 2026-09-07) | ✅ Dates = 2025-09-07T00:00:00Z to 2026-09-07T23:59:59Z | High |
| **SE-032** | Billing duration change mid-extension | ✅ Proration calculated correctly | High |
| **SE-033** | Extension with leap year handling (2024-02-29) | ✅ Correct date calculation | Medium |
| **SE-034** | Extension with timezone handling | ✅ UTC dates preserved | High |

### **6. Proration Tests for Extensions**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-035** | Proration calculation for mid-cycle extension | ✅ Correct proration amount | High |
| **SE-036** | Proration with monthly extension (15 days remaining) | ✅ 50% proration | High |
| **SE-037** | Proration with quarterly extension (45 days remaining) | ✅ 50% proration | High |
| **SE-038** | Proration with yearly extension (6 months remaining) | ✅ 50% proration | High |
| **SE-039** | Proration with exact dates (2025-09-07 to 2025-09-22) | ✅ 15-day proration | High |
| **SE-040** | Proration with timezone handling | ✅ UTC dates preserved | High |
| **SE-041** | Proration with leap year calculation | ✅ Correct calculation | Medium |
| **SE-042** | Proration with different billing cycles | ✅ Cross-cycle proration | High |
| **SE-043** | Proration with partial month extension | ✅ Partial month calculation | High |
| **SE-044** | Proration with multiple period extension | ✅ Multi-period calculation | High |

### **7. Cost Calculation Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-027** | Calculate extension cost (monthly) | ✅ Correct cost | High |
| **SE-028** | Calculate extension cost (quarterly) | ✅ Correct cost with discount | High |
| **SE-029** | Calculate extension cost (yearly) | ✅ Correct cost with discount | High |
| **SE-030** | Calculate savings from billing duration | ✅ Savings calculated | Medium |

### **7. Alert System Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-031** | Generate critical expiration alert | ⚠️ Critical alert shown | High |
| **SE-032** | Generate high expiration alert | ⚠️ High alert shown | High |
| **SE-033** | Generate medium expiration alert | ⚠️ Medium alert shown | High |
| **SE-034** | Generate low expiration alert | ℹ️ Info alert shown | Medium |
| **SE-035** | Alert for expired subscription | ❌ Expired alert | High |
| **SE-036** | No alert for valid subscription | ✅ No alert | Medium |

### **8. API Integration Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-037** | Admin extend subscription API | ✅ Success response | High |
| **SE-038** | Merchant extend subscription API | ✅ Success response | High |
| **SE-039** | Invalid merchant ID | ❌ Merchant not found | High |
| **SE-040** | Missing extension period | ❌ Validation error | High |
| **SE-041** | API response format validation | ✅ Correct format | Medium |

### **9. Database Update Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-042** | Subscription end date updated | ✅ End date updated | High |
| **SE-043** | Extension history recorded | ✅ History logged | Medium |
| **SE-044** | Billing duration updated | ✅ Duration updated | High |
| **SE-045** | Alert status updated | ✅ Alert cleared | Medium |

### **10. Merchant Detail Update Tests for Extensions**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-046** | Merchant.subscriptionStatus remains ACTIVE | ✅ Status maintained | High |
| **SE-047** | Merchant.updatedAt timestamp updated | ✅ Timestamp updated | High |
| **SE-048** | Merchant subscription dates updated | ✅ Dates updated | High |
| **SE-049** | Merchant plan details remain consistent | ✅ Data consistency | High |
| **SE-050** | Merchant billing cycle preserved | ✅ Billing cycle maintained | High |
| **SE-051** | Merchant resource limits preserved | ✅ Limits maintained | High |
| **SE-052** | Merchant expiration alerts cleared | ✅ Alerts cleared | Medium |

### **11. Expired Merchant API Access Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **SE-053** | Expired merchant cannot access merchant APIs | ❌ Subscription expired error | High |
| **SE-054** | Expired merchant cannot access outlet APIs | ❌ Subscription expired error | High |
| **SE-055** | Expired merchant cannot access product APIs | ❌ Subscription expired error | High |
| **SE-056** | Expired merchant cannot access order APIs | ❌ Subscription expired error | High |
| **SE-057** | Expired merchant cannot access customer APIs | ❌ Subscription expired error | High |
| **SE-058** | Expired merchant cannot access user APIs | ❌ Subscription expired error | High |
| **SE-059** | Expired merchant cannot access analytics APIs | ❌ Subscription expired error | High |
| **SE-060** | Expired merchant cannot access payment APIs | ❌ Subscription expired error | High |
| **SE-061** | Expired merchant can only access extension APIs | ✅ Extension APIs only | High |
| **SE-062** | Expired merchant cannot access plan change APIs | ❌ Subscription expired error | High |

---

## 📋 **BILLING DURATION TEST CASES**

### **1. Billing Cycle Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **BD-001** | Change to monthly billing | ✅ Monthly pricing | High |
| **BD-002** | Change to quarterly billing | ✅ Quarterly pricing + 5% discount | High |
| **BD-003** | Change to yearly billing | ✅ Yearly pricing + 10% discount | High |
| **BD-004** | Invalid billing duration | ❌ Invalid duration | High |
| **BD-005** | Same billing duration | ⚠️ No change needed | Medium |

### **2. Discount Calculation Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **BD-006** | Calculate 5% quarterly discount | ✅ 5% discount applied | High |
| **BD-007** | Calculate 10% yearly discount | ✅ 10% discount applied | High |
| **BD-008** | Calculate monthly pricing (no discount) | ✅ No discount | High |
| **BD-009** | Calculate savings amount | ✅ Savings calculated | Medium |

### **3. Cost Calculation Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **BD-010** | Calculate monthly cost | ✅ Monthly cost | High |
| **BD-011** | Calculate quarterly cost | ✅ Quarterly cost | High |
| **BD-012** | Calculate yearly cost | ✅ Yearly cost | High |
| **BD-013** | Calculate total savings | ✅ Total savings | Medium |

---

## 📋 **EDGE CASE TEST CASES**

### **1. Boundary Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **EC-001** | Plan change on last day of cycle | ✅ Handled correctly | High |
| **EC-002** | Extension on expiration day | ✅ Handled correctly | High |
| **EC-003** | Billing duration change mid-cycle | ✅ Proration calculated | Medium |
| **EC-004** | Multiple rapid changes | ✅ Last change wins | Medium |

### **2. Error Handling Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **EC-005** | Database connection error | ❌ Graceful error handling | High |
| **EC-006** | API timeout | ❌ Timeout handling | Medium |
| **EC-007** | Invalid data format | ❌ Validation error | High |
| **EC-008** | Concurrent modifications | ❌ Conflict resolution | Medium |

### **3. Performance Tests**
| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| **EC-009** | Large number of merchants | ✅ Performance acceptable | Medium |
| **EC-010** | Complex proration calculations | ✅ Performance acceptable | Medium |
| **EC-011** | Bulk operations | ✅ Performance acceptable | Low |

---

## 📊 **TEST EXECUTION SUMMARY**

### **Total Test Cases: 110**
- **Plan Change Tests**: 58 test cases
- **Subscription Extension Tests**: 62 test cases  
- **Billing Duration Tests**: 13 test cases
- **Edge Case Tests**: 11 test cases

### **Priority Distribution:**
- **High Priority**: 97 test cases (88%)
- **Medium Priority**: 11 test cases (10%)
- **Low Priority**: 2 test cases (2%)

### **Test Categories:**
- **Authentication & Authorization**: 12 test cases
- **Validation & Business Logic**: 25 test cases
- **API Integration**: 8 test cases
- **Database Operations**: 8 test cases
- **Merchant Detail Updates**: 15 test cases
- **Expired Merchant API Access**: 20 test cases
- **Edge Cases & Error Handling**: 11 test cases
- **Performance**: 3 test cases

---

## 🚀 **Test Execution Commands**

```bash
# Run all tests
node scripts/test-scripts/run-all-tests.js

# Run specific test suites
node scripts/test-scripts/test-plan-change.js
node scripts/test-scripts/test-subscription-extension.js
node scripts/test-scripts/test-authentication.js

# Run with verbose output
DEBUG=true node scripts/test-scripts/run-all-tests.js
```

---

## 📝 **Test Data Requirements**

To run all test cases successfully, ensure:
1. **Admin user** exists: `admin@rentalshop.com` / `admin123`
2. **Merchant users** with active subscriptions
3. **Plans** with different pricing and limits
4. **Test merchants** with various subscription states
5. **Database** properly seeded with test data

Run: `node scripts/seed-modern-subscriptions.js` to create test data.
