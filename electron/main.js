const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

let mainWindow;
let backendProcess;
let requestHandlers = new Map(); // Track pending requests

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window'
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
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

app.whenReady().then(() => {
  startBackend();

  // Wait a bit for backend to start before creating window
  setTimeout(() => {
    createWindow();
  }, 500);

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
