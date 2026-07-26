import UIKit

enum PreviewAction {
    case save
    case cancel
    case print
    case update
    case delete
    
    var title: String {
        switch self {
        case .save: return "Save".localized()
        case .cancel: return "Cancel".localized()
        case .print: return "Print".localized()
        case .update: return "Update".localized()
        case .delete: return "Delete".localized()
        }
    }

    var symbolName: String {
        switch self {
        case .save: return "checkmark.circle.fill"
        case .cancel: return "xmark"
        case .print: return "printer"
        case .update: return "square.and.pencil"
        case .delete: return "trash"
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
