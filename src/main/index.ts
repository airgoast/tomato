import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

function getDataDir(): string {
  const dir = join(app.getPath('userData'), 'drafts')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getDraftsPath(): string {
  return join(getDataDir(), 'drafts.json')
}

function loadDrafts(): string {
  const p = getDraftsPath()
  if (!existsSync(p)) {
    writeFileSync(p, '[]', 'utf-8')
    return '[]'
  }
  return readFileSync(p, 'utf-8')
}

function saveDrafts(json: string): void {
  writeFileSync(getDraftsPath(), json, 'utf-8')
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '新建灵感', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new') },
        { type: 'separator' },
        { label: '导出备份', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:export') },
        { label: '导入备份', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:import') },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => forceQuit() },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '重置缩放', role: 'resetZoom' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于灵感草稿箱', click: () => mainWindow?.webContents.send('menu:about') },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '灵感草稿箱',
    icon: join(__dirname, '../../resources/icon.ico'),
    frame: false,
    show: false,
    backgroundColor: '#faf6f0',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  createMenu()

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function forceQuit(): void {
  isQuitting = true
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy()
    mainWindow = null
  }
  app.quit()
}

app.on('before-quit', (e) => {
  if (isQuitting) return
  e.preventDefault()
  forceQuit()
})

app.on('window-all-closed', () => {
  forceQuit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

app.whenReady().then(createWindow)

ipcMain.handle('drafts:load', () => loadDrafts())
ipcMain.handle('drafts:save', (_e, json: string) => { saveDrafts(json); return true })

ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    defaultPath: `灵感草稿箱-备份-${new Date().toISOString().slice(0, 10)}.json`,
  })
  return result.canceled ? null : result.filePath
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
})

ipcMain.handle('drafts:export', (_e, filePath: string, json: string) => {
  writeFileSync(filePath, json, 'utf-8')
  return true
})

ipcMain.handle('drafts:import', (_e, filePath: string) => {
  return readFileSync(filePath, 'utf-8')
})

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => forceQuit())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())
