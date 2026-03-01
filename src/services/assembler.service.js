// src/services/assembler.service.js
/**
 * Two-pass assembler for the Simplex / Saturn ISA.
 *
 * Encoding:
 *  - 32-bit word
 *  - lower 8 bits: opcode
 *  - upper 24 bits: operand (signed two's complement when interpreted)
 *
 * Supported mnemonics:
 *  data    - pseudo: reserve a word initialized to operand
 *  SET     - pseudo: set label to value
 *  ldc  0, adc 1, ldl 2, stl 3, ldnl 4, stnl 5,
 *  add 6, sub 7, shl 8, shr 9, adj 10, a2sp 11, sp2a 12,
 *  call 13, return 14, brz 15, brlz 16, br 17, HALT 18
 */

const MNEMONICS = {
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
  // pseudos handled specially: data, SET
};

const BRANCH_LIKE = new Set(["br", "brz", "brlz", "call"]);

function toHex32(value) {
  const u32 = value >>> 0;
  return u32.toString(16).toUpperCase().padStart(8, "0");
}

function toHexInstruction(opcode, operand24) {
  // operand24 is treated as 24-bit two's complement
  const op24 = operand24 & 0xffffff;
  const word = (op24 << 8) | (opcode & 0xff);
  return toHex32(word);
}

function parseNumberToken(tok) {
  if (typeof tok !== "string") return { ok: false, value: 0 };

  const s = tok.trim();
  if (s.length === 0) return { ok: false, value: 0 };

  // hex
  if (/^[+-]?0x[0-9a-fA-F]+$/.test(s)) {
    const sign = s[0] === "-" ? -1 : 1;
    const body = s.replace(/^[+-]?0x/i, "");
    const v = parseInt(body, 16) * sign;
    return { ok: true, value: v };
  }

  // octal: leading 0 and only digits 0-7
  if (/^[+-]?0[0-7]+$/.test(s)) {
    const sign = s[0] === "-" ? -1 : 1;
    const body = s.replace(/^[+-]?0/, "");
    const v = parseInt(body, 8) * sign;
    return { ok: true, value: v };
  }

  // decimal
  if (/^[+-]?\d+$/.test(s)) {
    const v = parseInt(s, 10);
    return { ok: true, value: v };
  }

  return { ok: false, value: 0 };
}

/**
 * Assembler . Returns:
 * {
 *   words: [ { address: number, text: string, hex: "XXXXXXXX" } ],
 *   labels: { name: address_or_value },
 *   warnings: [string],
 *   errors: [string]  // we add messages here but continue producing output
 * }
 */
export default function assemble(sourceText) {
  const warnings = [];
  const errors = [];
  const labels = Object.create(null); // map label -> numeric address or value (for SET)
  const lines = sourceText.split(/\r?\n/);

  // Normalise lines: keep original text and a cleaned statement
  const parsed = lines.map((raw, lineno) => {
    // strip comments starting with ; or #
    const noComment = raw.replace(/(;|#).*$/, "");
    return {
      raw,
      lineno: lineno + 1,
      text: noComment,
    };
  });

  // PASS 1: find labels and compute addresses
  let address = 0; // word-addressed
  parsed.forEach((line) => {
    const text = line.text.trim();
    if (text === "") {
      // could be a label-only line in the raw if raw had label + comment only, handle below
      // but since trimmed is empty, no tokens -> nothing to do
      // however we still must consider if raw had a label before comment; we'll handle below by parsing original text
    }

    // We need to handle label: possibly followed by instruction with no space (label:instr)
    // Extract leading label if present
    const labelMatch = line.text.match(/^\s*([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (labelMatch) {
      const name = labelMatch[1];
      const rest = labelMatch[2] || "";
      // If the label already exists, warn duplicate
      if (Object.prototype.hasOwnProperty.call(labels, name)) {
        warnings.push(`Line ${line.lineno}: duplicate label '${name}' (previous value ${labels[name]})`);
      } else {
        // By default label gets current address. Important: if it's SET later, it may be overridden by SET handling below.
        labels[name] = address;
      }

      const restTrim = rest.trim();
      if (restTrim.length === 0) {
        // label-only line -> no emitted word (just label assigned to current address)
        return;
      }
      // We fall through to treat restTrim as the statement
      const stmt = restTrim;
      const tokens = stmt.split(/\s+/);
      const mnemonic = tokens[0].toLowerCase();

      if (mnemonic === "set") {
        // SET label value -> assign label to a number (value), no address consumed.
        // here, the label was already set to 'address'; override with SET numeric value.
        const operandToken = tokens.slice(1).join(" ");
        const { ok, value } = parseNumberToken(operandToken);
        if (!ok) {
          warnings.push(`Line ${line.lineno}: SET for '${name}' has invalid number '${operandToken}', treating as 0`);
        }
        labels[name] = value;
        // SET does not consume an address.
        return;
      }

      if (mnemonic === "data") {
        // consumes a word
        address += 1;
        return;
      }

      // otherwise, consumes a word (normal instruction)
      address += 1;
      return;
    }

    // No leading label syntax; handle normal statement
    const stmtTrim = line.text.trim();
    if (stmtTrim.length === 0) return;

    const tokens = stmtTrim.split(/\s+/);
    const mnemonic = tokens[0].toLowerCase();

    if (mnemonic === "set") {
      // SET without label is invalid (we need a label). Warn and ignore.
      warnings.push(`Line ${line.lineno}: SET without label is ignored`);
      return;
    }

    if (mnemonic === "data") {
      address += 1;
      return;
    }

    // Known mnemonic? consume one word. Unknown mnemonic: still consume one word (assembler resilient)
    address += 1;
  });

  // PASS 2: actually emit words
  const words = [];
  address = 0;

  parsed.forEach((lineObj) => {
    const raw = lineObj.raw;
    const lineno = lineObj.lineno;

    // Remove comments and trim
    const codeOnly = raw.replace(/(;|#).*$/, "");
    const trimmed = codeOnly.trim();

    // If trimmed empty, but maybe it had label before comment e.g. "label: ; comment"
    // Try to detect label-only from original codeOnly
    const labelOnlyMatch = codeOnly.match(/^\s*([A-Za-z][A-Za-z0-9]*):\s*$/);
    if (labelOnlyMatch) {
      // label already assigned in pass 1; no emission
      return;
    }

    if (trimmed === "") {
      // nothing to emit
      return;
    }

    // Handle label at start with statement following (or not)
    let stmt = trimmed;
    let leadingLabel = null;
    const labelStmtMatch = stmt.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (labelStmtMatch) {
      leadingLabel = labelStmtMatch[1];
      stmt = labelStmtMatch[2].trim();
      // If stmt empty, label only line already handled above
      if (!stmt) return;
    }

    const tokens = stmt.split(/\s+/);
    const mnemonicRaw = tokens[0];
    const mnemonic = mnemonicRaw.toLowerCase();
    const operandToken = tokens.slice(1).join(" ").trim(); // allow operand with sign, etc.

    // Handle pseudo-instruction SET when used without label (we warned in pass1)
    if (mnemonic === "set") {
      warnings.push(`Line ${lineno}: SET used without label or handled earlier - ignoring`);
      return;
    }

    if (mnemonic === "data") {
      // data operand -> store raw 32-bit value
      let value = 0;
      if (operandToken.length > 0) {
        const { ok, value: v } = parseNumberToken(operandToken);
        if (!ok) {
          warnings.push(`Line ${lineno}: invalid number for DATA '${operandToken}', using 0`);
        }
        value = v;
      } else {
        warnings.push(`Line ${lineno}: DATA without operand, using 0`);
      }
      words.push({
        address,
        text: stmt,
        hex: toHex32(value),
      });
      address += 1;
      return;
    }

    // Normal instruction (including unknown mnemonics - assemble as zero opcode)
    const opcode = MNEMONICS.hasOwnProperty(mnemonic) ? MNEMONICS[mnemonic] : null;

    if (opcode === null) {
      warnings.push(`Line ${lineno}: unknown mnemonic '${mnemonicRaw}', opcode 0 used`);
    }

    // compute operand value
    let operandValue = 0;
    let operandOk = true;

    if (operandToken.length === 0) {
      // no operand; operand stays 0
    } else {
      // operand may be a number or a label
      const numParse = parseNumberToken(operandToken);
      if (numParse.ok) {
        operandValue = numParse.value;
      } else {
        // treat as label
        const labelName = operandToken;
        if (Object.prototype.hasOwnProperty.call(labels, labelName)) {
          const labelVal = labels[labelName];

          if (BRANCH_LIKE.has(mnemonic)) {
            // relative displacement = target - (current + 1)
            const displacement = labelVal - (address + 1);
            operandValue = displacement;
          } else {
            // absolute address (word-addressed)
            operandValue = labelVal;
          }
        } else {
          warnings.push(`Line ${lineno}: unknown label '${labelName}', using 0`);
          operandOk = false;
          operandValue = 0;
        }
      }
    }

    // Create final machine word:
    // - If opcode is null (unknown mnemonic), encode opcode 0
    // - For safety, treat operand as signed, then convert to 24-bit two's complement by masking
    const op = (opcode === null) ? 0 : opcode;
    const operand24 = operandValue & 0xffffff;

    const hex = toHexInstruction(op, operand24);

    words.push({
      address,
      text: stmt,
      hex,
    });

    address += 1;
  });

  return {
    words,
    labels,
    warnings,
    errors,
  };
}

export function buildState(assemblyResult, memorySize) {
  const { words } = assemblyResult;

  if (words.length > memorySize) {
    return {
      ok: false,
      error: `Program size (${words.length}) exceeds memory size (${memorySize})`,
    };
  }

  const memory = Array.from({ length: memorySize }).map(
    () => "0x00000000"
  );

  words.forEach((w) => {
    memory[w.address] = `0x${w.hex}`;
  });

  const programEnd = words.length;

  const registers = [
    { name: "A", value: "0x00000000" },
    { name: "B", value: "0x00000000" },
    { name: "PC", value: "0x00000000" },
    {
      name: "SP",
      value: `0x${programEnd
        .toString(16)
        .toUpperCase()
        .padStart(8, "0")}`,
    },
  ];

  return {
    ok: true,
    memory,
    registers,
    programEnd,
  };
}