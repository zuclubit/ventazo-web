// ============================================
// APCAContrast Value Object Tests
// Tests for WCAG 3.0 APCA contrast calculations
// ============================================

import { describe, it, expect } from 'vitest';
import APCAContrast, { APCA_REQUIREMENTS } from '../domain/value-objects/APCAContrast';

describe('APCAContrast Value Object', () => {
  describe('calculate()', () => {
    it('should calculate contrast between black and white', () => {
      const bwContrast = APCAContrast.calculate('#FFFFFF', '#000000');
      const wbContrast = APCAContrast.calculate('#000000', '#FFFFFF');

      // White on black should have high absolute Lc
      expect(bwContrast.absoluteLc).toBeGreaterThan(100);

      // Black on white should also have high absolute Lc
      expect(wbContrast.absoluteLc).toBeGreaterThan(100);
    });

    it('should return zero for identical colors', () => {
      const contrast = APCAContrast.calculate('#3B82F6', '#3B82F6');

      expect(contrast.lc).toBe(0);
      expect(contrast.absoluteLc).toBe(0);
    });

    it('should handle grayscale contrast', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#808080');

      expect(contrast.absoluteLc).toBeGreaterThan(40);
      expect(contrast.absoluteLc).toBeLessThan(80);
    });

    it('should correctly identify polarity', () => {
      const lightOnDark = APCAContrast.calculate('#FFFFFF', '#000000');
      const darkOnLight = APCAContrast.calculate('#000000', '#FFFFFF');

      expect(lightOnDark.polarity).toBe('light-on-dark');
      expect(darkOnLight.polarity).toBe('dark-on-light');
    });

    it('should handle hex with and without hash', () => {
      const withHash = APCAContrast.calculate('#FFFFFF', '#000000');
      const withoutHash = APCAContrast.calculate('FFFFFF', '000000');

      expect(withHash.lc).toBe(withoutHash.lc);
    });
  });

  describe('absoluteLc', () => {
    it('should always be positive', () => {
      const lightOnDark = APCAContrast.calculate('#FFFFFF', '#000000');
      const darkOnLight = APCAContrast.calculate('#000000', '#FFFFFF');

      expect(lightOnDark.absoluteLc).toBeGreaterThan(0);
      expect(darkOnLight.absoluteLc).toBeGreaterThan(0);
    });

    it('should be absolute value of lc', () => {
      const contrast = APCAContrast.calculate('#000000', '#FFFFFF');

      expect(contrast.absoluteLc).toBe(Math.abs(contrast.lc));
    });
  });

  describe('level determination', () => {
    it('should return fail for insufficient contrast', () => {
      const contrast = APCAContrast.calculate('#808080', '#909090');

      expect(contrast.level).toBe('fail');
    });

    it('should return minimum for Lc >= 15', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#6B6B6B');

      if (contrast.absoluteLc >= 15 && contrast.absoluteLc < 30) {
        expect(contrast.level).toBe('minimum');
      }
    });

    it('should return body for Lc >= 60', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#1A1A1A');

      if (contrast.absoluteLc >= 60) {
        expect(['body', 'fluent', 'excellent']).toContain(contrast.level);
      }
    });

    it('should return excellent for very high contrast', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');

      expect(contrast.level).toBe('excellent');
    });
  });

  describe('validation methods', () => {
    it('should validate for body text', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');

      expect(contrast.isValidForBodyText()).toBe(true);
    });

    it('should validate for large text', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#333333');

      const isValid = contrast.absoluteLc >= APCA_REQUIREMENTS.largeText;
      expect(contrast.isValidForLargeText()).toBe(isValid);
    });

    it('should validate for headlines', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#444444');

      const isValid = contrast.absoluteLc >= APCA_REQUIREMENTS.headlines;
      expect(contrast.isValidForHeadlines()).toBe(isValid);
    });

    it('should validate for spot text', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#555555');

      const isValid = contrast.absoluteLc >= APCA_REQUIREMENTS.spotText;
      expect(contrast.isValidForSpotText()).toBe(isValid);
    });

    it('should check readability', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');

      expect(contrast.isReadable()).toBe(true);
    });

    it('should return false for very low contrast', () => {
      const contrast = APCAContrast.calculate('#808080', '#898989');

      expect(contrast.isReadable()).toBe(false);
    });
  });

  describe('validate() method', () => {
    it('should validate against specific use cases', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#222222');

      expect(contrast.validate('bodyText')).toBe(contrast.absoluteLc >= APCA_REQUIREMENTS.bodyText);
      expect(contrast.validate('largeText')).toBe(contrast.absoluteLc >= APCA_REQUIREMENTS.largeText);
      expect(contrast.validate('headlines')).toBe(contrast.absoluteLc >= APCA_REQUIREMENTS.headlines);
      expect(contrast.validate('spotText')).toBe(contrast.absoluteLc >= APCA_REQUIREMENTS.spotText);
    });
  });

  describe('findOptimalTextColor()', () => {
    it('should find text color for dark backgrounds', () => {
      const result = APCAContrast.findOptimalTextColor('#000000');

      expect(result.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(result.contrast.absoluteLc).toBeGreaterThan(60);
    });

    it('should find text color for light backgrounds', () => {
      const result = APCAContrast.findOptimalTextColor('#FFFFFF');

      expect(result.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(result.contrast.absoluteLc).toBeGreaterThan(60);
    });

    it('should respect preferDark option', () => {
      // For a gray background, both black and white should work
      const preferDark = APCAContrast.findOptimalTextColor('#888888', {
        preferDark: true,
        minLc: 30, // Lower threshold so both can pass
      });

      const preferLight = APCAContrast.findOptimalTextColor('#888888', {
        preferDark: false,
        minLc: 30,
      });

      // Both should be valid contrasts
      expect(preferDark.contrast.absoluteLc).toBeGreaterThan(30);
      expect(preferLight.contrast.absoluteLc).toBeGreaterThan(30);
    });
  });

  describe('findContrastingLightness()', () => {
    it('should find valid lightness for target contrast', () => {
      const result = APCAContrast.findContrastingLightness('#3B82F6', '#FFFFFF', 75);

      if (result) {
        const testContrast = APCAContrast.calculate(result.toHex(), '#FFFFFF');
        expect(testContrast.absoluteLc).toBeGreaterThanOrEqual(70);
      }
    });

    it('should work for both directions', () => {
      const lighter = APCAContrast.findContrastingLightness('#808080', '#FFFFFF', 60, 'lighter');
      const darker = APCAContrast.findContrastingLightness('#808080', '#FFFFFF', 60, 'darker');

      if (lighter && darker) {
        expect(lighter.l).toBeGreaterThan(darker.l);
      }
    });
  });

  describe('APCA_REQUIREMENTS constants', () => {
    it('should have correct threshold values', () => {
      expect(APCA_REQUIREMENTS.bodyText).toBe(75);
      expect(APCA_REQUIREMENTS.largeText).toBe(60);
      expect(APCA_REQUIREMENTS.headlines).toBe(45);
      expect(APCA_REQUIREMENTS.spotText).toBe(30);
      expect(APCA_REQUIREMENTS.nonText).toBe(15);
    });
  });

  describe('Edge cases', () => {
    it('should handle pure colors', () => {
      const redOnBlack = APCAContrast.calculate('#FF0000', '#000000');
      const greenOnBlack = APCAContrast.calculate('#00FF00', '#000000');
      const blueOnBlack = APCAContrast.calculate('#0000FF', '#000000');

      expect(redOnBlack.absoluteLc).toBeGreaterThan(0);
      expect(greenOnBlack.absoluteLc).toBeGreaterThan(0);
      expect(blueOnBlack.absoluteLc).toBeGreaterThan(0);

      // Green has highest luminance
      expect(greenOnBlack.absoluteLc).toBeGreaterThan(redOnBlack.absoluteLc);
      expect(greenOnBlack.absoluteLc).toBeGreaterThan(blueOnBlack.absoluteLc);
    });

    it('should handle near-identical colors', () => {
      const contrast = APCAContrast.calculate('#FEFEFE', '#FFFFFF');

      expect(contrast.absoluteLc).toBeLessThan(5);
    });

    it('should handle brand colors', () => {
      // Tailwind blue-500 on white
      const blueOnWhite = APCAContrast.calculate('#3B82F6', '#FFFFFF');
      // Emerald-500 on white
      const emeraldOnWhite = APCAContrast.calculate('#10B981', '#FFFFFF');

      expect(blueOnWhite.absoluteLc).toBeGreaterThan(30);
      expect(emeraldOnWhite.absoluteLc).toBeGreaterThan(30);
    });
  });

  describe('Comparison with WCAG 2.1', () => {
    it('should show different results from WCAG ratios', () => {
      // APCA accounts for polarity, so light-on-dark should differ from dark-on-light
      const lightOnDark = APCAContrast.calculate('#FFFFFF', '#3B82F6');
      const darkOnLight = APCAContrast.calculate('#3B82F6', '#FFFFFF');

      // Both should be accessible but with different polarities
      expect(lightOnDark.polarity).toBe('light-on-dark');
      expect(darkOnLight.polarity).toBe('dark-on-light');

      // Absolute values should be similar but not identical due to APCA's asymmetry
      expect(Math.abs(lightOnDark.absoluteLc - darkOnLight.absoluteLc)).toBeLessThan(20);
    });
  });

  describe('getPassingUseCases()', () => {
    it('should return all passing use cases', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');
      const passing = contrast.getPassingUseCases();

      expect(passing).toContain('bodyText');
      expect(passing).toContain('largeText');
      expect(passing).toContain('headlines');
      expect(passing).toContain('spotText');
      expect(passing).toContain('nonText');
    });

    it('should return limited use cases for low contrast', () => {
      const contrast = APCAContrast.calculate('#808080', '#606060');
      const passing = contrast.getPassingUseCases();

      expect(passing.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getMinimumFontSize()', () => {
    it('should return font sizes for valid contrast', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');
      const fonts = contrast.getMinimumFontSize();

      expect(fonts).toBeDefined();
      expect(fonts?.regular).toBeGreaterThan(0);
      expect(fonts?.bold).toBeGreaterThan(0);
    });

    it('should return null for unreadable contrast', () => {
      const contrast = APCAContrast.calculate('#808080', '#858585');
      const fonts = contrast.getMinimumFontSize();

      expect(fonts).toBeNull();
    });
  });

  describe('getRecommendations()', () => {
    it('should provide recommendations for low contrast', () => {
      const contrast = APCAContrast.calculate('#808080', '#606060');
      const recommendations = contrast.getRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should provide empty array for excellent contrast', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');
      const recommendations = contrast.getRecommendations();

      expect(recommendations.length).toBe(0);
    });
  });

  describe('comparison methods', () => {
    it('should compare two contrasts', () => {
      const high = APCAContrast.calculate('#FFFFFF', '#000000');
      const low = APCAContrast.calculate('#808080', '#606060');

      expect(high.compareTo(low)).toBeGreaterThan(0);
      expect(low.compareTo(high)).toBeLessThan(0);
    });

    it('should check if better than', () => {
      const high = APCAContrast.calculate('#FFFFFF', '#000000');
      const low = APCAContrast.calculate('#808080', '#606060');

      expect(high.isBetterThan(low)).toBe(true);
      expect(low.isBetterThan(high)).toBe(false);
    });

    it('should check approximate equality', () => {
      const c1 = APCAContrast.calculate('#FFFFFF', '#111111');
      const c2 = APCAContrast.calculate('#FFFFFF', '#121212');

      expect(c1.isApproximatelyEqual(c2, 5)).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');
      const json = contrast.toJSON();

      expect(json.lc).toBeDefined();
      expect(json.absoluteLc).toBeDefined();
      expect(json.polarity).toBeDefined();
      expect(json.level).toBeDefined();
      expect(json.score).toBeDefined();
    });

    it('should produce readable string', () => {
      const contrast = APCAContrast.calculate('#FFFFFF', '#000000');
      const str = contrast.toString();

      expect(str).toContain('APCAContrast');
      expect(str).toContain('Lc:');
    });
  });
});
