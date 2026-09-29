/**
 * test_phase1_pipeline.js
 * Automated Verification Suite for Phase 1 Integration: End-to-End Compiler Pipeline
 *
 * Verifies:
 *  1. Pipeline Initialization
 *  2. Source Code reaches Lexical Analysis & generates Tokens
 *  3. Symbol Table receives declared variables
 *  4. ExpressionParser extracts statements and initialization expressions
 *  5. QuadrupleGen generates Three-Address Code
 *  6. CodeOptimizer receives and optimizes Intermediate Code
 *  7. CodeGenerator synthesizes valid SIC Assembly
 *  8. Assembler generates Listing, Machine Code, and H/T/E Records
 *  9. Complete End-to-End Compilation on Sample Program (samples/sample_pipeline.c)
 * 10. Lexical errors correctly stop the pipeline before intermediate code generation
 * 11. Invalid expression syntax stops the pipeline before assembly
 * 12. Multiple arithmetic statements execute sequentially
 * 13. Constant folding & propagation across statements
 * 14. Existing sample programs remain valid
 */

import fs from 'fs';
import path from 'path';
import { CompilerPipeline } from '../src/core/CompilerPipeline.js';
import { ExpressionParser } from '../src/core/ExpressionParser.js';
import { CodeGenerator } from '../src/core/CodeGenerator.js';
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
console.log('       PHASE 1 INTEGRATION VERIFICATION: COMPILER PIPELINE');
console.log('======================================================================\n');

const pipeline = new CompilerPipeline();

// Test Suite 1: Pipeline Initialization
console.log('Test Suite 1: Pipeline Initialization');
{
  assert(pipeline instanceof CompilerPipeline, '1.1 Pipeline instance created successfully');
  assert(typeof pipeline.compile === 'function', '1.2 Pipeline exposes compile(source, options) API');
}

// Test Suite 2: Lexical Analysis & Token Stream
console.log('\nTest Suite 2: Lexical Analysis & Symbol Table Integration');
{
  const source = `
    int a;
    int b;
    a = 10;
  `;
  const res = pipeline.compile(source);
  assert(res.success === true, '2.1 Successfully processed lexical stage');
  assert(res.lexicalAnalysis.tokenCount > 0, '2.2 Emitted token stream');
  const symNames = res.symbolTable.map(s => s.name);
  assert(symNames.includes('a') && symNames.includes('b'), '2.3 Symbol table received declared identifiers a and b');
}

// Test Suite 3: Expression Parser Adapter
console.log('\nTest Suite 3: ExpressionParser Adapter');
{
  const parser = new ExpressionParser();
  const mockTokens = [
    { type: 'KEYWORD', lexeme: 'int', line: 1 },
    { type: 'IDENTIFIER', lexeme: 'x', line: 1 },
    { type: 'ASSIGN_OP', lexeme: '=', line: 1 },
    { type: 'INT_CONST', lexeme: '5', line: 1 },
    { type: 'DELIMITER', lexeme: ';', line: 1 },
    { type: 'IDENTIFIER', lexeme: 'y', line: 2 },
    { type: 'ASSIGN_OP', lexeme: '=', line: 2 },
    { type: 'IDENTIFIER', lexeme: 'x', line: 2 },
    { type: 'ARITH_OP', lexeme: '+', line: 2 },
    { type: 'INT_CONST', lexeme: '2', line: 2 },
    { type: 'DELIMITER', lexeme: ';', line: 2 }
  ];
  const exprs = parser.extractExpressions(mockTokens);
  assert(exprs.length === 2, '3.1 Extracted 2 executable expressions');
  assert(exprs[0].expression === 'x = 5', '3.2 Extracted declaration-assignment: x = 5');
  assert(exprs[1].expression === 'y = x + 2', '3.3 Extracted statement-assignment: y = x + 2');
}

// Test Suite 4: Intermediate Code Generation (Quadruples)
console.log('\nTest Suite 4: Intermediate Code Generation');
{
  const source = `
    int x;
    int a;
    int b;
    int c;
    x = a + b * c;
  `;
  const res = pipeline.compile(source);
  assert(res.success === true, '4.1 Intermediate code generated without errors');
  assert(res.intermediateCode.quadruples.length === 3, '4.2 Exactly 3 quadruples generated for a + b * c');
  const ops = res.intermediateCode.quadruples.map(q => q.op);
  assert(ops[0] === '*' && ops[1] === '+' && ops[2] === '=', '4.3 Correct operation order (* before + before =)');
}

// Test Suite 5: Code Optimizer Integration
console.log('\nTest Suite 5: Code Optimizer Integration');
{
  const source = `
    int a;
    int b;
    a = 4 + 6;
    b = a * 2;
  `;
  const res = pipeline.compile(source);
  assert(res.success === true, '5.1 Optimizer received and processed quadruples');
  assert(res.optimizedCode.optimizations.length > 0, '5.2 Optimizations performed and logged');
  const opt3AC = res.optimizedCode.threeAddressCode;
  assert(opt3AC.includes('a = 10'), '5.3 Constant folding reduced 4 + 6 -> a = 10');
  assert(opt3AC.includes('b = 20'), '5.4 Constant propagation & folding reduced a * 2 -> b = 20');
}

// Test Suite 6: Code Generator Adapter (Quadruples -> SIC Assembly)
console.log('\nTest Suite 6: CodeGenerator Adapter');
{
  const codeGen = new CodeGenerator();
  const mockQuads = [
    new Quadruple('*', 'b', 'c', 't1'),
    new Quadruple('+', 'a', 't1', 'result')
  ];
  const genRes = codeGen.generateAssembly(mockQuads, [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'result' }]);
  assert(typeof genRes.assemblySource === 'string', '6.1 Generated assembly source string');
  assert(genRes.lines.some(l => l.includes('START')), '6.2 Contains START directive');
  assert(genRes.lines.some(l => l.includes('MUL')), '6.3 Contains MUL instruction');
  assert(genRes.lines.some(l => l.includes('ADD')), '6.4 Contains ADD instruction');
  assert(genRes.lines.some(l => l.includes('HLT')), '6.5 Contains HLT instruction');
  assert(genRes.lines.some(l => l.includes('END')), '6.6 Contains END directive');
}

// Test Suite 7: Two-Pass Assembler Stage
console.log('\nTest Suite 7: Two-Pass Assembler Stage');
{
  const source = `
    int x;
    int y;
    x = 10;
    y = x + 5;
  `;
  const res = pipeline.compile(source);
  assert(res.success === true, '7.1 Assembly stage executed cleanly');
  assert(res.assembly.listing.length > 0, '7.2 Program Listing generated');
  assert(res.assembly.objectCode.length >= 3, '7.3 Educational Object Records (H, T, E) generated');
  assert(res.assembly.objectCode[0].startsWith('H^'), '7.4 Header record produced');
  assert(res.assembly.objectCode[res.assembly.objectCode.length - 1].startsWith('E^'), '7.5 End record produced');
}

// Test Suite 8: Complete End-to-End Program (sample_pipeline.c)
console.log('\nTest Suite 8: Complete End-to-End Sample Program');
{
  const samplePath = path.resolve(process.cwd(), 'samples/sample_pipeline.c');
  assert(fs.existsSync(samplePath), '8.1 samples/sample_pipeline.c exists');
  const sampleContent = fs.readFileSync(samplePath, 'utf-8');
  const res = pipeline.compile(sampleContent, { programName: 'DEMOPRO' });

  assert(res.success === true, '8.2 Sample program compiled through all 5 stages with 0 errors');
  assert(res.assembly.programName === 'DEMOPRO', '8.3 Custom program name preserved through assembly');
  assert(res.symbolTable.length === 4, '8.4 4 variables declared in Symbol Table (a, b, c, result)');
  assert(res.intermediateCode.instructionCount > 0, '8.5 Intermediate 3AC instructions generated');
  assert(res.optimizedCode.optimizationCount > 0, '8.6 Compile-time optimizations applied');
  assert(res.assembly.objectCode.some(r => r.startsWith('T^')), '8.7 Valid Text records emitted');
}

// Test Suite 9: Error Propagation - Lexical Errors Halt Pipeline
console.log('\nTest Suite 9: Error Propagation - Lexical Errors');
{
  const badSource = `
    int 9badVariable = 100;
    int ok = 5;
  `;
  const res = pipeline.compile(badSource);
  assert(res.success === false, '9.1 Pipeline halted on lexical error');
  assert(res.failedStage === 'Lexical Analysis', '9.2 Flags failure at Lexical Analysis stage');
  assert(res.intermediateCode === null, '9.3 Did not continue to intermediate code generation');
  assert(res.assembly === null, '9.4 Did not continue to assembly');
  assert(res.errors.length > 0, '9.5 Descriptive lexical error returned');
}

// Test Suite 10: Error Propagation - Expression Syntax Errors Halt Pipeline
console.log('\nTest Suite 10: Error Propagation - Expression Errors');
{
  const badExprSource = `
    int a;
    int b;
    a = 5;
    b = a + * 10;
  `;
  const res = pipeline.compile(badExprSource);
  assert(res.success === false, '10.1 Pipeline halted on invalid expression syntax');
  assert(res.failedStage === 'Intermediate Code Generation', '10.2 Flags failure at Intermediate Code stage');
  assert(res.assembly === null, '10.3 Did not generate assembly from invalid intermediate code');
}

// Test Suite 11: Error Propagation - Empty Input
console.log('\nTest Suite 11: Error Propagation - Empty Input');
{
  const emptyRes = pipeline.compile('');
  assert(emptyRes.success === false, '11.1 Rejects empty source input');
  assert(emptyRes.failedStage === 'Input', '11.2 Flags failure at Input stage');
}

// Test Suite 12: Complex Arithmetic & Parentheses
console.log('\nTest Suite 12: Complex Expressions with Parentheses');
{
  const source = `
    int p;
    int q;
    int r;
    int s;
    int ans;
    ans = (p + q) * (r - s);
  `;
  const res = pipeline.compile(source);
  assert(res.success === true, '12.1 Processes parenthesized expressions');
  assert(res.intermediateCode.quadruples.length === 4, '12.2 Correctly generates 4 quadruples for (p+q)*(r-s)');
  assert(res.assembly.listing.length > 0, '12.3 Produces full assembly listing');
}

// Final Summary
console.log('\n======================================================================');
console.log(`PHASE 1 INTEGRATION SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
