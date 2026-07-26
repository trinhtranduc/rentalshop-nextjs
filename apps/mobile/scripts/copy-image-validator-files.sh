#!/bin/bash

# Script to copy ImageValidator C++ core files from correctimage module

SOURCE_DIR="/Users/trinhtran/Documents/Source-Code/correctimage/src/core"
TARGET_DIR="/Users/trinhtran/Documents/Source-Code/anyrent/POS ADBD/Library/ImageValidator/Core"

# Create target directory
mkdir -p "$TARGET_DIR"

# Copy all .h and .cpp files
echo "Copying C++ core files..."
cp "$SOURCE_DIR"/*.h "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR"/*.cpp "$TARGET_DIR/" 2>/dev/null

# List copied files
echo ""
echo "Copied files:"
ls -la "$TARGET_DIR/" | grep -E '\.(h|cpp)$'

echo ""
echo "✅ Files copied successfully!"
