#ifndef PRODUCT_VISIBILITY_DETECTOR_H
#define PRODUCT_VISIBILITY_DETECTOR_H

#include <opencv2/opencv.hpp>

namespace correctimage {

class ProductVisibilityDetector {
public:
    struct Result {
        bool is_visible;              // Product is clearly visible
        bool is_well_centered;        // Product is in center region
        bool has_good_coverage;       // Product covers 30-70% of frame
        float coverage_ratio;         // 0-1, product area / total area
        float center_score;           // 0-1, how centered the product is
        float min_coverage;           // Minimum coverage threshold (default 0.3)
        float max_coverage;           // Maximum coverage threshold (default 0.7)
    };
    
    ProductVisibilityDetector(float min_coverage = 0.3f, float max_coverage = 0.7f);
    
    Result detect(const cv::Mat& image) const;
    
    // Get product bounding box (for object detection/visualization)
    cv::Rect getProductBoundingBox(const cv::Mat& image) const;
    
    void setCoverageRange(float min_coverage, float max_coverage);
    float getMinCoverage() const;
    float getMaxCoverage() const;
    
private:
    float min_coverage_;
    float max_coverage_;
    
    // Detect main product using saliency or contour analysis
    cv::Rect detectMainProduct(const cv::Mat& image) const;
    
    // Calculate how centered the product is
    float calculateCenterScore(const cv::Rect& productRect, const cv::Size& imageSize) const;
    
    // Calculate coverage ratio
    float calculateCoverageRatio(const cv::Rect& productRect, const cv::Size& imageSize) const;
};

} // namespace correctimage

#endif // PRODUCT_VISIBILITY_DETECTOR_H
