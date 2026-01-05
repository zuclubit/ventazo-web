/**
 * @fileoverview React Governance Provider Usage Examples
 *
 * This file demonstrates how to use the GovernanceProvider and
 * governance hooks in React applications.
 *
 * @module ui-kit/examples/governance-react
 * @version 1.0.0
 */

import React from 'react';
import type { ReactElement, FC } from 'react';
import {
  GovernanceProvider,
  useGovernance,
  useColorGovernance,
  useAccessibilityGovernance,
  useComplianceStatus,
  type GovernanceMode,
} from '../adapters/react/providers/GovernanceProvider';
import { PerceptualColor } from '../domain/perceptual/value-objects/PerceptualColor';

// ============================================================================
// EXAMPLE 1: Basic GovernanceProvider Setup
// ============================================================================

/**
 * Wrap your application with GovernanceProvider.
 *
 * The provider can be configured with:
 * - mode: 'strict' | 'lenient' | 'development'
 * - onViolation: callback for handling violations
 * - enableAudit: whether to log decisions
 */
export function AppWithGovernance({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <GovernanceProvider
      mode="strict"
      enableAudit={true}
      onViolation={(violation) => {
        console.warn('Design Governance Violation:', violation);
        // In production, you might send this to an analytics service
      }}
    >
      {children}
    </GovernanceProvider>
  );
}

// ============================================================================
// EXAMPLE 2: Using useGovernance Hook
// ============================================================================

/**
 * Access the full governance context with useGovernance.
 */
export const GovernanceStatusPanel: FC = () => {
  const {
    isCompliant,
    complianceScore,
    violations,
    warnings,
    mode,
    setMode,
  } = useGovernance();

  return (
    <div className="governance-panel">
      <h2>Governance Status</h2>

      <div className="status">
        <span className={isCompliant ? 'compliant' : 'non-compliant'}>
          {isCompliant ? '✓ Compliant' : '✗ Non-Compliant'}
        </span>
        <span className="score">{complianceScore.toFixed(0)}%</span>
      </div>

      <div className="mode-selector">
        <label>Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as GovernanceMode)}
        >
          <option value="development">Development</option>
          <option value="lenient">Lenient</option>
          <option value="strict">Strict</option>
        </select>
      </div>

      {violations.length > 0 && (
        <div className="violations">
          <h3>Violations ({violations.length})</h3>
          <ul>
            {violations.map((v, i) => (
              <li key={i} className={`severity-${v.severity}`}>
                <strong>[{v.severity}]</strong> {v.message}
                {v.suggestion && (
                  <p className="suggestion">{v.suggestion}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="warnings">
          <h3>Warnings ({warnings.length})</h3>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: Using useColorGovernance Hook
// ============================================================================

/**
 * Use useColorGovernance to validate colors in your components.
 */
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const GovernedColorInput: FC<ColorInputProps> = ({
  label,
  value,
  onChange,
}) => {
  const {
    checkColor,
    lastResult,
    isChecking,
  } = useColorGovernance();

  // Check the color on change
  const handleChange = async (newValue: string) => {
    onChange(newValue);

    // Validate the color
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      await checkColor(newValue, 'brand');
    }
  };

  const isValid = lastResult?.compliant ?? true;
  const score = lastResult?.complianceScore ?? 100;

  return (
    <div className={`color-input ${isValid ? 'valid' : 'invalid'}`}>
      <label>{label}</label>
      <div className="input-group">
        <input
          type="color"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>

      {isChecking && <span className="checking">Checking...</span>}

      {lastResult && (
        <div className="result">
          <span className="score">{score.toFixed(0)}% compliant</span>
          {!isValid && lastResult.summary.recommendations.length > 0 && (
            <ul className="recommendations">
              {lastResult.summary.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 4: Using useAccessibilityGovernance Hook
// ============================================================================

/**
 * Use useAccessibilityGovernance to validate color pairs for accessibility.
 */
interface ContrastCheckerProps {
  foreground: string;
  background: string;
  onForegroundChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
}

export const AccessibilityContrastChecker: FC<ContrastCheckerProps> = ({
  foreground,
  background,
  onForegroundChange,
  onBackgroundChange,
}) => {
  const {
    checkAccessibility,
    lastResult,
    isChecking,
  } = useAccessibilityGovernance();

  // Check accessibility when colors change
  React.useEffect(() => {
    if (
      /^#[0-9A-Fa-f]{6}$/.test(foreground) &&
      /^#[0-9A-Fa-f]{6}$/.test(background)
    ) {
      checkAccessibility(foreground, background);
    }
  }, [foreground, background, checkAccessibility]);

  const isCompliant = lastResult?.compliant ?? true;

  return (
    <div className="contrast-checker">
      <h3>Accessibility Checker</h3>

      <div className="color-pair">
        <div className="color-control">
          <label>Foreground</label>
          <input
            type="color"
            value={foreground}
            onChange={(e) => onForegroundChange(e.target.value)}
          />
        </div>
        <div className="color-control">
          <label>Background</label>
          <input
            type="color"
            value={background}
            onChange={(e) => onBackgroundChange(e.target.value)}
          />
        </div>
      </div>

      <div
        className="preview"
        style={{ color: foreground, backgroundColor: background }}
      >
        <p>The quick brown fox jumps over the lazy dog.</p>
        <small>Preview of text with current colors</small>
      </div>

      {isChecking && <p>Checking accessibility...</p>}

      {lastResult && (
        <div className={`result ${isCompliant ? 'pass' : 'fail'}`}>
          <h4>
            {isCompliant ? '✓ Passes' : '✗ Fails'} Accessibility Check
          </h4>
          <p>Score: {lastResult.complianceScore.toFixed(0)}%</p>

          {lastResult.evaluation.allViolations.length > 0 && (
            <div className="violations">
              <h5>Issues:</h5>
              <ul>
                {lastResult.evaluation.allViolations.map((v, i) => (
                  <li key={i}>
                    <strong>{v.policyName}:</strong> {v.message}
                    {v.suggestion && <p>{v.suggestion}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 5: Using useComplianceStatus Hook
// ============================================================================

/**
 * Use useComplianceStatus for a simple compliance indicator.
 */
export const ComplianceBadge: FC = () => {
  const { isCompliant, score, summary } = useComplianceStatus();

  return (
    <div
      className={`compliance-badge ${
        summary === 'pass' ? 'green' :
        summary === 'warning' ? 'yellow' : 'red'
      }`}
    >
      <span className="icon">
        {summary === 'pass' ? '✓' : summary === 'warning' ? '!' : '✗'}
      </span>
      <span className="label">
        {isCompliant ? 'Compliant' : 'Non-Compliant'}
      </span>
      <span className="score">{score.toFixed(0)}%</span>
    </div>
  );
};

// ============================================================================
// EXAMPLE 6: Complete Application Setup
// ============================================================================

/**
 * Example of a complete application with governance integration.
 */
export const CompleteGovernanceExample: FC = () => {
  const [foreground, setForeground] = React.useState('#1E293B');
  const [background, setBackground] = React.useState('#F8FAFC');
  const [brandColor, setBrandColor] = React.useState('#3B82F6');

  return (
    <GovernanceProvider mode="strict" enableAudit={true}>
      <div className="app">
        <header>
          <h1>Design Governance Demo</h1>
          <ComplianceBadge />
        </header>

        <main>
          <section>
            <h2>Brand Color</h2>
            <GovernedColorInput
              label="Primary Brand Color"
              value={brandColor}
              onChange={setBrandColor}
            />
          </section>

          <section>
            <h2>Text Accessibility</h2>
            <AccessibilityContrastChecker
              foreground={foreground}
              background={background}
              onForegroundChange={setForeground}
              onBackgroundChange={setBackground}
            />
          </section>

          <aside>
            <GovernanceStatusPanel />
          </aside>
        </main>
      </div>
    </GovernanceProvider>
  );
};

// ============================================================================
// STYLES (for reference)
// ============================================================================

/**
 * Example CSS for the governance components (add to your stylesheet):
 *
 * ```css
 * .governance-panel {
 *   padding: 1rem;
 *   background: var(--surface-primary);
 *   border-radius: 8px;
 * }
 *
 * .compliance-badge {
 *   display: inline-flex;
 *   align-items: center;
 *   gap: 0.5rem;
 *   padding: 0.25rem 0.75rem;
 *   border-radius: 9999px;
 *   font-size: 0.875rem;
 * }
 *
 * .compliance-badge.green { background: #22C55E; color: white; }
 * .compliance-badge.yellow { background: #EAB308; color: black; }
 * .compliance-badge.red { background: #EF4444; color: white; }
 *
 * .color-input.invalid input {
 *   border-color: #EF4444;
 * }
 *
 * .severity-critical { color: #DC2626; }
 * .severity-high { color: #EA580C; }
 * .severity-medium { color: #CA8A04; }
 * .severity-low { color: #65A30D; }
 * .severity-info { color: #0284C7; }
 * ```
 */

export default CompleteGovernanceExample;
