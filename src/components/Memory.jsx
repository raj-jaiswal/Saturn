import React from "react";

export default function Memory() {
  // minimal placeholder data
  const rows = Array.from({ length: 16 }).map((_, i) => ({
    addr: `0x${(i * 4).toString(16).padStart(4, "0")}`,
    value: "0x00000000",
  }));

  return (
    <div className="bg-gray-800 rounded-md p-3 shadow-sm h-1/2 overflow-auto">
      <div className="text-sm text-gray-300 mb-2">Memory</div>
      <div className="text-sm font-mono">
        {rows.map((r, idx) => (
          <div key={idx} className="flex justify-between py-1 px-2 odd:bg-gray-900 rounded">
            <div className="text-gray-400">{r.addr}</div>
            <div className="text-amber-300">{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
