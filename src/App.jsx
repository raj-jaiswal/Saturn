import React, { useState } from "react";
import Taskbar from "./components/Taskbar";
import TextEditor from "./components/TextEditor";
import Console from "./components/Console";
import Registers from "./components/Registers";
import Memory from "./components/Memory";
import { openFile as fsOpen, saveFile as fsSave } from "./services/file.service";

function App() {
  const [content, setContent] = useState("// write your Simplex assembly here\n");
  const [filePath, setFilePath] = useState(null);
  const [consoleLines, setConsoleLines] = useState([
    "Welcome to Saturn!",
    "Layout loaded — ready.",
  ]);
  const [registers, setRegisters] = useState(() =>
    Array.from({ length: 8 }).map((_, i) => ({ name: `R${i}`, value: "0x0000" }))
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
    const res = await fsSave(filePath, content);
    if (res && res.path) {
      setFilePath(res.path);
      setConsoleLines((c) => [...c, `Saved to ${res.path}`]);
    } else {
      setConsoleLines((c) => [...c, "Save cancelled or not available."]);
    }
  }

  function handleAssemble() {
    // placeholder: we'll replace with real two-pass assembler later
    setConsoleLines((c) => [...c, "Assemble invoked (placeholder)."]);
  }

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
