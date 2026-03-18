const { app, BrowserWindow } = require("electron")

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true
    }
  })

  win.loadURL("http://localhost:8081/")
}

app.whenReady().then(createWindow)