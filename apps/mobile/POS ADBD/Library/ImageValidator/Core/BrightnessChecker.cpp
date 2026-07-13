#include "BrightnessChecker.h"

namespace correctimage {

BrightnessChecker::BrightnessChecker(float min_threshold, float max_threshold)
    : min_threshold_(min_threshold), max_threshold_(max_threshold) {}

BrightnessChecker::Result BrightnessChecker::detect(const cv::Mat& image) const {
    cv::Mat hsv;
    
    // Convert to HSV color space
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, hsv, cv::COLOR_BGR2HSV);
    } else {
        // Grayscale - use directly as brightness
        cv::Scalar mean_val = cv::mean(image);
        float brightness = static_cast<float>(mean_val[0] / 255.0);
        
        return {
            .is_too_dark = brightness < min_threshold_,
            .is_too_bright = brightness > max_threshold_,
            .brightness = brightness,
            .min_threshold = min_threshold_,
            .max_threshold = max_threshold_
        };
    }
    
    // Extract V (Value/Brightness) channel from HSV
    std::vector<cv::Mat> channels;
    cv::split(hsv, channels);
    cv::Mat v_channel = channels[2];
    
    // Calculate mean brightness
    cv::Scalar mean_val = cv::mean(v_channel);
    float brightness = static_cast<float>(mean_val[0] / 255.0);
    
    return {
        .is_too_dark = brightness < min_threshold_,
        .is_too_bright = brightness > max_threshold_,
        .brightness = brightness,
        .min_threshold = min_threshold_,
        .max_threshold = max_threshold_
    };
}

void BrightnessChecker::setThresholds(float min_threshold, float max_threshold) {
    min_threshold_ = min_threshold;
    max_threshold_ = max_threshold;
}

float BrightnessChecker::getMinThreshold() const {
    return min_threshold_;
}

float BrightnessChecker::getMaxThreshold() const {
    return max_threshold_;
}

} // namespace correctimage
