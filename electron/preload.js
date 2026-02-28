const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),

  saveFile: (filePath, content) =>
    ipcRenderer.invoke("file:save", filePath, content),

  saveFileAs: (content) =>
    ipcRenderer.invoke("file:saveAs", content),

  readFile: (filePath) =>
    ipcRenderer.invoke("file:read", filePath),

  onMenuOpen: (cb) => {
    ipcRenderer.on("menu:open", cb);
    return () => ipcRenderer.removeListener("menu:open", cb);
  },

  onMenuSave: (cb) => {
    ipcRenderer.on("menu:save", cb);
    return () => ipcRenderer.removeListener("menu:save", cb);
  },

  onMenuSaveAs: (cb) => {
    ipcRenderer.on("menu:saveAs", cb);
    return () => ipcRenderer.removeListener("menu:saveAs", cb);
  },

  onMenuNew: (cb) => {
    ipcRenderer.on("menu:new", cb);
    return () => ipcRenderer.removeListener("menu:new", cb);
  },
});