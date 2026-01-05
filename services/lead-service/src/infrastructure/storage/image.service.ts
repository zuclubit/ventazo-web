/**
 * Image Processing Service
 * Handles image compression and optimization using Sharp (P0.4)
 */

import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import sharp from 'sharp';

/**
 * Image processing options
 */
export interface ImageProcessOptions {
  /** Maximum width (preserves aspect ratio) */
  maxWidth?: number;
  /** Maximum height (preserves aspect ratio) */
  maxHeight?: number;
  /** Output format */
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  /** Quality (1-100, default: 80) */
  quality?: number;
  /** Enable progressive loading */
  progressive?: boolean;
  /** Strip metadata */
  stripMetadata?: boolean;
  /** Resize fit mode */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  /** Background color for transparency */
  background?: { r: number; g: number; b: number; alpha: number };
}

/**
 * Processed image result
 */
export interface ProcessedImage {
  /** Processed image buffer */
  buffer: Buffer;
  /** Output format */
  format: string;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasAlpha: boolean;
  isAnimated: boolean;
}

// Default options
const DEFAULT_OPTIONS: ImageProcessOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  format: 'webp',
  quality: 80,
  progressive: true,
  stripMetadata: true,
  fit: 'inside',
  background: { r: 255, g: 255, b: 255, alpha: 1 },
};

// Logo-specific options
const LOGO_OPTIONS: ImageProcessOptions = {
  maxWidth: 512,
  maxHeight: 512,
  format: 'webp',
  quality: 90,
  progressive: true,
  stripMetadata: true,
  fit: 'inside',
  background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
};

// Avatar-specific options
const AVATAR_OPTIONS: ImageProcessOptions = {
  maxWidth: 256,
  maxHeight: 256,
  format: 'webp',
  quality: 85,
  progressive: true,
  stripMetadata: true,
  fit: 'cover',
  background: { r: 255, g: 255, b: 255, alpha: 1 },
};

// Thumbnail options
const THUMBNAIL_OPTIONS: ImageProcessOptions = {
  maxWidth: 150,
  maxHeight: 150,
  format: 'webp',
  quality: 75,
  progressive: true,
  stripMetadata: true,
  fit: 'cover',
  background: { r: 255, g: 255, b: 255, alpha: 1 },
};

@injectable()
export class ImageService {
  /**
   * Process image with given options
   */
  async processImage(
    input: Buffer | string,
    options: ImageProcessOptions = {}
  ): Promise<Result<ProcessedImage>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      let pipeline = sharp(input);

      // Get metadata first
      const metadata = await pipeline.metadata();

      // Resize if needed
      if (opts.maxWidth || opts.maxHeight) {
        pipeline = pipeline.resize({
          width: opts.maxWidth,
          height: opts.maxHeight,
          fit: opts.fit,
          background: opts.background,
          withoutEnlargement: true,
        });
      }

      // Set output format and quality
      switch (opts.format) {
        case 'webp':
          pipeline = pipeline.webp({
            quality: opts.quality,
            lossless: false,
            nearLossless: opts.quality && opts.quality >= 90,
          });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: opts.quality,
            progressive: opts.progressive,
            mozjpeg: true,
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            progressive: opts.progressive,
            compressionLevel: 9,
          });
          break;
        case 'avif':
          pipeline = pipeline.avif({
            quality: opts.quality,
            lossless: false,
          });
          break;
      }

      // Strip metadata if requested
      if (opts.stripMetadata) {
        pipeline = pipeline.rotate(); // This removes EXIF orientation and other metadata
      }

      // Process
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

      const result: ProcessedImage = {
        buffer: data,
        format: info.format,
        width: info.width,
        height: info.height,
        size: info.size,
        mimeType: `image/${info.format === 'jpeg' ? 'jpeg' : info.format}`,
      };

      return Result.ok(result);
    } catch (error) {
      console.error('[ImageService] Process error:', error);
      return Result.fail(
        `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process logo image (optimized settings)
   */
  async processLogo(input: Buffer | string): Promise<Result<ProcessedImage>> {
    return this.processImage(input, LOGO_OPTIONS);
  }

  /**
   * Process avatar image (square, optimized)
   */
  async processAvatar(input: Buffer | string): Promise<Result<ProcessedImage>> {
    return this.processImage(input, AVATAR_OPTIONS);
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(input: Buffer | string): Promise<Result<ProcessedImage>> {
    return this.processImage(input, THUMBNAIL_OPTIONS);
  }

  /**
   * Get image metadata without processing
   */
  async getMetadata(input: Buffer | string): Promise<Result<ImageMetadata>> {
    try {
      const metadata = await sharp(input).metadata();

      return Result.ok({
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: metadata.size || 0,
        hasAlpha: metadata.hasAlpha || false,
        isAnimated: (metadata.pages || 1) > 1,
      });
    } catch (error) {
      console.error('[ImageService] Metadata error:', error);
      return Result.fail(
        `Failed to get metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate image
   */
  async validateImage(
    input: Buffer | string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      maxSize?: number;
      allowedFormats?: string[];
    } = {}
  ): Promise<Result<{ valid: boolean; errors: string[] }>> {
    const {
      maxWidth = 4096,
      maxHeight = 4096,
      maxSize = 10 * 1024 * 1024, // 10MB
      allowedFormats = ['jpeg', 'png', 'webp', 'gif', 'avif'],
    } = options;

    try {
      const metadataResult = await this.getMetadata(input);

      if (metadataResult.isFailure) {
        return Result.ok({ valid: false, errors: ['Invalid or corrupted image file'] });
      }

      const metadata = metadataResult.value!;
      const errors: string[] = [];

      // Check format
      if (!allowedFormats.includes(metadata.format)) {
        errors.push(`Format "${metadata.format}" not allowed. Allowed: ${allowedFormats.join(', ')}`);
      }

      // Check dimensions
      if (metadata.width > maxWidth) {
        errors.push(`Width ${metadata.width}px exceeds maximum ${maxWidth}px`);
      }

      if (metadata.height > maxHeight) {
        errors.push(`Height ${metadata.height}px exceeds maximum ${maxHeight}px`);
      }

      // Check size
      if (metadata.size > maxSize) {
        errors.push(`File size ${Math.round(metadata.size / 1024)}KB exceeds maximum ${Math.round(maxSize / 1024)}KB`);
      }

      return Result.ok({
        valid: errors.length === 0,
        errors,
      });
    } catch (error) {
      console.error('[ImageService] Validation error:', error);
      return Result.ok({
        valid: false,
        errors: ['Failed to validate image'],
      });
    }
  }

  /**
   * Convert image to base64 data URL
   */
  async toDataUrl(input: Buffer | string): Promise<Result<string>> {
    try {
      const metadata = await sharp(input).metadata();
      const buffer = await sharp(input).toBuffer();

      const mimeType = metadata.format === 'jpeg' ? 'image/jpeg' : `image/${metadata.format}`;
      const base64 = buffer.toString('base64');

      return Result.ok(`data:${mimeType};base64,${base64}`);
    } catch (error) {
      console.error('[ImageService] Data URL error:', error);
      return Result.fail(
        `Failed to convert to data URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
