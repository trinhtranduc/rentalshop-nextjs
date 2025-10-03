#!/bin/bash

# ============================================================================
# SUBSCRIPTION VALIDATION TEST RUNNER
# ============================================================================

set -e

echo "🧪 Starting Rental Shop Subscription Validation Tests"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the tests directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    print_error "Yarn is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing test dependencies..."
    yarn install
fi

# Set environment variables
export NODE_ENV=test
export TEST_DATABASE_URL="file:./test.db"
export JWT_SECRET="test-jwt-secret-key-for-subscription-validation"

print_status "Environment: $NODE_ENV"
print_status "Test Database: $TEST_DATABASE_URL"

# Function to run specific test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    
    print_status "Running $suite_name tests..."
    echo "----------------------------------------"
    
    if yarn jest "$test_pattern" --verbose; then
        print_success "$suite_name tests passed ✅"
    else
        print_error "$suite_name tests failed ❌"
        return 1
    fi
    echo ""
}

# Function to run all tests
run_all_tests() {
    print_status "Running all subscription validation tests..."
    echo "=========================================="
    
    if yarn test --verbose; then
        print_success "All tests passed ✅"
        return 0
    else
        print_error "Some tests failed ❌"
        return 1
    fi
}

# Function to run tests with coverage
run_coverage_tests() {
    print_status "Running tests with coverage..."
    echo "====================================="
    
    if yarn test:coverage; then
        print_success "Coverage tests completed ✅"
        return 0
    else
        print_error "Coverage tests failed ❌"
        return 1
    fi
}

# Function to clean up
cleanup() {
    print_status "Cleaning up test artifacts..."
    yarn clean
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  all          Run all tests"
    echo "  subscription Run subscription validation tests"
    echo "  admin        Run admin extension tests"
    echo "  states       Run subscription states tests"
    echo "  api          Run API endpoint tests"
    echo "  integration  Run integration tests"
    echo "  coverage     Run tests with coverage"
    echo "  watch        Run tests in watch mode"
    echo "  clean        Clean up test artifacts"
    echo "  help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all                    # Run all tests"
    echo "  $0 subscription           # Run only subscription tests"
    echo "  $0 coverage               # Run tests with coverage"
    echo "  $0 watch                  # Run tests in watch mode"
}

# Main script logic
case "${1:-all}" in
    "all")
        run_all_tests
        ;;
    "subscription")
        run_test_suite "Subscription Validation" "subscription-validation"
        ;;
    "admin")
        run_test_suite "Admin Extension" "admin-extend"
        ;;
    "states")
        run_test_suite "Subscription States" "subscription-states"
        ;;
    "api")
        run_test_suite "API Endpoints" "api"
        ;;
    "integration")
        run_test_suite "Integration" "integration"
        ;;
    "coverage")
        run_coverage_tests
        ;;
    "watch")
        print_status "Starting tests in watch mode..."
        yarn test:watch
        ;;
    "clean")
        cleanup
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac

# Exit with appropriate code
if [ $? -eq 0 ]; then
    print_success "Test execution completed successfully! 🎉"
    exit 0
else
    print_error "Test execution failed! 💥"
    exit 1
fi
