// Author: Divya Swaroop Jaiswal  
// Roll Number: 2401CS38

// Declaration of authorship:  
// I, Divya Swaroop Jaiswal, declare that I am the author of this 
// project and repository. All code, design and documentation in 
// this repository represent my own work unless external libraries
// are explicitly used and cited. 

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
import assemble, { buildState } from "../shared/assembler";
import { executeStep } from "./services/emulator.service";

function App() {
  // Variables
  const defaultContent = "# write your Simplex assembly here\n";

  const [content, setContent] = useState(defaultContent);
  const [filePath, setFilePath] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(defaultContent);

  const [consoleLines, setConsoleLines] = useState(["Welcome to Saturn!", "Layout loaded successfully."]);
  const [assemblyLogs, setAssemblyLogs] = useState([]);
  const [isHalted, setIsHalted] = useState(false);

  const [registers, setRegisters] = useState([
    { name: "A", value: "0x00000000" },
    { name: "B", value: "0x00000000" },
    { name: "PC", value: "0x00000000" },
    { name: "SP", value: "0x00000000" },
  ]);

  // memory: 16 x 1024 words initialized to 0x00000000
  const MEMORY_WORDS = 1024 * 16;
  const PAGE_SIZE = 128;

  const makeInitialMemory = () =>
    Array.from({ length: MEMORY_WORDS }).map(() => "0x00000000");

  const [memory, setMemory] = useState(makeInitialMemory);

  const [mode, setMode] = useState("code"); // "code" | "listing"
  const [assemblyResult, setAssemblyResult] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const assemblyResultRef = useRef(null);
  const assemblyLogsRef = useRef([]);

  // dirty tracking (For unsaved changes)
  useEffect(() => {
    setIsDirty(content !== lastSavedContent);
  }, [content, lastSavedContent]);

  // File Operations
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

  function handleReset() {
    if (!assemblyResult) return;
    const machine = buildState(assemblyResult, MEMORY_WORDS);
    setMemory(machine.memory);
    setRegisters(machine.registers);
    setIsHalted(false);
    setSelectedIndex(0); 
    setConsoleLines(c => [...c, "Emulator reset."]);
  }

  function handleStep() {
    if (isHalted) {
      setConsoleLines(c => [...c, "Cannot step: Emulator is halted."]);
      return;
    }

    const result = executeStep(registers, memory);

    if (result.error) {
      setConsoleLines(c => [...c, `Runtime Error: ${result.error}`]);
      setIsHalted(true);
      return;
    }

    if (result.halted) {
      setConsoleLines(c => [...c, "Program Halted."]);
      setIsHalted(true);
      return;
    }

    const programSize = assemblyResult?.words?.length || 0;

    if (result.currentPC > programSize) {
      setConsoleLines(c => [...c, "Program ended without Halt"]);
      setIsHalted(true);
      return;
    }

    setRegisters(result.registers);
    if (result.memory !== memory) setMemory(result.memory);
    setSelectedIndex(result.currentPC);
  }

  function handleRun() {
    if (isHalted) return;
    
    let currentRegs = registers;
    let currentMem = memory;
    let halted = false;
    let stepCount = 0;
    const MAX_STEPS = 10000; // Safeguard against infinite loops

    while (!halted && stepCount < MAX_STEPS) {
      const result = executeStep(currentRegs, currentMem);
      
      if (result.error) {
        setConsoleLines(c => [...c, `Runtime Error: ${result.error}`]);
        halted = true;
        break;
      }
      
      if (result.halted) {
        setConsoleLines(c => [...c, "Program Halted cleanly."]);
        halted = true;
        break;
      }
      
      const programSize = assemblyResult?.words?.length || 0;

      if (result.currentPC > programSize) {
        setConsoleLines(c => [...c, "Program ended without Halt"]);
        halted = true;
        break;
      }

      currentRegs = result.registers;
      currentMem = result.memory;
      stepCount++;
    }

    // Batch update React state once at the end of the loop
    setRegisters(currentRegs);
    setMemory(currentMem);
    setIsHalted(halted);
    
    if (stepCount >= MAX_STEPS) {
      setConsoleLines(c => [...c, `Execution paused after ${MAX_STEPS} steps to prevent freezing. Check for infinite loop`]);
    }

    // Update highlight to wherever it stopped
    const finalPCInt = parseInt(currentRegs.find(r => r.name === "PC").value, 16);
    setSelectedIndex(finalPCInt);
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

  // Main assembly handler
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

    // Load to memory if no Errors
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

  // Handlers for all the Electron Window menu
  const saveRef = useRef();
  const openRef = useRef();
  const newRef = useRef();
  const saveAsRef = useRef();
  const closeHandlerRef = useRef();
  const memoryRef = useRef([]);

  saveRef.current = handleSave;
  openRef.current = handleOpen;
  newRef.current = handleNewFile;
  saveAsRef.current = handleSaveAs;

  // close handler uses freshest state
  // This basically checks for unsaved content, but the function is updated regularly.
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
    memoryRef.current = memory;
  }, [memory]);

  // Electron Menu Options
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
          words: JSON.parse(JSON.stringify(r.words || [])),
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

    const removeAppClose = window.electronAPI.onAppClose(() => {
      closeHandlerRef.current();
    });

    const removeHexdump = window.electronAPI.onMenuHexdump(() => {
      window.electronAPI.exportHexdump(memoryRef.current);
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
      removeAppClose && removeAppClose();
      removeHexdump && removeHexdump();
    };
  }, []);

  useEffect(() => {
    window.electronAPI?.setListingMode(false);
  }, []);

  // CLI Handlers
  useEffect(() => {
    if (!window.electronAPI) return;

    const removeCLIOpenFile = window.electronAPI.onCLIOpenFile((filePath) => {
      // read file via electronAPI.readFile and set content then open editor / assemble
      window.electronAPI.readFile(filePath).then(content => {
        setContent(content);
        setFilePath(filePath);
        setMode("code");
      });
    });

    const removeCLIImportObject = window.electronAPI.onCLIImportObject((filePath) => {
      // ask main to import object file (we created import handler earlier)
      window.electronAPI.importObjectFile(filePath).then((result) => {
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
      removeCLIOpenFile && removeCLIOpenFile();
      removeCLIImportObject && removeCLIImportObject();
    };
  }, []);

  const currentPC = Number.parseInt(registers.find(r => r.name === "PC")?.value, 16);
  const hasErrors = assemblyResult?.errors?.length > 0;

  const appStyle = { backgroundColor: "var(--bg)", color: "var(--muted)" };

  // Overall UI
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
        onRun={handleRun}
        onStep={handleStep}
        onReset={handleReset}
        hasErrors={hasErrors}
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
                pc={currentPC}
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