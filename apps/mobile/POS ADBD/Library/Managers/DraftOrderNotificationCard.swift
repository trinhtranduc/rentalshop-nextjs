import UIKit
import Kingfisher
import UserNotifications

/// Renders a Grab/OKX-style card image attached to the local notification.
/// iOS does not allow custom RemoteViews; an image attachment is the supported
/// way to show a branded header, product thumb, rental time chart, and CTA.
enum DraftOrderNotificationCard {
    static func makeAttachment(cart: Cart, completion: @escaping (UNNotificationAttachment?) -> Void) {
        loadProductImage(from: cart) { image in
            DispatchQueue.main.async {
                guard let fileURL = render(cart: cart, productImage: image) else {
                    completion(nil)
                    return
                }
                let attachment = try? UNNotificationAttachment(
                    identifier: "draft-order-card",
                    url: fileURL,
                    options: [UNNotificationAttachmentOptionsTypeHintKey: "public.jpeg"]
                )
                completion(attachment)
            }
        }
    }

    private static func loadProductImage(from cart: Cart, completion: @escaping (UIImage?) -> Void) {
        guard
            let raw = cart.items.first?.imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
            !raw.isEmpty,
            let url = URL(string: raw)
        else {
            completion(nil)
            return
        }
        KingfisherManager.shared.retrieveImage(with: url) { result in
            completion((try? result.get())?.image)
        }
    }

    private static func render(cart: Cart, productImage: UIImage?) -> URL? {
        let card = CardView(cart: cart, productImage: productImage)
        card.layoutIfNeeded()
        let format = UIGraphicsImageRendererFormat.default()
        format.opaque = true
        format.scale = 3
        let renderer = UIGraphicsImageRenderer(bounds: card.bounds, format: format)
        let image = renderer.image { context in
            card.layer.render(in: context.cgContext)
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("anyrent-draft-\(UUID().uuidString).jpg")
        guard let data = image.jpeg(.medium) else { return nil }
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }

    private final class CardView: UIView {
        init(cart: Cart, productImage: UIImage?) {
            super.init(frame: CGRect(x: 0, y: 0, width: 390, height: 336))
            backgroundColor = .white
            isOpaque = true

            let header = UIView(frame: CGRect(x: 0, y: 0, width: 390, height: 56))
            let gradient = CAGradientLayer()
            gradient.frame = header.bounds
            gradient.colors = [
                UIColor(red: 0.10, green: 0.24, blue: 0.88, alpha: 1).cgColor,
                UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1).cgColor
            ]
            gradient.startPoint = CGPoint(x: 0, y: 0)
            gradient.endPoint = CGPoint(x: 1, y: 1)
            header.layer.insertSublayer(gradient, at: 0)
            addSubview(header)

            let brand = UILabel(frame: CGRect(x: 16, y: 8, width: 180, height: 12))
            brand.text = "ANYRENT"
            brand.font = .systemFont(ofSize: 10, weight: .bold)
            brand.textColor = UIColor.white.withAlphaComponent(0.85)
            header.addSubview(brand)

            let live = UILabel(frame: CGRect(x: 286, y: 8, width: 88, height: 16))
            live.text = "●  " + "Draft chart live".localized()
            live.font = .systemFont(ofSize: 10, weight: .semibold)
            live.textColor = UIColor.white.withAlphaComponent(0.92)
            live.textAlignment = .right
            header.addSubview(live)

            let title = UILabel(frame: CGRect(x: 16, y: 24, width: 358, height: 24))
            title.text = cart.isEditMode
                ? "Unsaved order changes".localized()
                : "Unfinished order".localized()
            title.font = .systemFont(ofSize: 17, weight: .bold)
            title.textColor = .white
            header.addSubview(title)

            let thumb = UIImageView(frame: CGRect(x: 16, y: 68, width: 56, height: 56))
            thumb.layer.cornerRadius = 12
            thumb.clipsToBounds = true
            thumb.contentMode = .scaleAspectFill
            thumb.backgroundColor = UIColor(red: 0.93, green: 0.95, blue: 1, alpha: 1)
            thumb.image = productImage
            addSubview(thumb)

            let items = UILabel(frame: CGRect(x: 84, y: 68, width: 290, height: 36))
            items.numberOfLines = 2
            items.font = .systemFont(ofSize: 13, weight: .semibold)
            items.textColor = UIColor(white: 0.12, alpha: 1)
            items.text = itemSummary(for: cart)
            addSubview(items)

            let meta = UILabel(frame: CGRect(x: 84, y: 106, width: 290, height: 16))
            meta.font = .systemFont(ofSize: 12, weight: .regular)
            meta.textColor = UIColor(white: 0.45, alpha: 1)
            meta.text = metaLine(for: cart)
            addSubview(meta)

            let chart = TimeChartView(frame: CGRect(x: 16, y: 132, width: 358, height: 112), cart: cart)
            addSubview(chart)

            let totalLabel = UILabel(frame: CGRect(x: 16, y: 252, width: 140, height: 22))
            totalLabel.text = "Total".localized()
            totalLabel.font = .systemFont(ofSize: 13, weight: .regular)
            totalLabel.textColor = UIColor(white: 0.45, alpha: 1)
            addSubview(totalLabel)

            let price = UILabel(frame: CGRect(x: 160, y: 248, width: 214, height: 28))
            price.textAlignment = .right
            price.font = .systemFont(ofSize: 20, weight: .bold)
            price.textColor = UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1)
            price.text = cart.totalAmount.formatStringInCommon()
            addSubview(price)

            let cta = UILabel(frame: CGRect(x: 16, y: 284, width: 358, height: 40))
            cta.backgroundColor = UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1)
            cta.layer.cornerRadius = 12
            cta.clipsToBounds = true
            cta.textAlignment = .center
            cta.font = .systemFont(ofSize: 15, weight: .bold)
            cta.textColor = .white
            cta.text = "Continue Order".localized()
            addSubview(cta)
        }

        required init?(coder: NSCoder) { nil }

        private func itemSummary(for cart: Cart) -> String {
            let lines = cart.items.prefix(2).map { item in
                String(
                    format: "Draft order item qty".localized(),
                    item.productName ?? "",
                    item.quantity
                )
            }
            var text = lines.joined(separator: "\n")
            let extra = cart.items.count - 2
            if extra > 0 {
                text += "\n" + String(format: "Draft order items more".localized(), extra)
            }
            return text
        }

        private func metaLine(for cart: Cart) -> String {
            let type = cart.orderType == .rent ? "Rent".localized() : "Sale".localized()
            let name = cart.customer?.full_name?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if name.isEmpty {
                return "\(cart.itemCount) · \(type)"
            }
            return "\(cart.itemCount) · \(type) · \(name)"
        }
    }
}

/// Donut + pickup/return timeline + weekday bars. Rent uses the planned window;
/// sale uses a 12-slot clock so the card still has a time chart.
private final class TimeChartView: UIView {
    private let model: TimeChartModel

    init(frame: CGRect, cart: Cart) {
        self.model = TimeChartModel(cart: cart)
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
        // Bake into layer.contents so the parent snapshot includes the chart
        // even when this view was never added to an on-screen window.
        let format = UIGraphicsImageRendererFormat.default()
        format.opaque = false
        format.scale = 3
        let image = UIGraphicsImageRenderer(size: frame.size, format: format).image { _ in
            self.paint(in: CGRect(origin: .zero, size: frame.size))
        }
        layer.contents = image.cgImage
    }

    required init?(coder: NSCoder) { nil }

    private func paint(in rect: CGRect) {
        let path = UIBezierPath(roundedRect: rect, cornerRadius: 14)
        UIColor(red: 0.95, green: 0.97, blue: 1, alpha: 1).setFill()
        path.fill()

        drawDonut()
        drawTimeline()
        drawBars()
    }

    private func drawDonut() {
        let center = CGPoint(x: 54, y: 48)
        let radius: CGFloat = 28
        let track = UIBezierPath(
            arcCenter: center,
            radius: radius,
            startAngle: 0,
            endAngle: .pi * 2,
            clockwise: true
        )
        track.lineWidth = 8
        UIColor(red: 0.85, green: 0.89, blue: 0.98, alpha: 1).setStroke()
        track.stroke()

        let start: CGFloat = -.pi / 2
        let sweep = CGFloat(model.progress) * .pi * 2
        if sweep > 0.02 {
            let arc = UIBezierPath(
                arcCenter: center,
                radius: radius,
                startAngle: start,
                endAngle: start + sweep,
                clockwise: true
            )
            arc.lineWidth = 8
            arc.lineCapStyle = .round
            UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1).setStroke()
            arc.stroke()
        }

        let valueFont: CGFloat = model.centerValue.contains(":") ? 13 : 20
        let value = NSAttributedString(
            string: model.centerValue,
            attributes: [
                .font: UIFont.systemFont(ofSize: valueFont, weight: .bold),
                .foregroundColor: UIColor(white: 0.12, alpha: 1)
            ]
        )
        let valueSize = value.size()
        value.draw(at: CGPoint(x: center.x - valueSize.width / 2, y: center.y - 16))

        let unit = NSAttributedString(
            string: model.centerUnit,
            attributes: [
                .font: UIFont.systemFont(ofSize: 9, weight: .semibold),
                .foregroundColor: UIColor(white: 0.45, alpha: 1)
            ]
        )
        let unitSize = unit.size()
        unit.draw(at: CGPoint(x: center.x - unitSize.width / 2, y: center.y + 6))
    }

    private func drawTimeline() {
        let left = model.leftCaption
        let right = model.rightCaption
        let leftAttr = NSAttributedString(
            string: left,
            attributes: [
                .font: UIFont.systemFont(ofSize: 11, weight: .bold),
                .foregroundColor: UIColor(white: 0.12, alpha: 1)
            ]
        )
        let rightAttr = NSAttributedString(
            string: right,
            attributes: [
                .font: UIFont.systemFont(ofSize: 11, weight: .bold),
                .foregroundColor: UIColor(white: 0.12, alpha: 1)
            ]
        )
        leftAttr.draw(at: CGPoint(x: 100, y: 10))
        let rightSize = rightAttr.size()
        rightAttr.draw(at: CGPoint(x: bounds.width - 12 - rightSize.width, y: 10))

        let subLeft = NSAttributedString(
            string: model.leftHint,
            attributes: [
                .font: UIFont.systemFont(ofSize: 9, weight: .medium),
                .foregroundColor: UIColor(white: 0.45, alpha: 1)
            ]
        )
        let subRight = NSAttributedString(
            string: model.rightHint,
            attributes: [
                .font: UIFont.systemFont(ofSize: 9, weight: .medium),
                .foregroundColor: UIColor(white: 0.45, alpha: 1)
            ]
        )
        subLeft.draw(at: CGPoint(x: 100, y: 24))
        let subRightSize = subRight.size()
        subRight.draw(at: CGPoint(x: bounds.width - 12 - subRightSize.width, y: 24))

        let lineY: CGFloat = 48
        let lineStart: CGFloat = 108
        let lineEnd = bounds.width - 20
        let track = UIBezierPath()
        track.move(to: CGPoint(x: lineStart, y: lineY))
        track.addLine(to: CGPoint(x: lineEnd, y: lineY))
        track.lineWidth = 6
        track.lineCapStyle = .round
        UIColor(red: 0.85, green: 0.89, blue: 0.98, alpha: 1).setStroke()
        track.stroke()

        let fillEnd = lineStart + (lineEnd - lineStart) * CGFloat(model.progress)
        let fill = UIBezierPath()
        fill.move(to: CGPoint(x: lineStart, y: lineY))
        fill.addLine(to: CGPoint(x: max(lineStart + 2, fillEnd), y: lineY))
        fill.lineWidth = 6
        fill.lineCapStyle = .round
        UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1).setStroke()
        fill.stroke()

        drawDot(at: CGPoint(x: lineStart, y: lineY), filled: true)
        drawDot(at: CGPoint(x: lineEnd, y: lineY), filled: model.progress >= 0.98)
        let nowX = lineStart + (lineEnd - lineStart) * CGFloat(max(0.04, min(0.96, model.progress)))
        drawNowMarker(at: CGPoint(x: nowX, y: lineY))
    }

    private func drawDot(at point: CGPoint, filled: Bool) {
        let rect = CGRect(x: point.x - 5, y: point.y - 5, width: 10, height: 10)
        let path = UIBezierPath(ovalIn: rect)
        if filled {
            UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1).setFill()
            path.fill()
        } else {
            UIColor.white.setFill()
            path.fill()
            UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1).setStroke()
            path.lineWidth = 2
            path.stroke()
        }
    }

    private func drawNowMarker(at point: CGPoint) {
        let glow = UIBezierPath(ovalIn: CGRect(x: point.x - 9, y: point.y - 9, width: 18, height: 18))
        UIColor(red: 1, green: 0.55, blue: 0.12, alpha: 0.22).setFill()
        glow.fill()
        let inner = UIBezierPath(ovalIn: CGRect(x: point.x - 5, y: point.y - 5, width: 10, height: 10))
        UIColor(red: 1, green: 0.55, blue: 0.12, alpha: 1).setFill()
        inner.fill()
        UIColor.white.setStroke()
        inner.lineWidth = 1.5
        inner.stroke()
    }

    private func drawBars() {
        let bars = model.bars
        guard !bars.isEmpty else { return }
        let originX: CGFloat = 100
        let top: CGFloat = 62
        let height: CGFloat = 36
        let width = bounds.width - originX - 12
        let gap: CGFloat = 4
        let barWidth = (width - gap * CGFloat(bars.count - 1)) / CGFloat(bars.count)

        for (index, bar) in bars.enumerated() {
            let x = originX + CGFloat(index) * (barWidth + gap)
            let barHeight = max(6, height * CGFloat(bar.height))
            let y = top + height - barHeight
            let rect = CGRect(x: x, y: y, width: barWidth, height: barHeight)
            let path = UIBezierPath(roundedRect: rect, cornerRadius: 3)
            if bar.isToday {
                UIColor(red: 1, green: 0.55, blue: 0.12, alpha: 1).setFill()
            } else if bar.isActive {
                UIColor(red: 0.14, green: 0.33, blue: 0.96, alpha: 1).setFill()
            } else {
                UIColor(red: 0.85, green: 0.89, blue: 0.98, alpha: 1).setFill()
            }
            path.fill()
        }
    }
}

private struct TimeChartModel {
    struct Bar {
        var height: CGFloat
        var isActive: Bool
        var isToday: Bool
    }

    var progress: Double
    var centerValue: String
    var centerUnit: String
    var leftCaption: String
    var rightCaption: String
    var leftHint: String
    var rightHint: String
    var bars: [Bar]

    init(cart: Cart) {
        let calendar = Calendar.current
        let now = Date()
        if cart.orderType == .rent {
            let pickup = calendar.startOfDay(for: cart.pickupPlanAt ?? now)
            let returned = calendar.startOfDay(for: cart.returnPlanAt ?? calendar.date(byAdding: .day, value: 1, to: pickup)!)
            let days = max(1, (calendar.dateComponents([.day], from: pickup, to: returned).day ?? 0) + 1)
            let window = max(1, returned.timeIntervalSince(pickup))
            let rawProgress = now.timeIntervalSince(pickup) / window
            progress = min(1, max(0, rawProgress))
            centerValue = "\(days)"
            centerUnit = days == 1 ? "Draft chart day unit".localized() : "Draft chart days unit".localized()
            leftCaption = Self.shortDate(pickup)
            rightCaption = Self.shortDate(returned)
            leftHint = "Draft chart pickup".localized()
            rightHint = "Draft chart return".localized()
            bars = Self.weekBars(pickup: pickup, returned: returned, today: calendar.startOfDay(for: now), calendar: calendar)
        } else {
            let hour = calendar.component(.hour, from: now)
            let minute = calendar.component(.minute, from: now)
            progress = min(1, Double(hour * 60 + minute) / (24 * 60))
            centerValue = String(format: "%02d:%02d", hour, minute)
            centerUnit = "Draft chart today".localized()
            leftCaption = Self.shortDate(now)
            rightCaption = "Sale".localized()
            leftHint = "Draft chart now".localized()
            rightHint = "Draft chart checkout".localized()
            bars = (0..<12).map { slot in
                let active = hour / 2 == slot
                return Bar(
                    height: active ? 1 : 0.28,
                    isActive: false,
                    isToday: active
                )
            }
        }
    }

    private static func weekBars(pickup: Date, returned: Date, today: Date, calendar: Calendar) -> [Bar] {
        let days = max(1, (calendar.dateComponents([.day], from: pickup, to: returned).day ?? 0) + 1)
        if days > 7 {
            let count = min(days, 10)
            return (0..<count).map { index in
                let date = calendar.date(byAdding: .day, value: index, to: pickup) ?? pickup
                return Bar(
                    height: 1,
                    isActive: true,
                    isToday: calendar.isDate(date, inSameDayAs: today)
                )
            }
        }
        let weekday = calendar.component(.weekday, from: pickup)
        let mondayOffset = (weekday + 5) % 7
        let weekStart = calendar.date(byAdding: .day, value: -mondayOffset, to: pickup) ?? pickup
        return (0..<7).map { index in
            let date = calendar.date(byAdding: .day, value: index, to: weekStart) ?? weekStart
            let active = date >= pickup && date <= returned
            return Bar(
                height: active ? 1 : 0.28,
                isActive: active,
                isToday: calendar.isDate(date, inSameDayAs: today)
            )
        }
    }

    private static func shortDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = .current
        formatter.dateFormat = Locale.current.languageCode?.hasPrefix("vi") == true ? "dd/MM" : "d MMM"
        return formatter.string(from: date)
    }
}
