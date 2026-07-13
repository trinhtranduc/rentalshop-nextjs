//
//  POSADBD-Bridging-Header.h
//  POS ADBD
//
//  Created by Trinh Tran on 31/1/26.
//  Copyright © 2026 Trinh Tran. All rights reserved.
//

#ifndef POSADBD_Bridging_Header_h
#define POSADBD_Bridging_Header_h

// Import CIImageValidator (Objective-C++ wrapper)
// Note: CIImageValidator.mm will handle OpenCV imports internally
#import "CIImageValidator.h"

#ifdef __cplusplus
#import <opencv2/opencv.hpp>
#import <opencv2/imgcodecs/ios.h>
#endif

#endif /* POSADBD_Bridging_Header_h */
