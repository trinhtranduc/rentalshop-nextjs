import UIKit
import CoreGraphics

/// Same checks the old OpenCV `ImageValidator` ran on live camera:
/// Laplacian sharpness, brightness, product blob (center + coverage), clutter, color.
/// OpenCV itself is not linked — the framework was too large to keep in git.
final class CIValidationResult {
    var isValid = false
    var isBlurry = false
    var hasMotionBlur = false
    var isTilted = false
    var isTooDark = false
    var isTooBright = false
    var hasObstruction = false
    var productNotVisible = false
    var backgroundTooCluttered = false
    var hasColorCast = false
    var hasMultipleProducts = false

    var blurScore: Float = 0
    var motionScore: Float = 0
    var tiltAngle: Float = 0
    var brightness: Float = 0
    var obstructionConfidence: Float = 0
    var productCoverage: Float = 0
    var productCenterScore: Float = 0
    var backgroundConsistency: Float = 0
    var whiteBalanceScore: Float = 1
    var colorCastScore: Float = 0
    var saturation: Float = 0
    var singleFocusScore: Float = 0
    var errors: [String] = []
}

private struct GrayBuffer {
    var pixels: [UInt8]
    var width: Int
    var height: Int
}

private struct RGBBuffer {
    var pixels: [UInt8]
    var width: Int
    var height: Int
}

private struct ProductBlob {
    var minX: Int
    var minY: Int
    var maxX: Int
    var maxY: Int
    var area: Int

    var width: Int { return maxX - minX + 1 }
    var height: Int { return maxY - minY + 1 }
    var centerX: Float { return Float(minX + maxX) / 2.0 }
    var centerY: Float { return Float(minY + maxY) / 2.0 }
}

final class CIImageValidator {
    private var blurThreshold: Float = 100
    private var motionThreshold: Float = 0.3
    private var tiltThreshold: Float = 30
    private var brightnessMin: Float = 0.25
    private var brightnessMax: Float = 0.80
    private var productCoverageMin: Float = 0.3
    private var productCoverageMax: Float = 0.7
    private var backgroundClutterThreshold: Float = 0.4
    private var saturationThreshold: Float = 0.8
    private let processMaxSide: CGFloat = 180

    func setBlurThreshold(_ threshold: Float) { blurThreshold = threshold }
    func setMotionThreshold(_ threshold: Float) { motionThreshold = threshold }
    func setTiltThreshold(_ threshold: Float) { tiltThreshold = threshold }
    func setBrightnessMin(_ min: Float, max: Float) {
        brightnessMin = min
        brightnessMax = max
    }
    func setObstructionThreshold(_ threshold: Float) {}
    func setProductCoverageMin(_ min: Float, max: Float) {
        productCoverageMin = min
        productCoverageMax = max
    }
    func setBackgroundClutterThreshold(_ threshold: Float) {
        backgroundClutterThreshold = threshold
    }
    func setSaturationThreshold(_ threshold: Float) {
        saturationThreshold = threshold
    }

    func validate(_ image: UIImage) -> CIValidationResult {
        let result = CIValidationResult()
        guard let gray = grayscale(from: image, maxSide: processMaxSide),
              let rgb = rgb(from: image, maxSide: processMaxSide) else {
            result.isValid = false
            result.errors = ["Unable to process image"]
            return result
        }

        let sharpness = laplacianVariance(gray)
        result.blurScore = sharpness
        result.isBlurry = sharpness < blurThreshold

        let motion = motionBlurScore(gray)
        result.motionScore = motion
        result.hasMotionBlur = motion > motionThreshold

        let brightness = meanValueChannel(rgb)
        result.brightness = brightness
        result.isTooDark = brightness < brightnessMin
        result.isTooBright = brightness > brightnessMax

        let blobs = productBlobs(in: gray)
        let largest = blobs.max { $0.area < $1.area }
        let imageArea = Float(gray.width * gray.height)
        let coverage: Float
        let centerScore: Float
        if let largest = largest, imageArea > 0 {
            coverage = Float(largest.width * largest.height) / imageArea
            centerScore = centeringScore(blob: largest, width: gray.width, height: gray.height)
            result.tiltAngle = blobTiltDegrees(blob: largest, gray: gray)
        } else {
            coverage = 0
            centerScore = 0
        }
        result.productCoverage = coverage
        result.productCenterScore = centerScore
        let hasGoodCoverage = coverage >= productCoverageMin && coverage <= productCoverageMax
        let isWellCentered = centerScore >= 0.6
        result.productNotVisible = !(hasGoodCoverage && isWellCentered && coverage > 0.1)
        result.hasMultipleProducts = blobs.count > 1
        result.singleFocusScore = result.hasMultipleProducts ? 0.3 : (isWellCentered ? 1.0 : centerScore)
        result.isTilted = abs(result.tiltAngle) > tiltThreshold

        let clutter = borderEdgeDensity(gray)
        result.backgroundConsistency = max(0, 1 - clutter)
        result.backgroundTooCluttered = clutter > backgroundClutterThreshold

        let color = colorMetrics(rgb)
        result.saturation = color.saturation
        result.colorCastScore = color.cast
        result.whiteBalanceScore = max(0, 1 - color.cast)
        result.hasColorCast = color.cast > 0.18 || color.saturation > saturationThreshold

        result.hasObstruction = brightness < 0.12 && sharpness < blurThreshold * 0.4
        result.obstructionConfidence = result.hasObstruction ? 0.8 : 0
        result.isValid = !result.isBlurry
            && !result.isTooDark
            && !result.isTooBright
            && !result.productNotVisible
        return result
    }

    /// Normalized product center (0...1). `(-1, -1)` if no blob.
    func detectProductCenter(_ image: UIImage) -> CGPoint {
        guard let gray = grayscale(from: image, maxSide: processMaxSide) else {
            return CGPoint(x: -1, y: -1)
        }
        let blobs = productBlobs(in: gray)
        guard let largest = blobs.max(by: { $0.area < $1.area }), gray.width > 0, gray.height > 0 else {
            return CGPoint(x: -1, y: -1)
        }
        let minArea = Float(gray.width * gray.height) * 0.05
        if Float(largest.area) < minArea {
            return CGPoint(x: -1, y: -1)
        }
        return CGPoint(
            x: CGFloat(largest.centerX / Float(gray.width)),
            y: CGFloat(largest.centerY / Float(gray.height))
        )
    }

    // MARK: - Buffers

    private func grayscale(from image: UIImage, maxSide: CGFloat) -> GrayBuffer? {
        guard let cg = image.cgImage else { return nil }
        let srcW = CGFloat(cg.width)
        let srcH = CGFloat(cg.height)
        let scale = min(1, maxSide / max(srcW, srcH))
        let width = max(1, Int((srcW * scale).rounded()))
        let height = max(1, Int((srcH * scale).rounded()))
        var pixels = [UInt8](repeating: 0, count: width * height)
        guard let ctx = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width,
            space: CGColorSpaceCreateDeviceGray(),
            bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else { return nil }
        ctx.interpolationQuality = .low
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
        return GrayBuffer(pixels: pixels, width: width, height: height)
    }

    private func rgb(from image: UIImage, maxSide: CGFloat) -> RGBBuffer? {
        guard let cg = image.cgImage else { return nil }
        let srcW = CGFloat(cg.width)
        let srcH = CGFloat(cg.height)
        let scale = min(1, maxSide / max(srcW, srcH))
        let width = max(1, Int((srcW * scale).rounded()))
        let height = max(1, Int((srcH * scale).rounded()))
        var pixels = [UInt8](repeating: 0, count: width * height * 4)
        let bitmapInfo = CGBitmapInfo.byteOrder32Little.rawValue | CGImageAlphaInfo.premultipliedFirst.rawValue
        guard let ctx = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: bitmapInfo
        ) else { return nil }
        ctx.interpolationQuality = .low
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
        return RGBBuffer(pixels: pixels, width: width, height: height)
    }

    // MARK: - OpenCV-equivalent checks

    /// OpenCV `Laplacian` + variance (BlurDetector).
    private func laplacianVariance(_ gray: GrayBuffer) -> Float {
        let w = gray.width
        let h = gray.height
        if w < 3 || h < 3 { return 0 }
        var sum: Double = 0
        var sumSq: Double = 0
        var count: Double = 0
        for y in 1..<(h - 1) {
            for x in 1..<(w - 1) {
                let i = y * w + x
                let lap =
                    Int(gray.pixels[i - w]) +
                    Int(gray.pixels[i + w]) +
                    Int(gray.pixels[i - 1]) +
                    Int(gray.pixels[i + 1]) -
                    4 * Int(gray.pixels[i])
                let v = Double(lap)
                sum += v
                sumSq += v * v
                count += 1
            }
        }
        if count < 1 { return 0 }
        let mean = sum / count
        return Float(sumSq / count - mean * mean)
    }

    /// OpenCV Sobel X/Y variance ratio (MotionBlurDetector).
    private func motionBlurScore(_ gray: GrayBuffer) -> Float {
        let varX = sobelVariance(gray, horizontal: true)
        let varY = sobelVariance(gray, horizontal: false)
        let minVar = min(varX, varY)
        let maxVar = max(varX, varY)
        let ratio = minVar / (maxVar + 1e-6)
        return max(0, min(1, 1 - ratio))
    }

    private func sobelVariance(_ gray: GrayBuffer, horizontal: Bool) -> Float {
        let w = gray.width
        let h = gray.height
        if w < 3 || h < 3 { return 0 }
        var sum: Double = 0
        var sumSq: Double = 0
        var count: Double = 0
        for y in 1..<(h - 1) {
            for x in 1..<(w - 1) {
                let v: Int
                if horizontal {
                    v = -Int(gray.pixels[(y - 1) * w + (x - 1)])
                        + Int(gray.pixels[(y - 1) * w + (x + 1)])
                        - 2 * Int(gray.pixels[y * w + (x - 1)])
                        + 2 * Int(gray.pixels[y * w + (x + 1)])
                        - Int(gray.pixels[(y + 1) * w + (x - 1)])
                        + Int(gray.pixels[(y + 1) * w + (x + 1)])
                } else {
                    v = -Int(gray.pixels[(y - 1) * w + (x - 1)])
                        - 2 * Int(gray.pixels[(y - 1) * w + x])
                        - Int(gray.pixels[(y - 1) * w + (x + 1)])
                        + Int(gray.pixels[(y + 1) * w + (x - 1)])
                        + 2 * Int(gray.pixels[(y + 1) * w + x])
                        + Int(gray.pixels[(y + 1) * w + (x + 1)])
                }
                let d = Double(v)
                sum += d
                sumSq += d * d
                count += 1
            }
        }
        if count < 1 { return 0 }
        let mean = sum / count
        return Float(sumSq / count - mean * mean)
    }

    /// HSV Value ≈ max(R,G,B) (BrightnessChecker).
    private func meanValueChannel(_ rgb: RGBBuffer) -> Float {
        let count = rgb.width * rgb.height
        if count == 0 { return 0 }
        var sum: Float = 0
        var i = 0
        while i < rgb.pixels.count - 3 {
            let b = Float(rgb.pixels[i])
            let g = Float(rgb.pixels[i + 1])
            let r = Float(rgb.pixels[i + 2])
            sum += max(r, max(g, b))
            i += 4
        }
        return (sum / Float(count)) / 255.0
    }

    private func colorMetrics(_ rgb: RGBBuffer) -> (saturation: Float, cast: Float) {
        let count = rgb.width * rgb.height
        if count == 0 { return (0, 0) }
        var sumR: Float = 0
        var sumG: Float = 0
        var sumB: Float = 0
        var satSum: Float = 0
        var i = 0
        while i < rgb.pixels.count - 3 {
            let b = Float(rgb.pixels[i])
            let g = Float(rgb.pixels[i + 1])
            let r = Float(rgb.pixels[i + 2])
            sumR += r
            sumG += g
            sumB += b
            let mx = max(r, max(g, b))
            let mn = min(r, min(g, b))
            if mx > 1 {
                satSum += (mx - mn) / mx
            }
            i += 4
        }
        let n = Float(count)
        let meanR = sumR / n
        let meanG = sumG / n
        let meanB = sumB / n
        let mean = (meanR + meanG + meanB) / 3
        let spread = max(meanR, max(meanG, meanB)) - min(meanR, min(meanG, meanB))
        let cast = mean > 1 ? spread / mean : 0
        return (satSum / n, min(1, cast))
    }

    /// Adaptive-threshold + largest contour bbox (ProductVisibilityDetector / detectProductCenter).
    private func productBlobs(in gray: GrayBuffer) -> [ProductBlob] {
        let binary = adaptiveBinary(gray)
        let w = gray.width
        let h = gray.height
        let minArea = max(8, (w * h) / 20)
        var visited = [Bool](repeating: false, count: w * h)
        var blobs: [ProductBlob] = []
        var stackX = [Int]()
        var stackY = [Int]()
        stackX.reserveCapacity(256)
        stackY.reserveCapacity(256)

        for y in 0..<h {
            for x in 0..<w {
                let idx = y * w + x
                if visited[idx] || binary[idx] == 0 { continue }
                stackX.removeAll(keepingCapacity: true)
                stackY.removeAll(keepingCapacity: true)
                stackX.append(x)
                stackY.append(y)
                visited[idx] = true
                var minX = x
                var maxX = x
                var minY = y
                var maxY = y
                var area = 0
                while !stackX.isEmpty {
                    let cx = stackX.removeLast()
                    let cy = stackY.removeLast()
                    area += 1
                    if cx < minX { minX = cx }
                    if cx > maxX { maxX = cx }
                    if cy < minY { minY = cy }
                    if cy > maxY { maxY = cy }
                    let neighbors = [(cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)]
                    for n in neighbors {
                        if n.0 < 0 || n.1 < 0 || n.0 >= w || n.1 >= h { continue }
                        let ni = n.1 * w + n.0
                        if visited[ni] || binary[ni] == 0 { continue }
                        visited[ni] = true
                        stackX.append(n.0)
                        stackY.append(n.1)
                    }
                }
                if area >= minArea {
                    blobs.append(ProductBlob(minX: minX, minY: minY, maxX: maxX, maxY: maxY, area: area))
                }
            }
        }
        return blobs
    }

    private func adaptiveBinary(_ gray: GrayBuffer) -> [UInt8] {
        let w = gray.width
        let h = gray.height
        let radius = 5
        var integral = [Int](repeating: 0, count: (w + 1) * (h + 1))
        for y in 0..<h {
            var rowSum = 0
            for x in 0..<w {
                rowSum += Int(gray.pixels[y * w + x])
                integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum
            }
        }
        var binary = [UInt8](repeating: 0, count: w * h)
        let c = 2
        for y in 0..<h {
            for x in 0..<w {
                let x0 = max(0, x - radius)
                let y0 = max(0, y - radius)
                let x1 = min(w - 1, x + radius)
                let y1 = min(h - 1, y + radius)
                let area = (x1 - x0 + 1) * (y1 - y0 + 1)
                let sum = integral[(y1 + 1) * (w + 1) + (x1 + 1)]
                    - integral[y0 * (w + 1) + (x1 + 1)]
                    - integral[(y1 + 1) * (w + 1) + x0]
                    + integral[y0 * (w + 1) + x0]
                let mean = sum / max(1, area)
                binary[y * w + x] = Int(gray.pixels[y * w + x]) < (mean - c) ? 255 : 0
            }
        }
        return binary
    }

    private func centeringScore(blob: ProductBlob, width: Int, height: Int) -> Float {
        let dx = blob.centerX - Float(width) / 2
        let dy = blob.centerY - Float(height) / 2
        let distance = sqrt(dx * dx + dy * dy)
        let maxDistance = sqrt(Float(width * width + height * height)) / 2
        return max(0, min(1, 1 - distance / (maxDistance + 1e-6)))
    }

    private func blobTiltDegrees(blob: ProductBlob, gray: GrayBuffer) -> Float {
        let w = Float(blob.width)
        let h = Float(blob.height)
        if w < 4 || h < 4 { return 0 }
        let ratio = max(w, h) / (min(w, h) + 1e-6)
        if ratio < 1.4 { return 0 }
        let angle = atan(h / w) * 180 / Float.pi
        let fromAxis = min(abs(angle), min(abs(angle - 90), abs(angle - 180)))
        return fromAxis
    }

    /// Edge density on the 12.5% border (BackgroundConsistencyChecker).
    private func borderEdgeDensity(_ gray: GrayBuffer) -> Float {
        let w = gray.width
        let h = gray.height
        if w < 8 || h < 8 { return 0 }
        let bw = max(2, w / 8)
        let bh = max(2, h / 8)
        var edge = 0
        var count = 0
        for y in 1..<(h - 1) {
            for x in 1..<(w - 1) {
                let onBorder = y < bh || y >= h - bh || x < bw || x >= w - bw
                if !onBorder { continue }
                let gx = Int(gray.pixels[y * w + x + 1]) - Int(gray.pixels[y * w + x - 1])
                let gy = Int(gray.pixels[(y + 1) * w + x]) - Int(gray.pixels[(y - 1) * w + x])
                if abs(gx) + abs(gy) > 40 { edge += 1 }
                count += 1
            }
        }
        if count == 0 { return 0 }
        return Float(edge) / Float(count)
    }
}
