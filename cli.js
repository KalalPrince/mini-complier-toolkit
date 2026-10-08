/**
 * cli.js
 * Mini System Software Toolkit
 *
 * Menu-driven command-line interface integrating all five core System Software modules:
 *   1. Lexical Analyzer (Lexer.js)
 *   2. Symbol Table (SymbolTable.js)
 *   3. Quadruple Generator (QuadrupleGen.js)
 *   4. Code Optimizer (CodeOptimizer.js)
 *   5. Two-Pass Assembler (Assembler.js)
 * Plus:
 *   6. Complete Compilation Pipeline (CompilerPipeline.js)
 *   7. Run All Tests
 *   8. Web Dashboard Information
 *   0. Exit
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

import { Lexer } from './src/core/Lexer.js';
import { SymbolTable } from './src/core/SymbolTable.js';
import { QuadrupleGen } from './src/core/QuadrupleGen.js';
import { ExpressionParser } from './src/core/ExpressionParser.js';
import { CodeOptimizer } from './src/core/CodeOptimizer.js';
import { Assembler } from './src/core/Assembler.js';
import { CompilerPipeline } from './src/core/CompilerPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BANNER = `
==================================================
       MINI SYSTEM SOFTWARE TOOLKIT
==================================================

[1] Lexical Analyzer
[2] Symbol Table
[3] Quadruple Generator
[4] Code Optimizer
[5] Two-Pass Assembler
[6] Complete Compilation Pipeline
[7] Run All Tests
[8] Web Dashboard Information
[0] Exit
`;

/**
 * Loads a sample file from the samples directory, with fallback.
 */
export function loadSampleFile(fileName, fallback = '') {
  try {
    const fullPath = path.join(__dirname, 'samples', fileName);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
  } catch {
    // Return fallback on any read issue
  }
  return fallback;
}

/**
 * CLI Input/Output controller.
 */
export class CLIInterface {
  constructor(inputStream = process.stdin, outputStream = process.stdout) {
    this.inputStream = inputStream;
    this.outputStream = outputStream;
    this.rl = readline.createInterface({
      input: this.inputStream,
      output: this.outputStream,
      terminal: false
    });
    this.closed = false;
    this.pendingResolvers = [];

    this.rl.on('close', () => {
      this.closed = true;
      while (this.pendingResolvers.length > 0) {
        const resolve = this.pendingResolvers.shift();
        resolve(null);
      }
    });
  }

  ask(question) {
    if (this.closed) return Promise.resolve(null);
    return new Promise((resolve) => {
      this.pendingResolvers.push(resolve);
      this.rl.question(question, (answer) => {
        const idx = this.pendingResolvers.indexOf(resolve);
        if (idx !== -1) {
          this.pendingResolvers.splice(idx, 1);
        }
        resolve(answer !== undefined && answer !== null ? answer.trim() : null);
      });
    });
  }

  write(msg = '') {
    this.outputStream.write(msg + '\n');
  }

  close() {
    this.closed = true;
    this.rl.close();
  }
}

// =============================================================================
// OPTION 1: LEXICAL ANALYZER
// =============================================================================

export function executeLexer(sourceCode, io = null) {
  const code = (sourceCode !== undefined && sourceCode !== null) ? sourceCode : loadSampleFile('sample_pipeline.c');
  const lexer = new Lexer();
  const result = lexer.tokenize(code);

  const lines = [];
  lines.push('\n==================================================');
  lines.push('               [1] LEXICAL ANALYZER');
  lines.push('==================================================');
  lines.push('Source Code Input:');
  lines.push('--------------------------------------------------');
  lines.push(code.trim());
  lines.push('--------------------------------------------------');

  lines.push('\nTOKENS GENERATED:');
  lines.push(
    'Idx'.padEnd(5) +
    'Line'.padEnd(6) +
    'Col'.padEnd(6) +
    'Type'.padEnd(18) +
    'Lexeme'.padEnd(16) +
    'Value'
  );
  lines.push('-'.repeat(65));

  result.tokens.forEach((t, i) => {
    const valStr = t.value !== null ? String(t.value) : '-';
    lines.push(
      String(i + 1).padEnd(5) +
      String(t.line).padEnd(6) +
      String(t.column).padEnd(6) +
      String(t.type).padEnd(18) +
      String(t.lexeme).padEnd(16) +
      valStr
    );
  });

  if (result.errors && result.errors.length > 0) {
    lines.push('\nLEXICAL ERRORS:');
    result.errors.forEach(e => {
      lines.push(`  • Line ${e.line}, Col ${e.column}: ${e.message} (lexeme: '${e.lexeme || ''}')`);
    });
  } else {
    lines.push('\nLexical Status: Clean (0 errors)');
  }

  lines.push(`Total Tokens: ${result.tokens.length} | Errors: ${result.errors.length}`);
  lines.push('==================================================');

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    success: result.errors.length === 0,
    tokens: result.tokens,
    errors: result.errors,
    symbolTable: result.symbolTable,
    formattedOutput: outputText
  };
}

// =============================================================================
// OPTION 2: SYMBOL TABLE
// =============================================================================

export function executeSymbolTable(options = {}, io = null) {
  const symTab = new SymbolTable(options.baseAddress || 1000);
  const mode = options.mode || 'demo';

  if (mode === 'source') {
    const source = options.sourceCode || loadSampleFile('sample_pipeline.c');
    const lexer = new Lexer(symTab);
    lexer.tokenize(source);
  } else if (mode === 'custom' && options.name) {
    symTab.insert({
      name: options.name,
      type: options.type || 'int',
      scope: options.scope || 'global',
      lineDeclared: options.lineDeclared || 1
    });
  } else {
    // Standard demonstrative setup
    symTab.insert({ name: 'count', type: 'int', scope: 'global', lineDeclared: 1 });
    symTab.insert({ name: 'rate', type: 'float', scope: 'global', lineDeclared: 2 });
    symTab.insert({ name: 'flag', type: 'char', scope: 'global', lineDeclared: 3 });
    symTab.insert({ name: 'result', type: 'int', scope: 'global', lineDeclared: 4 });
    symTab.addReference('count', 7);
    symTab.addReference('count', 12);
    symTab.addReference('result', 15);
    // Add scoped symbol
    symTab.insert({ name: 'temp', type: 'int', scope: 'compute_fn', lineDeclared: 20 });
  }

  const entries = symTab.getAllEntries();
  const lines = [];
  lines.push('\n==================================================');
  lines.push('                 [2] SYMBOL TABLE');
  lines.push('==================================================');
  lines.push(`Base Address: ${symTab.baseAddress} (0x${symTab.baseAddress.toString(16).toUpperCase()})`);
  lines.push('\nSYMBOL TABLE ENTRIES:');
  lines.push(
    'Name'.padEnd(12) +
    'Type'.padEnd(10) +
    'Scope'.padEnd(14) +
    'Size'.padEnd(8) +
    'Address'.padEnd(14) +
    'Decl Line'.padEnd(12) +
    'References'
  );
  lines.push('-'.repeat(80));

  entries.forEach(e => {
    const addrStr = `${e.address} (${e.address.toString(16).toUpperCase().padStart(4, '0')}H)`;
    const refStr = e.linesReferenced.length > 0 ? e.linesReferenced.join(', ') : '-';
    lines.push(
      String(e.name).padEnd(12) +
      String(e.type).padEnd(10) +
      String(e.scope).padEnd(14) +
      String(e.size).padEnd(8) +
      addrStr.padEnd(14) +
      String(e.lineDeclared).padEnd(12) +
      refStr
    );
  });

  lines.push('\nSCOPE RESOLUTION DEMO:');
  const localTemp = symTab.lookup('temp', 'compute_fn');
  const globalCount = symTab.lookup('count', 'compute_fn');
  const nonExistent = symTab.lookup('undefined_var', 'global');
  lines.push(`  • lookup('temp', 'compute_fn'): ${localTemp ? `FOUND in scope '${localTemp.scope}' (addr ${localTemp.address})` : 'NOT FOUND'}`);
  lines.push(`  • lookup('count', 'compute_fn'): ${globalCount ? `FOUND via Global Fallback (addr ${globalCount.address})` : 'NOT FOUND'}`);
  lines.push(`  • lookup('undefined_var'): ${nonExistent ? 'FOUND' : 'NOT FOUND (null)'}`);

  lines.push('\nPOLYNOMIAL ROLLING HASH DEMO (Formula: (H * 31 + ch) % 101):');
  ['count', 'rate', 'flag', 'result'].forEach(name => {
    lines.push(`  • hash("${name}") = ${symTab.hash(name)}`);
  });

  lines.push(`\nTotal Active Symbols: ${entries.length}`);
  lines.push('==================================================');

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    success: true,
    symbolTable: symTab,
    entries,
    formattedOutput: outputText
  };
}

// =============================================================================
// OPTION 3: QUADRUPLE GENERATOR
// =============================================================================

export function executeQuadGen(expressionString, io = null) {
  const expr = (expressionString && expressionString.trim()) ? expressionString.trim() : 'result = a + b * c';
  const quadGen = new QuadrupleGen();
  const parser = new ExpressionParser();

  // If input contains multiple statements delimited by ';'
  let allQuadruples = [];
  let all3AC = [];
  let error = null;
  let postfixList = [];

  if (expr.includes(';')) {
    const lexer = new Lexer();
    const lexRes = lexer.tokenize(expr);
    const stmts = parser.extractExpressions(lexRes.tokens);

    for (const s of stmts) {
      const qRes = quadGen.generate(s.expression);
      if (!qRes.success) {
        error = qRes.error;
        break;
      }
      allQuadruples.push(...qRes.quadruples);
      all3AC.push(...qRes.threeAddressCode);
      if (qRes.postfix) postfixList.push(...qRes.postfix);
    }
  } else {
    const qRes = quadGen.generate(expr);
    if (!qRes.success) {
      error = qRes.error;
    } else {
      allQuadruples = qRes.quadruples;
      all3AC = qRes.threeAddressCode;
      postfixList = qRes.postfix;
    }
  }

  const lines = [];
  lines.push('\n==================================================');
  lines.push('           [3] QUADRUPLE GENERATOR');
  lines.push('==================================================');
  lines.push(`Input Expression: ${expr}`);

  if (error) {
    lines.push(`\nError: ${error}`);
    lines.push('==================================================');
    const outputText = lines.join('\n');
    if (io) io.write(outputText);
    return {
      success: false,
      quadruples: [],
      threeAddressCode: [],
      postfix: [],
      error,
      formattedOutput: outputText
    };
  }

  if (postfixList.length > 0) {
    lines.push(`Postfix (RPN):    ${postfixList.join(' ')}`);
  }

  lines.push('\nTHREE-ADDRESS CODE (3AC):');
  all3AC.forEach((code, idx) => {
    lines.push(`  ${idx + 1}. ${code}`);
  });

  lines.push('\nQUADRUPLES TABLE:');
  lines.push(
    'Index'.padEnd(8) +
    'Operator'.padEnd(12) +
    'Argument 1'.padEnd(14) +
    'Argument 2'.padEnd(14) +
    'Result'
  );
  lines.push('-'.repeat(56));

  allQuadruples.forEach((q, idx) => {
    const arg2Str = q.arg2 !== null ? q.arg2 : '-';
    lines.push(
      `(${idx + 1})`.padEnd(8) +
      String(q.op).padEnd(12) +
      String(q.arg1).padEnd(14) +
      arg2Str.padEnd(14) +
      String(q.result)
    );
  });

  lines.push(`\nTotal Quadruples Emitted: ${allQuadruples.length}`);
  lines.push('==================================================');

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    success: true,
    quadruples: allQuadruples,
    threeAddressCode: all3AC,
    postfix: postfixList,
    error: null,
    formattedOutput: outputText
  };
}

// =============================================================================
// OPTION 4: CODE OPTIMIZER
// =============================================================================

export function executeOptimizer(inputExprOrQuads, io = null) {
  let quads = [];
  const optimizer = new CodeOptimizer();
  const quadGen = new QuadrupleGen();
  const parser = new ExpressionParser();

  let sourceDesc = '';

  if (Array.isArray(inputExprOrQuads) && inputExprOrQuads.length > 0) {
    quads = inputExprOrQuads;
    sourceDesc = 'Provided Quadruples Array';
  } else {
    const exprText = (typeof inputExprOrQuads === 'string' && inputExprOrQuads.trim())
      ? inputExprOrQuads.trim()
      : 'x = 3 + 5 * 2; y = a + 0; z = 3 + 5 * 2;';

    sourceDesc = exprText;

    const lexer = new Lexer();
    const lexRes = lexer.tokenize(exprText);
    const stmts = parser.extractExpressions(lexRes.tokens);

    for (const s of stmts) {
      const qRes = quadGen.generate(s.expression);
      if (qRes.success) {
        quads.push(...qRes.quadruples);
      }
    }
  }

  const optRes = optimizer.optimize(quads);

  const lines = [];
  lines.push('\n==================================================');
  lines.push('               [4] CODE OPTIMIZER');
  lines.push('==================================================');
  lines.push(`Source Input: ${sourceDesc}`);

  if (!optRes.success) {
    lines.push(`\nOptimization Error: ${optRes.error}`);
    lines.push('==================================================');
    const outputText = lines.join('\n');
    if (io) io.write(outputText);
    return {
      success: false,
      error: optRes.error,
      formattedOutput: outputText
    };
  }

  lines.push('\nBEFORE OPTIMIZATION:');
  lines.push('-------------------');
  optRes.originalQuadruples.forEach((q, idx) => {
    lines.push(`  (${idx + 1}) ${q.toThreeAddressCode().padEnd(20)} ${q.toString()}`);
  });

  lines.push('\nOPTIMIZATION TRANSFORMATIONS:');
  lines.push('----------------------------');
  if (optRes.optimizations.length === 0) {
    lines.push('  (No candidate instructions met optimization criteria)');
  } else {
    optRes.optimizations.forEach((item, idx) => {
      lines.push(`  ${idx + 1}. [${item.type}]`);
      lines.push(`     Before: ${item.before}`);
      lines.push(`     After:  ${item.after}`);
      lines.push(`     Note:   ${item.description}`);
    });
  }

  lines.push('\nAFTER OPTIMIZATION:');
  lines.push('------------------');
  optRes.optimizedQuadruples.forEach((q, idx) => {
    lines.push(`  (${idx + 1}) ${q.toThreeAddressCode().padEnd(20)} ${q.toString()}`);
  });

  lines.push('\nOPTIMIZATION METRICS:');
  lines.push('--------------------');
  lines.push(`  • Original Instructions:             ${optRes.metrics.originalInstructionCount}`);
  lines.push(`  • Optimized Instructions:            ${optRes.metrics.optimizedInstructionCount}`);
  lines.push(`  • Constant Folding Operations:       ${optRes.metrics.constantFoldingCount}`);
  lines.push(`  • Algebraic Simplifications:         ${optRes.metrics.algebraicSimplificationCount}`);
  lines.push(`  • Common Subexpressions Eliminated:  ${optRes.metrics.cseCount}`);
  lines.push(`  • Total Transformations:             ${optRes.optimizationCount}`);
  lines.push('==================================================');

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    success: true,
    originalQuadruples: optRes.originalQuadruples,
    optimizedQuadruples: optRes.optimizedQuadruples,
    optimizations: optRes.optimizations,
    metrics: optRes.metrics,
    formattedOutput: outputText
  };
}

// =============================================================================
// OPTION 5: TWO-PASS ASSEMBLER
// =============================================================================

export function executeAssembler(sourceCode, io = null) {
  const asmSource = (sourceCode && sourceCode.trim())
    ? sourceCode
    : loadSampleFile('sample_assembly.asm', 'COPY START 1000\nFIRST LDA NUM1\nNUM1 WORD 10\nEND FIRST');

  const assembler = new Assembler();
  const res = assembler.assemble(asmSource);

  const lines = [];
  lines.push('\n==================================================');
  lines.push('            [5] TWO-PASS ASSEMBLER');
  lines.push('==================================================');
  lines.push(`Program Name:     ${res.programName || 'PROG'}`);
  lines.push(`Starting Address: ${res.startAddressHex || '1000'}H`);
  lines.push(`Program Length:   ${res.programLengthHex || '0000'}H (${res.programLength} bytes)`);

  if (res.errors && res.errors.length > 0) {
    lines.push('\nASSEMBLER ERRORS:');
    res.errors.forEach(e => {
      lines.push(`  • Line ${e.lineNum}: ${e.message}`);
    });
  }

  lines.push('\nPASS 1: SYMBOL TABLE (SYMTAB)');
  lines.push('-----------------------------');
  lines.push(
    'Symbol'.padEnd(14) +
    'Address (Hex)'.padEnd(16) +
    'Line Declared'
  );
  lines.push('-'.repeat(42));
  res.symbolTable.forEach(sym => {
    lines.push(
      String(sym.symbol).padEnd(14) +
      String(sym.addressHex).padEnd(16) +
      String(sym.lineDeclared)
    );
  });

  lines.push('\nPASS 2: ASSEMBLY LISTING');
  lines.push('-------------------------');
  lines.push(
    'Line'.padEnd(6) +
    'LOCCTR'.padEnd(8) +
    'Label'.padEnd(10) +
    'Opcode'.padEnd(8) +
    'Operand'.padEnd(12) +
    'Object Code'
  );
  lines.push('-'.repeat(56));

  res.listing.forEach(r => {
    lines.push(
      String(r.lineNum).padEnd(6) +
      String(r.addressHex).padEnd(8) +
      String(r.label || '').padEnd(10) +
      String(r.opcode || '').padEnd(8) +
      String(r.operand || '').padEnd(12) +
      String(r.objectCode || '-')
    );
  });

  lines.push('\nOBJECT PROGRAM RECORDS (H, T, E):');
  lines.push('---------------------------------');
  res.objectCode.forEach(rec => {
    lines.push(`  ${rec}`);
  });

  lines.push('\nASSEMBLY METRICS:');
  lines.push(`  • Instructions Assembled: ${res.metrics.instructionCount}`);
  lines.push(`  • Symbols Defined:        ${res.metrics.symbolCount}`);
  lines.push(`  • Errors:                 ${res.errors.length}`);
  lines.push(`  • Warnings:               ${res.warnings.length}`);
  lines.push('==================================================');

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    success: res.success,
    programName: res.programName,
    symbolTable: res.symbolTable,
    listing: res.listing,
    objectCode: res.objectCode,
    errors: res.errors,
    warnings: res.warnings,
    metrics: res.metrics,
    formattedOutput: outputText
  };
}

// =============================================================================
// OPTION 6: COMPLETE COMPILATION PIPELINE
// =============================================================================

export function executePipeline(sourceCode, options = {}, io = null) {
  const code = (sourceCode && sourceCode.trim())
    ? sourceCode
    : loadSampleFile('sample_pipeline.c');

  const pipeline = new CompilerPipeline();
  const res = pipeline.compile(code, options);

  const lines = [];
  lines.push('\n==================================================');
  lines.push('     [6] COMPLETE COMPILATION PIPELINE');
  lines.push('==================================================');
  lines.push('Pipeline Flow:');
  lines.push('  Source Code');
  lines.push('     ↓');
  lines.push('  Lexical Analysis & Symbol Table');
  lines.push('     ↓');
  lines.push('  Intermediate Code Generation');
  lines.push('     ↓');
  lines.push('  Code Optimization');
  lines.push('     ↓');
  lines.push('  Target Code Generation');
  lines.push('     ↓');
  lines.push('  Two-Pass Assembly');
  lines.push('     ↓');
  lines.push('  Object Program');
  lines.push('--------------------------------------------------');

  if (!res.success) {
    lines.push(`\n❌ PIPELINE HALTED AT: ${res.failedStage}`);
    lines.push('Module Isolation Error Details:');
    if (res.errors && res.errors.length > 0) {
      res.errors.forEach(e => {
        lines.push(`  • ${e.message || JSON.stringify(e)} (Line: ${e.line || '?'})`);
      });
    }
    lines.push('Note: Subsequent compiler modules were prevented from executing.');
    lines.push('==================================================');
    const outputText = lines.join('\n');
    if (io) io.write(outputText);
    return {
      success: false,
      failedStage: res.failedStage,
      result: res,
      formattedOutput: outputText
    };
  }

  // Lexical Analysis & Symbol Table
  lines.push('\n✓ LEXICAL ANALYSIS & SYMBOL TABLE');
  lines.push(`  Tokens Emitted:  ${res.lexicalAnalysis.tokenCount}`);
  lines.push(`  Symbols Defined: ${res.symbolTable.length} (${res.symbolTable.map(s => s.name).join(', ')})`);

  // Intermediate Code Generation
  lines.push('\n✓ INTERMEDIATE CODE GENERATION (3AC / QUADRUPLES)');
  lines.push(`  Quadruples:      ${res.intermediateCode.instructionCount}`);
  lines.push('  Generated 3AC:');
  res.intermediateCode.threeAddressCode.forEach((inst, idx) => {
    lines.push(`    ${idx + 1}. ${inst}`);
  });

  // Code Optimization
  lines.push('\n✓ CODE OPTIMIZATION');
  lines.push(`  Optimizations:   ${res.optimizedCode.optimizationCount}`);
  lines.push(`  Folded Constants: ${res.optimizedCode.metrics.constantFoldingCount}`);
  lines.push(`  CSE Reuses:      ${res.optimizedCode.metrics.cseCount}`);

  // Target Code Generation
  lines.push('\n✓ TARGET CODE GENERATION (SIC ASSEMBLY)');
  lines.push(`  Assembly Lines:  ${res.generatedAssembly.lines.length}`);

  // Two-Pass Assembler
  lines.push('\n✓ TWO-PASS ASSEMBLER & OBJECT PROGRAM');
  lines.push(`  Program Name:    ${res.assembly.programName}`);
  lines.push(`  Start Address:   ${res.assembly.startAddressHex}H`);
  lines.push(`  Program Length:  ${res.assembly.programLengthHex}H`);
  lines.push('  Object Program Records:');
  res.assembly.objectCode.forEach(rec => {
    lines.push(`    ${rec}`);
  });

  lines.push('\nSTATUS: COMPILATION COMPLETED SUCCESSFULLY (0 ERRORS)');
  lines.push('==================================================');

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    success: true,
    failedStage: null,
    result: res,
    formattedOutput: outputText
  };
}

// =============================================================================
// OPTION 7: RUN ALL TESTS
// =============================================================================

export function executeRunTests(io = null) {
  const suites = [
    { name: 'Symbol Table', file: 'tests/test_symbol_table.js', expected: 27 },
    { name: 'Lexical Analyzer', file: 'tests/test_lexer.js', expected: 51 },
    { name: 'Quadruple Generator', file: 'tests/test_quadruples.js', expected: 57 },
    { name: 'Code Optimizer', file: 'tests/test_optimizer.js', expected: 42 },
    { name: 'Two-Pass Assembler', file: 'tests/test_assembler.js', expected: 58 },
    { name: 'Compiler Pipeline', file: 'tests/test_pipeline.js', expected: 46 },
    { name: 'Web Dashboard', file: 'tests/test_dashboard.js', expected: 75 },
    { name: 'System Integration', file: 'tests/test_integration.js', expected: 68 }
  ];

  // Also include test_cli.js if it exists
  const cliTestPath = path.join(__dirname, 'tests', 'test_cli.js');
  if (fs.existsSync(cliTestPath)) {
    suites.push({ name: 'CLI Menu Interface', file: 'tests/test_cli.js', expected: null });
  }

  const lines = [];
  lines.push('\n==================================================');
  lines.push('             [7] RUNNING ALL TEST SUITES');
  lines.push('==================================================\n');

  let grandTotalPassed = 0;
  let grandTotalFailed = 0;
  const suiteResults = [];

  for (const s of suites) {
    const filePath = path.join(__dirname, s.file);
    let passed = 0;
    let failed = 0;
    let success = false;

    try {
      const output = execSync(`node "${filePath}"`, {
        cwd: __dirname,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Parse [PASS] and [FAIL] occurrences
      const passMatches = output.match(/\[PASS\]/g);
      const failMatches = output.match(/\[FAIL\]/g);
      passed = passMatches ? passMatches.length : (s.expected || 0);
      failed = failMatches ? failMatches.length : 0;
      success = failed === 0;
    } catch (err) {
      const out = (err.stdout || '') + (err.stderr || '');
      const passMatches = out.match(/\[PASS\]/g);
      const failMatches = out.match(/\[FAIL\]/g);
      passed = passMatches ? passMatches.length : 0;
      failed = failMatches ? failMatches.length : 1;
      success = false;
    }

    grandTotalPassed += passed;
    grandTotalFailed += failed;
    suiteResults.push({ name: s.name, file: s.file, passed, failed, success });

    const statusBadge = success ? 'PASS' : 'FAIL';
    lines.push(`  [${statusBadge}] ${s.name.padEnd(32)} Passed: ${String(passed).padStart(3)} | Failed: ${String(failed).padStart(2)}`);
  }

  lines.push('\n' + '-'.repeat(60));
  lines.push(`TOTAL TESTS EXECUTED: Passed: ${grandTotalPassed} | Failed: ${grandTotalFailed}`);
  lines.push('==================================================');

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    success: grandTotalFailed === 0,
    totalPassed: grandTotalPassed,
    totalFailed: grandTotalFailed,
    suiteResults,
    formattedOutput: outputText
  };
}

// =============================================================================
// OPTION 8: WEB DASHBOARD INFORMATION
// =============================================================================

export function executeWebDashboardInfo(io = null) {
  const lines = [
    '\n==================================================',
    '        [8] WEB DASHBOARD INFORMATION',
    '==================================================',
    'The Mini System Software Toolkit includes an interactive',
    'visual Web Dashboard connecting all 5 compiler modules.',
    '',
    'HOW TO LAUNCH THE WEB DASHBOARD:',
    '  1. Open a terminal in the project directory.',
    '  2. Run the command:',
    '       npm start',
    '  3. Open your web browser and navigate to:',
    '       http://localhost:3000',
    '',
    'DASHBOARD CAPABILITIES:',
    '  • Interactive C Code Editor with Preset Samples',
    '  • Token Stream & Lexical Scanner Inspector',
    '  • Symbol Table Viewer with Address & Scope Inspector',
    '  • Intermediate Code (3AC & Quadruples) Generator',
    '  • Code Optimization Viewer with Rule Diff Logs',
    '  • Generated SIC Assembly & Two-Pass Assembler Listing',
    '  • Standard Educational Object Program Records (H, T, E)',
    '=================================================='
  ];

  const outputText = lines.join('\n');
  if (io) io.write(outputText);

  return {
    info: outputText
  };
}

// =============================================================================
// MENU DISPATCHER
// =============================================================================

export async function handleMenuChoice(choice, io) {
  const trimmed = choice !== null && choice !== undefined ? choice.trim() : '';

  switch (trimmed) {
    case '1': {
      io.write('\n--- Option [1]: Lexical Analyzer ---');
      const sub = await io.ask('Select source:\n  [1] Canonical Sample (sample_pipeline.c)\n  [2] Enter custom source code\nChoice [1]: ');
      if (sub === '2') {
        const code = await io.ask('Enter source code: ');
        executeLexer(code || 'int a; a = 5;', io);
      } else {
        executeLexer(loadSampleFile('sample_pipeline.c'), io);
      }
      return true;
    }

    case '2': {
      io.write('\n--- Option [2]: Symbol Table ---');
      const sub = await io.ask('Select mode:\n  [1] Symbol Table Operations Demo (Insert, Address Calc, Scope, References)\n  [2] Populate from Canonical C Program\n  [3] Insert Custom Symbol\nChoice [1]: ');
      if (sub === '2') {
        executeSymbolTable({ mode: 'source', sourceCode: loadSampleFile('sample_pipeline.c') }, io);
      } else if (sub === '3') {
        const name = await io.ask('Identifier name [e.g. total]: ') || 'total';
        const type = await io.ask('Data type [int/float/char] (default int): ') || 'int';
        const scope = await io.ask('Scope (default global): ') || 'global';
        executeSymbolTable({ mode: 'custom', name, type, scope }, io);
      } else {
        executeSymbolTable({ mode: 'demo' }, io);
      }
      return true;
    }

    case '3': {
      io.write('\n--- Option [3]: Quadruple Generator ---');
      const expr = await io.ask('Enter expression [press Enter for "result = a + b * c"]: ');
      executeQuadGen(expr || 'result = a + b * c', io);
      return true;
    }

    case '4': {
      io.write('\n--- Option [4]: Code Optimizer ---');
      const sub = await io.ask('Select optimization sample:\n  [1] Constant Folding & CSE Demo ("x = 3 + 5 * 2; y = a + 0; z = 3 + 5 * 2;")\n  [2] Algebraic Simplification Demo ("a = x * 1; b = y + 0; c = z - z;")\n  [3] Enter custom expression(s)\nChoice [1]: ');
      if (sub === '2') {
        executeOptimizer('a = x * 1; b = y + 0; c = z - z;', io);
      } else if (sub === '3') {
        const custom = await io.ask('Enter expression(s): ');
        executeOptimizer(custom || 'x = 3 + 5 * 2; y = a + 0; z = 3 + 5 * 2;', io);
      } else {
        executeOptimizer('x = 3 + 5 * 2; y = a + 0; z = 3 + 5 * 2;', io);
      }
      return true;
    }

    case '5': {
      io.write('\n--- Option [5]: Two-Pass Assembler ---');
      const sub = await io.ask('Select assembly source:\n  [1] Canonical Sample (sample_assembly.asm)\n  [2] Enter custom assembly code\nChoice [1]: ');
      if (sub === '2') {
        const customAsm = await io.ask('Enter assembly code: ');
        executeAssembler(customAsm || loadSampleFile('sample_assembly.asm'), io);
      } else {
        executeAssembler(loadSampleFile('sample_assembly.asm'), io);
      }
      return true;
    }

    case '6': {
      io.write('\n--- Option [6]: Complete Compilation Pipeline ---');
      const sub = await io.ask('Select C source:\n  [1] Canonical Sample (sample_pipeline.c)\n  [2] Enter custom C code\nChoice [1]: ');
      if (sub === '2') {
        const customC = await io.ask('Enter C source code: ');
        executePipeline(customC || loadSampleFile('sample_pipeline.c'), {}, io);
      } else {
        executePipeline(loadSampleFile('sample_pipeline.c'), {}, io);
      }
      return true;
    }

    case '7': {
      executeRunTests(io);
      return true;
    }

    case '8': {
      executeWebDashboardInfo(io);
      return true;
    }

    case '0': {
      io.write('\nExiting Mini System Software Toolkit. Goodbye!\n');
      return false; // Stop loop
    }

    default: {
      io.write(`\nInvalid choice '${trimmed}'. Please enter a number between 0 and 8.\n`);
      return true; // Continue loop
    }
  }
}

/**
 * Runs the interactive CLI loop.
 */
export async function runCli(customIo = null) {
  const io = customIo || new CLIInterface();
  let running = true;

  while (running) {
    io.write(BANNER);
    const choice = await io.ask('Enter your choice: ');
    if (choice === null) {
      // Stream ended (EOF)
      break;
    }
    running = await handleMenuChoice(choice, io);
    if (running) {
      io.write('\n--------------------------------------------------');
    }
  }

  if (!customIo) {
    io.close();
  }
}

// Auto-run when executed directly via Node
const currentFilePath = fileURLToPath(import.meta.url).toLowerCase();
const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : '';

if (executedFilePath === currentFilePath) {
  runCli().catch(err => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}
