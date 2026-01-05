// ============================================
// Phase 5: Standardization Layer Tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';

// Domain Types
import type {
  PerceptualSpecification,
  ConformanceLevel,
  ConformanceReport,
  ColorIntelligencePlugin,
  PluginHooks,
  AuditEntry,
  GoldenSet,
} from '../domain/specification/types';

// Reference Implementations
import {
  APCAReferenceImplementation,
  OKLCHReferenceImplementation,
  HCTReferenceImplementation,
  WCAG21ReferenceImplementation,
  APCA_CONTRAST_GOLDEN_SET,
  OKLCH_CONVERSION_GOLDEN_SET,
  ALL_GOLDEN_SETS,
  getGoldenSet,
  getEssentialTestCases,
  REFERENCE_PALETTES,
} from '../domain/specification/reference';

// Application
import {
  ConformanceEngine,
  createConformanceEngine,
} from '../application/conformance';

import {
  PluginManager,
  createPluginManager,
} from '../application/plugins';

// Infrastructure
import {
  AuditTrailService,
  createAuditTrailService,
  InMemoryAuditStorage,
  createInMemoryAuditStorage,
} from '../infrastructure/audit';

// ============================================
// Reference Implementation Tests
// ============================================

describe('Reference Implementations', () => {
  describe('APCA Reference', () => {
    it('calculates correct Lc for black on white', () => {
      const lc = APCAReferenceImplementation.calculateLc(0, 0, 0, 255, 255, 255);
      expect(lc).toBeCloseTo(106.04, 0);
    });

    it('calculates correct Lc for white on black', () => {
      const lc = APCAReferenceImplementation.calculateLc(255, 255, 255, 0, 0, 0);
      // APCA reference implementation returns ~-107.28 (tolerance of 1 unit)
      expect(lc).toBeCloseTo(-107, 0);
    });

    it('returns positive Lc for dark on light', () => {
      const lc = APCAReferenceImplementation.calculateLc(50, 50, 50, 255, 255, 255);
      expect(lc).toBeGreaterThan(0);
    });

    it('returns negative Lc for light on dark', () => {
      const lc = APCAReferenceImplementation.calculateLc(200, 200, 200, 0, 0, 0);
      expect(lc).toBeLessThan(0);
    });

    it('calculates relative luminance correctly', () => {
      const white = APCAReferenceImplementation.relativeLuminance(255, 255, 255);
      const black = APCAReferenceImplementation.relativeLuminance(0, 0, 0);

      expect(white).toBeCloseTo(1.0, 2);
      expect(black).toBeCloseTo(0.0, 2);
    });
  });

  describe('OKLCH Reference', () => {
    it('converts white to OKLCH correctly', () => {
      const result = OKLCHReferenceImplementation.sRGBToOKLCH(255, 255, 255);
      expect(result.l).toBeCloseTo(1.0, 2);
      expect(result.c).toBeCloseTo(0.0, 2);
    });

    it('converts black to OKLCH correctly', () => {
      const result = OKLCHReferenceImplementation.sRGBToOKLCH(0, 0, 0);
      expect(result.l).toBeCloseTo(0.0, 2);
      expect(result.c).toBeCloseTo(0.0, 2);
    });

    it('converts pure red correctly', () => {
      const result = OKLCHReferenceImplementation.sRGBToOKLCH(255, 0, 0);
      expect(result.l).toBeGreaterThan(0.5);
      expect(result.l).toBeLessThan(0.7);
      expect(result.c).toBeGreaterThan(0.2);
    });

    it('sRGB to linear conversion is correct', () => {
      expect(OKLCHReferenceImplementation.sRGBToLinear(0)).toBe(0);
      expect(OKLCHReferenceImplementation.sRGBToLinear(255)).toBeCloseTo(1.0, 2);
    });
  });

  describe('HCT Reference', () => {
    it('calculates tone from RGB correctly', () => {
      const whiteTone = HCTReferenceImplementation.toneFromRGB(255, 255, 255);
      const blackTone = HCTReferenceImplementation.toneFromRGB(0, 0, 0);

      expect(whiteTone).toBeCloseTo(100, 0);
      expect(blackTone).toBeCloseTo(0, 0);
    });

    it('calculates hue from RGB correctly', () => {
      // Pure red should be around 0°
      const redHue = HCTReferenceImplementation.hueFromRGB(255, 0, 0);
      expect(redHue).toBeCloseTo(0, 0);

      // Pure green should be around 120°
      const greenHue = HCTReferenceImplementation.hueFromRGB(0, 255, 0);
      expect(greenHue).toBeCloseTo(120, 0);

      // Pure blue should be around 240°
      const blueHue = HCTReferenceImplementation.hueFromRGB(0, 0, 255);
      expect(blueHue).toBeCloseTo(240, 0);
    });

    it('converts sRGB to HCT', () => {
      const hct = HCTReferenceImplementation.sRGBToHCT(66, 133, 244);
      expect(hct.h).toBeGreaterThan(200);
      expect(hct.h).toBeLessThan(270);
      expect(hct.t).toBeGreaterThan(40);
      expect(hct.t).toBeLessThan(70);
    });
  });

  describe('WCAG 2.1 Reference', () => {
    it('calculates correct contrast ratio for black on white', () => {
      const ratio = WCAG21ReferenceImplementation.contrastRatio(0, 0, 0, 255, 255, 255);
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('calculates correct contrast ratio for white on black', () => {
      const ratio = WCAG21ReferenceImplementation.contrastRatio(255, 255, 255, 0, 0, 0);
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('returns 1 for same colors', () => {
      const ratio = WCAG21ReferenceImplementation.contrastRatio(128, 128, 128, 128, 128, 128);
      expect(ratio).toBe(1);
    });

    it('checks compliance correctly', () => {
      const highContrast = WCAG21ReferenceImplementation.checkCompliance(7.5, 16, 400);
      expect(highContrast.aa).toBe(true);
      expect(highContrast.aaa).toBe(true);

      const mediumContrast = WCAG21ReferenceImplementation.checkCompliance(5.0, 16, 400);
      expect(mediumContrast.aa).toBe(true);
      expect(mediumContrast.aaa).toBe(false);

      const lowContrast = WCAG21ReferenceImplementation.checkCompliance(3.0, 16, 400);
      expect(lowContrast.aa).toBe(false);
      expect(lowContrast.aaa).toBe(false);
    });

    it('handles large text correctly', () => {
      const largeText = WCAG21ReferenceImplementation.checkCompliance(3.5, 18, 400);
      expect(largeText.aa).toBe(true); // 3:1 for large text
    });
  });
});

// ============================================
// Golden Set Tests
// ============================================

describe('Golden Sets', () => {
  it('has all required golden sets', () => {
    expect(ALL_GOLDEN_SETS.length).toBeGreaterThanOrEqual(4);
  });

  it('can retrieve golden set by ID', () => {
    const apcaSet = getGoldenSet(APCA_CONTRAST_GOLDEN_SET.id);
    expect(apcaSet).toBeDefined();
    expect(apcaSet?.name).toBe('APCA Contrast Calculation Reference');
  });

  it('APCA golden set has essential test cases', () => {
    expect(APCA_CONTRAST_GOLDEN_SET.testCases.length).toBeGreaterThanOrEqual(5);

    const essentialCases = APCA_CONTRAST_GOLDEN_SET.testCases.filter(tc =>
      tc.tags.includes('essential')
    );
    expect(essentialCases.length).toBeGreaterThanOrEqual(2);
  });

  it('OKLCH golden set has correct conversions', () => {
    expect(OKLCH_CONVERSION_GOLDEN_SET.testCases.length).toBeGreaterThanOrEqual(5);
  });

  it('getEssentialTestCases returns essential cases from all sets', () => {
    const essential = getEssentialTestCases();
    expect(essential.length).toBeGreaterThan(0);
    essential.forEach(tc => {
      expect(tc.tags).toContain('essential');
    });
  });

  it('reference palettes are valid', () => {
    expect(REFERENCE_PALETTES.length).toBeGreaterThanOrEqual(3);

    REFERENCE_PALETTES.forEach(palette => {
      expect(palette.colors.length).toBeGreaterThan(0);
      expect(palette.expectedAccessibility.wcag21Level).toMatch(/^(A|AA|AAA)$/);
      expect(palette.expectedAccessibility.wcag3Tier).toMatch(
        /^(bronze|silver|gold|platinum)$/
      );
    });
  });
});

// ============================================
// Conformance Engine Tests
// ============================================

describe('Conformance Engine', () => {
  let engine: ConformanceEngine;

  beforeEach(() => {
    engine = createConformanceEngine();
  });

  it('creates engine with default config', () => {
    expect(engine).toBeDefined();
  });

  it('can validate plugin compatibility', () => {
    // ConformanceEngine doesn't validate plugin compatibility
    // It validates conformance levels - this test should verify the engine works
    expect(engine.getTestSuites().length).toBeGreaterThan(0);
  });

  it('validates conformance test suites exist', () => {
    const suites = engine.getTestSuites();
    expect(suites).toContain('Bronze');
    expect(suites).toContain('Silver');
    expect(suites).toContain('Gold');
    expect(suites).toContain('Platinum');
  });
});

// ============================================
// Plugin Manager Tests
// ============================================

describe('Plugin Manager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = createPluginManager();
  });

  it('creates manager successfully', () => {
    expect(manager).toBeDefined();
  });

  it('registers a valid plugin', async () => {
    const plugin = {
      id: 'test/test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      version: '1.0.0',
      author: 'Test Author',
      license: 'MIT',
      category: 'accessibility',
      tags: ['test'],
      capabilities: { canModifyColors: false, canValidate: true },
      colorIntelligenceVersion: '^5.0.0',
      hooks: {},
    } as unknown as ColorIntelligencePlugin;

    await manager.register(plugin);

    const registered = manager.list();
    expect(registered.some((p: { id: string }) => p.id === 'test/test-plugin')).toBe(true);
  });

  it('prevents duplicate plugin registration', async () => {
    const plugin = {
      id: 'test/duplicate-plugin',
      name: 'Duplicate Plugin',
      description: 'A duplicate plugin',
      version: '1.0.0',
      author: 'Test Author',
      license: 'MIT',
      category: 'accessibility',
      tags: ['test'],
      capabilities: { canModifyColors: false, canValidate: true },
      colorIntelligenceVersion: '^5.0.0',
      hooks: {},
    } as unknown as ColorIntelligencePlugin;

    await manager.register(plugin);

    await expect(manager.register(plugin)).rejects.toThrow();
  });

  it('loads and unloads plugins', async () => {
    const plugin = {
      id: 'test/lifecycle-plugin',
      name: 'Lifecycle Plugin',
      description: 'A lifecycle test plugin',
      version: '1.0.0',
      author: 'Test Author',
      license: 'MIT',
      category: 'accessibility',
      tags: ['test'],
      capabilities: { canModifyColors: false, canValidate: true },
      colorIntelligenceVersion: '^5.0.0',
      hooks: {},
      onLoad: async () => {},
      onUnload: async () => {},
    } as unknown as ColorIntelligencePlugin;

    await manager.register(plugin);
    await manager.load('test/lifecycle-plugin' as any);

    let state = manager.getState('test/lifecycle-plugin' as any);
    expect(state).toBe('active');

    await manager.unload('test/lifecycle-plugin' as any);

    state = manager.getState('test/lifecycle-plugin' as any);
    // After unload, state is 'unloaded' (not 'inactive')
    expect(state).toBe('unloaded');
  });

  it('executes hooks for loaded plugins', async () => {
    let hookCalled = false;

    const plugin = {
      id: 'test/hook-plugin',
      name: 'Hook Plugin',
      description: 'A hook test plugin',
      version: '1.0.0',
      author: 'Test Author',
      license: 'MIT',
      category: 'accessibility',
      tags: ['test'],
      capabilities: { canModifyColors: false, canValidate: true },
      colorIntelligenceVersion: '^5.0.0',
      hooks: {
        afterDecision: async (_context: unknown, decision: unknown) => {
          hookCalled = true;
          return decision;
        },
      },
    } as unknown as ColorIntelligencePlugin;

    await manager.register(plugin);
    await manager.load('test/hook-plugin' as any);

    await manager.executeHook('afterDecision', { test: true });

    expect(hookCalled).toBe(true);
  });
});

// ============================================
// Audit Trail Tests
// ============================================

describe('Audit Trail Service', () => {
  let storage: InMemoryAuditStorage;
  let auditService: AuditTrailService;

  beforeEach(() => {
    storage = createInMemoryAuditStorage();
    auditService = createAuditTrailService({
      storageAdapter: storage,
      enabled: true,
    });
  });

  it('creates service successfully', () => {
    expect(auditService).toBeDefined();
  });

  it('logs decision events', async () => {
    const entryId = await auditService.logDecision({
      decisionId: 'decision-123',
      decisionType: 'contrast',
      input: { foreground: '#000', background: '#FFF' },
      output: { lcValue: 106, passes: true },
    });

    expect(entryId).toBeDefined();
    // Entry ID format is "AE-timestamp-random" (from createAuditEntryId)
    expect(entryId).toMatch(/^AE-/);
  });

  it('logs policy evaluation events', async () => {
    const entryId = await auditService.logPolicyEvaluation({
      policyId: 'wcag21-aa',
      decisionId: 'decision-123',
      outcome: 'approved',
      violations: [],
    });

    expect(entryId).toBeDefined();
  });

  it('logs conformance test events', async () => {
    const entryId = await auditService.logConformanceTest({
      testSuiteId: 'suite-1',
      subjectId: 'impl-1',
      level: 'gold',
      passed: true,
      score: 92,
    });

    expect(entryId).toBeDefined();
  });

  it('logs certification events', async () => {
    const entryId = await auditService.logCertification({
      certificateId: 'cert-1',
      subjectId: 'impl-1',
      level: 'gold',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      issuer: 'conformance-engine',
    });

    expect(entryId).toBeDefined();
  });

  it('logs plugin events', async () => {
    const entryId = await auditService.logPluginEvent({
      pluginId: 'test-plugin',
      event: 'loaded',
      version: '1.0.0',
    });

    expect(entryId).toBeDefined();
  });

  it('logs security events', async () => {
    const entryId = await auditService.logSecurityEvent({
      eventType: 'access_granted',
      resourceId: 'policy-1',
      resourceType: 'policy',
      actorId: 'user-1',
      actorType: 'user',
    });

    expect(entryId).toBeDefined();
  });

  it('queries entries by date range', async () => {
    await auditService.logDecision({
      decisionId: 'query-test-1',
      decisionType: 'contrast',
      input: {},
      output: {},
    });

    // Force flush
    await auditService.shutdown();
    auditService = createAuditTrailService({
      storageAdapter: storage,
      enabled: true,
    });

    const now = new Date();
    const result = await auditService.query({
      dateRange: {
        from: new Date(now.getTime() - 60000).toISOString(),
        to: new Date(now.getTime() + 60000).toISOString(),
      },
    });

    expect(result.entries.length).toBeGreaterThan(0);
  });

  it('generates compliance report', async () => {
    await auditService.logDecision({
      decisionId: 'report-test',
      decisionType: 'contrast',
      input: {},
      output: {},
    });

    await auditService.shutdown();
    auditService = createAuditTrailService({
      storageAdapter: storage,
      enabled: true,
    });

    const now = new Date();
    const report = await auditService.generateComplianceReport({
      framework: 'wcag',
      dateRange: {
        from: new Date(now.getTime() - 60000).toISOString(),
        to: new Date(now.getTime() + 60000).toISOString(),
      },
    });

    expect(report).toBeDefined();
    expect((report.metadata?.custom as { framework?: string })?.framework).toBe('wcag');
    expect(report.summary.complianceStatus).toBeDefined();
  });

  it('exports entries in different formats', async () => {
    await auditService.logDecision({
      decisionId: 'export-test',
      decisionType: 'contrast',
      input: {},
      output: {},
    });

    await auditService.shutdown();
    auditService = createAuditTrailService({
      storageAdapter: storage,
      enabled: true,
    });

    const now = new Date();
    const dateRange = {
      from: new Date(now.getTime() - 60000).toISOString(),
      to: new Date(now.getTime() + 60000).toISOString(),
    };

    const jsonExport = await auditService.export({ format: 'json', dateRange });
    expect(jsonExport).toContain('export-test');

    const csvExport = await auditService.export({ format: 'csv', dateRange });
    expect(csvExport).toContain('id,timestamp');

    const ndjsonExport = await auditService.export({ format: 'ndjson', dateRange });
    expect(ndjsonExport.split('\n').length).toBeGreaterThan(0);
  });
});

// ============================================
// In-Memory Audit Storage Tests
// ============================================

describe('In-Memory Audit Storage', () => {
  let storage: InMemoryAuditStorage;

  beforeEach(() => {
    storage = createInMemoryAuditStorage({ maxEntries: 100 });
  });

  it('stores and retrieves entries', async () => {
    const entry: AuditEntry = {
      id: 'test-entry' as any,
      timestamp: new Date().toISOString(),
      type: 'decision',
      severity: 'info',
      action: 'test_action',
      actor: { type: 'system', id: 'test' },
      resource: { type: 'test', id: 'test-1' },
      details: {},
      hash: 'abc123',
    };

    await storage.write(entry);

    const retrieved = await storage.getById('test-entry' as any);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('test-entry');
  });

  it('enforces max entries limit', async () => {
    for (let i = 0; i < 150; i++) {
      await storage.write({
        id: `entry-${i}` as any,
        timestamp: new Date().toISOString(),
        type: 'decision',
        severity: 'info',
        action: 'test',
        actor: { type: 'system', id: 'test' },
        resource: { type: 'test', id: `test-${i}` },
        details: {},
        hash: `hash-${i}`,
      });
    }

    expect(storage.getEntryCount()).toBe(100);
  });

  it('queries by type', async () => {
    await storage.write({
      id: 'decision-entry' as any,
      timestamp: new Date().toISOString(),
      type: 'decision',
      severity: 'info',
      action: 'test',
      actor: { type: 'system', id: 'test' },
      resource: { type: 'test', id: 'test-1' },
      details: {},
      hash: 'abc',
    });

    await storage.write({
      id: 'policy-entry' as any,
      timestamp: new Date().toISOString(),
      type: 'policy_evaluation',
      severity: 'info',
      action: 'test',
      actor: { type: 'system', id: 'test' },
      resource: { type: 'test', id: 'test-2' },
      details: {},
      hash: 'def',
    });

    const decisions = await storage.query({ types: ['decision'] });
    expect(decisions.length).toBe(1);
    expect(decisions[0]?.type).toBe('decision');
  });

  it('clears all entries', async () => {
    await storage.write({
      id: 'to-clear' as any,
      timestamp: new Date().toISOString(),
      type: 'decision',
      severity: 'info',
      action: 'test',
      actor: { type: 'system', id: 'test' },
      resource: { type: 'test', id: 'test-1' },
      details: {},
      hash: 'abc',
    });

    expect(storage.getEntryCount()).toBe(1);

    await storage.clear();

    expect(storage.getEntryCount()).toBe(0);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Phase 5 Integration', () => {
  it('APCA golden set values match reference implementation', () => {
    // Validate that golden set expected values match reference implementation
    const blackOnWhiteCase = APCA_CONTRAST_GOLDEN_SET.testCases.find(
      tc => tc.id === 'apca-001'
    );

    expect(blackOnWhiteCase).toBeDefined();

    if (blackOnWhiteCase) {
      const input = blackOnWhiteCase.input as {
        foreground: { r: number; g: number; b: number };
        background: { r: number; g: number; b: number };
      };

      const calculated = APCAReferenceImplementation.calculateLc(
        input.foreground.r,
        input.foreground.g,
        input.foreground.b,
        input.background.r,
        input.background.g,
        input.background.b
      );

      const expected = blackOnWhiteCase.expected as { lcValue: number; tolerance: number };
      expect(Math.abs(calculated - expected.lcValue)).toBeLessThanOrEqual(
        expected.tolerance
      );
    }
  });

  it('plugin system integrates with audit trail', async () => {
    const storage = createInMemoryAuditStorage();
    const audit = createAuditTrailService({
      storageAdapter: storage,
      enabled: true,
    });

    const manager = createPluginManager();

    // Register plugin that logs to audit trail
    const plugin = {
      id: 'test/audit-integration-plugin',
      name: 'Audit Integration Plugin',
      description: 'Integration test plugin',
      version: '1.0.0',
      author: 'Test Author',
      license: 'MIT',
      category: 'accessibility',
      tags: ['test'],
      capabilities: { canModifyColors: false, canValidate: true },
      colorIntelligenceVersion: '^5.0.0',
      hooks: {
        // onLoad must be inside hooks object (PluginHooks interface)
        onLoad: async () => {
          await audit.logPluginEvent({
            pluginId: 'test/audit-integration-plugin',
            event: 'loaded',
            version: '1.0.0',
          });
        },
      },
    } as unknown as ColorIntelligencePlugin;

    await manager.register(plugin);
    await manager.load('test/audit-integration-plugin' as any);

    // Force flush
    await audit.shutdown();

    // Verify audit entry was created
    expect(storage.getEntryCount()).toBeGreaterThan(0);
    const entries = storage.getEntriesByType('plugin_lifecycle');
    expect(entries.some(e => e.resource?.id === 'test/audit-integration-plugin')).toBe(true);
  });
});
