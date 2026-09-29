/**
 * test_stage2_lexer.js
 * Automated Verification Suite for Stage 2: Lexical Analyzer + Symbol Table Integration
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
console.log('       STAGE 2 VERIFICATION: LEXICAL ANALYZER + SYMTAB INTEGRATION');
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
  assert(res.tokens.length === 8, '6.1 Recognizes all 8 standard delimiters');
  assert(res.tokens.every(t => t.type === TOKEN_TYPES.DELIMITER), '6.2 Correctly typed as DELIMITER');
}

// Test Suite 7: Comments Handling (Single & Multi-line)
console.log('\nTest Suite 7: Comments Handling');
{
  const lexer = new Lexer();
  const code = `
    // This is an inline comment
    int x = 10; /* Block comment */
    /* Multi-line
       Comment block */
    float y = 20.5;
  `;
  const res = lexer.tokenize(code);
  assert(res.errors.length === 0, '7.1 Comments parsed without errors');
  const lexemes = res.tokens.map(t => t.lexeme);
  assert(!lexemes.some(l => l.includes('comment') || l.includes('Comment')), '7.2 Comments filtered out of token stream');
  assert(lexemes.includes('x') && lexemes.includes('y'), '7.3 Code statements around comments retained');
}

// Test Suite 8: Line and Column Tracking
console.log('\nTest Suite 8: Line and Column Tracking');
{
  const lexer = new Lexer();
  const code = 'int a;\nfloat b;\n  char c;';
  const res = lexer.tokenize(code);
  const aToken = res.tokens.find(t => t.lexeme === 'a');
  const bToken = res.tokens.find(t => t.lexeme === 'b');
  const cToken = res.tokens.find(t => t.lexeme === 'c');
  assert(aToken.line === 1, '8.1 Variable a is on Line 1');
  assert(bToken.line === 2, '8.2 Variable b is on Line 2');
  assert(cToken.line === 3 && cToken.column === 8, '8.3 Variable c is on Line 3, Column 8 (after 2 spaces and char)');
}

// Test Suite 9: Lexical Error - Invalid Identifiers
console.log('\nTest Suite 9: Lexical Error - Invalid Identifiers');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('int 9variable = 5;');
  assert(res.errors.length > 0, '9.1 Flags lexical error for 9variable');
  assert(res.errors[0].lexeme === '9variable', '9.2 Identifies exact invalid lexeme');
}

// Test Suite 10: Lexical Error - Unterminated Strings
console.log('\nTest Suite 10: Lexical Error - Unterminated Strings');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('char msg = "Unclosed string\nint next = 1;');
  assert(res.errors.length > 0, '10.1 Flags lexical error for unclosed string literal');
  assert(res.errors[0].message.includes('Unterminated string'), '10.2 Explains error clearly');
}

// Test Suite 11: Lexical Error - Unterminated Comments
console.log('\nTest Suite 11: Lexical Error - Unterminated Comments');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('/* This comment never ends\nint a = 1;');
  assert(res.errors.length > 0, '11.1 Flags error for unterminated multi-line comment');
  assert(res.errors[0].message.includes('Unterminated multi-line comment'), '11.2 Error describes unterminated comment');
}

// Test Suite 12: Lexical Error - Unrecognized Characters
console.log('\nTest Suite 12: Lexical Error - Unrecognized Characters');
{
  const lexer = new Lexer();
  const res = lexer.tokenize('int a = @ + $;');
  assert(res.errors.length === 2, '12.1 Flags 2 unrecognized character errors');
  assert(res.errors[0].lexeme === '@' && res.errors[1].lexeme === '$', '12.2 Points directly to @ and $');
}

// Test Suite 13: Symbol Table Integration - Declarations (int a; float total; int x, y;)
console.log('\nTest Suite 13: Symbol Table Integration - Declarations');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = `
    int a;
    float total;
    int x, y;
  `;
  const res = lexer.tokenize(code);
  assert(res.errors.length === 0, '13.1 Declarations processed without errors');
  
  const entryA = symTab.lookup('a');
  const entryTotal = symTab.lookup('total');
  const entryX = symTab.lookup('x');
  const entryY = symTab.lookup('y');

  assert(entryA !== null && entryA.type === 'int', '13.2 Symbol a inserted with type int');
  assert(entryTotal !== null && entryTotal.type === 'float', '13.3 Symbol total inserted with type float');
  assert(entryX !== null && entryY !== null, '13.4 Comma-separated declarations (int x, y;) both inserted');
  assert(entryY.type === 'int', '13.5 Symbol y correctly inherited type int from comma sequence');
}

// Test Suite 14: Symbol Table Integration - Reference Tracking
console.log('\nTest Suite 14: Symbol Table Integration - Reference Tracking');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = `
    int sum = 0;
    sum = sum + 5;
    sum = sum * 2;
  `;
  lexer.tokenize(code);
  const entrySum = symTab.lookup('sum');
  assert(entrySum !== null, '14.1 Symbol sum is registered');
  assert(entrySum.lineDeclared === 2, '14.2 Symbol sum lineDeclared is 2');
  // References appear on lines 3 and 4
  assert(entrySum.linesReferenced.includes(3) && entrySum.linesReferenced.includes(4), '14.3 Reference lines 3 and 4 tracked accurately');
}

// Test Suite 15: Symbol Table Integration - Undeclared Variable Protection
console.log('\nTest Suite 15: Symbol Table Integration - Undeclared Protection');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  const code = 'undeclaredVar = 42;';
  const res = lexer.tokenize(code);
  
  assert(res.errors.length > 0, '15.1 Reports undeclared identifier error');
  assert(res.errors[0].message.includes('Undeclared identifier'), '15.2 Error explains undeclared identifier');
  assert(symTab.lookup('undeclaredVar') === null, '15.3 Undeclared identifier is NOT inserted into Symbol Table');
}

// Test Suite 16: Symbol Table Integration - Keywords Not Inserted
console.log('\nTest Suite 16: Symbol Table Integration - Keyword Protection');
{
  const symTab = new SymbolTable(1000);
  const lexer = new Lexer(symTab);
  lexer.tokenize('int x; if (x > 0) { return x; } while (x) { break; }');
  
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
console.log(`STAGE 2 TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
