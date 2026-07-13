#include "ImageValidator.h"

namespace correctimage {

ImageValidator::ImageValidator() {
    // Initialize all detectors with default thresholds
    blur_detector_ = std::make_unique<BlurDetector>(100.0f);
    motion_detector_ = std::make_unique<MotionBlurDetector>(0.3f);
    tilt_detector_ = std::make_unique<TiltDetector>(30.0f);
    brightness_checker_ = std::make_unique<BrightnessChecker>(0.25f, 0.80f);
    obstruction_detector_ = std::make_unique<ObstructionDetector>(0.5f);
    
    // Initialize embedding/similarity search detectors
    product_visibility_detector_ = std::make_unique<ProductVisibilityDetector>(0.3f, 0.7f);
    background_checker_ = std::make_unique<BackgroundConsistencyChecker>(0.4f);
    color_checker_ = std::make_unique<ColorAccuracyChecker>(0.8f);
    single_focus_detector_ = std::make_unique<SingleProductFocusDetector>();
}

ImageValidator::~ImageValidator() = default;

cv::Point2f ImageValidator::detectProductCenter(const cv::Mat& image) {
    if (image.empty()) {
        return cv::Point2f(-1.0f, -1.0f);
    }
    
    // Get product bounding box
    cv::Rect productRect = product_visibility_detector_->getProductBoundingBox(image);
    
    // Check if product was detected (valid bounding box)
    if (productRect.width <= 0 || productRect.height <= 0) {
        return cv::Point2f(-1.0f, -1.0f);
    }
    
    // Calculate center of bounding box
    float productCenterX = productRect.x + productRect.width / 2.0f;
    float productCenterY = productRect.y + productRect.height / 2.0f;
    
    // Normalize to 0-1 range
    float normalizedX = productCenterX / image.cols;
    float normalizedY = productCenterY / image.rows;
    
    return cv::Point2f(normalizedX, normalizedY);
}

ValidationResult ImageValidator::validate(const std::string& image_path) {
    cv::Mat image = cv::imread(image_path, cv::IMREAD_COLOR);
    
    if (image.empty()) {
        ValidationResult result;
        result.is_valid = false;
        result.errors.push_back("Failed to load image from path: " + image_path);
        return result;
    }
    
    return validateInternal(image);
}

ValidationResult ImageValidator::validate(const cv::Mat& image) {
    if (image.empty()) {
        ValidationResult result;
        result.is_valid = false;
        result.errors.push_back("Empty image provided");
        return result;
    }
    
    return validateInternal(image);
}

ValidationResult ImageValidator::validate(const uint8_t* data, size_t length) {
    std::vector<uint8_t> buffer(data, data + length);
    cv::Mat image = cv::imdecode(buffer, cv::IMREAD_COLOR);
    
    if (image.empty()) {
        ValidationResult result;
        result.is_valid = false;
        result.errors.push_back("Failed to decode image from bytes");
        return result;
    }
    
    return validateInternal(image);
}

void ImageValidator::setBlurThreshold(float threshold) {
    blur_detector_->setThreshold(threshold);
}

void ImageValidator::setMotionThreshold(float threshold) {
    motion_detector_->setThreshold(threshold);
}

void ImageValidator::setTiltThreshold(float threshold) {
    tilt_detector_->setThreshold(threshold);
}

void ImageValidator::setBrightnessRange(float min, float max) {
    brightness_checker_->setThresholds(min, max);
}

void ImageValidator::setObstructionThreshold(float threshold) {
    obstruction_detector_->setThreshold(threshold);
}

void ImageValidator::setProductCoverageRange(float min, float max) {
    product_visibility_detector_->setCoverageRange(min, max);
}

void ImageValidator::setBackgroundClutterThreshold(float threshold) {
    background_checker_->setClutterThreshold(threshold);
}

void ImageValidator::setSaturationThreshold(float threshold) {
    color_checker_->setSaturationThreshold(threshold);
}

ValidationResult ImageValidator::validateInternal(const cv::Mat& image) {
    ValidationResult result;
    result.errors.clear();
    
    // 1. Blur Detection
    auto blurResult = blur_detector_->detect(image);
    result.is_blurry = blurResult.is_blurry;
    result.blur_score = blurResult.blur_score;
    
    if (result.is_blurry) {
        result.errors.push_back("Image is blurry (score: " + 
            std::to_string(blurResult.blur_score) + ", threshold: " + 
            std::to_string(blurResult.threshold) + ")");
    }
    
    // 2. Motion Blur Detection
    auto motionResult = motion_detector_->detect(image);
    result.has_motion_blur = motionResult.has_motion_blur;
    result.motion_score = motionResult.motion_score;
    
    if (result.has_motion_blur) {
        result.errors.push_back("Image has motion blur (score: " + 
            std::to_string(motionResult.motion_score) + ", direction: " + 
            std::to_string(motionResult.direction) + "°)");
    }
    
    // 3. Tilt Detection
    auto tiltResult = tilt_detector_->detect(image);
    result.is_tilted = tiltResult.is_tilted;
    result.tilt_angle = tiltResult.tilt_angle;
    
    if (result.is_tilted) {
        result.errors.push_back("Image is tilted (angle: " + 
            std::to_string(tiltResult.tilt_angle) + "°, max: " + 
            std::to_string(tiltResult.threshold) + "°)");
    }
    
    // 4. Brightness Check
    auto brightnessResult = brightness_checker_->detect(image);
    result.is_too_dark = brightnessResult.is_too_dark;
    result.is_too_bright = brightnessResult.is_too_bright;
    result.brightness = brightnessResult.brightness;
    
    if (result.is_too_dark) {
        result.errors.push_back("Image is too dark (brightness: " + 
            std::to_string(brightnessResult.brightness) + ", min: " + 
            std::to_string(brightnessResult.min_threshold) + ")");
    }
    
    if (result.is_too_bright) {
        result.errors.push_back("Image is too bright (brightness: " + 
            std::to_string(brightnessResult.brightness) + ", max: " + 
            std::to_string(brightnessResult.max_threshold) + ")");
    }
    
    // 5. Obstruction Detection
    auto obstructionResult = obstruction_detector_->detect(image);
    result.has_obstruction = obstructionResult.has_obstruction;
    result.obstruction_confidence = obstructionResult.confidence;
    
    if (result.has_obstruction) {
        result.errors.push_back("Obstruction detected: " + obstructionResult.reason);
    }
    
    // 6. Product Visibility Detection (for embedding/similarity)
    auto visibilityResult = product_visibility_detector_->detect(image);
    result.product_not_visible = !visibilityResult.is_visible;
    result.product_coverage = visibilityResult.coverage_ratio;
    result.product_center_score = visibilityResult.center_score;
    
    if (result.product_not_visible) {
        if (!visibilityResult.has_good_coverage) {
            result.errors.push_back("Product coverage not optimal (" + 
                std::to_string(visibilityResult.coverage_ratio * 100) + "%, should be " +
                std::to_string(visibilityResult.min_coverage * 100) + "-" +
                std::to_string(visibilityResult.max_coverage * 100) + "%)");
        }
        if (!visibilityResult.is_well_centered) {
            result.errors.push_back("Product is not well centered (score: " +
                std::to_string(visibilityResult.center_score) + ")");
        }
    }
    
    // 7. Background Consistency Check (for embedding/similarity)
    auto backgroundResult = background_checker_->detect(image);
    result.background_too_cluttered = backgroundResult.is_too_cluttered;
    result.background_consistency = backgroundResult.consistency_score;
    
    if (result.background_too_cluttered) {
        result.errors.push_back("Background is too cluttered (consistency: " +
            std::to_string(backgroundResult.consistency_score) + ", edge density: " +
            std::to_string(backgroundResult.edge_density) + ")");
    }
    
    // 8. Color Accuracy Check (for embedding/similarity)
    auto colorResult = color_checker_->detect(image);
    result.has_color_cast = colorResult.has_color_cast;
    result.white_balance_score = colorResult.white_balance_score;
    result.color_cast_score = colorResult.color_cast_score;
    result.saturation = colorResult.saturation;
    
    if (colorResult.has_color_cast) {
        result.errors.push_back("Image has color cast (score: " +
            std::to_string(colorResult.color_cast_score) + ")");
    }
    if (!colorResult.has_good_white_balance) {
        result.errors.push_back("White balance is poor (score: " +
            std::to_string(colorResult.white_balance_score) + ")");
    }
    if (colorResult.is_over_saturated) {
        result.errors.push_back("Image is over-saturated (" +
            std::to_string(colorResult.saturation * 100) + "%)");
    }
    
    // 9. Single Product Focus Check (for embedding/similarity)
    auto focusResult = single_focus_detector_->detect(image);
    result.has_multiple_products = focusResult.has_multiple_products;
    result.single_focus_score = focusResult.focus_score;
    
    if (result.has_multiple_products && !focusResult.has_single_focus) {
        result.errors.push_back("Multiple products detected (" +
            std::to_string(focusResult.product_count) + " products, focus score: " +
            std::to_string(focusResult.focus_score) + ")");
    }
    
    // Determine overall validity (include embedding/similarity checks)
    result.is_valid = !result.is_blurry && 
                     !result.has_motion_blur && 
                     !result.is_tilted && 
                     !result.is_too_dark && 
                     !result.is_too_bright && 
                     !result.has_obstruction &&
                     !result.product_not_visible &&
                     !result.background_too_cluttered &&
                     !result.has_color_cast &&
                     (!result.has_multiple_products || focusResult.has_single_focus);
    
    if (result.is_valid) {
        result.errors.push_back("Image passed all quality checks (including embedding/similarity criteria)");
    }
    
    return result;
}

} // namespace correctimage
