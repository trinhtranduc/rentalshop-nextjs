import Foundation
import Alamofire

// MARK: - Calendar API Service Protocol
protocol CalendarAPIServiceProtocol {
    func loadCalendarOrders(startDate: Date, endDate: Date, outletId: Int?, completion: @escaping ([String: CalendarDayData]?, NSError?) -> Void)
}

// MARK: - Calendar API Service Implementation
class CalendarAPIService: BaseService, CalendarAPIServiceProtocol {
    
    // MARK: - Calendar Orders
    func loadCalendarOrders(startDate: Date, endDate: Date, outletId: Int? = nil, completion: @escaping ([String: CalendarDayData]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.calendarOrders
        
        // Build query parameters according to API documentation
        let calendar = Calendar.current
        let month = calendar.component(.month, from: startDate)
        let year = calendar.component(.year, from: startDate)
        
        var params: [String: Any] = [
            "startDate": startDate.dateServerInString() ?? startDate.dateInStringParam() ?? "",
            "endDate": endDate.dateServerInString() ?? endDate.dateInStringParam() ?? "",
            "month": month,
            "year": year
        ]
        
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        performGET(
            path: path,
            parameters: params,
            responseType: APICalendarOrdersResponse.self,
            context: "CalendarAPIService.loadCalendarOrders"
        ) { [weak self] apiResponse, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "CalendarAPI")
                completion(nil, error)
                return
            }
            
            if apiResponse.success {
                // Convert calendar array to dictionary format
                var calendarDict: [String: CalendarDayData] = [:]
                if let calendarData = apiResponse.data?.calendar {
                    for dayData in calendarData {
                        if let date = dayData.date {
                            calendarDict[date] = dayData
                        }
                    }
                }
                completion(calendarDict, nil)
            } else {
                // Use error code model for localized messages
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Failed to load calendar orders"
                )
                completion(nil, nsError)
            }
        }
    }
}

// MARK: - Singleton Instance
extension CalendarAPIService {
    static let shared = CalendarAPIService()
}
