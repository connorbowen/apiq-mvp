#!/bin/bash

# Health Test Performance Measurement Script
# This script measures the performance improvement of the optimized health tests

echo "🔍 Health Test Performance Measurement"
echo "======================================"

# Function to run tests and measure time
run_tests() {
    local test_file=$1
    local description=$2
    
    echo ""
    echo "📊 Running: $description"
    echo "File: $test_file"
    
    # Run the test and capture timing
    start_time=$(date +%s.%N)
    
    if npm test -- --testPathPattern="$test_file" --verbose=false --silent > /dev/null 2>&1; then
        end_time=$(date +%s.%N)
        duration=$(echo "$end_time - $start_time" | bc -l)
        echo "✅ Success: ${duration}s"
        echo "$duration"
    else
        echo "❌ Failed"
        echo "999"
    fi
}

# Check if bc is available for floating point math
if ! command -v bc &> /dev/null; then
    echo "⚠️  'bc' command not found. Install it for precise timing measurements."
    echo "   On macOS: brew install bc"
    echo "   On Ubuntu: sudo apt-get install bc"
    exit 1
fi

# Run the health tests
health_duration=$(run_tests "health.test.ts" "Health API Integration Tests")

echo ""
echo "📈 Performance Summary"
echo "====================="
echo "Health Tests: ${health_duration}s"

# Performance thresholds
if (( $(echo "$health_duration < 10" | bc -l) )); then
    echo "✅ Excellent performance (< 10s)"
elif (( $(echo "$health_duration < 20" | bc -l) )); then
    echo "✅ Good performance (< 20s)"
elif (( $(echo "$health_duration < 30" | bc -l) )); then
    echo "⚠️  Acceptable performance (< 30s)"
else
    echo "❌ Poor performance (>= 30s) - Consider further optimization"
fi

echo ""
echo "💡 Optimization Tips:"
echo "- Use caching for expensive operations"
echo "- Consolidate database cleanup operations"
echo "- Reduce redundant test cases"
echo "- Optimize mock setup and teardown"
echo "- Use beforeAll instead of beforeEach when possible" 