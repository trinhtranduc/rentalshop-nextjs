//
//  CIImageValidator.mm
//  Objective-C++ implementation
//

// IMPORTANT: Include OpenCV headers BEFORE Foundation/Objective-C headers
// to avoid macro conflicts (e.g., Apple's NO macro vs OpenCV's enum NO)
// Include Objective-C headers first (they need Foundation/UIKit)
#import "CIImageValidator.h"

// Undefine Apple's NO macro before including OpenCV headers that use NO in enums
#ifdef NO
#undef NO
#endif

// Now include OpenCV headers
#import <opencv2/opencv.hpp>
#import <opencv2/imgcodecs/ios.h>

#import "ImageValidator.h"

using namespace correctimage;

@implementation CIValidationResult
@end

@interface CIImageValidator() {
    std::unique_ptr<ImageValidator> validator_;
}
@end

@implementation CIImageValidator

- (instancetype)init {
    self = [super init];
    if (self) {
        validator_ = std::make_unique<ImageValidator>();
    }
    return self;
}

- (CIValidationResult *)validateImageAtPath:(NSString *)path {
    std::string imagePath = [path UTF8String];
    ValidationResult result = validator_->validate(imagePath);
    return [self convertResult:result];
}

- (CIValidationResult *)validateImage:(UIImage *)image {
    // Convert UIImage to cv::Mat
    cv::Mat mat;
    UIImageToMat(image, mat);
    
    // Validate
    ValidationResult result = validator_->validate(mat);
    return [self convertResult:result];
}

- (void)setBlurThreshold:(float)threshold {
    validator_->setBlurThreshold(threshold);
}

- (void)setMotionThreshold:(float)threshold {
    validator_->setMotionThreshold(threshold);
}

- (void)setTiltThreshold:(float)threshold {
    validator_->setTiltThreshold(threshold);
}

- (void)setBrightnessMin:(float)min max:(float)max {
    validator_->setBrightnessRange(min, max);
}

- (void)setObstructionThreshold:(float)threshold {
    validator_->setObstructionThreshold(threshold);
}

- (void)setProductCoverageMin:(float)min max:(float)max {
    validator_->setProductCoverageRange(min, max);
}

- (void)setBackgroundClutterThreshold:(float)threshold {
    validator_->setBackgroundClutterThreshold(threshold);
}

- (void)setSaturationThreshold:(float)threshold {
    validator_->setSaturationThreshold(threshold);
}

- (CGPoint)detectProductCenter:(UIImage *)image {
    // Convert UIImage to cv::Mat
    cv::Mat mat;
    UIImageToMat(image, mat);
    
    // Detect product center
    cv::Point2f center = validator_->detectProductCenter(mat);
    
    // Return normalized coordinates (0-1) or CGPointZero if not detected
    if (center.x < 0 || center.y < 0) {
        return CGPointZero;
    }
    
    return CGPointMake(center.x, center.y);
}

- (CIValidationResult *)convertResult:(const ValidationResult&)cppResult {
    CIValidationResult *result = [[CIValidationResult alloc] init];
    
    result.isValid = cppResult.is_valid;
    result.isBlurry = cppResult.is_blurry;
    result.hasMotionBlur = cppResult.has_motion_blur;
    result.isTilted = cppResult.is_tilted;
    result.isTooDark = cppResult.is_too_dark;
    result.isTooBright = cppResult.is_too_bright;
    result.hasObstruction = cppResult.has_obstruction;
    
    // Embedding/similarity search checks
    result.productNotVisible = cppResult.product_not_visible;
    result.backgroundTooCluttered = cppResult.background_too_cluttered;
    result.hasColorCast = cppResult.has_color_cast;
    result.hasMultipleProducts = cppResult.has_multiple_products;
    
    result.blurScore = cppResult.blur_score;
    result.motionScore = cppResult.motion_score;
    result.tiltAngle = cppResult.tilt_angle;
    result.brightness = cppResult.brightness;
    result.obstructionConfidence = cppResult.obstruction_confidence;
    
    // Embedding/similarity search scores
    result.productCoverage = cppResult.product_coverage;
    result.productCenterScore = cppResult.product_center_score;
    result.backgroundConsistency = cppResult.background_consistency;
    result.whiteBalanceScore = cppResult.white_balance_score;
    result.colorCastScore = cppResult.color_cast_score;
    result.saturation = cppResult.saturation;
    result.singleFocusScore = cppResult.single_focus_score;
    
    // Convert C++ vector to NSArray
    NSMutableArray *errors = [NSMutableArray array];
    for (const auto& error : cppResult.errors) {
        [errors addObject:[NSString stringWithUTF8String:error.c_str()]];
    }
    result.errors = errors;
    
    return result;
}

@end
