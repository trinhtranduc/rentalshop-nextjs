#include "TiltDetector.h"
#include <algorithm>
#include <cmath>

namespace correctimage {

TiltDetector::TiltDetector(float threshold)
    : threshold_(threshold) {}

TiltDetector::Result TiltDetector::detect(const cv::Mat& image) const {
    cv::Mat gray, edges;
    
    // Convert to grayscale
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // Apply Canny edge detection
    cv::Canny(gray, edges, 50, 150, 3);
    
    // Detect lines using Hough transform
    std::vector<cv::Vec2f> lines;
    cv::HoughLines(edges, lines, 1, CV_PI / 180, 150);
    
    // Filter for vertical lines and calculate their angles
    std::vector<float> vertical_angles;
    
    for (const auto& line : lines) {
        float rho = line[0];
        float theta = line[1];
        float theta_deg = theta * 180.0f / CV_PI;
        
        // Vertical lines have theta near 0° or near 180°
        // (shelf edges are typically vertical)
        if ((theta_deg > 85 && theta_deg < 95) || 
            (theta_deg < 5 || theta_deg > 175)) {
            
            float angle_from_vertical;
            if (theta_deg > 90) {
                angle_from_vertical = theta_deg - 90;
            } else {
                angle_from_vertical = 90 - theta_deg;
            }
            
            vertical_angles.push_back(angle_from_vertical);
        }
    }
    
    // Calculate median angle
    float median_angle = 0.0f;
    if (!vertical_angles.empty()) {
        median_angle = calculateMedian(vertical_angles);
    }
    
    return {
        .is_tilted = std::abs(median_angle) > threshold_,
        .tilt_angle = median_angle,
        .threshold = threshold_
    };
}

void TiltDetector::setThreshold(float threshold) {
    threshold_ = threshold;
}

float TiltDetector::getThreshold() const {
    return threshold_;
}

float TiltDetector::calculateMedian(std::vector<float>& values) const {
    if (values.empty()) {
        return 0.0f;
    }
    
    std::sort(values.begin(), values.end());
    size_t n = values.size();
    
    if (n % 2 == 0) {
        return (values[n/2 - 1] + values[n/2]) / 2.0f;
    } else {
        return values[n/2];
    }
}

} // namespace correctimage
