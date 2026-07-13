#ifndef OBSTRUCTION_DETECTOR_H
#define OBSTRUCTION_DETECTOR_H

#include <opencv2/opencv.hpp>
#include <string>
#include <vector>

namespace correctimage {

class ObstructionDetector {
public:
    struct Result {
        bool has_obstruction;
        float confidence;      // 0-1
        std::string reason;    // debug info
        float threshold;
    };
    
    ObstructionDetector(float threshold = 0.5f);
    
    Result detect(const cv::Mat& image) const;
    
    void setThreshold(float threshold);
    float getThreshold() const;
    
private:
    float threshold_;
    
    // Three detection methods
    float analyzeEdgeDensity(const cv::Mat& image) const;
    float analyzeFocusGradient(const cv::Mat& image) const;
    float analyzeForegroundContours(const cv::Mat& image) const;
    
    // Helper functions
    double calculateLaplacianVariance(const cv::Mat& image) const;
    double calculateMean(const std::vector<double>& values) const;
    std::string determineReason(float edgeScore, float focusScore, float contourScore) const;
};

} // namespace correctimage

#endif // OBSTRUCTION_DETECTOR_H
