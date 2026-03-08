// Author: Divya Swaroop Jaiswal  
// Roll Number: 2401CS38

// Declaration of authorship:  
// I, Divya Swaroop Jaiswal, declare that I am the author of this 
// project and repository. All code, design and documentation in 
// this repository represent my own work unless external libraries
// are explicitly used and cited. 

export function toHex32(num) {
  return "0x" + (num >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function parseHex(hexStr) {
  return parseInt(hexStr, 16) | 0; 
}

export function executeStep(registers, memory) {
  // Parsing Registers
  let A = parseHex(registers.find(r => r.name === "A").value);
  let B = parseHex(registers.find(r => r.name === "B").value);
  let PC = parseHex(registers.find(r => r.name === "PC").value);
  let SP = parseHex(registers.find(r => r.name === "SP").value);

  // Bounds check
  if (PC < 0 || PC >= memory.length) {
    return { error: `PC out of bounds (0x${PC.toString(16)})`, halted: true };
  }

  // Fetch and Decode Instruction
  const instruction = parseHex(memory[PC]);
  const opcode = instruction & 0xFF;        // Lowest 8 bits
  const operand = instruction >> 8;         // Top 24 bits (Sign-extended automatically by JS >>)

  if (opcode === 18) {
    return { halted: true };
  }

  PC = PC + 1;

  // This prevents mis-steps
  let newMemory = memory; // Only copy memory if we need to write to it

  const readMem = (address) => {
    if (address < 0 || address >= memory.length) throw new Error(`Memory read out of bounds at ${address}`);
    return parseHex(memory[address]);
  };

  try {
    switch (opcode) {
      case 0:  // ldc
        B = A; A = operand; break;
      case 1:  // adc
        A = A + operand; break;
      case 2:  // ldl
        B = A; A = readMem(SP + operand); break;
      case 3:  // stl
        if (SP + operand < 0 || SP + operand >= memory.length) throw new Error("Memory write out of bounds");
        newMemory = [...memory];
        newMemory[SP + operand] = toHex32(A);
        A = B; 
        break;
      case 4:  // ldnl
        A = readMem(A + operand); break;
      case 5:  // stnl
        if (A + operand < 0 || A + operand >= memory.length) throw new Error("Memory write out of bounds");
        newMemory = [...memory];
        newMemory[A + operand] = toHex32(B);
        break;
      case 6:  // add
        A = B + A; break;
      case 7:  // sub
        A = B - A; break;
      case 8:  // shl
        A = B << A; break;
      case 9:  // shr
        A = B >> A; break;
      case 10: // adj
        SP = SP + operand; break;
      case 11: // a2sp
        SP = A; A = B; break;
      case 12: // sp2a
        B = A; A = SP; break;
      case 13: // call
        B = A; A = PC; PC = PC + operand; break;
      case 14: // return
        PC = A; A = B; break;
      case 15: // brz
        if (A === 0) PC = PC + operand; break;
      case 16: // brlz
        if (A < 0) PC = PC + operand; break;
      case 17: // br
        PC = PC + operand; break;
      default:
        throw new Error(`Unknown opcode: ${opcode}`);
    }
  } catch (err) {
    return { error: err.message, halted: true };
  }

  // 5. Package up the new state
  const newRegisters = [
    { name: "A", value: toHex32(A) },
    { name: "B", value: toHex32(B) },
    { name: "PC", value: toHex32(PC) },
    { name: "SP", value: toHex32(SP) }
  ];

  return { halted: false, registers: newRegisters, memory: newMemory, currentPC: PC };
}