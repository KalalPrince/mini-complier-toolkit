/**
 * Lexer.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Implements the Lexical Analyzer (Scanner) that transforms raw source code
 * into classified tokens, detects lexical errors, and coordinates with
 * the Symbol Table.
 */

import { TOKEN_TYPES, isKeyword } from '../utils/Constants.js';
import { SymbolTable } from './SymbolTable.js';

/**
 * Represents a single classified token.
 */
export class Token {
  constructor({ type, lexeme, value = null, line, column, symRef = null }) {
    this.type = type;
    this.lexeme = lexeme;
    this.value = value;
    this.line = line;
    this.column = column;
    this.symRef = symRef;
  }

  toJSON() {
    return {
      type: this.type,
      lexeme: this.lexeme,
      value: this.value,
      line: this.line,
      column: this.column,
      symRef: this.symRef ? this.symRef.name : null
    };
  }
}

/**
 * Lexical Analyzer Engine.
 */
export class Lexer {
  constructor(symbolTable = null) {
    this.symbolTable = symbolTable || new SymbolTable();
    this.tokens = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Tokenizes the given source code and integrates with the Symbol Table.
   *
   * @param {string} source - Raw source code
   * @param {string} [scope='global'] - Scope context for declarations
   * @returns {{ tokens: Token[], errors: Object[], warnings: Object[], symbolTable: SymbolTable }}
   */
  tokenize(source, scope = 'global') {
    this.tokens = [];
    this.errors = [];
    this.warnings = [];

    if (typeof source !== 'string') {
      return {
        tokens: this.tokens,
        errors: [{ line: 1, column: 1, message: 'Source code must be a string' }],
        warnings: this.warnings,
        symbolTable: this.symbolTable
      };
    }

    let i = 0;
    let line = 1;
    let column = 1;
    const len = source.length;

    // Declaration context tracking: { active, type, expectingIdent }
    const declState = {
      active: false,
      type: null,
      expectingIdent: false
    };

    const typeKeywords = ['int', 'float', 'char', 'double', 'void'];

    while (i < len) {
      const ch = source[i];

      // 1. Newlines
      if (ch === '\n') {
        line++;
        column = 1;
        i++;
        continue;
      }

      // 2. Whitespace (spaces, tabs, carriage returns)
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        column++;
        i++;
        continue;
      }

      // 3. Comments (single-line // and multi-line /* ... */)
      if (ch === '/' && i + 1 < len) {
        const nextChar = source[i + 1];

        // Single-line comment
        if (nextChar === '/') {
          i += 2;
          column += 2;
          while (i < len && source[i] !== '\n') {
            i++;
            column++;
          }
          continue;
        }

        // Multi-line comment
        if (nextChar === '*') {
          const commentStartLine = line;
          const commentStartCol = column;
          i += 2;
          column += 2;
          let terminated = false;

          while (i < len) {
            if (source[i] === '\n') {
              line++;
              column = 1;
              i++;
            } else if (source[i] === '*' && i + 1 < len && source[i + 1] === '/') {
              i += 2;
              column += 2;
              terminated = true;
              break;
            } else {
              i++;
              column++;
            }
          }

          if (!terminated) {
            this.errors.push({
              line: commentStartLine,
              column: commentStartCol,
              message: 'Unterminated multi-line comment',
              lexeme: '/*'
            });
          }
          continue;
        }
      }

      // 4. String Literals
      if (ch === '"') {
        const strStartLine = line;
        const strStartCol = column;
        let strVal = '';
        i++; // skip opening quote
        column++;
        let closed = false;

        while (i < len) {
          if (source[i] === '\n') {
            // Strings cannot span raw unescaped newlines in simple C
            break;
          }
          if (source[i] === '"') {
            closed = true;
            i++; // consume closing quote
            column++;
            break;
          }
          strVal += source[i];
          i++;
          column++;
        }

        if (closed) {
          this.tokens.push(
            new Token({
              type: TOKEN_TYPES.STRING_LITERAL,
              lexeme: `"${strVal}"`,
              value: strVal,
              line: strStartLine,
              column: strStartCol
            })
          );
        } else {
          this.errors.push({
            line: strStartLine,
            column: strStartCol,
            message: 'Unterminated string literal',
            lexeme: `"${strVal}`
          });
        }
        continue;
      }

      // 5. Numbers and Invalid Identifiers starting with a digit
      if (/\d/.test(ch)) {
        const numStartLine = line;
        const numStartCol = column;
        let numStr = '';

        while (i < len && /[\d.]/.test(source[i])) {
          numStr += source[i];
          i++;
          column++;
        }

        // Check if followed immediately by letters/underscore (e.g., '9var', '123abc')
        if (i < len && /[a-zA-Z_]/.test(source[i])) {
          let badIdent = numStr;
          while (i < len && /[a-zA-Z0-9_]/.test(source[i])) {
            badIdent += source[i];
            i++;
            column++;
          }
          this.errors.push({
            line: numStartLine,
            column: numStartCol,
            message: `Invalid identifier '${badIdent}' (identifiers cannot start with a digit)`,
            lexeme: badIdent
          });
          continue;
        }

        // Check for multiple decimal points
        const dotCount = (numStr.match(/\./g) || []).length;
        if (dotCount > 1) {
          this.errors.push({
            line: numStartLine,
            column: numStartCol,
            message: `Malformed number '${numStr}' with multiple decimal points`,
            lexeme: numStr
          });
          continue;
        }

        if (dotCount === 1) {
          this.tokens.push(
            new Token({
              type: TOKEN_TYPES.FLOAT_CONST,
              lexeme: numStr,
              value: parseFloat(numStr),
              line: numStartLine,
              column: numStartCol
            })
          );
        } else {
          this.tokens.push(
            new Token({
              type: TOKEN_TYPES.INT_CONST,
              lexeme: numStr,
              value: parseInt(numStr, 10),
              line: numStartLine,
              column: numStartCol
            })
          );
        }
        continue;
      }

      // 6. Identifiers and Keywords
      if (/[a-zA-Z_]/.test(ch)) {
        const wordStartLine = line;
        const wordStartCol = column;
        let word = '';

        while (i < len && /[a-zA-Z0-9_]/.test(source[i])) {
          word += source[i];
          i++;
          column++;
        }

        if (isKeyword(word)) {
          // It is a reserved keyword
          this.tokens.push(
            new Token({
              type: TOKEN_TYPES.KEYWORD,
              lexeme: word,
              value: word,
              line: wordStartLine,
              column: wordStartCol
            })
          );

          if (typeKeywords.includes(word)) {
            declState.active = true;
            declState.type = word;
            declState.expectingIdent = true;
          } else {
            // Other keywords (if, while, return, etc.) end declaration context
            declState.active = false;
            declState.type = null;
            declState.expectingIdent = false;
          }
        } else {
          // It is an Identifier
          const token = new Token({
            type: TOKEN_TYPES.IDENTIFIER,
            lexeme: word,
            value: word,
            line: wordStartLine,
            column: wordStartCol
          });

          if (declState.active && declState.expectingIdent) {
            // This identifier is being declared
            const insertRes = this.symbolTable.insert({
              name: word,
              type: declState.type,
              scope,
              lineDeclared: wordStartLine
            });

            if (insertRes.success) {
              token.symRef = insertRes.entry;
            } else {
              this.errors.push({
                line: wordStartLine,
                column: wordStartCol,
                message: insertRes.message,
                lexeme: word
              });
            }
            declState.expectingIdent = false;
          } else {
            // Identifier referenced outside declaration
            const entry = this.symbolTable.lookup(word, scope);
            if (entry) {
              this.symbolTable.addReference(word, wordStartLine, scope);
              token.symRef = entry;
            } else {
              // Undeclared identifier: report error/warning, do NOT insert into Symbol Table
              this.errors.push({
                line: wordStartLine,
                column: wordStartCol,
                message: `Undeclared identifier '${word}' (must be declared before use)`,
                lexeme: word
              });
            }
          }

          this.tokens.push(token);
        }
        continue;
      }

      // 7. Delimiters
      const delimiters = [';', ',', '(', ')', '{', '}', '[', ']'];
      if (delimiters.includes(ch)) {
        const delimLine = line;
        const delimCol = column;

        if (ch === ';') {
          declState.active = false;
          declState.type = null;
          declState.expectingIdent = false;
        } else if (ch === ',') {
          if (declState.active) {
            declState.expectingIdent = true;
          }
        } else if (ch === ')' || ch === '{' || ch === '}') {
          declState.active = false;
          declState.type = null;
          declState.expectingIdent = false;
        }

        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.DELIMITER,
            lexeme: ch,
            value: ch,
            line: delimLine,
            column: delimCol
          })
        );
        i++;
        column++;
        continue;
      }

      // 8. Multi-character Operators (2 chars)
      const twoChar = source.slice(i, i + 2);

      // Relational: ==, !=, <=, >=
      if (['==', '!=', '<=', '>='].includes(twoChar)) {
        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.REL_OP,
            lexeme: twoChar,
            value: twoChar,
            line,
            column
          })
        );
        i += 2;
        column += 2;
        continue;
      }

      // Assignment: +=, -=, *=, /=
      if (['+=', '-=', '*=', '/='].includes(twoChar)) {
        if (declState.active) declState.expectingIdent = false;
        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.ASSIGN_OP,
            lexeme: twoChar,
            value: twoChar,
            line,
            column
          })
        );
        i += 2;
        column += 2;
        continue;
      }

      // Logical: &&, ||
      if (['&&', '||'].includes(twoChar)) {
        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.LOGIC_OP,
            lexeme: twoChar,
            value: twoChar,
            line,
            column
          })
        );
        i += 2;
        column += 2;
        continue;
      }

      // 9. Single-character Operators
      // Assignment =
      if (ch === '=') {
        if (declState.active) declState.expectingIdent = false;
        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.ASSIGN_OP,
            lexeme: '=',
            value: '=',
            line,
            column
          })
        );
        i++;
        column++;
        continue;
      }

      // Arithmetic: +, -, *, /, %
      if (['+', '-', '*', '/', '%'].includes(ch)) {
        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.ARITH_OP,
            lexeme: ch,
            value: ch,
            line,
            column
          })
        );
        i++;
        column++;
        continue;
      }

      // Relational: <, >
      if (['<', '>'].includes(ch)) {
        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.REL_OP,
            lexeme: ch,
            value: ch,
            line,
            column
          })
        );
        i++;
        column++;
        continue;
      }

      // Logical: !
      if (ch === '!') {
        this.tokens.push(
          new Token({
            type: TOKEN_TYPES.LOGIC_OP,
            lexeme: '!',
            value: '!',
            line,
            column
          })
        );
        i++;
        column++;
        continue;
      }

      // 10. Unrecognized / Invalid Characters (e.g., @, $, #, ~, `)
      this.errors.push({
        line,
        column,
        message: `Unrecognized character '${ch}'`,
        lexeme: ch
      });
      i++;
      column++;
    }

    return {
      tokens: this.tokens,
      errors: this.errors,
      warnings: this.warnings,
      symbolTable: this.symbolTable
    };
  }
}
