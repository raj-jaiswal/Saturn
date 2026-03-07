// Author: Divya Swaroop Jaiswal  
// Roll Number: 2401CS38

// Declaration of authorship:  
// I, Divya Swaroop Jaiswal, declare that I am the author of this 
// project and repository. All code, design and documentation in 
// this repository represent my own work unless external libraries
// are explicitly used and cited. 

import React from "react";
import { FiFolder, FiSave, FiPlay } from "react-icons/fi";
import { FaCode } from "react-icons/fa6";
import { TbPlayerTrackNext } from "react-icons/tb";
import { VscDebugRestart } from "react-icons/vsc";

export default function Taskbar({ onOpen, onSave, onAssemble, filePath, isDirty, mode, toggleMode, onRun, onStep, onReset, hasErrors }) {
  const fileName = filePath ? filePath.split("/").pop() : "untitled.asm";
  const emulatorBtnClass = `px-5 py-3 rounded-full flex items-center gap-2 bg-white text-(--bg) transition-opacity ${
    hasErrors ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 cursor-pointer"
  }`;

  return (
    <div
      className="h-16 flex items-center px-4 shadow-md bg-(--panel)"
    >
      <div className="flex items-center gap-3">
        <button onClick={onOpen} className="px-3 py-2 rounded-full hover:bg-gray-600 flex items-center gap-2 btn-muted cursor-pointer">
          <FiFolder size={18} />
          <span className="hidden md:inline" style={{ color: "var(--muted)" }}>Open</span>
        </button>

        <button onClick={onSave} className="px-3 py-2 rounded-full hover:bg-gray-600 flex items-center gap-2 btn-muted cursor-pointer">
          <FiSave size={18} />
          <span className="hidden md:inline" style={{ color: "var(--muted)" }}>Save</span>
        </button>

        <button
          onClick={() => {
            if (mode == 'code'){
              onAssemble(); 
            }
            toggleMode();
          }}
          className="px-5 py-2 rounded-full hover:opacity-90 flex items-center gap-2 cursor-pointer bg-white text-(--bg)"
        >
          {mode == 'code' ? <FiPlay size={18} /> : <FaCode size={18} />}
          <span style={{ fontWeight: 600 }}>{(mode == 'code') ? "Assemble" : "Code"}</span>
        </button>
      </div>
      <div className="mx-6 h-[70%] w-[1px]" style={{ border: "1px solid var(--border)" }}></div>
      
      {
        mode == 'listing' ? 
        <div className="flex flex-row gap-2">
          <button 
            title="Run" 
            onClick={onRun}
            disabled={hasErrors} // Prevents clicking
            className={emulatorBtnClass}
          >
            <FiPlay size={18}/>
          </button>
          <button 
            title="Step" 
            onClick={onStep}
            disabled={hasErrors}
            className={emulatorBtnClass}
          >
            <TbPlayerTrackNext size={18} />
          </button>
          <button 
            title="Reset" 
            onClick={onReset}
            disabled={hasErrors}
            className={emulatorBtnClass}
          >
            <VscDebugRestart size={18}/>
          </button>
        </div> : <></>
      }

      <div className="flex-1" />

      <div className="ml-4 px-3 py-2 rounded-md text-sm" style={{ color: "var(--muted)", border: "2px solid var(--border)" }}>
        {fileName}{isDirty && "*"}
      </div>
    </div>
  );
}