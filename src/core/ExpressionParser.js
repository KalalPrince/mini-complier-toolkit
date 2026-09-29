/**
 * ExpressionParser.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Adapter module that bridges Stage 2 (Lexical Analysis) and Stage 3 (Quadruple Generation).
 * Extracts variable declarations and statement expressions from the token stream emitted by Lexer.
 */

import { TOKEN_TYPES } from '../utils/Constants.js';

export class ExpressionParser {
  /**
   * Splits a stream of Tokens into discrete statements delimited by ';'.
   *
   * @param {Array<Token>} tokens
   * @returns {Array<{ type: string, tokens: Array<Token>, text: string, line: number }>}
   */
  splitStatements(tokens) {
    const statements = [];
    let currentTokens = [];
    let startLine = 1;

    for (const token of tokens) {
      if (currentTokens.length === 0) {
        startLine = token.line;
      }

      if (token.type === TOKEN_TYPES.DELIMITER && token.lexeme === ';') {
        if (currentTokens.length > 0) {
          statements.push({
            type: this._classifyStatement(currentTokens),
            tokens: currentTokens,
            text: currentTokens.map(t => t.lexeme).join(' '),
            line: startLine
          });
          currentTokens = [];
        }
      } else {
        currentTokens.push(token);
      }
    }

    // Handle any trailing statement without semicolon
    if (currentTokens.length > 0) {
      statements.push({
        type: this._classifyStatement(currentTokens),
        tokens: currentTokens,
        text: currentTokens.map(t => t.lexeme).join(' '),
        line: startLine
      });
    }

    return statements;
  }

  /**
   * Classifies statement type into DECLARATION, ASSIGNMENT, or EXPRESSION.
   * @private
   */
  _classifyStatement(tokens) {
    if (tokens.length === 0) return 'EMPTY';
    const first = tokens[0];
    const typeKeywords = ['int', 'float', 'char', 'double', 'void'];

    if (first.type === TOKEN_TYPES.KEYWORD && typeKeywords.includes(first.lexeme)) {
      return 'DECLARATION';
    }

    const hasAssign = tokens.some(t => t.type === TOKEN_TYPES.ASSIGN_OP && t.lexeme === '=');
    if (hasAssign) {
      return 'ASSIGNMENT';
    }

    return 'EXPRESSION';
  }

  /**
   * Extracts clean expression strings ready for QuadrupleGen from statements.
   * Filters out pure type declarations (e.g. "int a, b;"), but extracts initialized
   * declarations (e.g. "int a = 10;" -> "a = 10") and assignments ("x = a + b * c").
   *
   * @param {Array<Token>} tokens
   * @returns {Array<{ expression: string, line: number, isDeclaration: boolean }>}
   */
  extractExpressions(tokens) {
    const statements = this.splitStatements(tokens);
    const expressions = [];

    for (const stmt of statements) {
      if (stmt.type === 'DECLARATION') {
        // Check if declaration contains an initialization assignment e.g. "int a = 10"
        const assignIdx = stmt.tokens.findIndex(t => t.type === TOKEN_TYPES.ASSIGN_OP && t.lexeme === '=');
        if (assignIdx !== -1) {
          // Find identifier before '='
          const identToken = stmt.tokens.slice(0, assignIdx).find(t => t.type === TOKEN_TYPES.IDENTIFIER);
          if (identToken) {
            const rhsTokens = stmt.tokens.slice(assignIdx + 1);
            const rhsText = rhsTokens.map(t => t.lexeme).join(' ');
            expressions.push({
              expression: `${identToken.lexeme} = ${rhsText}`,
              line: stmt.line,
              isDeclaration: true
            });
          }
        }
      } else if (stmt.type === 'ASSIGNMENT' || stmt.type === 'EXPRESSION') {
        expressions.push({
          expression: stmt.text,
          line: stmt.line,
          isDeclaration: false
        });
      }
    }

    return expressions;
  }
}
