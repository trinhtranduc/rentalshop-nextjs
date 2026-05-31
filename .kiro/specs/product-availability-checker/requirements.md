# Requirements Document

## Introduction

A dedicated "Check Availability" page in the client app sidebar that allows rental shop staff to quickly check product availability for specific rental dates without needing to navigate to the Create Order form. This feature addresses the common workflow where staff receive customer inquiries about product availability and need a fast, purpose-built tool to answer them. The page supports checking multiple products simultaneously and provides a visual timeline of rental schedules to help staff suggest alternative dates.

## Glossary

- **Availability_Checker**: The dedicated page component accessible from the client app sidebar that provides product availability lookup functionality
- **Staff_User**: A user with role MERCHANT, OUTLET_ADMIN, or OUTLET_STAFF who operates the client app for daily rental shop operations
- **Rental_Period**: A date range defined by a pickup date and a return date representing when a customer wants to rent a product
- **Availability_Status**: The result of checking a product against a rental period, indicating whether the product can be rented (available, out-of-stock, unavailable, date-conflict)
- **Batch_Availability_API**: The existing `POST /api/products/batch-availability` endpoint that checks availability for multiple products simultaneously
- **Single_Availability_API**: The existing `GET /api/products/availability` endpoint that checks availability for a single product with detailed order conflict information
- **OutletStock**: The database model tracking per-outlet stock levels (total stock, available, currently renting)
- **Date_Conflict**: A situation where an existing order's rental period overlaps with the requested rental period, reducing available quantity
- **Active_Order**: An order with status RESERVED or PICKUPED that occupies product stock for a rental period
- **RentalPeriodSelector**: The shared date picker component from the Create Order page that provides a DateRangePicker UI with pricing-type-aware date selection
- **Timeline_View**: A horizontal Gantt-chart-style visualization showing all rental periods for a product along a time axis
- **Selected_Date_Range**: The rental period currently entered by the Staff_User for the availability check

## Requirements

### Requirement 1: Sidebar Navigation Entry

**User Story:** As a Staff_User, I want a dedicated navigation item in the sidebar, so that I can quickly access the availability checker from anywhere in the app.

#### Acceptance Criteria

1. THE Availability_Checker SHALL be accessible via a navigation item labeled "Kiểm tra tồn kho" in the client app sidebar
2. THE Availability_Checker navigation item SHALL appear between the "Calendar" and "Settings" items in the sidebar menu
3. WHEN the Staff_User navigates to the Availability_Checker page, THE sidebar SHALL highlight the "Kiểm tra tồn kho" navigation item as active
4. THE Availability_Checker navigation item SHALL be visible to users with roles MERCHANT, OUTLET_ADMIN, and OUTLET_STAFF

### Requirement 2: Date Range Selection with Shared Date Picker

**User Story:** As a Staff_User, I want to select a rental period using the same date picker as the Create Order page, so that I have a consistent experience across the app.

#### Acceptance Criteria

1. THE Availability_Checker SHALL use the RentalPeriodSelector component (same as the Create Order page) for date range selection
2. THE Availability_Checker SHALL render the RentalPeriodSelector with a DateRangePicker UI that supports selecting pickup and return dates in a single calendar widget
3. WHEN the Staff_User selects a pickup date, THE Availability_Checker SHALL default the return date to one day after the pickup date if no return date is set
4. THE Availability_Checker SHALL prevent selection of pickup dates in the past
5. THE Availability_Checker SHALL prevent selection of a return date earlier than the pickup date
6. WHEN the Staff_User changes the rental period while products are already selected, THE Availability_Checker SHALL automatically re-check availability for all selected products

### Requirement 3: Multi-Product Selection

**User Story:** As a Staff_User, I want to search and select multiple products simultaneously, so that I can check availability for several items a customer is asking about in one go.

#### Acceptance Criteria

1. THE Availability_Checker SHALL provide a product search input that filters products by name, code, or barcode
2. THE Availability_Checker SHALL display search results as a selectable list showing product name, barcode, and current stock level
3. WHEN the Staff_User selects a product from search results, THE Availability_Checker SHALL add the product to the checked products list
4. THE Availability_Checker SHALL allow the Staff_User to select up to 20 products for simultaneous availability checking
5. WHEN the Staff_User attempts to add a 21st product, THE Availability_Checker SHALL display a message indicating the maximum of 20 products has been reached
6. WHEN the Staff_User removes a product from the checked list, THE Availability_Checker SHALL remove the product and its availability result from the display
7. THE Availability_Checker SHALL only display products belonging to the Staff_User's current outlet
8. THE Availability_Checker SHALL display a count of currently selected products (e.g., "3/20 products selected")

### Requirement 4: Availability Results Display

**User Story:** As a Staff_User, I want to see clear availability results for each selected product, so that I can quickly answer customer inquiries.

#### Acceptance Criteria

1. WHEN both a rental period and at least one product are selected, THE Availability_Checker SHALL call the Batch_Availability_API to retrieve availability data for all selected products
2. THE Availability_Checker SHALL display each product's availability result in a separate card with: product name, Availability_Status badge, available quantity, total stock, and conflicting quantity
3. WHEN a product has Availability_Status "available", THE Availability_Checker SHALL display a green status badge indicating the product can be rented
4. WHEN a product has Availability_Status "date-conflict", THE Availability_Checker SHALL display an amber status badge and show the number of conflicting units
5. WHEN a product has Availability_Status "out-of-stock", THE Availability_Checker SHALL display a red status badge indicating no units are available
6. THE Availability_Checker SHALL display a summary showing total products checked, number available, and number unavailable

### Requirement 5: All Active Orders Display

**User Story:** As a Staff_User, I want to see all active orders for a product (not just conflicts), so that I can understand the full rental schedule and suggest alternative dates to customers.

#### Acceptance Criteria

1. THE Availability_Checker SHALL display all Active_Orders (status RESERVED or PICKUPED) for each selected product in an expandable order list
2. THE Availability_Checker SHALL display for each Active_Order: order number, customer name, pickup date, return date, quantity rented, and order status
3. WHEN an Active_Order overlaps with the Selected_Date_Range, THE Availability_Checker SHALL highlight that order row with an amber/yellow background to indicate a Date_Conflict
4. WHEN an Active_Order does not overlap with the Selected_Date_Range, THE Availability_Checker SHALL display that order row with a neutral background
5. THE Availability_Checker SHALL sort Active_Orders by pickup date in ascending order
6. WHEN the Staff_User clicks on an order number in the list, THE Availability_Checker SHALL navigate to that order's detail page

### Requirement 6: Timeline/Gantt View

**User Story:** As a Staff_User, I want to see a visual timeline of all rental periods for a product, so that I can quickly identify gaps in the schedule and suggest alternative dates to customers.

#### Acceptance Criteria

1. THE Availability_Checker SHALL display a horizontal Timeline_View (Gantt-chart style) for each selected product showing all Active_Orders as bars along a time axis
2. THE Timeline_View SHALL display a time axis spanning at least 30 days centered around the Selected_Date_Range
3. THE Timeline_View SHALL render each Active_Order as a horizontal bar positioned according to its pickup date and return date
4. THE Timeline_View SHALL highlight the Selected_Date_Range as a distinct overlay (e.g., semi-transparent blue band) on the time axis
5. WHEN an Active_Order overlaps with the Selected_Date_Range, THE Timeline_View SHALL render that order bar in amber/yellow color
6. WHEN an Active_Order does not overlap with the Selected_Date_Range, THE Timeline_View SHALL render that order bar in a neutral color (e.g., gray or blue)
7. THE Timeline_View SHALL display today's date as a vertical marker line on the time axis
8. THE Timeline_View SHALL allow the Staff_User to visually identify gaps (unoccupied periods) in the rental schedule

### Requirement 7: Loading and Error States

**User Story:** As a Staff_User, I want clear feedback during availability checks, so that I know when the system is processing and when something goes wrong.

#### Acceptance Criteria

1. WHILE the Batch_Availability_API request is in progress, THE Availability_Checker SHALL display a loading indicator on the results section
2. IF the Batch_Availability_API returns an error, THEN THE Availability_Checker SHALL display an error message with a retry button
3. IF the network connection is lost during an availability check, THEN THE Availability_Checker SHALL display a connection error message

### Requirement 8: Quantity Selection

**User Story:** As a Staff_User, I want to specify how many units of a product the customer needs, so that I can check if the requested quantity is available.

#### Acceptance Criteria

1. THE Availability_Checker SHALL allow the Staff_User to specify a requested quantity for each selected product (default: 1)
2. WHEN the requested quantity exceeds the available quantity, THE Availability_Checker SHALL indicate insufficient availability with the Availability_Status reflecting the shortage
3. WHEN the Staff_User changes the requested quantity, THE Availability_Checker SHALL re-check availability for that product with the updated quantity

### Requirement 9: Page Layout

**User Story:** As a Staff_User, I want a split-panel layout similar to the Create Order page, so that I can see inputs on the left and results on the right without scrolling back and forth.

#### Acceptance Criteria

1. THE Availability_Checker SHALL use a split layout with a left panel for inputs and a right panel for results
2. THE left panel SHALL contain: multi-product search and selection, the RentalPeriodSelector date picker, and quantity input per product
3. THE right panel SHALL contain: availability result cards per product, the Active_Order list for each product, and the Timeline_View for each product
4. WHEN the viewport width is below the large breakpoint, THE Availability_Checker SHALL stack the panels vertically (inputs on top, results below)
