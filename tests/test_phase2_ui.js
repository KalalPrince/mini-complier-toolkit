/**
 * test_phase2_ui.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Verification suite for Phase 2: Web Dashboard & UI Integration Layer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UIController, SAMPLE_PRESETS } from '../app.js';
import { CompilerPipeline } from '../src/core/CompilerPipeline.js';

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
console.log('       PHASE 2 VERIFICATION: WEB DASHBOARD & UI INTEGRATION');
console.log('======================================================================\n');

// =============================================================================
// Test Suite 1: UI File Artifacts Verification
// =============================================================================
console.log('Test Suite 1: UI File Artifacts Verification');
const htmlPath = path.join(rootDir, 'index.html');
const cssPath = path.join(rootDir, 'style.css');
const jsPath = path.join(rootDir, 'app.js');
const serverPath = path.join(rootDir, 'server.js');

assert(fs.existsSync(htmlPath), '1.1 index.html exists in workspace root');
assert(fs.existsSync(cssPath), '1.2 style.css exists in workspace root');
assert(fs.existsSync(jsPath), '1.3 app.js exists in workspace root');
assert(fs.existsSync(serverPath), '1.4 server.js static server exists');

// =============================================================================
// Test Suite 2: HTML Structure & Element IDs
// =============================================================================
console.log('\nTest Suite 2: HTML Structure & Semantic Element IDs');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const requiredIds = [
  'sourceEditor',
  'lineNumbers',
  'btnCompile',
  'btnLoadSample',
  'btnClear',
  'samplePreset',
  'progNameInput',
  'startAddrInput',
  'overallBadge',
  'statusSummaryTag',
  'stagesFlow',
  'errorBanner',
  'tabTokens',
  'tabSymtab',
  'tabQuads',
  'tabOptimizer',
  'tabListing',
  'tabObjectCode',
  'tokensTable',
  'tokensTableBody',
  'tokenSearchInput',
  'symTable',
  'symTableBody',
  'quadsTable',
  'quadsTableBody',
  'threeAddressCodeBlock',
  'optBeforeBlock',
  'optAfterBlock',
  'optLogTable',
  'asmListingTable',
  'asmListingTableBody',
  'asmSymTable',
  'asmSymTableBody',
  'objectCodeBlock',
  'btnCopyObject',
  'btnDownloadObject',
  'generatedAssemblyBlock'
];

let allIdsFound = true;
for (const id of requiredIds) {
  if (!htmlContent.includes(`id="${id}"`)) {
    allIdsFound = false;
    assert(false, `Missing critical element ID: ${id}`);
    break;
  }
}
if (allIdsFound) {
  assert(true, '2.1 All required interactive and display element IDs exist in index.html');
}

assert(htmlContent.includes('<script type="module" src="app.js"></script>'), '2.2 app.js loaded as native ES module');
assert(htmlContent.includes('rel="stylesheet" href="style.css"'), '2.3 style.css linked in document head');

// =============================================================================
// Test Suite 3: UIController Initialization & Preset Samples
// =============================================================================
console.log('\nTest Suite 3: UIController Initialization & Preset Samples');
const controller = new UIController();
assert(controller !== null, '3.1 UIController instantiated successfully');
assert(typeof controller.runCompilation === 'function', '3.2 Exposes runCompilation() method');
assert(typeof controller.resetState === 'function', '3.3 Exposes resetState() method');
assert(typeof controller.filterTokens === 'function', '3.4 Exposes filterTokens() method');

assert(Boolean(SAMPLE_PRESETS.pipeline), '3.5 Preset "pipeline" sample program available');
assert(Boolean(SAMPLE_PRESETS.complex), '3.6 Preset "complex" sample program available');
assert(Boolean(SAMPLE_PRESETS.algebraic), '3.7 Preset "algebraic" sample program available');
assert(Boolean(SAMPLE_PRESETS.cse), '3.8 Preset "cse" sample program available');
assert(Boolean(SAMPLE_PRESETS.lexError), '3.9 Preset "lexError" sample program available');
assert(Boolean(SAMPLE_PRESETS.exprError), '3.10 Preset "exprError" sample program available');

// =============================================================================
// Test Suite 4: Complete Sample Program Execution via UIController
// =============================================================================
console.log('\nTest Suite 4: Complete Sample Program Execution via UIController');
const runRes = controller.runCompilation(SAMPLE_PRESETS.pipeline, {
  programName: 'SAMPLE',
  startAddress: '1000'
});

assert(runRes.success === true, '4.1 Default pipeline sample compiles with 100% success');
assert(typeof runRes.executionDurationMs === 'number', '4.2 Execution duration recorded in ms');
assert(controller.currentResult === runRes, '4.3 Current compilation result cached in controller state');
assert(controller.allTokens.length > 0, '4.4 Controller cached token stream');

// =============================================================================
// Test Suite 5: Lexical Tokens Data Structure for UI Display
// =============================================================================
console.log('\nTest Suite 5: Lexical Tokens Data Structure for UI Display');
const tokens = runRes.lexicalAnalysis.tokens;
assert(Array.isArray(tokens) && tokens.length > 0, '5.1 Tokens array provided for UI rendering');
const firstToken = tokens[0];
assert('type' in firstToken, '5.2 Token has "type" field');
assert('lexeme' in firstToken, '5.3 Token has "lexeme" field');
assert('value' in firstToken, '5.4 Token has "value" field');
assert('line' in firstToken, '5.5 Token has "line" coordinate');
assert('column' in firstToken, '5.6 Token has "column" coordinate');

// Test Token Filter
const kwTokens = controller.filterTokens('KEYWORD');
assert(kwTokens.length > 0 && kwTokens.every(t => t.type === 'KEYWORD'), '5.7 Token filter returns matching KEYWORD entries');

// =============================================================================
// Test Suite 6: Symbol Table Data Structure for UI Display
// =============================================================================
console.log('\nTest Suite 6: Symbol Table Data Structure for UI Display');
const syms = runRes.symbolTable;
assert(Array.isArray(syms) && syms.length >= 4, '6.1 Symbol table has all 4 declared identifiers');
const symA = syms.find(s => s.name === 'a');
assert(Boolean(symA), '6.2 Symbol "a" found in table');
assert(symA.type === 'int', '6.3 Symbol "a" has type "int"');
assert(typeof symA.address === 'number', '6.4 Symbol "a" has memory address assigned');
assert(typeof symA.size === 'number', '6.5 Symbol "a" has size in bytes');
assert(typeof symA.lineDeclared === 'number', '6.6 Symbol "a" has declaration line');
assert(Array.isArray(symA.linesReferenced) && symA.linesReferenced.length > 0, '6.7 Symbol "a" has reference lines');

// =============================================================================
// Test Suite 7: Intermediate Code (3AC & Quadruples) for UI Display
// =============================================================================
console.log('\nTest Suite 7: Intermediate Code (3AC & Quadruples) for UI Display');
assert(Boolean(runRes.intermediateCode), '7.1 Intermediate code object present');
const quads = runRes.intermediateCode.quadruples;
assert(Array.isArray(quads) && quads.length > 0, '7.2 Quadruples array present');
const firstQuad = quads[0];
assert('op' in firstQuad && 'arg1' in firstQuad && 'arg2' in firstQuad && 'result' in firstQuad, '7.3 Quadruple contains standard 4-tuple fields');
const tac = runRes.intermediateCode.threeAddressCode;
assert(Array.isArray(tac) && tac.length > 0, '7.4 Human-readable 3AC array present');
assert(typeof tac[0] === 'string', '7.5 3AC instructions are formatted strings');

// =============================================================================
// Test Suite 8: Code Optimization View Data Structure
// =============================================================================
console.log('\nTest Suite 8: Code Optimization View Data Structure');
const opt = runRes.optimizedCode;
assert(Boolean(opt), '8.1 Optimization result present');
assert(Array.isArray(opt.quadruples), '8.2 Optimized quadruples array present');
assert(Array.isArray(opt.threeAddressCode), '8.3 Optimized 3AC array present');
assert(typeof opt.optimizationCount === 'number', '8.4 Optimization count reported');
assert(Array.isArray(opt.optimizations), '8.5 Detailed transformation log entries present');
if (opt.optimizations.length > 0) {
  const logItem = opt.optimizations[0];
  assert('type' in logItem && 'before' in logItem && 'after' in logItem && 'description' in logItem,
    '8.6 Optimization log entry contains type, before, after, description');
}

// =============================================================================
// Test Suite 9: Assembly Listing & Assembler SYMTAB View
// =============================================================================
console.log('\nTest Suite 9: Assembly Listing & Assembler SYMTAB View');
const asm = runRes.assembly;
assert(Boolean(asm), '9.1 Assembler result present');
assert(asm.programName === 'SAMPLE', '9.2 Program name preserved as "SAMPLE"');
assert(asm.startAddressHex === '1000', '9.3 Start address preserved as 1000H');
assert(Boolean(asm.programLengthHex), '9.4 Program length calculated');
assert(Array.isArray(asm.listing) && asm.listing.length > 0, '9.5 Assembly listing rows present');
const firstListing = asm.listing[0];
assert('lineNum' in firstListing && 'addressHex' in firstListing && 'opcode' in firstListing, '9.6 Listing row contains lineNum, addressHex, opcode');
assert(Array.isArray(asm.symbolTable), '9.7 Assembler SYMTAB present for address resolution');

// =============================================================================
// Test Suite 10: Object Program Records (H, T, E) View
// =============================================================================
console.log('\nTest Suite 10: Object Program Records (H, T, E) View');
const records = asm.objectCode;
assert(Array.isArray(records) && records.length >= 3, '10.1 Object records array contains at least 3 records');
assert(records[0].startsWith('H^'), '10.2 Header record starts with H^');
assert(records.some(r => r.startsWith('T^')), '10.3 Text record starts with T^');
assert(records[records.length - 1].startsWith('E^'), '10.4 End record starts with E^');

// =============================================================================
// Test Suite 11: Error Propagation & Handling
// =============================================================================
console.log('\nTest Suite 11: Error Propagation & Handling');
// 11.1 Lexical Error
const lexErrRes = controller.runCompilation(SAMPLE_PRESETS.lexError);
assert(lexErrRes.success === false, '11.1 Lexical error caught and marked failed');
assert(lexErrRes.failedStage === 'Lexical Analysis', '11.2 Failed stage identified as "Lexical Analysis"');
assert(lexErrRes.intermediateCode === null, '11.3 Intermediate code not generated on lexical error');
assert(lexErrRes.assembly === null, '11.4 Assembly not generated on lexical error');
assert(lexErrRes.errors.length > 0, '11.5 Error details returned with message and coordinates');

// 11.2 Expression / Syntax Error
const exprErrRes = controller.runCompilation(SAMPLE_PRESETS.exprError);
assert(exprErrRes.success === false, '11.6 Expression error caught and marked failed');
assert(exprErrRes.failedStage === 'Intermediate Code Generation', '11.7 Failed stage identified as "Intermediate Code Generation"');
assert(exprErrRes.assembly === null, '11.8 Assembly not generated on expression error');

// 11.3 Empty Input Error
const emptyRes = controller.runCompilation('   ');
assert(emptyRes.success === false, '11.9 Empty input rejected');
assert(emptyRes.failedStage === 'Input', '11.10 Failed stage identified as "Input"');

// =============================================================================
// Test Suite 12: Clear / Reset Functionality
// =============================================================================
console.log('\nTest Suite 12: Clear / Reset Functionality');
controller.resetState();
assert(controller.currentResult === null, '12.1 resetState() clears current result');
assert(controller.allTokens.length === 0, '12.2 resetState() clears cached tokens');

// =============================================================================
// Test Suite 13: Complex Expressions & Parentheses Sample
// =============================================================================
console.log('\nTest Suite 13: Complex Expressions & Parentheses Sample');
const complexRes = controller.runCompilation(SAMPLE_PRESETS.complex);
assert(complexRes.success === true, '13.1 Complex expression preset compiles cleanly');
assert(complexRes.intermediateCode.quadruples.length > 0, '13.2 Quadruples generated for parenthesized expression');
assert(complexRes.assembly.objectCode.length > 0, '13.3 Full object program generated for complex sample');

// =============================================================================
// Test Suite 14: Algebraic Simplification Preset
// =============================================================================
console.log('\nTest Suite 14: Algebraic Simplification Preset');
const algRes = controller.runCompilation(SAMPLE_PRESETS.algebraic);
assert(algRes.success === true, '14.1 Algebraic simplification preset compiles cleanly');
assert(algRes.optimizedCode.optimizationCount > 0, '14.2 Algebraic optimizations performed and logged');

// =============================================================================
// Test Suite 15: Common Subexpression Elimination Preset
// =============================================================================
console.log('\nTest Suite 15: Common Subexpression Elimination Preset');
const cseRes = controller.runCompilation(SAMPLE_PRESETS.cse);
assert(cseRes.success === true, '15.1 CSE preset compiles cleanly');

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n======================================================================');
console.log(`PHASE 2 UI TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
