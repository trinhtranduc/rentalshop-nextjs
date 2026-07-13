#include "BackgroundConsistencyChecker.h"
#include <algorithm>
#include <numeric>
#include <cmath>

namespace correctimage {

BackgroundConsistencyChecker::BackgroundConsistencyChecker(float clutter_threshold)
    : clutter_threshold_(clutter_threshold) {}

BackgroundConsistencyChecker::Result BackgroundConsistencyChecker::detect(const cv::Mat& image) const {
    if (image.empty()) {
        return {
            .is_consistent = false,
            .is_too_cluttered = true,
            .edge_density = 1.0f,
            .color_variance = 1.0f,
            .consistency_score = 0.0f,
            .clutter_threshold = clutter_threshold_
        };
    }
    
    // Analyze background regions (perimeter areas)
    float edgeDensity = analyzeBackgroundEdgeDensity(image);
    float colorVariance = analyzeBackgroundColorVariance(image);
    
    // Combine scores: lower is better for both
    // Consistency score: 1.0 = perfect, 0.0 = very cluttered
    float consistencyScore = 1.0f - std::max(edgeDensity, colorVariance);
    
    bool isTooCluttered = (edgeDensity > clutter_threshold_) || (colorVariance > clutter_threshold_);
    bool isConsistent = consistencyScore > (1.0f - clutter_threshold_);
    
    return {
        .is_consistent = isConsistent,
        .is_too_cluttered = isTooCluttered,
        .edge_density = edgeDensity,
        .color_variance = colorVariance,
        .consistency_score = consistencyScore,
        .clutter_threshold = clutter_threshold_
    };
}

std::vector<cv::Rect> BackgroundConsistencyChecker::getBackgroundRegions(const cv::Size& imageSize) const {
    std::vector<cv::Rect> regions;
    
    // Define background regions as perimeter areas (top, bottom, left, right)
    // These are typically where background appears in product photos
    
    int borderWidth = imageSize.width / 8;   // 12.5% border
    int borderHeight = imageSize.height / 8;  // 12.5% border
    
    // Top region
    regions.push_back(cv::Rect(0, 0, imageSize.width, borderHeight));
    
    // Bottom region
    regions.push_back(cv::Rect(0, imageSize.height - borderHeight, 
                              imageSize.width, borderHeight));
    
    // Left region
    regions.push_back(cv::Rect(0, borderHeight, borderWidth, 
                             imageSize.height - 2 * borderHeight));
    
    // Right region
    regions.push_back(cv::Rect(imageSize.width - borderWidth, borderHeight,
                              borderWidth, imageSize.height - 2 * borderHeight));
    
    return regions;
}

float BackgroundConsistencyChecker::analyzeBackgroundEdgeDensity(const cv::Mat& image) const {
    cv::Mat gray, edges;
    
    // Convert to grayscale
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // Apply Canny edge detection
    cv::Canny(gray, edges, 50, 150);
    
    // Get background regions
    std::vector<cv::Rect> bgRegions = getBackgroundRegions(image.size());
    
    // Calculate edge density for each background region
    std::vector<float> densities;
    for (const auto& region : bgRegions) {
        // Ensure region is within image bounds
        cv::Rect validRegion = region & cv::Rect(0, 0, image.cols, image.rows);
        if (validRegion.area() > 0) {
            cv::Mat regionEdges = edges(validRegion);
            int edgePixels = cv::countNonZero(regionEdges);
            float density = static_cast<float>(edgePixels) / validRegion.area();
            densities.push_back(density);
        }
    }
    
    if (densities.empty()) {
        return 0.0f;
    }
    
    // Return average edge density
    float sum = std::accumulate(densities.begin(), densities.end(), 0.0f);
    return sum / densities.size();
}

float BackgroundConsistencyChecker::analyzeBackgroundColorVariance(const cv::Mat& image) const {
    // Get background regions
    std::vector<cv::Rect> bgRegions = getBackgroundRegions(image.size());
    
    if (bgRegions.empty()) {
        return 0.0f;
    }
    
    // Calculate color variance for each background region
    std::vector<float> variances;
    
    for (const auto& region : bgRegions) {
        // Ensure region is within image bounds
        cv::Rect validRegion = region & cv::Rect(0, 0, image.cols, image.rows);
        if (validRegion.area() == 0) {
            continue;
        }
        
        cv::Mat regionImage = image(validRegion);
        
        // Convert to LAB color space for better perceptual uniformity
        cv::Mat lab;
        if (regionImage.channels() == 3 || regionImage.channels() == 4) {
            cv::cvtColor(regionImage, lab, cv::COLOR_BGR2Lab);
        } else {
            cv::cvtColor(regionImage, lab, cv::COLOR_GRAY2BGR);
            cv::cvtColor(lab, lab, cv::COLOR_BGR2Lab);
        }
        
        // Calculate standard deviation for each channel
        std::vector<cv::Mat> channels;
        cv::split(lab, channels);
        
        float totalVariance = 0.0f;
        for (const auto& channel : channels) {
            cv::Scalar mean, stddev;
            cv::meanStdDev(channel, mean, stddev);
            // Normalize by 255 (max value in LAB)
            float variance = static_cast<float>(stddev.val[0] / 255.0);
            totalVariance += variance;
        }
        
        // Average variance across channels
        variances.push_back(totalVariance / channels.size());
    }
    
    if (variances.empty()) {
        return 0.0f;
    }
    
    // Return average variance across all background regions
    float sum = std::accumulate(variances.begin(), variances.end(), 0.0f);
    return sum / variances.size();
}

void BackgroundConsistencyChecker::setClutterThreshold(float threshold) {
    clutter_threshold_ = threshold;
}

float BackgroundConsistencyChecker::getClutterThreshold() const {
    return clutter_threshold_;
}

} // namespace correctimage
