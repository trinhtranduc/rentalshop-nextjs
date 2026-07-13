#ifndef IMAGE_VALIDATOR_H
#define IMAGE_VALIDATOR_H

#include <opencv2/opencv.hpp>
#include <string>
#include <vector>
#include <memory>

#include "BlurDetector.h"
#include "MotionBlurDetector.h"
#include "TiltDetector.h"
#include "BrightnessChecker.h"
#include "ObstructionDetector.h"
#include "ProductVisibilityDetector.h"
#include "BackgroundConsistencyChecker.h"
#include "ColorAccuracyChecker.h"
#include "SingleProductFocusDetector.h"

namespace correctimage {

struct ValidationResult {
    bool is_valid;
    
    // Individual checks (basic quality)
    bool is_blurry;
    bool has_motion_blur;
    bool is_tilted;
    bool is_too_dark;
    bool is_too_bright;
    bool has_obstruction;
    
    // Embedding/similarity search checks
    bool product_not_visible;      // Product is not clearly visible
    bool background_too_cluttered; // Background is too complex
    bool has_color_cast;           // Image has color cast
    bool has_multiple_products;    // Multiple products in frame
    
    // Scores (for debugging/tuning)
    float blur_score;           // >100 is sharp
    float motion_score;         // <0.3 is good
    float tilt_angle;           // degrees
    float brightness;           // 0-1
    float obstruction_confidence; // 0-1
    
    // Embedding/similarity search scores
    float product_coverage;      // 0-1, product area / image area
    float product_center_score;  // 0-1, how centered the product is
    float background_consistency; // 0-1, higher = more consistent
    float white_balance_score;   // 0-1, higher = better white balance
    float color_cast_score;      // 0-1, higher = more color cast
    float saturation;           // 0-1, image saturation
    float single_focus_score;    // 0-1, higher = better single focus
    
    // Human-readable errors
    std::vector<std::string> errors;
};

class ImageValidator {
public:
    ImageValidator();
    ~ImageValidator();
    
    // Validate from different sources
    ValidationResult validate(const std::string& image_path);
    ValidationResult validate(const cv::Mat& image);
    ValidationResult validate(const uint8_t* data, size_t length);
    
    // Customize thresholds (basic quality)
    void setBlurThreshold(float threshold);
    void setMotionThreshold(float threshold);
    void setTiltThreshold(float threshold);
    void setBrightnessRange(float min, float max);
    void setObstructionThreshold(float threshold);
    
    // Customize thresholds (embedding/similarity search)
    void setProductCoverageRange(float min, float max);
    void setBackgroundClutterThreshold(float threshold);
    void setSaturationThreshold(float threshold);
    
    // Detect product center point (returns normalized coordinates 0-1, or (-1, -1) if not detected)
    cv::Point2f detectProductCenter(const cv::Mat& image);
    
private:
    std::unique_ptr<BlurDetector> blur_detector_;
    std::unique_ptr<MotionBlurDetector> motion_detector_;
    std::unique_ptr<TiltDetector> tilt_detector_;
    std::unique_ptr<BrightnessChecker> brightness_checker_;
    std::unique_ptr<ObstructionDetector> obstruction_detector_;
    
    // Embedding/similarity search detectors
    std::unique_ptr<ProductVisibilityDetector> product_visibility_detector_;
    std::unique_ptr<BackgroundConsistencyChecker> background_checker_;
    std::unique_ptr<ColorAccuracyChecker> color_checker_;
    std::unique_ptr<SingleProductFocusDetector> single_focus_detector_;
    
    ValidationResult validateInternal(const cv::Mat& image);
};

} // namespace correctimage

#endif // IMAGE_VALIDATOR_H
