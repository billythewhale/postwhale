#!/bin/bash

# Test IPC protocol with the Go backend
# This verifies that the backend correctly handles requestId

echo "Testing IPC Protocol..."

# Test 1: getRepositories
echo ""
echo "Test 1: getRepositories with requestId"
echo '{"action":"getRepositories","data":{},"requestId":12345}' | ./backend/postwhale | head -1

# Test 2: addRepository (use fake-repo)
echo ""
echo "Test 2: addRepository with requestId"
FAKE_REPO_PATH=$(pwd)/fake-repo
echo "{\"action\":\"addRepository\",\"data\":{\"path\":\"$FAKE_REPO_PATH\"},\"requestId\":67890}" | ./backend/postwhale | head -1

echo ""
echo "IPC Protocol test complete"
