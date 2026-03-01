import React from "react";
import { FiFolder, FiSave, FiPlay } from "react-icons/fi";

export default function Taskbar({ onOpen, onSave, onAssemble, filePath, isDirty }) {
  const fileName = filePath ? filePath.split("/").pop() : "untitled.asm";

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
          onClick={onAssemble}
          className="px-5 py-2 rounded-full hover:opacity-90 flex items-center gap-2 cursor-pointer bg-white text-(--bg)"
        >
          <FiPlay size={18} />
          <span style={{ fontWeight: 600 }}>Assemble</span>
        </button>
      </div>
      <div className="mx-6 h-[70%] w-[1px]" style={{ border: "1px solid var(--border)" }}></div>

      <div className="flex-1" />

      <div className="ml-4 px-3 py-2 rounded-md text-sm" style={{ color: "var(--muted)", border: "2px solid var(--border)" }}>
        {fileName}{isDirty && "*"}
      </div>
    </div>
  );
}