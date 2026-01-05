#!/usr/bin/env node
/**
 * Design Token Lint Script - Ventazo CRM
 *
 * Detects hardcoded colors in TypeScript/TSX files and suggests
 * CSS variable replacements following the Ventazo Design System.
 *
 * @version 1.0.0
 * @phase FASE 6 - Design Governance
 *
 * Usage:
 *   node scripts/lint-design-tokens.mjs [--fix] [--strict]
 *
 * Options:
 *   --fix     Show suggested fixes (does not auto-apply)
 *   --strict  Exit with error code 1 if violations found (for CI)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  srcDir: path.join(__dirname, '../src'),
  extensions: ['.tsx', '.ts'],
  excludeDirs: ['node_modules', '.next', 'out', '__tests__', 'test'],
  excludeFiles: ['tailwind.config.ts', 'globals.css'],
};

// Color mapping: Hardcoded hex → Suggested CSS variable
const COLOR_MAP = {
  // Teal (Primary)
  '#0D9488': 'var(--tenant-primary)',
  '#14B8A6': 'var(--tenant-primary-light)',
  '#0F766E': 'var(--tenant-primary-dark)',
  '#5EEAD4': 'var(--chart-accent)',
  '#99F6E4': 'var(--tenant-primary-muted)',

  // Status Colors
  '#22C55E': 'var(--status-completed)',
  '#16A34A': 'var(--status-completed)',
  '#EF4444': 'var(--status-cancelled)',
  '#DC2626': 'var(--urgency-overdue)',
  '#F97316': 'var(--status-pending)',
  '#FACC15': 'var(--urgency-this-week)',
  '#EAB308': 'var(--urgency-this-week)',

  // Chart Colors
  '#8B5CF6': 'var(--chart-purple)',
  '#EC4899': 'var(--chart-pink)',
  '#3B82F6': 'var(--chart-blue)',
  '#06B6D4': 'var(--chart-cyan)',

  // Neutrals (commonly hardcoded)
  '#6B7280': 'text-muted-foreground',
  '#9CA3AF': 'text-muted-foreground',
  '#6B7A7D': 'text-muted-foreground',
  '#94A3AB': 'text-muted-foreground',
  '#374151': 'text-foreground',
  '#1F2937': 'text-foreground',

  // Background variants
  '#FFFFFF': 'bg-background',
  '#F9FAFB': 'bg-muted',
  '#F3F4F6': 'bg-muted',
};

// Regex patterns for detecting hardcoded colors
const PATTERNS = {
  // Matches #RGB, #RRGGBB, #RRGGBBAA in various contexts
  hexInClassName: /className\s*=\s*[`"'{][^`"'{}]*#([0-9A-Fa-f]{3,8})[^`"'{}]*/g,
  hexInStyle: /style\s*=\s*\{\{[^}]*#([0-9A-Fa-f]{3,8})[^}]*/g,
  hexInVariable: /(const|let|var)\s+\w+\s*=\s*['"`]#([0-9A-Fa-f]{3,8})['"`]/g,
  hexInObject: /:\s*['"`]#([0-9A-Fa-f]{3,8})['"`]/g,
  hexAny: /#([0-9A-Fa-f]{6})\b/g,

  // RGBA patterns
  rgbaInCode: /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g,
};

// Statistics tracking
const stats = {
  filesScanned: 0,
  filesWithIssues: 0,
  totalViolations: 0,
  byType: {
    className: 0,
    style: 0,
    variable: 0,
    object: 0,
  },
};

// Results storage
const results = [];

/**
 * Recursively find all TypeScript/TSX files
 */
function findFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!CONFIG.excludeDirs.includes(item)) {
        findFiles(fullPath, files);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (CONFIG.extensions.includes(ext) && !CONFIG.excludeFiles.includes(item)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Extract line number from match position
 */
function getLineNumber(content, position) {
  return content.substring(0, position).split('\n').length;
}

/**
 * Analyze a single file for hardcoded colors
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(CONFIG.srcDir, filePath);
  const violations = [];

  // Find all hex colors
  const hexMatches = [...content.matchAll(PATTERNS.hexAny)];

  for (const match of hexMatches) {
    const hex = `#${match[1].toUpperCase()}`;
    const line = getLineNumber(content, match.index);
    const lineContent = content.split('\n')[line - 1];

    // Skip if it's in a comment
    if (lineContent.trim().startsWith('//') || lineContent.trim().startsWith('*')) {
      continue;
    }

    // Skip CSS variable definitions (allowed)
    if (lineContent.includes('--') && lineContent.includes(':')) {
      continue;
    }

    // Check context for classification
    let type = 'object';
    if (lineContent.includes('className')) {
      type = 'className';
      stats.byType.className++;
    } else if (lineContent.includes('style=')) {
      type = 'style';
      stats.byType.style++;
    } else if (/^(const|let|var)/.test(lineContent.trim())) {
      type = 'variable';
      stats.byType.variable++;
    } else {
      stats.byType.object++;
    }

    const suggestion = COLOR_MAP[hex] || 'var(--custom-color) or Tailwind class';

    violations.push({
      line,
      column: match.index - content.lastIndexOf('\n', match.index),
      color: hex,
      type,
      suggestion,
      lineContent: lineContent.trim().substring(0, 80),
    });

    stats.totalViolations++;
  }

  if (violations.length > 0) {
    stats.filesWithIssues++;
    results.push({
      file: relativePath,
      violations,
    });
  }

  stats.filesScanned++;
}

/**
 * Format output for terminal
 */
function formatOutput(showFix) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     VENTAZO DESIGN TOKEN LINT - Hardcoded Color Detection      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (results.length === 0) {
    console.log('✅ No hardcoded colors detected. Great job!\n');
    return;
  }

  for (const result of results) {
    console.log(`\n📁 ${result.file}`);
    console.log('─'.repeat(60));

    for (const v of result.violations) {
      const icon = v.type === 'className' ? '🎨' :
                   v.type === 'style' ? '💅' :
                   v.type === 'variable' ? '📦' : '🔧';

      console.log(`  ${icon} Line ${v.line}: ${v.color}`);
      console.log(`     Type: ${v.type}`);
      console.log(`     Code: ${v.lineContent}...`);

      if (showFix) {
        console.log(`     💡 Suggestion: Replace with ${v.suggestion}`);
      }
      console.log('');
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                           SUMMARY                              ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║  Files scanned:      ${stats.filesScanned.toString().padStart(5)}                                  ║`);
  console.log(`║  Files with issues:  ${stats.filesWithIssues.toString().padStart(5)}                                  ║`);
  console.log(`║  Total violations:   ${stats.totalViolations.toString().padStart(5)}                                  ║`);
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║  By Type:                                                      ║');
  console.log(`║    className:  ${stats.byType.className.toString().padStart(5)}                                       ║`);
  console.log(`║    style:      ${stats.byType.style.toString().padStart(5)}                                       ║`);
  console.log(`║    variable:   ${stats.byType.variable.toString().padStart(5)}                                       ║`);
  console.log(`║    object:     ${stats.byType.object.toString().padStart(5)}                                       ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  if (stats.totalViolations > 0) {
    console.log('⚠️  Run with --fix to see suggested replacements\n');
    console.log('📚 See docs/DESIGN_GOVERNANCE.md for migration guidelines\n');
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const showFix = args.includes('--fix');
  const strictMode = args.includes('--strict');

  console.log('🔍 Scanning for hardcoded colors...\n');

  const files = findFiles(CONFIG.srcDir);

  for (const file of files) {
    analyzeFile(file);
  }

  formatOutput(showFix);

  // Exit with error in strict mode if violations found
  if (strictMode && stats.totalViolations > 0) {
    console.log('❌ Strict mode: Failing due to hardcoded color violations\n');
    process.exit(1);
  }
}

main();
