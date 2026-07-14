import UIKit

enum PreviewAction {
    case save
    case cancel
    case print
    case update
    case delete
    
    var title: String {
        switch self {
        case .save: return "Save".localized().uppercased()
        case .cancel: return "Cancel".localized().uppercased()
        case .print: return "Print".localized().uppercased()
        case .update: return "Update".localized().uppercased()
        case .delete: return "Delete".localized().uppercased()
        }
    }
    
    var backgroundColor: UIColor {
        switch self {
        case .save: return .actionPrimary
        case .cancel: return .actionDanger
        case .print: return .actionSuccess
        case .update: return .actionWarning
        case .delete: return .actionDanger
        }
    }
    
    var textColor: UIColor {
        return .navTint
    }
    
    var isHidden: Bool {
        return false
    }
}
