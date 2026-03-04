# Saturn --- SIMPLEX Assembler & Emulator (Electron + React)

Saturn is a desktop IDE, assembler, and emulator for the **Extended
SIMPLEX Instruction Set Architecture (ISA)**.

It provides: - A GUI IDE for writing and debugging SIMPLEX assembly
programs - A two‑pass assembler - A step-by-step emulator - A command
line interface (CLI) - Export/import of object files

Release download:
https://github.com/raj-jaiswal/Saturn/releases/tag/release

------------------------------------------------------------------------

# Author

Divya Swaroop Jaiswal\
2401CS38

------------------------------------------------------------------------

# Declaration of Authorship

I declare that this project was developed by me as part of academic
work.\
All implementation, design, and documentation included in this
repository represent my own work except where external libraries are
used and credited.

Author: Divya Swaroop Jaiswal\
ID: 2401CS38

------------------------------------------------------------------------

# Features

Saturn provides a complete SIMPLEX development environment.

Main capabilities:

• Two-pass assembler\
• Emulator with Run / Step / Reset\
• GUI code editor\
• Program listing viewer\
• Register inspector (A, B, PC, SP)\
• Memory viewer\
• Console output logs\
• CLI support\
• Object file import/export\
• Listing file export\
• Assembly logs

------------------------------------------------------------------------

# Architecture

Saturn uses an Electron + React architecture.

Electron Main Process \| \| IPC \| Renderer (React UI) \| Assembler
Service \| Emulator Service

Technologies:

Electron\
React\
Vite\
TailwindCSS\
electron-builder

------------------------------------------------------------------------

# Repository Structure

root/

configuration files - package.json - vite.config.js - LICENSE (MIT) -
.gitignore

electron/ - main.js - preload.js

src/ - app.jsx - main.jsx - index.css - app.css

src/components/ - console.jsx - listing.jsx - registers.jsx -
memory.jsx - taskbar.jsx - textEditor.jsx

src/services/ - file.service.js - emulator.service.js

shared/ - assembler.js

------------------------------------------------------------------------

# ISA Overview

The SIMPLEX machine contains four 32-bit registers:

A --- accumulator\
B --- secondary register\
PC --- program counter\
SP --- stack pointer

Instruction encoding:

32 bit word

Upper 24 bits → operand\
Lower 8 bits → opcode

Operands are signed two's complement values.

------------------------------------------------------------------------

# Assembly Language Rules

The assembly language is line based.

One statement per line.

Comments begin with:

; comment

Whitespace is ignored.

Blank lines are allowed.

Labels:

label:

Label names must:

• start with a letter\
• contain alphanumeric characters

Operands may be:

• decimal numbers • hexadecimal numbers (0x) • octal numbers (leading 0)
• labels

Example valid lines:

; a comment label1: ldc 5 label2: ldc 5 adc 5 label3:ldc label3

------------------------------------------------------------------------

# Instruction Set

data value\
Reserve memory location with initial value

ldc value\
B := A\
A := value

adc value\
A := A + value

ldl offset\
B := A\
A := memory\[SP + offset\]

stl offset\
memory\[SP + offset\] := A\
A := B

ldnl offset\
A := memory\[A + offset\]

stnl offset\
memory\[A + offset\] := B

add\
A := B + A

sub\
A := B − A

shl\
A := B \<\< A

shr\
A := B \>\> A

adj value\
SP := SP + value

a2sp\
SP := A\
A := B

sp2a\
B := A\
A := SP

call offset\
B := A\
A := PC\
PC := PC + offset

return\
PC := A\
A := B

brz offset\
if A == 0\
PC := PC + offset

brlz offset\
if A \< 0\
PC := PC + offset

br offset\
PC := PC + offset

halt\
Stop execution

SET value\
Assign constant value to label

------------------------------------------------------------------------

# Using Saturn (User)

After installing Saturn you can use it either through the GUI or CLI.

CLI examples:

saturn --help

saturn file.asm

saturn file.o

saturn --open=file.asm

saturn --import=file.o

saturn file.asm assembles the program and generates:

file.o\
file.l\
file.log

------------------------------------------------------------------------

# Running the GUI

Launch Saturn from:

Start Menu\
Desktop shortcut

Workflow:

1.  Open or create assembly file
2.  Click Assemble
3.  View listing
4.  Run / Step execution
5.  Inspect registers and memory

------------------------------------------------------------------------

# Developer Setup

Install dependencies:

npm install

Start Vite dev server:

npm run dev

Run Electron in another terminal:

npm run electron

Alternative development launch:

npx electron . --open=file.asm

npx electron . --import=file.o

------------------------------------------------------------------------

# Building the Application

Production build:

npm run export

This runs:

npm run build electron-builder

The installer will appear in:

release/

Users only need the Setup executable.

------------------------------------------------------------------------

# File Types

.asm --- assembly source code\
.o --- object file (binary machine code)\
.l --- listing file\
.log --- assembly log

------------------------------------------------------------------------

# Emulator

The emulator executes instructions and updates:

Registers\
Memory\
Program counter

Execution modes:

Run --- execute entire program\
Step --- execute single instruction\
Reset --- restore initial state

------------------------------------------------------------------------

# License

MIT License

See LICENSE file.

------------------------------------------------------------------------

# Acknowledgements

Electron\
React\
Vite\
TailwindCSS
