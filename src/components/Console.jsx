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
    <div className="h-full bg-black rounded-md border border-gray-700 p-3 overflow-auto" ref={ref}>
      <div className="text-xs text-gray-400 mb-2">Console</div>
      <div className="text-sm font-mono text-gray-200 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap w-full">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
