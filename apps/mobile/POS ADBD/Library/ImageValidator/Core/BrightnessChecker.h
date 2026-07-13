#ifndef BRIGHTNESS_CHECKER_H
#define BRIGHTNESS_CHECKER_H

#include <opencv2/opencv.hpp>

namespace correctimage {

class BrightnessChecker {
public:
    struct Result {
        bool is_too_dark;
        bool is_too_bright;
        float brightness;      // 0-1, 0.3-0.7 is good
        float min_threshold;
        float max_threshold;
    };
    
    BrightnessChecker(float min_threshold = 0.25f, float max_threshold = 0.80f);
    
    Result detect(const cv::Mat& image) const;
    
    void setThresholds(float min_threshold, float max_threshold);
    float getMinThreshold() const;
    float getMaxThreshold() const;
    
private:
    float min_threshold_;
    float max_threshold_;
};

} // namespace correctimage

#endif // BRIGHTNESS_CHECKER_H
