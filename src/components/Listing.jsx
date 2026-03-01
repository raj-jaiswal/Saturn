// src/components/Listing.jsx
import React from "react";

/**
 * Props:
 *  - words: array [{ address, hex, text, lineno }]
 *  - warnings: array of strings
 *  - errors: array of strings
 *  - pc (optional): numeric PC to highlight row
 *  - selectedIndex, setSelectedIndex
 */
export default function Listing({ words = [], warnings = [], errors = [], pc = null, selectedIndex = null, setSelectedIndex = () => {} }) {
  // helper: find status for a word by lineno
  function statusFor(word) {
    const ln = word.lineno;
    const e = errors.find((s) => s.includes(`Line ${ln}`));
    if (e) return { kind: "error", text: e };
    const w = warnings.find((s) => s.includes(`Line ${ln}`));
    if (w) return { kind: "warn", text: w };
    return null;
  }

  return (
    <div className="h-full overflow-auto custom-scrollbar font-mono text-sm bg-panel panel-border" style={{ border: "1px solid var(--border)" }}>
      <div className="grid grid-cols-4 sticky top-0 bg-panel p-3 border-b" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="text-xs text-muted">Address</div>
        <div className="text-xs text-muted">Hex</div>
        <div className="text-xs text-muted">Instruction</div>
        <div className="text-xs text-muted">Status</div>
      </div>

      {words.map((w, idx) => {
        const status = statusFor(w);
        const isPC = pc != null && Number(pc) === Number(w.address);
        const isSelected = selectedIndex === idx;

        return (
          <div
            key={`${w.address}-${idx}`}
            onClick={() => setSelectedIndex(idx)}
            className={`grid grid-cols-4 px-3 py-2 items-center cursor-pointer ${isSelected ? "bg-gray-700" : ""} ${isPC ? "border-l-4 border-amber-500" : ""}`}
          >
            <div className="text-sm">{w.address.toString(16).padStart(4, "0")}</div>
            <div className="text-sm">{w.hex}</div>
            <div className="text-sm break-words">{w.text}</div>
            <div className="text-xs text-gray-400">
              {status ? (
                <span className={status.kind === "error" ? "text-red-400" : "text-yellow-300"}>
                  {status.text}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}