function parseHexWord(str) {
  if (typeof str !== "string") return 0;
  return parseInt(str.replace(/^0x/i, ""), 16) >>> 0;
}
function toHexStr(val) {
  return "0x" + (val >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function createEmulator(initialMemory = [], initialRegisters = []) {
  let mem = initialMemory.map((m) => toHexStr(parseHexWord(m)));
  let regs = {
    A: 0,
    B: 0,
    PC: 0,
    SP: 0,
  };

  function loadRegistersFromArray(arr) {
    arr.forEach((r) => {
      const name = r.name;
      const val = parseHexWord(r.value || "0x0");
      regs[name] = val >>> 0;
    });
  }

  function snapshotRegistersToArray() {
    return [
      { name: "A", value: toHexStr(regs.A) },
      { name: "B", value: toHexStr(regs.B) },
      { name: "PC", value: toHexStr(regs.PC) },
      { name: "SP", value: toHexStr(regs.SP) },
    ];
  }

  function readWord(addr) {
    if (addr < 0 || addr >= mem.length) return 0;
    return parseInt(mem[addr].replace(/^0x/i, ""), 16) >>> 0;
  }

  function writeWord(addr, value) {
    if (addr < 0 || addr >= mem.length) return false;
    mem[addr] = toHexStr(value >>> 0);
    return true;
  }

  // sign-extend 24-bit operand to signed 32-bit JS number
  function signExtend24(op24) {
    op24 = op24 & 0xffffff;
    if (op24 & 0x800000) {
      return (op24 | 0xff000000) | 0; // signed 32-bit
    }
    return op24 | 0;
  }

  // Single-step execution. Returns:
  //   "HALT" when halted, "ERR:..." on fatal error, undefined otherwise.
  function step() {
    const pc = regs.PC >>> 0;
    if (pc < 0 || pc >= mem.length) {
      return `ERR: PC out of bounds ${pc}`;
    }

    const word = readWord(pc);
    const opcode = word & 0xff;
    const op24 = (word >>> 8) & 0xffffff;
    const operand = signExtend24(op24);

    // helpers to advance PC by default
    const advancePC = () => {
      regs.PC = (regs.PC + 1) >>> 0;
    };

    switch (opcode) {
      case 0: // ldc: B := A; A := value
        regs.B = regs.A >>> 0;
        regs.A = operand >>> 0; // operand is 32-bit signed but store as u32
        advancePC();
        return;

      case 1: // adc: A := A + value
        regs.A = ((regs.A | 0) + (operand | 0)) >>> 0;
        advancePC();
        return;

      case 2: // ldl offset: B := A; A := memory[SP + offset]
      {
        regs.B = regs.A >>> 0;
        const addr = (regs.SP + operand) >>> 0;
        regs.A = parseHexWord(mem[addr] || "0x0") >>> 0;
        advancePC();
        return;
      }

      case 3: // stl offset: memory[SP + offset] := A; A := B;
      {
        const addr = (regs.SP + operand) >>> 0;
        writeWord(addr, regs.A);
        regs.A = regs.B >>> 0;
        advancePC();
        return;
      }

      case 4: // ldnl offset: A := memory[A + offset];
      {
        const addr = (regs.A + operand) >>> 0;
        regs.A = parseHexWord(mem[addr] || "0x0") >>> 0;
        advancePC();
        return;
      }

      case 5: // stnl offset: memory[A + offset] := B;
      {
        const addr = (regs.A + operand) >>> 0;
        writeWord(addr, regs.B);
        advancePC();
        return;
      }

      case 6: // add: A := B + A;
        regs.A = ((regs.B | 0) + (regs.A | 0)) >>> 0;
        advancePC();
        return;

      case 7: // sub: A := B - A;
        regs.A = ((regs.B | 0) - (regs.A | 0)) >>> 0;
        advancePC();
        return;

      case 8: // shl: A := B << A;
        // Only low 5 bits are meaningful for shift amount
        regs.A = ((regs.B << (regs.A & 31)) >>> 0);
        advancePC();
        return;

      case 9: // shr: A := B >> A; arithmetic right shift
        regs.A = (regs.B >> (regs.A & 31)) >>> 0;
        advancePC();
        return;

      case 10: // adj value: SP := SP + value;
        regs.SP = (regs.SP + operand) >>> 0;
        advancePC();
        return;

      case 11: // a2sp: SP := A; A := B
        regs.SP = regs.A >>> 0;
        regs.A = regs.B >>> 0;
        advancePC();
        return;

      case 12: // sp2a: B := A; A := SP;
        regs.B = regs.A >>> 0;
        regs.A = regs.SP >>> 0;
        advancePC();
        return;

      case 13: // call offset: B := A; A := PC+1; PC := PC + 1 + offset;
        regs.B = regs.A >>> 0;
        regs.A = ((regs.PC + 1) >>> 0);
        regs.PC = (regs.PC + 1 + (operand >>> 0)) >>> 0;
        return;

      case 14: // return: PC := A; A := B;
        regs.PC = regs.A >>> 0;
        regs.A = regs.B >>> 0;
        return;

      case 15: // brz offset: if A == 0 then PC := PC + 1 + offset
        if ((regs.A | 0) === 0) {
          regs.PC = (regs.PC + 1 + (operand >>> 0)) >>> 0;
        } else {
          advancePC();
        }
        return;

      case 16: // brlz offset: if A < 0 then PC := PC + 1 + offset
        // signed compare
        if ((regs.A | 0) < 0) {
          regs.PC = (regs.PC + 1 + (operand >>> 0)) >>> 0;
        } else {
          advancePC();
        }
        return;

      case 17: // br offset: PC := PC + 1 + offset
        regs.PC = (regs.PC + 1 + (operand >>> 0)) >>> 0;
        return;

      case 18: // HALT
        return "HALT";

      default:
        // unknown opcode: treat as NOP (advance PC)
        regs.PC = (regs.PC + 1) >>> 0;
        return;
    }
  }

  function run(maxSteps = 1000000) {
    let steps = 0;
    while (steps < maxSteps) {
      const r = step();
      if (r === "HALT") return "HALT";
      if (typeof r === "string" && r.startsWith("ERR")) return r;
      steps++;
    }
    return "MAX_STEPS";
  }

  function reset(newMemory = null, newRegisters = null) {
    if (Array.isArray(newMemory)) {
      mem = newMemory.map((m) => toHexStr(parseHexWord(m)));
    }
    if (Array.isArray(newRegisters)) {
      loadRegistersFromArray(newRegisters);
    }
  }

  // initialize
  loadRegistersFromArray(initialRegisters);

  return {
    step,
    run,
    reset,
    getMemory: () => mem.slice(),
    getRegisters: () => snapshotRegistersToArray(),
  };
}