//
//  ResendVerificationAPI.swift
//  RentalShop Mobile App
//
//  API Documentation for Resend Email Verification
//  Copy this implementation into your Xcode project
//

import Foundation

// MARK: - Request Model

struct ResendVerificationRequest: Codable {
    let email: String
}

// MARK: - Response Models

struct ResendVerificationResponse: Codable {
    let success: Bool
    let code: String
    let message: String
    let data: ResendVerificationData?
    let error: String?
}

struct ResendVerificationData: Codable {
    let message: String
}

// MARK: - API Service

class ResendVerificationService {
    private let baseURL: String
    
    init(baseURL: String = "https://dev-api.anyrent.shop") {
        self.baseURL = baseURL
    }
    
    /// Resend verification email
    /// - Parameters:
    ///   - email: User's email address
    ///   - completion: Completion handler with result
    func resendVerification(
        email: String,
        completion: @escaping (Result<ResendVerificationResponse, Error>) -> Void
    ) {
        // Validate email format
        guard isValidEmail(email) else {
            let error = NSError(
                domain: "ResendVerificationService",
                code: 400,
                userInfo: [NSLocalizedDescriptionKey: "Invalid email address"]
            )
            completion(.failure(error))
            return
        }
        
        // Build URL
        guard let url = URL(string: "\(baseURL)/api/auth/resend-verification") else {
            let error = NSError(
                domain: "ResendVerificationService",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid URL"]
            )
            completion(.failure(error))
            return
        }
        
        // Create request
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Create request body
        let requestBody = ResendVerificationRequest(email: email)
        
        do {
            request.httpBody = try JSONEncoder().encode(requestBody)
        } catch {
            completion(.failure(error))
            return
        }
        
        // Perform request
        URLSession.shared.dataTask(with: request) { data, response, error in
            // Handle network error
            if let error = error {
                completion(.failure(error))
                return
            }
            
            // Handle HTTP response
            guard let httpResponse = response as? HTTPURLResponse else {
                let error = NSError(
                    domain: "ResendVerificationService",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid response"]
                )
                completion(.failure(error))
                return
            }
            
            // Handle response data
            guard let data = data else {
                let error = NSError(
                    domain: "ResendVerificationService",
                    code: httpResponse.statusCode,
                    userInfo: [NSLocalizedDescriptionKey: "No data received"]
                )
                completion(.failure(error))
                return
            }
            
            // Parse response
            do {
                let decoder = JSONDecoder()
                let response = try decoder.decode(ResendVerificationResponse.self, from: data)
                
                // Check if request was successful
                if response.success {
                    completion(.success(response))
                } else {
                    // Parse error code
                    let errorCode = APIErrorCode(from: response.code) ?? .unknownError
                    let errorMessage = response.error ?? response.message
                    
                    let error = ResendVerificationError(
                        code: errorCode,
                        message: errorMessage,
                        httpStatusCode: httpResponse.statusCode
                    )
                    completion(.failure(error))
                }
            } catch {
                // JSON parsing error
                completion(.failure(error))
            }
        }.resume()
    }
    
    /// Validate email format
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}

// MARK: - Custom Error

struct ResendVerificationError: Error {
    let code: APIErrorCode
    let message: String
    let httpStatusCode: Int
    
    var localizedDescription: String {
        return message
    }
}

// MARK: - Usage Example

/*
 // Example usage in your ViewModel or ViewController:
 
 let service = ResendVerificationService()
 
 service.resendVerification(email: "user@example.com") { result in
     switch result {
     case .success(let response):
         // Show success message
         print("✅ Verification email sent: \(response.data?.message ?? response.message)")
         
         // Update UI on main thread
         DispatchQueue.main.async {
             // Show success alert
             showAlert(
                 title: "Email Sent",
                 message: response.data?.message ?? "Verification email has been sent. Please check your inbox."
             )
         }
         
     case .failure(let error):
         // Handle error
         if let resendError = error as? ResendVerificationError {
             switch resendError.code {
             case .emailAlreadyVerified:
                 // Email already verified - redirect to login
                 print("⚠️ Email already verified")
                 DispatchQueue.main.async {
                     showAlert(
                         title: "Already Verified",
                         message: "Your email is already verified. You can log in now."
                     )
                 }
                 
             case .rateLimitExceeded:
                 // Rate limit exceeded - show retry after message
                 print("⚠️ Rate limit exceeded")
                 DispatchQueue.main.async {
                     showAlert(
                         title: "Too Many Requests",
                         message: "Please wait a few minutes before requesting another verification email."
                     )
                 }
                 
             case .emailSendFailed:
                 // Email send failed - show error
                 print("❌ Email send failed: \(resendError.message)")
                 DispatchQueue.main.async {
                     showAlert(
                         title: "Email Send Failed",
                         message: resendError.message
                     )
                 }
                 
             case .validationError:
                 // Validation error - show error message
                 print("❌ Validation error: \(resendError.message)")
                 DispatchQueue.main.async {
                     showAlert(
                         title: "Invalid Input",
                         message: resendError.message
                     )
                 }
                 
             default:
                 // Other errors
                 print("❌ Error: \(resendError.message)")
                 DispatchQueue.main.async {
                     showAlert(
                         title: "Error",
                         message: resendError.message
                     )
                 }
             }
         } else {
             // Network or other errors
             print("❌ Network error: \(error.localizedDescription)")
             DispatchQueue.main.async {
                 showAlert(
                     title: "Network Error",
                     message: "Please check your internet connection and try again."
                 )
             }
         }
     }
 }
 */

// MARK: - Async/Await Version (iOS 15+)

@available(iOS 15.0, *)
extension ResendVerificationService {
    /// Resend verification email using async/await
    /// - Parameter email: User's email address
    /// - Returns: ResendVerificationResponse
    /// - Throws: ResendVerificationError or network errors
    func resendVerification(email: String) async throws -> ResendVerificationResponse {
        return try await withCheckedThrowingContinuation { continuation in
            resendVerification(email: email) { result in
                continuation.resume(with: result)
            }
        }
    }
}

// MARK: - Async/Await Usage Example (iOS 15+)

/*
 // Example usage with async/await:
 
 @available(iOS 15.0, *)
 func resendVerificationEmail(email: String) async {
     let service = ResendVerificationService()
     
     do {
         let response = try await service.resendVerification(email: email)
         
         // Show success message
         await MainActor.run {
             showAlert(
                 title: "Email Sent",
                 message: response.data?.message ?? "Verification email has been sent."
             )
         }
         
     } catch let error as ResendVerificationError {
         // Handle specific error codes
         await MainActor.run {
             switch error.code {
             case .emailAlreadyVerified:
                 showAlert(title: "Already Verified", message: error.message)
             case .rateLimitExceeded:
                 showAlert(title: "Too Many Requests", message: error.message)
             default:
                 showAlert(title: "Error", message: error.message)
             }
         }
         
     } catch {
         // Handle network errors
         await MainActor.run {
             showAlert(
                 title: "Network Error",
                 message: "Please check your internet connection and try again."
             )
         }
     }
 }
 */

// MARK: - Error Codes Reference

/*
 Common Error Codes for Resend Verification API:
 
 ✅ Success Codes:
 - VERIFICATION_EMAIL_SENT: Email sent successfully
 
 ❌ Error Codes:
 - EMAIL_ALREADY_VERIFIED (400): Email has already been verified
 - RATE_LIMIT_EXCEEDED (429): Too many requests (max 3 per 5 minutes)
 - EMAIL_SEND_FAILED (500): Failed to send email
 - VALIDATION_ERROR (400): Invalid email format
 - INVALID_INPUT (400): Invalid input provided
 
 Note: For security, if user doesn't exist, API returns success
 to prevent email enumeration attacks.
 */

