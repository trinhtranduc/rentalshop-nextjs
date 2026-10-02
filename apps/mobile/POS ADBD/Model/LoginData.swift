//
//  LoginData.swift
//  POS ADBD
//
//  Created by Assistant on 2025-10-22.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Login Data (Codable) - Pure data from API

struct LoginData: Codable {
    let user: User
    let token: String?
    /// Present on /api/mobile/auth/login (#344); bound to this login's session.
    let refreshToken: String?
}

