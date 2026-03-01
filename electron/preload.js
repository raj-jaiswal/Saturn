const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // file operations
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (filePath, content) => ipcRenderer.invoke("file:save", filePath, content),
  saveFileAs: (content) => ipcRenderer.invoke("file:saveAs", content),
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),

  // menu events
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

  onAppClose: (cb) => {
    ipcRenderer.on("app:close", cb);
    return () => ipcRenderer.removeListener("app:close", cb);
  },

  // dialogs & confirm
  showUnsavedDialog: () => ipcRenderer.invoke("dialog:unsaved"),
  confirmClose: (val) => ipcRenderer.invoke("app:confirmClose", val),
});