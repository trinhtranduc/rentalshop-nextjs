#ifndef SINGLE_PRODUCT_FOCUS_DETECTOR_H
#define SINGLE_PRODUCT_FOCUS_DETECTOR_H

#include <opencv2/opencv.hpp>

namespace correctimage {

class SingleProductFocusDetector {
public:
    struct Result {
        bool has_single_focus;        // Image has one main product
        bool has_multiple_products;   // Image has multiple distinct products
        int product_count;            // Estimated number of products
        float focus_score;            // 0-1, higher = better single focus
        float max_product_ratio;      // Ratio of largest product to image
    };
    
    SingleProductFocusDetector();
    
    Result detect(const cv::Mat& image) const;
    
private:
    // Detect all product regions in image
    std::vector<cv::Rect> detectProductRegions(const cv::Mat& image) const;
    
    // Calculate focus score based on product distribution
    float calculateFocusScore(const std::vector<cv::Rect>& products, const cv::Size& imageSize) const;
};

} // namespace correctimage

#endif // SINGLE_PRODUCT_FOCUS_DETECTOR_H
