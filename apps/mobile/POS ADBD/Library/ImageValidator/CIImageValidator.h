//
//  CIImageValidator.h
//  Objective-C++ wrapper for C++ ImageValidator
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@class CIValidationResult;

@interface CIValidationResult : NSObject

@property (nonatomic, assign) BOOL isValid;

// Individual checks (basic quality)
@property (nonatomic, assign) BOOL isBlurry;
@property (nonatomic, assign) BOOL hasMotionBlur;
@property (nonatomic, assign) BOOL isTilted;
@property (nonatomic, assign) BOOL isTooDark;
@property (nonatomic, assign) BOOL isTooBright;
@property (nonatomic, assign) BOOL hasObstruction;

// Embedding/similarity search checks
@property (nonatomic, assign) BOOL productNotVisible;
@property (nonatomic, assign) BOOL backgroundTooCluttered;
@property (nonatomic, assign) BOOL hasColorCast;
@property (nonatomic, assign) BOOL hasMultipleProducts;

// Scores (basic quality)
@property (nonatomic, assign) float blurScore;
@property (nonatomic, assign) float motionScore;
@property (nonatomic, assign) float tiltAngle;
@property (nonatomic, assign) float brightness;
@property (nonatomic, assign) float obstructionConfidence;

// Scores (embedding/similarity search)
@property (nonatomic, assign) float productCoverage;
@property (nonatomic, assign) float productCenterScore;
@property (nonatomic, assign) float backgroundConsistency;
@property (nonatomic, assign) float whiteBalanceScore;
@property (nonatomic, assign) float colorCastScore;
@property (nonatomic, assign) float saturation;
@property (nonatomic, assign) float singleFocusScore;

@property (nonatomic, strong) NSArray<NSString*> *errors;

@end

@class CIImageValidator;

@interface CIImageValidator : NSObject

- (instancetype)init;

- (CIValidationResult *)validateImageAtPath:(NSString *)path;
- (CIValidationResult *)validateImage:(UIImage *)image;

// Customize thresholds (basic quality)
- (void)setBlurThreshold:(float)threshold;
- (void)setMotionThreshold:(float)threshold;
- (void)setTiltThreshold:(float)threshold;
- (void)setBrightnessMin:(float)min max:(float)max;
- (void)setObstructionThreshold:(float)threshold;

// Customize thresholds (embedding/similarity search)
- (void)setProductCoverageMin:(float)min max:(float)max;
- (void)setBackgroundClutterThreshold:(float)threshold;
- (void)setSaturationThreshold:(float)threshold;

// Detect product center point (returns normalized coordinates 0-1, or CGPointZero if not detected)
- (CGPoint)detectProductCenter:(UIImage *)image;

@end

NS_ASSUME_NONNULL_END
