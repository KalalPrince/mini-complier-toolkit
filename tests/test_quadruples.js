/**
 * test_quadruples.js
 * Automated Verification Suite for Quadruple Generator
 *
 * Verifies:
 *  1. Simple Arithmetic without Assignment (a + b)
 *  2. Operator Precedence (a + b * c) -> b * c first
 *  3. Parentheses Overriding Precedence ((a + b) * c)
 *  4. Nested Parentheses (((a + b) * (c - d)) / 2)
 *  5. Modulus Operator (a % b)
 *  6. Assignment Expressions (x = a + b * c)
 *  7. Direct Constant / Variable Assignment (x = 42, y = z)
 *  8. Multiple Chained Operators (total = a + b * c / d - e)
 *  9. Sequential Temporary Variable Naming (t1, t2, t3...)
 * 10. Quadruple Object Model & 3-Address Code Formatting
 * 11. Error Handling: Empty Input
 * 12. Error Handling: Mismatched Parentheses
 * 13. Error Handling: Invalid Assignment Targets
 * 14. Error Handling: Consecutive Operators / Missing Operands
 * 15. Error Handling: Missing Operators
 * 16. Error Handling: Invalid Characters
 */

import { QuadrupleGen, Quadruple } from '../src/core/QuadrupleGen.js';

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
console.log('       VERIFICATION: QUADRUPLE GENERATOR (3AC)');
console.log('======================================================================\n');

const generator = new QuadrupleGen();

// Test Suite 1: Simple Arithmetic without Assignment
console.log('Test Suite 1: Simple Expressions without Assignment');
{
  const res = generator.generate('a + b');
  assert(res.success === true, '1.1 Generates without errors');
  assert(res.target === null, '1.2 Target is null for non-assignment');
  assert(res.quadruples.length === 1, '1.3 Exactly 1 quadruple generated');
  assert(
    res.quadruples[0].op === '+' &&
    res.quadruples[0].arg1 === 'a' &&
    res.quadruples[0].arg2 === 'b' &&
    res.quadruples[0].result === 't1',
    '1.4 Quadruple fields match (+, a, b, t1)'
  );
  assert(res.threeAddressCode[0] === 't1 = a + b', '1.5 3AC string matches "t1 = a + b"');
}

// Test Suite 2: Operator Precedence (Multiplication over Addition)
console.log('\nTest Suite 2: Operator Precedence');
{
  const res = generator.generate('a + b * c');
  assert(res.success === true, '2.1 Generates a + b * c successfully');
  assert(res.quadruples.length === 2, '2.2 Exactly 2 quadruples generated');
  // First quad: b * c -> t1
  assert(
    res.quadruples[0].op === '*' &&
    res.quadruples[0].arg1 === 'b' &&
    res.quadruples[0].arg2 === 'c' &&
    res.quadruples[0].result === 't1',
    '2.3 First evaluates higher precedence: t1 = b * c'
  );
  // Second quad: a + t1 -> t2
  assert(
    res.quadruples[1].op === '+' &&
    res.quadruples[1].arg1 === 'a' &&
    res.quadruples[1].arg2 === 't1' &&
    res.quadruples[1].result === 't2',
    '2.4 Second evaluates lower precedence: t2 = a + t1'
  );
}

// Test Suite 3: Parentheses Overriding Precedence
console.log('\nTest Suite 3: Parentheses Overriding Precedence');
{
  const res = generator.generate('(a + b) * c');
  assert(res.success === true, '3.1 Generates (a + b) * c successfully');
  // First quad: a + b -> t1
  assert(
    res.quadruples[0].op === '+' &&
    res.quadruples[0].arg1 === 'a' &&
    res.quadruples[0].arg2 === 'b' &&
    res.quadruples[0].result === 't1',
    '3.2 Parenthesized expression computed first: t1 = a + b'
  );
  // Second quad: t1 * c -> t2
  assert(
    res.quadruples[1].op === '*' &&
    res.quadruples[1].arg1 === 't1' &&
    res.quadruples[1].arg2 === 'c' &&
    res.quadruples[1].result === 't2',
    '3.3 Multiplication follows: t2 = t1 * c'
  );
}

// Test Suite 4: Nested Parentheses
console.log('\nTest Suite 4: Nested Parentheses');
{
  const res = generator.generate('((a + b) * (c - d)) / 2');
  assert(res.success === true, '4.1 Evaluates complex nested expression');
  assert(res.quadruples.length === 4, '4.2 Generates 4 intermediate instructions');
  assert(res.threeAddressCode[0] === 't1 = a + b', '4.3 t1 = a + b');
  assert(res.threeAddressCode[1] === 't2 = c - d', '4.4 t2 = c - d');
  assert(res.threeAddressCode[2] === 't3 = t1 * t2', '4.5 t3 = t1 * t2');
  assert(res.threeAddressCode[3] === 't4 = t3 / 2', '4.6 t4 = t3 / 2');
}

// Test Suite 5: Modulus Operator
console.log('\nTest Suite 5: Modulus Operator');
{
  const res = generator.generate('rem = a % b');
  assert(res.success === true, '5.1 Supports % operator in assignment');
  assert(res.quadruples[0].op === '%' && res.quadruples[0].result === 't1', '5.2 t1 = a % b');
  assert(res.quadruples[1].op === '=' && res.quadruples[1].result === 'rem', '5.3 rem = t1');
}

// Test Suite 6: Assignment Expressions
console.log('\nTest Suite 6: Assignment Expressions');
{
  const res = generator.generate('x = a + b * c');
  assert(res.success === true, '6.1 Processes x = a + b * c');
  assert(res.target === 'x', '6.2 Identifies target as "x"');
  assert(res.quadruples.length === 3, '6.3 Generates 3 quadruples (2 ops + 1 assign)');
  assert(res.threeAddressCode[0] === 't1 = b * c', '6.4 Step 1: t1 = b * c');
  assert(res.threeAddressCode[1] === 't2 = a + t1', '6.5 Step 2: t2 = a + t1');
  assert(res.threeAddressCode[2] === 'x = t2', '6.6 Step 3: x = t2');
}

// Test Suite 7: Direct Assignment (Single Constant / Variable)
console.log('\nTest Suite 7: Direct Assignment');
{
  const resConst = generator.generate('x = 42');
  assert(resConst.success === true, '7.1 Direct constant assignment succeeds');
  assert(resConst.quadruples.length === 1, '7.2 Exactly 1 quadruple for direct constant assignment');
  assert(resConst.threeAddressCode[0] === 'x = 42', '7.3 3AC is "x = 42"');

  const resVar = generator.generate('dest = source');
  assert(resVar.success === true, '7.4 Direct variable assignment succeeds');
  assert(resVar.threeAddressCode[0] === 'dest = source', '7.5 3AC is "dest = source"');
}

// Test Suite 8: Multiple Chained Operators
console.log('\nTest Suite 8: Chained Operators');
{
  const res = generator.generate('total = a + b * c / d - e');
  assert(res.success === true, '8.1 Parses chained expression');
  // Postfix for a + b * c / d - e: [a, b, c, *, d, /, +, e, -]
  assert(res.postfix.join(' ') === 'a b c * d / + e -', '8.2 Correct postfix sequence');
  assert(res.quadruples.length === 5, '8.3 Exactly 4 arithmetic ops + 1 assignment');
}

// Test Suite 9: Quadruple Object Model
console.log('\nTest Suite 9: Quadruple Model & Formatting');
{
  const quad = new Quadruple('*', 'p', 'q', 't1');
  assert(quad.toString() === '(*, p, q, t1)', '9.1 toString() produces standard tuple format');
  assert(quad.toThreeAddressCode() === 't1 = p * q', '9.2 toThreeAddressCode() formats correctly');
  const assignQuad = new Quadruple('=', 't1', null, 'ans');
  assert(assignQuad.toString() === '(=, t1, -, ans)', '9.3 Assignment toString handles null arg2');
  assert(assignQuad.toThreeAddressCode() === 'ans = t1', '9.4 Assignment 3AC formats correctly');
}

// Test Suite 10: Error Handling - Empty Input
console.log('\nTest Suite 10: Error Handling - Empty Input');
{
  const res1 = generator.generate('');
  assert(res1.success === false, '10.1 Empty string fails');
  assert(res1.error.includes('empty'), '10.2 Explains empty input');
  const res2 = generator.generate('   ');
  assert(res2.success === false, '10.3 Whitespace-only string fails');
}

// Test Suite 11: Error Handling - Mismatched Parentheses
console.log('\nTest Suite 11: Error Handling - Mismatched Parentheses');
{
  const resUnclosed = generator.generate('(a + b * c');
  assert(resUnclosed.success === false, '11.1 Unclosed parenthesis fails');
  assert(resUnclosed.error.includes('Mismatched parentheses'), '11.2 Detects unclosed paren');

  const resExtraClose = generator.generate('a + b) * c');
  assert(resExtraClose.success === false, '11.3 Extra closing parenthesis fails');
  assert(resExtraClose.error.includes('Mismatched parentheses'), '11.4 Detects extra closing paren');
}

// Test Suite 12: Error Handling - Invalid Assignment Targets
console.log('\nTest Suite 12: Error Handling - Invalid Assignment Targets');
{
  const resNum = generator.generate('5 = a + b');
  assert(resNum.success === false, '12.1 Numeric LHS rejected');
  assert(resNum.error.includes('Invalid assignment target'), '12.2 Explains invalid assignment target');

  const resExpr = generator.generate('(a + b) = c');
  assert(resExpr.success === false, '12.3 Expression on LHS rejected');
}

// Test Suite 13: Error Handling - Missing Operands / Consecutive Operators
console.log('\nTest Suite 13: Error Handling - Consecutive Operators & Endings');
{
  const resConsec = generator.generate('a + * b');
  assert(resConsec.success === false, '13.1 Consecutive operators rejected');
  assert(resConsec.error.includes('Syntax error'), '13.2 Detects missing operand between operators');

  const resEndsOp = generator.generate('a + b *');
  assert(resEndsOp.success === false, '13.3 Ending with operator rejected');

  const resEmptyParen = generator.generate('a + ()');
  assert(resEmptyParen.success === false, '13.4 Empty parentheses rejected');
}

// Test Suite 14: Error Handling - Missing Operators
console.log('\nTest Suite 14: Error Handling - Missing Operators');
{
  const resNoOp = generator.generate('a b + c');
  assert(resNoOp.success === false, '14.1 Consecutive operands without operator rejected');
  assert(resNoOp.error.includes('Missing operator'), '14.2 Reports missing operator');
}

// Test Suite 15: Error Handling - Unrecognized Characters
console.log('\nTest Suite 15: Error Handling - Unrecognized Characters');
{
  const resBadChar = generator.generate('a + b @ c');
  assert(resBadChar.success === false, '15.1 Unrecognized character @ rejected');
  assert(resBadChar.error.includes('Invalid character'), '15.2 Flags exact invalid character');
}

// Final Summary
console.log('\n======================================================================');
console.log(`QUADRUPLE GENERATOR TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
