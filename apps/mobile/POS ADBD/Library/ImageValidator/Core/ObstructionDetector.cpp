#include "ObstructionDetector.h"
#include <algorithm>
#include <numeric>
#include <sstream>

namespace correctimage {

ObstructionDetector::ObstructionDetector(float threshold)
    : threshold_(threshold) {}

ObstructionDetector::Result ObstructionDetector::detect(const cv::Mat& image) const {
    // METHOD 1: Edge Density Analysis
    float edgeScore = analyzeEdgeDensity(image);
    
    // METHOD 2: Focus/Sharpness Gradient
    float focusScore = analyzeFocusGradient(image);
    
    // METHOD 3: Large Foreground Contours
    float contourScore = analyzeForegroundContours(image);
    
    // Combine scores with weights
    // Edge density and focus are more reliable, so higher weights
    float finalScore = edgeScore * 0.4f + focusScore * 0.4f + contourScore * 0.2f;
    
    bool hasObstruction = finalScore > threshold_;
    std::string reason = determineReason(edgeScore, focusScore, contourScore);
    
    return {
        .has_obstruction = hasObstruction,
        .confidence = finalScore,
        .reason = reason,
        .threshold = threshold_
    };
}

void ObstructionDetector::setThreshold(float threshold) {
    threshold_ = threshold;
}

float ObstructionDetector::getThreshold() const {
    return threshold_;
}

float ObstructionDetector::analyzeEdgeDensity(const cv::Mat& image) const {
    cv::Mat gray, edges;
    
    // Convert to grayscale
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // Apply Canny edge detection
    cv::Canny(gray, edges, 50, 150);
    
    // Divide image into 3x3 grid
    int h = image.rows / 3;
    int w = image.cols / 3;
    
    // Center region (where obstruction likely appears)
    cv::Rect centerRegion(w, h, w, h);
    int centerEdges = cv::countNonZero(edges(centerRegion));
    double centerDensity = static_cast<double>(centerEdges) / (w * h);
    
    // Calculate surrounding regions density
    std::vector<double> surroundingDensities;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (i == 1 && j == 1) continue; // Skip center
            
            int x = j * w;
            int y = i * h;
            int region_w = (j == 2) ? image.cols - x : w;
            int region_h = (i == 2) ? image.rows - y : h;
            
            cv::Rect region(x, y, region_w, region_h);
            int edges_count = cv::countNonZero(edges(region));
            double density = static_cast<double>(edges_count) / (region_w * region_h);
            surroundingDensities.push_back(density);
        }
    }
    
    double avgSurrounding = calculateMean(surroundingDensities);
    
    // If center has significantly higher edge density than surrounding
    // it indicates a foreground obstruction
    float ratio = static_cast<float>(centerDensity / (avgSurrounding + 1e-6));
    
    // Normalize score to 0-1 range
    float score = std::min(1.0f, std::max(0.0f, (ratio - 1.0f) / 2.0f));
    
    return score;
}

float ObstructionDetector::analyzeFocusGradient(const cv::Mat& image) const {
    // Calculate sharpness for multiple regions
    std::vector<double> sharpnessScores;
    
    int h = image.rows / 3;
    int w = image.cols / 3;
    
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            int x = j * w;
            int y = i * h;
            int region_w = (j == 2) ? image.cols - x : w;
            int region_h = (i == 2) ? image.rows - y : h;
            
            cv::Rect region(x, y, region_w, region_h);
            double sharpness = calculateLaplacianVariance(image(region));
            sharpnessScores.push_back(sharpness);
        }
    }
    
    // Center region sharpness (index 4 in 3x3 grid)
    double centerSharpness = sharpnessScores[4];
    double avgSharpness = calculateMean(sharpnessScores);
    
    // If center is significantly sharper than average,
    // it indicates a foreground object (in-focus) blocking the background shelf (out-of-focus)
    float ratio = static_cast<float>(centerSharpness / (avgSharpness + 1e-6));
    
    // Normalize score
    float score = std::min(1.0f, std::max(0.0f, (ratio - 1.0f) / 1.5f));
    
    return score;
}

float ObstructionDetector::analyzeForegroundContours(const cv::Mat& image) const {
    cv::Mat gray, binary;
    
    // Convert to grayscale
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    // Adaptive threshold to separate foreground
    cv::adaptiveThreshold(gray, binary, 255,
        cv::ADAPTIVE_THRESH_GAUSSIAN_C,
        cv::THRESH_BINARY, 11, 2);
    
    // Find contours
    std::vector<std::vector<cv::Point>> contours;
    cv::findContours(binary, contours,
        cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);
    
    // Check for large contours in center region
    int centerX = image.cols / 2;
    int centerY = image.rows / 2;
    double imageArea = image.rows * image.cols;
    
    for (const auto& contour : contours) {
        double area = cv::contourArea(contour);
        
        // Large contour (>5% of image area)
        if (area > imageArea * 0.05) {
            cv::Rect bbox = cv::boundingRect(contour);
            
            // Check if contour overlaps center region
            if (bbox.contains(cv::Point(centerX, centerY))) {
                return 1.0f; // High confidence obstruction
            }
        }
    }
    
    return 0.0f;
}

double ObstructionDetector::calculateLaplacianVariance(const cv::Mat& image) const {
    cv::Mat gray, laplacian;
    
    if (image.channels() == 3 || image.channels() == 4) {
        cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
    } else {
        gray = image.clone();
    }
    
    cv::Laplacian(gray, laplacian, CV_64F);
    
    cv::Scalar mean, stddev;
    cv::meanStdDev(laplacian, mean, stddev);
    
    return stddev.val[0] * stddev.val[0];
}

double ObstructionDetector::calculateMean(const std::vector<double>& values) const {
    if (values.empty()) {
        return 0.0;
    }
    
    double sum = std::accumulate(values.begin(), values.end(), 0.0);
    return sum / values.size();
}

std::string ObstructionDetector::determineReason(float edgeScore, float focusScore, float contourScore) const {
    std::ostringstream oss;
    
    if (contourScore > 0.5f) {
        oss << "Large foreground object detected";
    } else if (edgeScore > 0.5f && focusScore > 0.5f) {
        oss << "High edge density and sharp foreground";
    } else if (edgeScore > 0.5f) {
        oss << "High edge density in center";
    } else if (focusScore > 0.5f) {
        oss << "Sharp foreground object";
    } else {
        oss << "Combined low scores";
    }
    
    oss << " (edge:" << edgeScore << " focus:" << focusScore << " contour:" << contourScore << ")";
    
    return oss.str();
}

} // namespace correctimage
