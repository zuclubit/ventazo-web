/**
 * File Validator - Secure File Upload Validation
 *
 * Provides comprehensive file validation including:
 * - Magic byte (file signature) validation
 * - MIME type verification
 * - File size limits
 * - Extension whitelist
 * - Content analysis
 *
 * @module lib/upload/file-validator
 */

// ============================================
// Magic Byte Signatures
// ============================================

/**
 * File type signatures (magic bytes)
 * These are the actual byte patterns at the start of files
 */
export const FILE_SIGNATURES: Record<string, { signature: number[]; offset?: number; mimeTypes: string[] }[]> = {
  // Images
  jpeg: [
    { signature: [0xFF, 0xD8, 0xFF], mimeTypes: ['image/jpeg'] },
  ],
  png: [
    { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mimeTypes: ['image/png'] },
  ],
  gif: [
    { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], mimeTypes: ['image/gif'] }, // GIF87a
    { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], mimeTypes: ['image/gif'] }, // GIF89a
  ],
  webp: [
    { signature: [0x52, 0x49, 0x46, 0x46], mimeTypes: ['image/webp'] }, // RIFF header
  ],
  svg: [
    { signature: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], mimeTypes: ['image/svg+xml'] }, // <?xml
    { signature: [0x3C, 0x73, 0x76, 0x67], mimeTypes: ['image/svg+xml'] }, // <svg
  ],
  ico: [
    { signature: [0x00, 0x00, 0x01, 0x00], mimeTypes: ['image/x-icon', 'image/vnd.microsoft.icon'] },
  ],
  bmp: [
    { signature: [0x42, 0x4D], mimeTypes: ['image/bmp'] },
  ],

  // Documents
  pdf: [
    { signature: [0x25, 0x50, 0x44, 0x46], mimeTypes: ['application/pdf'] }, // %PDF
  ],
  // Office Open XML formats
  docx: [
    { signature: [0x50, 0x4B, 0x03, 0x04], mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  ],
  xlsx: [
    { signature: [0x50, 0x4B, 0x03, 0x04], mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
  ],
  pptx: [
    { signature: [0x50, 0x4B, 0x03, 0x04], mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'] },
  ],
  // Legacy Office formats
  doc: [
    { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], mimeTypes: ['application/msword'] },
  ],
  xls: [
    { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], mimeTypes: ['application/vnd.ms-excel'] },
  ],
  ppt: [
    { signature: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], mimeTypes: ['application/vnd.ms-powerpoint'] },
  ],

  // Archives (for ZIP-based formats)
  zip: [
    { signature: [0x50, 0x4B, 0x03, 0x04], mimeTypes: ['application/zip', 'application/x-zip-compressed'] },
  ],

  // Text formats (need content analysis)
  csv: [
    { signature: [], mimeTypes: ['text/csv', 'text/plain'] }, // No signature, needs content check
  ],
  txt: [
    { signature: [], mimeTypes: ['text/plain'] },
  ],
};

// ============================================
// File Type Configuration
// ============================================

export interface FileTypeConfig {
  mimeTypes: string[];
  extensions: string[];
  maxSize: number; // bytes
  magicBytes?: boolean; // whether to check magic bytes
}

/**
 * Allowed file types by category
 */
export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  logo: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
    maxSize: 5 * 1024 * 1024, // 5MB
    magicBytes: true,
  },
  avatar: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
    magicBytes: true,
  },
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    magicBytes: true,
  },
  document: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    maxSize: 25 * 1024 * 1024, // 25MB
    magicBytes: true,
  },
  spreadsheet: {
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    extensions: ['.xls', '.xlsx', '.csv'],
    maxSize: 50 * 1024 * 1024, // 50MB
    magicBytes: true,
  },
  attachment: {
    mimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
    maxSize: 50 * 1024 * 1024, // 50MB
    magicBytes: true,
  },
};

// ============================================
// Validation Result Type
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    detectedType?: string;
    declaredType?: string;
    fileSize?: number;
    extension?: string;
  };
}

// ============================================
// Magic Byte Validation
// ============================================

/**
 * Check if file bytes match a signature
 */
function matchesSignature(bytes: Uint8Array, signature: number[], offset: number = 0): boolean {
  if (bytes.length < offset + signature.length) return false;

  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }

  return true;
}

/**
 * Detect file type from magic bytes
 */
export function detectFileType(bytes: Uint8Array): string | null {
  for (const [type, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const sig of signatures) {
      if (sig.signature.length === 0) continue; // Skip text formats
      if (matchesSignature(bytes, sig.signature, sig.offset || 0)) {
        return type;
      }
    }
  }
  return null;
}

/**
 * Validate magic bytes against expected MIME types
 */
export function validateMagicBytes(
  bytes: Uint8Array,
  expectedMimeTypes: string[]
): { valid: boolean; detectedType: string | null } {
  const detectedType = detectFileType(bytes);

  if (!detectedType) {
    // Check if it might be a text-based file (CSV, TXT, SVG)
    // These don't have clear magic bytes
    const textContent = new TextDecoder().decode(bytes.slice(0, 100));
    if (textContent.startsWith('<?xml') || textContent.startsWith('<svg')) {
      return { valid: expectedMimeTypes.includes('image/svg+xml'), detectedType: 'svg' };
    }
    // Allow text-based formats without signature
    const textTypes = ['text/plain', 'text/csv'];
    if (expectedMimeTypes.some(t => textTypes.includes(t))) {
      return { valid: true, detectedType: 'text' };
    }
    return { valid: false, detectedType: null };
  }

  // Check if detected type is in expected types
  const detectedSignatures = FILE_SIGNATURES[detectedType];
  if (!detectedSignatures) return { valid: false, detectedType };

  const detectedMimeTypes = detectedSignatures.flatMap(s => s.mimeTypes);
  const isValid = detectedMimeTypes.some(mime => expectedMimeTypes.includes(mime));

  return { valid: isValid, detectedType };
}

// ============================================
// Sanitization
// ============================================

/**
 * Sanitize filename to prevent path traversal and injection
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[\\/]/).pop() || filename;

  // Remove null bytes and control characters
  let sanitized = basename.replace(/[\x00-\x1f\x7f]/g, '');

  // Replace potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '_');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit length
  if (sanitized.length > 200) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.slice(0, 200 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }

  // Fallback if empty
  if (!sanitized) {
    sanitized = 'file';
  }

  return sanitized;
}

/**
 * Generate a safe storage key
 */
export function generateStorageKey(
  userId: string,
  category: string,
  filename: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = sanitizeFilename(filename.split('.').slice(0, -1).join('.'));

  return `${userId}/${category}/${timestamp}_${randomId}_${safeName}.${ext}`;
}

// ============================================
// Content Analysis
// ============================================

/**
 * Check for potentially malicious content in SVG files
 */
export function analyzeSvgContent(content: string): { safe: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for script tags
  if (/<script[\s>]/i.test(content)) {
    issues.push('Script tags detected');
  }

  // Check for event handlers
  if (/\bon\w+\s*=/i.test(content)) {
    issues.push('Event handlers detected');
  }

  // Check for external references that could be malicious
  if (/xlink:href\s*=\s*["'](?!#|data:)/i.test(content)) {
    issues.push('External references detected');
  }

  // Check for embedded data URIs with scripts
  if (/data:\s*text\/html/i.test(content)) {
    issues.push('HTML data URI detected');
  }

  // Check for foreignObject (can contain HTML)
  if (/<foreignObject/i.test(content)) {
    issues.push('ForeignObject element detected');
  }

  return { safe: issues.length === 0, issues };
}

/**
 * Sanitize SVG content
 */
export function sanitizeSvg(content: string): string {
  // Remove script tags
  let sanitized = content.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove external xlink references (keep internal ones)
  sanitized = sanitized.replace(/xlink:href\s*=\s*["'](?!#|data:image)[^"']*["']/gi, '');

  // Remove foreignObject
  sanitized = sanitized.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');

  return sanitized;
}

// ============================================
// Main Validation Function
// ============================================

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File,
  category: keyof typeof FILE_TYPE_CONFIGS
): Promise<ValidationResult> {
  const config = FILE_TYPE_CONFIGS[category];

  if (!config) {
    return { valid: false, error: 'Categoría de archivo desconocida' };
  }

  // 1. Check file size
  if (file.size > config.maxSize) {
    const maxMB = Math.round(config.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo de ${maxMB}MB`,
      details: { fileSize: file.size },
    };
  }

  // 2. Check MIME type
  if (!config.mimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido',
      details: { declaredType: file.type },
    };
  }

  // 3. Check extension
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!config.extensions.includes(extension)) {
    return {
      valid: false,
      error: `Extensión de archivo no permitida: ${extension}`,
      details: { extension },
    };
  }

  // 4. Magic byte validation
  if (config.magicBytes) {
    const arrayBuffer = await file.slice(0, 100).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const { valid, detectedType } = validateMagicBytes(bytes, config.mimeTypes);

    if (!valid) {
      return {
        valid: false,
        error: 'El contenido del archivo no coincide con su tipo declarado',
        details: { detectedType: detectedType || 'unknown', declaredType: file.type },
      };
    }
  }

  // 5. Special checks for SVG
  if (file.type === 'image/svg+xml') {
    const text = await file.text();
    const analysis = analyzeSvgContent(text);

    if (!analysis.safe) {
      return {
        valid: false,
        error: `SVG contiene contenido potencialmente inseguro: ${analysis.issues.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Quick client-side validation (synchronous)
 */
export function validateFileQuick(
  file: File,
  category: keyof typeof FILE_TYPE_CONFIGS
): ValidationResult {
  const config = FILE_TYPE_CONFIGS[category];

  if (!config) {
    return { valid: false, error: 'Categoría de archivo desconocida' };
  }

  // Size check
  if (file.size > config.maxSize) {
    const maxMB = Math.round(config.maxSize / (1024 * 1024));
    return { valid: false, error: `Máximo ${maxMB}MB permitido` };
  }

  // MIME type check
  if (!config.mimeTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido' };
  }

  // Extension check
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!config.extensions.includes(extension)) {
    return { valid: false, error: `Extensión no permitida: ${extension}` };
  }

  return { valid: true };
}

// ============================================
// Exports
// ============================================

export { FILE_SIGNATURES as MAGIC_BYTES };
