/**
 * @fileoverview Conformance Report Generator
 *
 * Generates human-readable reports from conformance check results.
 * Supports multiple output formats: text, markdown, JSON, and HTML.
 *
 * @module ui-kit/validation/report-generator
 * @version 1.0.0
 */

import type {
  ConformanceReport,
  ConformanceCheckResult,
  ConformanceIssue,
  ConformanceSeverity,
} from './conformance';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Report output formats.
 */
export type ReportFormat = 'text' | 'markdown' | 'json' | 'html';

/**
 * Report generation options.
 */
export interface ReportOptions {
  readonly format: ReportFormat;
  readonly includePassedChecks?: boolean;
  readonly includeSuggestions?: boolean;
  readonly includeMetadata?: boolean;
  readonly title?: string;
}

// ============================================================================
// REPORT GENERATOR
// ============================================================================

/**
 * ReportGenerator - Generates formatted conformance reports.
 *
 * @example
 * ```typescript
 * const generator = new ReportGenerator();
 *
 * const textReport = generator.generate(conformanceReport, {
 *   format: 'text',
 *   includePassedChecks: false,
 * });
 *
 * const mdReport = generator.generate(conformanceReport, {
 *   format: 'markdown',
 *   title: 'Design System Conformance Report',
 * });
 * ```
 */
export class ReportGenerator {
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a formatted report from conformance results.
   */
  generate(report: ConformanceReport, options: ReportOptions): string {
    switch (options.format) {
      case 'text':
        return this.generateTextReport(report, options);
      case 'markdown':
        return this.generateMarkdownReport(report, options);
      case 'json':
        return this.generateJsonReport(report, options);
      case 'html':
        return this.generateHtmlReport(report, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEXT FORMAT
  // ─────────────────────────────────────────────────────────────────────────

  private generateTextReport(report: ConformanceReport, options: ReportOptions): string {
    const lines: string[] = [];
    const title = options.title ?? 'UI Kit Conformance Report';

    // Header
    lines.push('═'.repeat(60));
    lines.push(this.centerText(title, 60));
    lines.push('═'.repeat(60));
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('─'.repeat(40));
    lines.push(`Timestamp:        ${report.timestamp.toISOString()}`);
    lines.push(`Version:          ${report.version}`);
    lines.push(`Total Checks:     ${report.summary.totalChecks}`);
    lines.push(`Passed:           ${report.summary.passed}`);
    lines.push(`Failed:           ${report.summary.failed}`);
    lines.push(`Errors:           ${report.summary.errors}`);
    lines.push(`Warnings:         ${report.summary.warnings}`);
    lines.push(`Compliance Score: ${report.complianceScore}%`);
    lines.push(`Overall Status:   ${report.overallPassed ? '✓ PASSED' : '✗ FAILED'}`);
    lines.push('');

    // Detailed Results
    lines.push('DETAILED RESULTS');
    lines.push('─'.repeat(40));

    for (const check of report.checks) {
      if (!options.includePassedChecks && check.passed) continue;

      const status = check.passed ? '✓' : '✗';
      lines.push(`\n${status} ${check.checkName} (${check.checkId})`);

      if (check.issues.length === 0) {
        lines.push('  No issues found');
        continue;
      }

      for (const issue of check.issues) {
        const icon = this.getSeverityIcon(issue.severity);
        lines.push(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);

        if (issue.location) {
          lines.push(`    Location: ${issue.location}`);
        }

        if (issue.details) {
          lines.push(`    Details: ${issue.details}`);
        }

        if (options.includeSuggestions && issue.suggestion) {
          lines.push(`    Suggestion: ${issue.suggestion}`);
        }
      }
    }

    // Footer
    lines.push('');
    lines.push('═'.repeat(60));
    lines.push(this.centerText('End of Report', 60));
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARKDOWN FORMAT
  // ─────────────────────────────────────────────────────────────────────────

  private generateMarkdownReport(report: ConformanceReport, options: ReportOptions): string {
    const lines: string[] = [];
    const title = options.title ?? 'UI Kit Conformance Report';

    // Header
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(`> Generated: ${report.timestamp.toISOString()}`);
    lines.push('');

    // Status Badge
    const statusBadge = report.overallPassed
      ? '![Status](https://img.shields.io/badge/Status-PASSED-green)'
      : '![Status](https://img.shields.io/badge/Status-FAILED-red)';
    lines.push(statusBadge);
    lines.push(`![Score](https://img.shields.io/badge/Score-${report.complianceScore}%25-blue)`);
    lines.push('');

    // Summary Table
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Checks | ${report.summary.totalChecks} |`);
    lines.push(`| Passed | ${report.summary.passed} |`);
    lines.push(`| Failed | ${report.summary.failed} |`);
    lines.push(`| Errors | ${report.summary.errors} |`);
    lines.push(`| Warnings | ${report.summary.warnings} |`);
    lines.push(`| Compliance Score | ${report.complianceScore}% |`);
    lines.push('');

    // Issues by Category
    lines.push('## Issues by Category');
    lines.push('');

    const byCategory = this.groupByCategory(report.checks);

    for (const [category, checks] of Object.entries(byCategory)) {
      const issues = checks.flatMap((c) => c.issues);
      if (issues.length === 0 && !options.includePassedChecks) continue;

      lines.push(`### ${this.formatCategory(category)}`);
      lines.push('');

      if (issues.length === 0) {
        lines.push('✅ All checks passed');
        lines.push('');
        continue;
      }

      for (const issue of issues) {
        const emoji = this.getSeverityEmoji(issue.severity);
        lines.push(`- ${emoji} **${issue.message}**`);

        if (issue.location) {
          lines.push(`  - Location: \`${issue.location}\``);
        }

        if (options.includeSuggestions && issue.suggestion) {
          lines.push(`  - 💡 ${issue.suggestion}`);
        }
      }

      lines.push('');
    }

    // Detailed Check Results
    lines.push('## Detailed Results');
    lines.push('');

    for (const check of report.checks) {
      if (!options.includePassedChecks && check.passed) continue;

      const statusEmoji = check.passed ? '✅' : '❌';
      lines.push(`### ${statusEmoji} ${check.checkName}`);
      lines.push('');
      lines.push(`**Check ID:** \`${check.checkId}\``);
      lines.push('');

      if (check.passed) {
        lines.push('No issues found.');
      } else {
        lines.push('| Severity | Message | Location |');
        lines.push('|----------|---------|----------|');

        for (const issue of check.issues) {
          const severity = this.getSeverityBadge(issue.severity);
          const location = issue.location ?? '-';
          lines.push(`| ${severity} | ${issue.message} | ${location} |`);
        }
      }

      if (options.includeMetadata && check.metadata) {
        lines.push('');
        lines.push('**Metadata:**');
        lines.push('```json');
        lines.push(JSON.stringify(check.metadata, null, 2));
        lines.push('```');
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // JSON FORMAT
  // ─────────────────────────────────────────────────────────────────────────

  private generateJsonReport(report: ConformanceReport, options: ReportOptions): string {
    const output: Record<string, unknown> = {
      title: options.title ?? 'UI Kit Conformance Report',
      timestamp: report.timestamp.toISOString(),
      version: report.version,
      summary: report.summary,
      overallPassed: report.overallPassed,
      complianceScore: report.complianceScore,
    };

    if (options.includePassedChecks) {
      output.checks = report.checks;
    } else {
      output.checks = report.checks.filter((c) => !c.passed);
    }

    if (options.includeMetadata) {
      output.generatedBy = '@zuclubit/ui-kit';
      output.reportFormat = 'json';
    }

    return JSON.stringify(output, null, 2);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTML FORMAT
  // ─────────────────────────────────────────────────────────────────────────

  private generateHtmlReport(report: ConformanceReport, options: ReportOptions): string {
    const title = options.title ?? 'UI Kit Conformance Report';
    const statusClass = report.overallPassed ? 'passed' : 'failed';
    const statusText = report.overallPassed ? 'PASSED' : 'FAILED';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --color-success: #22c55e;
      --color-error: #ef4444;
      --color-warning: #f59e0b;
      --color-info: #3b82f6;
      --color-bg: #0f172a;
      --color-surface: #1e293b;
      --color-text: #f1f5f9;
      --color-muted: #94a3b8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1, h2, h3 {
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2rem;
      border-bottom: 2px solid var(--color-surface);
      padding-bottom: 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .status {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: bold;
      font-size: 0.875rem;
    }

    .status.passed {
      background: var(--color-success);
      color: white;
    }

    .status.failed {
      background: var(--color-error);
      color: white;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat {
      background: var(--color-surface);
      padding: 1rem;
      border-radius: 0.5rem;
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
    }

    .stat-label {
      color: var(--color-muted);
      font-size: 0.875rem;
    }

    .score {
      background: linear-gradient(135deg, var(--color-info), #8b5cf6);
    }

    .check {
      background: var(--color-surface);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .check-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      cursor: pointer;
    }

    .check-header:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .check-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .check-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .check-status.passed {
      background: var(--color-success);
    }

    .check-status.failed {
      background: var(--color-error);
    }

    .check-body {
      padding: 0 1rem 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .issue {
      padding: 0.75rem;
      margin: 0.5rem 0;
      border-radius: 0.25rem;
      border-left: 3px solid;
    }

    .issue.error {
      background: rgba(239, 68, 68, 0.1);
      border-color: var(--color-error);
    }

    .issue.warning {
      background: rgba(245, 158, 11, 0.1);
      border-color: var(--color-warning);
    }

    .issue.info {
      background: rgba(59, 130, 246, 0.1);
      border-color: var(--color-info);
    }

    .issue-message {
      font-weight: 500;
    }

    .issue-detail {
      font-size: 0.875rem;
      color: var(--color-muted);
      margin-top: 0.25rem;
    }

    .meta {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-surface);
      font-size: 0.875rem;
      color: var(--color-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <span class="status ${statusClass}">${statusText}</span>
    </div>

    <div class="summary">
      <div class="stat score">
        <div class="stat-value">${report.complianceScore}%</div>
        <div class="stat-label">Compliance Score</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.summary.totalChecks}</div>
        <div class="stat-label">Total Checks</div>
      </div>
      <div class="stat">
        <div class="stat-value">${report.summary.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: var(--color-error)">${report.summary.errors}</div>
        <div class="stat-label">Errors</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: var(--color-warning)">${report.summary.warnings}</div>
        <div class="stat-label">Warnings</div>
      </div>
    </div>

    <h2>Check Results</h2>
    ${report.checks
      .filter((c) => options.includePassedChecks || !c.passed)
      .map((check) => this.generateHtmlCheck(check, options))
      .join('\n')}

    <div class="meta">
      <p>Generated: ${report.timestamp.toISOString()}</p>
      <p>Version: ${report.version}</p>
    </div>
  </div>
</body>
</html>`;
  }

  private generateHtmlCheck(check: ConformanceCheckResult, options: ReportOptions): string {
    const statusClass = check.passed ? 'passed' : 'failed';

    return `
    <div class="check">
      <div class="check-header">
        <div class="check-title">
          <span class="check-status ${statusClass}"></span>
          <strong>${check.checkName}</strong>
          <span style="color: var(--color-muted); font-size: 0.875rem;">(${check.checkId})</span>
        </div>
        <span style="color: var(--color-muted);">${check.issues.length} issues</span>
      </div>
      ${
        check.issues.length > 0
          ? `<div class="check-body">
          ${check.issues.map((issue) => this.generateHtmlIssue(issue, options)).join('\n')}
        </div>`
          : ''
      }
    </div>`;
  }

  private generateHtmlIssue(issue: ConformanceIssue, options: ReportOptions): string {
    return `
      <div class="issue ${issue.severity}">
        <div class="issue-message">${issue.message}</div>
        ${issue.location ? `<div class="issue-detail">Location: ${issue.location}</div>` : ''}
        ${issue.details ? `<div class="issue-detail">${issue.details}</div>` : ''}
        ${options.includeSuggestions && issue.suggestion ? `<div class="issue-detail">💡 ${issue.suggestion}</div>` : ''}
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private getSeverityIcon(severity: ConformanceSeverity): string {
    switch (severity) {
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
    }
  }

  private getSeverityEmoji(severity: ConformanceSeverity): string {
    switch (severity) {
      case 'error':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'info':
        return '🔵';
    }
  }

  private getSeverityBadge(severity: ConformanceSeverity): string {
    switch (severity) {
      case 'error':
        return '![Error](https://img.shields.io/badge/-Error-red)';
      case 'warning':
        return '![Warning](https://img.shields.io/badge/-Warning-yellow)';
      case 'info':
        return '![Info](https://img.shields.io/badge/-Info-blue)';
    }
  }

  private formatCategory(category: string): string {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private groupByCategory(checks: ConformanceCheckResult[]): Record<string, ConformanceCheckResult[]> {
    const groups: Record<string, ConformanceCheckResult[]> = {};

    for (const check of checks) {
      // Extract category from check metadata or ID
      const category = this.inferCategory(check.checkId);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(check);
    }

    return groups;
  }

  private inferCategory(checkId: string): string {
    if (checkId.includes('contrast') || checkId.includes('color-blind')) {
      return 'accessibility';
    }
    if (checkId.includes('token')) {
      return 'tokens';
    }
    if (checkId.includes('color') || checkId.includes('perceptual') || checkId.includes('gamut')) {
      return 'color-intelligence';
    }
    if (checkId.includes('dependency') || checkId.includes('port')) {
      return 'architecture';
    }
    return 'other';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ReportGenerator;
