#!/bin/bash
# End-to-End Test Script for PostWhale
# Tests complete workflow: add repository → get services → get endpoints

set -e  # Exit on error

echo "=== PostWhale End-to-End Test ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to test IPC action
test_action() {
    local action=$1
    local data=$2
    local expected=$3
    local desc=$4

    echo -n "Testing: $desc ... "

    result=$(echo "{\"action\":\"$action\",\"data\":$data,\"requestId\":1}" | ./backend/postwhale 2>/dev/null | head -n 1)

    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((FAILED++))
        return 1
    fi
}

# Check if backend binary exists
if [ ! -f "./backend/postwhale" ]; then
    echo -e "${RED}Error: Backend binary not found. Run 'cd backend && go build -o postwhale .'${NC}"
    exit 1
fi

echo "Step 1: Test getRepositories (should be empty initially)"
test_action "getRepositories" "{}" "\"success\":true" "Get initial repositories"

echo ""
echo "Step 2: Add fake-repo repository"
test_action "addRepository" "{\"path\":\"./fake-repo\"}" "\"success\":true" "Add repository"

echo ""
echo "Step 3: Get repositories (should have 1 repository)"
result=$(echo '{"action":"getRepositories","data":{},"requestId":2}' | ./backend/postwhale 2>/dev/null | head -n 1)
if echo "$result" | grep -q "\"success\":true"; then
    echo -e "Get repositories: ${GREEN}PASS${NC}"
    ((PASSED++))

    # Extract repository ID for next tests
    REPO_ID=$(echo "$result" | grep -o '"id":[0-9]*' | head -n 1 | cut -d':' -f2)
    echo "  Repository ID: $REPO_ID"
else
    echo -e "Get repositories: ${RED}FAIL${NC}"
    ((FAILED++))
    echo "  Got: $result"
    exit 1
fi

echo ""
echo "Step 4: Get services for repository"
result=$(echo "{\"action\":\"getServices\",\"data\":{\"repositoryId\":$REPO_ID},\"requestId\":3}" | ./backend/postwhale 2>/dev/null | head -n 1)
if echo "$result" | grep -q "\"success\":true" && echo "$result" | grep -q "fusion"; then
    echo -e "Get services: ${GREEN}PASS${NC}"
    ((PASSED++))

    # Extract service ID for next test
    SERVICE_ID=$(echo "$result" | grep -o '"id":[0-9]*' | head -n 1 | cut -d':' -f2)
    echo "  Service ID: $SERVICE_ID"
else
    echo -e "Get services: ${RED}FAIL${NC}"
    ((FAILED++))
    echo "  Got: $result"
fi

echo ""
echo "Step 5: Get endpoints for service"
if [ -n "$SERVICE_ID" ]; then
    result=$(echo "{\"action\":\"getEndpoints\",\"data\":{\"serviceId\":$SERVICE_ID},\"requestId\":4}" | ./backend/postwhale 2>/dev/null | head -n 1)
    if echo "$result" | grep -q "\"success\":true" && echo "$result" | grep -q "\"method\""; then
        echo -e "Get endpoints: ${GREEN}PASS${NC}"
        ((PASSED++))

        # Count endpoints
        ENDPOINT_COUNT=$(echo "$result" | grep -o "\"id\":" | wc -l | tr -d ' ')
        echo "  Found $ENDPOINT_COUNT endpoints"
    else
        echo -e "Get endpoints: ${RED}FAIL${NC}"
        ((FAILED++))
        echo "  Got: $result"
    fi
fi

echo ""
echo "Step 6: Test executeRequest (expect connection error since no service running)"
result=$(echo '{"action":"executeRequest","data":{"serviceId":"fusion","port":8080,"endpoint":"/health","method":"GET","environment":"LOCAL","headers":{},"body":""},"requestId":5}' | ./backend/postwhale 2>/dev/null | head -n 1)
if echo "$result" | grep -q "\"success\":true" && echo "$result" | grep -q "responseTime"; then
    echo -e "Execute request: ${GREEN}PASS${NC}"
    ((PASSED++))
    echo "  (Expected connection failure handled correctly)"
else
    echo -e "Execute request: ${RED}FAIL${NC}"
    ((FAILED++))
    echo "  Got: $result"
fi

echo ""
echo "Step 7: Test getRequestHistory"
if [ -n "$SERVICE_ID" ]; then
    result=$(echo "{\"action\":\"getRequestHistory\",\"data\":{\"endpointId\":1,\"limit\":10},\"requestId\":6}" | ./backend/postwhale 2>/dev/null | head -n 1)
    if echo "$result" | grep -q "\"success\":true"; then
        echo -e "Get request history: ${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "Get request history: ${RED}FAIL${NC}"
        ((FAILED++))
        echo "  Got: $result"
    fi
fi

echo ""
echo "Step 8: Remove repository"
if [ -n "$REPO_ID" ]; then
    result=$(echo "{\"action\":\"removeRepository\",\"data\":{\"id\":$REPO_ID},\"requestId\":7}" | ./backend/postwhale 2>/dev/null | head -n 1)
    if echo "$result" | grep -q "\"success\":true"; then
        echo -e "Remove repository: ${GREEN}PASS${NC}"
        ((PASSED++))
    else
        echo -e "Remove repository: ${RED}FAIL${NC}"
        ((FAILED++))
        echo "  Got: $result"
    fi
fi

echo ""
echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
