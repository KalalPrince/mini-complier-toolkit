/**
 * test_lexer.js
 * Automated Verification Suite for Lexical Analyzer + Symbol Table Integration
 *
 * Verifies:
 *  1. Basic Tokenization & Line/Col Tracking
 *  2. Keywords Recognition
 *  3. Identifiers Recognition
 *  4. Integer and Floating-Point Constants
 *  5. String Literals
 *  6. Arithmetic, Relational, Assignment, and Logical Operators
 *  7. Delimiters
 *  8. Single-line and Multi-line Comment Filtering
 *  9. Lexical Errors: Invalid Identifiers (e.g., 9var)
 * 10. Lexical Errors: Unterminated Strings
 * 11. Lexical Errors: Unterminated Comments
 * 12. Lexical Errors: Invalid Characters (e.g., @, $)
 * 13. Symbol Table Integration: Variable Declarations (int a; float total; int x, y;)
 * 14. Symbol Table Integration: Reference Line Tracking
 * 15. Symbol Table Integration: Undeclared Variable Protection (Not Inserted)
 * 16. Symbol Table Integration: Keyword Protection (Not Inserted)
 * 17. Symbol Table Integration: Duplicate Declaration Detection
 */

import { Lexer } from '../src/core/Lexer.js';
import { SymbolTable } from '../src/core/SymbolTable.js';
import { TOKEN_TYPES } from '../src/utils/Constants.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  \x1b[32m[PASS]\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${testName} ${details ? `(${details})` : ''}`);
    failedCount++;
  }
}

console.log('======================================================================');
console.log('       VERIFICATION: LEXICAL ANALYZER + SYMTAB INTEGRATION');
console.log('======================================================================\n');

// Test Suite 1: Keywords Recognition
console.log('Test Suite 1: Keywords Recognition');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('int float char double void if else while for return break continue');
  assert(res.errors.length === 0, '1.1 Tokenizes keywords without errors');
  assert(res.tokens.length === 12, '1.2 Identifies all 12 keywords');
  assert(res.tokens.every(t => t.type === TOKEN_TYPES.KEYWORD), '1.3 All tokens categorized as KEYWORD');
}

// Test Suite 2: Identifiers & Naming Rules
console.log('\nTest Suite 2: Identifiers');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('alpha _beta count123 camelCase_Name');
  assert(res.tokens.length === 4, '2.1 Recognizes 4 valid identifiers');
  assert(res.tokens.every(t => t.type === TOKEN_TYPES.IDENTIFIER), '2.2 Categorized as IDENTIFIER');
}

// Test Suite 3: Numeric Constants (Integer & Floating Point)
console.log('\nTest Suite 3: Numeric Constants');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('0 42 1024 3.14 0.005 100.5');
  assert(res.tokens.length === 6, '3.1 Tokenizes 6 numbers');
  const ints = res.tokens.filter(t => t.type === TOKEN_TYPES.INT_CONST);
  const floats = res.tokens.filter(t => t.type === TOKEN_TYPES.FLOAT_CONST);
  assert(ints.length === 3 && ints[1].value === 42, '3.2 Integer constants correctly categorized with numeric values');
  assert(floats.length === 3 && floats[0].value === 3.14, '3.3 Floating constants correctly categorized with float values');
}

// Test Suite 4: String Literals
console.log('\nTest Suite 4: String Literals');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('"Hello, World!" "result: " ""');
  assert(res.tokens.length === 3, '4.1 Tokenizes 3 string literals');
  assert(res.tokens[0].type === TOKEN_TYPES.STRING_LITERAL, '4.2 Classified as STRING_LITERAL');
  assert(res.tokens[0].value === 'Hello, World!', '4.3 Extracts unquoted string value');
  assert(res.tokens[2].value === '', '4.4 Handles empty string correctly');
}

// Test Suite 5: Operators (Arithmetic, Relational, Assignment, Logical)
console.log('\nTest Suite 5: Comprehensive Operators');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('+ - * / % == != <= >= < > = += -= *= /= && || !');
  const types = res.tokens.map(t => t.type);
  assert(types.includes(TOKEN_TYPES.ARITH_OP), '5.1 Recognizes arithmetic operators (+, -, *, /, %)');
  assert(types.includes(TOKEN_TYPES.REL_OP), '5.2 Recognizes relational operators (==, !=, <=, >=, <, >)');
  assert(types.includes(TOKEN_TYPES.ASSIGN_OP), '5.3 Recognizes assignment operators (=, +=, -=, *=, /=)');
  assert(types.includes(TOKEN_TYPES.LOGIC_OP), '5.4 Recognizes logical operators (&&, ||, !)');
}

// Test Suite 6: Delimiters
console.log('\nTest Suite 6: Delimiters');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('; , ( ) { } [ ]');
  assert(res.tokens.length === 8, '6.1 Identifies all 8 delimiters');
  assert(res.tokens.every(t => t.type === TOKEN_TYPES.DELIMITER), '6.2 All tokens categorized as DELIMITER');
}

// Test Suite 7: Comment Stripping (Single-line & Multi-line)
console.log('\nTest Suite 7: Comment Filtering');
{
  const lexer = new Lexer();
  const code = `
    // This is a single line comment
    int a = 10; // inline comment
    /* Multi-line
       comment block */
    int b = 20;
  `;
  const res = lexer.tokenize(code);
  assert(res.errors.length === 0, '7.1 Strips comments cleanly without errors');
  const idents = res.tokens.filter(t => t.type === TOKEN_TYPES.IDENTIFIER);
  assert(idents.length === 2 && idents[0].lexeme === 'a' && idents[1].lexeme === 'b', '7.2 Tokens emitted correctly without comment noise');
}

// Test Suite 8: Line and Column Coordinate Tracking
console.log('\nTest Suite 8: Coordinate Tracking');
{
  const lexer = new Lexer();
  const code = 'int a;\nint b;';
  const res = lexer.tokenize(code);
  assert(res.tokens[0].line === 1 && res.tokens[0].column === 1, '8.1 Line 1, Col 1 tracked accurately');
  assert(res.tokens[1].line === 1 && res.tokens[1].column === 5, '8.2 Line 1, Col 5 tracked accurately');
  assert(res.tokens[3].line === 2 && res.tokens[3].column === 1, '8.3 Line 2 newline incremented and column reset');
}

// Test Suite 9: Error Detection - Invalid Identifiers starting with a digit
console.log('\nTest Suite 9: Error - Invalid Identifiers (Digit prefix)');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('int 9var = 10;');
  assert(res.errors.length > 0, '9.1 Flags lexical error for 9var');
  assert(res.errors[0].message.includes('cannot start with a digit'), '9.2 Explains identifiers cannot start with a digit');
  assert(res.errors[0].lexeme === '9var', '9.3 Pinpoints offending lexeme');
}

// Test Suite 10: Error Detection - Unterminated String
console.log('\nTest Suite 10: Error - Unterminated Strings');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('char str = "unterminated string;\nint a = 5;');
  assert(res.errors.length > 0, '10.1 Flags lexical error for unterminated string');
  assert(res.errors[0].message.includes('Unterminated string literal'), '10.2 Clear error message for string literal');
}

// Test Suite 11: Error Detection - Unterminated Multi-line Comment
console.log('\nTest Suite 11: Error - Unterminated Comments');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('/* Open comment never closed\nint a = 1;');
  assert(res.errors.length > 0, '11.1 Flags error for unterminated multi-line comment');
  assert(res.errors[0].message.includes('Unterminated multi-line comment'), '11.2 Clear error message for comment');
}

// Test Suite 12: Error Detection - Unrecognized / Invalid Characters
console.log('\nTest Suite 12: Error - Unrecognized Characters');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('int $money = 100 @ 20;');
  assert(res.errors.length === 2, '12.1 Flags 2 unrecognized characters ($ and @)');
  assert(res.errors[0].lexeme === '$' && res.errors[1].lexeme === '@', '12.2 Pinpoints unrecognized characters');
}

// Test Suite 13: Symbol Table Integration - Declarations
console.log('\nTest Suite 13: Symbol Table Integration - Declarations');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = `
    int a;
    float total;
    char grade;
    int x, y;
  `;
  const res = lexer.tokenize(code);
  assert(res.errors.length === 0, '13.1 Tokenizes declarations without errors');
  assert(symTab.getAllEntries().length === 5, '13.2 Inserts all 5 declared identifiers into Symbol Table');
  assert(symTab.lookup('a').type === 'int', '13.3 Symbol a has type int');
  assert(symTab.lookup('total').type === 'float', '13.4 Symbol total has type float');
  assert(symTab.lookup('y').type === 'int', '13.5 Symbol y correctly inherited type int from comma sequence');
}

// Test Suite 14: Symbol Table Integration - Reference Tracking
console.log('\nTest Suite 14: Symbol Table Integration - Reference Tracking');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = `
    int sum;
    sum = 10;
    sum = sum + 1;
  `;
  lexer.tokenize(code);
  const sumEntry = symTab.lookup('sum');
  assert(sumEntry !== null, '14.1 Symbol sum is registered');
  assert(sumEntry.lineDeclared === 2, '14.2 Symbol sum lineDeclared is 2');
  assert(sumEntry.linesReferenced.includes(3) && sumEntry.linesReferenced.includes(4), '14.3 Reference lines 3 and 4 tracked accurately');
}

// Test Suite 15: Symbol Table Integration - Undeclared Variable Protection
console.log('\nTest Suite 15: Symbol Table Integration - Undeclared Protection');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = 'int x; y = x + 10;'; // y is not declared
  const res = lexer.tokenize(code);
  assert(res.errors.length > 0, '15.1 Reports undeclared identifier error');
  assert(res.errors[0].message.includes('Undeclared identifier'), '15.2 Error explains undeclared identifier');
  assert(symTab.lookup('y') === null, '15.3 Undeclared identifier is NOT inserted into Symbol Table');
}

// Test Suite 16: Symbol Table Integration - Keyword Protection
console.log('\nTest Suite 16: Symbol Table Integration - Keyword Protection');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = 'int x; if (x) { return 0; } while(x) {}';
  lexer.tokenize(code);
  assert(symTab.lookup('int') === null, '16.1 Keyword int is NOT in Symbol Table');
  assert(symTab.lookup('if') === null, '16.2 Keyword if is NOT in Symbol Table');
  assert(symTab.lookup('return') === null, '16.3 Keyword return is NOT in Symbol Table');
  assert(symTab.lookup('while') === null, '16.4 Keyword while is NOT in Symbol Table');
  assert(symTab.lookup('x') !== null, '16.5 Actual variable x IS in Symbol Table');
}

// Test Suite 17: Symbol Table Integration - Duplicate Declaration Detection
console.log('\nTest Suite 17: Symbol Table Integration - Duplicate Declarations');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = `
    int count;
    float count;
  `;
  const res = lexer.tokenize(code);
  assert(res.errors.length > 0, '17.1 Flags error on duplicate declaration of count');
  assert(res.errors[0].message.includes('Duplicate declaration'), '17.2 Clear duplicate declaration error message');
  const countEntry = symTab.lookup('count');
  assert(countEntry.type === 'int', '17.3 Preserves original declaration in Symbol Table');
}

// Final Summary
console.log('\n======================================================================');
console.log(`LEXICAL ANALYZER TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
