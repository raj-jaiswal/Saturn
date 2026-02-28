import React, { useState, useEffect, useRef } from "react";
import Taskbar from "./components/Taskbar";
import TextEditor from "./components/TextEditor";
import Console from "./components/Console";
import Registers from "./components/Registers";
import Memory from "./components/Memory";

import {
  openFile as fsOpen,
  saveFile as fsSave,
  saveFileAs as fsSaveAs,
} from "./services/file.service";

function App() {
  const [content, setContent] = useState("// write your Simplex assembly here\n");
  const [filePath, setFilePath] = useState(null);
  const [consoleLines, setConsoleLines] = useState([
    "Welcome to Saturn!",
    "Layout loaded successfully.",
  ]);

  const [registers] = useState(() =>
    [
      {name: 'A', value: '0x00000000'},
      {name: 'B', value: '0x00000000'},
      {name: 'PC', value: '0x00000000'},
      {name: 'SP', value: '0x00000000'},
    ]
  );

  async function handleOpen() {
    const res = await fsOpen();
    if (res && res.content !== undefined) {
      setContent(res.content);
      setFilePath(res.path);
      setConsoleLines((c) => [...c, `Opened ${res.path}`]);
    } else {
      setConsoleLines((c) => [...c, "Open cancelled or not available."]);
    }
  }

  async function handleSave() {
    let res;

    if (filePath) {
      // Overwrite existing file
      res = await fsSave(filePath, content);
    } else {
      // First save → Save As
      res = await fsSaveAs(content);
    }

    if (res?.path) {
      setFilePath(res.path);
      setConsoleLines((c) => [...c, `Saved to ${res.path}`]);
    } else {
      setConsoleLines((c) => [...c, "Save cancelled"]);
    }
  }

  async function handleSaveAs() {
    const res = await fsSaveAs(content);

    if (res?.path) {
      setFilePath(res.path);
      setConsoleLines((c) => [...c, `Saved as ${res.path}`]);
    } else {
      setConsoleLines((c) => [...c, "Save As cancelled"]);
    }
  }

  function handleNewFile() {
    setContent("// write your Simplex assembly here\n");
    setFilePath(null);
    setConsoleLines((c) => [...c, "New file created"]);
  }

  function handleAssemble() {
    setConsoleLines((c) => [...c, "Assemble invoked (placeholder)."]);
  }

  const saveRef = useRef();
  const openRef = useRef();
  const newRef = useRef();
  const saveAsRef = useRef();

  // Keep refs updated each render
  saveRef.current = handleSave;
  openRef.current = handleOpen;
  newRef.current = handleNewFile;
  saveAsRef.current = handleSaveAs;

  // Register menu listeners ONCE
  useEffect(() => {
    if (!window.electronAPI) return;

    const removeNew = window.electronAPI.onMenuNew(() => {
      newRef.current();
    });

    const removeOpen = window.electronAPI.onMenuOpen(() => {
      openRef.current();
    });

    const removeSave = window.electronAPI.onMenuSave(() => {
      saveRef.current();
    });

    const removeSaveAs = window.electronAPI.onMenuSaveAs(() => {
      saveAsRef.current();
    });

    return () => {
      removeNew();
      removeOpen();
      removeSave();
      removeSaveAs();
    };
  }, []);


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Taskbar
        onOpen={handleOpen}
        onSave={handleSave}
        onAssemble={handleAssemble}
        filePath={filePath}
      />

      <div className="flex h-[calc(100vh-64px)] p-4 gap-4">
        {/* Left: 70% */}
        <div className="flex-7 flex flex-col gap-4" style={{ flex: "0 0 70%" }}>
          <div className="flex-1">
            <TextEditor value={content} onChange={setContent} />
          </div>
          <div className="h-40">
            <Console lines={consoleLines} />
          </div>
        </div>

        {/* Right: 30% */}
        <div className="flex-3 flex flex-col gap-4" style={{ flex: "0 0 30%" }}>
          <Registers registers={registers} />
          <Memory />
        </div>
      </div>
    </div>
  );
}

export default App;