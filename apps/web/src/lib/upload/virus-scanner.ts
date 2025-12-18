/**
 * Virus Scanner Service
 *
 * Provides file scanning capabilities using:
 * - VirusTotal API (cloud-based, recommended for production)
 * - Hash-based checks (for known malware)
 * - Heuristic analysis (for common attack patterns)
 *
 * Edge Runtime compatible - uses Web Crypto API only
 *
 * @module lib/upload/virus-scanner
 */

// ============================================
// Types
// ============================================

export interface ScanResult {
  safe: boolean;
  scanned: boolean;
  scanMethod: 'virustotal' | 'hash' | 'heuristic' | 'skipped';
  threats: string[];
  hash?: string;
  scanId?: string;
  details?: Record<string, unknown>;
}

export interface VirusTotalResponse {
  data: {
    id: string;
    attributes: {
      status: string;
      stats: {
        harmless: number;
        'type-unsupported': number;
        suspicious: number;
        'confirmed-timeout': number;
        timeout: number;
        failure: number;
        malicious: number;
        undetected: number;
      };
      results: Record<string, {
        category: string;
        result: string | null;
        method: string;
        engine_name: string;
      }>;
    };
  };
}

// ============================================
// Configuration
// ============================================

const VIRUSTOTAL_API_KEY = process.env['VIRUSTOTAL_API_KEY'];
const VIRUSTOTAL_API_URL = 'https://www.virustotal.com/api/v3';

// Malicious patterns for heuristic scanning
const MALICIOUS_PATTERNS = [
  // PHP backdoors
  /eval\s*\(\s*base64_decode/i,
  /eval\s*\(\s*gzinflate/i,
  /eval\s*\(\s*str_rot13/i,
  /<\?php\s+\$\w+\s*=\s*['"][^'"]+['"];\s*eval/i,

  // JavaScript malware
  /document\.write\s*\(\s*unescape/i,
  /eval\s*\(\s*String\.fromCharCode/i,
  /new\s+Function\s*\(\s*atob/i,

  // Shell injection
  /;\s*(?:bash|sh|cmd|powershell)\s*-/i,
  /\$\(\s*(?:curl|wget|nc)\s/i,

  // SQL injection in uploaded content
  /(?:UNION\s+SELECT|INSERT\s+INTO|DROP\s+TABLE|DELETE\s+FROM)/i,

  // XSS patterns in documents
  /<script[^>]*>[\s\S]*?(?:document\.cookie|localStorage|sessionStorage)/i,

  // Executable detection (should not be uploaded)
  /^MZ[\x00-\xFF]{2}/,  // PE executable
  /^\x7fELF/,           // ELF executable

  // Archive with executables
  /\.(?:exe|bat|cmd|scr|pif|com|vbs|js|ws|wsf|msi|jar)\s*$/im,
];

// Known malware hashes (SHA-256)
// This is a sample - in production, use a proper threat intelligence feed
const KNOWN_MALWARE_HASHES = new Set([
  // EICAR test file hash (for testing)
  '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
]);

// ============================================
// Hash Calculation
// ============================================

/**
 * Calculate SHA-256 hash of file content using Web Crypto API
 * Compatible with Edge Runtime and Cloudflare Workers
 */
export async function calculateFileHash(content: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// Heuristic Scanner
// ============================================

/**
 * Perform heuristic analysis on file content
 */
export function heuristicScan(content: string | ArrayBuffer): { safe: boolean; threats: string[] } {
  const threats: string[] = [];

  // Convert to string for pattern matching
  let textContent: string;
  if (content instanceof ArrayBuffer) {
    // Only scan first 100KB for performance
    const slice = content.slice(0, 100 * 1024);
    textContent = new TextDecoder('utf-8', { fatal: false }).decode(slice);
  } else {
    textContent = content.slice(0, 100 * 1024);
  }

  // Check against malicious patterns
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(textContent)) {
      threats.push(`Suspicious pattern detected: ${pattern.toString().slice(0, 50)}...`);
    }
  }

  return { safe: threats.length === 0, threats };
}

// ============================================
// Hash-based Scanner
// ============================================

/**
 * Check file hash against known malware database
 */
export async function hashBasedScan(content: ArrayBuffer): Promise<{ safe: boolean; hash: string; isKnownMalware: boolean }> {
  const hash = await calculateFileHash(content);
  const isKnownMalware = KNOWN_MALWARE_HASHES.has(hash.toLowerCase());

  return {
    safe: !isKnownMalware,
    hash,
    isKnownMalware,
  };
}

// ============================================
// VirusTotal Scanner
// ============================================

/**
 * Submit file to VirusTotal for scanning
 */
export async function virusTotalScan(
  file: File
): Promise<ScanResult> {
  if (!VIRUSTOTAL_API_KEY) {
    console.warn('[VirusScanner] VirusTotal API key not configured');
    return {
      safe: true, // Allow if not configured (but log warning)
      scanned: false,
      scanMethod: 'skipped',
      threats: [],
      details: { reason: 'VirusTotal API key not configured' },
    };
  }

  try {
    // 1. Get upload URL
    const uploadUrlResponse = await fetch(`${VIRUSTOTAL_API_URL}/files/upload_url`, {
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
    });

    if (!uploadUrlResponse.ok) {
      throw new Error(`Failed to get upload URL: ${uploadUrlResponse.status}`);
    }

    const { data: uploadUrl } = await uploadUrlResponse.json();

    // 2. Upload file
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    const analysisId = uploadResult.data.id;

    // 3. Poll for results (with timeout)
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const analysisResponse = await fetch(`${VIRUSTOTAL_API_URL}/analyses/${analysisId}`, {
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
        },
      });

      if (!analysisResponse.ok) continue;

      const analysisResult: VirusTotalResponse = await analysisResponse.json();
      const { attributes } = analysisResult.data;

      if (attributes.status === 'completed') {
        const { stats, results } = attributes;
        const threats: string[] = [];

        // Collect detected threats
        for (const [engine, result] of Object.entries(results)) {
          if (result.category === 'malicious' && result.result) {
            threats.push(`${engine}: ${result.result}`);
          }
        }

        const isSafe = stats.malicious === 0 && stats.suspicious === 0;

        return {
          safe: isSafe,
          scanned: true,
          scanMethod: 'virustotal',
          threats,
          scanId: analysisId,
          details: {
            stats,
            scannedBy: Object.keys(results).length,
          },
        };
      }
    }

    // Timeout - analysis not completed
    return {
      safe: true, // Allow if timeout (log for review)
      scanned: false,
      scanMethod: 'virustotal',
      threats: [],
      details: { reason: 'Analysis timeout', scanId: analysisId },
    };

  } catch (error) {
    console.error('[VirusScanner] VirusTotal scan error:', error);
    return {
      safe: true, // Allow on error (but log)
      scanned: false,
      scanMethod: 'virustotal',
      threats: [],
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// ============================================
// Combined Scanner
// ============================================

export interface ScanOptions {
  useVirusTotal?: boolean;
  useHashCheck?: boolean;
  useHeuristics?: boolean;
  skipForSmallFiles?: number; // Skip for files smaller than this (bytes)
}

const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  useVirusTotal: !!VIRUSTOTAL_API_KEY,
  useHashCheck: true,
  useHeuristics: true,
  skipForSmallFiles: 0, // Don't skip any
};

/**
 * Comprehensive file scanning
 */
export async function scanFile(
  file: File,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const allThreats: string[] = [];

  // Skip scanning for very small files if configured
  if (opts.skipForSmallFiles && file.size < opts.skipForSmallFiles) {
    return {
      safe: true,
      scanned: false,
      scanMethod: 'skipped',
      threats: [],
      details: { reason: 'File too small for scanning' },
    };
  }

  const content = await file.arrayBuffer();

  // 1. Hash-based check (fast)
  if (opts.useHashCheck) {
    const hashResult = await hashBasedScan(content);
    if (!hashResult.safe) {
      return {
        safe: false,
        scanned: true,
        scanMethod: 'hash',
        threats: ['Known malware detected'],
        hash: hashResult.hash,
      };
    }
  }

  // 2. Heuristic analysis (fast)
  if (opts.useHeuristics) {
    const heuristicResult = heuristicScan(content);
    if (!heuristicResult.safe) {
      allThreats.push(...heuristicResult.threats);
    }
  }

  // If heuristics found issues, return early
  if (allThreats.length > 0) {
    return {
      safe: false,
      scanned: true,
      scanMethod: 'heuristic',
      threats: allThreats,
      hash: await calculateFileHash(content),
    };
  }

  // 3. VirusTotal scan (slow, use for production)
  if (opts.useVirusTotal && VIRUSTOTAL_API_KEY) {
    const vtResult = await virusTotalScan(file);
    if (!vtResult.safe) {
      return vtResult;
    }
    // File is safe according to VirusTotal
    return vtResult;
  }

  // All checks passed
  return {
    safe: true,
    scanned: true,
    scanMethod: opts.useHeuristics ? 'heuristic' : 'hash',
    threats: [],
    hash: await calculateFileHash(content),
  };
}

/**
 * Quick scan (heuristics only, for immediate feedback)
 */
export async function quickScan(file: File): Promise<ScanResult> {
  return scanFile(file, {
    useVirusTotal: false,
    useHashCheck: true,
    useHeuristics: true,
  });
}

// ============================================
// Exports
// ============================================

export {
  KNOWN_MALWARE_HASHES,
  MALICIOUS_PATTERNS,
};
