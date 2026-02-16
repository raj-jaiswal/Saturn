import React from "react";

export default function TextEditor({ value, onChange }) {
  return (
    <div className="h-full bg-gray-800 rounded-md shadow-inner p-3 flex flex-col">
      <div className="text-sm text-gray-300 mb-2">Editor</div>
      <textarea
        className="flex-1 w-full resize-none bg-gray-900 text-sm font-mono p-3 rounded-md outline-none focus:ring-2 focus:ring-amber-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
