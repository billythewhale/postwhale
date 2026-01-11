#!/bin/bash

echo "===== PostWhale Electron Integration Verification ====="
echo ""

ERRORS=0

# Check 1: Backend binary exists
echo "✓ Checking backend binary..."
if [ -f backend/postwhale ]; then
    echo "  ✓ backend/postwhale exists"
else
    echo "  ✗ backend/postwhale NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Frontend dist exists
echo "✓ Checking frontend build..."
if [ -d frontend/dist ]; then
    echo "  ✓ frontend/dist/ exists"
else
    echo "  ✗ frontend/dist/ NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Electron files exist
echo "✓ Checking Electron files..."
for file in electron/main.js electron/preload.js electron/package.json electron/forge.config.js; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file NOT FOUND"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check 4: Electron dependencies installed
echo "✓ Checking Electron dependencies..."
if [ -d electron/node_modules ]; then
    echo "  ✓ electron/node_modules/ exists"
else
    echo "  ✗ electron/node_modules/ NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check 5: Root workspace files
echo "✓ Checking workspace configuration..."
if [ -f package.json ]; then
    echo "  ✓ package.json exists"
else
    echo "  ✗ package.json NOT FOUND"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: Frontend IPC hook
echo "✓ Checking frontend IPC integration..."
if grep -q "window.electron" frontend/src/hooks/useIPC.ts; then
    echo "  ✓ useIPC.ts has Electron integration"
else
    echo "  ✗ useIPC.ts missing Electron integration"
    ERRORS=$((ERRORS + 1))
fi

# Check 7: Backend IPC supports requestId
echo "✓ Checking backend requestId support..."
if grep -q "RequestID" backend/ipc/handler.go; then
    echo "  ✓ Backend supports requestId"
else
    echo "  ✗ Backend missing requestId support"
    ERRORS=$((ERRORS + 1))
fi

# Check 8: Test backend IPC
echo "✓ Testing backend IPC protocol..."
RESPONSE=$(echo '{"action":"getRepositories","data":{},"requestId":99999}' | ./backend/postwhale | head -1)
if echo "$RESPONSE" | grep -q '"requestId":99999'; then
    echo "  ✓ Backend returns requestId correctly"
else
    echo "  ✗ Backend requestId not working"
    echo "  Response: $RESPONSE"
    ERRORS=$((ERRORS + 1))
fi

# Check 9: TypeScript compilation
echo "✓ Checking TypeScript compilation..."
cd frontend
if npx tsc --noEmit 2>&1 | grep -q "error"; then
    echo "  ✗ TypeScript compilation errors"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✓ TypeScript compilation passes"
fi
cd ..

# Check 10: Backend tests
echo "✓ Running backend tests..."
cd backend
if go test ./... > /dev/null 2>&1; then
    echo "  ✓ All backend tests pass"
else
    echo "  ✗ Backend tests failed"
    ERRORS=$((ERRORS + 1))
fi
cd ..

echo ""
echo "===== Verification Complete ====="
if [ $ERRORS -eq 0 ]; then
    echo "✓ All checks passed!"
    exit 0
else
    echo "✗ $ERRORS check(s) failed"
    exit 1
fi
