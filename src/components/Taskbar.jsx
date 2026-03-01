import React from "react";
import { FiFolder, FiSave, FiPlay, FiRefreshCw } from "react-icons/fi";

export default function Taskbar({ onOpen, onSave, onAssemble, filePath, isDirty }) {
  const fileName = filePath ? filePath.split("/").pop() : "untitled.asm";

  return (
    <div className="h-16 bg-gradient-to-r from-gray-800 to-gray-700 flex items-center px-4 shadow-md">
      <div className="flex items-center gap-3">
        <button onClick={onOpen} className="px-3 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2">
          <FiFolder size={18} />
          <span className="hidden md:inline">Open</span>
        </button>

        <button onClick={onSave} className="px-3 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2">
          <FiSave size={18} />
          <span className="hidden md:inline">Save</span>
        </button>

        <button
          onClick={onAssemble}
          className="px-3 py-2 rounded-md bg-amber-500 text-black hover:opacity-90 flex items-center gap-2"
        >
          <FiPlay size={18} />
          <span>Assemble</span>
        </button>
      </div>

      <div className="flex-1" />

      <div className="ml-4 px-3 py-2 rounded-md bg-gray-800 text-sm text-gray-300">
        {fileName}{isDirty && "*"}
      </div>
    </div>
  );
}