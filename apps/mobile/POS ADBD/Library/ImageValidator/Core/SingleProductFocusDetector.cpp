#include "SingleProductFocusDetector.h"
#include <algorithm>
#include <cmath>

namespace correctimage {

SingleProductFocusDetector::SingleProductFocusDetector() {}

SingleProductFocusDetector::Result SingleProductFocusDetector::detect(const cv::Mat& image) const {
    if (image.empty()) {
        return {
            .has_single_focus = false,
            .has_multiple_products = true,
            .product_count = 0,
            .focus_score = 0.0f,
            .max_product_ratio = 0.0f
        };
    }
    
    // Detect all product regions
    std::vector<cv::Rect> products = detectProductRegions(image);
    
    // Calculate metrics
    float focusScore = calculateFocusScore(products, image.size());
    
    // Find largest product
    float maxProductRatio = 0.0f;
    float imageArea = image.rows * image.cols;
    for (const auto& product : products) {
        float ratio = (product.width * product.height) / imageArea;
        if (ratio > maxProductRatio) {
            maxProductRatio = ratio;
        }
    }
    
    // Determine results
    int productCount = static_cast<int>(products.size());
    bool hasMultipleProducts = productCount > 1;
    
    // Single focus: one main product that dominates (>50% of image)
    // or one product that is much larger than others
    bool hasSingleFocus = false;
    if (productCount == 1) {
        hasSingleFocus = maxProductRatio > 0.2f; // At least 20% of image
    } else if (productCount > 1) {
        // Check if largest product is significantly larger than others
        std::vector<float> areas;
        for (const auto& product : products) {
            areas.push_back(product.width * product.height);
        }
        std::sort(areas.rbegin(), areas.rend()); // Sort descending
        
        if (areas.size() >= 2) {
            float largestRatio = areas[0] / imageArea;
            float secondRatio = areas[1] / imageArea;
            
            // Largest product should be >50% of image AND >2x larger than second
            hasSingleFocus = (largestRatio > 0.5f) && (areas[0] > areas[1] * 2.0f);
        }
    }
    
    return {
        .has_single_focus = hasSingleFocus,
        .has_multiple_products = hasMultipleProducts,
        .product_count = productCount,
        .focus_score = focusScore,
        .max_product_ratio = maxProductRatio
    };
}

std::vector<cv::Rect> SingleProductFocusDetector::detectProductRegions(const cv::Mat& image) const {
    cv::Mat gray;
    
    // Convert to grayscale
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // Apply adaptive threshold to separate foreground objects
    cv::Mat binary;
    cv::adaptiveThreshold(gray, binary, 255,
        cv::ADAPTIVE_THRESH_GAUSSIAN_C,
        cv::THRESH_BINARY_INV, 11, 2);
    
    // Morphological operations to clean up
    cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(5, 5));
    cv::morphologyEx(binary, binary, cv::MORPH_CLOSE, kernel);
    cv::morphologyEx(binary, binary, cv::MORPH_OPEN, kernel);
    
    // Find contours
    std::vector<std::vector<cv::Point>> contours;
    std::vector<cv::Vec4i> hierarchy;
    cv::findContours(binary, contours, hierarchy,
        cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);
    
    std::vector<cv::Rect> products;
    float imageArea = image.rows * image.cols;
    float minProductArea = imageArea * 0.05f; // At least 5% of image
    
    for (const auto& contour : contours) {
        double area = cv::contourArea(contour);
        if (area > minProductArea) {
            cv::Rect bbox = cv::boundingRect(contour);
            products.push_back(bbox);
        }
    }
    
    // If no products found, try edge-based detection
    if (products.empty()) {
        cv::Mat edges;
        cv::Canny(gray, edges, 50, 150);
        
        // Find dense edge regions
        int blockSize = 64;
        cv::Mat edgeDensity;
        cv::Mat kernel = cv::Mat::ones(blockSize, blockSize, CV_32F) / (blockSize * blockSize);
        cv::filter2D(edges, edgeDensity, CV_32F, kernel);
        
        // Threshold to find high-density regions
        cv::Mat thresh;
        double maxVal;
        cv::minMaxLoc(edgeDensity, nullptr, &maxVal);
        cv::threshold(edgeDensity, thresh, maxVal * 0.5, 255, cv::THRESH_BINARY);
        thresh.convertTo(thresh, CV_8U);
        
        // Find contours in thresholded image
        std::vector<std::vector<cv::Point>> edgeContours;
        cv::findContours(thresh, edgeContours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);
        
        for (const auto& contour : edgeContours) {
            double area = cv::contourArea(contour);
            if (area > minProductArea) {
                cv::Rect bbox = cv::boundingRect(contour);
                products.push_back(bbox);
            }
        }
    }
    
    return products;
}

float SingleProductFocusDetector::calculateFocusScore(const std::vector<cv::Rect>& products, const cv::Size& imageSize) const {
    if (products.empty()) {
        return 0.0f;
    }
    
    float imageArea = imageSize.width * imageSize.height;
    
    // Calculate area ratios
    std::vector<float> ratios;
    for (const auto& product : products) {
        float ratio = (product.width * product.height) / imageArea;
        ratios.push_back(ratio);
    }
    
    // Sort descending
    std::sort(ratios.rbegin(), ratios.rend());
    
    if (ratios.empty()) {
        return 0.0f;
    }
    
    // Focus score based on:
    // 1. Largest product should be significant (>30% of image)
    // 2. If multiple products, largest should dominate
    float largestRatio = ratios[0];
    
    if (ratios.size() == 1) {
        // Single product: score based on size
        return std::min(1.0f, largestRatio * 2.0f); // 50% coverage = 1.0 score
    } else {
        // Multiple products: score based on dominance
        float secondRatio = ratios.size() > 1 ? ratios[1] : 0.0f;
        float dominance = largestRatio / (largestRatio + secondRatio + 1e-6f);
        
        // Combine size and dominance
        float sizeScore = std::min(1.0f, largestRatio * 2.0f);
        return (sizeScore + dominance) / 2.0f;
    }
}

} // namespace correctimage
