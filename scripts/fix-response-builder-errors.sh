#!/bin/bash
# Script to automatically fix ResponseBuilder.error() calls with detailed messages
# Removes second parameter (detailed message) to ensure translation system works

echo "🔧 Fixing ResponseBuilder.error() calls..."

# Find all files with ResponseBuilder.error() calls that have 2 parameters
files=$(grep -rl "ResponseBuilder\.error.*," apps/api/app/api --include="*.ts" packages/utils/src/api --include="*.ts" 2>/dev/null)

for file in $files; do
  echo "Processing: $file"
  
  # Fix pattern: ResponseBuilder.error('CODE', 'message') -> ResponseBuilder.error('CODE')
  # This regex matches: ResponseBuilder.error('CODE', 'message') and removes the second parameter
  sed -i '' "s/ResponseBuilder\.error('\([^']*\)', '[^']*')/ResponseBuilder.error('\1')/g" "$file"
  sed -i '' 's/ResponseBuilder\.error("\([^"]*\)", "[^"]*")/ResponseBuilder.error("\1")/g' "$file"
  
  # Fix pattern: ResponseBuilder.error('CODE', `message`) -> ResponseBuilder.error('CODE')
  sed -i '' 's/ResponseBuilder\.error('\''\([^'\'']*\)'\'', `[^`]*`)/ResponseBuilder.error('\''\1'\'')/g' "$file"
done

echo "✅ Done! Please review changes and test."

