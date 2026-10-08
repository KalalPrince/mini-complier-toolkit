/**
 * test_cli.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Automated Verification Suite for CLI Menu-Driven Interface.
 * Verifies that the CLI acts as an integration interface layer
 * and reaches the existing compiler modules without faking outputs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import {
  BANNER,
  CLIInterface,
  handleMenuChoice,
  executeLexer,
  executeSymbolTable,
  executeQuadGen,
  executeOptimizer,
  executeAssembler,
  executePipeline,
  executeWebDashboardInfo,
  loadSampleFile
} from '../cli.js';

import { Token } from '../src/core/Lexer.js';
import { SymbolTable, SymbolEntry } from '../src/core/SymbolTable.js';
import { Quadruple } from '../src/core/QuadrupleGen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m[PASS]\x1b[0m ${testName}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m[FAIL]\x1b[0m ${testName} ${details ? `(${details})` : ''}`);
    failedTests++;
  }
}

/**
 * Mock IO helper for programmatic menu dispatcher testing.
 */
class MockIO {
  constructor(defaultAnswer = '') {
    this.defaultAnswer = defaultAnswer;
    this.written = [];
    this.asked = [];
  }

  ask(question) {
    this.asked.push(question);
    return Promise.resolve(this.defaultAnswer);
  }

  write(msg = '') {
    this.written.push(String(msg));
  }
}

console.log('======================================================================');
console.log('       CLI VERIFICATION: MENU-DRIVEN COMPILER INTERFACE');
console.log('======================================================================\n');

// =============================================================================
// Test Suite 1: CLI Starts & Structure Verification
// =============================================================================
console.log('Test Suite 1: CLI Module Structure');
assert(fs.existsSync(path.join(rootDir, 'cli.js')), '1.1 cli.js exists at workspace root');
assert(typeof BANNER === 'string', '1.2 BANNER template is exported as string');
assert(typeof handleMenuChoice === 'function', '1.3 handleMenuChoice dispatcher function exported');
assert(typeof executeLexer === 'function', '1.4 executeLexer handler function exported');
assert(typeof executeSymbolTable === 'function', '1.5 executeSymbolTable handler function exported');
assert(typeof executeQuadGen === 'function', '1.6 executeQuadGen handler function exported');
assert(typeof executeOptimizer === 'function', '1.7 executeOptimizer handler function exported');
assert(typeof executeAssembler === 'function', '1.8 executeAssembler handler function exported');
assert(typeof executePipeline === 'function', '1.9 executePipeline handler function exported');
assert(typeof executeWebDashboardInfo === 'function', '1.10 executeWebDashboardInfo handler function exported');

// =============================================================================
// Test Suite 2: Main Menu Display
// =============================================================================
console.log('\nTest Suite 2: Main Menu Banner and Options Display');
assert(BANNER.includes('MINI SYSTEM SOFTWARE TOOLKIT'), '2.1 Banner contains project title');
assert(BANNER.includes('=================================================='), '2.2 Banner contains header frame border');
assert(BANNER.includes('[1] Lexical Analyzer'), '2.3 Menu contains Option [1] Lexical Analyzer');
assert(BANNER.includes('[2] Symbol Table'), '2.4 Menu contains Option [2] Symbol Table');
assert(BANNER.includes('[3] Quadruple Generator'), '2.5 Menu contains Option [3] Quadruple Generator');
assert(BANNER.includes('[4] Code Optimizer'), '2.6 Menu contains Option [4] Code Optimizer');
assert(BANNER.includes('[5] Two-Pass Assembler'), '2.7 Menu contains Option [5] Two-Pass Assembler');
assert(BANNER.includes('[6] Complete Compilation Pipeline'), '2.8 Menu contains Option [6] Complete Pipeline');
assert(BANNER.includes('[7] Run All Tests'), '2.9 Menu contains Option [7] Run All Tests');
assert(BANNER.includes('[8] Web Dashboard Information'), '2.10 Menu contains Option [8] Web Dashboard Info');
assert(BANNER.includes('[0] Exit'), '2.11 Menu contains Option [0] Exit');

// =============================================================================
// Test Suite 3: Valid Menu Choices Recognized
// =============================================================================
console.log('\nTest Suite 3: Valid Menu Choices Recognized');
{
  const mock1 = new MockIO('1');
  const res1 = await handleMenuChoice('1', mock1);
  assert(res1 === true, '3.1 Choice [1] recognized and signals loop continuation');

  const mock2 = new MockIO('1');
  const res2 = await handleMenuChoice('2', mock2);
  assert(res2 === true, '3.2 Choice [2] recognized and signals loop continuation');

  const mock3 = new MockIO('');
  const res3 = await handleMenuChoice('3', mock3);
  assert(res3 === true, '3.3 Choice [3] recognized and signals loop continuation');

  const mock4 = new MockIO('1');
  const res4 = await handleMenuChoice('4', mock4);
  assert(res4 === true, '3.4 Choice [4] recognized and signals loop continuation');

  const mock5 = new MockIO('1');
  const res5 = await handleMenuChoice('5', mock5);
  assert(res5 === true, '3.5 Choice [5] recognized and signals loop continuation');

  const mock6 = new MockIO('1');
  const res6 = await handleMenuChoice('6', mock6);
  assert(res6 === true, '3.6 Choice [6] recognized and signals loop continuation');

  const mock8 = new MockIO('');
  const res8 = await handleMenuChoice('8', mock8);
  assert(res8 === true, '3.7 Choice [8] recognized and signals loop continuation');
}

// =============================================================================
// Test Suite 4: Invalid Choices Handled Safely
// =============================================================================
console.log('\nTest Suite 4: Invalid Choices Handled Safely');
{
  const mockBad = new MockIO('');
  const resBad1 = await handleMenuChoice('99', mockBad);
  assert(resBad1 === true, '4.1 Choice "99" does not crash and returns true to keep menu alive');
  assert(mockBad.written.some(w => w.includes("Invalid choice '99'")), '4.2 Choice "99" displays informative error');

  const mockBad2 = new MockIO('');
  const resBad2 = await handleMenuChoice('xyz', mockBad2);
  assert(resBad2 === true, '4.3 Non-numeric choice "xyz" handled safely');
  assert(mockBad2.written.some(w => w.includes("Invalid choice 'xyz'")), '4.4 Non-numeric choice displays informative error');

  const mockBad3 = new MockIO('');
  const resBad3 = await handleMenuChoice('-1', mockBad3);
  assert(resBad3 === true, '4.5 Negative choice "-1" handled safely');
}

// =============================================================================
// Test Suite 5: Exit Works Cleanly
// =============================================================================
console.log('\nTest Suite 5: Clean Exit Handling');
{
  const mockExit = new MockIO('');
  const resExit = await handleMenuChoice('0', mockExit);
  assert(resExit === false, '5.1 Choice "0" returns false to exit interactive loop');
  assert(mockExit.written.some(w => w.includes('Goodbye')), '5.2 Choice "0" prints polite farewell message');
}

// =============================================================================
// Test Suite 6: Option 1 Reaches Lexer.js
// =============================================================================
console.log('\nTest Suite 6: Option 1 Reaches Lexer.js');
{
  const lexResult = executeLexer('int a; float b; a = 10;');
  assert(lexResult.success === true, '6.1 executeLexer succeeds on clean source');
  assert(Array.isArray(lexResult.tokens) && lexResult.tokens.length > 0, '6.2 Tokens array returned');
  assert(lexResult.tokens[0] instanceof Token, '6.3 Tokens are actual instances of Token class from Lexer.js');
  assert(lexResult.tokens[0].type === 'KEYWORD', '6.4 Token types correctly identified');

  // Verify lexical error handling
  const errResult = executeLexer('int @bad = 10;');
  assert(errResult.success === false, '6.5 Lexical errors detected by Lexer');
  assert(errResult.errors.length > 0, '6.6 Errors array populated');
  assert(errResult.errors.some(e => e.lexeme === '@'), '6.7 Error identifies unrecognized character @');
}

// =============================================================================
// Test Suite 7: Option 2 Reaches SymbolTable.js
// =============================================================================
console.log('\nTest Suite 7: Option 2 Reaches SymbolTable.js');
{
  const symResult = executeSymbolTable({ mode: 'demo' });
  assert(symResult.success === true, '7.1 executeSymbolTable succeeds');
  assert(symResult.symbolTable instanceof SymbolTable, '7.2 Returns real SymbolTable instance from SymbolTable.js');
  assert(symResult.entries.length >= 4, '7.3 Symbol table populated with entries');

  const countEntry = symResult.symbolTable.lookup('count');
  assert(countEntry instanceof SymbolEntry, '7.4 Lookup returns real SymbolEntry instance');
  assert(countEntry.name === 'count' && countEntry.type === 'int', '7.5 Symbol attributes accurately preserved');
  assert(typeof symResult.symbolTable.hash('count') === 'number', '7.6 SymbolTable rolling hash algorithm executed');
}

// =============================================================================
// Test Suite 8: Option 3 Reaches QuadrupleGen.js
// =============================================================================
console.log('\nTest Suite 8: Option 3 Reaches QuadrupleGen.js');
{
  const qResult = executeQuadGen('result = a + b * c');
  assert(qResult.success === true, '8.1 executeQuadGen succeeds on valid expression');
  assert(qResult.quadruples.length === 3, '8.2 Exactly 3 quadruples generated for a + b * c');
  assert(qResult.quadruples[0] instanceof Quadruple, '8.3 Instructions are real Quadruple instances from QuadrupleGen.js');
  assert(qResult.threeAddressCode.length === 3, '8.4 3AC strings produced');
  assert(qResult.threeAddressCode[0].includes('*'), '8.5 Multiplication has higher precedence');

  // Error handling
  const badQ = executeQuadGen('a + * b');
  assert(badQ.success === false, '8.6 Syntax error caught by QuadrupleGen parser');
  assert(typeof badQ.error === 'string', '8.7 Error message returned');
}

// =============================================================================
// Test Suite 9: Option 4 Reaches CodeOptimizer.js
// =============================================================================
console.log('\nTest Suite 9: Option 4 Reaches CodeOptimizer.js');
{
  const optResult = executeOptimizer('x = 3 + 5 * 2; y = a + 0; z = 3 + 5 * 2;');
  assert(optResult.success === true, '9.1 executeOptimizer succeeds');
  assert(optResult.optimizations.length >= 2, '9.2 Optimizations detected and logged');
  assert(optResult.metrics.constantFoldingCount >= 1, '9.3 Constant folding executed');
  assert(optResult.metrics.algebraicSimplificationCount >= 1, '9.4 Algebraic simplification executed');
  assert(optResult.optimizedQuadruples.length > 0, '9.5 Optimized quadruples returned');
}

// =============================================================================
// Test Suite 10: Option 5 Reaches Assembler.js
// =============================================================================
console.log('\nTest Suite 10: Option 5 Reaches Assembler.js');
{
  const asmSource = loadSampleFile('sample_assembly.asm');
  const asmResult = executeAssembler(asmSource);
  assert(asmResult.success === true, '10.1 executeAssembler succeeds on sample assembly');
  assert(asmResult.programName === 'COPY', '10.2 Program name COPY resolved');
  assert(asmResult.symbolTable.length >= 4, '10.3 Pass 1 Symbol Table resolved');
  assert(asmResult.listing.length >= 8, '10.4 Pass 2 Listing generated');
  assert(asmResult.objectCode.length >= 3, '10.5 Standard Object Program Records generated');
  assert(asmResult.objectCode[0].startsWith('H^'), '10.6 Header Record emitted');
  assert(asmResult.objectCode[asmResult.objectCode.length - 1].startsWith('E^'), '10.7 End Record emitted');
}

// =============================================================================
// Test Suite 11: Option 6 Reaches CompilerPipeline.js
// =============================================================================
console.log('\nTest Suite 11: Option 6 Reaches CompilerPipeline.js');
{
  const pipeSource = loadSampleFile('sample_pipeline.c');
  const pipeResult = executePipeline(pipeSource);
  assert(pipeResult.success === true, '11.1 executePipeline succeeds on sample C program');
  assert(pipeResult.result.lexicalAnalysis.tokenCount > 0, '11.2 Lexical tokens produced');
  assert(pipeResult.result.symbolTable.length === 4, '11.3 Symbol table contains 4 variables');
  assert(pipeResult.result.intermediateCode.quadruples.length > 0, '11.4 Intermediate quadruples generated');
  assert(pipeResult.result.optimizedCode.quadruples.length > 0, '11.5 Code Optimizer executed');
  assert(pipeResult.result.generatedAssembly.lines.length > 0, '11.6 Target assembly generated');
  assert(pipeResult.result.assembly.objectCode.length >= 3, '11.7 Two-Pass Assembler generated H/T/E records');

  // Error isolation
  const badPipe = executePipeline('int @invalid = 5;');
  assert(badPipe.success === false, '11.8 Lexical failure halts pipeline');
  assert(badPipe.failedStage === 'Lexical Analysis', '11.9 Failure accurately identified as Lexical Analysis');
}

// =============================================================================
// Test Suite 12: Subprocess Execution Verification
// =============================================================================
console.log('\nTest Suite 12: Subprocess Execution Verification');
{
  // Test 12.1: Run CLI subprocess with exit choice 0
  const output0 = execSync('node cli.js', {
    cwd: rootDir,
    input: '0\n',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  assert(output0.includes('MINI SYSTEM SOFTWARE TOOLKIT'), '12.1 CLI subprocess displays banner on launch');
  assert(output0.includes('Goodbye'), '12.2 CLI subprocess exits cleanly on choice 0');

  // Test 12.2: Run CLI subprocess with invalid choice 99 then 0
  const outputBad = execSync('node cli.js', {
    cwd: rootDir,
    input: '99\n0\n',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  assert(outputBad.includes("Invalid choice '99'"), '12.3 CLI subprocess gracefully handles invalid choice 99');

  // Test 12.3: Run CLI subprocess with Option 8 (Web Dashboard Info) then 0
  const output8 = execSync('node cli.js', {
    cwd: rootDir,
    input: '8\n0\n',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });
  assert(output8.includes('WEB DASHBOARD INFORMATION'), '12.4 CLI subprocess executes Option 8');
  assert(output8.includes('http://localhost:3000'), '12.5 CLI subprocess mentions http://localhost:3000');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n======================================================================');
console.log(`CLI TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
