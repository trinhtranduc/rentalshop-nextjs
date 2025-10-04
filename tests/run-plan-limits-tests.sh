#!/bin/bash

# ============================================================================
# PLAN LIMITS TEST RUNNER
# ============================================================================
# Script to run all plan limits tests

set -e

echo "🚀 Starting Plan Limits Test Suite..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_status "error" "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_status "info" "Node.js version: $(node --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_status "error" "Please run this script from the project root directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "info" "Installing dependencies..."
    npm install
fi

# Build packages if needed
print_status "info" "Building packages..."
npm run build

# Set up environment variables
export NODE_ENV=test
export DATABASE_URL="file:./prisma/dev.db"

# Function to run a test and capture results
run_test() {
    local test_name=$1
    local test_file=$2
    local description=$3
    
    echo ""
    echo "🧪 Running: $test_name"
    echo "Description: $description"
    echo "----------------------------------------"
    
    if [ -f "$test_file" ]; then
        if node "$test_file"; then
            print_status "success" "$test_name completed successfully"
            return 0
        else
            print_status "error" "$test_name failed"
            return 1
        fi
    else
        print_status "error" "Test file $test_file not found"
        return 1
    fi
}

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0

# Test 1: Plan Configuration Tests
echo ""
echo "📋 TEST 1: Plan Configuration Tests"
echo "===================================="
if run_test "Plan Configuration Tests" "test-plan-config.js" "Testing plan configuration and helper functions"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Test 2: Trial Configuration Tests
echo ""
echo "📋 TEST 2: Trial Configuration Tests"
echo "======================================="
if run_test "Trial Configuration Tests" "test-trial-config.js" "Testing trial configuration and helper functions"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Test 3: Plan Limits Validation Tests (Database)
echo ""
echo "📋 TEST 3: Plan Limits Validation Tests (Database)"
echo "=================================================="
if run_test "Plan Limits Validation Tests" "tests/plan-limits-validation.test.js" "Testing plan limits validation with database"; then
    ((passed_tests++))
else
    ((failed_tests++))
fi
((total_tests++))

# Test 4: Plan Limits API Tests (optional)
echo ""
echo "📋 TEST 4: Plan Limits API Tests"
echo "================================"
echo "Note: API tests require the server to be running on localhost:3001"
read -p "Do you want to run API tests? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if API server is running
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        if run_test "Plan Limits API Tests" "tests/plan-limits-api.test.js" "Testing plan limits API endpoints"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    else
        print_status "warning" "API server is not running. Skipping API tests."
        print_status "info" "To run API tests, start the server with: npm run dev"
    fi
    ((total_tests++))
else
    print_status "info" "Skipping API tests"
fi

# Print final results
echo ""
echo "🎯 FINAL TEST RESULTS"
echo "===================="
echo "Total Tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $failed_tests"

if [ $failed_tests -eq 0 ]; then
    print_status "success" "All tests passed! 🎉"
    echo ""
    echo "Plan limits validation system is working correctly:"
    echo "✅ Plan configuration is valid"
    echo "✅ Trial configuration is working"
    echo "✅ Plan limits validation is working"
    echo "✅ Platform access control is implemented"
    echo "✅ API endpoints are functional (if tested)"
    echo "✅ Database integration is working"
    echo "✅ Add-ons configuration is ready"
    exit 0
else
    print_status "error" "Some tests failed. Please review the results above."
    exit 1
fi
