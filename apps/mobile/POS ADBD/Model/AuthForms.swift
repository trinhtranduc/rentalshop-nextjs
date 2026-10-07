//
//  AuthForms.swift
//  POS ADBD
//
//  #386 — pure rules behind the new login, create-store and forgot-password screens (flag `newAuth`).
//  Rules and the register payload match the current screens and `/api/auth/register`.
//

import Foundation

enum AuthField: String {
    case email, password, storeName, phone, address, fullName, confirmPassword, terms
}

/// Field → localization key of the inline message. Empty means valid.
typealias AuthFieldErrors = [AuthField: String]

enum AuthValidation {
    static let minPassword = 6
    static let minStoreName = 3
    static let minAddress = 3
    static let minFullName = 2

    static func login(email: String, password: String) -> AuthFieldErrors {
        var errors = emailErrors(email)
        if password.isEmpty {
            errors[.password] = "Password is required"
        } else if password.count < minPassword {
            errors[.password] = "Password must be at least 6 characters"
        }
        return errors
    }

    static func forgot(email: String) -> AuthFieldErrors {
        emailErrors(email)
    }

    static func storeStep(storeName: String, phone: String, address: String) -> AuthFieldErrors {
        var errors: AuthFieldErrors = [:]
        let name = trimmed(storeName)
        if name.isEmpty {
            errors[.storeName] = "Store name is required"
        } else if name.count < minStoreName {
            errors[.storeName] = "Store name must be at least 3 characters"
        }
        let digits = normalizedPhone(phone)
        if digits.isEmpty {
            errors[.phone] = "Phone number is required"
        } else if digits.range(of: "^[0-9+]{10,13}$", options: .regularExpression) == nil {
            errors[.phone] = "Please enter a valid phone number"
        }
        let place = trimmed(address)
        if place.isEmpty {
            errors[.address] = "Location is required"
        } else if place.count < minAddress {
            errors[.address] = "Please enter a valid location (City, Province)"
        }
        return errors
    }

    static func ownerStep(fullName: String, email: String, password: String, confirm: String, termsAccepted: Bool) -> AuthFieldErrors {
        var errors = emailErrors(email)
        let name = trimmed(fullName)
        if name.isEmpty {
            errors[.fullName] = "Name is required"
        } else if name.count < minFullName {
            errors[.fullName] = "Name must be at least 2 characters"
        }
        if password.isEmpty {
            errors[.password] = "Password is required"
        } else if password.count < minPassword {
            errors[.password] = "Password must be at least 6 characters"
        }
        if confirm.isEmpty {
            errors[.confirmPassword] = "Please confirm your password"
        } else if confirm != password {
            errors[.confirmPassword] = "authv2.passwordsMismatch"
        }
        if !termsAccepted {
            errors[.terms] = "Please accept the Privacy Policy and Terms of Service to continue."
        }
        return errors
    }

    /// Spaces, dots and dashes people type in a phone number are dropped ("0901 234 567" → "0901234567")
    static func normalizedPhone(_ phone: String) -> String {
        phone.components(separatedBy: CharacterSet(charactersIn: " .-\u{00A0}")).joined()
    }

    static func trimmed(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func emailErrors(_ email: String) -> AuthFieldErrors {
        let value = trimmed(email)
        if value.isEmpty { return [.email: "Email is required"] }
        if !value.isValidEmail() { return [.email: "Please enter a valid email address"] }
        return [:]
    }
}

/// "Bạn cho thuê gì?" chips. Same rules as the current sign-up: OTHER at start, at least one stays on,
/// picking a niche drops OTHER.
enum BusinessTagRules {
    struct Option {
        let apiValue: String
        let titleKey: String
    }

    /// Board order (Dang-ky)
    static let options: [Option] = [
        Option(apiValue: "AO_DAI", titleKey: "authv2.tag.AO_DAI"),
        Option(apiValue: "WEDDING_DRESS", titleKey: "authv2.tag.WEDDING_DRESS"),
        Option(apiValue: "COSTUME", titleKey: "authv2.tag.COSTUME"),
        Option(apiValue: "FILM_EQUIPMENT", titleKey: "authv2.tag.FILM_EQUIPMENT"),
        Option(apiValue: "VEHICLE", titleKey: "authv2.tag.VEHICLE"),
        Option(apiValue: "EQUIPMENT", titleKey: "authv2.tag.EQUIPMENT"),
        Option(apiValue: "OTHER", titleKey: "Other")
    ]

    /// API catalog order, used for the payload
    static let catalog = ["AO_DAI", "COSTUME", "WEDDING_DRESS", "EQUIPMENT", "VEHICLE", "FILM_EQUIPMENT", "OTHER"]

    static let initial: Set<String> = ["OTHER"]

    static func toggle(_ tag: String, in selected: Set<String>) -> Set<String> {
        var next = selected
        if next.contains(tag) {
            if next.count > 1 { next.remove(tag) }
        } else {
            next.insert(tag)
            if tag != "OTHER" { next.remove("OTHER") }
        }
        return next
    }

    static func payload(_ selected: Set<String>) -> [String] {
        let tags = catalog.filter { selected.contains($0) }
        return tags.isEmpty ? ["OTHER"] : tags
    }
}

/// Values of both create-store steps, kept while the user moves between them
struct RegisterDraft {
    var storeName = ""
    var phone = ""
    var address = ""
    var tags: Set<String> = BusinessTagRules.initial
    var fullName = ""
    var email = ""
    var password = ""
    var confirmPassword = ""
    var termsAccepted = false

    var storeErrors: AuthFieldErrors {
        AuthValidation.storeStep(storeName: storeName, phone: phone, address: address)
    }

    var ownerErrors: AuthFieldErrors {
        AuthValidation.ownerStep(fullName: fullName, email: email, password: password,
                                 confirm: confirmPassword, termsAccepted: termsAccepted)
    }

    /// The arguments of `AuthenticationService.createAccount` (it builds firstName/lastName, role, outletName, pricingType)
    var request: RegisterRequest {
        RegisterRequest(
            loginName: AuthValidation.trimmed(email),
            password: password,
            storeName: AuthValidation.trimmed(storeName),
            address: AuthValidation.trimmed(address),
            name: AuthValidation.trimmed(fullName),
            phone: AuthValidation.normalizedPhone(phone),
            businessTags: BusinessTagRules.payload(tags)
        )
    }
}

struct RegisterRequest: Equatable {
    let loginName: String
    let password: String
    let storeName: String
    let address: String
    let name: String
    let phone: String
    let businessTags: [String]
}

/// Where a failed API call is shown. iOS services turn an API error into an `NSError` whose `code` is the HTTP
/// status and whose message is already localized from the API `code`, so placement goes by status.
enum AuthErrorPlacement: Equatable {
    case field(AuthField)
    case alert

    /// 401 = INVALID_CREDENTIALS → under the password
    static func login(status: Int) -> AuthErrorPlacement {
        status == 401 ? .field(.password) : .alert
    }

    /// 409 = EMAIL_EXISTS or MERCHANT_DUPLICATE → under the email
    static func register(status: Int) -> AuthErrorPlacement {
        status == 409 ? .field(.email) : .alert
    }
}

/// "Gửi lại email" is disabled for a short while after a tap
struct ResendCooldown {
    static let defaultSeconds = 60

    let seconds: Int
    private(set) var endsAt: Date?

    init(seconds: Int = ResendCooldown.defaultSeconds) {
        self.seconds = seconds
    }

    mutating func start(now: Date) {
        endsAt = now.addingTimeInterval(TimeInterval(seconds))
    }

    func remaining(now: Date) -> Int {
        guard let endsAt else { return 0 }
        return max(0, Int(ceil(endsAt.timeIntervalSince(now))))
    }

    func canResend(now: Date) -> Bool {
        remaining(now: now) == 0
    }
}
