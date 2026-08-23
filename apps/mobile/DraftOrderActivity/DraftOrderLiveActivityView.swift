import SwiftUI
import WidgetKit

private let brand = Color(red: 0.14, green: 0.33, blue: 0.96)
private let warn = Color(red: 0.90, green: 0.45, blue: 0.08)
private let todayMark = Color(red: 1.0, green: 0.55, blue: 0.12)

@available(iOS 16.1, *)
public struct DraftOrderLiveActivityView: View {
    public let state: DraftOrderAttributes.ContentState

    public init(state: DraftOrderAttributes.ContentState) {
        self.state = state
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .center, spacing: 8) {
                Text(state.title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Spacer(minLength: 8)
                if !state.badgeText.isEmpty {
                    Text(state.badgeText)
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(brand.opacity(0.14))
                        .foregroundStyle(brand)
                        .clipShape(Capsule())
                }
            }

            Text(itemLine)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)

            HStack(alignment: .center, spacing: 8) {
                customerBlock
                Spacer(minLength: 8)
                if !state.totalText.isEmpty {
                    Text(state.totalText)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(brand)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                }
            }

            if state.isRent, !state.pickupDateText.isEmpty, !state.returnDateText.isEmpty {
                ticketRow
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .widgetURL(URL(string: "anyrent://draft-cart"))
    }

    private var itemLine: String {
        if state.itemCountLabel.isEmpty {
            return state.productName
        }
        return "\(state.productName) · \(state.itemCountLabel)"
    }

    @ViewBuilder
    private var customerBlock: some View {
        if !state.customerName.isEmpty {
            HStack(spacing: 5) {
                Image(systemName: "person.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                Text(state.customerName)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
            }
        } else if !state.missingCustomerLabel.isEmpty {
            Text(state.missingCustomerLabel)
                .font(.system(size: 11, weight: .bold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(warn.opacity(0.16))
                .foregroundStyle(warn)
                .clipShape(Capsule())
        }
    }

    private var ticketRow: some View {
        HStack(alignment: .center, spacing: 8) {
            ticketDate(label: state.pickupLabel, date: state.pickupDateText, isLeading: true)
            Image(systemName: "arrow.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(brand)
            ticketDate(label: state.returnLabel, date: state.returnDateText, isLeading: false)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.primary.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func ticketDate(label: String, date: String, isLeading: Bool) -> some View {
        VStack(alignment: isLeading ? .leading : .trailing, spacing: 2) {
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
            Text(date)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: isLeading ? .leading : .trailing)
    }
}

@available(iOS 16.1, *)
struct DraftOrderCalendarStrip: View {
    let pickup: Date
    let returned: Date

    var body: some View {
        HStack(spacing: 3) {
            ForEach(days) { day in
                VStack(spacing: 3) {
                    Text(day.weekday)
                        .font(.system(size: 9, weight: .semibold))
                    Text(day.number)
                        .font(.system(size: 13, weight: .bold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .foregroundStyle(day.inRange ? Color.white : Color.secondary)
                .background(day.inRange ? brand : Color.primary.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(day.isToday ? todayMark : Color.clear, lineWidth: 2)
                )
            }
        }
    }

    private var days: [CalendarDay] {
        let calendar = Calendar.current
        let pickupDay = calendar.startOfDay(for: pickup)
        let returnDay = calendar.startOfDay(for: returned)
        let today = calendar.startOfDay(for: Date())
        let span = max(1, (calendar.dateComponents([.day], from: pickupDay, to: returnDay).day ?? 0) + 1)
        let weekday = calendar.component(.weekday, from: pickupDay)
        let mondayOffset = (weekday + 5) % 7
        let weekStart = calendar.date(byAdding: .day, value: -mondayOffset, to: pickupDay) ?? pickupDay
        let weekEnd = calendar.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        let start = (span <= 7 && returnDay <= weekEnd) ? weekStart : pickupDay
        let symbols = calendar.veryShortWeekdaySymbols
        return (0..<7).compactMap { index in
            guard let date = calendar.date(byAdding: .day, value: index, to: start) else {
                return nil
            }
            let weekdayIndex = (calendar.component(.weekday, from: date) - 1 + 7) % 7
            let inRange = date >= pickupDay && date <= returnDay
            return CalendarDay(
                id: index,
                weekday: symbols.indices.contains(weekdayIndex) ? symbols[weekdayIndex] : "",
                number: "\(calendar.component(.day, from: date))",
                inRange: inRange,
                isToday: date == today
            )
        }
    }
}

@available(iOS 16.1, *)
private struct CalendarDay: Identifiable {
    let id: Int
    let weekday: String
    let number: String
    let inRange: Bool
    let isToday: Bool
}
