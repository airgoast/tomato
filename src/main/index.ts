import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import * as https from 'https'
import * as http from 'http'

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

function getAppStatePath(): string {
  return join(getDataDir(), 'appState.json')
}

function getAiConfigPath(): string {
  return join(getDataDir(), 'aiConfig.json')
}

function getAiConversationsPath(): string {
  return join(getDataDir(), 'aiConversations.json')
}

function loadAppState(): string {
  const p = getAppStatePath()
  if (!existsSync(p)) return '{}'
  return readFileSync(p, 'utf-8')
}

function saveAppState(json: string): void {
  writeFileSync(getAppStatePath(), json, 'utf-8')
}

function loadAiConfig(): string {
  const p = getAiConfigPath()
  if (!existsSync(p)) return '{}'
  return readFileSync(p, 'utf-8')
}

function saveAiConfig(json: string): void {
  writeFileSync(getAiConfigPath(), json, 'utf-8')
}

function loadAiConversations(): string {
  const p = getAiConversationsPath()
  if (!existsSync(p)) return '[]'
  return readFileSync(p, 'utf-8')
}

function saveAiConversations(json: string): void {
  writeFileSync(getAiConversationsPath(), json, 'utf-8')
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
  if (isQuitting) return
  isQuitting = true
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) w.destroy()
  })
  mainWindow = null
  app.exit(0)
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

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.whenReady().then(createWindow)
}

ipcMain.handle('drafts:load', () => loadDrafts())
ipcMain.handle('drafts:save', (_e, json: string) => { saveDrafts(json); return true })
ipcMain.handle('appState:load', () => loadAppState())
ipcMain.handle('appState:save', (_e, json: string) => { saveAppState(json); return true })
ipcMain.handle('aiConfig:load', () => loadAiConfig())
ipcMain.handle('aiConfig:save', (_e, json: string) => { saveAiConfig(json); return true })
ipcMain.handle('aiConversations:load', () => loadAiConversations())
ipcMain.handle('aiConversations:save', (_e, json: string) => { saveAiConversations(json); return true })

ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    defaultPath: `灵感草稿箱-备份-${new Date().toISOString().slice(0, 10)}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}.json`,
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

ipcMain.handle('ai:chat', (event, apiUrl: string, apiKey: string, body: string) => {
  return new Promise<void>((resolve, reject) => {
    try {
      const url = new URL(apiUrl)
      const isHttps = url.protocol === 'https:'
      const mod = isHttps ? https : http
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream',
        },
      }

      const req = mod.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errBody = ''
          res.on('data', (c: Buffer) => { errBody += c.toString() })
          res.on('end', () => {
            event.sender.send('ai:error', `API 请求失败 (${res.statusCode}): ${errBody || res.statusMessage}`)
            reject(new Error(`HTTP ${res.statusCode}`))
          })
          return
        }

        let buffer = ''
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') {
              event.sender.send('ai:done')
              continue
            }
            try {
              const json = JSON.parse(data)
              const delta = json.choices?.[0]?.delta?.content
              if (delta) {
                event.sender.send('ai:chunk', delta)
              }
            } catch { continue }
          }
        })

        res.on('end', () => {
          event.sender.send('ai:done')
          resolve()
        })

        res.on('error', (err: Error) => {
          event.sender.send('ai:error', err.message)
          reject(err)
        })
      })

      req.on('error', (err: Error) => {
        event.sender.send('ai:error', err.message)
        reject(err)
      })

      req.write(body)
      req.end()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '请求异常'
      event.sender.send('ai:error', msg)
      reject(err)
    }
  })
})
