#ifndef MOTION_BLUR_DETECTOR_H
#define MOTION_BLUR_DETECTOR_H

#include <opencv2/opencv.hpp>

namespace correctimage {

class MotionBlurDetector {
public:
    struct Result {
        bool has_motion_blur;
        float motion_score;    // 0-1, <0.3 is good
        float direction;       // degrees if detected
        float threshold;
    };
    
    MotionBlurDetector(float threshold = 0.3f);
    
    Result detect(const cv::Mat& image) const;
    
    void setThreshold(float threshold);
    float getThreshold() const;
    
private:
    float threshold_;
    
    double calculateVariance(const cv::Mat& mat) const;
};

} // namespace correctimage

#endif // MOTION_BLUR_DETECTOR_H
