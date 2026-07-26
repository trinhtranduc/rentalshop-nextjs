//
//  PreviewViewController_Option4_TwoColumnStyle.swift
//  Preview View Controller - Two Column Layout Option
//
//  iPad Optimized với two-column layout
//

import UIKit
import SnapKit

/*
 * OPTION 4: TWO-COLUMN LAYOUT (iPad Optimized)
 * 
 * Đặc điểm:
 * - Customer info và Dates ở 2 columns
 * - Products full width
 * - Notes và Summary side by side
 * - Tận dụng không gian màn hình lớn
 * - Responsive: Single column trên iPhone
 * 
 * Layout Structure (iPad):
 * 
 * ┌─────────────────────────────────────────────┐
 * │ Customer Information                         │
 * ├──────────────────┬──────────────────────────┤
 * │ Name: John Doe  │ Outlet: Store Name       │
 * │ Phone: 0123...  │ Address: 123 Main St     │
 * │                 │ Created By: Staff Name    │
 * └──────────────────┴──────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────┐
 * │ Date Information                             │
 * ├──────────────────┬──────────────────────────┤
 * │ Create: 01/01   │ Pickup: 02/01/2024       │
 * │ Return: 10/01   │ Ready: [checkbox]         │
 * └──────────────────┴──────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────┐
 * │ Deposit & Document                          │
 * ├──────────────────┬──────────────────────────┤
 * │ Document: [text] │ Security Deposit: [btn] │
 * │                  │ Damage Fee: [btn]        │
 * └──────────────────┴──────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────┐
 * │ Products                                     │
 * ├─────────────────────────────────────────────┤
 * │ Product 1                                    │
 * │ Product 2                                    │
 * └─────────────────────────────────────────────┘
 * 
 * ┌──────────────────┬──────────────────────────┐
 * │ Notes            │ Summary                   │
 * ├──────────────────┼──────────────────────────┤
 * │ [Note text]      │ Subtotal: 1,000,000      │
 * │                  │ Discount: 0               │
 * │                  │ Grand Total: 1,000,000   │
 * │                  │ To Collect: 500,000     │
 * └──────────────────┴──────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────┐
 * │  [Save] [Cancel] [Print] [Update]          │
 * └─────────────────────────────────────────────┘
 */

// MARK: - Two Column Cell
// NOTE: All cell implementations have been moved to PreviewTwoColumnCells.swift
// This file is for documentation/reference only.
//
// Actual implementations:
// - TwoColumnCell
//
// All are located in: POS ADBD/Views/PreviewTwoColumnCells.swift

// MARK: - Responsive Layout Helper
// NOTE: This file is for documentation/reference only.
// All actual implementations are in PreviewViewController.swift
//
// The extension code below was removed to avoid duplicate declaration errors.
// Please refer to PreviewViewController.swift for actual implementations.

// MARK: - Implementation Notes
/*
 * Implementation Steps:
 * 
 * 1. Detect device type:
 *    - Use traitCollection.horizontalSizeClass
 *    - .regular = iPad (two columns)
 *    - .compact = iPhone (single column)
 * 
 * 2. Conditional cell configuration:
 *    - iPad: Use TwoColumnCell
 *    - iPhone: Use regular single-column cells
 * 
 * 3. Section layout:
 *    - Customer + Dates: Two columns
 *    - Deposit: Two columns (Document | Deposit/Fee)
 *    - Products: Full width (always)
 *    - Notes + Summary: Two columns side by side
 * 
 * 4. Responsive design:
 *    - iPhone: Fallback to single column
 *    - iPad: Utilize two columns
 * 
 * 5. Benefits:
 *    - Better use of iPad screen space
 *    - More information visible
 *    - Professional business app look
 * 
 * 6. Considerations:
 *    - More complex layout logic
 *    - Need to handle both layouts
 *    - Testing on both devices
 */

