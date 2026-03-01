import React, { useState } from "react";

export default function Registers({ registers = [], onUpdateRegister = () => {} }) {
  const [editing, setEditing] = useState(null);
  const [tempValue, setTempValue] = useState("");

  function normalizeHex(val) {
    if (!val) return null;
    let v = String(val).trim();
    v = v.replace(/^0x/i, "");
    v = v.replace(/[^0-9a-fA-F]/g, "");
    if (v.length > 8) v = v.slice(-8); // keep last 8 hex digits
    v = v.padStart(8, "0").toUpperCase();
    return `0x${v}`;
  }

  function startEdit(name, value) {
    setEditing(name);
    setTempValue(value);
  }

  function commitEdit(name) {
    const norm = normalizeHex(tempValue);
    if (norm) onUpdateRegister(name, norm);
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  return (
    <div className="bg-gray-800 rounded-md p-3 pb-2 shadow-sm h-[30%] overflow-auto bg-panel panel-border custom-scrollbar" style={{ border: "1px solid var(--border)" }}>
      <div className="text-sm text-gray-300 mb-2">Registers</div>
      <div className="grid grid-cols-1 gap-2">
        {registers.map((r) => (
          <div
            key={r.name}
            className="p-1 rounded flex justify-between items-center cursor-default"
            onDoubleClick={() => startEdit(r.name, r.value)}
            style={{ fontFamily: "var(--mono)" }}
          >
            <div className="font-mono text-sm text-gray-300">{r.name}</div>
            <div style={{ minWidth: 96, display: "flex", justifyContent: "flex-end" }}>
              {editing === r.name ? (
                <input
                  autoFocus
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onBlur={() => commitEdit(r.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(r.name);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="text-sm font-mono rounded outline-none"
                  style={{ width: "100%", textAlign: "right" }}
                />
              ) : (
                <div className="font-mono text-sm text-amber-300">{r.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}