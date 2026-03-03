import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import assemble from "./assembler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runHeadlessAssemble(filePath) {
  try {
    const src = await fs.readFile(filePath, "utf-8");
    const result = assemble(src);

    const base = path.basename(filePath, path.extname(filePath));
    const dir = path.dirname(filePath);

    const lpath = path.join(dir, base + ".l");
    const opath = path.join(dir, base + ".o");
    const logpath = path.join(dir, base + ".log");

    // Listing
    const lines = (result.words || []).map((w) => {
      const addr = w.address.toString(16).padStart(4, "0");
      return `${addr}  ${w.hex}   ${w.text}`;
    });

    await fs.writeFile(lpath, lines.join("\n"), "utf-8");

    // Object
    const buffer = Buffer.alloc((result.words || []).length * 4);
    (result.words || []).forEach((w, i) => {
      const val = parseInt(w.hex, 16) >>> 0;
      buffer.writeUInt32LE(val, i * 4);
    });

    await fs.writeFile(opath, buffer);

    // Logs
    const logs = [];
    logs.push("=== Assemble output ===");

    if (result.errors?.length) {
      logs.push("ERRORS:");
      result.errors.forEach(e => logs.push(`ERR: ${e}`));
    }

    if (result.warnings?.length) {
      logs.push("--- warnings ---");
      result.warnings.forEach(w => logs.push(`WARN: ${w}`));
    }

    logs.push("--- labels ---");
    Object.keys(result.labels || {}).forEach(k => {
      const v = result.labels[k];
      logs.push(`${k} : ${v}`);
    });

    if (!result.errors?.length) logs.push("Program assembled.");

    await fs.writeFile(logpath, logs.join("\n"), "utf-8");

    console.log(`Wrote:\n\t${lpath}\n\t${opath}\n\t${logpath}`);
  } catch (err) {
    console.error("Failed:", err.message || err);
  }

  app.exit();
}

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

  win._allowClose = false;
  win.on("close", (e) => {
    if (win._allowClose) return; // allow normal close
    e.preventDefault();

    win.webContents.send("app:close");
  });
  createMenu(win);

  const pendingArgs = process.argv.slice(1); // packaged executables include exec + exe path; adjust as needed

  // simple parser: support --open=path or --import=path or plain file path
  for (const a of pendingArgs) {
    if (!a) continue;
    if (a.startsWith("--open=")) {
      const file = a.slice("--open=".length);
      win.webContents.once("did-finish-load", () => {
        win.webContents.send("cli:open-file", file);
      });
    } else if (a.startsWith("--import=")) {
      const file = a.slice("--import=".length);
      win.webContents.once("did-finish-load", () => {
        win.webContents.send("cli:import-object", file);
      });
    } else if (a.endsWith(".asm") || a.endsWith(".o")) {
      // treat plain file path as open/import based on extension
      const file = a;
      win.webContents.once("did-finish-load", () => {
        if (file.endsWith(".asm")) win.webContents.send("cli:open-file", file);
        else win.webContents.send("cli:import-object", file);
      });
    }
  }
}

function createMenu(win) {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "New", accelerator: "Ctrl+N", click: () => win.webContents.send("menu:new") },
        { label: "Open", accelerator: "Ctrl+O", click: () => win.webContents.send("menu:open") },
        { label: "Save", accelerator: "Ctrl+S", click: () => win.webContents.send("menu:save") },
        { label: "Save As", accelerator: "Ctrl+Shift+S", click: () => win.webContents.send("menu:saveAs") },
        { type: "separator" },
        {
          label: "Export Binary (.o)",
          id: "exportBinary",
          enabled: false,
          click: () => win.webContents.send("menu:exportBinary")
        },
        {
          label: "Export Listing (.l)",
          id: "exportListing",
          enabled: false,
          click: () => win.webContents.send("menu:exportListing")
        },
        {
          label: "Export Logs (.log)",
          id: "exportLogs",
          enabled: false,
          click: () => win.webContents.send("menu:exportLogs")
        },
        { type: "separator" },
        {
          label: "Import Object File (.o)",
          click: () => win.webContents.send("menu:importObject")
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }],
    },
    {
      label: "View",
      submenu: [{ role: "toggleDevTools" }, { role: "reload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "togglefullscreen" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About Saturn",
            click: () => {
              shell.openExternal("https://github.com/raj-jaiswal/Saturn");
            },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  const args = process.argv.slice(1);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`saturn - Simplex assembler tool

Usage:
  saturn <file.asm>            assemble file, produces .o, .l, .log
  saturn --open=<file.asm>     open file in GUI
  saturn --import=<file.o>     open object file in GUI
  saturn --help                show this help
`);
    app.exit();
    return;
  }

  // If plain .asm without --open → headless assemble
  const plainAsm = args.find(a => a.endsWith(".asm"));
  const hasOpenFlag = args.some(a => a.startsWith("--open="));

  if (plainAsm && !hasOpenFlag) {
    await runHeadlessAssemble(path.resolve(plainAsm));
    return;
  }

  // Otherwise open GUI
  createWindow();
});

// ------------------ File dialog / FS handlers (unchanged) ------------------
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

// ------------------ Unsaved changes dialog ------------------
ipcMain.handle("dialog:unsaved", async () => {
  const result = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Save", "Don't Save", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    message: "You have unsaved changes.",
    detail: "Do you want to save before closing?",
  });

  if (result.response === 0) return "save";
  if (result.response === 1) return "dontsave";
  return "cancel";
});

ipcMain.handle("app:confirmClose", (event, shouldClose) => {
  if (!shouldClose) return; // do nothing if user cancelled

  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  // set per-window flag and close
  win._allowClose = true;
  win.close();
});

ipcMain.on("app:setListingMode", (event, isListing) => {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;

  const binary = menu.getMenuItemById("exportBinary");
  const listing = menu.getMenuItemById("exportListing");
  const logs = menu.getMenuItemById("exportLogs");

  if (binary) binary.enabled = isListing;
  if (listing) listing.enabled = isListing;
  if (logs) logs.enabled = isListing;
});

ipcMain.handle("export:binary", async (event, words) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: "Object", extensions: ["o"] }]
  });

  if (result.canceled || !result.filePath) return;

  const buffer = Buffer.alloc(words.length * 4);

  words.forEach((w, i) => {
    const value = parseInt(w.hex, 16);
    buffer.writeUInt32LE(value >>> 0, i * 4);
  });

  await fs.writeFile(result.filePath, buffer);
});

ipcMain.handle("export:listing", async (event, payload) => {
  const { words = [], warnings = [], errors = [] } = payload || {};
  const result = await dialog.showSaveDialog({
    filters: [{ name: "Listing", extensions: ["l"] }]
  });

  if (result.canceled || !result.filePath) return;

  function statusFor(word, index) {
    const ln = word.lineno;

    const e = errors.find((s) => s.includes(`Line ${ln}`));
    if (e) return `ERR: ${e}`;

    const w = warnings.find((s) => s.includes(`Line ${ln}`));
    if (w) return `WARN: ${w}`;

    if (index === 0) {
      const globalWarning = warnings.find((s) => !s.includes("Line "));
      if (globalWarning) {
        return `WARN: ${globalWarning}`;
      }
    }

    return "";
  }

  const lines = words.map((w, idx) => {
    const status = statusFor(w, idx);
    const addr = w.address.toString(16).padStart(4, "0");
    return `${addr}  ${w.hex}   ${w.text}${status ? "   " + status : ""}`;
  });

  await fs.writeFile(result.filePath, lines.join("\n"), "utf-8");
});

ipcMain.handle("export:logs", async (event, logs) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: "Log", extensions: ["log"] }]
  });

  if (result.canceled || !result.filePath) return;

  await fs.writeFile(result.filePath, logs.join("\n"), "utf-8");
});

ipcMain.handle("import:object", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Object", extensions: ["o"] }]
  });

  if (result.canceled || !result.filePaths.length) return null;

  try {
    const buffer = await fs.readFile(result.filePaths[0]);

    // must be multiple of 4 bytes
    if (buffer.length % 4 !== 0) return { error: true };

    const words = [];

    for (let i = 0; i < buffer.length; i += 4) {
      const value = buffer.readUInt32LE(i);

      words.push({
        address: i / 4,
        hex: (value >>> 0).toString(16).toUpperCase().padStart(8, "0"),
        text: "",        // blank instruction
        lineno: 0        // no source line
      });
    }

    return { words };
  } catch {
    return { error: true };
  }
});

ipcMain.handle("import:object-from-path", async (event, filePath) => {
  try {
    const buffer = await fs.readFile(filePath);

    if (buffer.length % 4 !== 0) return { error: true };

    const words = [];

    for (let i = 0; i < buffer.length; i += 4) {
      const value = buffer.readUInt32LE(i);
      words.push({
        address: i / 4,
        hex: (value >>> 0).toString(16).toUpperCase().padStart(8, "0"),
        text: "",
        lineno: 0
      });
    }

    return { words };
  } catch {
    return { error: true };
  }
});