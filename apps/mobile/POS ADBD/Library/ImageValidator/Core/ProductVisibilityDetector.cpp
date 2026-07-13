#include "ProductVisibilityDetector.h"
#include <algorithm>
#include <cmath>

namespace correctimage {

ProductVisibilityDetector::ProductVisibilityDetector(float min_coverage, float max_coverage)
    : min_coverage_(min_coverage), max_coverage_(max_coverage) {}

ProductVisibilityDetector::Result ProductVisibilityDetector::detect(const cv::Mat& image) const {
    if (image.empty()) {
        return {
            .is_visible = false,
            .is_well_centered = false,
            .has_good_coverage = false,
            .coverage_ratio = 0.0f,
            .center_score = 0.0f,
            .min_coverage = min_coverage_,
            .max_coverage = max_coverage_
        };
    }
    
    // Detect main product region
    cv::Rect productRect = detectMainProduct(image);
    
    // Calculate metrics
    float coverage = calculateCoverageRatio(productRect, image.size());
    float centerScore = calculateCenterScore(productRect, image.size());
    
    // Determine results
    bool hasGoodCoverage = (coverage >= min_coverage_ && coverage <= max_coverage_);
    bool isWellCentered = centerScore >= 0.6f; // At least 60% centered
    bool isVisible = hasGoodCoverage && isWellCentered && coverage > 0.1f; // At least 10% coverage
    
    return {
        .is_visible = isVisible,
        .is_well_centered = isWellCentered,
        .has_good_coverage = hasGoodCoverage,
        .coverage_ratio = coverage,
        .center_score = centerScore,
        .min_coverage = min_coverage_,
        .max_coverage = max_coverage_
    };
}

cv::Rect ProductVisibilityDetector::detectMainProduct(const cv::Mat& image) const {
    cv::Mat gray;
    
    // Convert to grayscale
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // METHOD 1: Use Saliency Detection (if available in OpenCV)
    // For now, we'll use contour-based approach
    
    // METHOD 2: Contour-based detection
    // Apply adaptive threshold to separate foreground
    cv::Mat binary;
    cv::adaptiveThreshold(gray, binary, 255,
        cv::ADAPTIVE_THRESH_GAUSSIAN_C,
        cv::THRESH_BINARY_INV, 11, 2);
    
    // Find contours
    std::vector<std::vector<cv::Point>> contours;
    std::vector<cv::Vec4i> hierarchy;
    cv::findContours(binary, contours, hierarchy,
        cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);
    
    if (contours.empty()) {
        // Fallback: assume product is in center region
        int centerX = image.cols / 2;
        int centerY = image.rows / 2;
        int w = image.cols * 0.6f;
        int h = image.rows * 0.6f;
        return cv::Rect(centerX - w/2, centerY - h/2, w, h);
    }
    
    // Find largest contour (likely the main product)
    double maxArea = 0;
    int maxIdx = -1;
    for (size_t i = 0; i < contours.size(); i++) {
        double area = cv::contourArea(contours[i]);
        if (area > maxArea) {
            maxArea = area;
            maxIdx = static_cast<int>(i);
        }
    }
    
    if (maxIdx >= 0 && maxArea > image.rows * image.cols * 0.05) { // At least 5% of image
        return cv::boundingRect(contours[maxIdx]);
    }
    
    // METHOD 3: Edge-based detection (fallback)
    cv::Mat edges;
    cv::Canny(gray, edges, 50, 150);
    
    // Find dense edge regions (likely product)
    int blockSize = 32;
    cv::Mat edgeDensity;
    cv::Mat kernel = cv::Mat::ones(blockSize, blockSize, CV_32F) / (blockSize * blockSize);
    cv::filter2D(edges, edgeDensity, CV_32F, kernel);
    
    // Find region with highest edge density
    cv::Point maxLoc;
    double maxVal;
    cv::minMaxLoc(edgeDensity, nullptr, &maxVal, nullptr, &maxLoc);
    
    // Create bounding box around high density region
    int w = image.cols * 0.5f;
    int h = image.rows * 0.5f;
    int x = std::max(0, maxLoc.x - w/2);
    int y = std::max(0, maxLoc.y - h/2);
    x = std::min(x, image.cols - w);
    y = std::min(y, image.rows - h);
    
    return cv::Rect(x, y, w, h);
}

float ProductVisibilityDetector::calculateCenterScore(const cv::Rect& productRect, const cv::Size& imageSize) const {
    // Calculate center of product
    float productCenterX = productRect.x + productRect.width / 2.0f;
    float productCenterY = productRect.y + productRect.height / 2.0f;
    
    // Calculate center of image
    float imageCenterX = imageSize.width / 2.0f;
    float imageCenterY = imageSize.height / 2.0f;
    
    // Calculate distance from image center
    float dx = productCenterX - imageCenterX;
    float dy = productCenterY - imageCenterY;
    float distance = std::sqrt(dx * dx + dy * dy);
    
    // Normalize by image diagonal
    float maxDistance = std::sqrt(imageSize.width * imageSize.width + 
                                  imageSize.height * imageSize.height) / 2.0f;
    
    // Score: 1.0 = perfectly centered, 0.0 = at edge
    float score = 1.0f - (distance / (maxDistance + 1e-6f));
    return std::max(0.0f, std::min(1.0f, score));
}

float ProductVisibilityDetector::calculateCoverageRatio(const cv::Rect& productRect, const cv::Size& imageSize) const {
    float productArea = productRect.width * productRect.height;
    float imageArea = imageSize.width * imageSize.height;
    
    if (imageArea < 1e-6) {
        return 0.0f;
    }
    
    return productArea / imageArea;
}

cv::Rect ProductVisibilityDetector::getProductBoundingBox(const cv::Mat& image) const {
    return detectMainProduct(image);
}

void ProductVisibilityDetector::setCoverageRange(float min_coverage, float max_coverage) {
    min_coverage_ = min_coverage;
    max_coverage_ = max_coverage;
}

float ProductVisibilityDetector::getMinCoverage() const {
    return min_coverage_;
}

float ProductVisibilityDetector::getMaxCoverage() const {
    return max_coverage_;
}

} // namespace correctimage
