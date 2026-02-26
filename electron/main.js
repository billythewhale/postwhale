const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const readline = require('readline');

let mainWindow;
let backendProcess;
let requestHandlers = new Map(); // Track pending requests
let backendWatcher;
let backendRestartTimer;
let backendBuildProcess;
let backendRestartInProgress = false;
let backendRestartQueued = false;

const BACKEND_RESTART_DEBOUNCE_MS = 250;
const RELEASES_API_URL = 'https://api.github.com/repos/billythewhale/postwhale/releases/latest';
const RELEASE_REQUEST_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'PostWhale'
};
const MAX_HTTP_REDIRECTS = 5;
const isDev = process.env.NODE_ENV === 'development';
const backendDir = path.join(__dirname, '../backend');

function rejectPendingRequests(message) {
  for (const [, { reject }] of requestHandlers) {
    reject(new Error(message));
  }
  requestHandlers.clear();
}

function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, '../backend/postwhale');
  }
  return path.join(process.resourcesPath, 'postwhale');
}

function shouldReloadBackendFile(filename) {
  if (!filename) {
    return false;
  }
  const normalized = filename.replace(/\\/g, '/');
  return normalized.endsWith('.go') || normalized.endsWith('/go.mod') || normalized.endsWith('/go.sum') || normalized === 'go.mod' || normalized === 'go.sum';
}

function normalizeVersion(version) {
  if (typeof version !== 'string') {
    return '';
  }
  return version.trim().replace(/^v/i, '');
}

function parseVersion(version) {
  const normalized = normalizeVersion(version);
  if (!normalized) {
    return null;
  }
  const core = normalized.split('-')[0];
  const parts = core.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.length === 0 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return parts;
}

function isVersionNewer(latestVersion, currentVersion) {
  const latest = parseVersion(latestVersion);
  const current = parseVersion(currentVersion);

  if (!latest || !current) {
    return normalizeVersion(latestVersion) !== normalizeVersion(currentVersion);
  }

  const maxLength = Math.max(latest.length, current.length);
  for (let i = 0; i < maxLength; i += 1) {
    const latestPart = latest[i] || 0;
    const currentPart = current[i] || 0;
    if (latestPart > currentPart) {
      return true;
    }
    if (latestPart < currentPart) {
      return false;
    }
  }
  return false;
}

function selectReleaseAsset(assets) {
  const validAssets = Array.isArray(assets) ? assets.filter((asset) => asset && typeof asset.name === 'string' && typeof asset.browser_download_url === 'string') : [];
  if (validAssets.length === 0) {
    return null;
  }

  const preferredPatterns = [];
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    preferredPatterns.push(/darwin-arm64.*\.zip$/i, /arm64.*\.zip$/i);
  } else if (process.platform === 'darwin' && process.arch === 'x64') {
    preferredPatterns.push(/darwin-x64.*\.zip$/i, /x64.*\.zip$/i);
  }

  preferredPatterns.push(/\.zip$/i, /darwin.*\.dmg$/i, /\.dmg$/i);

  for (const pattern of preferredPatterns) {
    const match = validAssets.find((asset) => pattern.test(asset.name));
    if (match) {
      return match;
    }
  }

  return validAssets[0];
}

function resolveDownloadPath(downloadsDir, fileName) {
  const safeFileName = path.basename(fileName);
  const extension = path.extname(safeFileName);
  const baseName = extension ? safeFileName.slice(0, -extension.length) : safeFileName;

  let attempt = 0;
  let candidatePath = path.join(downloadsDir, safeFileName);
  while (fs.existsSync(candidatePath)) {
    attempt += 1;
    candidatePath = path.join(downloadsDir, `${baseName}-${attempt}${extension}`);
  }

  return candidatePath;
}

function parseDownloadUrl(urlString) {
  try {
    return new URL(urlString);
  } catch (_error) {
    return null;
  }
}

function isTrustedDownloadHost(hostname) {
  return hostname === 'github.com' || hostname === 'objects.githubusercontent.com' || hostname === 'github-releases.githubusercontent.com';
}

function requestJson(urlString, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(urlString, { headers: RELEASE_REQUEST_HEADERS }, (response) => {
      const statusCode = response.statusCode || 0;

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        if (redirectCount >= MAX_HTTP_REDIRECTS) {
          response.resume();
          reject(new Error('Too many redirects while checking for updates'));
          return;
        }
        const redirectUrl = new URL(response.headers.location, urlString).toString();
        response.resume();
        requestJson(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode !== 200) {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const message = Buffer.concat(chunks).toString('utf8');
          reject(new Error(`Release lookup failed (${statusCode}): ${message || 'Unknown response'}`));
        });
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (_error) {
          reject(new Error('Invalid release metadata received'));
        }
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error('Release lookup timed out'));
    });
  });
}

function downloadToFile(urlString, destinationPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(urlString, { headers: RELEASE_REQUEST_HEADERS }, (response) => {
      const statusCode = response.statusCode || 0;

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        if (redirectCount >= MAX_HTTP_REDIRECTS) {
          response.resume();
          reject(new Error('Too many redirects while downloading update'));
          return;
        }
        const redirectUrl = new URL(response.headers.location, urlString).toString();
        response.resume();
        downloadToFile(redirectUrl, destinationPath, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode !== 200) {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const message = Buffer.concat(chunks).toString('utf8');
          reject(new Error(`Update download failed (${statusCode}): ${message || 'Unknown response'}`));
        });
        return;
      }

      const file = fs.createWriteStream(destinationPath);
      let settled = false;

      const finishWithError = (error) => {
        if (settled) {
          return;
        }
        settled = true;
        file.destroy();
        fs.unlink(destinationPath, () => {
          reject(error);
        });
      };

      file.on('finish', () => {
        if (settled) {
          return;
        }
        settled = true;
        file.close(() => {
          resolve(destinationPath);
        });
      });

      file.on('error', finishWithError);
      response.on('error', finishWithError);
      response.pipe(file);
    });

    request.on('error', (error) => {
      fs.unlink(destinationPath, () => {
        reject(error);
      });
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error('Update download timed out'));
    });
  });
}

async function fetchLatestRelease() {
  const release = await requestJson(RELEASES_API_URL);
  if (!release || typeof release !== 'object') {
    throw new Error('Release metadata is unavailable');
  }
  return release;
}

function createReleasePayload(release) {
  const currentVersion = normalizeVersion(app.getVersion());
  const latestVersion = normalizeVersion(release.tag_name || release.name || currentVersion);
  const selectedAsset = selectReleaseAsset(release.assets);

  return {
    currentVersion,
    latestVersion,
    hasUpdate: isVersionNewer(latestVersion, currentVersion),
    releaseName: release.name || release.tag_name || latestVersion,
    body: typeof release.body === 'string' ? release.body : '',
    publishedAt: typeof release.published_at === 'string' ? release.published_at : null,
    htmlUrl: typeof release.html_url === 'string' ? release.html_url : null,
    assetName: selectedAsset ? selectedAsset.name : null,
    downloadUrl: selectedAsset ? selectedAsset.browser_download_url : null
  };
}

async function handleCheckForUpdates() {
  try {
    const release = await fetchLatestRelease();
    return {
      success: true,
      data: createReleasePayload(release)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check for updates'
    };
  }
}

async function handleDownloadLatestRelease(data = {}) {
  try {
    const payload = data && typeof data === 'object' ? data : {};
    let downloadUrl = typeof payload.downloadUrl === 'string' ? payload.downloadUrl : '';
    let assetName = typeof payload.assetName === 'string' ? payload.assetName : '';

    if (!downloadUrl || !assetName) {
      const release = await fetchLatestRelease();
      const payload = createReleasePayload(release);
      downloadUrl = payload.downloadUrl || '';
      assetName = payload.assetName || '';
    }

    if (!downloadUrl || !assetName) {
      return {
        success: false,
        error: 'No compatible release asset was found'
      };
    }

    const parsedUrl = parseDownloadUrl(downloadUrl);
    if (!parsedUrl || !isTrustedDownloadHost(parsedUrl.hostname)) {
      return {
        success: false,
        error: 'Download URL is not allowed'
      };
    }

    const downloadsDir = app.getPath('downloads') || os.homedir();
    const destinationPath = resolveDownloadPath(downloadsDir, assetName);
    await downloadToFile(downloadUrl, destinationPath);

    return {
      success: true,
      data: {
        filePath: destinationPath,
        fileName: path.basename(destinationPath)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download update'
    };
  }
}

function handleRevealDownloadedFile(data = {}) {
  if (!data || typeof data.filePath !== 'string' || data.filePath.trim() === '') {
    return {
      success: false,
      error: 'Missing file path'
    };
  }

  shell.showItemInFolder(data.filePath);
  return {
    success: true,
    data: true
  };
}

function handleOpenExternalUrl(data = {}) {
  const payload = data && typeof data === 'object' ? data : {};
  const rawUrl = typeof payload.url === 'string' ? payload.url.trim() : '';
  if (!rawUrl) {
    return {
      success: false,
      error: 'Missing URL'
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (_error) {
    return {
      success: false,
      error: 'Invalid URL'
    };
  }

  if (parsedUrl.protocol !== 'https:') {
    return {
      success: false,
      error: 'Only HTTPS URLs are allowed'
    };
  }

  shell.openExternal(parsedUrl.toString());
  return {
    success: true,
    data: true
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const details = (stderr || stdout || '').trim();
      reject(new Error(details || `Command failed: ${command}`));
    });
  });
}

function findAppBundle(rootDir, appName) {
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir) {
      continue;
    }

    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (_error) {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryPath = path.join(currentDir, entry.name);
      if (entry.name === appName) {
        return entryPath;
      }

      queue.push(entryPath);
    }
  }

  return null;
}

async function handleInstallLatestRelease(data = {}) {
  try {
    if (process.platform !== 'darwin') {
      return {
        success: false,
        error: 'Automatic install is only supported on macOS'
      };
    }

    const payload = data && typeof data === 'object' ? data : {};
    const filePath = typeof payload.filePath === 'string' ? payload.filePath.trim() : '';
    if (!filePath) {
      return {
        success: false,
        error: 'Missing downloaded file path'
      };
    }

    const zipPath = path.resolve(filePath);
    if (!fs.existsSync(zipPath)) {
      return {
        success: false,
        error: `Downloaded file not found: ${zipPath}`
      };
    }

    const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postwhale-install-'));
    const targetAppPath = '/Applications/PostWhale.app';

    try {
      await runCommand('/usr/bin/unzip', ['-o', zipPath, '-d', extractDir]);

      const extractedAppPath = findAppBundle(extractDir, 'PostWhale.app');
      if (!extractedAppPath) {
        return {
          success: false,
          error: 'Update archive does not contain PostWhale.app'
        };
      }

      await fs.promises.rm(targetAppPath, { recursive: true, force: true });
      await fs.promises.cp(extractedAppPath, targetAppPath, { recursive: true });

      try {
        await runCommand('/usr/bin/xattr', ['-dr', 'com.apple.quarantine', targetAppPath]);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message.includes('No such xattr')) {
          throw error;
        }
      }
    } finally {
      try {
        await fs.promises.rm(extractDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch (_) {
        // cleanup failure is non-fatal
      }
    }

    const result = await dialog.showMessageBox({
      type: 'info',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Installed',
      message: 'PostWhale update installed.',
      detail: 'Restart PostWhale to use the new version.'
    });

    if (result.response === 0) {
      app.relaunch();
      app.exit(0);
      return {
        success: true,
        data: {
          restartRequested: true
        }
      };
    }

    return {
      success: true,
      data: {
        restartRequested: false
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to install update'
    };
  }
}

function stopBackend(done) {
  if (!backendProcess) {
    done();
    return;
  }

  const processToStop = backendProcess;
  backendProcess = null;
  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    done();
  };

  processToStop.once('close', finish);
  processToStop.kill();
  setTimeout(finish, 1000);
}

function buildBackendBinary(callback) {
  if (backendBuildProcess) {
    backendRestartQueued = true;
    return;
  }

  console.log('[Electron] Rebuilding backend binary...');
  backendBuildProcess = spawn('go', ['build', '-o', 'postwhale', '.'], {
    cwd: backendDir,
    env: { ...process.env, GOCACHE: process.env.GOCACHE || '/tmp/go-cache' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  let finalized = false;

  const finalize = (buildSucceeded) => {
    if (finalized) {
      return;
    }
    finalized = true;
    backendBuildProcess = null;
    callback(buildSucceeded);

    if (backendRestartQueued) {
      backendRestartQueued = false;
      scheduleBackendRestart('queued change');
    }
  };

  backendBuildProcess.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  backendBuildProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  backendBuildProcess.on('close', (code) => {
    const buildSucceeded = code === 0;
    if (buildSucceeded) {
      console.log('[Electron] Backend rebuild complete');
    } else {
      console.error('[Electron] Backend rebuild failed:', stderr || stdout || `exit code ${code}`);
    }
    finalize(buildSucceeded);
  });

  backendBuildProcess.on('error', (error) => {
    console.error('[Electron] Failed to start backend rebuild:', error);
    finalize(false);
  });
}

function restartBackendAfterBuild() {
  if (backendRestartInProgress) {
    backendRestartQueued = true;
    return;
  }

  backendRestartInProgress = true;
  buildBackendBinary((buildSucceeded) => {
    if (!buildSucceeded) {
      backendRestartInProgress = false;
      return;
    }

    rejectPendingRequests('Backend restarting');
    stopBackend(() => {
      startBackend();
      backendRestartInProgress = false;
    });
  });
}

function scheduleBackendRestart(filename) {
  clearTimeout(backendRestartTimer);
  backendRestartTimer = setTimeout(() => {
    console.log(`[Electron] Backend source changed (${filename}), reloading backend`);
    restartBackendAfterBuild();
  }, BACKEND_RESTART_DEBOUNCE_MS);
}

function watchBackendChanges() {
  if (!isDev) {
    return;
  }

  backendWatcher = fs.watch(backendDir, { recursive: true }, (_eventType, filename) => {
    if (!shouldReloadBackendFile(filename)) {
      return;
    }
    scheduleBackendRestart(filename);
  });

  backendWatcher.on('error', (error) => {
    console.error('[Electron] Backend watcher error:', error);
  });
}

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
  const backendPath = getBackendPath();

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
    rejectPendingRequests('Backend process exited');
  });

  backendProcess.on('error', (error) => {
    console.error('[Electron] Backend process error:', error);
  });
}

// Handle IPC requests from renderer
ipcMain.handle('ipc-request', async (event, action, data) => {
  if (action === 'checkForUpdates') {
    return handleCheckForUpdates();
  }

  if (action === 'downloadLatestRelease') {
    return handleDownloadLatestRelease(data);
  }

  if (action === 'revealDownloadedFile') {
    return handleRevealDownloadedFile(data);
  }

  if (action === 'openExternalUrl') {
    return handleOpenExternalUrl(data);
  }

  if (action === 'installLatestRelease') {
    return handleInstallLatestRelease(data);
  }

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
      if (!backendProcess || !backendProcess.stdin || backendProcess.killed || !backendProcess.stdin.writable) {
        throw new Error('Backend is not available');
      }
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

async function initializeBackend() {
  if (isDev) {
    await new Promise((resolve) => {
      buildBackendBinary(() => resolve());
    });
    watchBackendChanges();
  }
  startBackend();
}

app.whenReady().then(async () => {
  setupContentSecurityPolicy();
  await initializeBackend();

  if (isDev) {
    await waitForVite('http://localhost:5173');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function cleanup() {
  clearTimeout(backendRestartTimer);

  if (backendWatcher) {
    backendWatcher.close();
    backendWatcher = null;
  }

  if (backendBuildProcess) {
    backendBuildProcess.kill();
    backendBuildProcess = null;
  }

  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});

// Clean up backend process on app quit
app.on('before-quit', () => {
  cleanup();
});
