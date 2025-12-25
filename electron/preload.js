const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
  get: (sql, params) => ipcRenderer.invoke('db:get', sql, params)
})
