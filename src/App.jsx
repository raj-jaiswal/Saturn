import React, { useState, useEffect, useRef } from "react";
import Taskbar from "./components/Taskbar";
import TextEditor from "./components/TextEditor";
import Console from "./components/Console";
import Registers from "./components/Registers";
import Memory from "./components/Memory";

import "./App.css";
import "./index.css";

import { openFile as fsOpen, saveFile as fsSave, saveFileAs as fsSaveAs } from "./services/file.service";

function App() {
  const defaultContent = "// write your Simplex assembly here\n";

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

  // memory: 1024 words initialized to 0x00000000
  const MEMORY_WORDS = 1024;
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
    setConsoleLines((c) => [...c, "Assemble invoked (placeholder)."]);
  }

  // register update handler
  function updateRegister(name, newValue) {
    setRegisters((prev) => prev.map((r) => (r.name === name ? { ...r, value: newValue } : r)));
    setConsoleLines((c) => [...c, `Register ${name} set to ${newValue}`]);
  }

  // memory update handler. index is absolute memory index [0..1023]
  function updateMemory(index, newValue) {
    setMemory((prev) => {
      const copy = prev.slice();
      copy[index] = newValue;
      return copy;
    });
    setConsoleLines((c) => [...c, `Memory[0x${(index * 4).toString(16)}] = ${newValue}`]);
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
    <div className="min-h-screen" style={appStyle}>
      <Taskbar
        onOpen={handleOpen}
        onSave={handleSave}
        onAssemble={handleAssemble}
        filePath={filePath}
        isDirty={isDirty}
      />

      <div className="flex h-[calc(100vh-64px)] p-4 gap-4">
        <div className="flex-[3] flex flex-col gap-4">
          <div className="flex-1">
            <TextEditor value={content} onChange={setContent} />
          </div>
          <div className="h-40">
            <Console lines={consoleLines} setLines={setConsoleLines} />
          </div>
        </div>

        <div className="flex-[1] flex flex-col gap-4">
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