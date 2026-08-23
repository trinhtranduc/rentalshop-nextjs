import ActivityKit
import Foundation
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
public struct DraftOrderLiveActivityWidget: Widget {
    public init() {}

    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: DraftOrderAttributes.self) { context in
            DraftOrderLiveActivityView(state: context.state)
                .activityBackgroundTint(Color(.secondarySystemBackground).opacity(0.6))
                .activitySystemActionForegroundColor(.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.productName)
                        .font(.caption.bold())
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.badgeText)
                        .font(.caption.bold())
                        .foregroundStyle(Color(red: 0.14, green: 0.33, blue: 0.96))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            if !context.state.customerName.isEmpty {
                                Text(context.state.customerName)
                                    .font(.caption)
                                    .lineLimit(1)
                            } else if !context.state.missingCustomerLabel.isEmpty {
                                Text(context.state.missingCustomerLabel)
                                    .font(.caption.bold())
                                    .foregroundStyle(Color(red: 0.90, green: 0.45, blue: 0.08))
                            }
                            Spacer()
                            Text(context.state.totalText)
                                .font(.headline.bold())
                        }
                        if context.state.isRent,
                           !context.state.pickupDateText.isEmpty,
                           !context.state.returnDateText.isEmpty {
                            HStack {
                                Text(context.state.pickupDateText)
                                    .font(.caption.bold())
                                Spacer()
                                Image(systemName: "arrow.right")
                                    .font(.caption2.bold())
                                    .foregroundStyle(Color(red: 0.14, green: 0.33, blue: 0.96))
                                Spacer()
                                Text(context.state.returnDateText)
                                    .font(.caption.bold())
                            }
                        }
                        if context.state.isRent,
                           context.state.pickupEpoch > 0,
                           context.state.returnEpoch > 0 {
                            DraftOrderCalendarStrip(
                                pickup: Date(timeIntervalSince1970: context.state.pickupEpoch),
                                returned: Date(timeIntervalSince1970: context.state.returnEpoch)
                            )
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "cart.fill")
            } compactTrailing: {
                Text(context.state.badgeText)
                    .font(.caption2.bold())
                    .foregroundStyle(Color(red: 0.14, green: 0.33, blue: 0.96))
            } minimal: {
                Image(systemName: "cart.fill")
            }
            .widgetURL(URL(string: "anyrent://draft-cart"))
        }
    }
}
