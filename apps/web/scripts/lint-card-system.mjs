#!/usr/bin/env node
/**
 * Card System Lint Script - Ventazo CRM
 *
 * Validates that card components use the CARD_TOKENS system
 * and useCardInteractions hook from FASE 4.
 *
 * @version 1.0.0
 * @phase FASE 6 - Design Governance
 *
 * Usage:
 *   node scripts/lint-card-system.mjs [--fix] [--strict]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  srcDir: path.join(__dirname, '../src'),
  extensions: ['.tsx'],
  excludeDirs: ['node_modules', '.next', 'out', '__tests__'],

  // Files that should use the card system
  cardPatterns: [
    /Card\.tsx$/,
    /Card[A-Z]\w+\.tsx$/,
    /\w+Card\.tsx$/,
    /KPI\w*\.tsx$/,
    /Metric\w*\.tsx$/,
  ],

  // Files to exclude from card system enforcement
  excludeFiles: [
    'base-card.tsx',
    'entity-card.tsx',
    'card-utilities.tsx',
    'use-card-interactions.ts',
    // UI primitives
    'card.tsx',
  ],
};

// Required imports for card components
const REQUIRED_IMPORTS = {
  CARD_TOKENS: {
    from: '@/components/cards',
    severity: 'warning',
    message: 'Card component should use CARD_TOKENS for consistent styling',
  },
  useCardInteractions: {
    from: '@/components/cards',
    severity: 'info',
    message: 'Consider using useCardInteractions for consistent click/hover behavior',
  },
};

// Anti-patterns to detect
const ANTI_PATTERNS = [
  {
    pattern: /hover:shadow-\[[\w\d(),#.\s]+\]/g,
    message: 'Use CARD_TOKENS.card.interactive instead of inline hover shadow',
    severity: 'warning',
  },
  {
    pattern: /hover:-translate-y-[\d.]+/g,
    message: 'Use CARD_TOKENS.card.interactive instead of inline translate',
    severity: 'warning',
  },
  {
    pattern: /focus:ring-\[[\w\d(),#.\s]+\]/g,
    message: 'Use CARD_TOKENS.focus.ring for consistent focus states',
    severity: 'warning',
  },
  {
    pattern: /transition-all\s+duration-\d+/g,
    message: 'Use CARD_TOKENS.transitions for consistent animations',
    severity: 'info',
  },
  {
    pattern: /cursor-pointer/g,
    message: 'useCardInteractions automatically handles cursor states',
    severity: 'info',
  },
];

// Statistics
const stats = {
  filesScanned: 0,
  cardFilesFound: 0,
  filesWithIssues: 0,
  totalIssues: 0,
  bySeverity: {
    error: 0,
    warning: 0,
    info: 0,
  },
  adoption: {
    usingTokens: 0,
    usingHooks: 0,
  },
};

const results = [];

/**
 * Check if file matches card patterns
 */
function isCardFile(filename) {
  const base = path.basename(filename);

  // Exclude specific files
  if (CONFIG.excludeFiles.includes(base)) {
    return false;
  }

  // Check against patterns
  return CONFIG.cardPatterns.some((pattern) => pattern.test(base));
}

/**
 * Recursively find card files
 */
function findCardFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!CONFIG.excludeDirs.includes(item)) {
        findCardFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (CONFIG.extensions.includes(ext) && isCardFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Get line number from position
 */
function getLineNumber(content, position) {
  return content.substring(0, position).split('\n').length;
}

/**
 * Analyze imports in file
 */
function analyzeImports(content) {
  const imports = {
    hasCardTokens: false,
    hasUseCardInteractions: false,
    hasUseCardStates: false,
  };

  // Check for CARD_TOKENS import
  if (
    content.includes("import") &&
    content.includes("CARD_TOKENS") &&
    content.includes("@/components/cards")
  ) {
    imports.hasCardTokens = true;
  }

  // Check for useCardInteractions import
  if (
    content.includes("import") &&
    content.includes("useCardInteractions") &&
    content.includes("@/components/cards")
  ) {
    imports.hasUseCardInteractions = true;
  }

  // Check for useCardStates import
  if (
    content.includes("import") &&
    content.includes("useCardStates") &&
    content.includes("@/components/cards")
  ) {
    imports.hasUseCardStates = true;
  }

  return imports;
}

/**
 * Analyze a single card file
 */
function analyzeCardFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(CONFIG.srcDir, filePath);
  const issues = [];

  stats.cardFilesFound++;

  // Check imports
  const imports = analyzeImports(content);

  if (imports.hasCardTokens) {
    stats.adoption.usingTokens++;
  } else {
    issues.push({
      line: 1,
      type: 'missing-import',
      severity: 'warning',
      message: 'Missing CARD_TOKENS import from @/components/cards',
      suggestion: "import { CARD_TOKENS } from '@/components/cards';",
    });
  }

  if (imports.hasUseCardInteractions) {
    stats.adoption.usingHooks++;
  }

  // Check for anti-patterns
  for (const antiPattern of ANTI_PATTERNS) {
    const matches = [...content.matchAll(antiPattern.pattern)];

    for (const match of matches) {
      const line = getLineNumber(content, match.index);
      const lineContent = content.split('\n')[line - 1];

      // Skip if CARD_TOKENS is already used in this file
      if (imports.hasCardTokens && antiPattern.pattern.test('transition')) {
        continue;
      }

      issues.push({
        line,
        type: 'anti-pattern',
        severity: antiPattern.severity,
        message: antiPattern.message,
        code: lineContent.trim().substring(0, 60),
      });

      stats.bySeverity[antiPattern.severity]++;
      stats.totalIssues++;
    }
  }

  // Check for onClick without useCardInteractions
  if (content.includes('onClick') && !imports.hasUseCardInteractions) {
    const onClickMatch = content.match(/onClick\s*=\s*\{/);
    if (onClickMatch) {
      issues.push({
        line: getLineNumber(content, onClickMatch.index),
        type: 'missing-hook',
        severity: 'info',
        message: 'Consider using useCardInteractions for consistent click handling',
        suggestion: 'const { containerProps } = useCardInteractions({ onClick });',
      });
      stats.bySeverity.info++;
      stats.totalIssues++;
    }
  }

  if (issues.length > 0) {
    stats.filesWithIssues++;
    results.push({
      file: relativePath,
      imports,
      issues,
    });
  }

  stats.filesScanned++;
}

/**
 * Format output for terminal
 */
function formatOutput(showFix) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       VENTAZO CARD SYSTEM LINT - Token & Hook Validation       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Adoption metrics
  const tokenAdoption = stats.cardFilesFound > 0
    ? Math.round((stats.adoption.usingTokens / stats.cardFilesFound) * 100)
    : 0;
  const hookAdoption = stats.cardFilesFound > 0
    ? Math.round((stats.adoption.usingHooks / stats.cardFilesFound) * 100)
    : 0;

  console.log('📊 CARD SYSTEM ADOPTION METRICS');
  console.log('─'.repeat(60));
  console.log(`  CARD_TOKENS adoption:        ${tokenAdoption}% (${stats.adoption.usingTokens}/${stats.cardFilesFound} files)`);
  console.log(`  useCardInteractions adoption: ${hookAdoption}% (${stats.adoption.usingHooks}/${stats.cardFilesFound} files)`);

  // Visual adoption bar
  const tokenBar = '█'.repeat(Math.floor(tokenAdoption / 5)) + '░'.repeat(20 - Math.floor(tokenAdoption / 5));
  const hookBar = '█'.repeat(Math.floor(hookAdoption / 5)) + '░'.repeat(20 - Math.floor(hookAdoption / 5));
  console.log(`  [${tokenBar}] Tokens`);
  console.log(`  [${hookBar}] Hooks`);
  console.log('');

  if (results.length === 0) {
    console.log('✅ All card components follow the design system!\n');
    return;
  }

  // File details
  for (const result of results) {
    const status = result.imports.hasCardTokens ? '✅' : '⚠️';
    console.log(`\n${status} ${result.file}`);
    console.log('─'.repeat(60));

    for (const issue of result.issues) {
      const icon = issue.severity === 'error' ? '❌' :
                   issue.severity === 'warning' ? '⚠️' : 'ℹ️';

      console.log(`  ${icon} Line ${issue.line}: ${issue.message}`);

      if (issue.code) {
        console.log(`     Code: ${issue.code}...`);
      }

      if (showFix && issue.suggestion) {
        console.log(`     💡 Suggestion: ${issue.suggestion}`);
      }
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                           SUMMARY                              ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Card files scanned:   ${stats.cardFilesFound.toString().padStart(5)}                                ║`);
  console.log(`║  Files with issues:    ${stats.filesWithIssues.toString().padStart(5)}                                ║`);
  console.log(`║  Total issues:         ${stats.totalIssues.toString().padStart(5)}                                ║`);
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  By Severity:                                                  ║');
  console.log(`║    Errors:    ${stats.bySeverity.error.toString().padStart(5)}                                        ║`);
  console.log(`║    Warnings:  ${stats.bySeverity.warning.toString().padStart(5)}                                        ║`);
  console.log(`║    Info:      ${stats.bySeverity.info.toString().padStart(5)}                                        ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('📚 See docs/DESIGN_GOVERNANCE.md for migration guidelines\n');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const showFix = args.includes('--fix');
  const strictMode = args.includes('--strict');

  console.log('🔍 Scanning card components for design system compliance...\n');

  const files = findCardFiles(CONFIG.srcDir);

  for (const file of files) {
    analyzeCardFile(file);
  }

  formatOutput(showFix);

  // Exit with error in strict mode if errors found
  if (strictMode && stats.bySeverity.error > 0) {
    console.log('❌ Strict mode: Failing due to card system violations\n');
    process.exit(1);
  }
}

main();
