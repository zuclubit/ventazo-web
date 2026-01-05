/**
 * Upload Module - Secure File Upload System
 *
 * Provides comprehensive file upload functionality with:
 * - File validation (type, size, magic bytes)
 * - Virus/malware scanning
 * - Image processing and sanitization
 * - Rate limiting
 * - Secure storage
 *
 * @module lib/upload
 */

// File Validator
export {
  validateFile,
  validateFileQuick,
  validateMagicBytes,
  detectFileType,
  sanitizeFilename,
  sanitizeSvg,
  analyzeSvgContent,
  generateStorageKey,
  FILE_TYPE_CONFIGS,
  FILE_SIGNATURES,
  MAGIC_BYTES,
  type FileTypeConfig,
  type ValidationResult,
} from './file-validator';

// Virus Scanner
export {
  scanFile,
  quickScan,
  heuristicScan,
  hashBasedScan,
  calculateFileHash,
  type ScanResult,
  type ScanOptions,
} from './virus-scanner';

// Upload Service
export {
  UploadService,
  createUploadService,
  type UploadOptions,
  type UploadResult,
} from './upload-service';
