//
//  PreviewViewController_Option1_CardStyle.swift
//  Preview View Controller - Card Style Option
//
//  Modern Card Design với mỗi section là một card riêng biệt
//
//  NOTE: This file is for documentation/reference only.
//  All actual implementations are in PreviewCardCells.swift
//

import UIKit
import SnapKit

/*
 * OPTION 1: CARD STYLE
 * 
 * Đặc điểm:
 * - Mỗi section là một card riêng biệt với shadow và rounded corners
 * - Spacing lớn giữa các cards (16-20px)
 * - Background màu sáng, cards màu trắng
 * - Section headers có icon và title rõ ràng
 * - Subtle shadows cho depth
 * 
 * Layout Structure:
 * ┌─────────────────────────────┐
 * │  Section 0: Customer Info    │ ← Card với shadow
 * │  ┌─────────────────────────┐ │
 * │  │ Name: John Doe          │ │
 * │  │ Phone: 0123456789      │ │
 * │  └─────────────────────────┘ │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  Section 1: Outlet & Staff   │ ← Card với shadow
 * │  ┌─────────────────────────┐ │
 * │  │ Outlet: Store Name      │ │
 * │  │ Address: 123 Main St    │ │
 * │  │ Created By: Staff Name  │ │
 * │  └─────────────────────────┘ │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  Section 2: Dates            │ ← Card với shadow
 * │  ┌─────────────────────────┐ │
 * │  │ Create | Pickup | Return│ │
 * │  └─────────────────────────┘ │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  Section 3: Deposit Info     │ ← Card với shadow
 * │  ┌─────────────────────────┐ │
 * │  │ Doc | Deposit | Fee    │ │
 * │  └─────────────────────────┘ │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  Section 4: Products          │ ← Card với shadow
 * │  ┌─────────────────────────┐ │
 * │  │ Product 1                │ │
 * │  │ Product 2                │ │
 * │  └─────────────────────────┘ │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  Section 5: Notes            │ ← Card với shadow
 * │  ┌─────────────────────────┐ │
 * │  │ [Note text area]        │ │
 * │  └─────────────────────────┘ │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  Section 6: Summary          │ ← Card với shadow
 * │  ┌─────────────────────────┐ │
 * │  │ Subtotal: 1,000,000     │ │
 * │  │ Discount: 0             │ │
 * │  │ Grand Total: 1,000,000  │ │
 * │  │ To Collect: 500,000     │ │ ← Highlighted
 * │  └─────────────────────────┘ │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  [Save] [Cancel] [Print]     │ ← Fixed bottom buttons
 * └─────────────────────────────┘
 */

// MARK: - Section Enum & Custom Cells
// NOTE: All implementations (PreviewSection enum and all custom cell classes) 
// are now defined in PreviewCardCells.swift
// 
// This file is kept for reference/documentation purposes only.
// 
// Actual implementations:
// - PreviewSection enum
// - CustomerInfoCardCell
// - OutletInfoCardCell  
// - DateInfoCardCell
// - DocumentDepositCardCell
// - NoteCardCell
// - SummaryRowCardCell
// - PlaceholderTextView
//
// All are located in: POS ADBD/Views/PreviewCardCells.swift

// MARK: - Implementation Notes
/*
 * Implementation Steps:
 * 
 * 1. Update PreviewViewController để sử dụng sections:
 *    - Thêm enum PreviewSection
 *    - Implement numberOfSections và numberOfRowsInSection
 *    - Register custom cells
 * 
 * 2. Tạo custom cells:
 *    - CustomerInfoCardCell
 *    - OutletInfoCardCell
 *    - DateInfoCardCell
 *    - DocumentDepositCardCell
 *    - NoteCardCell
 *    - SummaryRowCardCell
 * 
 * 3. Section Headers:
 *    - Custom header view với icon và title
 *    - Optional: Collapsible functionality
 * 
 * 4. Footer:
 *    - Giữ buttons ở bottom (fixed, không scroll)
 *    - Sticky footer view
 * 
 * 5. Styling:
 *    - Card shadow và corner radius
 *    - Consistent spacing (16px horizontal, 8px vertical)
 *    - Background colors theo design system
 */
