#include "ColorAccuracyChecker.h"
#include <algorithm>
#include <cmath>

namespace correctimage {

ColorAccuracyChecker::ColorAccuracyChecker(float saturation_threshold)
    : saturation_threshold_(saturation_threshold) {}

ColorAccuracyChecker::Result ColorAccuracyChecker::detect(const cv::Mat& image) const {
    if (image.empty()) {
        return {
            .has_good_white_balance = false,
            .has_color_cast = true,
            .white_balance_score = 0.0f,
            .color_cast_score = 1.0f,
            .saturation = 0.0f,
            .is_over_saturated = false,
            .saturation_threshold = saturation_threshold_
        };
    }
    
    // Convert to BGR if needed
    cv::Mat bgr;
    if (image.channels() == 1) {
        cv::cvtColor(image, bgr, cv::COLOR_GRAY2BGR);
    } else if (image.channels() == 4) {
        cv::cvtColor(image, bgr, cv::COLOR_BGRA2BGR);
    } else {
        bgr = image.clone();
    }
    
    // Check white balance
    float whiteBalanceScore = checkWhiteBalance(bgr);
    
    // Detect color cast
    float colorCastScore = detectColorCast(bgr);
    
    // Calculate saturation
    float saturation = calculateSaturation(bgr);
    
    // Determine results
    bool hasGoodWhiteBalance = whiteBalanceScore > 0.7f; // At least 70% good
    bool hasColorCast = colorCastScore > 0.3f; // More than 30% cast
    bool isOverSaturated = saturation > saturation_threshold_;
    
    return {
        .has_good_white_balance = hasGoodWhiteBalance,
        .has_color_cast = hasColorCast,
        .white_balance_score = whiteBalanceScore,
        .color_cast_score = colorCastScore,
        .saturation = saturation,
        .is_over_saturated = isOverSaturated,
        .saturation_threshold = saturation_threshold_
    };
}

float ColorAccuracyChecker::checkWhiteBalance(const cv::Mat& image) const {
    // Gray World Assumption: In a properly white-balanced image,
    // the average of all colors should be gray (equal R, G, B)
    
    cv::Scalar meanBGR = cv::mean(image);
    float meanB = meanBGR[0];
    float meanG = meanBGR[1];
    float meanR = meanBGR[2];
    
    // Calculate how close the means are to each other
    float avgMean = (meanB + meanG + meanR) / 3.0f;
    
    // Calculate deviations from average
    float devB = std::abs(meanB - avgMean) / (avgMean + 1e-6f);
    float devG = std::abs(meanG - avgMean) / (avgMean + 1e-6f);
    float devR = std::abs(meanR - avgMean) / (avgMean + 1e-6f);
    
    // Average deviation (lower = better white balance)
    float avgDeviation = (devB + devG + devR) / 3.0f;
    
    // Convert to score: 1.0 = perfect, 0.0 = very bad
    // Good white balance: deviation < 10%
    float score = 1.0f - std::min(1.0f, avgDeviation * 2.0f);
    
    return std::max(0.0f, std::min(1.0f, score));
}

float ColorAccuracyChecker::detectColorCast(const cv::Mat& image) const {
    // Color cast detection: check if one channel dominates
    cv::Scalar meanBGR = cv::mean(image);
    float meanB = meanBGR[0];
    float meanG = meanBGR[1];
    float meanR = meanBGR[2];
    
    float total = meanB + meanG + meanR;
    if (total < 1e-6) {
        return 0.0f;
    }
    
    // Calculate ratios
    float ratioB = meanB / total;
    float ratioG = meanG / total;
    float ratioR = meanR / total;
    
    // In a neutral image, each channel should be ~33%
    // Calculate deviation from ideal (33.3% each)
    float idealRatio = 1.0f / 3.0f;
    float devB = std::abs(ratioB - idealRatio);
    float devG = std::abs(ratioG - idealRatio);
    float devR = std::abs(ratioR - idealRatio);
    
    // Maximum deviation indicates color cast
    float maxDeviation = std::max({devB, devG, devR});
    
    // Convert to score: 0.0 = no cast, 1.0 = strong cast
    // Normalize: max deviation of 0.2 (20%) = strong cast
    float score = std::min(1.0f, maxDeviation / 0.2f);
    
    return score;
}

float ColorAccuracyChecker::calculateSaturation(const cv::Mat& image) const {
    // Convert to HSV
    cv::Mat hsv;
    cv::cvtColor(image, hsv, cv::COLOR_BGR2HSV);
    
    // Extract S (Saturation) channel
    std::vector<cv::Mat> channels;
    cv::split(hsv, channels);
    cv::Mat sChannel = channels[1];
    
    // Calculate mean saturation
    cv::Scalar meanSat = cv::mean(sChannel);
    
    // Normalize to 0-1 (HSV S channel is 0-255)
    return static_cast<float>(meanSat[0] / 255.0);
}

void ColorAccuracyChecker::setSaturationThreshold(float threshold) {
    saturation_threshold_ = threshold;
}

float ColorAccuracyChecker::getSaturationThreshold() const {
    return saturation_threshold_;
}

} // namespace correctimage
