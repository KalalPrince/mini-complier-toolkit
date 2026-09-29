/**
 * test_stage1_symtab.js
 * Automated Verification Suite for Stage 1: Symbol Table
 *
 * Verifies:
 *  1. Insertion
 *  2. Automatic Address Calculation
 *  3. Duplicate Detection within the same scope
 *  4. Allowing the same identifier in different scopes
 *  5. Lookup
 *  6. Scope Resolution (Local -> Global fallback)
 *  7. Update of symbol attributes
 *  8. Reference-line tracking
 *  9. Deletion of symbol
 * 10. Clear operation
 * 11. getAllEntries() formatting
 * 12. Polynomial hash helper
 */

import { SymbolTable } from '../src/core/SymbolTable.js';
import { STATUS } from '../src/utils/Constants.js';

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
console.log('       STAGE 1 VERIFICATION: SYMBOL TABLE & CONSTANTS');
console.log('======================================================================\n');

const symTab = new SymbolTable(1000);

// Test 1: Insertion
console.log('Test Suite 1: Insertion & Storage');
const res1 = symTab.insert({ name: 'count', type: 'int', scope: 'global', lineDeclared: 1 });
assert(res1.success === true && res1.status === STATUS.SUCCESS, '1.1 Insert standard int variable');
assert(res1.entry.name === 'count' && res1.entry.type === 'int', '1.2 Entry attributes stored correctly');

// Test 2: Automatic Address Calculation
console.log('\nTest Suite 2: Automatic Address Calculation');
const res2 = symTab.insert({ name: 'rate', type: 'float', scope: 'global', lineDeclared: 2 });
const res3 = symTab.insert({ name: 'flag', type: 'char', scope: 'global', lineDeclared: 3 });
// Base is 1000:
// 'count' (int, 4 bytes) -> addr: 1000
// 'rate'  (float, 4 bytes) -> addr: 1004
// 'flag'  (char, 1 byte)  -> addr: 1008
assert(res1.entry.address === 1000, '2.1 First entry gets base address 1000');
assert(res2.entry.address === 1004, '2.2 Second entry correctly offset by 4 bytes (1004)');
assert(res3.entry.address === 1008, '2.3 Third entry correctly offset by 4 bytes (1008)');

// Test 3: Duplicate Detection in Same Scope
console.log('\nTest Suite 3: Duplicate Detection');
const dupRes = symTab.insert({ name: 'count', type: 'int', scope: 'global', lineDeclared: 4 });
assert(dupRes.success === false, '3.1 Rejects duplicate declaration in same scope');
assert(dupRes.status === STATUS.DUPLICATE_SYMBOL, '3.2 Returns DUPLICATE_SYMBOL status code');

// Test 4: Scope Isolation (Same Identifier in Different Scope)
console.log('\nTest Suite 4: Scope Isolation');
const localRes = symTab.insert({ name: 'count', type: 'int', scope: 'function_main', lineDeclared: 10 });
assert(localRes.success === true, '4.1 Allows identical identifier in different scope');
assert(localRes.entry.scope === 'function_main', '4.2 Scope correctly attributed');

// Test 5: Lookup
console.log('\nTest Suite 5: Lookup');
const foundCount = symTab.lookup('count', 'global');
assert(foundCount !== null && foundCount.name === 'count', '5.1 Lookup existing global symbol');
const notFound = symTab.lookup('non_existent');
assert(notFound === null, '5.2 Returns null for non-existent symbol');

// Test 6: Scope Resolution (Local -> Global fallback)
console.log('\nTest Suite 6: Scope Resolution');
// 'rate' only exists in 'global'. When looked up from 'function_main', it should fall back to global.
const resolvedRate = symTab.lookup('rate', 'function_main');
assert(resolvedRate !== null && resolvedRate.scope === 'global', '6.1 Falls back to global when not found in local scope');

// 'count' exists in both 'function_main' and 'global'. Local lookup must return local entry.
const resolvedLocalCount = symTab.lookup('count', 'function_main');
assert(resolvedLocalCount !== null && resolvedLocalCount.scope === 'function_main', '6.2 Prefers local entry over global entry');

// Test 7: Update of Symbol Attributes
console.log('\nTest Suite 7: Update Attributes');
const updateRes = symTab.update('flag', { type: 'double', address: 2000 }, 'global');
assert(updateRes.success === true, '7.1 Update existing symbol succeeds');
const updatedFlag = symTab.lookup('flag', 'global');
assert(updatedFlag.type === 'double' && updatedFlag.size === 8 && updatedFlag.address === 2000, '7.2 Updated attributes reflected correctly');

// Test 8: Reference-Line Tracking
console.log('\nTest Suite 8: Reference-Line Tracking');
symTab.addReference('count', 12, 'global');
symTab.addReference('count', 25, 'global');
symTab.addReference('count', 12, 'global'); // Duplicate line should not be duplicated
const countEntry = symTab.lookup('count', 'global');
assert(countEntry.linesReferenced.length === 2, '8.1 Reference lines added without duplicates');
assert(countEntry.linesReferenced[0] === 12 && countEntry.linesReferenced[1] === 25, '8.2 Reference lines sorted correctly');

// Test 9: getAllEntries() Formatting
console.log('\nTest Suite 9: getAllEntries()');
const allEntries = symTab.getAllEntries();
assert(Array.isArray(allEntries) && allEntries.length === 4, '9.1 Returns all 4 active entries');
assert(allEntries.every(e => e.name && e.type && typeof e.address === 'number'), '9.2 Each entry has valid display schema');

// Test 10: Deletion
console.log('\nTest Suite 10: Deletion');
const delRes = symTab.delete('rate', 'global');
assert(delRes.success === true, '10.1 Delete existing symbol succeeds');
assert(symTab.lookup('rate', 'global') === null, '10.2 Deleted symbol is no longer in table');
const delNonExistent = symTab.delete('rate', 'global');
assert(delNonExistent.success === false && delNonExistent.status === STATUS.NOT_FOUND, '10.3 Delete non-existent symbol returns NOT_FOUND');

// Test 11: Clear Operation
console.log('\nTest Suite 11: Clear Table');
symTab.clear();
assert(symTab.getAllEntries().length === 0, '11.1 All entries removed on clear()');
assert(symTab.currentOffset === 1000, '11.2 Memory offset reset to base address');

// Test 12: Polynomial Hash Helper
console.log('\nTest Suite 12: Polynomial Hash Helper');
const hash1 = symTab.hash('variableA', 101);
const hash2 = symTab.hash('variableA', 101);
const hash3 = symTab.hash('variableB', 101);
assert(typeof hash1 === 'number' && hash1 >= 0 && hash1 < 101, '12.1 Hash produces integer in range [0, 101)');
assert(hash1 === hash2, '12.2 Hash function is deterministic');
assert(hash1 !== hash3, '12.3 Different identifiers produce different hash buckets');

// Summary
console.log('\n======================================================================');
console.log(`TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
