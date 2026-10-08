/**
 * app.js
 * Mini System Software Toolkit (BE05000261)
 *
 * Front-end Application Controller integrating the Compiler Pipeline
 * with the interactive Educational Dashboard.
 */

import { CompilerPipeline } from './src/core/CompilerPipeline.js';

// =============================================================================
// PRESET SAMPLE PROGRAMS
// =============================================================================
export const SAMPLE_PRESETS = {
  pipeline: `// Sample Program for End-to-End System Software Pipeline
int a;
int b;
int c;
int result;

a = 5;
b = 10;
c = 2;
result = a + b * c;`,

  complex: `// Complex Arithmetic with Operator Precedence & Parentheses
int x;
int y;
int z;
int total;

x = 10;
y = 20;
z = 5;
total = (x + y) * (z + 2);`,

  algebraic: `// Algebraic Simplifications (x + 0, x * 1, x * 0)
int base;
int temp1;
int temp2;
int temp3;

base = 42;
temp1 = base + 0;
temp2 = temp1 * 1;
temp3 = temp2 * 0;`,

  cse: `// Common Subexpression Elimination (CSE)
int a;
int b;
int r1;
int r2;

a = 15;
b = 25;
r1 = a + b;
r2 = a + b;`,

  lexError: `// Lexical Error Demonstration
int total;
total = 10 @ 5;`,

  exprError: `// Intermediate Code Error Demonstration
int value;
value = * + 10;`
};

// =============================================================================
// UI CONTROLLER CLASS
// =============================================================================
export class UIController {
  constructor(pipeline = new CompilerPipeline()) {
    this.pipeline = pipeline;
    this.currentResult = null;
    this.allTokens = [];
  }

  /**
   * Compiles the given source program and updates execution metrics.
   *
   * @param {string} sourceCode - High-level source code
   * @param {Object} options - Compilation options (programName, startAddress)
   * @returns {Object} Compilation results
   */
  runCompilation(sourceCode, options = {}) {
    const startTime = performance ? performance.now() : Date.now();
    const result = this.pipeline.compile(sourceCode, options);
    const endTime = performance ? performance.now() : Date.now();
    result.executionDurationMs = Math.round((endTime - startTime) * 100) / 100;
    this.currentResult = result;
    if (result.lexicalAnalysis && result.lexicalAnalysis.tokens) {
      this.allTokens = result.lexicalAnalysis.tokens;
    } else {
      this.allTokens = [];
    }
    return result;
  }

  /**
   * Resets internal compilation state.
   */
  resetState() {
    this.currentResult = null;
    this.allTokens = [];
  }

  /**
   * Filters token list by query.
   *
   * @param {string} query - Filter query
   * @returns {Array} Filtered tokens
   */
  filterTokens(query) {
    if (!query || !query.trim()) return this.allTokens;
    const q = query.trim().toLowerCase();
    return this.allTokens.filter(t =>
      (t.type && t.type.toLowerCase().includes(q)) ||
      (t.lexeme && t.lexeme.toLowerCase().includes(q)) ||
      (t.value && String(t.value).toLowerCase().includes(q))
    );
  }
}

// =============================================================================
// DOM BINDINGS & CLIENT LOGIC
// =============================================================================
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const controller = new UIController();

    // DOM Elements: Editor & Controls
    const sourceEditor = document.getElementById('sourceEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    const samplePreset = document.getElementById('samplePreset');
    const progNameInput = document.getElementById('progNameInput');
    const startAddrInput = document.getElementById('startAddrInput');
    const editorLineCount = document.getElementById('editorLineCount');
    const editorCharCount = document.getElementById('editorCharCount');

    // Buttons
    const btnCompile = document.getElementById('btnCompile');
    const btnLoadSample = document.getElementById('btnLoadSample');
    const btnClear = document.getElementById('btnClear');
    const btnCopyObject = document.getElementById('btnCopyObject');
    const btnDownloadObject = document.getElementById('btnDownloadObject');
    const btnCopyAssembly = document.getElementById('btnCopyAssembly');

    // Status Badges & Flow
    const overallBadge = document.getElementById('overallBadge');
    const statusSummaryTag = document.getElementById('statusSummaryTag');
    const stageSteps = [
      document.getElementById('stageStep1'),
      document.getElementById('stageStep2'),
      document.getElementById('stageStep3'),
      document.getElementById('stageStep4'),
      document.getElementById('stageStep5')
    ];
    const stageBadges = [
      document.getElementById('badgeStage1'),
      document.getElementById('badgeStage2'),
      document.getElementById('badgeStage3'),
      document.getElementById('badgeStage4'),
      document.getElementById('badgeStage5')
    ];

    // Metrics Summary
    const metricTokens = document.getElementById('metricTokens');
    const metricSymbols = document.getElementById('metricSymbols');
    const metricQuads = document.getElementById('metricQuads');
    const metricOpts = document.getElementById('metricOpts');
    const metricBytes = document.getElementById('metricBytes');
    const metricTime = document.getElementById('metricTime');

    // Error Banner
    const errorBanner = document.getElementById('errorBanner');
    const errorStageTitle = document.getElementById('errorStageTitle');
    const errorCountBadge = document.getElementById('errorCountBadge');
    const errorBannerContent = document.getElementById('errorBannerContent');

    // Tab Navigation & Badges
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const tabBadgeTokens = document.getElementById('tabBadgeTokens');
    const tabBadgeSymtab = document.getElementById('tabBadgeSymtab');
    const tabBadgeQuads = document.getElementById('tabBadgeQuads');
    const tabBadgeOptimizer = document.getElementById('tabBadgeOptimizer');
    const tabBadgeListing = document.getElementById('tabBadgeListing');
    const tabBadgeObject = document.getElementById('tabBadgeObject');

    // Table Bodies & Terminals
    const tokensTableBody = document.getElementById('tokensTableBody');
    const tokenSearchInput = document.getElementById('tokenSearchInput');
    const symTableBody = document.getElementById('symTableBody');
    const symtabMemoryBadge = document.getElementById('symtabMemoryBadge');
    const quadsTableBody = document.getElementById('quadsTableBody');
    const threeAddressCodeBlock = document.getElementById('threeAddressCodeBlock');
    const optBeforeBlock = document.getElementById('optBeforeBlock');
    const optAfterBlock = document.getElementById('optAfterBlock');
    const optLogTableBody = document.getElementById('optLogTableBody');
    const optReductionBadge = document.getElementById('optReductionBadge');
    const optOrigCount = document.getElementById('optOrigCount');
    const optFinalCount = document.getElementById('optFinalCount');
    const optFoldCount = document.getElementById('optFoldCount');
    const optAlgCount = document.getElementById('optAlgCount');
    const optCseCount = document.getElementById('optCseCount');
    const badgeBeforeCount = document.getElementById('badgeBeforeCount');
    const badgeAfterCount = document.getElementById('badgeAfterCount');
    const asmListingTableBody = document.getElementById('asmListingTableBody');
    const asmSymTableBody = document.getElementById('asmSymTableBody');
    const asmProgNameBadge = document.getElementById('asmProgNameBadge');
    const asmStartAddrBadge = document.getElementById('asmStartAddrBadge');
    const asmLengthBadge = document.getElementById('asmLengthBadge');
    const objectCodeBlock = document.getElementById('objectCodeBlock');
    const generatedAssemblyBlock = document.getElementById('generatedAssemblyBlock');
    const toast = document.getElementById('toast');

    // =========================================================================
    // LINE NUMBER & EDITOR SYNC
    // =========================================================================
    function updateEditorGutter() {
      const text = sourceEditor.value;
      const lines = text.split('\n');
      const count = lines.length;

      let gutterText = '';
      for (let i = 1; i <= count; i++) {
        gutterText += i + '\n';
      }
      lineNumbers.textContent = gutterText;
      editorLineCount.textContent = `Lines: ${count}`;
      editorCharCount.textContent = `Chars: ${text.length}`;
    }

    sourceEditor.addEventListener('input', updateEditorGutter);
    sourceEditor.addEventListener('scroll', () => {
      lineNumbers.scrollTop = sourceEditor.scrollTop;
    });

    // Tab key support in source textarea
    sourceEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = sourceEditor.selectionStart;
        const end = sourceEditor.selectionEnd;
        sourceEditor.value = sourceEditor.value.substring(0, start) + '    ' + sourceEditor.value.substring(end);
        sourceEditor.selectionStart = sourceEditor.selectionEnd = start + 4;
        updateEditorGutter();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        btnCompile.click();
      }
    });

    // =========================================================================
    // TABS SWITCHING
    // =========================================================================
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPanelId = btn.getAttribute('data-tab');
        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });

    // =========================================================================
    // TOAST NOTIFICATION HELPER
    // =========================================================================
    let toastTimer = null;
    function showToast(message) {
      if (toastTimer) clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.remove('hidden');
      toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
      }, 2400);
    }

    // =========================================================================
    // STAGE STATUS UPDATER
    // =========================================================================
    function setStageState(stageIndex, state, text) {
      const step = stageSteps[stageIndex];
      const badge = stageBadges[stageIndex];
      if (!step || !badge) return;

      step.classList.remove('state-success', 'state-running', 'state-error');
      badge.classList.remove('badge-idle', 'badge-running', 'badge-success', 'badge-danger');

      if (state === 'success') {
        step.classList.add('state-success');
        badge.classList.add('badge-success');
        badge.textContent = text || 'Success ✓';
      } else if (state === 'running') {
        step.classList.add('state-running');
        badge.classList.add('badge-running');
        badge.textContent = text || 'Running...';
      } else if (state === 'error') {
        step.classList.add('state-error');
        badge.classList.add('badge-danger');
        badge.textContent = text || 'Error ✗';
      } else {
        badge.classList.add('badge-idle');
        badge.textContent = text || 'Not Run';
      }
    }

    function resetAllStages() {
      for (let i = 0; i < 5; i++) {
        setStageState(i, 'idle', 'Not Run');
      }
      overallBadge.className = 'badge badge-success';
      overallBadge.textContent = 'Ready';
      statusSummaryTag.textContent = 'Ready to Compile';
      errorBanner.classList.add('hidden');
    }

    // =========================================================================
    // RENDER: TOKENS TABLE
    // =========================================================================
    function renderTokens(tokens) {
      tokensTableBody.innerHTML = '';
      tabBadgeTokens.textContent = tokens.length;
      if (!tokens || tokens.length === 0) {
        tokensTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No tokens found.</td></tr>';
        return;
      }

      tokens.forEach((t, idx) => {
        const tr = document.createElement('tr');
        const badgeClass = `token-${t.type || 'PUNCTUATOR'}`;
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><span class="token-badge ${badgeClass}">${escapeHtml(t.type || '')}</span></td>
          <td><strong>${escapeHtml(t.lexeme || '')}</strong></td>
          <td>${escapeHtml(String(t.value ?? ''))}</td>
          <td>${t.line ?? '—'}</td>
          <td>${t.column ?? '—'}</td>
        `;
        tokensTableBody.appendChild(tr);
      });
    }

    tokenSearchInput.addEventListener('input', () => {
      const filtered = controller.filterTokens(tokenSearchInput.value);
      renderTokens(filtered);
    });

    // =========================================================================
    // RENDER: SYMBOL TABLE
    // =========================================================================
    function renderSymbolTable(entries) {
      symTableBody.innerHTML = '';
      tabBadgeSymtab.textContent = entries.length;
      if (!entries || entries.length === 0) {
        symTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Symbol Table is empty.</td></tr>';
        symtabMemoryBadge.textContent = 'Memory: 0 Bytes';
        return;
      }

      let totalBytes = 0;
      entries.forEach(e => {
        const size = e.size || 4;
        totalBytes += size;
        const hexAddr = e.address !== undefined ? '0x' + Number(e.address).toString(16).toUpperCase() : '—';
        const refs = Array.isArray(e.linesReferenced) && e.linesReferenced.length > 0
          ? e.linesReferenced.join(', ')
          : '—';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(e.name)}</strong></td>
          <td><span class="badge badge-info">${escapeHtml(e.type || 'int')}</span></td>
          <td><span class="badge badge-neutral">${escapeHtml(e.scope || 'global')}</span></td>
          <td>${e.address} <span class="text-muted">(${hexAddr})</span></td>
          <td>${size} B</td>
          <td>${e.lineDeclared || '—'}</td>
          <td>${refs}</td>
        `;
        symTableBody.appendChild(tr);
      });
      symtabMemoryBadge.textContent = `Total Declared Memory: ${totalBytes} Bytes`;
    }

    // =========================================================================
    // RENDER: INTERMEDIATE CODE & QUADRUPLES
    // =========================================================================
    function renderIntermediateCode(inter) {
      quadsTableBody.innerHTML = '';
      if (!inter || !inter.quadruples || inter.quadruples.length === 0) {
        quadsTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">No quadruples generated.</td></tr>';
        threeAddressCodeBlock.innerHTML = '<code>// No intermediate code available.</code>';
        tabBadgeQuads.textContent = '0';
        return;
      }

      tabBadgeQuads.textContent = inter.quadruples.length;

      // Table of Quadruples
      inter.quadruples.forEach((q, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><strong class="text-accent">${escapeHtml(q.op || '')}</strong></td>
          <td>${escapeHtml(q.arg1 !== null && q.arg1 !== undefined ? String(q.arg1) : '—')}</td>
          <td>${escapeHtml(q.arg2 !== null && q.arg2 !== undefined ? String(q.arg2) : '—')}</td>
          <td><strong>${escapeHtml(q.result || '')}</strong></td>
        `;
        quadsTableBody.appendChild(tr);
      });

      // Linear 3AC Block
      if (inter.threeAddressCode && inter.threeAddressCode.length > 0) {
        const formatted3AC = inter.threeAddressCode.map((stmt, idx) => {
          return `${String(idx + 1).padStart(2, ' ')}:  ${stmt}`;
        }).join('\n');
        threeAddressCodeBlock.innerHTML = `<code>${escapeHtml(formatted3AC)}</code>`;
      } else {
        threeAddressCodeBlock.innerHTML = '<code>// No linear 3AC emitted.</code>';
      }
    }

    // =========================================================================
    // RENDER: CODE OPTIMIZATION
    // =========================================================================
    function renderOptimization(opt, inter) {
      optLogTableBody.innerHTML = '';
      if (!opt) {
        optBeforeBlock.innerHTML = '<code>// No optimization data.</code>';
        optAfterBlock.innerHTML = '<code>// No optimization data.</code>';
        tabBadgeOptimizer.textContent = '0';
        optReductionBadge.textContent = '0% Instruction Reduction';
        optOrigCount.textContent = '0';
        optFinalCount.textContent = '0';
        optFoldCount.textContent = '0';
        optAlgCount.textContent = '0';
        optCseCount.textContent = '0';
        badgeBeforeCount.textContent = '0 Instructions';
        badgeAfterCount.textContent = '0 Instructions';
        return;
      }

      const origCount = inter?.quadruples?.length || 0;
      const finalCount = opt.quadruples?.length || 0;
      const diff = origCount - finalCount;
      const pct = origCount > 0 && diff > 0 ? Math.round((diff / origCount) * 100) : 0;

      optOrigCount.textContent = origCount;
      optFinalCount.textContent = finalCount;
      optReductionBadge.textContent = `${pct}% Instruction Reduction`;
      badgeBeforeCount.textContent = `${origCount} Instructions`;
      badgeAfterCount.textContent = `${finalCount} Instructions`;

      // Metrics
      const m = opt.metrics || {};
      optFoldCount.textContent = m.constantFoldingCount || 0;
      optAlgCount.textContent = m.algebraicSimplificationCount || 0;
      optCseCount.textContent = m.cseCount || 0;
      tabBadgeOptimizer.textContent = opt.optimizationCount || 0;

      // Before & After 3AC
      const origLines = (inter?.threeAddressCode || []).map((s, i) => `${i + 1}: ${s}`).join('\n') || '// None';
      const optLines = (opt.threeAddressCode || []).map((s, i) => `${i + 1}: ${s}`).join('\n') || '// None';
      optBeforeBlock.innerHTML = `<code>${escapeHtml(origLines)}</code>`;
      optAfterBlock.innerHTML = `<code>${escapeHtml(optLines)}</code>`;

      // Log Table
      const logs = opt.optimizations || [];
      if (logs.length === 0) {
        optLogTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">No transformations required. Code is already optimal.</td></tr>';
        return;
      }

      logs.forEach((log, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><span class="badge badge-tech">${escapeHtml(log.type || '')}</span></td>
          <td><code>${escapeHtml(log.before || '')}</code></td>
          <td><code class="text-accent">${escapeHtml(log.after || '')}</code></td>
          <td class="text-muted">${escapeHtml(log.description || '')}</td>
        `;
        optLogTableBody.appendChild(tr);
      });
    }

    // =========================================================================
    // RENDER: ASSEMBLY LISTING & SYMTAB
    // =========================================================================
    function renderAssemblyListing(assembly, genAssembly) {
      asmListingTableBody.innerHTML = '';
      asmSymTableBody.innerHTML = '';

      if (!assembly || !assembly.listing || assembly.listing.length === 0) {
        asmListingTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No listing generated.</td></tr>';
        asmSymTableBody.innerHTML = '<tr class="empty-row"><td colspan="4">No symbols resolved.</td></tr>';
        tabBadgeListing.textContent = '0';
        tabBadgeObject.textContent = '0';
        objectCodeBlock.innerHTML = '<code>// No object code available.</code>';
        generatedAssemblyBlock.innerHTML = '<code>; No assembly generated.</code>';
        return;
      }

      tabBadgeListing.textContent = assembly.listing.length;
      asmProgNameBadge.textContent = `Prog: ${assembly.programName || 'PROG'}`;
      asmStartAddrBadge.textContent = `Start: ${assembly.startAddressHex || '1000'}H`;
      asmLengthBadge.textContent = `Length: ${assembly.programLengthHex || '000000'}H`;

      // Listing rows
      assembly.listing.forEach(row => {
        const tr = document.createElement('tr');
        const objCodeFormatted = row.objectCode ? `<code class="text-success">${row.objectCode}</code>` : '<span class="text-muted">—</span>';
        tr.innerHTML = `
          <td>${row.lineNum}</td>
          <td><strong class="text-accent">${row.addressHex || '—'}</strong></td>
          <td>${row.label ? `<strong>${escapeHtml(row.label)}</strong>` : ''}</td>
          <td><span class="badge badge-neutral">${escapeHtml(row.opcode || '')}</span></td>
          <td>${escapeHtml(row.operand || '')}</td>
          <td>${objCodeFormatted}</td>
        `;
        asmListingTableBody.appendChild(tr);
      });

      // Assembler SYMTAB rows
      const symList = assembly.symbolTable || [];
      if (Array.isArray(symList) && symList.length > 0) {
        symList.forEach(s => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${escapeHtml(s.symbol || '')}</strong></td>
            <td><code class="text-accent">${s.addressHex || ''}</code></td>
            <td>${s.address ?? ''}</td>
            <td>${s.lineDeclared ?? '—'}</td>
          `;
          asmSymTableBody.appendChild(tr);
        });
      } else {
        asmSymTableBody.innerHTML = '<tr class="empty-row"><td colspan="4">No symbols in Assembler SYMTAB.</td></tr>';
      }

      // Object Program Records
      const records = assembly.objectCode || [];
      tabBadgeObject.textContent = records.length;
      if (records.length > 0) {
        objectCodeBlock.innerHTML = `<code>${escapeHtml(records.join('\n'))}</code>`;
      } else {
        objectCodeBlock.innerHTML = '<code>// No object records emitted.</code>';
      }

      // Generated Assembly Source
      if (genAssembly && genAssembly.source) {
        generatedAssemblyBlock.innerHTML = `<code>${escapeHtml(genAssembly.source)}</code>`;
      } else {
        generatedAssemblyBlock.innerHTML = '<code>; No assembly source generated.</code>';
      }
    }

    // =========================================================================
    // ERROR DISPLAY HANDLER
    // =========================================================================
    function displayErrors(failedStage, errors) {
      errorBanner.classList.remove('hidden');
      errorStageTitle.textContent = `Compilation Error • ${failedStage}`;
      errorCountBadge.textContent = `${errors.length} Error${errors.length > 1 ? 's' : ''}`;
      errorBannerContent.innerHTML = '';

      errors.forEach(err => {
        const item = document.createElement('div');
        item.className = 'error-entry';
        const loc = err.line !== undefined ? `Line ${err.line}${err.column ? ':' + err.column : ''}` : '';
        item.innerHTML = `
          ${loc ? `<span class="error-loc">[${escapeHtml(loc)}]</span>` : ''}
          <span class="error-msg">${escapeHtml(err.message || 'Unknown error occurred')}</span>
        `;
        errorBannerContent.appendChild(item);
      });

      overallBadge.className = 'badge badge-danger';
      overallBadge.textContent = 'Failed';
      statusSummaryTag.textContent = `Error at ${failedStage}`;
    }

    // =========================================================================
    // COMPILE ACTION
    // =========================================================================
    btnCompile.addEventListener('click', () => {
      const source = sourceEditor.value;
      const progName = (progNameInput.value || 'CALC').trim().toUpperCase().substring(0, 6);
      const startAddress = (startAddrInput.value || '1000').trim().toUpperCase();

      // Reset statuses
      resetAllStages();
      setStageState(0, 'running', 'Analyzing...');

      // Execute through pipeline
      const result = controller.runCompilation(source, {
        programName: progName,
        startAddress: startAddress
      });

      // Update Pipeline Execution Time
      metricTime.textContent = `${result.executionDurationMs || 0} ms`;

      // Check Failures
      if (!result.success) {
        const failedStage = result.failedStage || 'Compilation';
        displayErrors(failedStage, result.errors || []);

        if (failedStage === 'Input') {
          // Input empty error
          setStageState(0, 'error', 'Empty Input');
        } else if (failedStage === 'Lexical Analysis') {
          setStageState(0, 'error', 'Lex Error');
          renderTokens(result.lexicalAnalysis ? result.lexicalAnalysis.tokens : []);
        } else if (failedStage === 'Intermediate Code Generation') {
          setStageState(0, 'success');
          setStageState(1, 'success');
          setStageState(2, 'error', 'Expr Error');
          renderTokens(result.lexicalAnalysis ? result.lexicalAnalysis.tokens : []);
          renderSymbolTable(result.symbolTable || []);
        } else if (failedStage === 'Assembly') {
          setStageState(0, 'success');
          setStageState(1, 'success');
          setStageState(2, 'success');
          setStageState(3, 'success');
          setStageState(4, 'error', 'Asm Error');
          renderTokens(result.lexicalAnalysis ? result.lexicalAnalysis.tokens : []);
          renderSymbolTable(result.symbolTable || []);
          renderIntermediateCode(result.intermediateCode);
          renderOptimization(result.optimizedCode, result.intermediateCode);
          renderAssemblyListing(result.assembly, result.generatedAssembly);
        }
        return;
      }

      // SUCCESS: All Modules Passed!
      setStageState(0, 'success');
      setStageState(1, 'success');
      setStageState(2, 'success');
      setStageState(3, 'success');
      setStageState(4, 'success');

      overallBadge.className = 'badge badge-success';
      overallBadge.textContent = 'Success';
      statusSummaryTag.textContent = 'Compiled (All Modules Passed)';

      // Update Overview Metrics
      metricTokens.textContent = result.lexicalAnalysis?.tokenCount || 0;
      metricSymbols.textContent = result.symbolTable?.length || 0;
      metricQuads.textContent = result.intermediateCode?.instructionCount || 0;
      metricOpts.textContent = result.optimizedCode?.optimizationCount || 0;
      metricBytes.textContent = result.assembly?.programLengthHex ? `${parseInt(result.assembly.programLengthHex, 16)} B` : '—';

      // Render All Module Outputs
      renderTokens(result.lexicalAnalysis?.tokens || []);
      renderSymbolTable(result.symbolTable || []);
      renderIntermediateCode(result.intermediateCode);
      renderOptimization(result.optimizedCode, result.intermediateCode);
      renderAssemblyListing(result.assembly, result.generatedAssembly);

      showToast('Pipeline compilation completed successfully!');
    });

    // =========================================================================
    // LOAD SAMPLE PRESET ACTION
    // =========================================================================
    btnLoadSample.addEventListener('click', () => {
      const selected = samplePreset.value;
      const code = SAMPLE_PRESETS[selected] || SAMPLE_PRESETS.pipeline;
      sourceEditor.value = code;
      updateEditorGutter();
      showToast(`Loaded sample: ${samplePreset.options[samplePreset.selectedIndex].text}`);
    });

    samplePreset.addEventListener('change', () => {
      btnLoadSample.click();
    });

    // =========================================================================
    // CLEAR ACTION
    // =========================================================================
    btnClear.addEventListener('click', () => {
      sourceEditor.value = '';
      updateEditorGutter();
      controller.resetState();
      resetAllStages();

      // Reset metrics
      metricTokens.textContent = '—';
      metricSymbols.textContent = '—';
      metricQuads.textContent = '—';
      metricOpts.textContent = '—';
      metricBytes.textContent = '—';
      metricTime.textContent = '—';

      // Reset tables
      renderTokens([]);
      renderSymbolTable([]);
      renderIntermediateCode(null);
      renderOptimization(null, null);
      renderAssemblyListing(null, null);

      showToast('Editor and outputs cleared.');
    });

    // =========================================================================
    // COPY OBJECT CODE ACTION
    // =========================================================================
    btnCopyObject.addEventListener('click', () => {
      if (controller.currentResult && controller.currentResult.assembly && controller.currentResult.assembly.objectCode) {
        const text = controller.currentResult.assembly.objectCode.join('\n');
        navigator.clipboard.writeText(text).then(() => {
          showToast('Object Program copied to clipboard!');
        });
      } else {
        showToast('No Object Program to copy. Compile first.');
      }
    });

    // =========================================================================
    // DOWNLOAD OBJECT FILE ACTION (.obj)
    // =========================================================================
    btnDownloadObject.addEventListener('click', () => {
      if (controller.currentResult && controller.currentResult.assembly && controller.currentResult.assembly.objectCode) {
        const text = controller.currentResult.assembly.objectCode.join('\n');
        const progName = controller.currentResult.assembly.programName || 'PROG';
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${progName.trim()}.obj`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${progName.trim()}.obj`);
      } else {
        showToast('No Object Program to download. Compile first.');
      }
    });

    // =========================================================================
    // COPY GENERATED ASSEMBLY SOURCE ACTION
    // =========================================================================
    btnCopyAssembly.addEventListener('click', () => {
      if (controller.currentResult && controller.currentResult.generatedAssembly && controller.currentResult.generatedAssembly.source) {
        navigator.clipboard.writeText(controller.currentResult.generatedAssembly.source).then(() => {
          showToast('Generated SIC Assembly copied to clipboard!');
        });
      } else {
        showToast('No assembly source to copy. Compile first.');
      }
    });

    // =========================================================================
    // INITIALIZATION: Load default pipeline sample & trigger initial gutter
    // =========================================================================
    sourceEditor.value = SAMPLE_PRESETS.pipeline;
    updateEditorGutter();
  });
}

// Utility: HTML escape helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
