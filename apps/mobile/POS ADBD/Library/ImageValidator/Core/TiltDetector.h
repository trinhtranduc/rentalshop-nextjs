#ifndef TILT_DETECTOR_H
#define TILT_DETECTOR_H

#include <opencv2/opencv.hpp>
#include <vector>

namespace correctimage {

class TiltDetector {
public:
    struct Result {
        bool is_tilted;
        float tilt_angle;      // degrees, 0 = perfect
        float threshold;
    };
    
    TiltDetector(float threshold = 30.0f);
    
    Result detect(const cv::Mat& image) const;
    
    void setThreshold(float threshold);
    float getThreshold() const;
    
private:
    float threshold_;
    
    float calculateMedian(std::vector<float>& values) const;
};

} // namespace correctimage

#endif // TILT_DETECTOR_H
