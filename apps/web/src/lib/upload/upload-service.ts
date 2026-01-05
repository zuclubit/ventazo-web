/**
 * Upload Service - Secure File Upload Handler
 *
 * Provides a unified interface for secure file uploads with:
 * - File validation (type, size, magic bytes)
 * - Virus scanning
 * - Image processing
 * - Storage management
 *
 * Authentication uses native JWT (no Supabase Auth dependency)
 *
 * @module lib/upload/upload-service
 */

import { createServiceClient, type SupabaseClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { v4 as uuidv4 } from 'uuid';

import {
  validateFile,
  sanitizeFilename,
  sanitizeSvg,
  generateStorageKey,
  FILE_TYPE_CONFIGS,
  type FileTypeConfig,
} from './file-validator';
import { quickScan, type ScanResult } from './virus-scanner';

// ============================================
// Types
// ============================================

export interface UploadOptions {
  category: keyof typeof FILE_TYPE_CONFIGS;
  userId?: string;
  tenantId?: string;
  bucket?: string;
  customValidation?: (file: File) => Promise<{ valid: boolean; error?: string }>;
  skipVirusScan?: boolean;
  processImage?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  hash?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================
// Image Processing
// ============================================

/**
 * Process image on server-side (Edge-compatible)
 * Note: This is a basic implementation. For production, consider using Sharp
 */
async function processImage(
  data: Uint8Array,
  mimeType: string,
  options: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<{ data: Uint8Array; mimeType: string }> {
  // For SVG, sanitize content
  if (mimeType === 'image/svg+xml') {
    const decoder = new TextDecoder('utf-8');
    const encoder = new TextEncoder();
    const content = decoder.decode(data);
    const sanitized = sanitizeSvg(content);
    return { data: encoder.encode(sanitized), mimeType };
  }

  // For other images, we'd use Sharp here
  // For now, return as-is (Sharp can be added later)
  return { data, mimeType };
}

// ============================================
// Rate Limiting (Simple in-memory)
// ============================================

const uploadRateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 uploads per minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = uploadRateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    uploadRateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - limit.count };
}

// ============================================
// Upload Service
// ============================================

export class UploadService {
  private supabase: SupabaseClient;
  private userId: string;
  private tenantId?: string;

  /**
   * Create an UploadService instance
   * @param supabase - Supabase client (must be pre-authenticated)
   * @param userId - User ID for the upload
   * @param tenantId - Optional tenant ID
   */
  constructor(supabase: SupabaseClient, userId: string, tenantId?: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.tenantId = tenantId;
  }

  /**
   * Upload a file with full validation pipeline
   */
  async upload(file: File, options: UploadOptions): Promise<UploadResult> {
    const {
      category,
      bucket = this.getBucketForCategory(category),
      customValidation,
      skipVirusScan = false,
      processImage: shouldProcessImage = true,
      maxWidth = 1024,
      maxHeight = 1024,
      quality = 85,
    } = options;

    // 1. Rate limiting
    const rateCheck = checkRateLimit(this.userId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: 'Demasiados archivos. Intenta de nuevo en un minuto.',
        details: { rateLimited: true },
      };
    }

    // 2. File validation
    const validation = await validateFile(file, category);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        details: validation.details,
      };
    }

    // 3. Custom validation (if provided)
    if (customValidation) {
      const customResult = await customValidation(file);
      if (!customResult.valid) {
        return {
          success: false,
          error: customResult.error || 'Validación personalizada fallida',
        };
      }
    }

    // 4. Virus scan
    if (!skipVirusScan) {
      const scanResult = await quickScan(file);
      if (!scanResult.safe) {
        console.warn(`[UploadService] Potential threat detected in file from user ${this.userId}:`, scanResult.threats);
        return {
          success: false,
          error: 'El archivo contiene contenido potencialmente peligroso',
          details: { threats: scanResult.threats, scanMethod: scanResult.scanMethod },
        };
      }
    }

    // 5. Read file content (Edge-compatible)
    const arrayBuffer = await file.arrayBuffer();
    let fileData = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
    let mimeType = file.type;

    // 6. Process image if needed
    if (shouldProcessImage && mimeType.startsWith('image/')) {
      const processed = await processImage(fileData, mimeType, { maxWidth, maxHeight, quality });
      fileData = processed.data as Uint8Array<ArrayBuffer>;
      mimeType = processed.mimeType;
    }

    // 7. Generate storage key
    const sanitizedName = sanitizeFilename(file.name);
    const storageKey = generateStorageKey(this.userId, category, sanitizedName);

    // 8. Upload to Supabase
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(storageKey, fileData, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year
        upsert: false,
      });

    if (uploadError) {
      console.error('[UploadService] Storage error:', uploadError);
      return {
        success: false,
        error: this.getStorageErrorMessage(uploadError),
        details: { storageError: uploadError.message },
      };
    }

    // 9. Get public URL
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    if (!urlData?.publicUrl) {
      return {
        success: false,
        error: 'Error al generar la URL del archivo',
      };
    }

    // 10. Log successful upload
    console.log(`[UploadService] Upload success: ${storageKey} (${fileData.length} bytes)`);

    return {
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      filename: sanitizedName,
      size: fileData.length,
      mimeType,
    };
  }

  /**
   * Delete a file from storage
   */
  async delete(path: string, bucket: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('[UploadService] Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /**
   * Get bucket name for category
   */
  private getBucketForCategory(category: string): string {
    const bucketMap: Record<string, string> = {
      logo: 'logos',
      avatar: 'avatars',
      image: 'images',
      document: 'documents',
      spreadsheet: 'documents',
      attachment: 'attachments',
    };
    return bucketMap[category] || 'uploads';
  }

  /**
   * Get user-friendly error message for storage errors
   */
  private getStorageErrorMessage(error: { message: string }): string {
    if (error.message.includes('Bucket not found')) {
      return 'El almacenamiento no está configurado. Contacta al administrador.';
    }
    if (error.message.includes('payload too large')) {
      return 'El archivo es demasiado grande.';
    }
    if (error.message.includes('duplicate')) {
      return 'Ya existe un archivo con este nombre.';
    }
    return 'Error al subir el archivo. Intenta de nuevo.';
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create an upload service instance from request context
 * This function handles authentication via native JWT session
 */
export async function createUploadService(): Promise<{ service: UploadService | null; error?: string }> {
  try {
    // Get session from native JWT (no Supabase Auth dependency)
    const session = await getSession();

    if (!session?.userId) {
      return { service: null, error: 'No autenticado' };
    }

    // Use Supabase service client for storage operations only
    const supabase = await createServiceClient();

    return {
      service: new UploadService(supabase, session.userId, session.tenantId),
    };
  } catch (error) {
    console.error('[createUploadService] Error:', error);
    return { service: null, error: 'Error de inicialización' };
  }
}

// ============================================
// Exports
// ============================================

export { FILE_TYPE_CONFIGS };
