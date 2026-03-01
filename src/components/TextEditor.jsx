import React from "react";

export default function TextEditor({ value, onChange }) {
  return (
    <div className="h-full rounded-md shadow-inner p-3 flex flex-col bg-panel panel-border" style={{ border: "1px solid var(--border)" }}>
      <div className="text-sm text-gray-300 mb-2">Editor</div>
      <textarea
        className="flex-1 w-full resize-none bg-(--bg) text-sm font-mono p-3 rounded-md outline-none custom-scrollbar"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{border: "1px solid var(--border)"}}
      />
    </div>
  );
}