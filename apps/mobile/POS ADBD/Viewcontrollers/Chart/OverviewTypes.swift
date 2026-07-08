//
//  OverviewTypes.swift
//  POS ADBD
//

import Foundation

enum ViewMode: Int, CaseIterable {
    case dailyReport = 0
    case overview = 1

    var title: String {
        switch self {
        case .dailyReport: return "Overview_Mode_Daily".localized()
        case .overview: return "Overview_Mode_Yearly".localized()
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
