//
//  PreviewViewController_Option2_GroupedStyle.swift
//  Preview View Controller - Grouped Style Option
//
//  iOS Native Grouped Table View Style
//

import UIKit
import SnapKit

/*
 * OPTION 2: GROUPED STYLE
 * 
 * Đặc điểm:
 * - Sử dụng UITableViewStyle.grouped (iOS native)
 * - Section headers/footers mặc định của iOS
 * - Background màu group table view
 * - Separators giữa các rows
 * - Familiar iOS look and feel
 * 
 * Layout Structure:
 * 
 * ┌─────────────────────────────┐
 * │ Customer Information         │ ← Section Header
 * ├─────────────────────────────┤
 * │ Name: John Doe              │
 * │ Phone: 0123456789           │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │ Outlet & Staff Information   │ ← Section Header
 * ├─────────────────────────────┤
 * │ Outlet: Store Name          │
 * │ Address: 123 Main St        │
 * │ Phone: 0987654321          │
 * │ Created By: Staff Name      │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │ Date Information             │ ← Section Header
 * ├─────────────────────────────┤
 * │ Create Date: 01/01/2024    │
 * │ Pickup Date: 02/01/2024    │
 * │ Return Date: 10/01/2024    │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │ Deposit & Document           │ ← Section Header
 * ├─────────────────────────────┤
 * │ Document: [text field]      │
 * │ Security Deposit: [button]  │
 * │ Damage Fee: [button]        │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │ Products                     │ ← Section Header
 * ├─────────────────────────────┤
 * │ Product 1                    │
 * │ Product 2                    │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │ Notes                        │ ← Section Header
 * ├─────────────────────────────┤
 * │ [Note text view]             │
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │ Summary                      │ ← Section Header
 * ├─────────────────────────────┤
 * │ Subtotal: 1,000,000         │
 * │ Discount: 0                 │
 * │ Grand Total: 1,000,000      │
 * │ To Collect: 500,000         │ ← Highlighted
 * └─────────────────────────────┘
 * 
 * ┌─────────────────────────────┐
 * │  [Save] [Cancel] [Print]     │ ← Fixed bottom buttons
 * └─────────────────────────────┘
 */

// MARK: - Implementation Example
// NOTE: This file is for documentation/reference only.
// All actual implementations are in PreviewViewController.swift
//
// The extension code below was removed to avoid duplicate declaration errors.
// Please refer to PreviewViewController.swift for actual implementations.

// MARK: - Custom Cells for Grouped Style
// NOTE: All cell implementations have been moved to PreviewGroupedCells.swift
// This file is for documentation/reference only.
//
// Actual implementations:
// - GroupedInfoCell
// - GroupedEditableCell
// - GroupedButtonCell
// - GroupedNoteCell
// - GroupedSwitchCell
//
// All are located in: POS ADBD/Views/PreviewGroupedCells.swift

// MARK: - Implementation Notes
/*
 * Implementation Steps:
 * 
 * 1. Change table view initialization:
 *    previewTableView = UITableView(frame: .zero, style: .grouped)
 * 
 * 2. Register cells:
 *    - GroupedInfoCell (for read-only info)
 *    - GroupedEditableCell (for text fields)
 *    - GroupedButtonCell (for picker buttons)
 *    - ProductPreviewCell (existing)
 * 
 * 3. Implement section headers:
 *    - Use titleForHeaderInSection for simple headers
 *    - Or viewForHeaderInSection for custom headers with icons
 * 
 * 4. Cell configuration:
 *    - Customer Info: GroupedInfoCell
 *    - Dates: GroupedInfoCell (multiple rows)
 *    - Deposit: GroupedEditableCell + GroupedButtonCell
 *    - Products: ProductPreviewCell
 *    - Notes: Custom cell with text view
 *    - Summary: GroupedInfoCell (multiple rows)
 * 
 * 5. Footer buttons:
 *    - Keep fixed at bottom
 *    - Outside table view
 */

