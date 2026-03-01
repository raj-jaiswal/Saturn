import React, { useRef, useEffect } from "react";

export default function Console({ lines = [], setLines = ()=>[] }) {
  const ref = useRef(null);

  function clear(){
    setLines(()=>[])
  }

  useEffect(() => {
    // auto-scroll to bottom
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      className="h-full rounded-md p-3 overflow-auto custom-scrollbar relative"
      style={{ backgroundColor: "var(--console-bg)", border: "1px solid var(--border)" }}
    >
      <div className="text-xs text-muted mb-2 w-full flex justify-between" style={{ color: "var(--muted)" }}>
        <div>Console</div>
        <div onClick={clear} className="cursor-pointer">Clear</div>
      </div>
      <div className="text-sm font-mono h-[80%] overflow-auto custom-scrollbar" style={{ color: "var(--muted)", lineHeight: 1.4 }} ref={ref}>
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap w-full">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}