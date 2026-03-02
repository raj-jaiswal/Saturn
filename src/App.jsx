import React, { useState, useEffect, useRef } from "react";
import Taskbar from "./components/Taskbar";
import TextEditor from "./components/TextEditor";
import Console from "./components/Console";
import Registers from "./components/Registers";
import Memory from "./components/Memory";

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
    Array.from({ length: MEMORY_WORDS }).map((_, i) => "0x00000000");

  const [memory, setMemory] = useState(makeInitialMemory);

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

      // Also show any produced words (assembler still emitted them)
      if (result.words && result.words.length > 0) {
        newLines.push("--- assembled words (not loaded due to errors) ---");
        result.words.forEach((w) => {
          const addr = w.address.toString(16).toUpperCase().padStart(4, "0");
          newLines.push(`${addr}  ${w.hex}   ${w.text}`);
        });
      }

      // show labels too
      newLines.push("--- labels ---");
      Object.keys(result.labels).forEach((k) => {
        const v = result.labels[k];
        const vHex = `0x${(v >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
        newLines.push(`${k} : ${v} (${vHex})`);
      });

      setConsoleLines((c) => [...c, ...newLines]);
      return;
    }

    // no fatal errors - proceed to load
    const machine = buildState(result, MEMORY_WORDS);

    if (!machine.ok) {
      newLines.push(`ERROR: ${machine.error}`);
      setConsoleLines((c) => [...c, ...newLines]);
      return;
    }

    setMemory(machine.memory);
    setRegisters(machine.registers);

    result.words.forEach((w) => {
      const addr = w.address.toString(16).toUpperCase().padStart(4, "0");
      newLines.push(`${addr}  ${w.hex}   ${w.text}`);
    });

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

    setConsoleLines((c) => [...c, ...newLines]);
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
    if (!window.electronAPI) return;

    const removeNew = window.electronAPI.onMenuNew(() => newRef.current());
    const removeOpen = window.electronAPI.onMenuOpen(() => openRef.current());
    const removeSave = window.electronAPI.onMenuSave(() => saveRef.current());
    const removeSaveAs = window.electronAPI.onMenuSaveAs(() => saveAsRef.current());

    return () => {
      removeNew && removeNew();
      removeOpen && removeOpen();
      removeSave && removeSave();
      removeSaveAs && removeSaveAs();
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

  const appStyle = { backgroundColor: "var(--bg)", color: "var(--muted)" };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={appStyle}>
      <Taskbar
        onOpen={handleOpen}
        onSave={handleSave}
        onAssemble={handleAssemble}
        filePath={filePath}
        isDirty={isDirty}
      />

      <div className="flex flex-1 min-h-0 p-4 gap-4">
        
        <div className="flex-[3] flex flex-col gap-4 min-h-0">
          
          <div className="flex-1 min-h-0">
            <TextEditor value={content} onChange={setContent} />
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