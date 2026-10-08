/**
 * CompilerPipeline.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Master Integration Pipeline orchestrating core modules:
 *   1. Lexical Analysis
 *   2. Symbol Table
 *   3. Intermediate Code Generation (Quadruples / 3AC)
 *   4. Code Optimization (Constant Folding, CSE, Simplification)
 *   5. Target Code Generation & Two-Pass Assembler
 */

import { SymbolTable } from './SymbolTable.js';
import { Lexer } from './Lexer.js';
import { ExpressionParser } from './ExpressionParser.js';
import { QuadrupleGen } from './QuadrupleGen.js';
import { CodeOptimizer } from './CodeOptimizer.js';
import { CodeGenerator } from './CodeGenerator.js';
import { Assembler } from './Assembler.js';

export class CompilerPipeline {
  constructor() {
    this.expressionParser = new ExpressionParser();
    this.quadGen = new QuadrupleGen();
    this.optimizer = new CodeOptimizer();
    this.codeGen = new CodeGenerator();
    this.assembler = new Assembler();
  }

  /**
   * Compiles high-level source code through the complete system software pipeline.
   *
   * @param {string} sourceCode - High-level language statements
   * @param {Object} [options={}] - Compiler options (e.g. programName, startAddress)
   * @returns {Object} Comprehensive compilation artifacts across all modules
   */
  compile(sourceCode, options = {}) {
    if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
      return {
        success: false,
        failedStage: 'Input',
        errors: [{ stage: 'Input', message: 'Source code cannot be empty.' }]
      };
    }

    // =========================================================================
    // MODULES 1 & 2: Lexical Analysis & Symbol Table
    // =========================================================================
    const symtab = new SymbolTable();
    const lexer = new Lexer(symtab);
    const lexResult = lexer.tokenize(sourceCode);

    if (lexResult.errors && lexResult.errors.length > 0) {
      return {
        success: false,
        failedStage: 'Lexical Analysis',
        source: sourceCode,
        lexicalAnalysis: {
          tokens: lexResult.tokens,
          tokenCount: lexResult.tokens.length,
          errors: lexResult.errors
        },
        symbolTable: symtab.getAllEntries(),
        intermediateCode: null,
        optimizedCode: null,
        generatedAssembly: null,
        assembly: null,
        errors: lexResult.errors
      };
    }

    // =========================================================================
    // MODULE 3: Expression Parsing & Intermediate Code Generation (Quadruples)
    // =========================================================================
    const expressions = this.expressionParser.extractExpressions(lexResult.tokens);
    const allQuadruples = [];
    const intermediate3AC = [];

    for (const exprItem of expressions) {
      const qRes = this.quadGen.generate(exprItem.expression);
      if (!qRes.success) {
        return {
          success: false,
          failedStage: 'Intermediate Code Generation',
          source: sourceCode,
          lexicalAnalysis: {
            tokens: lexResult.tokens,
            tokenCount: lexResult.tokens.length,
            errors: []
          },
          symbolTable: symtab.getAllEntries(),
          intermediateCode: null,
          optimizedCode: null,
          generatedAssembly: null,
          assembly: null,
          errors: [{ stage: 'Intermediate Code Generation', message: qRes.error, line: exprItem.line }]
        };
      }
      allQuadruples.push(...qRes.quadruples);
      intermediate3AC.push(...qRes.threeAddressCode);
    }

    // =========================================================================
    // MODULE 4: Machine-Independent Code Optimization
    // =========================================================================
    let optResult = {
      success: true,
      originalQuadruples: allQuadruples,
      optimizedQuadruples: allQuadruples,
      original3AC: intermediate3AC,
      optimized3AC: intermediate3AC,
      optimizations: [],
      optimizationCount: 0,
      metrics: {
        originalInstructionCount: allQuadruples.length,
        optimizedInstructionCount: allQuadruples.length,
        constantFoldingCount: 0,
        algebraicSimplificationCount: 0,
        cseCount: 0
      }
    };

    if (allQuadruples.length > 0) {
      optResult = this.optimizer.optimize(allQuadruples);
    }

    // =========================================================================
    // MODULE 5: Target Code Generation & Two-Pass Assembly
    // =========================================================================
    const quadsToTranslate =
      optResult.success && optResult.optimizedQuadruples.length > 0
        ? optResult.optimizedQuadruples
        : allQuadruples;

    const genResult = this.codeGen.generateAssembly(
      quadsToTranslate,
      symtab.getAllEntries(),
      options
    );

    const asmResult = this.assembler.assemble(genResult.assemblySource);

    if (asmResult.errors && asmResult.errors.length > 0) {
      return {
        success: false,
        failedStage: 'Assembly',
        source: sourceCode,
        lexicalAnalysis: {
          tokens: lexResult.tokens,
          tokenCount: lexResult.tokens.length,
          errors: []
        },
        symbolTable: symtab.getAllEntries(),
        intermediateCode: {
          quadruples: allQuadruples,
          threeAddressCode: intermediate3AC,
          instructionCount: allQuadruples.length
        },
        optimizedCode: {
          quadruples: optResult.optimizedQuadruples,
          threeAddressCode: optResult.optimized3AC,
          optimizations: optResult.optimizations,
          optimizationCount: optResult.optimizationCount,
          metrics: optResult.metrics
        },
        generatedAssembly: {
          source: genResult.assemblySource,
          lines: genResult.lines
        },
        assembly: asmResult,
        errors: asmResult.errors
      };
    }

    return {
      success: true,
      source: sourceCode,
      lexicalAnalysis: {
        tokens: lexResult.tokens,
        tokenCount: lexResult.tokens.length,
        errors: []
      },
      symbolTable: symtab.getAllEntries(),
      intermediateCode: {
        quadruples: allQuadruples,
        threeAddressCode: intermediate3AC,
        instructionCount: allQuadruples.length
      },
      optimizedCode: {
        quadruples: optResult.optimizedQuadruples,
        threeAddressCode: optResult.optimized3AC,
        optimizations: optResult.optimizations,
        optimizationCount: optResult.optimizationCount,
        metrics: optResult.metrics
      },
      generatedAssembly: {
        source: genResult.assemblySource,
        lines: genResult.lines
      },
      assembly: {
        programName: asmResult.programName,
        startAddressHex: asmResult.startAddressHex,
        programLengthHex: asmResult.programLengthHex,
        intermediateTable: asmResult.intermediateCode,
        symbolTable: asmResult.symbolTable,
        listing: asmResult.listing,
        objectCode: asmResult.objectCode,
        errors: asmResult.errors,
        warnings: asmResult.warnings,
        metrics: asmResult.metrics
      },
      errors: []
    };
  }
}
