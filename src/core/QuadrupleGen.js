/**
 * QuadrupleGen.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Implements Intermediate Code Generation (Three-Address Code).
 * Converts arithmetic and assignment expressions into standard Quadruples:
 *   (Operator, Arg1, Arg2, Result)
 * using the Shunting-Yard algorithm (Infix -> Postfix) and stack evaluation.
 */

/**
 * Represents a single Three-Address Code instruction in Quadruple format.
 */
export class Quadruple {
  constructor(op, arg1, arg2 = null, result) {
    this.op = String(op).trim();
    this.arg1 = String(arg1).trim();
    this.arg2 = arg2 !== null && arg2 !== undefined ? String(arg2).trim() : null;
    this.result = String(result).trim();
  }

  /**
   * Converts the quadruple into a human-readable 3-Address Code instruction.
   * e.g., "t1 = b * c" or "x = t2"
   * @returns {string}
   */
  toThreeAddressCode() {
    if (this.op === '=') {
      return `${this.result} = ${this.arg1}`;
    }
    return `${this.result} = ${this.arg1} ${this.op} ${this.arg2}`;
  }

  /**
   * Returns a standard tuple representation: (op, arg1, arg2, result)
   * @returns {string}
   */
  toString() {
    const secondArg = this.arg2 !== null ? this.arg2 : '-';
    return `(${this.op}, ${this.arg1}, ${secondArg}, ${this.result})`;
  }

  toJSON() {
    return {
      op: this.op,
      arg1: this.arg1,
      arg2: this.arg2,
      result: this.result
    };
  }
}

/**
 * Quadruple Generator Engine.
 */
export class QuadrupleGen {
  constructor() {
    this.tempCounter = 1;
    this.precedence = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
      '%': 2
    };
  }

  /**
   * Resets temporary variable counter.
   */
  reset() {
    this.tempCounter = 1;
  }

  /**
   * Checks if an operator is supported.
   * @param {string} op
   * @returns {boolean}
   */
  isOperator(op) {
    return Object.prototype.hasOwnProperty.call(this.precedence, op);
  }

  /**
   * Splits an assignment expression into target variable and RHS expression.
   * If not an assignment, returns target = null and full string as rhs.
   *
   * @param {string} inputStr
   * @returns {{ success: boolean, target: string|null, rhs: string, error?: string }}
   * @private
   */
  _parseAssignment(inputStr) {
    const trimmed = inputStr.trim();

    // Check for single assignment '=' (excluding '==', '!=', '<=', '>=')
    const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=(?!=)(.*)$/);
    if (match) {
      const target = match[1].trim();
      const rhs = match[2].trim();
      if (!rhs) {
        return {
          success: false,
          error: 'Syntax error: Missing right-hand side expression for assignment.'
        };
      }
      return { success: true, target, rhs };
    }

    // Check if an invalid assignment was attempted (e.g., '10 = a + b' or '(a + b) = c')
    const invalidAssignMatch = trimmed.match(/^(.*?)=(?!=)(.*)$/);
    if (invalidAssignMatch) {
      const badTarget = invalidAssignMatch[1].trim();
      return {
        success: false,
        error: `Invalid assignment target '${badTarget}'. Left-hand side must be a single identifier.`
      };
    }

    // Pure expression without assignment
    return { success: true, target: null, rhs: trimmed };
  }

  /**
   * Tokenizes an arithmetic expression into operands, operators, and parentheses.
   *
   * @param {string} exprStr
   * @returns {{ success: boolean, tokens?: Array<{ type: string, value: string }>, error?: string }}
   * @private
   */
  _tokenize(exprStr) {
    const tokens = [];
    let i = 0;
    const len = exprStr.length;

    while (i < len) {
      const ch = exprStr[i];

      // Skip whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Parentheses
      if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }

      // Operators (+, -, *, /, %)
      if (this.isOperator(ch)) {
        tokens.push({ type: 'OPERATOR', value: ch });
        i++;
        continue;
      }

      // Numbers (integers or decimals)
      if (/\d/.test(ch)) {
        let num = '';
        while (i < len && /[\d.]/.test(exprStr[i])) {
          num += exprStr[i];
          i++;
        }
        if ((num.match(/\./g) || []).length > 1) {
          return { success: false, error: `Malformed number '${num}' with multiple decimal points.` };
        }
        tokens.push({ type: 'OPERAND', value: num });
        continue;
      }

      // Identifiers (variable names)
      if (/[a-zA-Z_]/.test(ch)) {
        let ident = '';
        while (i < len && /[a-zA-Z0-9_]/.test(exprStr[i])) {
          ident += exprStr[i];
          i++;
        }
        tokens.push({ type: 'OPERAND', value: ident });
        continue;
      }

      // Unrecognized character
      return { success: false, error: `Invalid character '${ch}' in expression.` };
    }

    return { success: true, tokens };
  }

  /**
   * Validates syntax and transition rules of the token sequence.
   *
   * @param {Array<{ type: string, value: string }>} tokens
   * @returns {{ valid: boolean, error?: string }}
   * @private
   */
  _validateSyntax(tokens) {
    if (tokens.length === 0) {
      return { valid: false, error: 'Expression cannot be empty.' };
    }

    let parenBalance = 0;

    for (let i = 0; i < tokens.length; i++) {
      const curr = tokens[i];
      const prev = i > 0 ? tokens[i - 1] : null;

      // Parentheses balance check
      if (curr.type === 'LPAREN') parenBalance++;
      if (curr.type === 'RPAREN') {
        parenBalance--;
        if (parenBalance < 0) {
          return { valid: false, error: "Mismatched parentheses: unexpected ')'." };
        }
      }

      // Transition checks
      if (i === 0) {
        if (curr.type === 'OPERATOR' || curr.type === 'RPAREN') {
          return { valid: false, error: `Syntax error: Expression cannot start with '${curr.value}'.` };
        }
      }

      if (prev) {
        // Operand followed by operand: e.g. "a b"
        if (prev.type === 'OPERAND' && curr.type === 'OPERAND') {
          return {
            valid: false,
            error: `Syntax error: Missing operator between operands '${prev.value}' and '${curr.value}'.`
          };
        }

        // Operand followed by LPAREN: e.g. "a ("
        if (prev.type === 'OPERAND' && curr.type === 'LPAREN') {
          return { valid: false, error: `Syntax error: Missing operator before '(' after '${prev.value}'.` };
        }

        // RPAREN followed by Operand: e.g. ") a"
        if (prev.type === 'RPAREN' && curr.type === 'OPERAND') {
          return { valid: false, error: `Syntax error: Missing operator after ')' before '${curr.value}'.` };
        }

        // Operator followed by Operator: e.g. "a + * b"
        if (prev.type === 'OPERATOR' && curr.type === 'OPERATOR') {
          return {
            valid: false,
            error: `Syntax error: Missing operand between operators '${prev.value}' and '${curr.value}'.`
          };
        }

        // Operator followed by RPAREN: e.g. "(a + )"
        if (prev.type === 'OPERATOR' && curr.type === 'RPAREN') {
          return { valid: false, error: `Syntax error: Missing operand before ')' after '${prev.value}'.` };
        }

        // LPAREN followed by Operator: e.g. "( + a)"
        if (prev.type === 'LPAREN' && curr.type === 'OPERATOR') {
          return { valid: false, error: `Syntax error: Unexpected operator '${curr.value}' after '('."` };
        }

        // Empty parentheses: e.g. "()"
        if (prev.type === 'LPAREN' && curr.type === 'RPAREN') {
          return { valid: false, error: "Syntax error: Empty parentheses '()' found." };
        }
      }
    }

    if (parenBalance !== 0) {
      return { valid: false, error: 'Mismatched parentheses in expression.' };
    }

    // Ending token check
    const last = tokens[tokens.length - 1];
    if (last.type === 'OPERATOR') {
      return { valid: false, error: `Syntax error: Expression cannot end with operator '${last.value}'.` };
    }

    return { valid: true };
  }

  /**
   * Converts infix token array to postfix (Reverse Polish Notation) using Shunting-Yard.
   *
   * @param {Array<{ type: string, value: string }>} tokens
   * @returns {string[]} Postfix token strings
   * @private
   */
  _infixToPostfix(tokens) {
    const outputQueue = [];
    const opStack = [];

    for (const token of tokens) {
      if (token.type === 'OPERAND') {
        outputQueue.push(token.value);
      } else if (token.type === 'LPAREN') {
        opStack.push(token.value);
      } else if (token.type === 'RPAREN') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          outputQueue.push(opStack.pop());
        }
        opStack.pop(); // Discard '('
      } else if (token.type === 'OPERATOR') {
        while (
          opStack.length > 0 &&
          opStack[opStack.length - 1] !== '(' &&
          this.precedence[opStack[opStack.length - 1]] >= this.precedence[token.value]
        ) {
          outputQueue.push(opStack.pop());
        }
        opStack.push(token.value);
      }
    }

    while (opStack.length > 0) {
      outputQueue.push(opStack.pop());
    }

    return outputQueue;
  }

  /**
   * Generates Quadruples from an arithmetic or assignment expression.
   * Supports:
   *   1. Non-assignment: "a + b * c" -> emits quadruples producing temporary results
   *   2. Assignment:     "x = a + b * c" -> emits quadruples plus final assignment (=, t2, -, x)
   *
   * @param {string} expressionString
   * @returns {{
   *   success: boolean,
   *   target: string|null,
   *   expression: string,
   *   postfix: string[],
   *   quadruples: Quadruple[],
   *   threeAddressCode: string[],
   *   error: string|null
   * }}
   */
  generate(expressionString) {
    if (!expressionString || typeof expressionString !== 'string' || !expressionString.trim()) {
      return {
        success: false,
        target: null,
        expression: '',
        postfix: [],
        quadruples: [],
        threeAddressCode: [],
        error: 'Expression cannot be empty.'
      };
    }

    // 1. Separate target and RHS expression
    const parsed = this._parseAssignment(expressionString);
    if (!parsed.success) {
      return {
        success: false,
        target: null,
        expression: expressionString,
        postfix: [],
        quadruples: [],
        threeAddressCode: [],
        error: parsed.error
      };
    }

    const { target, rhs } = parsed;

    // 2. Tokenize RHS
    const tokenized = this._tokenize(rhs);
    if (!tokenized.success) {
      return {
        success: false,
        target,
        expression: rhs,
        postfix: [],
        quadruples: [],
        threeAddressCode: [],
        error: tokenized.error
      };
    }

    // 3. Syntax and Parentheses Validation
    const validation = this._validateSyntax(tokenized.tokens);
    if (!validation.valid) {
      return {
        success: false,
        target,
        expression: rhs,
        postfix: [],
        quadruples: [],
        threeAddressCode: [],
        error: validation.error
      };
    }

    // 4. Infix -> Postfix via Shunting-Yard
    const postfix = this._infixToPostfix(tokenized.tokens);

    // 5. Postfix -> Quadruples synthesis
    this.reset();
    const evaluationStack = [];
    const quadruples = [];

    for (const token of postfix) {
      if (this.isOperator(token)) {
        const arg2 = evaluationStack.pop();
        const arg1 = evaluationStack.pop();
        const tempVar = `t${this.tempCounter++}`;

        const quad = new Quadruple(token, arg1, arg2, tempVar);
        quadruples.push(quad);
        evaluationStack.push(tempVar);
      } else {
        // Operand
        evaluationStack.push(token);
      }
    }

    const finalResult = evaluationStack.pop();

    // 6. Handle assignment if target variable exists
    if (target !== null) {
      const assignQuad = new Quadruple('=', finalResult, null, target);
      quadruples.push(assignQuad);
    }

    const threeAddressCode = quadruples.map(q => q.toThreeAddressCode());

    return {
      success: true,
      target,
      expression: rhs,
      postfix,
      quadruples,
      threeAddressCode,
      error: null
    };
  }
}
