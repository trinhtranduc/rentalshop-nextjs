import UIKit
import FSCalendar

protocol DatePickerViewControllerDelegate: AnyObject {
    func didSelectDate(_ date: Date, sender: DatePickerViewController)
    // Add a new delegate method for date range selection
    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController)
}

// Provide default implementation for backward compatibility
extension DatePickerViewControllerDelegate {
    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController) {
        // Default empty implementation
    }
}

class DatePickerViewController: UIViewController {
    // MARK: - Properties
    weak var delegate: DatePickerViewControllerDelegate?
    private var selectedDate: Date?
    private var minimumDate: Date?
    private var maximumDate: Date?
    var tag: Int = 0
    
    // Properties for date range selection
    private var firstDate: Date?
    private var lastDate: Date?
    private var datesRange: [Date]?
    
    // Mode of operation
    enum SelectionMode {
        case single     // Select a single date
        case range      // Select a date range
    }
    
    private var selectionMode: SelectionMode = .single
    
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.layer.cornerRadius = 12
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private lazy var calendar: FSCalendar = {
        let calendar = FSCalendar()
        calendar.delegate = self
        calendar.dataSource = self
        calendar.appearance.titleDefaultColor = .black
        calendar.appearance.headerTitleColor = APP_BUTTON_BG_COLOR
        calendar.appearance.weekdayTextColor = .gray
        calendar.appearance.todayColor = APP_BUTTON_BG_COLOR.withAlphaComponent(0.3)
        calendar.appearance.selectionColor = APP_BUTTON_BG_COLOR
        calendar.appearance.headerTitleFont = Utils.boldFont(size: 17)
        calendar.appearance.titleFont = Utils.regularFont(size: 15)
        calendar.appearance.weekdayFont = Utils.regularFont(size: 14)
        
        // Configure appearance for date range
        calendar.allowsMultipleSelection = false // Will be set based on mode
        
        // Set colors for date range
        calendar.appearance.selectionColor = APP_BUTTON_BG_COLOR
        calendar.appearance.titleSelectionColor = .white
        
        // Configure range colors
        calendar.appearance.titlePlaceholderColor = UIColor.lightGray
        calendar.appearance.titleTodayColor = APP_BUTTON_BG_COLOR
        
        calendar.translatesAutoresizingMaskIntoConstraints = false
        return calendar
    }()
    
    private lazy var buttonStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [cancelButton, confirmButton])
        stack.axis = .horizontal
        stack.spacing = 16
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel".localized(), for: .normal)
        button.setTitleColor(.gray, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 16)
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var confirmButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Confirm".localized(), for: .normal)
        button.setTitleColor(APP_BUTTON_BG_COLOR, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 16)
        button.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        button.isEnabled = false
        return button
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        view.addSubview(calendar)
        view.addSubview(buttonStackView)
        
        NSLayoutConstraint.activate([
            calendar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            calendar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            calendar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            calendar.bottomAnchor.constraint(equalTo: buttonStackView.topAnchor, constant: -16),
            
            buttonStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            buttonStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            buttonStackView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            buttonStackView.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    // MARK: - Public Methods
    func configure(selectedDate: Date?, minimumDate: Date? = nil, maximumDate: Date? = nil) {
        self.selectionMode = .single
        self.calendar.allowsMultipleSelection = false
        
        self.minimumDate = minimumDate
        self.maximumDate = maximumDate
        
        // Reset range selection properties
        self.firstDate = nil
        self.lastDate = nil
        self.datesRange = nil
        
        // Ensure calendar reloads with the new min/max dates before selecting a date
        calendar.reloadData()
        
        // Only select the date if it's within the valid range
        if let date = selectedDate {
            let minDate = self.minimumDate ?? Date()
            let maxDate = self.maximumDate ?? Date().addingTimeInterval(365*24*60*60)
            
            // Check if the date is within bounds
            if date >= minDate && date <= maxDate {
                calendar.select(date)
                self.selectedDate = date
                confirmButton.isEnabled = true
            } else {
                // If date is out of bounds, select the closest valid date
                let validDate = date < minDate ? minDate : maxDate
                calendar.select(validDate)
                self.selectedDate = validDate
                confirmButton.isEnabled = true
            }
        }
    }
    
    // Configure for date range selection
    func configureForDateRange(startDate: Date?, endDate: Date?, minimumDate: Date? = nil, maximumDate: Date? = nil) {
        self.selectionMode = .range
        self.calendar.allowsMultipleSelection = true
        
        self.minimumDate = minimumDate
        self.maximumDate = maximumDate
        
        // Reset range selection properties
        self.firstDate = startDate
        self.lastDate = endDate
        
        // Ensure calendar reloads with the new min/max dates
        calendar.reloadData()
        
        // If we have both start and end dates, select the range
        if let start = startDate, let end = endDate {
            let range = datesRange(from: start, to: end)
            self.datesRange = range
            
            // Select all dates in the range
            for date in range {
                calendar.select(date)
            }
            
            confirmButton.isEnabled = true
        } 
        // If we only have a start date, select it
        else if let start = startDate {
            calendar.select(start)
            self.datesRange = [start]
            confirmButton.isEnabled = true
        }
    }
    
    // Helper method to generate a range of dates
    private func datesRange(from: Date, to: Date) -> [Date] {
        // Normalize dates to start of day
        let calendar = Calendar.current
        var tempDate = calendar.startOfDay(for: from)
        let endDate = calendar.startOfDay(for: to)
        
        var dates = [Date]()
        
        while tempDate <= endDate {
            dates.append(tempDate)
            tempDate = calendar.date(byAdding: .day, value: 1, to: tempDate)!
        }
        
        return dates
    }
    
    // MARK: - Actions
    @objc private func cancelTapped() {
        dismiss(animated: true)
    }
    
    @objc private func confirmTapped() {
        switch selectionMode {
        case .single:
            guard let date = selectedDate else { return }
            delegate?.didSelectDate(date, sender: self)
            
        case .range:
            guard let first = firstDate, let last = lastDate else {
                // If only first date is selected, treat it as a single date selection
                if let first = firstDate {
                    delegate?.didSelectDate(first, sender: self)
                }
                dismiss(animated: true)
                return
            }
            
            delegate?.didSelectDateRange(start: first, end: last, sender: self)
        }
        
        dismiss(animated: true)
    }
    
    @objc private func backgroundTapped() {
        dismiss(animated: true)
    }
    
    // Add slide to dismiss functionality
    @objc private func handlePanGesture(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: view)
        let isDraggingDown = translation.y > 0
        
        switch gesture.state {
        case .changed:
            if isDraggingDown {
                containerView.transform = CGAffineTransform(translationX: 0, y: translation.y)
            }
        case .ended:
            let velocity = gesture.velocity(in: view)
            if velocity.y >= 1500 || translation.y >= 200 {
                dismiss(animated: true)
            } else {
                UIView.animate(withDuration: 0.3) {
                    self.containerView.transform = .identity
                }
            }
        default:
            break
        }
    }
}

// MARK: - FSCalendarDelegate
extension DatePickerViewController: FSCalendarDelegate {
    func calendar(_ calendar: FSCalendar, didSelect date: Date, at monthPosition: FSCalendarMonthPosition) {
        // Handle month position changes
        if monthPosition == .previous || monthPosition == .next {
            calendar.setCurrentPage(date, animated: true)
        }
        
        switch selectionMode {
        case .single:
            selectedDate = date
            confirmButton.isEnabled = true
            
        case .range:
            // Nothing selected yet
            if firstDate == nil {
                firstDate = date
                datesRange = [firstDate!]
                confirmButton.isEnabled = true
                return
            }
            
            // First date is selected, but not last date
            if firstDate != nil && lastDate == nil {
                // If selected date is before or equal to first date, replace first date
                if date <= firstDate! {
                    calendar.deselect(firstDate!)
                    firstDate = date
                    datesRange = [firstDate!]
                    return
                }
                
                // Generate the range of dates
                let range = datesRange(from: firstDate!, to: date)
                lastDate = range.last
                
                // Select all dates in the range
                for d in range {
                    calendar.select(d)
                }
                
                datesRange = range
                confirmButton.isEnabled = true
                return
            }
            
            // Both dates are selected, reset selection
            if firstDate != nil && lastDate != nil {
                for d in calendar.selectedDates {
                    calendar.deselect(d)
                }
                
                firstDate = date
                lastDate = nil
                datesRange = [firstDate!]
                calendar.select(date)
                confirmButton.isEnabled = true
            }
        }
    }
    
    func calendar(_ calendar: FSCalendar, didDeselect date: Date, at monthPosition: FSCalendarMonthPosition) {
        if selectionMode == .range {
            // If both dates are selected and user deselects a date, reset the selection
            if firstDate != nil && lastDate != nil {
                for d in calendar.selectedDates {
                    calendar.deselect(d)
                }
                
                firstDate = nil
                lastDate = nil
                datesRange = []
                confirmButton.isEnabled = false
            }
        }
    }
    
    // Add appearance customization for date range
    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, fillDefaultColorFor date: Date) -> UIColor? {
        if selectionMode == .range && datesRange?.contains(date) == true {
            // Use a lighter color for dates in the range that aren't the start/end
            if date != firstDate && date != lastDate {
                return nil//APP_BUTTON_BG_COLOR.withAlphaComponent(0.2)
            }
        }
        return nil
    }
}

// MARK: - FSCalendarDataSource
extension DatePickerViewController: FSCalendarDataSource {
    func minimumDate(for calendar: FSCalendar) -> Date {
        return minimumDate ?? Date()
    }
    
    func maximumDate(for calendar: FSCalendar) -> Date {
        return maximumDate ?? Date().addingTimeInterval(365*24*60*60) // Default 1 year ahead
    }
}

// MARK: - FSCalendarDelegateAppearance
extension DatePickerViewController: FSCalendarDelegateAppearance {
    // This method is called to customize the appearance of a cell
    func calendar(_ calendar: FSCalendar, appearance: FSCalendarAppearance, fillSelectionColorFor date: Date) -> UIColor? {
        if selectionMode == .range {
            if date == firstDate || date == lastDate {
                return APP_BUTTON_BG_COLOR // Full color for start/end dates
            } else if datesRange?.contains(date) == true {
                return APP_BUTTON_BG_COLOR//APP_BUTTON_BG_COLOR.withAlphaComponent(0.2) // Light color for in-between dates
            }
        }
        return nil
    }
}

// MARK: - Instance Creation
extension DatePickerViewController {
    static func instance() -> DatePickerViewController {
        let controller = DatePickerViewController()
        
        if let sheet = controller.sheetPresentationController {
            // Configure sheet properties
            sheet.detents = [.medium()] // Use medium size (approximately half screen)
            sheet.prefersGrabberVisible = true // Show grabber at top
            sheet.preferredCornerRadius = 12
//            sheet.prefersScrollingExpandsWhenScrolled = false
            sheet.prefersEdgeAttachedInCompactHeight = true
        }
        
        return controller
    }
} 
