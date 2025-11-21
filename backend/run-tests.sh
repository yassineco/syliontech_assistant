#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Magic Button - Test Suite Runner${NC}"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install npm first.${NC}"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Running TypeScript compilation check...${NC}"
npx tsc --noEmit

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ TypeScript compilation successful${NC}"

# Function to run a specific test suite
run_test_suite() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${YELLOW}🧪 Running $test_name tests...${NC}"
    npx jest "$test_file" --verbose --detectOpenHandles
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $test_name tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name tests failed${NC}"
        return 1
    fi
}

# Test suites
declare -A test_suites
test_suites["API Health"]="api.test.ts"
test_suites["GenAI Processing"]="genai.test.ts"
test_suites["RAG Functionality"]="rag.test.ts"
test_suites["Translation System"]="translation.test.ts"
test_suites["Integration Tests"]="integration.test.ts"
test_suites["Security Tests"]="security.test.ts"

failed_tests=()
passed_tests=()

# Run individual test suites
for test_name in "${!test_suites[@]}"; do
    test_file="${test_suites[$test_name]}"
    
    if run_test_suite "$test_name" "$test_file"; then
        passed_tests+=("$test_name")
    else
        failed_tests+=("$test_name")
    fi
    
    echo ""
done

# Run all tests with coverage
echo -e "${YELLOW}📊 Running full test suite with coverage...${NC}"
npx jest --coverage --detectOpenHandles

coverage_exit_code=$?

# Results summary
echo ""
echo "========================================"
echo -e "${BLUE}📋 Test Results Summary${NC}"
echo "========================================"

if [ ${#passed_tests[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Passed Tests (${#passed_tests[@]}):${NC}"
    for test in "${passed_tests[@]}"; do
        echo -e "   • $test"
    done
fi

if [ ${#failed_tests[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed Tests (${#failed_tests[@]}):${NC}"
    for test in "${failed_tests[@]}"; do
        echo -e "   • $test"
    done
fi

echo ""
if [ $coverage_exit_code -eq 0 ]; then
    echo -e "${GREEN}📊 Coverage report generated successfully${NC}"
    echo -e "${BLUE}📁 Coverage report available in: ./coverage/lcov-report/index.html${NC}"
else
    echo -e "${YELLOW}⚠️  Coverage report generation had issues${NC}"
fi

echo ""
echo "========================================"

# Final exit code
if [ ${#failed_tests[@]} -eq 0 ] && [ $coverage_exit_code -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    echo -e "${GREEN}✨ Your Magic Button backend is ready for production!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed or coverage issues detected${NC}"
    echo -e "${YELLOW}🔧 Please review the failed tests and fix any issues${NC}"
    exit 1
fi