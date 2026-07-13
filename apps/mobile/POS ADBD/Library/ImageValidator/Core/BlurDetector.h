#ifndef BLUR_DETECTOR_H
#define BLUR_DETECTOR_H

#include <opencv2/opencv.hpp>

namespace correctimage {

class BlurDetector {
public:
    struct Result {
        bool is_blurry;
        float blur_score;      // Laplacian variance, >100 is sharp
        float threshold;
    };
    
    BlurDetector(float threshold = 100.0f);
    
    Result detect(const cv::Mat& image) const;
    
    void setThreshold(float threshold);
    float getThreshold() const;
    
private:
    float threshold_;
};

} // namespace correctimage

#endif // BLUR_DETECTOR_H
