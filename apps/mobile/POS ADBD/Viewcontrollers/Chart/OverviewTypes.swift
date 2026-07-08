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

    var title: String {
        switch self {
        case .today: return "Report_Period_Today".localized()
        case .last7Days: return "Report_Period_7Days".localized()
        case .last30Days: return "Report_Period_30Days".localized()
        case .thisYear: return "Report_Period_Year".localized()
        }
    }

    /// Periods visible in the filter bar for the current user.
    static func availablePeriods(canViewRevenueAnalytics: Bool) -> [ReportPeriod] {
        canViewRevenueAnalytics ? ReportPeriod.allCases : [.today]
    }

    var showsOrderList: Bool { self == .today }

    var showsChartsAndInsights: Bool { self != .today }

    var incomeGroupBy: String { self == .thisYear ? "month" : "day" }

    /// Rolling windows end on today; single-day uses the user-selected date.
    func dateRange(todayDate: Date, year: Int) -> (start: Date, end: Date) {
        let calendar = Calendar.current

        switch self {
        case .today:
            let start = calendar.startOfDay(for: todayDate)
            let end = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: start) ?? todayDate
            return (start, end)

        case .last7Days:
            let end = calendar.startOfDay(for: Date())
            let start = calendar.date(byAdding: .day, value: -6, to: end) ?? end
            let endOfDay = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: calendar.startOfDay(for: Date())) ?? Date()
            return (start, endOfDay)

        case .last30Days:
            let end = calendar.startOfDay(for: Date())
            let start = calendar.date(byAdding: .day, value: -29, to: end) ?? end
            let endOfDay = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: calendar.startOfDay(for: Date())) ?? Date()
            return (start, endOfDay)

        case .thisYear:
            let start = calendar.date(from: DateComponents(year: year, month: 1, day: 1)) ?? Date()
            let end = calendar.date(from: DateComponents(year: year, month: 12, day: 31, hour: 23, minute: 59, second: 59)) ?? Date()
            return (start, end)
        }
    }

    func periodSubtitle(todayDate: Date, year: Int) -> String {
        let range = dateRange(todayDate: todayDate, year: year)
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"

        switch self {
        case .today:
            return formatter.string(from: todayDate)
        case .last7Days, .last30Days:
            return "\(formatter.string(from: range.start)) – \(formatter.string(from: range.end))"
        case .thisYear:
            return String(year)
        }
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
