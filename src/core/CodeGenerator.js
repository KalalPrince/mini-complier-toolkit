/**
 * CodeGenerator.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Target Code Generator adapter module that bridges Stage 4 (Optimized Quadruples)
 * to Stage 5 (Two-Pass Assembler).
 *
 * Translates Three-Address Code / Quadruples into standard educational SIC assembly
 * statements using Accumulator-based instructions (LDA, STA, ADD, SUB, MUL, DIV, HLT)
 * and allocates storage directives (WORD, RESW).
 */

export class CodeGenerator {
  /**
   * Helper to check if a string represents a numeric constant.
   * @private
   */
  _isNumeric(val) {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    if (!str) return false;
    return /^-?\d+(\.\d+)?$/.test(str);
  }

  /**
   * Generates a safe assembly label name.
   * Normalizes symbols to uppercase and replaces special characters.
   * @private
   */
  _normalizeLabel(name) {
    return String(name).trim().toUpperCase();
  }

  /**
   * Translates optimized Quadruples into valid SIC Assembly text.
   *
   * @param {Array<Quadruple|Object>} quadruples - Intermediate instructions
   * @param {Array<Object>} [declaredSymbols=[]] - Symbols from SymbolTable
   * @param {Object} [options={}] - Config { programName: 'PROG', startAddress: '1000' }
   * @returns {{ assemblySource: string, lines: string[], allocatedData: Array<{ label: string, directive: string, value: string }> }}
   */
  generateAssembly(quadruples, declaredSymbols = [], options = {}) {
    const programName = (options.programName || 'PROG').toUpperCase();
    const startAddress = options.startAddress || '1000';

    const codeLines = [];
    const constantsMap = new Map(); // value -> labelName (e.g. 5 -> 'C_5')
    const variablesSet = new Set();  // Set of all variable/temp names used
    let constCounter = 1;

    // Register all declared symbols from Stage 1/2 SymbolTable
    for (const sym of declaredSymbols) {
      if (sym && sym.name) {
        variablesSet.add(this._normalizeLabel(sym.name));
      }
    }

    // Helper to resolve an operand (literal constant or variable/temp)
    const resolveOperand = (operand) => {
      if (operand === null || operand === undefined) return '';
      const str = String(operand).trim();

      if (this._isNumeric(str)) {
        // Numeric literal: allocate a constant data word
        const cleanVal = parseInt(str, 10);
        const constKey = String(cleanVal);
        if (!constantsMap.has(constKey)) {
          const labelName = `C_${Math.abs(cleanVal)}_${constCounter++}`;
          constantsMap.set(constKey, { label: labelName, value: cleanVal });
        }
        return constantsMap.get(constKey).label;
      }

      // Variable or compiler-generated temporary (e.g. 't1')
      const varName = this._normalizeLabel(str);
      variablesSet.add(varName);
      return varName;
    };

    // Header directive
    codeLines.push(`${programName.padEnd(8, ' ')} START   ${startAddress}`);

    // Translate each quadruple into Accumulator instructions
    for (const quad of quadruples) {
      const op = quad.op;
      const resLabel = resolveOperand(quad.result);

      if (op === '=') {
        const srcLabel = resolveOperand(quad.arg1);
        codeLines.push(`         LDA     ${srcLabel}`);
        codeLines.push(`         STA     ${resLabel}`);
      } else if (op === '+') {
        const arg1Label = resolveOperand(quad.arg1);
        const arg2Label = resolveOperand(quad.arg2);
        codeLines.push(`         LDA     ${arg1Label}`);
        codeLines.push(`         ADD     ${arg2Label}`);
        codeLines.push(`         STA     ${resLabel}`);
      } else if (op === '-') {
        const arg1Label = resolveOperand(quad.arg1);
        const arg2Label = resolveOperand(quad.arg2);
        codeLines.push(`         LDA     ${arg1Label}`);
        codeLines.push(`         SUB     ${arg2Label}`);
        codeLines.push(`         STA     ${resLabel}`);
      } else if (op === '*') {
        const arg1Label = resolveOperand(quad.arg1);
        const arg2Label = resolveOperand(quad.arg2);
        codeLines.push(`         LDA     ${arg1Label}`);
        codeLines.push(`         MUL     ${arg2Label}`);
        codeLines.push(`         STA     ${resLabel}`);
      } else if (op === '/') {
        const arg1Label = resolveOperand(quad.arg1);
        const arg2Label = resolveOperand(quad.arg2);
        codeLines.push(`         LDA     ${arg1Label}`);
        codeLines.push(`         DIV     ${arg2Label}`);
        codeLines.push(`         STA     ${resLabel}`);
      }
    }

    // Terminate execution before data definitions
    codeLines.push(`         HLT`);

    // Data Allocation Section
    const allocatedData = [];

    // 1. Allocate storage for all variables and compiler temporaries
    for (const varName of variablesSet) {
      codeLines.push(`${varName.padEnd(8, ' ')} RESW    1`);
      allocatedData.push({ label: varName, directive: 'RESW', value: '1' });
    }

    // 2. Allocate initialized constants
    for (const { label, value } of constantsMap.values()) {
      codeLines.push(`${label.padEnd(8, ' ')} WORD    ${value}`);
      allocatedData.push({ label, directive: 'WORD', value: String(value) });
    }

    // Footer directive
    codeLines.push(`         END     ${programName}`);

    const assemblySource = codeLines.join('\n');

    return {
      assemblySource,
      lines: codeLines,
      allocatedData
    };
  }
}
