import React, { useState, useEffect } from "react";

export default function Memory({ memory = [], pageSize = 128, onUpdateMemory = () => {} }) {
  const total = memory.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [page, setPage] = useState(0); // 0-indexed
  const [editingIndex, setEditingIndex] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const [pageInput, setPageInput] = useState("");
  const [editingPage, setEditingPage] = useState(false);

  function addrToDisplay(index) {
    return `0x${index.toString(16).padStart(4, "0")}`;
  }

  // Remove all whitespace, invalid character, and take last 8 valid characters, pad with 0s on right
  function normalizeHex(val) {
    if (!val) return null;
    let v = String(val).trim();
    v = v.replace(/^0x/i, "");
    v = v.replace(/[^0-9a-fA-F]/g, "");
    if (v.length > 8) v = v.slice(-8);
    v = v.padStart(8, "0").toUpperCase();
    return `0x${v}`;
  }

  const start = page * pageSize;
  const pageSlice = memory.slice(start, start + pageSize);

  // For Editing Values
  function beginEdit(absIndex) {
    setEditingIndex(absIndex);
    setTempValue(memory[absIndex]);
  }

  function commitEdit(absIndex) {
    const norm = normalizeHex(tempValue);
    if (norm) onUpdateMemory(absIndex, norm);
    setEditingIndex(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
  }

  function commitPageEdit() {
    const num = parseInt(pageInput, 10);

    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setPage(num - 1);
    }

    setEditingPage(false);
  }

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  return (
    <div
      className="bg-gray-800 rounded-md p-3 shadow-sm h-[70%] overflow-hidden bg-panel panel-border"
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-300">Memory</div>
        <div className="text-xs text-muted small-pill" style={{ color: "var(--muted)" }}>
          {start} - {Math.min(start + pageSize - 1, total - 1)} / {total - 1}
        </div>
      </div>

      <div className="overflow-auto custom-scrollbar" style={{ maxHeight: "calc(100% - 68px)" }}>
        <div className="text-sm font-mono">
          {pageSlice.map((val, idx) => {
            const absIndex = start + idx;
            return (
              <div
                key={absIndex}
                className="flex justify-between py-1 px-2 rounded items-center cursor-default"
                onDoubleClick={() => beginEdit(absIndex)}
              >
                <div className="text-gray-400">{addrToDisplay(absIndex)}</div>

                <div style={{ minWidth: 96, textAlign: "right" }}>
                  {editingIndex === absIndex ? (
                    <input
                      autoFocus
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      onBlur={() => commitEdit(absIndex)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(absIndex);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="text-sm font-mono rounded outline-none"
                      style={{ textAlign: "right", width: "80%" }}
                    />
                  ) : (
                    <div className="text-amber-300">{val}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="btn-muted cursor-pointer"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ color: page === 0 ? "rgba(255,255,255,0.2)" : "var(--muted)" }}
          >
            Prev
          </div>
          <div
            className="btn-muted cursor-pointer"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            style={{ color: page >= totalPages - 1 ? "rgba(255,255,255,0.2)" : "var(--muted)" }}
          >
            Next
          </div>
        </div>

        <div className="text-xs text-muted flex items-center gap-1">
          Page{" "}
          <input
            autoFocus
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPageEdit();
              if (e.key === "Escape") setEditingPage(false);
            }}
            className="text-xs font-mono rounded outline-none bg-(--bg) px-1 translate-y-[1px]"
            style={{ width: 30, textAlign: "center", border: "1px solid #888"}}
          />
          {" "}
          / {totalPages}
        </div>
      </div>
    </div>
  );
}