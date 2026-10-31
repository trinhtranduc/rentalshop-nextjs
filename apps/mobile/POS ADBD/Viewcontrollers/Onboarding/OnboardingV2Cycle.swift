//
//  OnboardingV2Cycle.swift
//  POS ADBD
//
//  #1404 the logic of the 3-page onboarding, with no views: the copy keys, the cycle (which page plays, hold, repeat,
//  cancel), each page's effect as a pure function of time, and the layout numbers. Android `OnboardingV2Cycle.kt` is
//  the same file in Kotlin. The curves and times are the mockup's (tab "★ 3 trang hướng dẫn").
//

import CoreGraphics
import Foundation

enum OnboardingV2Timing {
    static let effect: TimeInterval = 1.5
    static let hold: TimeInterval = 4
    static let travel: TimeInterval = 0.45
    /// A repeat fades the finished state out first, so the loop does not cut. Not part of `effect`.
    static let repeatFade: TimeInterval = 0.2
}

enum OnboardingV2Page: Int, CaseIterable {
    case photoSearch, overlap, calendar

    var titleKey: String { "onboarding.v2.p\(rawValue + 1).title" }
    var bodyKey: String { "onboarding.v2.p\(rawValue + 1).body" }
}

enum OnboardingV2Copy {
    /// Every key the pages own. "Trùng lịch", "Vẫn tạo đơn" and "Hủy" are the app's existing strings.
    static let keys: [String] = OnboardingV2Page.allCases.flatMap { [$0.titleKey, $0.bodyKey] } + [
        "sample.lang", "scan.count", "scan.from", "scan.dress1", "scan.dress1.meta", "scan.dress2", "scan.dress2.meta",
        "scan.dress3", "scan.dress3.meta", "cal.title", "cal.subtitle", "cal.mon", "cal.tue", "cal.wed", "cal.thu", "cal.fri",
        "cal.sat", "cal.sun", "cal.out", "cal.chip.booked", "cal.chip.new", "warn.body", "today.head", "today.count",
        "today.pickup", "today.return", "today.name1", "today.item1", "today.amount1", "today.name2", "today.item2",
        "today.amount2", "today.name3", "today.item3", "today.amount3", "today.collect", "today.refund",
    ].map { "onboarding.v2.\($0)" }
}

/// Fixed sample money for the count-up on page 3: it follows the language of the strings, never the shop's currency.
struct OnboardingV2Sample {
    let language: String

    var collectTargets: [Int] { language == "vi" ? [1_500_000, 720_000] : [150, 75] }

    func money(_ value: Double) -> String {
        let whole = Int(value.rounded())
        guard language == "vi" else { return "$\(whole)" }
        var digits = String(whole)
        var groups: [String] = []
        while digits.count > 3 {
            groups.insert(String(digits.suffix(3)), at: 0)
            digits.removeLast(3)
        }
        groups.insert(digits, at: 0)
        return groups.joined(separator: ".")
    }
}

// MARK: - Cycle

struct OnboardingV2Run: Equatable {
    let page: Int
    let generation: Int
    /// The page the photo travels from; nil when it stays where it is
    let travelFrom: Int?
    let isRepeat: Bool
    /// false: Reduce Motion, show the finished state and do not loop
    let animated: Bool
}

/// One cycle at most is ever alive: every change makes a new generation, and a timer of an older generation does nothing.
struct OnboardingV2Cycle {
    enum Phase { case stopped, playing, holding, finished }

    static let pageCount = OnboardingV2Page.allCases.count

    private(set) var page = 0
    private(set) var phase = Phase.stopped
    private(set) var generation = 0
    private(set) var reduceMotion = false

    /// The screen is showing, or came back from background: the current page's own effect, no travel
    mutating func start(reduceMotion: Bool) -> OnboardingV2Run {
        self.reduceMotion = reduceMotion
        return makeRun(travelFrom: nil, isRepeat: false)
    }

    /// Tiếp or a swipe. nil past either end, and the running effect goes on.
    mutating func go(to target: Int) -> OnboardingV2Run? {
        guard (0..<Self.pageCount).contains(target), target != page else { return nil }
        let from = page
        page = target
        return makeRun(travelFrom: from, isRepeat: false)
    }

    /// True when the hold starts now; false for a cancelled effect
    mutating func effectEnded(generation: Int) -> Bool {
        guard generation == self.generation, phase == .playing else { return false }
        phase = .holding
        return true
    }

    /// The repeat, or nil for a cancelled hold
    mutating func holdEnded(generation: Int) -> OnboardingV2Run? {
        guard generation == self.generation, phase == .holding else { return nil }
        return makeRun(travelFrom: nil, isRepeat: true)
    }

    /// Leaving the screen or going to background
    mutating func stop() {
        generation += 1
        phase = .stopped
    }

    private mutating func makeRun(travelFrom: Int?, isRepeat: Bool) -> OnboardingV2Run {
        generation += 1
        phase = reduceMotion ? .finished : .playing
        return OnboardingV2Run(page: page, generation: generation, travelFrom: reduceMotion ? nil : travelFrom,
                               isRepeat: isRepeat, animated: !reduceMotion)
    }
}

// MARK: - Curves

enum OnboardingV2Curve {
    /// CSS `cubic-bezier`: solves x(u) = t by bisection, then returns y(u)
    static func bezier(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double, _ t: Double) -> Double {
        if t <= 0 { return 0 }
        if t >= 1 { return 1 }
        func point(_ a: Double, _ b: Double, _ u: Double) -> Double {
            3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u
        }
        var low = 0.0, high = 1.0
        for _ in 0..<20 {
            let mid = (low + high) / 2
            if point(x1, x2, mid) < t { low = mid } else { high = mid }
        }
        return point(y1, y2, (low + high) / 2)
    }

    static func ease(_ t: Double) -> Double { bezier(0.25, 0.1, 0.25, 1, t) }
    static func easeOut(_ t: Double) -> Double { bezier(0, 0, 0.58, 1, t) }
    static func clamp(_ t: Double, from start: Double, duration: Double) -> Double { min(1, max(0, (t - start) / duration)) }
    static func lerp(_ a: Double, _ b: Double, _ k: Double) -> Double { a + (b - a) * k }
}

// MARK: - Page effects

/// Each page at time `t`, in seconds. `t` below 0 is the fade of a repeat, from the finished state to the start.
/// From `Timing.effect` on it is the finished state, which is also what Reduce Motion shows.
enum OnboardingV2Effect {
    struct PhotoSearch: Equatable {
        /// Scan line position in its frame, 0 top to 1 bottom
        var scan: Double
        var resultAlpha: Double
        var rows: [Double]
        var ticks: [Double]

        static let finished = PhotoSearch(scan: 0.62, resultAlpha: 1, rows: [1, 1, 1], ticks: [1, 1, 1])
    }

    struct Chip: Equatable {
        var alpha: Double
        var offsetX: Double
        var scale: Double

        static let gone = Chip(alpha: 0, offsetX: 0, scale: 0.6)
    }

    struct Overlap: Equatable {
        var chipBooked: Chip
        var chipNew: Chip
        /// The hit cell, 0 low stock to 1 red
        var red: Double
        var showsOut: Bool
        var shake: Double
        var warning: Double

        static let finished = Overlap(chipBooked: .gone, chipNew: .gone, red: 1, showsOut: true, shake: 0, warning: 1)
    }

    struct Calendar: Equatable {
        var rows: [Double]
        /// "còn thu" fraction of its target
        var collect: Double

        static let finished = Calendar(rows: [1, 1, 1], collect: 1)
    }

    private static func fade(_ t: Double) -> Double { min(1, -t / OnboardingV2Timing.repeatFade) }

    static func photoSearch(at t: Double) -> PhotoSearch {
        if t >= OnboardingV2Timing.effect { return .finished }
        if t < 0 {
            let k = fade(t)
            return PhotoSearch(scan: 0.62 * k, resultAlpha: k, rows: [k, k, k], ticks: [k, k, k])
        }
        typealias C = OnboardingV2Curve
        let sweep = C.clamp(t, from: 0, duration: 0.7)
        let line: (Double) -> Double = { C.bezier(0.45, 0, 0.55, 1, $0) }
        let scan = sweep < 0.6 ? 0.97 * line(sweep / 0.6) : C.lerp(0.97, 0.62, line((sweep - 0.6) / 0.4))
        let rows = [0.68, 0.88, 1.08].map { C.ease(C.clamp(t, from: $0, duration: 0.25)) }
        let ticks = [0.84, 1.04, 1.24].map { C.bezier(0.2, 1.6, 0.4, 1, C.clamp(t, from: $0, duration: 0.22)) }
        return PhotoSearch(scan: scan, resultAlpha: C.ease(C.clamp(t, from: 0.5, duration: 0.2)), rows: rows, ticks: ticks)
    }

    static func overlap(at t: Double) -> Overlap {
        if t >= OnboardingV2Timing.effect { return .finished }
        if t < 0 {
            return Overlap(chipBooked: .gone, chipNew: .gone, red: fade(t), showsOut: fade(t) > 0.5, shake: 0, warning: fade(t))
        }
        typealias C = OnboardingV2Curve
        let booked = chip(C.clamp(t, from: 0.3, duration: 0.7), from: -90, inAt: 0.4, outAt: 0.85)
        let new = chip(C.clamp(t, from: 0.5, duration: 0.5), from: 90, inAt: 0.55, outAt: 0.8)
        return Overlap(chipBooked: booked, chipNew: new, red: C.clamp(t, from: 0.84, duration: 0.06), showsOut: t >= 0.84,
                       shake: shake(C.clamp(t, from: 0.84, duration: 0.26)),
                       warning: C.bezier(0.2, 1.35, 0.4, 1, C.clamp(t, from: 1.1, duration: 0.38)))
    }

    private static func chip(_ u: Double, from: Double, inAt: Double, outAt: Double) -> Chip {
        typealias C = OnboardingV2Curve
        if u <= 0 { return Chip(alpha: 0, offsetX: from, scale: 1) }
        if u < inAt {
            let k = C.easeOut(u / inAt)
            return Chip(alpha: k, offsetX: from * (1 - k), scale: 1)
        }
        if u < outAt { return Chip(alpha: 1, offsetX: 0, scale: 1) }
        let k = C.easeOut((u - outAt) / (1 - outAt))
        return Chip(alpha: 1 - k, offsetX: 0, scale: 1 - 0.4 * k)
    }

    private static func shake(_ u: Double) -> Double {
        let stops: [Double] = [0, -3, 3, -2, 2, 0]
        if u <= 0 || u >= 1 { return 0 }
        let position = u * 5
        let index = min(4, Int(position))
        return OnboardingV2Curve.lerp(stops[index], stops[index + 1], position - Double(index))
    }

    static func calendar(at t: Double) -> Calendar {
        if t >= OnboardingV2Timing.effect { return .finished }
        if t < 0 {
            let k = fade(t)
            return Calendar(rows: [k, k, k], collect: 1)
        }
        typealias C = OnboardingV2Curve
        let rows = [0.2, 0.45, 0.7].map { C.ease(C.clamp(t, from: $0, duration: 0.28)) }
        let k = C.clamp(t, from: 0.25, duration: 1.15)
        return Calendar(rows: rows, collect: 1 - pow(1 - k, 3))
    }
}

/// The move between pages, on the same clock as the effect
enum OnboardingV2Travel {
    static func hero(at t: Double) -> Double {
        OnboardingV2Curve.bezier(0.3, 1.1, 0.35, 1, OnboardingV2Curve.clamp(t, from: 0, duration: OnboardingV2Timing.travel))
    }

    /// Cards and text in and out
    static func fade(at t: Double) -> Double { OnboardingV2Curve.ease(OnboardingV2Curve.clamp(t, from: 0, duration: 0.25)) }
    static func slide(at t: Double) -> Double { OnboardingV2Curve.bezier(0.2, 0.9, 0.3, 1, OnboardingV2Curve.clamp(t, from: 0, duration: 0.35)) }

    /// The travel curve overshoots 1, and a corner radius can never go below 0
    static func radius(from: CGFloat, to: CGFloat, travel: Double) -> CGFloat {
        max(0, from + (to - from) * CGFloat(travel))
    }
}

// MARK: - Layout

/// Layout numbers from the mockup: regular is its 390×844 phone, compact its 320×568 phone.
struct OnboardingV2Metrics: Equatable {
    let width: CGFloat
    let height: CGFloat
    let safeTop: CGFloat
    let compact: Bool

    let footerHeight: CGFloat
    let footerTop: CGFloat
    let titleSize: CGFloat
    let titleLine: CGFloat
    let bodySize: CGFloat
    let bodyLine: CGFloat
    let textInset: CGFloat
    let textTop: CGFloat
    let textHeight: CGFloat
    let stageHeight: CGFloat
    let topBarTop: CGFloat
    let cardTop: CGFloat
    let cardInset: CGFloat

    init(width: CGFloat, height: CGFloat, safeTop: CGFloat, safeBottom: CGFloat) {
        self.width = width
        self.height = height
        self.safeTop = safeTop
        let compact = height - safeBottom < 620
        self.compact = compact
        footerHeight = compact ? 48 : 54
        footerTop = height - max(safeBottom, 14) - footerHeight
        titleSize = compact ? 24 : 32
        titleLine = compact ? 29 : 38
        bodySize = compact ? 14 : 16
        bodyLine = compact ? 19 : 23
        textInset = compact ? 20 : 28
        textHeight = titleLine * 2 + (compact ? 5 : 8) + bodyLine * 2
        let gapAbove: CGFloat = compact ? 12 : 24
        let gapBelow: CGFloat = compact ? 6 : 12
        let room = footerTop - gapBelow - textHeight - gapAbove
        let stage = (min(height * (compact ? 0.55 : 0.65), room)).rounded(.down)
        stageHeight = stage
        textTop = stage + gapAbove
        topBarTop = safeTop + (compact ? 4 : 12)
        cardTop = topBarTop + 44 + (compact ? 0 : 9)
        // A wide screen (iPad) keeps the cards at phone width
        cardInset = max(compact ? 12 : 20, (width - 560) / 2)
    }

    var cardPadding: CGFloat { compact ? 8 : 12 }
    var todayPaddingX: CGFloat { compact ? 12 : 16 }
    var todayPaddingTop: CGFloat { compact ? 8 : 14 }
    var todayHeaderHeight: CGFloat { compact ? 18 : 33 }
    var todayRowHeight: CGFloat { compact ? 58 : 76 }

    /// Where the photo sits on a page. The cards leave this spot free.
    func heroRect(page: Int) -> CGRect {
        switch page {
        case 1:
            let size: CGFloat = compact ? 40 : 64
            return CGRect(x: cardInset + cardPadding, y: cardTop + cardPadding, width: size, height: size)
        case 2:
            let size: CGFloat = compact ? 40 : 56
            let rowTop = cardTop + todayPaddingTop + todayHeaderHeight
            return CGRect(x: cardInset + todayPaddingX, y: rowTop + (todayRowHeight - size) / 2, width: size, height: size)
        default:
            return CGRect(x: 0, y: 0, width: width, height: stageHeight)
        }
    }

    func heroRadius(page: Int) -> CGFloat {
        switch page {
        case 1: return compact ? 10 : 14
        case 2: return compact ? 9 : 12
        default: return 0
        }
    }
}
