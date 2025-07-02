#!/bin/bash

# Performance Test Runner
# Tests the current optimized auth-flow test performance

echo "🔍 Running Performance Test Comparison"
echo "======================================"

# Function to run test and measure time
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo "⏱️  Running $test_name..."
    start_time=$(date +%s.%N)
    
    # Run the test
    npx jest --config=jest.integration.config.js "$test_file" --silent
    
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    
    echo "✅ $test_name completed in ${duration}s"
    echo "$duration" > "/tmp/${test_name}_duration.txt"
}

# Check if bc is available
if ! command -v bc &> /dev/null; then
    echo "❌ Error: 'bc' command not found. Please install it to run performance tests."
    echo "   On macOS: brew install bc"
    echo "   On Ubuntu: sudo apt-get install bc"
    exit 1
fi

# Run current optimized test
if [ -f "tests/integration/api/auth-flow.test.ts" ]; then
    run_test "tests/integration/api/auth-flow.test.ts" "Current Test"
else
    echo "❌ Test file not found"
    exit 1
fi

# Run backup original test for comparison (if available)
if [ -f "tests/integration/api/auth-flow.test.ts.backup" ]; then
    echo ""
    echo "📊 Performance Comparison with Original:"
    # Temporarily rename backup to run it
    cp "tests/integration/api/auth-flow.test.ts.backup" "tests/integration/api/auth-flow.backup.test.ts"
    run_test "tests/integration/api/auth-flow.backup.test.ts" "Original Test"
    rm "tests/integration/api/auth-flow.backup.test.ts"
    
    # Calculate improvement
    if [ -f "/tmp/Current Test_duration.txt" ] && [ -f "/tmp/Original Test_duration.txt" ]; then
        current_duration=$(cat "/tmp/Current Test_duration.txt")
        original_duration=$(cat "/tmp/Original Test_duration.txt")
        
        improvement=$(echo "scale=2; (($original_duration - $current_duration) / $original_duration) * 100" | bc)
        
        echo ""
        echo "📊 Performance Results"
        echo "====================="
        echo "Original Test:  ${original_duration}s"
        echo "Current Test:   ${current_duration}s"
        echo "Improvement:    ${improvement}% faster"
        
        # Clean up temp files
        rm -f "/tmp/Current Test_duration.txt" "/tmp/Original Test_duration.txt"
    fi
else
    echo ""
    echo "ℹ️  No backup file found for comparison"
    echo "   Original test was replaced with optimized version"
fi

# Calculate improvement
if [ -f "/tmp/Original Test_duration.txt" ] && [ -f "/tmp/Optimized Test_duration.txt" ]; then
    original_duration=$(cat "/tmp/Original Test_duration.txt")
    optimized_duration=$(cat "/tmp/Optimized Test_duration.txt")
    
    improvement=$(echo "scale=2; (($original_duration - $optimized_duration) / $original_duration) * 100" | bc)
    
    echo ""
    echo "📊 Performance Results"
    echo "====================="
    echo "Original Test:  ${original_duration}s"
    echo "Optimized Test: ${optimized_duration}s"
    echo "Improvement:    ${improvement}% faster"
    
    # Clean up temp files
    rm -f "/tmp/Original Test_duration.txt" "/tmp/Optimized Test_duration.txt"
else
    echo "❌ Could not calculate performance improvement"
fi

echo ""
echo "🎯 Recommendations:"
echo "- Use database transactions for faster rollbacks"
echo "- Reuse test data in beforeAll instead of beforeEach"
echo "- Enable parallel test execution with maxWorkers"
echo "- Reduce test timeout for faster feedback"
echo "- Use targeted database cleanup instead of complex WHERE clauses" 