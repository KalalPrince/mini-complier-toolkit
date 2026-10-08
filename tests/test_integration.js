/**
 * test_integration.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Final Integration & End-to-End Verification Suite.
 * Verifies complete multi-module compilation flow, error isolation,
 * sequential compilation state reset, and standalone assembly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CompilerPipeline } from '../src/core/CompilerPipeline.js';
import { Assembler } from '../src/core/Assembler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('======================================================================');
console.log('       SYSTEM INTEGRATION VERIFICATION: COMPILER PIPELINE');
console.log('======================================================================\n');

const pipeline = new CompilerPipeline();

// =============================================================================
// Test Suite 1: Full Compilation Pipeline on Canonical Sample (sample_pipeline.c)
// =============================================================================
console.log('Test Suite 1: Full Compilation Pipeline on Canonical Sample (sample_pipeline.c)');
const samplePipelinePath = path.join(rootDir, 'samples', 'sample_pipeline.c');
assert(fs.existsSync(samplePipelinePath), '1.1 samples/sample_pipeline.c exists on disk');

const sourceCode = fs.readFileSync(samplePipelinePath, 'utf8');
const result = pipeline.compile(sourceCode, {
  programName: 'CALC',
  startAddress: '1000'
});

assert(result.success === true, '1.2 Full compilation succeeds with success === true');
assert(result.errors.length === 0, '1.3 Zero errors reported across all modules');

// Lexical Analysis & Symbol Table Checks
assert(result.lexicalAnalysis && result.lexicalAnalysis.tokens.length > 0, '1.4 Lexical Analyzer: Tokens stream emitted');
assert(result.symbolTable && result.symbolTable.length === 4, '1.5 Symbol Table: Populated with 4 declared variables');
const symNames = result.symbolTable.map(s => s.name);
assert(symNames.includes('a') && symNames.includes('b') && symNames.includes('c') && symNames.includes('result'),
  '1.6 Symbol Table: Contains a, b, c, result');

// Intermediate Code Checks
assert(result.intermediateCode && result.intermediateCode.quadruples.length > 0, '1.7 Quadruple Generator: Quadruples generated');
assert(result.intermediateCode.threeAddressCode.length > 0, '1.8 Quadruple Generator: Linear 3AC statements generated');

// Code Optimizer Checks
assert(result.optimizedCode && Array.isArray(result.optimizedCode.quadruples), '1.9 Code Optimizer: Optimized quadruples generated');
assert(result.optimizedCode.optimizationCount >= 1, '1.10 Code Optimizer: Compile-time constant folding performed and logged');

// Target Code Generation & Assembler Checks
assert(result.generatedAssembly && typeof result.generatedAssembly.source === 'string', '1.11 Target: Generated SIC assembly text');
assert(result.assembly && Array.isArray(result.assembly.listing), '1.12 Two-Pass Assembler: Listing generated');
assert(result.assembly.objectCode && result.assembly.objectCode.length >= 3, '1.13 Target: Object program contains H, T, E records');

// =============================================================================
// Test Suite 2: Complex Expression Pipeline Verification
// =============================================================================
console.log('\nTest Suite 2: Complex Expression Pipeline with Parentheses & Precedence');
const complexSource = `
int x;
int y;
int z;
int total;

x = 10;
y = 20;
z = 5;
total = (x + y) * (z + 2);
`;

const complexRes = pipeline.compile(complexSource, { programName: 'EXPR', startAddress: '2000' });
assert(complexRes.success === true, '2.1 Complex parenthesized expression compiles with 0 errors');
assert(complexRes.assembly.programName === 'EXPR', '2.2 Custom program name EXPR preserved');
assert(complexRes.assembly.startAddressHex === '2000', '2.3 Custom start address 2000H preserved in assembly');
assert(complexRes.intermediateCode.quadruples.some(q => q.op === '+' && q.arg1 === 'x' && q.arg2 === 'y'),
  '2.4 Subexpression (x + y) correctly evaluated');
assert(complexRes.intermediateCode.quadruples.some(q => q.op === '+' && q.arg1 === 'z' && q.arg2 === '2'),
  '2.5 Subexpression (z + 2) correctly evaluated');
assert(complexRes.intermediateCode.quadruples.some(q => q.op === '*'),
  '2.6 Multiplication of subexpressions evaluated after inner additions');

// =============================================================================
// Test Suite 3: Compile-Time Optimization Integration
// =============================================================================
console.log('\nTest Suite 3: Compile-Time Optimization Rules through the Pipeline');

// 3.1 Constant Folding
const foldSource = `
int a;
int b;
int c;
a = 10;
b = 20;
c = a + b;
`;
const foldRes = pipeline.compile(foldSource);
assert(foldRes.success === true, '3.1 Constant folding source compiles successfully');
assert(foldRes.optimizedCode.metrics.constantFoldingCount >= 1, '3.2 Constant folding metric incremented');

// 3.2 Algebraic Simplification
const algSource = `
int x;
int y;
y = x + 0;
`;
const algRes = pipeline.compile(algSource);
assert(algRes.success === true, '3.3 Algebraic simplification source compiles successfully');
assert(algRes.optimizedCode.metrics.algebraicSimplificationCount >= 1, '3.4 Algebraic simplification metric incremented');

// 3.3 Common Subexpression Elimination
const cseSource = `
int a;
int b;
int r1;
int r2;
a = 15;
b = 25;
r1 = a + b;
r2 = a + b;
`;
const cseRes = pipeline.compile(cseSource);
assert(cseRes.success === true, '3.5 CSE source compiles successfully');
assert(cseRes.optimizedCode.optimizationCount >= 1, '3.6 Identical subexpression recognized and eliminated');

// =============================================================================
// Test Suite 4: Strict Error Propagation & Module Isolation
// =============================================================================
console.log('\nTest Suite 4: Strict Error Propagation & Module Isolation');

// 4.1 Lexical Error
const lexErrSource = `
int a;
a = 5 @ 2;
`;
const lexErrRes = pipeline.compile(lexErrSource);
assert(lexErrRes.success === false, '4.1 Lexical error detected and marked failed');
assert(lexErrRes.failedStage === 'Lexical Analysis', '4.2 Failure halted exactly at "Lexical Analysis"');
assert(lexErrRes.intermediateCode === null, '4.3 Intermediate code generation prevented on lexical error');
assert(lexErrRes.assembly === null, '4.4 Assembly translation prevented on lexical error');
assert(lexErrRes.errors[0].lexeme === '@', '4.5 Error correctly pinpoints unrecognized character "@"');

// 4.2 Syntax / Expression Error
const exprErrSource = `
int a;
a = + * 2;
`;
const exprErrRes = pipeline.compile(exprErrSource);
assert(exprErrRes.success === false, '4.6 Expression syntax error detected and marked failed');
assert(exprErrRes.failedStage === 'Intermediate Code Generation', '4.7 Failure halted at "Intermediate Code Generation"');
assert(exprErrRes.assembly === null, '4.8 Assembly translation prevented on expression error');
assert(exprErrRes.errors[0].message.includes('Syntax error'), '4.9 Descriptive syntax error message returned');

// 4.3 Empty Source Input
const emptyRes = pipeline.compile('');
assert(emptyRes.success === false, '4.10 Empty string input rejected');
assert(emptyRes.failedStage === 'Input', '4.11 Empty string halts at "Input"');

// 4.4 Whitespace Only Input
const wsRes = pipeline.compile('    \n\t  \n  ');
assert(wsRes.success === false, '4.12 Whitespace-only input rejected');
assert(wsRes.failedStage === 'Input', '4.13 Whitespace-only input halts at "Input"');

// 4.5 Invalid Assignment Target
const badAssignSource = `
int a;
10 = a + 2;
`;
const badAssignRes = pipeline.compile(badAssignSource);
assert(badAssignRes.success === false, '4.14 Invalid assignment target rejected');
assert(badAssignRes.failedStage === 'Intermediate Code Generation', '4.15 Invalid assignment target halts at Intermediate Code Generation');

// =============================================================================
// Test Suite 5: Sequential Compilation & State Isolation (Multiple Runs)
// =============================================================================
console.log('\nTest Suite 5: Sequential Compilation & State Isolation (Multiple Runs)');
const sharedPipeline = new CompilerPipeline();

// Run 1: Program A
const progA = 'int alpha; alpha = 100;';
const resA = sharedPipeline.compile(progA, { programName: 'PROGA' });
assert(resA.success === true, '5.1 Run 1 (PROGA) compiles successfully');
assert(resA.symbolTable.length === 1 && resA.symbolTable[0].name === 'alpha', '5.2 Run 1 contains only symbol alpha');

// Run 2: Program B on same instance
const progB = 'int beta; int gamma; beta = 5; gamma = beta + 10;';
const resB = sharedPipeline.compile(progB, { programName: 'PROGB' });
assert(resB.success === true, '5.3 Run 2 (PROGB) on same pipeline instance compiles successfully');
assert(resB.symbolTable.length === 2, '5.4 Run 2 contains exactly 2 symbols (beta, gamma)');
assert(!resB.symbolTable.some(s => s.name === 'alpha'), '5.5 Symbol alpha from Run 1 does NOT contaminate Run 2');
assert(resB.assembly.programName === 'PROGB', '5.6 Run 2 program name updated to PROGB');

// Run 3: Failure
const progC = 'int delta; delta = 10 @ 2;';
const resC = sharedPipeline.compile(progC);
assert(resC.success === false, '5.7 Run 3 correctly reports lexical error');

// Run 4: Clean recovery on subsequent run
const progD = 'int omega; omega = 999;';
const resD = sharedPipeline.compile(progD, { programName: 'PROGD' });
assert(resD.success === true, '5.8 Run 4 cleanly recovers after Run 3 error');
assert(resD.symbolTable.length === 1 && resD.symbolTable[0].name === 'omega', '5.9 Run 4 state is isolated and pristine');

// =============================================================================
// Test Suite 6: Object Program Record Formats (H, T, E)
// =============================================================================
console.log('\nTest Suite 6: Object Program Record Formats (H, T, E)');
const objRecords = result.assembly.objectCode;
assert(Array.isArray(objRecords) && objRecords.length >= 3, '6.1 Object records array emitted');

const headerRec = objRecords[0];
assert(headerRec.startsWith('H^CALC  ^001000^'), '6.2 Header record formatted with Name, Start, and Length');

const textRecs = objRecords.filter(r => r.startsWith('T^'));
assert(textRecs.length >= 1, '6.3 At least one Text record emitted');
for (const tr of textRecs) {
  const parts = tr.split('^');
  assert(parts.length >= 4, '6.4 Text record contains T, StartAddr, ByteCount, and ObjectCode');
  assert(parts[1].length === 6, '6.5 Text record start address is 6 hex digits');
  assert(parts[2].length === 2, '6.6 Text record byte count is 2 hex digits');
}

const endRec = objRecords[objRecords.length - 1];
assert(endRec === 'E^001000', '6.7 End record formatted with execution start address E^001000');

// =============================================================================
// Test Suite 7: Standalone Two-Pass Assembler Verification (sample_assembly.asm)
// =============================================================================
console.log('\nTest Suite 7: Standalone Two-Pass Assembler Verification (sample_assembly.asm)');
const asmPath = path.join(rootDir, 'samples', 'sample_assembly.asm');
assert(fs.existsSync(asmPath), '7.1 samples/sample_assembly.asm exists on disk');

const asmSource = fs.readFileSync(asmPath, 'utf8');
const standaloneAssembler = new Assembler();
const standaloneRes = standaloneAssembler.assemble(asmSource);

assert(standaloneRes.errors.length === 0, '7.2 Standalone assembly assembles with 0 errors');
assert(standaloneRes.programName === 'COPY', '7.3 Standalone sample program name is COPY');
assert(standaloneRes.startAddressHex === '1000', '7.4 Standalone sample start address is 1000H');
assert(standaloneRes.objectCode.length >= 3, '7.5 Standalone sample produces valid H, T, E object records');
assert(standaloneRes.listing.length >= 8, '7.6 Standalone sample produces complete line-by-line listing');

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n======================================================================');
console.log(`SYSTEM INTEGRATION TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
