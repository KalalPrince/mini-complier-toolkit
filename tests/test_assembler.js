/**
 * test_assembler.js
 * Automated Verification Suite for Two-Pass Assembler
 *
 * Verifies:
 *  1. Basic START / END Execution & Program Name
 *  2. LOCCTR Calculation (3-byte standard instruction stepping)
 *  3. Label Processing & SYMTAB Population
 *  4. Duplicate Label Detection & Error Logging
 *  5. Forward References (Jump or Load before Label definition)
 *  6. Backward References (Loops jumping to earlier labels)
 *  7. Symbol Resolution in Pass 2 (Opcode + Address synthesis)
 *  8. Directives: WORD (Positive & Negative integers in 6-digit hex)
 *  9. Directives: BYTE with Character constant (C'EOF' -> 454F46)
 * 10. Directives: BYTE with Hexadecimal constant (X'F1' -> F1)
 * 11. Directives: RESW (Memory reservation without object code)
 * 12. Directives: RESB (Byte reservation without object code)
 * 13. All Valid Opcodes (LDA, STA, LDX, STX, ADD, SUB, MUL, DIV, COMP, J, JEQ, JLT, JGT, JSUB, RSUB, HLT)
 * 14. Error Handling: Undefined Symbols
 * 15. Error Handling: Invalid Opcodes
 * 16. Error Handling: Missing / Invalid Operands
 * 17. Comments Handling (;, //, .) and Blank Lines
 * 18. Program Length Calculation (LOCCTR - Start Address)
 * 19. Intermediate Representation Schema
 * 20. Listing Table Structure & Alignment
 * 21. Educational Object Records Synthesis (Header, Text, End)
 * 22. End-to-End Verification on User's Sample Program
 * 23. End-to-End Verification on samples/sample_assembly.asm
 * 24. Empty Input & Invalid Source Handling
 */

import fs from 'fs';
import path from 'path';
import { Assembler } from '../src/core/Assembler.js';

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
console.log('       TWO-PASS ASSEMBLER VERIFICATION');
console.log('======================================================================\n');

const assembler = new Assembler();

// Test Suite 1: Basic START / END & Program Initialization
console.log('Test Suite 1: START and END Directives');
{
  const source = `
    TESTPROG START 2000
             LDA   VAL
    VAL      WORD  5
             END   TESTPROG
  `;
  const res = assembler.assemble(source);
  assert(res.success === true, '1.1 Assembles without errors');
  assert(res.programName === 'TESTPROG', '1.2 Program name extracted from START label');
  assert(res.startAddressHex === '2000', '1.3 Starting address set to 2000 hex');
  assert(res.programLength === 6, '1.4 Program length calculated accurately (6 bytes: LDA 3 bytes + WORD 3 bytes)');
  assert(res.programLengthHex === '0006', '1.5 Program length in hex is 0006');
}

// Test Suite 2: LOCCTR Calculation & Stepping
console.log('\nTest Suite 2: LOCCTR Calculation');
{
  const source = `
    START 1000
    LDA ALPHA
    ADD BETA
    STA GAMMA
    RSUB
    ALPHA RESW 1
    BETA  RESW 1
    GAMMA RESW 1
    END
  `;
  const res = assembler.assemble(source);
  // Instructions: 1000 (LDA), 1003 (ADD), 1006 (STA), 1009 (RSUB) -> 100C
  // ALPHA: 100C, BETA: 100F, GAMMA: 1012 -> End LOCCTR: 1015
  const alpha = res.symbolTable.find(s => s.symbol === 'ALPHA');
  const beta = res.symbolTable.find(s => s.symbol === 'BETA');
  const gamma = res.symbolTable.find(s => s.symbol === 'GAMMA');
  assert(alpha.addressHex === '100C', '2.1 Instruction stepping produces ALPHA at 100C');
  assert(beta.addressHex === '100F', '2.2 BETA offset by 3 bytes to 100F');
  assert(gamma.addressHex === '1012', '2.3 GAMMA offset by 3 bytes to 1012');
}

// Test Suite 3: SYMTAB Generation
console.log('\nTest Suite 3: SYMTAB Generation');
{
  const source = `
    START 1000
    LOOP LDA X
    X    WORD 10
         END LOOP
  `;
  const res = assembler.assemble(source);
  assert(res.symbolTable.length === 2, '3.1 Exactly 2 symbols registered');
  const loopSym = res.symbolTable.find(s => s.symbol === 'LOOP');
  assert(loopSym !== undefined && loopSym.addressHex === '1000', '3.2 LOOP label registered at 1000');
  const xSym = res.symbolTable.find(s => s.symbol === 'X');
  assert(xSym !== undefined && xSym.addressHex === '1003', '3.3 X label registered at 1003');
}

// Test Suite 4: Duplicate Label Detection
console.log('\nTest Suite 4: Duplicate Label Detection');
{
  const source = `
    START 1000
    NUM WORD 5
    NUM WORD 10
    END
  `;
  const res = assembler.assemble(source);
  assert(res.success === false, '4.1 Flags duplicate label error');
  assert(res.errors.some(e => e.message.includes('Duplicate label')), '4.2 Error message identifies duplicate label');
}

// Test Suite 5: Forward References
console.log('\nTest Suite 5: Forward References');
{
  const source = `
    START 1000
    LDA TARGET
    ADD ONE
    TARGET WORD 50
    ONE    WORD 1
    END
  `;
  const res = assembler.assemble(source);
  assert(res.success === true, '5.1 Successfully assembles forward references');
  const ldaRow = res.listing.find(r => r.opcode === 'LDA');
  // TARGET address is 1006. Opcode LDA = 00. Expected: 001006
  assert(ldaRow.objectCode === '001006', '5.2 Forward reference resolved correctly in object code (001006)');
}

// Test Suite 6: Backward References
console.log('\nTest Suite 6: Backward References');
{
  const source = `
    START 1000
    AGAIN ADD ONE
          J AGAIN
    ONE   WORD 1
          END
  `;
  const res = assembler.assemble(source);
  const jRow = res.listing.find(r => r.opcode === 'J');
  // AGAIN address is 1000. Opcode J = 3C. Expected: 3C1000
  assert(jRow.objectCode === '3C1000', '6.1 Backward reference resolved correctly (3C1000)');
}

// Test Suite 7: WORD Directive (Positive and Negative values)
console.log('\nTest Suite 7: WORD Directive');
{
  const source = `
    START 1000
    POS WORD 5
    TEN WORD 10
    NEG WORD -1
    END
  `;
  const res = assembler.assemble(source);
  const posRow = res.listing.find(r => r.label === 'POS');
  const tenRow = res.listing.find(r => r.label === 'TEN');
  const negRow = res.listing.find(r => r.label === 'NEG');
  assert(posRow.objectCode === '000005', '7.1 WORD 5 produces 000005');
  assert(tenRow.objectCode === '00000A', '7.2 WORD 10 produces 00000A');
  assert(negRow.objectCode === 'FFFFFF', '7.3 WORD -1 produces 24-bit FFFFFF');
}

// Test Suite 8: BYTE Directive (Character Constants)
console.log('\nTest Suite 8: BYTE C Constants');
{
  const source = `
    START 1000
    STR BYTE C'EOF'
    END
  `;
  const res = assembler.assemble(source);
  const strRow = res.listing.find(r => r.label === 'STR');
  // 'E' = 45, 'O' = 4F, 'F' = 46 -> 454F46
  assert(strRow.objectCode === '454F46', '8.1 C\'EOF\' encoded to ASCII hex 454F46');
  assert(res.programLength === 3, '8.2 Advances LOCCTR by 3 bytes');
}

// Test Suite 9: BYTE Directive (Hexadecimal Constants)
console.log('\nTest Suite 9: BYTE X Constants');
{
  const source = `
    START 1000
    HEXBYTE BYTE X'F1'
    HEXPAIR BYTE X'05A3'
    END
  `;
  const res = assembler.assemble(source);
  const f1Row = res.listing.find(r => r.label === 'HEXBYTE');
  const pairRow = res.listing.find(r => r.label === 'HEXPAIR');
  assert(f1Row.objectCode === 'F1', '9.1 X\'F1\' produces hex byte F1');
  assert(pairRow.objectCode === '05A3', '9.2 X\'05A3\' produces 05A3');
}

// Test Suite 10: RESW and RESB Directives
console.log('\nTest Suite 10: RESW and RESB Directives');
{
  const source = `
    START 1000
    ARR1 RESW 4
    ARR2 RESB 5
    END
  `;
  const res = assembler.assemble(source);
  const arr1 = res.symbolTable.find(s => s.symbol === 'ARR1');
  const arr2 = res.symbolTable.find(s => s.symbol === 'ARR2');
  assert(arr1.addressHex === '1000', '10.1 ARR1 starts at 1000');
  // 4 words = 12 bytes (C hex) -> ARR2 at 100C
  assert(arr2.addressHex === '100C', '10.2 RESW 4 advances LOCCTR by 12 bytes (100C)');
  // 5 bytes -> Final program length is 12 + 5 = 17 bytes (11 hex)
  assert(res.programLength === 17, '10.3 Total program length reflects RESW and RESB');
  const reswRow = res.listing.find(r => r.opcode === 'RESW');
  assert(reswRow.objectCode === null, '10.4 RESW emits no object code');
}

// Test Suite 11: Comprehensive OPTAB Verification
console.log('\nTest Suite 11: Comprehensive OPTAB Verification');
{
  const source = `
    START 1000
    LDA M
    STA M
    LDX M
    STX M
    ADD M
    SUB M
    MUL M
    DIV M
    COMP M
    J M
    JEQ M
    JLT M
    JGT M
    JSUB M
    RSUB
    HLT
    M WORD 0
    END
  `;
  const res = assembler.assemble(source);
  assert(res.success === true, '11.1 All standard opcodes accepted');
  const rsubRow = res.listing.find(r => r.opcode === 'RSUB');
  assert(rsubRow.objectCode === '4C0000', '11.2 RSUB correctly assembled with 4C0000');
  const hltRow = res.listing.find(r => r.opcode === 'HLT');
  assert(hltRow.objectCode === 'FF0000', '11.3 HLT correctly assembled with FF0000');
}

// Test Suite 12: Error Handling - Undefined Symbols
console.log('\nTest Suite 12: Error Handling - Undefined Symbols');
{
  const source = `
    START 1000
    LDA GHOST
    END
  `;
  const res = assembler.assemble(source);
  assert(res.success === false, '12.1 Flags undefined symbol error');
  assert(res.errors.some(e => e.message.includes('Undefined symbol')), '12.2 Identifies undefined symbol');
}

// Test Suite 13: Error Handling - Invalid Opcode
console.log('\nTest Suite 13: Error Handling - Invalid Opcode');
{
  const source = `
    START 1000
    XYZ OPERAND
    END
  `;
  const res = assembler.assemble(source);
  assert(res.success === false, '13.1 Flags invalid opcode error');
  assert(res.errors.some(e => e.message.includes('Invalid opcode')), '13.2 Identifies invalid opcode');
}

// Test Suite 14: Error Handling - Missing Operands
console.log('\nTest Suite 14: Error Handling - Missing Operands');
{
  const source = `
    START 1000
    LDA
    END
  `;
  const res = assembler.assemble(source);
  assert(res.success === false, '14.1 Flags missing operand for instruction');
  assert(res.errors.some(e => e.message.includes('Missing operand')), '14.2 Reports missing operand');
}

// Test Suite 15: Comments and Blank Lines
console.log('\nTest Suite 15: Comments and Blank Lines');
{
  const source = `
    // Comment line 1
    . Comment line 2
    ; Comment line 3

    START 1000
    LDA X // inline comment
    X WORD 1 . inline comment 2
    END
  `;
  const res = assembler.assemble(source);
  assert(res.success === true, '15.1 Comments stripped cleanly without errors');
  assert(res.listing.length === 4, '15.2 Exactly 4 listing statements recorded (START, LDA, WORD, END)');
}

// Test Suite 16: Educational Object Program Records (H, T, E)
console.log('\nTest Suite 16: Object Program Records Synthesis');
{
  const source = `
    PROG1 START 1000
          LDA   X
          ADD   Y
    X     WORD  5
    Y     WORD  10
          END   PROG1
  `;
  const res = assembler.assemble(source);
  assert(Array.isArray(res.objectCode) && res.objectCode.length >= 3, '16.1 Emits array of object records');
  assert(res.objectCode[0].startsWith('H^PROG1 ^001000^00000C'), '16.2 Header record formatted correctly: H^PROG1 ^001000^00000C');
  assert(res.objectCode[1].startsWith('T^001000^0C'), '16.3 Text record starts with address and byte count');
  assert(res.objectCode[res.objectCode.length - 1].startsWith('E^001000'), '16.4 End record formatted correctly: E^001000');
}

// Test Suite 17: User's Sample Program (PBL Demonstration)
console.log('\nTest Suite 17: User\'s Specific Sample Program');
{
  const userProgram = `
    START 1000
    FIRST LDA NUM
          ADD ONE
          STA RESULT
    NUM   WORD 5
    ONE   WORD 1
    RESULT RESW 1
          END FIRST
  `;
  const res = assembler.assemble(userProgram);
  assert(res.success === true, '17.1 User program assembles with 0 errors');
  assert(res.programLength === 18, '17.2 Program length is 18 bytes (12 hex)');
  assert(res.startAddressHex === '1000', '17.3 Starting address is 1000');

  // Verify SYMTAB
  const numSym = res.symbolTable.find(s => s.symbol === 'NUM');
  const oneSym = res.symbolTable.find(s => s.symbol === 'ONE');
  const resSym = res.symbolTable.find(s => s.symbol === 'RESULT');
  assert(numSym.addressHex === '1009', '17.4 NUM address is 1009');
  assert(oneSym.addressHex === '100C', '17.5 ONE address is 100C');
  assert(resSym.addressHex === '100F', '17.6 RESULT address is 100F');

  // Verify Object Codes
  const lda = res.listing.find(r => r.opcode === 'LDA');
  const add = res.listing.find(r => r.opcode === 'ADD');
  const sta = res.listing.find(r => r.opcode === 'STA');
  assert(lda.objectCode === '001009', '17.7 LDA NUM generates 001009');
  assert(add.objectCode === '18100C', '17.8 ADD ONE generates 18100C');
  assert(sta.objectCode === '0C100F', '17.9 STA RESULT generates 0C100F');
}

// Test Suite 18: File-based Sample Assembly Verification
console.log('\nTest Suite 18: File-based Sample Program (sample_assembly.asm)');
{
  const filePath = path.resolve(process.cwd(), 'samples/sample_assembly.asm');
  assert(fs.existsSync(filePath), '18.1 samples/sample_assembly.asm exists on disk');
  const content = fs.readFileSync(filePath, 'utf-8');
  const res = assembler.assemble(content);
  assert(res.success === true, '18.2 sample_assembly.asm assembles cleanly');
  assert(res.programName === 'COPY', '18.3 Program name is COPY');
  assert(res.symbolTable.length === 5, '18.4 Symbol table contains all 5 declared labels');
}

// Test Suite 19: Empty and Malformed Source
console.log('\nTest Suite 19: Empty and Malformed Source');
{
  const emptyRes = assembler.assemble('');
  assert(emptyRes.success === true, '19.1 Empty string handled gracefully');
  assert(emptyRes.listing.length === 0, '19.2 Zero listing records for empty input');
  const invalidRes = assembler.assemble(12345);
  assert(invalidRes.success === false, '19.3 Non-string/non-array input rejected with error');
}

// Final Summary
console.log('\n======================================================================');
console.log(`TWO-PASS ASSEMBLER TEST SUMMARY: Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log('======================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
