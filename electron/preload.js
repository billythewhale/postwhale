const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC API to renderer process
contextBridge.exposeInMainWorld('electron', {
  invoke: async (action, data) => {
    return ipcRenderer.invoke('ipc-request', action, data);
  },
  onResponse: (callback) => {
    ipcRenderer.on('ipc-response', (event, response) => callback(response));
  }
});
