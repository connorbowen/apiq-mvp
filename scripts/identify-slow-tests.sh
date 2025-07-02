#!/bin/bash

# Identify Slow Integration Tests
# This script runs each integration test and measures its performance

echo "🔍 Identifying Slow Integration Tests"
echo "====================================="

# Create results directory
mkdir -p test-results

# Function to run test and measure time
run_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .test.ts)
    
    echo "⏱️  Testing: $test_name"
    
    # Run test with timeout and measure time
    start_time=$(date +%s.%N)
    
    # Run the test with a 60-second timeout
    timeout 60 npx jest --config=jest.integration.config.js "$test_file" --silent 2>/dev/null
    
    exit_code=$?
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "60.0")
    
    # Determine status
    if [ $exit_code -eq 0 ]; then
        status="✅ PASS"
    elif [ $exit_code -eq 124 ]; then
        status="⏰ TIMEOUT"
        duration="60.0+"
    else
        status="❌ FAIL"
    fi
    
    echo "$test_name|$duration|$status" >> test-results/performance-results.txt
    echo "   $status in ${duration}s"
}

# Clear previous results
> test-results/performance-results.txt

# Get all integration test files
test_files=$(find tests/integration/api -name "*.test.ts" | sort)

echo "Found $(echo "$test_files" | wc -l) test files to analyze"
echo ""

# Run each test
for test_file in $test_files; do
    run_test "$test_file"
done

echo ""
echo "📊 Performance Summary"
echo "====================="

# Sort results by duration (slowest first)
if [ -f test-results/performance-results.txt ]; then
    echo "Test File | Duration | Status"
    echo "---------|----------|--------"
    sort -t'|' -k2 -nr test-results/performance-results.txt | while IFS='|' read -r test duration status; do
        printf "%-30s | %-8s | %s\n" "$test" "$duration" "$status"
    done
    
    echo ""
    echo "🎯 Optimization Recommendations:"
    echo ""
    
    # Identify tests that need optimization
    slow_tests=$(awk -F'|' '$2 > 5.0 {print $1}' test-results/performance-results.txt)
    
    if [ -n "$slow_tests" ]; then
        echo "🚨 Tests taking >5 seconds (need optimization):"
        echo "$slow_tests" | while read test; do
            echo "   - $test"
        done
    else
        echo "✅ All tests are performing well (<5 seconds)"
    fi
    
    timeout_tests=$(awk -F'|' '$3 == "⏰ TIMEOUT" {print $1}' test-results/performance-results.txt)
    
    if [ -n "$timeout_tests" ]; then
        echo ""
        echo "⏰ Tests that timed out (critical optimization needed):"
        echo "$timeout_tests" | while read test; do
            echo "   - $test"
        done
    fi
    
else
    echo "❌ No results found"
fi

echo ""
echo "📁 Results saved to: test-results/performance-results.txt" 