#ifndef COLOR_ACCURACY_CHECKER_H
#define COLOR_ACCURACY_CHECKER_H

#include <opencv2/opencv.hpp>

namespace correctimage {

class ColorAccuracyChecker {
public:
    struct Result {
        bool has_good_white_balance;  // White balance is good
        bool has_color_cast;          // Image has color cast (yellow/red/blue tint)
        float white_balance_score;    // 0-1, higher = better white balance
        float color_cast_score;       // 0-1, higher = more color cast
        float saturation;             // 0-1, image saturation
        bool is_over_saturated;      // Image is too saturated
        float saturation_threshold;   // Threshold for oversaturation
    };
    
    ColorAccuracyChecker(float saturation_threshold = 0.8f);
    
    Result detect(const cv::Mat& image) const;
    
    void setSaturationThreshold(float threshold);
    float getSaturationThreshold() const;
    
private:
    float saturation_threshold_;
    
    // Check white balance using gray world assumption
    float checkWhiteBalance(const cv::Mat& image) const;
    
    // Detect color cast (yellow/red/blue tint)
    float detectColorCast(const cv::Mat& image) const;
    
    // Calculate average saturation
    float calculateSaturation(const cv::Mat& image) const;
};

} // namespace correctimage

#endif // COLOR_ACCURACY_CHECKER_H
