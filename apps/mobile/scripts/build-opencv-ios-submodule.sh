#!/bin/bash

# Build OpenCV framework for iOS from git submodule
# Usage: ./scripts/build-opencv-ios-submodule.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OPENCV_SOURCE="$PROJECT_ROOT/ios/opencv"
FRAMEWORK_DIR="$PROJECT_ROOT/ios/opencv-ios"

echo -e "${BLUE}📦 Building OpenCV framework for iOS from submodule${NC}"
echo "=================================================="
echo ""

# Check if OpenCV submodule exists
if [ ! -d "$OPENCV_SOURCE" ]; then
    echo -e "${RED}❌ Error: OpenCV submodule not found at $OPENCV_SOURCE${NC}"
    echo ""
    echo -e "${YELLOW}💡 Solution:${NC}"
    echo "   1. Add submodule:"
    echo "      git submodule add https://github.com/opencv/opencv.git ios/opencv"
    echo ""
    echo "   2. Initialize submodule:"
    echo "      git submodule update --init --recursive"
    echo ""
    exit 1
fi

# Check if submodule is initialized
if [ ! -f "$OPENCV_SOURCE/CMakeLists.txt" ]; then
    echo -e "${YELLOW}⚠️  OpenCV submodule appears to be empty${NC}"
    echo -e "${YELLOW}   Initializing submodule...${NC}"
    cd "$PROJECT_ROOT"
    git submodule update --init --recursive
fi

# Check if Python script exists (OpenCV's build script)
# Use build_xcframework.py for modern XCFramework support (allows same arch for different platforms)
PYTHON_SCRIPT="$OPENCV_SOURCE/platforms/apple/build_xcframework.py"
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo -e "${RED}❌ Error: OpenCV build script not found${NC}"
    echo "   Expected at: $PYTHON_SCRIPT"
    echo ""
    echo -e "${YELLOW}💡 Make sure you're using OpenCV 4.x${NC}"
    exit 1
fi

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: python3 not found${NC}"
    echo "   Please install Python 3"
    exit 1
fi

echo -e "${GREEN}✅ OpenCV submodule found${NC}"
echo "   Source: $OPENCV_SOURCE"
echo "   Output: $FRAMEWORK_DIR"
echo ""

# Create output directory
mkdir -p "$FRAMEWORK_DIR"

echo -e "${BLUE}🔨 Building OpenCV XCFramework...${NC}"
echo "   This may take 30-60 minutes depending on your machine"
echo ""

# Build XCFramework using OpenCV's Python script
# XCFramework allows same architecture (arm64) for different platforms
python3 "$PYTHON_SCRIPT" \
    --out "$FRAMEWORK_DIR" \
    --iphoneos_archs "arm64" \
    --iphonesimulator_archs "x86_64,arm64" \
    --build_only_specified_archs \
    --without bitcode

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📦 XCFramework location:${NC}"
    echo "   $FRAMEWORK_DIR/opencv2.xcframework"
    echo ""
    
    # Verify XCFramework
    if [ -d "$FRAMEWORK_DIR/opencv2.xcframework" ]; then
        echo -e "${GREEN}✅ XCFramework verified${NC}"
        
        # List platforms in XCFramework
            echo ""
        echo -e "${BLUE}📊 XCFramework platforms:${NC}"
        ls -d "$FRAMEWORK_DIR/opencv2.xcframework"/*/ 2>/dev/null | xargs -n1 basename || true
    else
        echo -e "${YELLOW}⚠️  Warning: XCFramework directory not found${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Next steps:${NC}"
    echo "   1. Open Xcode project"
    echo "   2. Drag $FRAMEWORK_DIR/opencv2.xcframework into your project"
    echo "   3. Add to 'Frameworks, Libraries, and Embedded Content'"
    echo "   4. XCFramework will automatically select the correct platform slice"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Build failed${NC}"
    echo "   Please check the error messages above"
    exit 1
fi
