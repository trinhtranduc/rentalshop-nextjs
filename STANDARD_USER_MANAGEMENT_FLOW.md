# Standard User Management Flow - Complete Implementation Guide

This document outlines the complete, working user management system that serves as a template for other entity management pages (customers, products, orders, etc.).

## 🏗️ Architecture Overview

```
Client Page → Users Component → UserFormDialog → API Route → Database Functions → Database
     ↑              ↓              ↓           ↓           ↓
  State Update ← Refresh ← Success Handler ← Response ← Database Result
```

## 📁 File Structure

```
packages/ui/src/components/features/Users/
├── components/
│   ├── UserActions.tsx          # Handles all user actions (create, edit, view, deactivate)
│   ├── UserFormDialog.tsx       # Form for creating/editing users
│   ├── UserDetailDialog.tsx     # View user details
│   ├── UserTable.tsx            # Table view of users
│   ├── UserGrid.tsx             # Grid view of users
│   ├── UserFilters.tsx          # Search and filter controls
│   └── UserPagination.tsx       # Pagination controls
├── types.ts                     # TypeScript interfaces
├── utils/                       # Utility functions
└── index.tsx                    # Main Users component

apps/client/app/users/
└── page.tsx                     # Client-side page with API integration

apps/api/app/api/users/
├── route.ts                     # Main CRUD operations (GET, POST, PUT)
├── [userId]/
│   ├── route.ts                 # DELETE operation
│   ├── activate/route.ts        # Activate user
│   ├── deactivate/route.ts      # Deactivate user
│   └── change-password/route.ts # Change password

packages/database/src/
├── utils.ts                     # User database functions
└── index.ts                     # Exports all database functions
```

## 🔄 Data Flow

### **Create User Flow**
1. **User clicks "Add User" button** → Opens UserFormDialog
2. **User fills form** → Validation runs on submit
3. **Form submits** → Calls `onUserCreated` callback
4. **Client page receives** → Calls `usersApi.createUserAndRefresh`
5. **API route processes** → Validates data, calls database function
6. **Database creates user** → Returns new user data
7. **API responds** → Success response with user data
8. **Client refreshes list** → Updates UI with new data

### **Update User Flow**
1. **User clicks "Edit"** → Opens UserFormDialog with existing data
2. **User modifies form** → Validation runs on submit
3. **Form submits** → Calls `onUserUpdated` callback
4. **Client page receives** → Calls `usersApi.updateUserAndRefresh`
5. **API route processes** → Validates data, calls database function
6. **Database updates user** → Returns updated user data
7. **API responds** → Success response with user data
8. **Client refreshes list** → Updates UI with updated data

### **Delete/Deactivate Flow**
1. **User clicks action** → Confirmation dialog appears
2. **User confirms** → Calls `onAction` callback
3. **Client page receives** → Calls appropriate API function
4. **API route processes** → Calls database function
5. **Database updates** → User status changed or deleted
6. **Client refreshes list** → Updates UI

## 🎯 Key Components

### **1. UserFormDialog (Create/Edit Form)**
- **Purpose**: Single form component for both creating and editing users
- **Props**: `user` (null for create, User object for edit)
- **Features**:
  - Form validation with real-time error display
  - Password fields only for new users
  - Loading states and disabled form during submission
  - Error handling with user-friendly messages
  - Proper TypeScript typing
  - **Merchant-scoped uniqueness**: Email and phone must be unique within merchant
  - **Phone field**: Optional field with no format validation

### **2. UserActions (Action Handler)**
- **Purpose**: Centralized handler for all user actions
- **Actions**: Create, Edit, View, Deactivate, Delete
- **Features**:
  - Event-driven architecture
  - Proper error handling
  - Dialog state management
  - Action confirmation dialogs

### **3. Users Component (Main Container)**
- **Purpose**: Orchestrates all user management operations
- **Features**:
  - View mode switching (table/grid)
  - Search and filtering
  - Pagination
  - Error handling
  - Success feedback

### **4. API Routes (Backend)**
- **Purpose**: Handle HTTP requests and database operations
- **Features**:
  - Authentication and authorization
  - Input validation with Zod schemas
  - Proper error handling and status codes
  - Database function calls
  - Response formatting
  - **Merchant-scoped uniqueness checking**: Prevents duplicate email/phone within merchant

### **5. Database Functions (Data Layer)**
- **Purpose**: Abstract database operations
- **Features**:
  - Prisma client usage
  - Proper error handling
  - Logging for debugging
  - Type safety
  - **Merchant-scoped uniqueness**: Database-level constraints for merchant-scoped uniqueness

## 🔔 Toast Notification System

### **Purpose**
Provide consistent user feedback across all operations with visual notifications.

### **Components**
- **Toast**: Individual notification component with different types
- **ToastContainer**: Container for managing multiple toasts
- **useToasts**: Hook for managing toast state and operations

### **Features**
- Multiple notification types: success, error, warning, info
- Auto-hide with configurable duration
- Manual close option
- Smooth animations
- Reusable across all pages

### **Usage in User Management**
```typescript
const { showSuccess, showError } = useToasts();

// Show success message
showSuccess('User Created', 'New user has been created successfully');

// Show error message (no auto-hide)
showError('Operation Failed', 'Failed to create user');
```

### **Integration Points**
1. **Form submissions**: Success/error feedback
2. **API operations**: Loading states and results
3. **Data operations**: Create, update, delete feedback
4. **Error handling**: User-friendly error messages

## 🔐 Merchant-Scoped Uniqueness

### **Business Rules**
- **Email**: Must be unique within the same merchant organization
- **Phone**: Must be unique within the same merchant organization (optional field)
- **Cross-merchant**: Users can have the same email/phone across different merchants
- **Admin users**: Can create users within their own merchant organization or system-wide

### **Database Constraints**
```prisma
model User {
  // ... other fields
  
  merchantId String?
  merchant   Merchant? @relation(fields: [merchantId], references: [id])
  
  // Merchant-scoped uniqueness constraints
  @@unique([merchantId, email]) // Email unique within merchant
  @@unique([merchantId, phone]) // Phone unique within merchant (when not null)
}
```

### **Validation Flow**
1. **Client-side**: Basic format validation (email format, required fields)
2. **API-level**: Duplicate checking within merchant before database operation
3. **Database-level**: Unique constraints enforced at database level
4. **Error handling**: Clear error messages for duplicate violations

### **Implementation Details**
- **API Route**: Gets merchant ID from authenticated user
- **Database Function**: Checks for existing users within same merchant
- **Error Messages**: Specific to merchant-scoped violations
- **Status Codes**: 409 Conflict for uniqueness violations

## 🚀 Implementation Steps for New Entity

### **Step 1: Create Database Functions**
```typescript
// packages/database/src/entity.ts
export const createEntity = async (data: EntityInput) => {
  console.log('Database: Creating entity with data:', data);
  
  try {
    const result = await prisma.entity.create({
      data,
      include: { /* related data */ }
    });
    
    console.log('Database: Entity created successfully:', result);
    return result;
  } catch (error) {
    console.error('Database: Error creating entity:', error);
    throw error;
  }
};

export const updateEntity = async (id: string, data: Partial<Entity>) => {
  console.log('Database: Updating entity with ID:', id, 'data:', data);
  
  try {
    const result = await prisma.entity.update({
      where: { id },
      data,
      include: { /* related data */ }
    });
    
    console.log('Database: Entity updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Database: Error updating entity:', error);
    throw error;
  }
};
```

### **Step 2: Export from Database Package**
```typescript
// packages/database/src/index.ts
export {
  createEntity,
  updateEntity,
  findEntityById,
  // ... other functions
} from './entity';
```

### **Step 3: Create API Routes**
```typescript
// apps/api/app/api/entities/route.ts
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/entities - Creating new entity');
    
    // Authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Authorization
    try {
      assertAnyRole(user as any, ['ADMIN']);
      console.log('✅ User has admin role:', user.email);
    } catch {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    // Validation
    const body = await request.json();
    const parsed = entityCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Database operation
    const newEntity = await createEntity(parsed.data);
    
    return NextResponse.json({
      success: true,
      data: newEntity,
      message: 'Entity created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating entity:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create entity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

### **Step 4: Create Client API Client**
```typescript
// apps/client/lib/api/entities.ts
export const entitiesApi = {
  async createEntityAndRefresh(entityData: EntityCreateInput, filters?: any): Promise<{
    created: Entity;
    refreshed: EntitiesResponse;
  }> {
    console.log('🔄 createEntityAndRefresh called with:', { entityData, filters });
    
    try {
      // Step 1: Create the entity
      const createResult = await this.createEntity(entityData);
      
      if (!createResult.success || !createResult.data) {
        throw new Error(`Create failed: ${createResult.error || 'Unknown error'}`);
      }
      
      // Step 2: Wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Refresh the list
      const refreshResult = await this.getEntities(filters);
      
      if (!refreshResult.success || !refreshResult.data) {
        throw new Error(`Refresh failed: ${refreshResult.error || 'Unknown error'}`);
      }
      
      return {
        created: createResult.data,
        refreshed: refreshResult.data
      };
    } catch (error) {
      console.error('❌ Error in createEntityAndRefresh:', error);
      throw error;
    }
  }
};
```

### **Step 5: Create UI Components**
```typescript
// packages/ui/src/components/features/Entities/components/EntityFormDialog.tsx
export const EntityFormDialog: React.FC<EntityFormDialogProps> = ({
  open,
  onOpenChange,
  entity,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState(/* initial state */);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... rest of component
};
```

### **Step 6: Create Main Entity Component**
```typescript
// packages/ui/src/components/features/Entities/index.tsx
export function Entities({ 
  data, 
  onEntityCreated,
  onEntityUpdated,
  onError
}: EntitiesProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleEntityCreated = async (entityData: EntityCreateInput) => {
    try {
      await onEntityCreated?.(entityData);
      setIsAddDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      onError?.(errorMessage);
      throw error;
    }
  };

  // ... rest of component
}
```

### **Step 7: Create Client Page**
```typescript
// apps/client/app/entities/page.tsx
export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  const handleEntityCreated = useCallback(async (entityData: EntityCreateInput) => {
    try {
      setLoading(true);
      
      const result = await entitiesApi.createEntityAndRefresh(entityData, {
        page: 1,
        limit: 20
      });
      
      // Update local state
      setEntities(result.refreshed.entities);
      
      // Force refresh
      forceRefresh();
    } catch (error) {
      console.error('Error creating entity:', error);
    } finally {
      setLoading(false);
    }
  }, [forceRefresh]);

  // ... rest of component
}
```

## 🔧 Best Practices

### **1. Error Handling**
- Always use try-catch blocks
- Provide user-friendly error messages
- Log errors for debugging
- Don't close dialogs on error
- Re-throw errors to let forms handle them

### **2. Loading States**
- Show loading indicators during operations
- Disable forms during submission
- Prevent multiple submissions
- Use skeleton loaders for initial data

### **3. Data Consistency**
- Always refresh data after operations
- Use optimistic updates when possible
- Handle database consistency delays
- Provide fallback refresh mechanisms

### **4. Validation**
- Validate on both client and server
- Use Zod schemas for type safety
- Provide real-time validation feedback
- Show clear error messages

### **5. Logging**
- Use consistent emoji prefixes (🔄, ✅, ❌, ⚠️)
- Log all major operations
- Include relevant data in logs
- Use console.log for debugging

### **6. Type Safety**
- Define proper TypeScript interfaces
- Use strict typing throughout
- Avoid `any` types
- Export types from packages

## 🧪 Testing the Implementation

### **1. Test User Creation**
1. Navigate to users page
2. Click "Add User" button
3. Fill out form with valid data
4. Submit form
5. Verify user appears in list
6. Check console logs for success flow

### **2. Test User Update**
1. Click edit button on existing user
2. Modify user data
3. Submit form
4. Verify changes appear in list
5. Check console logs for update flow

### **3. Test User Deactivation**
1. Click deactivate button on user
2. Confirm action in dialog
3. Verify user status changes
4. Check console logs for deactivate flow

### **4. Test Error Handling**
1. Try to create user with invalid data
2. Verify error messages appear
3. Verify dialog doesn't close
4. Check console logs for error flow

## 📝 Copying to Other Pages

To implement this flow for other entities (customers, products, orders):

1. **Copy the file structure** from Users
2. **Replace "User" with "Entity"** in all names
3. **Update the database schema** for your entity
4. **Create database functions** following the pattern
5. **Create API routes** following the pattern
6. **Create UI components** following the pattern
7. **Create client page** following the pattern
8. **Test all operations** (create, read, update, delete)

## 🎉 Success Indicators

Your implementation is working correctly when:

- ✅ Users can be created, edited, and deactivated
- ✅ All operations show proper loading states
- ✅ Error messages are clear and helpful
- ✅ Data refreshes automatically after operations
- ✅ Console logs show the complete flow
- ✅ No TypeScript errors
- ✅ Forms don't close on validation errors
- ✅ Database operations complete successfully

## 🚨 Common Issues and Solutions

### **Issue: Database functions not available**
**Solution**: Ensure functions are exported from `packages/database/src/index.ts`

### **Issue: Forms close on error**
**Solution**: Don't call `onOpenChange(false)` in error cases

### **Issue: Data doesn't refresh**
**Solution**: Use the `*AndRefresh` functions and force refresh

### **Issue: TypeScript errors**
**Solution**: Check that all types are properly imported and defined

### **Issue: API calls fail**
**Solution**: Check authentication, authorization, and database connectivity

### **Issue: Duplicate email/phone errors**
**Solution**: 
- Check if user already exists within the same merchant
- Ensure merchant ID is properly passed to createUser function
- Verify database constraints are properly set up
- Check that the authenticated user has merchant access

### **Issue: Merchant-scoped uniqueness not working**
**Solution**:
- Verify database schema has `@@unique([merchantId, email])` and `@@unique([merchantId, phone])`
- Ensure API route passes merchant ID from authenticated user
- Check that database function validates uniqueness within merchant
- Verify error handling catches uniqueness violations

### **Issue: Phone validation errors**
**Solution**: Phone validation has been removed - it's now an optional field with no format restrictions

This standard flow provides a robust, scalable foundation for all entity management in your application.
