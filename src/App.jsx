import React, { useState, useEffect, useRef } from "react";
import Taskbar from "./components/Taskbar";
import TextEditor from "./components/TextEditor";
import Console from "./components/Console";
import Registers from "./components/Registers";
import Memory from "./components/Memory";
import Listing from "./components/Listing";

import "./App.css";
import "./index.css";

import { openFile as fsOpen, saveFile as fsSave, saveFileAs as fsSaveAs } from "./services/file.service";
import assemble, { buildState } from "./services/assembler.service";

function App() {
  const defaultContent = "# write your Simplex assembly here\n";

  const [content, setContent] = useState(defaultContent);
  const [filePath, setFilePath] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(defaultContent);

  const [consoleLines, setConsoleLines] = useState(["Welcome to Saturn!", "Layout loaded successfully."]);
  const [assemblyLogs, setAssemblyLogs] = useState([]);

  const [registers, setRegisters] = useState([
    { name: "A", value: "0x00000000" },
    { name: "B", value: "0x00000000" },
    { name: "PC", value: "0x00000000" },
    { name: "SP", value: "0x00000000" },
  ]);

  // memory: 4096 words initialized to 0x00000000
  const MEMORY_WORDS = 1024 * 4;
  const PAGE_SIZE = 128;

  const makeInitialMemory = () =>
    Array.from({ length: MEMORY_WORDS }).map(() => "0x00000000");

  const [memory, setMemory] = useState(makeInitialMemory);

  const [mode, setMode] = useState("code"); // "code" | "listing"
  const [assemblyResult, setAssemblyResult] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const assemblyResultRef = useRef(null);
  const assemblyLogsRef = useRef([]);

  // dirty tracking
  useEffect(() => {
    setIsDirty(content !== lastSavedContent);
  }, [content, lastSavedContent]);

  async function handleOpen() {
    if (isDirty) {
      const choice = await window.electronAPI.showUnsavedDialog();
      if (choice === "save") {
        await handleSave();
      } else if (choice === "cancel") {
        return;
      }
    }

    const res = await fsOpen();
    if (res && res.content !== undefined) {
      setContent(res.content);
      setLastSavedContent(res.content);
      setFilePath(res.path);
      setConsoleLines((c) => [...c, `Opened ${res.path}`]);
      setMode("code");
    }
  }

  async function handleSave() {
    let res;
    if (filePath) {
      res = await fsSave(filePath, content);
    } else {
      res = await fsSaveAs(content);
    }
    if (res?.path) {
      setFilePath(res.path);
      setLastSavedContent(content);
      setConsoleLines((c) => [...c, `Saved to ${res.path}`]);
    }
  }

  async function handleSaveAs() {
    const res = await fsSaveAs(content);
    if (res?.path) {
      setFilePath(res.path);
      setLastSavedContent(content);
      setConsoleLines((c) => [...c, `Saved as ${res.path}`]);
    }
  }

  async function handleNewFile() {
    if (isDirty) {
      const choice = await window.electronAPI.showUnsavedDialog();
      if (choice === "save") {
        await handleSave();
      } else if (choice === "cancel") {
        return;
      }
    }

    setContent(defaultContent);
    setLastSavedContent(defaultContent);
    setFilePath(null);
    setConsoleLines((c) => [...c, "New file created"]);
  }

  function handleAssemble() {
    const result = assemble(content);

    // save result so Listing can show words, even when there are errors
    setAssemblyResult(result);
    window.electronAPI.setListingMode(true);
    
    const newLines = [];
    newLines.push("=== Assemble output ===");

    // If the assembler produced errors, show them and do not load program
    if (result.errors && result.errors.length > 0) {
      newLines.push("ERRORS:");
      result.errors.forEach((e) => newLines.push(`ERR: ${e}`));

      if (result.warnings && result.warnings.length > 0) {
        newLines.push("--- warnings ---");
        result.warnings.forEach((w) => newLines.push(`WARN: ${w}`));
      }

      // show labels too
      newLines.push("--- labels ---");
      Object.keys(result.labels).forEach((k) => {
        const v = result.labels[k];
        const vHex = `0x${(v >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
        newLines.push(`${k} : ${v} (${vHex})`);
      });

      setAssemblyLogs(newLines);
      setConsoleLines((c) => [...c, ...newLines]);
      return;
    }

    // no fatal errors - proceed to load
    const machine = buildState(result, MEMORY_WORDS);

    if (!machine.ok) {
      newLines.push(`ERROR: ${machine.error}`);
      setAssemblyLogs(newLines);
      setConsoleLines((c) => [...c, ...newLines]);
      return;
    }

    setMemory(machine.memory);
    setRegisters(machine.registers);

    if (result.warnings.length) {
      newLines.push("--- warnings ---");
      result.warnings.forEach((s) => newLines.push(`WARN: ${s}`));
    }

    // print labels map
    newLines.push("--- labels ---");
    Object.keys(result.labels).forEach((k) => {
      const v = result.labels[k];
      const vHex = `0x${(v >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
      newLines.push(`${k} : ${v} (${vHex})`);
    });

    newLines.push(`Program loaded. PC=0x00000000, SP=${machine.registers[3].value}`);

    setAssemblyLogs(newLines);
    setConsoleLines((c) => [...c, ...newLines]);
    setMode("listing");
  }

  function toggleMode() {
    if (mode == 'code'){
      setMode('listing');
      window.electronAPI.setListingMode(true);
    }
    else{
      setMode('code');
      window.electronAPI.setListingMode(false);
    }
  }

  // register update handler
  function updateRegister(name, newValue) {
    setRegisters((prev) => prev.map((r) => (r.name === name ? { ...r, value: newValue } : r)));
    setConsoleLines((c) => [...c, `Register ${name} set to ${newValue}`]);
  }

  // memory update handler. index is absolute memory index
  function updateMemory(index, newValue) {
    setMemory((prev) => {
      const copy = prev.slice();
      copy[index] = newValue;
      return copy;
    });
    setConsoleLines((c) => [...c, `Memory[0x${(index).toString(16)}] = ${newValue}`]);
  }

  const saveRef = useRef();
  const openRef = useRef();
  const newRef = useRef();
  const saveAsRef = useRef();
  const closeHandlerRef = useRef();

  saveRef.current = handleSave;
  openRef.current = handleOpen;
  newRef.current = handleNewFile;
  saveAsRef.current = handleSaveAs;

  // close handler uses freshest state
  closeHandlerRef.current = async () => {
    if (!isDirty) {
      await window.electronAPI.confirmClose(true);
      return;
    }

    const choice = await window.electronAPI.showUnsavedDialog();

    if (choice === "save") {
      await handleSave();
      await window.electronAPI.confirmClose(true);
    } else if (choice === "dontsave") {
      await window.electronAPI.confirmClose(true);
    } else {
      await window.electronAPI.confirmClose(false);
    }
  };

  useEffect(() => {
    assemblyResultRef.current = assemblyResult;
  }, [assemblyResult]);

  useEffect(() => {
    assemblyLogsRef.current = assemblyLogs;
  }, [assemblyLogs]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const removeNew = window.electronAPI.onMenuNew(() => newRef.current());
    const removeOpen = window.electronAPI.onMenuOpen(() => openRef.current());
    const removeSave = window.electronAPI.onMenuSave(() => saveRef.current());
    const removeSaveAs = window.electronAPI.onMenuSaveAs(() => saveAsRef.current());
    const removeExportBinary =
      window.electronAPI.onMenuExportBinary(() => {
        const words = assemblyResultRef.current?.words || [];
        window.electronAPI.exportBinary(words);
      });

    const removeExportListing =
      window.electronAPI.onMenuExportListing(() => {
        const r = assemblyResultRef.current || {};
        window.electronAPI.exportListing({
          words: r.words || [],
          warnings: r.warnings || [],
          errors: r.errors || []
        });
      });

    const removeExportLogs =
      window.electronAPI.onMenuExportLogs(() => {
        window.electronAPI.exportLogs(assemblyLogsRef.current || []);
      });

    const removeImportObject =
      window.electronAPI.onMenuImportObject(async () => {
        const result = await window.electronAPI.importObject();

        if (!result || result.error) {
          setConsoleLines(c => [...c, "Invalid File"]);
          return;
        }

        setAssemblyResult({
          words: result.words,
          warnings: [],
          errors: [],
          labels: {}
        });

        setAssemblyLogs(["Object file loaded"]);
        setMode("listing");
      });

    return () => {
      removeNew && removeNew();
      removeOpen && removeOpen();
      removeSave && removeSave();
      removeSaveAs && removeSaveAs();

      removeExportBinary && removeExportBinary();
      removeExportListing && removeExportListing();
      removeExportLogs && removeExportLogs();
      removeImportObject && removeImportObject();
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;

    const remove = window.electronAPI.onAppClose(() => {
      closeHandlerRef.current();
    });

    return () => {
      remove && remove();
    };
  }, []); 

  useEffect(() => {
    window.electronAPI?.setListingMode(false);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;

    const remove1 = window.electronAPI.onCLIOpenFile((filePath) => {
      // read file via electronAPI.readFile and set content then open editor / assemble
      window.electronAPI.readFile(filePath).then(content => {
        setContent(content);
        setFilePath(filePath);
        setMode("code");
      });
    });

    const remove2 = window.electronAPI.onCLIImportObject((filePath) => {
      // ask main to import object file (we created import handler earlier)
      window.electronAPI.importObject(filePath).then((result) => {
        if (!result || result.error) {
          setConsoleLines(c => [...c, "Invalid File"]);
          return;
        }
        setAssemblyResult({ words: result.words, warnings: [], errors: [], labels: {} });
        setMode("listing");
        window.electronAPI.setListingMode(true);
      });
    });

    return () => {
      remove1 && remove1();
      remove2 && remove2();
    };
  }, []);

  const appStyle = { backgroundColor: "var(--bg)", color: "var(--muted)" };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={appStyle}>
      <Taskbar
        onOpen={handleOpen}
        onSave={handleSave}
        onAssemble={handleAssemble}
        filePath={filePath}
        isDirty={isDirty}
        mode={mode}
        toggleMode={toggleMode}
      />

      <div className="flex flex-1 min-h-0 p-4 gap-4">

        <div className="flex-[3] flex flex-col gap-4 min-h-0">

          <div className="flex-1 min-h-0">
            {mode === "code" ? (
              <TextEditor value={content} onChange={setContent} />
            ) : (
              <Listing
                words={assemblyResult?.words || []}
                warnings={assemblyResult?.warnings || []}
                errors={assemblyResult?.errors || []}
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
              />
            )}
          </div>
          <div className="h-40">
            <Console lines={consoleLines} setLines={setConsoleLines} />
          </div>
        </div>

        <div className="flex-[1] flex flex-col gap-4 min-h-0">
          <Registers registers={registers} onUpdateRegister={updateRegister} />
          <Memory
            memory={memory}
            pageSize={PAGE_SIZE}
            onUpdateMemory={updateMemory}
          />
        </div>

      </div>
    </div>
  );
}

export default App;