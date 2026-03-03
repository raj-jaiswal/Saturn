#!/usr/bin/env node
// Make executable: chmod +x bin/saturn.js
// Usage examples:
//   saturn file.asm
//   saturn -o file.asm
//   saturn -r file.o
//   saturn --help

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

async function usage() {
  console.log(`saturn - Simplex assembler tool

Usage:
  saturn <file.asm>            assemble file, produces .o, .l, .log next to source
  saturn -o|--open <file.asm>  open file in GUI (if installed)
  saturn -r|--run <file.o>     import object file in GUI listing mode (if installed)
  saturn --help                show this help
`);
}

function basenameNoExt(p) {
  return path.basename(p, path.extname(p));
}

function writeListing(words, warnings = [], errors = [], outPath) {
  const lines = words.map((w, idx) => {
    const addr = w.address.toString(16).padStart(4, "0");
    // find any per-line status
    const ln = w.lineno || 0;
    const e = errors.find(s => s.includes(`Line ${ln}`));
    if (e) return `${addr}  ${w.hex}   ${w.text}   ERR: ${e}`;
    const wmsg = warnings.find(s => s.includes(`Line ${ln}`));
    if (wmsg) return `${addr}  ${w.hex}   ${w.text}   WARN: ${wmsg}`;
    return `${addr}  ${w.hex}   ${w.text}`;
  });
  return fs.writeFile(outPath, lines.join("\n"), "utf-8");
}

function writeObject(words, outPath) {
  const buf = Buffer.alloc(words.length * 4);
  words.forEach((w, i) => {
    const val = parseInt(w.hex, 16) >>> 0;
    buf.writeUInt32LE(val, i * 4);
  });
  return fs.writeFile(outPath, buf);
}

function writeLog(lines, outPath) {
  return fs.writeFile(outPath, lines.join("\n"), "utf-8");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    await usage();
    process.exit(0);
  }

  // simple flags parsing
  const flagOpenIndex = argv.indexOf("-o") !== -1 ? argv.indexOf("-o") : argv.indexOf("--open");
  const flagRunIndex = argv.indexOf("-r") !== -1 ? argv.indexOf("-r") : argv.indexOf("--run");

  // default: first non-flag argument
  const provided = argv.find(a => !a.startsWith("-"));
  if (!provided) { await usage(); process.exit(1); }

  const targetPath = path.resolve(provided);

  // load assembler module (ESM import)
  // adjust path if your assembler is at ./src/services/assembler.service.js
  let asmModule;
  try {
    asmModule = await import(pathToFileURL(path.resolve("./src/services/assembler.service.js")).href);
  } catch (err) {
    // try transpiled build in dist
    asmModule = await import(pathToFileURL(path.resolve("./dist/services/assembler.service.js")).href);
  }
  const assemble = asmModule.default;

  // if -o or --open: prefer to hand to GUI (see below). We will attempt to call a packaged app if present.
  if (flagOpenIndex !== -1) {
    // On CLI-only mode we can try to open the file with default OS handler.
    // If the GUI is installed and registered for .asm, OS will open it; otherwise print hint.
    try {
      // cross-platform "open" logic (not trying to spawn the application exe)
      if (process.platform === "win32") {
        const child = await import("child_process");
        child.execSync(`start "" "${targetPath}"`);
      } else if (process.platform === "darwin") {
        const child = await import("child_process");
        child.execSync(`open "${targetPath}"`);
      } else {
        const child = await import("child_process");
        child.execSync(`xdg-open "${targetPath}"`);
      }
      console.log("Open request sent.");
      process.exit(0);
    } catch (err) {
      console.error("Could not open file with GUI. Install Saturn or register file association.");
      process.exit(1);
    }
  }

  // if -r / --run: we won't assemble; we just verify object file and copy into listing and log
  if (flagRunIndex !== -1) {
    // For object import headless, just parse 32-bit LITTLE-ENDIAN words and write listing & log (no disassembly)
    try {
      const buf = await fs.readFile(targetPath);
      if (buf.length % 4 !== 0) throw new Error("Invalid object file length");

      const words = [];
      for (let i = 0; i < buf.length; i += 4) {
        const v = buf.readUInt32LE(i);
        words.push({ address: i/4, hex: (v >>> 0).toString(16).toUpperCase().padStart(8,"0"), text: "", lineno: 0 });
      }
      const base = basenameNoExt(targetPath);
      const dir = path.dirname(targetPath);
      const lpath = path.join(dir, base + ".l");
      const opath = path.join(dir, base + ".o"); // can copy original too if desired
      const logpath = path.join(dir, base + ".log");
      await writeListing(words, [], [], lpath);
      await writeObject(words, opath);
      await writeLog([`Imported object ${targetPath}`], logpath);
      console.log("Wrote:", lpath, opath, logpath);
      process.exit(0);
    } catch (err) {
      console.error("Invalid File");
      process.exit(2);
    }
  }

  // Default: assemble the source file and write outputs
  try {
    const src = await fs.readFile(targetPath, "utf-8");
    const result = assemble(src); // {words, labels, warnings, errors}
    const base = basenameNoExt(targetPath);
    const dir = path.dirname(targetPath);

    const lpath = path.join(dir, base + ".l");
    const opath = path.join(dir, base + ".o");
    const logpath = path.join(dir, base + ".log");

    // make logs similar to app's assemblyLogs
    const logs = [];
    logs.push("=== Assemble output ===");
    if (result.errors && result.errors.length) {
      logs.push("ERRORS:");
      result.errors.forEach(e => logs.push(`ERR: ${e}`));
    }
    if (result.warnings && result.warnings.length) {
      logs.push("--- warnings ---");
      result.warnings.forEach(w => logs.push(`WARN: ${w}`));
    }
    logs.push("--- labels ---");
    for (const k of Object.keys(result.labels)) {
      const v = result.labels[k];
      logs.push(`${k} : ${v} (0x${(v>>>0).toString(16).toUpperCase().padStart(8,"0")})`);
    }
    if (!result.errors || result.errors.length === 0) logs.push("Program assembled.");

    // write files (object may be written even if errors; adapt to your policy)
    await writeListing(result.words || [], result.warnings || [], result.errors || [], lpath);
    await writeObject(result.words || [], opath);
    await writeLog(logs, logpath);

    console.log("Wrote:", lpath, opath, logpath);
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message || err);
    process.exit(3);
  }
}

function pathToFileURL(p) {
  // tiny helper for import()
  const u = new URL('file:' + (p.startsWith('/') ? p : '/' + p));
  return u;
}

main();