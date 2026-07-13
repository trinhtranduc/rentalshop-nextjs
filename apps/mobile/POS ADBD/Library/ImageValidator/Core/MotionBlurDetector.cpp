#include "MotionBlurDetector.h"
#include <cmath>
#include <algorithm>

namespace correctimage {

MotionBlurDetector::MotionBlurDetector(float threshold)
    : threshold_(threshold) {}

MotionBlurDetector::Result MotionBlurDetector::detect(const cv::Mat& image) const {
    cv::Mat gray;
    
    // Convert to grayscale
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // Calculate gradients in X and Y directions
    cv::Mat grad_x, grad_y;
    cv::Sobel(gray, grad_x, CV_64F, 1, 0, 3);
    cv::Sobel(gray, grad_y, CV_64F, 0, 1, 3);
    
    // Calculate variance for each direction
    double var_x = calculateVariance(grad_x);
    double var_y = calculateVariance(grad_y);
    
    // Motion blur causes low variance in the direction of motion
    // Calculate ratio (should be close to 1.0 for sharp images)
    double min_var = std::min(var_x, var_y);
    double max_var = std::max(var_x, var_y);
    float ratio = static_cast<float>(min_var / (max_var + 1e-6));
    
    // Motion score: 0 = no motion blur, 1 = severe motion blur
    float motion_score = 1.0f - ratio;
    
    // Calculate direction of potential motion blur
    float direction = 0.0f;
    if (var_x < var_y) {
        direction = 0.0f;  // Horizontal motion
    } else {
        direction = 90.0f; // Vertical motion
    }
    
    return {
        .has_motion_blur = motion_score > threshold_,
        .motion_score = motion_score,
        .direction = direction,
        .threshold = threshold_
    };
}

void MotionBlurDetector::setThreshold(float threshold) {
    threshold_ = threshold;
}

float MotionBlurDetector::getThreshold() const {
    return threshold_;
}

double MotionBlurDetector::calculateVariance(const cv::Mat& mat) const {
    cv::Scalar mean, stddev;
    cv::meanStdDev(mat, mean, stddev);
    return stddev.val[0] * stddev.val[0];
}

} // namespace correctimage
