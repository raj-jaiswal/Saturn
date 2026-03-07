// Author: Divya Swaroop Jaiswal  
// Roll Number: 2401CS38

// Declaration of authorship:  
// I, Divya Swaroop Jaiswal, declare that I am the author of this 
// project and repository. All code, design and documentation in 
// this repository represent my own work unless external libraries
// are explicitly used and cited. 

const OPCODES = {
  ldc: 0,
  adc: 1,
  ldl: 2,
  stl: 3,
  ldnl: 4,
  stnl: 5,
  add: 6,
  sub: 7,
  shl: 8,
  shr: 9,
  adj: 10,
  a2sp: 11,
  sp2a: 12,
  call: 13,
  return: 14,
  brz: 15,
  brlz: 16,
  br: 17,
  halt: 18,
};

const need_operand = new Set([
  "ldc","adc","ldl","stl","ldnl","stnl",
  "adj","call","brz","brlz","br"
]);

const no_operand = new Set([
  "add","sub","shl","shr","a2sp","sp2a","return","halt"
]);

const relative_branch = new Set(["br","brz","brlz","call"]);


// Utilities
function toHex32(num) {
  return (num >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function encode(opcode, operand) {
  const op24 = operand & 0xFFFFFF;
  return toHex32((op24 << 8) | (opcode & 0xFF));
}

function parseNumber(text) {
  if (/^[+-]?0x[0-9a-fA-F]+$/.test(text))
    return parseInt(text, 16);

  if (/^[+-]?0[0-7]+$/.test(text))
    return parseInt(text, 8);

  if (/^[+-]?\d+$/.test(text))
    return parseInt(text, 10);

  return null;
}

function isValidLabel(name) {
  return /^[A-Za-z][A-Za-z0-9]*$/.test(name);
}

export default function assemble(source) {
  const errors = [];
  const warnings = [];
  const labels = {};
  const usedLabels = new Set();
  const lines = source.split(/\r?\n/);

  // ---------------- PASS 1 ----------------
  let address = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/(;|#).*$/, "").trim();
    if (!line) continue;

    // check if label exists
    let labelMatch = line.match(/^([^:\s]+):\s*(.*)$/);
    if (labelMatch) {
      const labelName = labelMatch[1];
      const rest = labelMatch[2].trim();

      if (!isValidLabel(labelName)) {
        errors.push(`Line ${i+1}: invalid label '${labelName}'`);
      } else if (labels.hasOwnProperty(labelName)) {
        errors.push(`Line ${i+1}: duplicate label '${labelName}'`);
      } else {
        labels[labelName] = address;
      }

      if (!rest) continue; // label-only line

      // Set Instruction Handling
      if (rest.toLowerCase().startsWith("set ")) {
        const valueText = rest.slice(4).trim();
        const num = parseNumber(valueText);
        if (num === null)
          errors.push(`Line ${i+1}: invalid SET value`);
        else
          labels[labelName] = num;
        continue;             // Not incrweasing address here, since Set is Pseudoinstruction
      }

      address++;
      continue;
    }

    if (line.toLowerCase().startsWith("set "))
      errors.push(`Line ${i+1}: SET must follow a label`);

    address++;
  }

  // ---------------- PASS 2 ---------------- 

  address = 0;
  const words = [];

  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    let line = raw.replace(/(;|#).*$/, "").trim();    // Removing all comments
    if (!line) continue;

    // remove leading label if exists
    let labelMatch = line.match(/^([^:\s]+):\s*(.*)$/);
    if (labelMatch) {
      line = labelMatch[2].trim();
      if (!line) continue;
    }

    const parts = line.split(/\s+/);
    const mnemonic = parts[0].toLowerCase();
    const operandText = parts.slice(1).join(" ").trim();

    /* Data */
    if (mnemonic === "data") {
      const num = parseNumber(operandText);
      if (num === null)
        errors.push(`Line ${i+1}: invalid DATA value`);
      words.push({
        address,
        text: line,
        hex: num === null ? toHex32(0) : toHex32(num),
        lineno: i + 1 
      });
      address++;
      continue;
    }

    /* SET (invalid here) */
    if (mnemonic === "set") {
      errors.push(`Line ${i+1}: SET without label`);
      continue;
    }

    /* Unknown Mnemonic */
    if (!OPCODES.hasOwnProperty(mnemonic)) {
      errors.push(`Line ${i+1}: unknown mnemonic '${mnemonic}'`);
      words.push({ address, text: line, hex: toHex32(0), lineno: i + 1 });
      address++;
      continue;
    }

    /* Operand checks */
    const needsOp = need_operand.has(mnemonic);
    const noOp = no_operand.has(mnemonic);
    const hasOperand = operandText.length > 0;

    if (needsOp && !hasOperand)
      errors.push(`Line ${i+1}: missing operand`);

    if (noOp && hasOperand)
      errors.push(`Line ${i+1}: unexpected operand`);

    let operandValue = 0;

    if (hasOperand) {
      const num = parseNumber(operandText);             // Check if operand is a value

      if (num !== null) {
        operandValue = num;
      }
      else {
        if (!labels.hasOwnProperty(operandText)) {      // Check if operant is a label
          errors.push(`Line ${i+1}: undefined label '${operandText}'`);
        } 
        else {
          usedLabels.add(operandText);
          const labelAddr = labels[operandText];

          if (relative_branch.has(mnemonic))
            operandValue = labelAddr - (address + 1);
          else
            operandValue = labelAddr;
        }
      }
    }

    const opcode = OPCODES[mnemonic];
    const hex = encode(opcode, operandValue);

    words.push({ address, text: line, hex, lineno: i + 1 });
    address++;
  }

  // Basic Infinite Loop Check
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const parts = w.text.split(/\s+/);
    const mnemonic = parts[0].toLowerCase();

    if (!relative_branch.has(mnemonic)) continue;

    // reconstruct operand from hex
    const fullWord = parseInt(w.hex, 16);
    let operand = (fullWord >>> 8) & 0xFFFFFF;

    // sign extend 24-bit
    if (operand & 0x800000) {
      operand |= 0xFF000000;
    }

    const target = w.address + 1 + operand;

    // only care about backward jumps
    if (target <= w.address) {

      let escapes = false;

      for (let j = target; j <= w.address; j++) {
        const inner = words[j];
        const innerParts = inner.text.split(/\s+/);
        const innerMnemonic = innerParts[0].toLowerCase();

        if (!relative_branch.has(innerMnemonic)) continue;

        const innerWord = parseInt(inner.hex, 16);
        let innerOperand = (innerWord >>> 8) & 0xFFFFFF;

        if (innerOperand & 0x800000) {
          innerOperand |= 0xFF000000;
        }

        const innerTarget = inner.address + 1 + innerOperand;

        // If jump escapes outside the loop region
        if (innerTarget < target || innerTarget > w.address) {
          escapes = true;
          break;
        }
      }

      if (!escapes) {
        warnings.push(
          `Line ${w.lineno}: possible infinite loop (backward jump)`
        );
      }
    }
  }

  for (let name in labels) {
    if (!usedLabels.has(name))
      warnings.push(`Label '${name}' defined but never used`);
  }

  return { words, labels, warnings, errors };
}

// Setting up the Registers and Memory after assembly
export function buildState(result, memorySize) {

  if (result.words.length > memorySize)
    return { ok: false, error: "Program too large for memory" };

  const memory = Array(memorySize).fill("0x00000000");

  result.words.forEach(w => {
    memory[w.address] = "0x" + w.hex;
  });

  const programEnd = result.words.length;

  const registers = [
    { name: "A", value: "0x00000000" },
    { name: "B", value: "0x00000000" },
    { name: "PC", value: "0x00000000" },
    {
      name: "SP",
      value: "0x" + programEnd.toString(16).toUpperCase().padStart(8, "0")
    }
  ];

  return { ok: true, memory, registers, programEnd };
}