# Test Cases cho Pickup và Return trong cùng ngày

## 📋 Tổng quan Logic

### Quy tắc tính doanh thu:
1. **Đơn cọc (RESERVED)**: `depositAmount`
   - **LƯU Ý**: Nếu pickup cùng ngày với tạo đơn, KHÔNG tạo deposit event riêng (đã bao gồm trong pickup revenue)
2. **Đơn lấy (PICKUPED)**:
   - Nếu pickup cùng ngày với tạo đơn: `totalAmount + securityDeposit` (KHÔNG trừ depositAmount)
   - Nếu pickup khác ngày: `totalAmount - depositAmount + securityDeposit` (trừ depositAmount vì đã thu riêng)
3. **Đơn trả (RETURNED)**:
   - Nếu thuê và trả cùng ngày: `totalAmount + damageFee` (KHÔNG tính deposit và pickup riêng)
   - Nếu khác ngày: `damageFee - securityDeposit` (âm nếu securityDeposit > damageFee = trả lại cho khách)

**LƯU Ý QUAN TRỌNG**: Quy trình luôn là: Tạo → Pickup → Return (luôn là vậy)

## 🧪 Test Cases Cần Thiết

### **Case 1: Pickup cùng ngày với tạo đơn (isSameDayPickup = true)**
**Scenario**: Đơn tạo 16/01, pickup 16/01, return 17/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 100,000 VNĐ (100k)

**Expected**: 
- ❌ KHÔNG có deposit event (vì pickup cùng ngày với tạo, đã bao gồm trong pickup revenue)
- ✅ Pickup event: 800k + 300k = 1,100k (16/01) - cùng ngày với tạo (KHÔNG trừ depositAmount)
- ✅ Return event: 100k - 300k = **-200k** (17/01) - **Trả lại cho khách** (âm vì securityDeposit > damageFee)

**Total revenue 16/01**: 1,100k (chỉ pickup, không tính deposit riêng)  
**Total revenue 17/01**: -200k (return - trả lại cho khách)

---

### **Case 2: Pickup khác ngày với tạo đơn (isSameDayPickup = false)**
**Scenario**: Đơn tạo 16/01, pickup 17/01, return 18/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 100,000 VNĐ (100k)

**Expected**:
- ✅ Deposit event: 200k (16/01)
- ✅ Pickup event: 800k - 200k + 300k = 900k (17/01) - khác ngày với tạo (trừ depositAmount vì đã thu riêng)
- ✅ Return event: 100k - 300k = **-200k** (18/01) - **Trả lại cho khách**

**Total revenue 16/01**: 200k  
**Total revenue 17/01**: 900k  
**Total revenue 18/01**: -200k (return - trả lại cho khách)

---

### **Case 3: Return cùng ngày với tạo đơn (không có pickup) - isSameDayReturn = true**
**Scenario**: Đơn tạo 16/01, return 16/01 (chưa pickup)

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 0 VNĐ (chưa pickup)
- `damageFee`: 50,000 VNĐ (50k)

**Expected**:
- ❌ KHÔNG có deposit event (vì cùng ngày return)
- ❌ KHÔNG có pickup event (chưa pickup)
- ✅ Return event: 800k + 50k = 850k (16/01) - cùng ngày với tạo

**Total revenue 16/01**: 850k

---

### **Case 4: Return cùng ngày với pickup - isSameDayReturn = true**
**Scenario**: Đơn tạo 16/01, pickup 16/01, return 16/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 50,000 VNĐ (50k)

**Expected**:
- ❌ KHÔNG có deposit event (vì cùng ngày return)
- ❌ KHÔNG có pickup event (vì cùng ngày return)
- ✅ Return event: 800k + 50k = 850k (16/01) - cùng ngày với pickup

**Total revenue 16/01**: 850k

---

### **Case 5: Return khác ngày - isSameDayReturn = false**
**Scenario**: Đơn tạo 16/01, pickup 17/01, return 18/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 100,000 VNĐ (100k)

**Expected**:
- ✅ Deposit event: 200k (16/01)
- ✅ Pickup event: 800k - 200k + 300k = 900k (17/01) - khác ngày
- ✅ Return event: 100k - 300k = **-200k** (18/01) - **Trả lại cho khách**

**Total revenue 16/01**: 200k  
**Total revenue 17/01**: 900k  
**Total revenue 18/01**: -200k (return - trả lại cho khách)

---

### **Case 6: Tạo + Pickup + Return tất cả cùng ngày**
**Scenario**: Đơn tạo 16/01, pickup 16/01, return 16/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 50,000 VNĐ (50k)

**Expected**:
- ❌ KHÔNG có deposit event (vì cùng ngày return)
- ❌ KHÔNG có pickup event (vì cùng ngày return)
- ✅ Return event: 800k + 50k = 850k (16/01)

**Total revenue 16/01**: 850k

---

### **Case 7: Tạo + Pickup cùng ngày, Return khác ngày**
**Scenario**: Đơn tạo 16/01, pickup 16/01, return 17/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 100,000 VNĐ (100k)

**Expected**:
- ❌ KHÔNG có deposit event (vì pickup cùng ngày với tạo, đã bao gồm trong pickup revenue)
- ✅ Pickup event: 800k + 300k = 1,100k (16/01) - cùng ngày với tạo (KHÔNG trừ depositAmount)
- ✅ Return event: 100k - 300k = **-200k** (17/01) - **Trả lại cho khách**

**Total revenue 16/01**: 1,100k (chỉ pickup, không tính deposit riêng)  
**Total revenue 17/01**: -200k (return - trả lại cho khách)

---

### **Case 8: Tạo khác ngày, Pickup + Return cùng ngày**
**Scenario**: Đơn tạo 16/01, pickup 17/01, return 17/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 50,000 VNĐ (50k)

**Expected**:
- ✅ Deposit event: 200k (16/01) - đã thu deposit ngày hôm trước
- ❌ KHÔNG có pickup event (vì cùng ngày return)
- ✅ Return event: 800k + 50k = 850k (17/01) - dùng ngày pickup để so sánh
- **LƯU Ý**: Return revenue = 850k, nhưng phải trừ đi:
  - Deposit đã thu ngày 16/01: -200k
  - SecurityDeposit đã thu (trong pickup, nhưng pickup không được tính vì cùng ngày return): -300k

**Total revenue 16/01**: 200k (deposit)  
**Total revenue 17/01**: 850k - 200k - 300k = **350k** (return - trừ deposit và securityDeposit đã thu)

---

### **Case 9: Pickup cùng ngày với tạo, Return khác ngày (có damageFee > securityDeposit)**
**Scenario**: Đơn tạo 16/01, pickup 16/01, return 17/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 400,000 VNĐ (400k) - **Lớn hơn securityDeposit**

**Expected**:
- ❌ KHÔNG có deposit event (vì pickup cùng ngày với tạo, đã bao gồm trong pickup revenue)
- ✅ Pickup event: 800k + 300k = 1,100k (16/01) - cùng ngày với tạo (KHÔNG trừ depositAmount)
- ✅ Return event: 400k - 300k = **100k** (17/01) - **Thu thêm phí hư hỏng** (dương vì damageFee > securityDeposit)

**Total revenue 16/01**: 1,100k (chỉ pickup, không tính deposit riêng)  
**Total revenue 17/01**: 100k (return - thu thêm phí hư hỏng)

---

### **Case 10: Return cùng ngày với tạo (có damageFee > totalAmount)**
**Scenario**: Đơn tạo 16/01, return 16/01 (chưa pickup)

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 0 VNĐ (chưa pickup)
- `damageFee`: 1,000,000 VNĐ (1,000k) - **Lớn hơn totalAmount**

**Expected**:
- ✅ Return event: 800k + 1,000k = **1,800k** (16/01) - cùng ngày với tạo

**Total revenue 16/01**: 1,800k

---

### **Case 11: Return cùng ngày với pickup (có damageFee = 0)**
**Scenario**: Đơn tạo 16/01, pickup 16/01, return 16/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 0 VNĐ - **Không có hư hỏng**

**Expected**:
- ✅ Return event: 800k + 0 = 800k (16/01)

**Total revenue 16/01**: 800k

---

### **Case 12: Return khác ngày (có damageFee = securityDeposit)**
**Scenario**: Đơn tạo 16/01, pickup 17/01, return 18/01

**Data**:
- `totalAmount`: 800,000 VNĐ (800k)
- `depositAmount`: 200,000 VNĐ (200k)
- `securityDeposit`: 300,000 VNĐ (300k)
- `damageFee`: 300,000 VNĐ (300k) - **Bằng securityDeposit**

**Expected**:
- ✅ Deposit event: 200k (16/01)
- ✅ Pickup event: 800k - 200k + 300k = 900k (17/01)
- ✅ Return event: 300k - 300k = **0k** (18/01) - **Không có phát sinh**

**Total revenue 16/01**: 200k  
**Total revenue 17/01**: 900k  
**Total revenue 18/01**: 0k (return - không có phát sinh)

---

## 📊 Tóm tắt các biến kiểm tra

### isSameDayPickup
- **true**: Pickup cùng ngày với tạo đơn → revenue = `totalAmount + securityDeposit` (KHÔNG trừ depositAmount)
- **false**: Pickup khác ngày → revenue = `totalAmount - depositAmount + securityDeposit` (trừ depositAmount vì đã thu riêng)

### isSameDayReturn
- **true**: Return cùng ngày với tạo/lấy → 
  - KHÔNG tạo deposit event
  - KHÔNG tạo pickup event
  - Chỉ tạo return event: `totalAmount + damageFee`
- **false**: Return khác ngày →
  - Tạo deposit event (nếu trong khoảng và không cùng ngày pickup)
  - Tạo pickup event (nếu trong khoảng)
  - Tạo return event: `damageFee - securityDeposit`
    - **Dương**: Thu thêm phí hư hỏng (damageFee > securityDeposit)
    - **Âm**: Trả lại cho khách (securityDeposit > damageFee)
    - **0**: Không có phát sinh (damageFee = securityDeposit)

## 🔍 Edge Cases

1. **Pickup cùng ngày nhưng return khác ngày**: 
   - Pickup revenue = totalAmount + securityDeposit (KHÔNG trừ depositAmount)
   - Return revenue = damageFee - securityDeposit
2. **Return cùng ngày nhưng pickup khác ngày**: 
   - Chỉ tính return event: totalAmount + damageFee
   - Nhưng phải trừ đi deposit đã thu (nếu có) và securityDeposit đã thu (trong pickup)
   - Total revenue = (totalAmount + damageFee) - depositAmount - securityDeposit
3. **Tất cả cùng ngày**: Chỉ tính return event: totalAmount + damageFee
4. **Pickup cùng ngày với tạo nhưng return cùng ngày với pickup**: Chỉ tính return event: totalAmount + damageFee

## ⚠️ LƯU Ý QUAN TRỌNG

**Quy trình luôn là: Tạo → Pickup → Return (luôn là vậy)**

- Đơn luôn được tạo trước (RESERVED)
- Sau đó mới pickup (PICKUPED)
- Cuối cùng mới return (RETURNED)
