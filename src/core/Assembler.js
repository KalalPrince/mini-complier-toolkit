/**
 * Assembler.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Implements a classical, educational Two-Pass Assembler based on the
 * Leland L. Beck SIC architecture.
 *
 * PASS 1:
 *  - Parses source lines into [LABEL] OPCODE [OPERAND] [COMMENT]
 *  - Initializes and maintains the Location Counter (LOCCTR)
 *  - Builds the Symbol Table (SYMTAB) and detects duplicate labels
 *  - Calculates memory sizes for instructions and data directives
 *  - Emits the Intermediate Representation
 *
 * PASS 2:
 *  - Uses SYMTAB to resolve symbolic operands
 *  - Looks up operation codes in OPTAB
 *  - Generates machine/object code for instructions, WORD, and BYTE
 *  - Reports undefined symbols and missing operands
 *  - Emits a complete Program Listing and standard Object Program Records (H, T, E)
 */

/**
 * Standard Machine Opcode Table (OPTAB / MOT).
 * Fixed 3-byte instruction format: [Opcode (2 hex)][Address (4 hex)]
 */
export const OPTAB = {
  LDA: { opcode: '00', length: 3, description: 'Load Accumulator' },
  LDX: { opcode: '04', length: 3, description: 'Load Index Register' },
  LDL: { opcode: '08', length: 3, description: 'Load Linkage Register' },
  STA: { opcode: '0C', length: 3, description: 'Store Accumulator' },
  STX: { opcode: '10', length: 3, description: 'Store Index Register' },
  STL: { opcode: '14', length: 3, description: 'Store Linkage Register' },
  ADD: { opcode: '18', length: 3, description: 'Add' },
  SUB: { opcode: '1C', length: 3, description: 'Subtract' },
  MUL: { opcode: '20', length: 3, description: 'Multiply' },
  DIV: { opcode: '24', length: 3, description: 'Divide' },
  COMP: { opcode: '28', length: 3, description: 'Compare' },
  JEQ: { opcode: '30', length: 3, description: 'Jump if Equal' },
  JGT: { opcode: '34', length: 3, description: 'Jump if Greater Than' },
  JLT: { opcode: '38', length: 3, description: 'Jump if Less Than' },
  J: { opcode: '3C', length: 3, description: 'Unconditional Jump' },
  JSUB: { opcode: '48', length: 3, description: 'Jump to Subroutine' },
  RSUB: { opcode: '4C', length: 3, description: 'Return from Subroutine' },
  LDCH: { opcode: '50', length: 3, description: 'Load Character' },
  STCH: { opcode: '54', length: 3, description: 'Store Character' },
  // Educational convenience alias: HLT (Halt execution)
  HLT: { opcode: 'FF', length: 3, description: 'Halt Execution' }
};

/**
 * Supported Assembler Directives (Pseudo-Opcode Table / POT).
 */
export const DIRECTIVES = ['START', 'END', 'WORD', 'BYTE', 'RESW', 'RESB'];

/**
 * Utility functions for hexadecimal formatting.
 */
export function toHex4(num) {
  return (num & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

export function toHex6(num) {
  return (num & 0xffffff).toString(16).toUpperCase().padStart(6, '0');
}

export function toHex2(num) {
  return (num & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Dedicated, deterministic Assembly Symbol Table.
 */
export class AssemblerSymbolTable {
  constructor() {
    this.symbols = new Map();
  }

  insert(label, address, lineDeclared) {
    const name = String(label).trim();
    if (this.symbols.has(name)) {
      return { success: false, message: `Duplicate label '${name}' already defined.` };
    }
    const entry = {
      symbol: name,
      address,
      addressHex: toHex4(address),
      lineDeclared
    };
    this.symbols.set(name, entry);
    return { success: true, entry };
  }

  lookup(label) {
    if (!label) return null;
    return this.symbols.get(String(label).trim()) || null;
  }

  has(label) {
    if (!label) return false;
    return this.symbols.has(String(label).trim());
  }

  getAllEntries() {
    return Array.from(this.symbols.values());
  }

  clear() {
    this.symbols.clear();
  }
}

/**
 * Two-Pass Assembler Engine.
 */
export class Assembler {
  constructor() {
    this.optab = { ...OPTAB };
    this.directives = [...DIRECTIVES];
  }

  /**
   * Helper to strip comments and split a source line into tokens.
   * Preserves characters enclosed in single quotes (e.g. BYTE C'.').
   * @private
   */
  _parseLine(rawLine) {
    if (typeof rawLine !== 'string') return { line: '', tokens: [] };

    let inQuotes = false;
    let codePart = rawLine;

    for (let i = 0; i < rawLine.length; i++) {
      const ch = rawLine[i];
      if (ch === "'") {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (ch === ';' || ch === '.') {
          codePart = rawLine.slice(0, i);
          break;
        }
        if (ch === '/' && i + 1 < rawLine.length && rawLine[i + 1] === '/') {
          codePart = rawLine.slice(0, i);
          break;
        }
      }
    }

    const trimmed = codePart.trim();
    if (!trimmed) {
      return { line: rawLine, tokens: [] };
    }

    // Tokenize taking quoted strings into account
    const tokens = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (ch === "'") {
        insideQuotes = !insideQuotes;
        current += ch;
      } else if (/\s/.test(ch) && !insideQuotes) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }
    if (current.length > 0) {
      tokens.push(current);
    }

    return { line: rawLine, tokens };
  }

  /**
   * Checks if a token is a known instruction or directive mnemonic.
   * @private
   */
  _isMnemonic(token) {
    if (!token) return false;
    const upper = token.toUpperCase();
    return Boolean(this.optab[upper]) || this.directives.includes(upper);
  }

  /**
   * Classifies a token list into { label, opcode, operand }.
   * Intelligently resolves column-aligned and free-format inputs.
   * @private
   */
  _classifyTokens(tokens) {
    if (!tokens || tokens.length === 0) {
      return { label: '', opcode: '', operand: '' };
    }

    if (tokens.length === 1) {
      if (this._isMnemonic(tokens[0])) {
        return { label: '', opcode: tokens[0], operand: '' };
      }
      return { label: tokens[0], opcode: '', operand: '' };
    }

    if (tokens.length === 2) {
      // Case A: e.g. "LDA NUM" or "START 1000" or "END FIRST"
      if (this._isMnemonic(tokens[0])) {
        return { label: '', opcode: tokens[0], operand: tokens[1] };
      }
      // Case B: e.g. "FIRST RSUB" or "LOOP HLT"
      if (this._isMnemonic(tokens[1])) {
        return { label: tokens[0], opcode: tokens[1], operand: '' };
      }
      // Fallback
      return { label: tokens[0], opcode: tokens[1], operand: '' };
    }

    // 3 or more tokens
    // Standard: "FIRST LDA NUM" -> tokens[1] is mnemonic
    if (this._isMnemonic(tokens[1])) {
      return {
        label: tokens[0],
        opcode: tokens[1],
        operand: tokens.slice(2).join(' ')
      };
    }

    // e.g. "BYTE C'HELLO WORLD'" or line with no label but multi-word operand
    if (this._isMnemonic(tokens[0])) {
      return {
        label: '',
        opcode: tokens[0],
        operand: tokens.slice(1).join(' ')
      };
    }

    // Fallback: tokens[0] is label, tokens[1] is opcode, rest is operand
    return {
      label: tokens[0],
      opcode: tokens[1],
      operand: tokens.slice(2).join(' ')
    };
  }

  /**
   * Assembles a source program using the classical two-pass process.
   *
   * @param {string|string[]} sourceInput - Raw assembly code string or array of lines
   * @returns {Object} Complete assembled toolkit results
   */
  assemble(sourceInput) {
    let sourceLines = [];
    if (Array.isArray(sourceInput)) {
      sourceLines = sourceInput;
    } else if (typeof sourceInput === 'string') {
      sourceLines = sourceInput.split(/\r?\n/);
    } else {
      return {
        success: false,
        errors: [{ lineNum: 1, message: 'Invalid input: source code must be a string or array of lines.' }]
      };
    }

    const symtab = new AssemblerSymbolTable();
    const intermediateCode = [];
    const errors = [];
    const warnings = [];

    let startingAddress = 0x1000;
    let locctr = startingAddress;
    let programName = 'PROG';
    let endEncountered = false;
    let firstExecLabel = null;

    // =========================================================================
    // PASS 1: Line Parsing, LOCCTR Maintenance, and SYMTAB Population
    // =========================================================================
    for (let i = 0; i < sourceLines.length; i++) {
      const lineNum = i + 1;
      const rawLine = sourceLines[i];
      const { tokens } = this._parseLine(rawLine);

      if (tokens.length === 0) {
        // Blank line or comment-only line
        continue;
      }

      const { label, opcode, operand } = this._classifyTokens(tokens);
      const upperOpcode = opcode.toUpperCase();

      // Handle START Directive
      if (upperOpcode === 'START') {
        if (label) {
          programName = label;
          symtab.insert(label, locctr, lineNum);
        }
        if (operand) {
          const parsed = parseInt(operand, 16);
          if (!isNaN(parsed) && parsed >= 0) {
            startingAddress = parsed;
            locctr = parsed;
          } else {
            errors.push({ lineNum, message: `Invalid hexadecimal address '${operand}' in START directive.` });
          }
        }
        intermediateCode.push({
          lineNum,
          address: locctr,
          addressHex: toHex4(locctr),
          label,
          opcode: 'START',
          operand,
          source: rawLine
        });
        continue;
      }

      // Check for labels on instructions or data directives
      if (label) {
        const insertRes = symtab.insert(label, locctr, lineNum);
        if (!insertRes.success) {
          errors.push({ lineNum, message: `Duplicate label '${label}' defined at line ${lineNum}.` });
        }
      }

      // Record intermediate entry
      const currentAddress = locctr;
      intermediateCode.push({
        lineNum,
        address: currentAddress,
        addressHex: toHex4(currentAddress),
        label,
        opcode: upperOpcode,
        operand,
        source: rawLine
      });

      // Advance LOCCTR based on instruction or directive
      if (this.optab[upperOpcode]) {
        locctr += this.optab[upperOpcode].length;
      } else if (upperOpcode === 'WORD') {
        if (!operand || isNaN(parseInt(operand, 10))) {
          errors.push({ lineNum, message: `Directive WORD requires an integer operand at line ${lineNum}.` });
        }
        locctr += 3;
      } else if (upperOpcode === 'RESW') {
        const count = parseInt(operand, 10);
        if (isNaN(count) || count < 0) {
          errors.push({ lineNum, message: `Directive RESW requires a positive integer count at line ${lineNum}.` });
        } else {
          locctr += 3 * count;
        }
      } else if (upperOpcode === 'RESB') {
        const count = parseInt(operand, 10);
        if (isNaN(count) || count < 0) {
          errors.push({ lineNum, message: `Directive RESB requires a positive integer count at line ${lineNum}.` });
        } else {
          locctr += count;
        }
      } else if (upperOpcode === 'BYTE') {
        const cMatch = operand.match(/^C'([^']*)'$/i);
        const xMatch = operand.match(/^X'([0-9a-fA-F]*)'$/i);

        if (cMatch) {
          locctr += cMatch[1].length;
        } else if (xMatch) {
          const hexLen = xMatch[1].length;
          locctr += Math.ceil(hexLen / 2);
        } else {
          errors.push({
            lineNum,
            message: `Invalid BYTE literal syntax '${operand}' at line ${lineNum}. Expected C'...' or X'...'.`
          });
          locctr += 1;
        }
      } else if (upperOpcode === 'END') {
        endEncountered = true;
        firstExecLabel = operand || null;
        break;
      } else if (upperOpcode) {
        errors.push({ lineNum, message: `Invalid opcode or directive '${opcode}' at line ${lineNum}.` });
        locctr += 3; // Recover gracefully
      }

      if (locctr > 0xffff) {
        errors.push({ lineNum, message: `Address overflow: LOCCTR (${toHex4(locctr)}) exceeded 16-bit space.` });
      }
    }

    if (!endEncountered) {
      warnings.push({ lineNum: sourceLines.length, message: 'Missing END directive in source program.' });
    }

    const programLength = Math.max(0, locctr - startingAddress);

    // =========================================================================
    // PASS 2: Symbol Resolution, Code Synthesis, and Record Assembly
    // =========================================================================
    const listing = [];
    const objectChunks = []; // For building Text records: { startAddr, bytesCount, codes }
    let currentChunk = null;

    for (const record of intermediateCode) {
      const { lineNum, address, addressHex, label, opcode, operand, source } = record;
      let objectCode = null;

      if (opcode === 'START' || opcode === 'END') {
        objectCode = null;
      } else if (this.optab[opcode]) {
        const opHex = this.optab[opcode].opcode;

        if (opcode === 'RSUB' || opcode === 'HLT') {
          objectCode = `${opHex}0000`;
        } else {
          let addrHex = '0000';
          if (!operand) {
            errors.push({ lineNum, message: `Missing operand for instruction '${opcode}' at line ${lineNum}.` });
          } else {
            const sym = symtab.lookup(operand);
            if (sym) {
              addrHex = sym.addressHex;
            } else if (/^-?\d+$/.test(operand)) {
              // Direct numeric address support
              addrHex = toHex4(parseInt(operand, 10));
            } else {
              errors.push({
                lineNum,
                message: `Undefined symbol '${operand}' referenced at line ${lineNum}.`
              });
            }
          }
          objectCode = `${opHex}${addrHex}`;
        }
      } else if (opcode === 'WORD') {
        const val = parseInt(operand, 10);
        objectCode = isNaN(val) ? '000000' : toHex6(val);
      } else if (opcode === 'BYTE') {
        const cMatch = operand.match(/^C'([^']*)'$/i);
        const xMatch = operand.match(/^X'([0-9a-fA-F]*)'$/i);

        if (cMatch) {
          let hexStr = '';
          for (let c = 0; c < cMatch[1].length; c++) {
            hexStr += cMatch[1].charCodeAt(c).toString(16).toUpperCase().padStart(2, '0');
          }
          objectCode = hexStr;
        } else if (xMatch) {
          let hex = xMatch[1].toUpperCase();
          if (hex.length % 2 !== 0) hex = `0${hex}`;
          objectCode = hex;
        }
      } else if (opcode === 'RESW' || opcode === 'RESB') {
        objectCode = null; // Uninitialized storage generates no object code
      }

      listing.push({
        lineNum,
        addressHex,
        label,
        opcode,
        operand,
        objectCode,
        source
      });

      // Assemble Text Record blocks
      if (objectCode !== null) {
        const codeByteLen = objectCode.length / 2;
        if (!currentChunk) {
          currentChunk = { startAddr: address, bytesCount: 0, codes: [] };
        }

        // Standard Text record capacity is up to 30 bytes (60 hex chars)
        if (currentChunk.bytesCount + codeByteLen > 30) {
          objectChunks.push(currentChunk);
          currentChunk = { startAddr: address, bytesCount: 0, codes: [] };
        }

        currentChunk.codes.push(objectCode);
        currentChunk.bytesCount += codeByteLen;
      } else {
        // Gap in object code (e.g. RESW/RESB) closes current Text record
        if (currentChunk && (opcode === 'RESW' || opcode === 'RESB')) {
          objectChunks.push(currentChunk);
          currentChunk = null;
        }
      }
    }

    if (currentChunk && currentChunk.codes.length > 0) {
      objectChunks.push(currentChunk);
    }

    // Assemble Educational Standard Object Program Records (H, T, E)
    const objectProgram = [];
    const cleanProgName = (programName || 'PROG').slice(0, 6).padEnd(6, ' ');

    // 1. Header Record
    objectProgram.push(`H^${cleanProgName}^${toHex6(startingAddress)}^${toHex6(programLength)}`);

    // 2. Text Records
    for (const chunk of objectChunks) {
      const startHex = toHex6(chunk.startAddr);
      const lenHex = toHex2(chunk.bytesCount);
      const codeSeq = chunk.codes.join(' ');
      objectProgram.push(`T^${startHex}^${lenHex}^${codeSeq}`);
    }

    // 3. End Record
    let firstExecAddr = startingAddress;
    if (firstExecLabel) {
      const sym = symtab.lookup(firstExecLabel);
      if (sym) {
        firstExecAddr = sym.address;
      }
    }
    objectProgram.push(`E^${toHex6(firstExecAddr)}`);

    const instructionCount = listing.filter(r => this.optab[r.opcode]).length;

    return {
      success: errors.length === 0,
      programName,
      startAddress: startingAddress,
      startAddressHex: toHex4(startingAddress),
      programLength,
      programLengthHex: toHex4(programLength),
      sourceLines,
      intermediateCode,
      symbolTable: symtab.getAllEntries(),
      listing,
      objectCode: objectProgram,
      errors,
      warnings,
      metrics: {
        startAddress: startingAddress,
        startAddressHex: toHex4(startingAddress),
        programLength,
        programLengthHex: toHex4(programLength),
        instructionCount,
        symbolCount: symtab.getAllEntries().length
      }
    };
  }
}
