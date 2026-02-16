import React from "react";

export default function Registers({ registers = [] }) {
  return (
    <div className="bg-gray-800 rounded-md p-3 shadow-sm h-1/2 overflow-auto">
      <div className="text-sm text-gray-300 mb-2">Registers</div>
      <div className="grid grid-cols-2 gap-2">
        {registers.map((r) => (
          <div key={r.name} className="p-2 bg-gray-900 rounded flex justify-between items-center">
            <div className="font-mono text-sm text-gray-300">{r.name}</div>
            <div className="font-mono text-sm text-amber-300">{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
