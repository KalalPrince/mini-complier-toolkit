/**
 * Constants.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Central repository for shared constants, language types, keywords,
 * and standard operation status codes.
 */

// Supported high-level data types and their standard memory footprints (in bytes)
export const DATA_TYPES = {
  int: { name: 'int', size: 4 },
  float: { name: 'float', size: 4 },
  char: { name: 'char', size: 1 },
  double: { name: 'double', size: 8 },
  void: { name: 'void', size: 0 }
};

// Reserved language keywords for lexical and semantic processing
export const KEYWORDS = [
  'int',
  'float',
  'char',
  'double',
  'void',
  'if',
  'else',
  'while',
  'for',
  'return',
  'break',
  'continue'
];

// Reusable status and error codes across the toolkit
export const STATUS = {
  SUCCESS: 'SUCCESS',
  DUPLICATE_SYMBOL: 'DUPLICATE_SYMBOL',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TYPE: 'INVALID_TYPE',
  INVALID_NAME: 'INVALID_NAME',
  ERROR: 'ERROR'
};

// Standard token categories emitted by the Lexical Analyzer
export const TOKEN_TYPES = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  INT_CONST: 'INT_CONST',
  FLOAT_CONST: 'FLOAT_CONST',
  STRING_LITERAL: 'STRING_LITERAL',
  ARITH_OP: 'ARITH_OP',
  REL_OP: 'REL_OP',
  ASSIGN_OP: 'ASSIGN_OP',
  LOGIC_OP: 'LOGIC_OP',
  DELIMITER: 'DELIMITER'
};

/**
 * Returns the memory size (in bytes) for a given data type.
 * Defaults to 4 bytes if the type is unknown or user-defined.
 *
 * @param {string} type - Data type name (e.g., 'int', 'char')
 * @returns {number} Size in bytes
 */
export function getTypeSize(type) {
  if (!type) return 4;
  const lower = String(type).toLowerCase();
  return DATA_TYPES[lower] ? DATA_TYPES[lower].size : 4;
}

/**
 * Checks whether an identifier string is a reserved keyword.
 *
 * @param {string} word - Identifier candidate
 * @returns {boolean} True if the word is a reserved keyword
 */
export function isKeyword(word) {
  return KEYWORDS.includes(String(word).toLowerCase());
}

/**
 * Validates whether a string is a syntactically valid identifier.
 * Rules: Starts with [a-zA-Z_], followed by [a-zA-Z0-9_]*, and not a keyword.
 *
 * @param {string} name - Identifier name to validate
 * @returns {boolean} True if valid
 */
export function isValidIdentifier(name) {
  if (!name || typeof name !== 'string') return false;
  if (isKeyword(name)) return false;
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return identifierRegex.test(name);
}
