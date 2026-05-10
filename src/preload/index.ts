import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  loadDrafts: () => ipcRenderer.invoke('drafts:load'),
  saveDrafts: (json: string) => ipcRenderer.invoke('drafts:save', json),
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
})
