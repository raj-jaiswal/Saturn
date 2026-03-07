import React from "react";

export default function Listing({ words = [], warnings = [], errors = [], pc = null, selectedIndex = null, setSelectedIndex = () => {} }) {
  // find status for a word by lineno
  function statusFor(word, index) {
    const ln = word.lineno;

    // line-specific error
    const e = errors.find((s) => s.includes(`Line ${ln}`));
    if (e) return { kind: "error", text: e };

    // line-specific warning
    const w = warnings.find((s) => s.includes(`Line ${ln}`));
    if (w) return { kind: "warn", text: w };

    // non-line-specific warnings (like unused labels)
    if (index === 0) {
      const globalWarning = warnings.find((s) => !s.includes("Line "));
      if (globalWarning) {
        return { kind: "warn", text: globalWarning };
      }
    }

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
        const status = statusFor(w, idx);
        const isPC = pc != null && Number(pc) === Number(w.address);
        const isSelected = selectedIndex === idx;

        return (
          <div
            key={`${w.address}-${idx}`}
            className={`grid grid-cols-4 px-3 py-2 items-center cursor-pointer ${isSelected ? "bg-gray-700" : ""} ${isPC ? "border-l-4 border-amber-500" : ""}`}
          >
            <div className="text-sm">{w.address.toString(16).padStart(4, "0")}</div>
            <div className="text-sm">{w.hex}</div>
            <div className="text-sm break-words">{w.text}</div>
            <div className="text-xs text-gray-400 w-full text-nowrap overflow-auto custom-scrollbar" style={{scrollbarWidth: 'none'}}>
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