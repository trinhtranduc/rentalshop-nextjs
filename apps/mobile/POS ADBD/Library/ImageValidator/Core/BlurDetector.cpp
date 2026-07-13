#include "BlurDetector.h"

namespace correctimage {

BlurDetector::BlurDetector(float threshold)
    : threshold_(threshold) {}

BlurDetector::Result BlurDetector::detect(const cv::Mat& image) const {
    cv::Mat gray, laplacian;
    
    // Convert to grayscale if needed
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // Apply Laplacian operator
    cv::Laplacian(gray, laplacian, CV_64F);
    
    // Calculate variance (measure of sharpness)
    cv::Scalar mean, stddev;
    cv::meanStdDev(laplacian, mean, stddev);
    
    float variance = static_cast<float>(stddev.val[0] * stddev.val[0]);
    
    return {
        .is_blurry = variance < threshold_,
        .blur_score = variance,
        .threshold = threshold_
    };
}

void BlurDetector::setThreshold(float threshold) {
    threshold_ = threshold;
}

float BlurDetector::getThreshold() const {
    return threshold_;
}

} // namespace correctimage
