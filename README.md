
# Saturn - SIMPLEX Assembler & Emulator (Electron + React)

[![Release](https://img.shields.io/badge/release-v1.0-blue)](https://github.com/raj-jaiswal/Saturn/releases/tag/release) ![License: MIT](https://img.shields.io/badge/license-MIT-green)

Desktop IDE, two‑pass assembler and step‑by‑step emulator for the **Extended SIMPLEX** Instruction Set Architecture (ISA). Built with **Electron + React + Vite + TailwindCSS**.  

Provides a GUI IDE and a CLI for assembling, inspecting and executing SIMPLEX assembly programs.

---

## Table of Contents

1. [Quick links](#quick-links)  
2. [Project status & summary](#project-status--summary)  
3. [Download / Release](#download--release)  
4. [Authors & Authorship Declaration](#authors--authorship-declaration)  
5. [Repository structure (visual tree)](#repository-structure-visual-tree)  
6. [Features (detailed)](#features-detailed)  
7. [Instruction Set & ISA details](#instruction-set--isa-details)  
8. [File formats](#file-formats)  
9. [Usage - GUI and CLI (for users)](#usage---gui-and-cli-for-users)  
10. [Development - how to run locally](#development---how-to-run-locally)  
11. [Build & Packaging (production)](#build--packaging-production)  
12. [Emulator behavior & implementation notes](#emulator-behavior--implementation-notes)  
13. [Examples & sample workflows](#examples--sample-workflows)  
14. [Troubleshooting & tips](#troubleshooting--tips)  
15. [Contributing](#contributing)  
16. [Roadmap / Future work](#roadmap--future-work)  
17. [License](#license)  
18. [Contact / Issues](#contact--issues)

---

## Project status & summary

**What Saturn does:**

- Provide an editor with assemble/run/step/reset controls.  
- Implement a two-pass assembler for Extended SIMPLEX ISA with labels, `SET`, `data`, and relative branch encoding.  
- Provide an emulator that executes assembled words, with live register and memory updates.  
- Offer CLI entry (`saturn`) for headless assembly and for launching GUI with files loaded.  
- Export object `.o`, listing `.l`, and log `.log` files.

---

## Download / Release

Supports Windows, Mac & Linux \
Download the installer from the release page:
https://github.com/raj-jaiswal/Saturn/releases/


>Windows Defender may show a warning because Saturn is not digitally signed.\
Click:
More Info, Run Anyway \
Installation may pause near completion while Windows scans the application.
This is normal and may take several minutes on slower systems.

---

## Authors & Authorship Declaration

**Author:** Divya Swaroop Jaiswal  
**Roll Number:** `2401CS38`

**Declaration of authorship:**  
I, **Divya Swaroop Jaiswal (2401CS38)**, declare that I am the author of this project and repository. All code, design and documentation in this repository represent my own work unless external libraries are explicitly used and cited. 

I grant permission for the project to be used for educational purposes under the MIT License included in this repo.

---

## Repository structure (visual tree)

```
root/
├── package.json
├── vite.config.js              # Vite + build configuration
├── LICENSE                     # MIT license
├── .gitignore
├── electron/
│   ├── main.js                 # Electron main process
│   └── preload.js              
├── src/
│   ├── app.jsx                 # Main React App
│   ├── main.jsx               
│   ├── index.css               
│   ├── app.css            
│   ├── components/             # React UI components used in the app
│   │   ├── Console.jsx         # Console log panel
│   │   ├── Listing.jsx         # Listing view to show assembled words
│   │   ├── Registers.jsx       # Registers UI and editors
│   │   ├── Memory.jsx          # Memory inspector & editor
│   │   ├── Taskbar.jsx         # Top controls: Open, Save, Assemble, Run, Step, Reset
│   │   └── TextEditor.jsx      # Source editor (basic textarea)
│   └── services/               # utilities
│       ├── file.service.js     # File open/save wrappers (Electron API)
│       └── emulator.service.js # Emulator implementation (step/run/reset)
├── shared/
│   └── assembler.js            # Two-pass assembler | pass1: label collection, pass2: word encoding
├── build/                      # build assets
│   ├── icon.ico
│   └── installer.nsh
└── README.md                   
```

---

## Features

### Editor & UI
- Simple, lightweight code editor (TextEditor) that supports saving and opening files.  
- Code / Listing toggle - write source in Code, inspect assembled words in Listing.  
- Taskbar includes: Open, Save, Assemble, Toggle Code/Listing, Export Binary/Listing/Logs, Import Object.  

### Assembler
- Two-pass assembler to resolve labels and `SET` directives.  
- Numeric formats: decimal, hex (`0x`), octal (leading `0`).  
- Label syntax: alphanumeric starting with a letter.  
- Emits warnings: unused labels, possible infinite loops (backward branches with no escape).  
- Emits errors: duplicate labels, undefined label uses, invalid numbers, missing operands.

### Emulator
- Accurate semantics for Extended SIMPLEX instructions (see ISA section).  
- Exposes `createEmulator` interface with `step()`, `run()`, `reset()`, and `snapshot()` helpers.  
- Callbacks to update UI: `onRegisters`, `onMemory`, `onConsole`.  
- Runs until `halt` or a configurable step limit;
- Safe bounds checks for memory and PC.

### Exports & Imports
- `.o` - object binary (32-bit little-endian words)  
- `.l` - textual listing (address, hex, source, line)  
- `.log` - assembler log (errors/warnings/labels)  

Import `.o` into Listing mode to inspect and run prebuilt binaries

### CLI Integration
- `saturn file.asm` - assemble file and produce `.o`, `.l`, `.log`.  
- `saturn --open=file.asm` - open GUI with file loaded.  
- `saturn --import=file.o` - open GUI and import object file.  
- `saturn --help` - CLI usage help.  
- CLI shares same assembler core (`shared/assembler.js`) as GUI.

---

## Instruction Set & ISA details

**Registers:** `A`, `B`, `PC`, `SP` - each 32-bit signed two's complement integers.  
**Encoding:** 32-bit word: lower 8 bits = opcode, upper 24 bits = operand (signed two's complement).  
For relative branches: assembler stores `labelAddr - (currentAddr + 1)` so PC semantics line up with emulator.

### Permitted line forms & commenting rules
- One statement per line.  
- Comments start with `;` or `#` and continue to end-of-line.  
- Blank lines allowed.  
- Labels: `name:` optionally followed by instruction on same line.  
- Valid label names: `[A-Za-z][A-Za-z0-9]*`.

### Numeric formats
- Decimal: `42`  
- Hexadecimal: `0x2A` or `-0x2A`  
- Octal: `052` (leading `0`)

### Complete instruction table

| Mnemonic | Opcode | Operand | Effect / Formal semantics |
|---------:|:------:|:-------:|:--------------------------|
| `data`   |       | value   | Reserve memory word with `value` |
| `ldc`    | 0      | value   | `B := A; A := value;` |
| `adc`    | 1      | value   | `A := A + value;` |
| `ldl`    | 2      | offset  | `B := A; A := memory[SP + offset];` |
| `stl`    | 3      | offset  | `memory[SP + offset] := A; A := B;` |
| `ldnl`   | 4      | offset  | `A := memory[A + offset];` |
| `stnl`   | 5      | offset  | `memory[A + offset] := B;` |
| `add`    | 6      | -       | `A := B + A;` |
| `sub`    | 7      | -       | `A := B − A;` |
| `shl`    | 8      | -       | `A := B << A;` (use low 5 bits of A) |
| `shr`    | 9      | -       | `A := B >>> A;` (logical right shift) |
| `adj`    | 10     | value   | `SP := SP + value;` |
| `a2sp`   | 11     | -       | `SP := A; A := B;` |
| `sp2a`   | 12     | -       | `B := A; A := SP;` |
| `call`   | 13     | offset  | `B := A; A := PC; PC := PC + offset;` |
| `return` | 14     | -       | `PC := A; A := B;` |
| `brz`    | 15     | offset  | `if A == 0 then PC := PC + offset;` |
| `brlz`   | 16     | offset  | `if A < 0 then PC := PC + offset;` |
| `br`     | 17     | offset  | `PC := PC + offset;` |
| `halt`   | 18     | -       | Stop execution (emulator halts) |
| `SET`    |       | value   | Assembler directive - set label = value (label must precede SET) |

> Notes: `data` and `SET` are assembler directives (not machine opcodes). Branch operands use signed 24-bit displacement
Assembler sign-extends accordingly.

---

## File formats (detailed)

**Object file (.o)**  
- Binary file containing consecutive 32-bit little-endian words (one word per assembled source word). Use this to import into GUI.

**Listing file (.l)**  
- Plain text file. Columns typically: `address` | `hex` | `source` | `line number` | `messages` (WARN/ERR). Useful for inspection.

**Log file (.log)**  
- Human readable assembler output listing errors and warnings and the label map.

---

## Usage - GUI and CLI (for users)

### GUI (recommended):
1. Install `Saturn Setup <version>.exe`.  
2. Launch from Start Menu or Desktop shortcut.  
3. Create / Open `.asm` file.  
4. Click **Assemble**. If there are errors the console will show them.  
5. Switch to **Listing** view to inspect machine words.  
6. Use **Run**, **Step**, and **Restart** buttons in Taskbar to execute program.  
7. Export `.o`, `.l`, or `.log` via Taskbar / Menu as needed.

### CLI (headless / automation):

```bash
# Assemble source -> produces file.o, file.l, file.log
saturn file.asm

# Assemble and open GUI with file loaded
saturn --open=file.asm

# Import binary object into GUI listing
saturn --import=file.o

# Display help
saturn --help
```

> If `saturn` is not available in PATH after install, either reinstall with PATH option or run the installed binary from its installation folder.

---

## Development - how to run locally

### Prerequisites
- Node.js (>=18 recommended)  
- npm  
- Windows (for building Windows installer - dev UI works cross-platform)

### Install dependencies

```bash
npm install
```

### Start development server + Electron (two terminals)

Terminal 1 - start Vite (renderer dev server):

```bash
npm run dev
# or: npx vite
```

Terminal 2 - start Electron main process (loads dev server):

```bash
npm run electron
# or: npx electron . --open=path/to/file.asm
# or: npx electron . --import=path/to/file.o
```

**Notes:**  
- `npm run dev` runs Vite with HMR so editing React components reloads the UI.  
- `npm run electron` runs Electron pointing at the dev URL from Vite. Keep both terminals open while you develop.

### Useful developer commands

```bash
npm run lint             # run eslint
npm run build            # produce production optimized `dist/`
npm run export           # build + package for windows (runs `npm run build && electron-builder`)
npm run export:linux     # build + package for Linux
npm run export:mac       # build + package for Mac
```

---

## Build & Packaging (production)

### Single command packaging

```bash
npm run export
# runs: npm run build && electron-builder
npm run export:linux
# Export for Linux
npm run export:mac
# Export for Mac
```

### Output
`release/` will contain the installer (e.g. `Saturn Setup x.y.z.exe`) and internal artifacts.

### Packing tips (already applied to the repo)
- `asar: true` to compress application files.  
- Exclude source maps, tests, docs, large unused locales to reduce installer size.  
- Use `compression: "maximum"` in `build` config to compress the installer.

---

## Emulator behavior & implementation notes

- **PC increment**: The emulator increments PC *before* executing an instruction - assembler's relative branch encoding uses this convention (`offset = target - (PC + 1)`).  
- **Sign extension**: 24-bit operand fields are sign-extended to 32-bit signed integers before use.  
- **Memory format**: UI displays memory words as `0xXXXXXXXX` hex strings; internal emulator uses 32-bit signed ints for arithmetic.  
- **Stack & addressing**: `ldl` / `stl` use `SP + offset`. `ldnl` / `stnl` use `A + offset`.  
- **Call/return**: `call` stores the return PC into `A` and uses `B` as a temporary. `return` restores PC from `A` and `A` from `B`.  
- **Safety**: Emulator performs bounds checks on memory/PC and halts with an error message if out-of-bounds memory access is attempted.

---

## Examples & sample workflows

### Sample assembly fragment

```asm
; sample.asm
start:  ldc 5
        ldc 10
        add
        halt
```

Assemble and run the above using the GUI or CLI. Inspect the listing to see the hex words and use Step to see register changes.

---

## Troubleshooting & tips

- **Installer too large**: Ensure `asar: true`, remove source maps (`!**/*.map`) and exclude unnecessary node modules or locale files.  
- **App won't start after packaging**: Verify `app.asar` exists under `release/win-unpacked/resources/`. If you see an `app/` folder instead, ASAR wasn't produced.  
- **Stale UI values**: Ensure emulator callbacks provide new arrays/objects (avoid mutating previous arrays in-place; use `slice()` or new objects).  
- **CLI not in PATH**: Re-run installer with PATH option enabled or add the install directory to PATH manually.  
- **Debugging packaging issues**: Inspect `builder-debug.yml` created by electron-builder for details on packaging steps.

---

## Contributors
**Md. Minhaj**: https://github.com/mdminhaj-2106 \
Mac Export

---

## Contributing

Contributions are welcome. Suggested workflow:

1. Fork the repository  
2. Create a feature branch (`git checkout -b feat/your-feature`)  
3. Implement code and tests, update README if needed  
4. Run `npm run lint`, `npm run build` and manual testing in the UI  
5. Open a PR and describe the change, include screenshots if UI changed

Please follow the code style used in the repository.

---

## Roadmap / Future work

- Syntax highlighting using Monaco or CodeMirror for editor  
- Breakpoints & conditional stepping in emulator  
- Disassembler to reconstruct source from `.o` files  
- Cross-platform installers (macOS DMG, Linux AppImage)  
- Better UI themes, accessibility improvements

---

## License

This repository is licensed under the **MIT License**. See `LICENSE` for details.

---

## Contact / Issues

Open issues or feature requests at the project GitHub:  
https://github.com/raj-jaiswal/Saturn/issues

---