import React, { useRef, useEffect } from "react";

export default function Console({ lines = [] }) {
  const ref = useRef(null);

  useEffect(() => {
    // auto-scroll to bottom
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      className="h-full rounded-md p-3 overflow-auto custom-scrollbar"
      ref={ref}
      style={{ backgroundColor: "var(--console-bg)", border: "1px solid var(--border)" }}
    >
      <div className="text-xs text-muted mb-2" style={{ color: "var(--muted)" }}>Console</div>
      <div className="text-sm font-mono" style={{ color: "var(--muted)", lineHeight: 1.4 }}>
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap w-full">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}