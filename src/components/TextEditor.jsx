// Author: Divya Swaroop Jaiswal  
// Roll Number: 2401CS38

// Declaration of authorship:  
// I, Divya Swaroop Jaiswal, declare that I am the author of this 
// project and repository. All code, design and documentation in 
// this repository represent my own work unless external libraries
// are explicitly used and cited. 

import React, { useRef, useEffect } from "react";

export default function TextEditor({ value, onChange }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const gutterRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    const gt = gutterRef.current;

    function sync() {
      if (!hl || !gt) return;
      hl.scrollTop = ta.scrollTop;
      hl.scrollLeft = ta.scrollLeft;
      gt.scrollTop = ta.scrollTop;
    }

    ta.addEventListener("scroll", sync);
    return () => ta.removeEventListener("scroll", sync);
  }, []);

  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();

      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue =
        value.substring(0, start) +
        "    " +
        value.substring(end);

      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      });
    }
  }

  function highlightCode(text) {
    return text
      .split("\n")
      .map((line) => {
        const match = line.match(/(;|#).*$/);
        if (!match) return line;

        const index = match.index;
        const codePart = line.slice(0, index);
        const commentPart = line.slice(index);

        return (
          codePart +
          `<span style="color:#6b7280">${commentPart}</span>`
        );
      })
      .join("\n");
  }

  const lines = value.split("\n");

  return (
    <div
      className="h-full min-h-0 rounded-md shadow-inner flex flex-col bg-panel panel-border"
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="text-sm text-gray-300 px-3 pt-2 border-b border-gray-700">
        Editor
      </div>

      <div className="flex flex-1 min-h-0 relative font-mono text-sm m-2 rounded-md overflow-hidden">
        
        {/* Line Numbers */}
        <div
          ref={gutterRef}
          className="w-12 bg-black/30 text-gray-500 text-right pr-3 py-3 select-none overflow-hidden"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <div className="flex-1 min-h-0 relative">
          
          {/* Highlight Layer */}
          <pre
            ref={highlightRef}
            className="absolute inset-0 m-0 p-3 whitespace-pre-wrap break-words pointer-events-none custom-scrollbar"
            style={{
              color: "white",
              backgroundColor: "var(--bg)",
              overflow: "hidden"
            }}
            dangerouslySetInnerHTML={{ __html: highlightCode(value) + "\n" }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="absolute inset-0 w-full h-full resize-none p-3 bg-transparent text-transparent caret-white outline-none overflow-auto custom-scrollbar"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}