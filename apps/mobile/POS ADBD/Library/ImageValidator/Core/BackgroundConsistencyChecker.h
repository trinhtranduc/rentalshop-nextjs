#ifndef BACKGROUND_CONSISTENCY_CHECKER_H
#define BACKGROUND_CONSISTENCY_CHECKER_H

#include <opencv2/opencv.hpp>

namespace correctimage {

class BackgroundConsistencyChecker {
public:
    struct Result {
        bool is_consistent;           // Background is simple and consistent
        bool is_too_cluttered;       // Background has too many objects
        float edge_density;          // Edge density in background regions (0-1)
        float color_variance;        // Color variance in background (0-1)
        float consistency_score;    // Overall consistency score (0-1, higher = better)
        float clutter_threshold;     // Threshold for clutter detection
    };
    
    BackgroundConsistencyChecker(float clutter_threshold = 0.4f);
    
    Result detect(const cv::Mat& image) const;
    
    void setClutterThreshold(float threshold);
    float getClutterThreshold() const;
    
private:
    float clutter_threshold_;
    
    // Analyze edge density in background regions
    float analyzeBackgroundEdgeDensity(const cv::Mat& image) const;
    
    // Analyze color variance in background
    float analyzeBackgroundColorVariance(const cv::Mat& image) const;
    
    // Get background regions (perimeter areas)
    std::vector<cv::Rect> getBackgroundRegions(const cv::Size& imageSize) const;
};

} // namespace correctimage

#endif // BACKGROUND_CONSISTENCY_CHECKER_H
