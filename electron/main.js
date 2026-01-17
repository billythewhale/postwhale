const { app, BrowserWindow, ipcMain, session } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

let mainWindow;
let backendProcess;
let requestHandlers = new Map(); // Track pending requests

// Content Security Policy for Electron security
// Development: allows Vite HMR (requires unsafe-eval for hot reloading)
// Production: strict CSP with no unsafe-eval
function setupContentSecurityPolicy() {
  const isDev = process.env.NODE_ENV === 'development';

  // Build CSP based on environment
  let csp;
  if (isDev) {
    // Development CSP - allows Vite dev server and HMR
    // unsafe-eval is required by Vite for hot module replacement
    csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' http://localhost:5173 ws://localhost:5173",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "worker-src 'self' blob:"
    ].join('; ');
  } else {
    // Production CSP - strict, no unsafe-eval
    csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "worker-src 'self' blob:"
    ].join('; ');
  }

  // Set CSP header on all responses
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  console.log('[Electron] CSP configured for', isDev ? 'development' : 'production');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    show: false  // Don't show until ready
  });

  // Show window when ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // In development, load from Vite dev server
  // In production, load from extraResources
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, frontend is in Resources/dist
    const frontendPath = path.join(process.resourcesPath, 'dist', 'index.html');
    console.log('[Electron] Loading frontend from:', frontendPath);
    mainWindow.loadFile(frontendPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  // In development, use backend/postwhale
  // In production (packaged), use resources/app.asar.unpacked/backend/postwhale
  let backendPath;
  if (process.env.NODE_ENV === 'development') {
    backendPath = path.join(__dirname, '../backend/postwhale');
  } else {
    backendPath = path.join(process.resourcesPath, 'postwhale');
  }

  console.log('[Electron] Starting backend:', backendPath);

  backendProcess = spawn(backendPath, [], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Read responses from stdout line-by-line
  const rl = readline.createInterface({
    input: backendProcess.stdout,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      console.log('[Electron] Backend response:', response);

      // If there's a pending request handler, resolve it
      const requestId = response.requestId;
      if (requestId && requestHandlers.has(requestId)) {
        const { resolve } = requestHandlers.get(requestId);
        resolve(response);
        requestHandlers.delete(requestId);
      }
    } catch (e) {
      console.error('[Electron] Failed to parse backend response:', e, 'Line:', line);
    }
  });

  backendProcess.stderr.on('data', (data) => {
    console.error('[Electron] Backend error:', data.toString());
  });

  backendProcess.on('close', (code) => {
    console.log('[Electron] Backend process exited with code', code);
  });

  backendProcess.on('error', (error) => {
    console.error('[Electron] Backend process error:', error);
  });
}

// Handle IPC requests from renderer
ipcMain.handle('ipc-request', async (event, action, data) => {
  return new Promise((resolve, reject) => {
    // Generate unique request ID
    const requestId = Date.now() + Math.random();

    // Store handler for this request
    requestHandlers.set(requestId, { resolve, reject });

    // Create request object
    const request = { action, data, requestId };
    const requestLine = JSON.stringify(request) + '\n';

    console.log('[Electron] Sending to backend:', request);

    // Send request to backend
    try {
      backendProcess.stdin.write(requestLine);
    } catch (error) {
      console.error('[Electron] Failed to write to backend:', error);
      requestHandlers.delete(requestId);
      reject(error);
    }

    // Timeout after 30 seconds
    setTimeout(() => {
      if (requestHandlers.has(requestId)) {
        requestHandlers.delete(requestId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
});

async function waitForVite(url, maxAttempts = 30) {
  const http = require('http');

  for (let i = 0; i < maxAttempts; i++) {
    const isReady = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (isReady) {
      console.log('[Electron] Vite dev server ready');
      return true;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.error('[Electron] Vite dev server not ready after max attempts');
  return false;
}

app.whenReady().then(async () => {
  setupContentSecurityPolicy();
  startBackend();

  if (process.env.NODE_ENV === 'development') {
    await waitForVite('http://localhost:5173');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});

// Clean up backend process on app quit
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
