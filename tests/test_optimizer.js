/**
 * test_optimizer.js
 * Automated Verification Suite for Code Optimizer
 *
 * Verifies:
 *  1. Constant Folding (Arithmetic with numeric literals)
 *  2. Chained / Cascading Constant Folding
 *  3. Algebraic Simplification: Addition with 0 (x + 0, 0 + x)
 *  4. Algebraic Simplification: Subtraction with 0 (x - 0) and Self (x - x)
 *  5. Algebraic Simplification: Multiplication with 1 (x * 1, 1 * x)
 *  6. Algebraic Simplification: Multiplication with 0 (x * 0, 0 * x)
 *  7. Algebraic Simplification: Division by 1 (x / 1)
 *  8. Common Subexpression Elimination (CSE)
 *  9. Commutative CSE (a + b vs b + a)
 * 10. Multiple Distinct Repeated Subexpressions
 * 11. Code Requiring No Optimizations
 * 12. Safety Guard: Division by Zero is not folded and does not crash
 * 13. Compatibility with both Quadruple instances and Plain Objects
 * 14. Error Handling: Empty Input
 * 15. Error Handling: Invalid Quadruple Structure
 * 16. Optimization Log & Category Metrics Accuracy
 */

import { CodeOptimizer } from '../src/core/CodeOptimizer.js';
import { Quadruple } from '../src/core/QuadrupleGen.js';

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
console.log('       VERIFICATION: CODE OPTIMIZER');
console.log('======================================================================\n');

const optimizer = new CodeOptimizer();

// Test Suite 1: Constant Folding
console.log('Test Suite 1: Constant Folding');
{
  const quads = [
    new Quadruple('*', '10', '2', 't1'),
    new Quadruple('=', 't1', null, 'x')
  ];
  const res = optimizer.optimize(quads);
  assert(res.success === true, '1.1 Optimizes without errors');
  assert(res.optimizationCount > 0, '1.2 Optimization detected and logged');
  assert(res.optimized3AC[0] === 't1 = 20', '1.3 t1 = 10 * 2 folded to t1 = 20');
  assert(res.metrics.constantFoldingCount >= 1, '1.4 Metric tracked under Constant Folding');
}

// Test Suite 2: Chained Constant Folding
console.log('\nTest Suite 2: Chained / Cascading Constant Folding');
{
  // t1 = 2 * 5 -> 10, t2 = t1 + 20 -> 30, ans = t2
  const quads = [
    new Quadruple('*', '2', '5', 't1'),
    new Quadruple('+', 't1', '20', 't2'),
    new Quadruple('=', 't2', null, 'ans')
  ];
  const res = optimizer.optimize(quads);
  assert(res.success === true, '2.1 Processes chained constants');
  assert(res.optimized3AC[0] === 't1 = 10', '2.2 Step 1 folded: t1 = 10');
  assert(res.optimized3AC[1] === 't2 = 30', '2.3 Step 2 folded: t2 = 30');
  assert(res.optimized3AC[2] === 'ans = 30', '2.4 Step 3 propagates to final assignment: ans = 30');
}

// Test Suite 3: Algebraic Simplification - Addition with 0
console.log('\nTest Suite 3: Algebraic Simplification - Addition with 0');
{
  const quads = [
    new Quadruple('+', 'x', '0', 't1'),
    new Quadruple('+', '0', 'y', 't2')
  ];
  const res = optimizer.optimize(quads);
  assert(res.optimized3AC[0] === 't1 = x', '3.1 x + 0 simplifies to x');
  assert(res.optimized3AC[1] === 't2 = y', '3.2 0 + x simplifies to x');
  assert(res.metrics.algebraicSimplificationCount === 2, '3.3 Recorded 2 algebraic simplifications');
}

// Test Suite 4: Algebraic Simplification - Subtraction with 0 and Identity
console.log('\nTest Suite 4: Algebraic Simplification - Subtraction');
{
  const quads = [
    new Quadruple('-', 'x', '0', 't1'),
    new Quadruple('-', 'z', 'z', 't2')
  ];
  const res = optimizer.optimize(quads);
  assert(res.optimized3AC[0] === 't1 = x', '4.1 x - 0 simplifies to x');
  assert(res.optimized3AC[1] === 't2 = 0', '4.2 x - x simplifies to 0');
}

// Test Suite 5: Algebraic Simplification - Multiplication with 1
console.log('\nTest Suite 5: Algebraic Simplification - Multiplication with 1');
{
  const quads = [
    new Quadruple('*', 'x', '1', 't1'),
    new Quadruple('*', '1', 'y', 't2')
  ];
  const res = optimizer.optimize(quads);
  assert(res.optimized3AC[0] === 't1 = x', '5.1 x * 1 simplifies to x');
  assert(res.optimized3AC[1] === 't2 = y', '5.2 1 * x simplifies to x');
}

// Test Suite 6: Algebraic Simplification - Multiplication with 0
console.log('\nTest Suite 6: Algebraic Simplification - Multiplication with 0');
{
  const quads = [
    new Quadruple('*', 'x', '0', 't1'),
    new Quadruple('*', '0', 'y', 't2')
  ];
  const res = optimizer.optimize(quads);
  assert(res.optimized3AC[0] === 't1 = 0', '6.1 x * 0 simplifies to 0');
  assert(res.optimized3AC[1] === 't2 = 0', '6.2 0 * x simplifies to 0');
}

// Test Suite 7: Algebraic Simplification - Division by 1
console.log('\nTest Suite 7: Algebraic Simplification - Division by 1');
{
  const quads = [new Quadruple('/', 'x', '1', 't1')];
  const res = optimizer.optimize(quads);
  assert(res.optimized3AC[0] === 't1 = x', '7.1 x / 1 simplifies to x');
}

// Test Suite 8: Common Subexpression Elimination (CSE)
console.log('\nTest Suite 8: Common Subexpression Elimination');
{
  const quads = [
    new Quadruple('+', 'a', 'b', 't1'),
    new Quadruple('*', 't1', '2', 't2'),
    new Quadruple('+', 'a', 'b', 't3'), // redundant
    new Quadruple('*', 't3', '4', 't4')
  ];
  const res = optimizer.optimize(quads);
  assert(res.metrics.cseCount >= 1, '8.1 CSE detected and applied');
  assert(res.optimized3AC[2] === 't3 = t1', '8.2 Duplicate a + b replaced with copy assignment: t3 = t1');
}

// Test Suite 9: Commutative CSE (a + b vs b + a)
console.log('\nTest Suite 9: Commutative CSE');
{
  const quads = [
    new Quadruple('+', 'a', 'b', 't1'),
    new Quadruple('+', 'b', 'a', 't2')
  ];
  const res = optimizer.optimize(quads);
  assert(res.optimized3AC[1] === 't2 = t1', '9.1 Recognizes b + a as identical to a + b for commutative +');
}

// Test Suite 10: Multiple Distinct Repeated Subexpressions
console.log('\nTest Suite 10: Multiple Repeated Subexpressions');
{
  const quads = [
    new Quadruple('+', 'x', 'y', 't1'),
    new Quadruple('*', 'm', 'n', 't2'),
    new Quadruple('+', 'x', 'y', 't3'), // duplicate 1
    new Quadruple('*', 'm', 'n', 't4')  // duplicate 2
  ];
  const res = optimizer.optimize(quads);
  assert(res.optimized3AC[2] === 't3 = t1', '10.1 First repeated subexpression eliminated (t3 = t1)');
  assert(res.optimized3AC[3] === 't4 = t2', '10.2 Second repeated subexpression eliminated (t4 = t2)');
  assert(res.metrics.cseCount === 2, '10.3 Both CSE occurrences counted in metrics');
}

// Test Suite 11: Code Requiring No Optimization
console.log('\nTest Suite 11: Code Requiring No Optimization');
{
  const quads = [
    new Quadruple('+', 'a', 'b', 't1'),
    new Quadruple('*', 'c', 'd', 't2'),
    new Quadruple('-', 'e', 'f', 't3')
  ];
  const res = optimizer.optimize(quads);
  assert(res.optimizationCount === 0, '11.1 Zero optimizations applied when none possible');
  assert(res.optimizedQuadruples.length === 3, '11.2 Instruction count unchanged');
  assert(res.optimized3AC[0] === 't1 = a + b', '11.3 Code preserved exactly');
}

// Test Suite 12: Safety Guard - Division by Zero
console.log('\nTest Suite 12: Safety Guard - Division by Zero');
{
  const quads = [new Quadruple('/', '10', '0', 't1')];
  const res = optimizer.optimize(quads);
  assert(res.success === true, '12.1 Handled division by zero without throwing error');
  assert(res.optimized3AC[0] === 't1 = 10 / 0', '12.2 Preserved division by zero safely without folding');
}

// Test Suite 13: Compatibility with Plain Objects
console.log('\nTest Suite 13: Plain Object Compatibility');
{
  const plainQuads = [
    { op: '+', arg1: 'x', arg2: '0', result: 't1' },
    { op: '*', arg1: '5', arg2: '5', result: 't2' }
  ];
  const res = optimizer.optimize(plainQuads);
  assert(res.success === true, '13.1 Accepts plain objects without Quadruple class instantiation');
  assert(res.optimized3AC[0] === 't1 = x', '13.2 Algebraic simplification executed on plain object');
  assert(res.optimized3AC[1] === 't2 = 25', '13.3 Constant folding executed on plain object');
}

// Test Suite 14: Error Handling - Empty Input
console.log('\nTest Suite 14: Error Handling - Empty Input');
{
  const resEmpty = optimizer.optimize([]);
  assert(resEmpty.success === false, '14.1 Rejects empty array');
  assert(resEmpty.error.includes('empty'), '14.2 Reports empty input error');
  const resNull = optimizer.optimize(null);
  assert(resNull.success === false, '14.3 Rejects null input');
}

// Test Suite 15: Error Handling - Malformed Structure
console.log('\nTest Suite 15: Error Handling - Invalid Structure');
{
  const resBad = optimizer.optimize([{ invalid: 'field' }]);
  assert(resBad.success === false, '15.1 Rejects object missing op/result');
  assert(resBad.error.includes('Invalid quadruple structure'), '15.2 Details structural invalidity');
}

// Test Suite 16: Optimization Log Formatting
console.log('\nTest Suite 16: Optimization Log Formatting');
{
  const quads = [
    new Quadruple('*', '2', '8', 't1'),
    new Quadruple('+', 'x', '0', 't2')
  ];
  const res = optimizer.optimize(quads);
  assert(Array.isArray(res.optimizations), '16.1 Optimizations returned as an array');
  assert(res.optimizations.length === 2, '16.2 Exactly 2 optimization entries logged');
  assert(res.optimizations[0].type === 'Constant Folding', '16.3 First entry logged under Constant Folding');
  assert(res.optimizations[1].type === 'Algebraic Simplification', '16.4 Second entry logged under Algebraic Simplification');
  assert(res.optimizations[0].before && res.optimizations[0].after, '16.5 Log records before and after instructions');
}

// Final Summary
console.log('\n======================================================================');
console.log(`CODE OPTIMIZER TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
