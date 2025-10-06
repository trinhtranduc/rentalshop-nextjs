# 🚀 Merchant Pricing System - Implementation Guide

## 📋 Overview

The **Merchant Pricing System** is a comprehensive solution that enables rental businesses to configure flexible pricing models based on their business type. This system supports multiple pricing types (FIXED, HOURLY, DAILY, WEEKLY) with intelligent validation and business-specific rules.

## 🎯 Key Features

### ✅ **Multi-Pricing Support**
- **FIXED**: One-time price per rental
- **HOURLY**: Price per hour (vehicles, tools)
- **DAILY**: Price per day (equipment, machinery)
- **WEEKLY**: Price per week (long-term rentals)

### ✅ **Business Type Intelligence**
- **VEHICLE**: Hourly pricing with weekend warnings
- **EQUIPMENT**: Daily pricing with business hours validation
- **CLOTHING**: Fixed pricing with advance notice warnings
- **GENERAL**: Flexible fixed pricing

### ✅ **Smart Validation**
- Duration limits enforcement
- Business-specific rules
- Real-time validation with helpful suggestions
- Error prevention and user guidance

### ✅ **Merchant-Level Configuration**
- Centralized pricing configuration
- Easy business type selection
- Configurable duration limits
- Business rule customization

## 🏗️ System Architecture

### **Database Layer**
```sql
-- Merchant table with pricing configuration
ALTER TABLE Merchant ADD COLUMN pricingConfig TEXT;
```

### **Type System**
```typescript
interface MerchantPricingConfig {
  businessType: BusinessType;
  defaultPricingType: PricingType;
  businessRules: PricingBusinessRules;
  durationLimits: PricingDurationLimits;
}
```

### **Core Components**
- **PricingResolver**: Price calculation logic
- **PricingValidator**: Validation and business rules
- **RentalPeriodSelector**: Smart UI component
- **PricingSection**: Merchant configuration UI

## 📦 Package Structure

```
packages/
├── constants/src/pricing.ts          # Business type defaults & constants
├── utils/src/core/
│   ├── pricing-resolver.ts           # Price calculation logic
│   └── pricing-validation.ts         # Validation & business rules
├── ui/src/components/
│   ├── features/Orders/RentalPeriodSelector.tsx
│   └── features/Settings/components/PricingSection.tsx
└── types/src/entities/merchant.ts    # Type definitions
```

## 🔧 Implementation Phases

### **Phase 1: Database & Migration** ✅
- Added `pricingConfig` column to Merchant table
- Created migration scripts
- Updated database schema

### **Phase 2: Backend APIs** ✅
- Merchant pricing configuration endpoints
- Order creation with pricing integration
- Database abstraction layer standardization

### **Phase 3: Frontend Core** ✅
- Business type selector for registration
- Pricing configuration UI for merchants
- Role-based access control

### **Phase 4: Order Flow** ✅
- Smart rental period selector
- Real-time price calculation
- Integration with order creation

### **Phase 5: Validation** ✅
- Comprehensive validation rules
- Business-specific validation logic
- Real-time error handling and suggestions

### **Phase 6: Testing** ✅
- Unit tests for all pricing logic
- Integration tests across business types
- Manual test scripts for validation

### **Phase 7: Data Migration** ✅
- Automated migration of existing merchants
- Business type detection and assignment
- Validation and rollback capabilities

### **Phase 8: Documentation** ✅
- Complete implementation guide
- API documentation
- User guides and examples

## 🚀 Quick Start

### **1. Database Setup**
```bash
# Apply database changes
yarn prisma db push

# Migrate existing merchants
yarn db:migrate-pricing

# Validate migration
yarn db:validate-pricing
```

### **2. Test the System**
```bash
# Run pricing system tests
yarn test:pricing
```

### **3. Start Development**
```bash
# Start all services
yarn dev:all
```

## 📖 Usage Examples

### **Vehicle Rental (Hourly)**
```typescript
const vehicleMerchant = {
  businessType: 'VEHICLE',
  pricingConfig: {
    defaultPricingType: 'HOURLY',
    businessRules: {
      requireRentalDates: true,
      showPricingOptions: true
    },
    durationLimits: {
      minDuration: 2,    // 2 hours minimum
      maxDuration: 168,  // 1 week maximum
      defaultDuration: 4 // 4 hours default
    }
  }
};
```

### **Equipment Rental (Daily)**
```typescript
const equipmentMerchant = {
  businessType: 'EQUIPMENT',
  pricingConfig: {
    defaultPricingType: 'DAILY',
    businessRules: {
      requireRentalDates: true,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1,   // 1 day minimum
      maxDuration: 30,  // 30 days maximum
      defaultDuration: 3 // 3 days default
    }
  }
};
```

### **Clothing Rental (Fixed)**
```typescript
const clothingMerchant = {
  businessType: 'CLOTHING',
  pricingConfig: {
    defaultPricingType: 'FIXED',
    businessRules: {
      requireRentalDates: false,
      showPricingOptions: false
    },
    durationLimits: {
      minDuration: 1, // 1 rental
      maxDuration: 1, // 1 rental
      defaultDuration: 1 // 1 rental
    }
  }
};
```

## 🔍 API Endpoints

### **Get Merchant Pricing Configuration**
```http
GET /api/merchants/{id}/pricing
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchantId": 1,
    "merchantName": "Vehicle Rental Co.",
    "businessType": "VEHICLE",
    "pricingConfig": {
      "businessType": "VEHICLE",
      "defaultPricingType": "HOURLY",
      "businessRules": {
        "requireRentalDates": true,
        "showPricingOptions": true
      },
      "durationLimits": {
        "minDuration": 2,
        "maxDuration": 168,
        "defaultDuration": 4
      }
    }
  }
}
```

### **Update Merchant Pricing Configuration**
```http
PUT /api/merchants/{id}/pricing
Authorization: Bearer {token}
Content-Type: application/json

{
  "businessType": "VEHICLE",
  "defaultPricingType": "HOURLY",
  "businessRules": {
    "requireRentalDates": true,
    "showPricingOptions": true
  },
  "durationLimits": {
    "minDuration": 2,
    "maxDuration": 168,
    "defaultDuration": 4
  }
}
```

## 🧪 Testing

### **Run All Tests**
```bash
# Test pricing system
yarn test:pricing

# Validate migration
yarn db:validate-pricing
```

### **Test Scenarios**
- ✅ Vehicle hourly rental with weekend warnings
- ✅ Equipment daily rental with business hours validation
- ✅ Clothing fixed rental with advance notice warnings
- ✅ General rental with flexible rules
- ✅ Validation error handling and suggestions
- ✅ Price calculation accuracy
- ✅ Configuration validation

## 🔧 Configuration Options

### **Business Rules**
```typescript
interface PricingBusinessRules {
  requireRentalDates: boolean;  // Require start/end dates
  showPricingOptions: boolean;  // Show pricing type options
}
```

### **Duration Limits**
```typescript
interface PricingDurationLimits {
  minDuration: number;    // Minimum rental duration
  maxDuration: number;    // Maximum rental duration
  defaultDuration: number; // Default rental duration
}
```

### **Business Type Defaults**
```typescript
const BUSINESS_TYPE_DEFAULTS = {
  VEHICLE: {
    defaultPricingType: 'HOURLY',
    businessRules: { requireRentalDates: true, showPricingOptions: true },
    durationLimits: { minDuration: 2, maxDuration: 168, defaultDuration: 4 }
  },
  EQUIPMENT: {
    defaultPricingType: 'DAILY',
    businessRules: { requireRentalDates: true, showPricingOptions: false },
    durationLimits: { minDuration: 1, maxDuration: 30, defaultDuration: 3 }
  },
  CLOTHING: {
    defaultPricingType: 'FIXED',
    businessRules: { requireRentalDates: false, showPricingOptions: false },
    durationLimits: { minDuration: 1, maxDuration: 1, defaultDuration: 1 }
  },
  GENERAL: {
    defaultPricingType: 'FIXED',
    businessRules: { requireRentalDates: false, showPricingOptions: false },
    durationLimits: { minDuration: 1, maxDuration: 1, defaultDuration: 1 }
  }
};
```

## 🚨 Error Handling

### **Validation Errors**
- Duration too short/long
- Invalid pricing configuration
- Missing required fields
- Business rule violations

### **Business Warnings**
- Weekend rental rates
- Business hours violations
- Long-term rental suggestions
- Advance notice recommendations

### **Error Response Format**
```json
{
  "success": false,
  "error": "Minimum vehicle rental is 2 hours",
  "suggestions": ["Try selecting a rental period of at least 2 hours"]
}
```

## 🔄 Migration & Rollback

### **Migrate Existing Merchants**
```bash
yarn db:migrate-pricing
```

### **Validate Migration**
```bash
yarn db:validate-pricing
```

### **Rollback Migration**
```bash
yarn db:rollback-pricing
```

## 🎯 Best Practices

### **1. Business Type Selection**
- Choose the most appropriate business type during registration
- Update business type if business model changes
- Use specific types (VEHICLE, EQUIPMENT, CLOTHING) when applicable

### **2. Duration Limits**
- Set realistic minimum and maximum durations
- Consider business hours and operational constraints
- Provide sensible default durations

### **3. Validation Rules**
- Enable rental date requirements for time-based pricing
- Show pricing options for flexible business models
- Configure appropriate validation rules per business type

### **4. Testing**
- Test all pricing types with your products
- Validate edge cases and error scenarios
- Ensure proper integration with order flow

## 🚀 Future Enhancements

### **Planned Features**
- **Product-Level Overrides**: Individual product pricing rules
- **Seasonal Pricing**: Time-based pricing adjustments
- **Bulk Discounts**: Volume-based pricing tiers
- **Promotional Pricing**: Special offers and discounts
- **Multi-Currency Support**: International pricing
- **Advanced Analytics**: Pricing performance insights

### **Extension Points**
- Custom business types
- Additional validation rules
- Integration with external pricing systems
- Advanced pricing algorithms

## 📞 Support & Troubleshooting

### **Common Issues**

1. **"Pricing configuration not found"**
   - Run migration: `yarn db:migrate-pricing`
   - Check merchant exists in database

2. **"Validation errors"**
   - Verify business type configuration
   - Check duration limits are valid
   - Ensure proper date formatting

3. **"Price calculation errors"**
   - Verify product rentPrice is set
   - Check rental dates are provided
   - Ensure merchant pricing config is valid

### **Debug Commands**
```bash
# Test pricing system
yarn test:pricing

# Validate database state
yarn db:validate-pricing

# Check package builds
yarn workspace @rentalshop/utils build
yarn workspace @rentalshop/ui build
```

## 🎉 Success Metrics

### **Implementation Complete** ✅
- ✅ All 8 phases completed successfully
- ✅ Comprehensive test coverage
- ✅ Full documentation provided
- ✅ Migration tools available
- ✅ Error handling implemented
- ✅ User-friendly interfaces

### **System Ready for Production** 🚀
- ✅ Database schema updated
- ✅ APIs implemented and tested
- ✅ UI components integrated
- ✅ Validation system active
- ✅ Migration completed
- ✅ Documentation complete

---

## 📝 Conclusion

The **Merchant Pricing System** is now fully implemented and ready for production use. This system provides:

- **Flexibility**: Multiple pricing models for different business types
- **Intelligence**: Smart validation and business-specific rules
- **Usability**: Intuitive interfaces for configuration and order creation
- **Reliability**: Comprehensive testing and error handling
- **Scalability**: Extensible architecture for future enhancements

The system successfully addresses the original requirement to support hourly and daily rentals while maintaining simplicity and extensibility. Merchants can now configure their pricing models based on their business type, and the system will intelligently validate and calculate prices accordingly.

**🎯 Mission Accomplished: The pricing system is ready to handle any rental business model!**
