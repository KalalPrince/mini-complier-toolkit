/**
 * CodeOptimizer.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Implements machine-independent Intermediate Code Optimization.
 * Supports:
 *   1. Constant Folding (evaluates compile-time constant arithmetic)
 *   2. Algebraic Simplification (simplifies identities: +0, -0, *1, *0, /1, x-x)
 *   3. Common Subexpression Elimination (CSE) (reuses previously computed expressions)
 *
 * Compatible with Quadruple instances and plain { op, arg1, arg2, result } objects.
 */

import { Quadruple } from './QuadrupleGen.js';

/**
 * Code Optimizer Engine.
 */
export class CodeOptimizer {
  constructor() {
    this.commutativeOps = ['+', '*'];
  }

  /**
   * Helper to determine whether a string operand represents a finite numeric literal.
   * @param {string|number} val
   * @returns {boolean}
   */
  isNumeric(val) {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    if (!str) return false;
    return /^-?\d+(\.\d+)?$/.test(str);
  }

  /**
   * Generates a 3-Address Code string from an instruction's fields.
   * @private
   */
  _format3AC(op, arg1, arg2, result) {
    if (op === '=') {
      return `${result} = ${arg1}`;
    }
    return `${result} = ${arg1} ${op} ${arg2 !== null ? arg2 : ''}`.trim();
  }

  /**
   * Validates and normalizes an input list of quadruples or plain objects.
   * @param {Array} quads
   * @returns {{ valid: boolean, normalized?: Quadruple[], error?: string }}
   * @private
   */
  _normalizeInput(quads) {
    if (!quads || !Array.isArray(quads) || quads.length === 0) {
      return { valid: false, error: 'Input quadruples cannot be empty.' };
    }

    const normalized = [];

    for (let i = 0; i < quads.length; i++) {
      const q = quads[i];
      if (!q || typeof q !== 'object') {
        return { valid: false, error: `Invalid quadruple at index ${i}: not an object.` };
      }
      if (!q.op || q.arg1 === undefined || q.result === undefined) {
        return { valid: false, error: `Invalid quadruple structure at index ${i}: missing required fields.` };
      }

      normalized.push(new Quadruple(q.op, q.arg1, q.arg2 !== undefined ? q.arg2 : null, q.result));
    }

    return { valid: true, normalized };
  }

  /**
   * Optimizes a sequence of Quadruples using Constant Folding, Algebraic Simplification,
   * and Common Subexpression Elimination.
   *
   * @param {Array<Quadruple|Object>} inputQuadruples
   * @returns {{
   *   success: boolean,
   *   originalQuadruples: Quadruple[],
   *   optimizedQuadruples: Quadruple[],
   *   original3AC: string[],
   *   optimized3AC: string[],
   *   optimizations: Array<{ type: string, description: string, before: string, after: string }>,
   *   optimizationCount: number,
   *   metrics: {
   *     originalInstructionCount: number,
   *     optimizedInstructionCount: number,
   *     constantFoldingCount: number,
   *     algebraicSimplificationCount: number,
   *     cseCount: number
   *   },
   *   error: string|null
   * }}
   */
  optimize(inputQuadruples) {
    const check = this._normalizeInput(inputQuadruples);
    if (!check.valid) {
      return {
        success: false,
        originalQuadruples: [],
        optimizedQuadruples: [],
        original3AC: [],
        optimized3AC: [],
        optimizations: [],
        optimizationCount: 0,
        metrics: {
          originalInstructionCount: 0,
          optimizedInstructionCount: 0,
          constantFoldingCount: 0,
          algebraicSimplificationCount: 0,
          cseCount: 0
        },
        error: check.error
      };
    }

    const originalQuadruples = check.normalized.map(q => new Quadruple(q.op, q.arg1, q.arg2, q.result));
    const original3AC = originalQuadruples.map(q => q.toThreeAddressCode());

    // Working copy for iterative optimization
    let currentQuads = check.normalized.map(q => new Quadruple(q.op, q.arg1, q.arg2, q.result));
    const optimizations = [];

    let passCount = 0;
    const maxPasses = 5; // Fixed-point safety limit
    let anyChangeInRound = true;

    while (anyChangeInRound && passCount < maxPasses) {
      anyChangeInRound = false;
      passCount++;

      // Map of known constant values for internal propagation during folding
      const constantValues = new Map();
      // Map of computed subexpressions for CSE: key -> { resultTemp, index }
      const expressionCache = new Map();

      for (let i = 0; i < currentQuads.length; i++) {
        const quad = currentQuads[i];
        const before3AC = quad.toThreeAddressCode();

        // Internal propagation of known constants into operand arguments
        if (constantValues.has(quad.arg1)) {
          quad.arg1 = constantValues.get(quad.arg1);
        }
        if (quad.arg2 !== null && constantValues.has(quad.arg2)) {
          quad.arg2 = constantValues.get(quad.arg2);
        }

        // =================================================================
        // PASS 1: CONSTANT FOLDING
        // =================================================================
        if (quad.op !== '=' && this.isNumeric(quad.arg1) && this.isNumeric(quad.arg2)) {
          const n1 = parseFloat(quad.arg1);
          const n2 = parseFloat(quad.arg2);
          let foldedVal = null;
          let safeToFold = true;

          switch (quad.op) {
            case '+':
              foldedVal = n1 + n2;
              break;
            case '-':
              foldedVal = n1 - n2;
              break;
            case '*':
              foldedVal = n1 * n2;
              break;
            case '/':
              if (n2 === 0) {
                safeToFold = false; // Safety check: Division by zero cannot be folded
              } else {
                foldedVal = n1 / n2;
              }
              break;
            case '%':
              if (n2 === 0) {
                safeToFold = false;
              } else {
                foldedVal = n1 % n2;
              }
              break;
            default:
              safeToFold = false;
          }

          if (safeToFold && foldedVal !== null) {
            // Format cleanly: keep as integer string if whole number
            const formattedVal = Number.isInteger(foldedVal) ? String(foldedVal) : String(foldedVal);
            quad.op = '=';
            quad.arg1 = formattedVal;
            quad.arg2 = null;

            const after3AC = quad.toThreeAddressCode();
            optimizations.push({
              type: 'Constant Folding',
              description: `Folded constant expression: ${n1} ${quad.op} ${n2} -> ${formattedVal}`,
              before: before3AC,
              after: after3AC
            });

            constantValues.set(quad.result, formattedVal);
            anyChangeInRound = true;
            continue;
          }
        }

        // If it's a simple assignment of a constant, record it for propagation
        if (quad.op === '=') {
          if (this.isNumeric(quad.arg1)) {
            constantValues.set(quad.result, quad.arg1);
          } else if (constantValues.has(quad.arg1)) {
            const val = constantValues.get(quad.arg1);
            quad.arg1 = val;
            constantValues.set(quad.result, val);
          }
        }

        // =================================================================
        // PASS 2: ALGEBRAIC SIMPLIFICATION
        // =================================================================
        if (quad.op !== '=') {
          let simplified = false;
          let replacementVal = null;

          const isArg1Zero = quad.arg1 === '0' || quad.arg1 === '0.0';
          const isArg2Zero = quad.arg2 === '0' || quad.arg2 === '0.0';
          const isArg1One = quad.arg1 === '1' || quad.arg1 === '1.0';
          const isArg2One = quad.arg2 === '1' || quad.arg2 === '1.0';

          // Addition: x + 0 -> x, 0 + x -> x
          if (quad.op === '+') {
            if (isArg2Zero) {
              replacementVal = quad.arg1;
              simplified = true;
            } else if (isArg1Zero) {
              replacementVal = quad.arg2;
              simplified = true;
            }
          }

          // Subtraction: x - 0 -> x, x - x -> 0
          else if (quad.op === '-') {
            if (isArg2Zero) {
              replacementVal = quad.arg1;
              simplified = true;
            } else if (quad.arg1 === quad.arg2) {
              replacementVal = '0';
              simplified = true;
            }
          }

          // Multiplication: x * 1 -> x, 1 * x -> x, x * 0 -> 0, 0 * x -> 0
          else if (quad.op === '*') {
            if (isArg2One) {
              replacementVal = quad.arg1;
              simplified = true;
            } else if (isArg1One) {
              replacementVal = quad.arg2;
              simplified = true;
            } else if (isArg2Zero || isArg1Zero) {
              replacementVal = '0';
              simplified = true;
            }
          }

          // Division: x / 1 -> x
          else if (quad.op === '/') {
            if (isArg2One) {
              replacementVal = quad.arg1;
              simplified = true;
            }
          }

          if (simplified && replacementVal !== null) {
            quad.op = '=';
            quad.arg1 = replacementVal;
            quad.arg2 = null;

            const after3AC = quad.toThreeAddressCode();
            optimizations.push({
              type: 'Algebraic Simplification',
              description: `Applied algebraic simplification rule: ${before3AC} -> ${after3AC}`,
              before: before3AC,
              after: after3AC
            });

            if (this.isNumeric(replacementVal)) {
              constantValues.set(quad.result, replacementVal);
            }

            anyChangeInRound = true;
            continue;
          }
        }

        // =================================================================
        // PASS 3: COMMON SUBEXPRESSION ELIMINATION (CSE)
        // =================================================================
        if (quad.op !== '=') {
          // Normalize operand order for commutative operators (+, *)
          let key;
          if (this.commutativeOps.includes(quad.op) && quad.arg1 > quad.arg2) {
            key = `${quad.op}:${quad.arg2}:${quad.arg1}`;
          } else {
            key = `${quad.op}:${quad.arg1}:${quad.arg2}`;
          }

          if (expressionCache.has(key)) {
            const previousResult = expressionCache.get(key);
            // Replace redundant computation with copy assignment from earlier result
            quad.op = '=';
            quad.arg1 = previousResult;
            quad.arg2 = null;

            const after3AC = quad.toThreeAddressCode();
            optimizations.push({
              type: 'Common Subexpression Elimination',
              description: `Reused common subexpression '${key.replace(/:/g, ' ')}' from ${previousResult}`,
              before: before3AC,
              after: after3AC
            });

            anyChangeInRound = true;
            continue;
          } else {
            expressionCache.set(key, quad.result);
          }
        }

        // Invalidate cached expressions if a variable is overwritten
        if (quad.result) {
          for (const [exprKey] of expressionCache.entries()) {
            const parts = exprKey.split(':');
            if (parts[1] === quad.result || parts[2] === quad.result) {
              expressionCache.delete(exprKey);
            }
          }
        }
      }
    }

    const optimized3AC = currentQuads.map(q => q.toThreeAddressCode());

    // Calculate metrics by category
    const constantFoldingCount = optimizations.filter(o => o.type === 'Constant Folding').length;
    const algebraicSimplificationCount = optimizations.filter(o => o.type === 'Algebraic Simplification').length;
    const cseCount = optimizations.filter(o => o.type === 'Common Subexpression Elimination').length;

    return {
      success: true,
      originalQuadruples,
      optimizedQuadruples: currentQuads,
      original3AC,
      optimized3AC,
      optimizations,
      optimizationCount: optimizations.length,
      metrics: {
        originalInstructionCount: originalQuadruples.length,
        optimizedInstructionCount: currentQuads.length,
        constantFoldingCount,
        algebraicSimplificationCount,
        cseCount
      },
      error: null
    };
  }
}
