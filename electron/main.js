import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "./logo.png"),
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  createMenu(win);
}

function createMenu(win) {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New",
          accelerator: "Ctrl+N",
          click: () => win.webContents.send("menu:new"),
        },
        {
          label: "Open",
          accelerator: "Ctrl+O",
          click: () => win.webContents.send("menu:open"),
        },
        {
          label: "Save",
          accelerator: "Ctrl+S",
          click: () => win.webContents.send("menu:save"),
        },
        {
          label: "Save As",
          accelerator: "Ctrl+Shift+S",
          click: () => win.webContents.send("menu:saveAs"),
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },

    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },

    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "togglefullscreen" },
      ],
    },

    {
      label: "Help",
      submenu: [
        {
          label: "About Saturn",
          click: () => {
            win.webContents.send("menu:about");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

// IPC handlers for file dialogs and fs
ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Assembly", extensions: ["asm", "txt"] }],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, "utf-8");
  return { path: filePath, content };
});

ipcMain.handle("file:save", async (event, filePath, content) => {
  if (!filePath) return null;
  await fs.writeFile(filePath, content, "utf-8");
  return { path: filePath };
});

ipcMain.handle("file:saveAs", async (event, content) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: "Assembly", extensions: ["asm", "txt"] }],
  });

  if (result.canceled || !result.filePath) return null;

  await fs.writeFile(result.filePath, content, "utf-8");
  return { path: result.filePath };
});

ipcMain.handle("file:read", async (event, filePath) => {
  const content = await fs.readFile(filePath, "utf-8");
  return content;
});
