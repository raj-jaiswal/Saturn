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

  exportBinary: (data) => ipcRenderer.invoke("export:binary", data),
  exportListing: (data) => ipcRenderer.invoke("export:listing", data),
  exportLogs: (data) => ipcRenderer.invoke("export:logs", data),
  importObject: () => ipcRenderer.invoke("import:object"),
  
  setListingMode: (isListing) =>
    ipcRenderer.send("app:setListingMode", isListing),

  // menu listeners
  onMenuExportBinary: (cb) => {
    ipcRenderer.on("menu:exportBinary", cb);
    return () => ipcRenderer.removeListener("menu:exportBinary", cb);
  },
  onMenuExportListing: (cb) => {
    ipcRenderer.on("menu:exportListing", cb);
    return () => ipcRenderer.removeListener("menu:exportListing", cb);
  },
  onMenuExportLogs: (cb) => {
    ipcRenderer.on("menu:exportLogs", cb);
    return () => ipcRenderer.removeListener("menu:exportLogs", cb);
  },
  onMenuImportObject: (cb) => {
    ipcRenderer.on("menu:importObject", cb);
    return () => ipcRenderer.removeListener("menu:importObject", cb);
  },
});