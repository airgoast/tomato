import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  loadDrafts: () => ipcRenderer.invoke('drafts:load'),
  saveDrafts: (json: string) => ipcRenderer.invoke('drafts:save', json),
  loadAppState: () => ipcRenderer.invoke('appState:load'),
  saveAppState: (json: string) => ipcRenderer.invoke('appState:save', json),
  loadAiConfig: () => ipcRenderer.invoke('aiConfig:load'),
  saveAiConfig: (json: string) => ipcRenderer.invoke('aiConfig:save', json),
  saveFileDialog: () => ipcRenderer.invoke('dialog:saveFile'),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  exportDrafts: (path: string, json: string) => ipcRenderer.invoke('drafts:export', path, json),
  importDrafts: (path: string) => ipcRenderer.invoke('drafts:import', path),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMenuNew: (cb: () => void) => ipcRenderer.on('menu:new', cb),
  onMenuExport: (cb: () => void) => ipcRenderer.on('menu:export', cb),
  onMenuImport: (cb: () => void) => ipcRenderer.on('menu:import', cb),
  aiChat: (apiUrl: string, apiKey: string, body: string) => ipcRenderer.invoke('ai:chat', apiUrl, apiKey, body),
  onAiChunk: (cb: (delta: string) => void) => { ipcRenderer.removeAllListeners('ai:chunk'); ipcRenderer.on('ai:chunk', (_e, delta) => cb(delta)) },
  onAiDone: (cb: () => void) => { ipcRenderer.removeAllListeners('ai:done'); ipcRenderer.on('ai:done', () => cb()) },
  onAiError: (cb: (msg: string) => void) => { ipcRenderer.removeAllListeners('ai:error'); ipcRenderer.on('ai:error', (_e, msg) => cb(msg)) },
  removeAiListeners: () => {
    ipcRenderer.removeAllListeners('ai:chunk')
    ipcRenderer.removeAllListeners('ai:done')
    ipcRenderer.removeAllListeners('ai:error')
  },
})
