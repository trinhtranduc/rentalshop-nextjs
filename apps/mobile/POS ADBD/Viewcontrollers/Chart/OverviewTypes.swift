//
//  OverviewTypes.swift
//  POS ADBD
//

import Foundation

/// Time window for the unified report screen.
enum ReportPeriod: Int, CaseIterable {
    case today = 0
    case last7Days = 1
    case last30Days = 2
    case thisYear = 3
    case last90Days = 4
    case last180Days = 5
    case allTime = 6
    case custom = 7

    static let filterPresets: [ReportPeriod] = [
        .today, .last7Days, .last30Days, .last90Days, .last180Days, .custom
    ]

    var title: String {
        switch self {
        case .today: return "Report_Period_Today".localized()
        case .last7Days: return "Report_Period_7Days".localized()
        case .last30Days: return "Report_Period_30Days".localized()
        case .thisYear: return "Report_Period_Year".localized()
        case .last90Days: return "Report_Period_90Days".localized()
        case .last180Days: return "Report_Period_180Days".localized()
        case .allTime: return "Report_Period_AllTime".localized()
        case .custom: return "Report_Period_Custom".localized()
        }
    }

    /// Periods visible in the filter sheet for the current user.
    static func availablePeriods(canViewRevenueAnalytics: Bool) -> [ReportPeriod] {
        canViewRevenueAnalytics ? filterPresets : [.today]
    }

    var showsOrderList: Bool { self == .today }

    var showsChartsAndInsights: Bool { self != .today }

    var incomeGroupBy: String {
        switch self {
        case .thisYear, .allTime:
            return "month"
        default:
            return "day"
        }
    }

    var usesMonthlyChart: Bool { incomeGroupBy == "month" }

    var showsDepositMetrics: Bool {
        switch self {
        case .today, .last7Days, .last30Days:
            return true
        default:
            return false
        }
    }

    /// Rolling windows end on today; single-day uses the user-selected date.
    func dateRange(
        todayDate: Date,
        year: Int,
        customStart: Date? = nil,
        customEnd: Date? = nil
    ) -> (start: Date, end: Date) {
        let calendar = Calendar.current
        let endOfToday = calendar.date(
            byAdding: DateComponents(day: 1, second: -1),
            to: calendar.startOfDay(for: Date())
        ) ?? Date()

        switch self {
        case .today:
            let start = calendar.startOfDay(for: todayDate)
            let end = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: start) ?? todayDate
            return (start, end)

        case .last7Days:
            return rollingRange(days: 7, calendar: calendar, endOfToday: endOfToday)
        case .last30Days:
            return rollingRange(days: 30, calendar: calendar, endOfToday: endOfToday)
        case .last90Days:
            return rollingRange(days: 90, calendar: calendar, endOfToday: endOfToday)
        case .last180Days:
            return rollingRange(days: 180, calendar: calendar, endOfToday: endOfToday)

        case .thisYear:
            let start = calendar.date(from: DateComponents(year: year, month: 1, day: 1)) ?? Date()
            let end = calendar.date(from: DateComponents(year: year, month: 12, day: 31, hour: 23, minute: 59, second: 59)) ?? Date()
            return (start, end)

        case .allTime:
            let start = calendar.date(byAdding: .year, value: -10, to: calendar.startOfDay(for: Date())) ?? Date()
            return (start, endOfToday)

        case .custom:
            let start = calendar.startOfDay(for: customStart ?? todayDate)
            let rawEnd = customEnd ?? Date()
            let end = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: calendar.startOfDay(for: rawEnd)) ?? rawEnd
            return (start, end)
        }
    }

    func periodSubtitle(
        todayDate: Date,
        year: Int,
        customStart: Date? = nil,
        customEnd: Date? = nil
    ) -> String {
        let range = dateRange(todayDate: todayDate, year: year, customStart: customStart, customEnd: customEnd)
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"

        switch self {
        case .today:
            return formatter.string(from: todayDate)
        case .thisYear:
            return String(year)
        case .allTime:
            return title
        case .custom:
            return "\(formatter.string(from: range.start)) – \(formatter.string(from: range.end))"
        default:
            return "\(formatter.string(from: range.start)) – \(formatter.string(from: range.end))"
        }
    }

    private func rollingRange(days: Int, calendar: Calendar, endOfToday: Date) -> (start: Date, end: Date) {
        let end = calendar.startOfDay(for: Date())
        let start = calendar.date(byAdding: .day, value: -(days - 1), to: end) ?? end
        return (start, endOfToday)
    }
}

/// Metric type for overview summary; used for (i) info sheet.
enum OverviewMetric: Int, CaseIterable {
    case totalRevenue = 0
    case totalOrders = 1
    case collateralReceived = 2
    case collateralExpected = 3

    var title: String {
        switch self {
        case .totalRevenue: return "Total Revenue".localized()
        case .totalOrders: return "Total Orders".localized()
        case .collateralReceived: return "Collateral (received)".localized()
        case .collateralExpected: return "Collateral (return)".localized()
        }
    }

    var explanation: String {
        switch self {
        case .totalRevenue: return "Overview_Info_TotalRevenue".localized()
        case .totalOrders: return "Overview_Info_TotalOrders".localized()
        case .collateralReceived: return "Overview_Info_CollateralReceived".localized()
        case .collateralExpected: return "Overview_Info_CollateralExpected".localized()
        }
    }
}
