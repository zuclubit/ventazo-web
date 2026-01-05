/**
 * Supabase Storage Provider
 * Implements file storage using Supabase Storage
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  IStorageProvider,
  StorageProvider,
  UploadOptions,
  UploadResult,
  PresignedUrl,
  FileMetadata,
} from './types';

export interface SupabaseProviderConfig {
  url: string;
  serviceKey: string;
  bucket: string;
}

export class SupabaseStorageProvider implements IStorageProvider {
  readonly provider: StorageProvider = 'supabase';
  private client: SupabaseClient;
  private bucket: string;

  constructor(private config: SupabaseProviderConfig) {
    this.bucket = config.bucket;
    this.client = createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Upload a file to Supabase Storage
   */
  async upload(
    key: string,
    buffer: Buffer,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .upload(key, buffer, {
        contentType: options?.contentType || mimeType,
        cacheControl: options?.cacheControl || '31536000',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const publicUrl = this.getPublicUrl(key);

    return {
      key: data.path,
      url: publicUrl,
      bucket: this.bucket,
    };
  }

  /**
   * Download a file from Supabase Storage
   */
  async download(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(key);

    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
  }

  /**
   * Delete a file from Supabase Storage
   */
  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([key]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .list(key.substring(0, key.lastIndexOf('/')), {
          search: key.substring(key.lastIndexOf('/') + 1),
        });

      if (error) {
        return false;
      }

      return data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get presigned URL for upload
   */
  async getUploadUrl(
    key: string,
    _mimeType: string,
    expiresIn: number = 3600
  ): Promise<PresignedUrl> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(key);

    if (error) {
      throw new Error(`Failed to create upload URL: ${error.message}`);
    }

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      fields: {
        token: data.token,
      },
    };
  }

  /**
   * Get presigned URL for download
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresIn);

    if (error) {
      throw new Error(`Failed to create download URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Copy a file within Supabase Storage
   */
  async copy(sourceKey: string, destKey: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .copy(sourceKey, destKey);

    if (error) {
      throw new Error(`Copy failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   * Note: Supabase Storage doesn't have a direct metadata API,
   * so we fetch the file info from the list
   */
  async getMetadata(key: string): Promise<FileMetadata> {
    const folder = key.substring(0, key.lastIndexOf('/'));
    const fileName = key.substring(key.lastIndexOf('/') + 1);

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(folder, {
        search: fileName,
      });

    if (error || !data || data.length === 0) {
      throw new Error(`File not found: ${key}`);
    }

    const file = data.find((f) => f.name === fileName);
    if (!file) {
      throw new Error(`File not found: ${key}`);
    }

    return {
      key,
      size: file.metadata?.size || 0,
      mimeType: file.metadata?.mimetype || 'application/octet-stream',
      lastModified: new Date(file.updated_at || file.created_at),
      metadata: file.metadata as Record<string, string> | undefined,
    };
  }

  /**
   * Get public URL
   */
  private getPublicUrl(key: string): string {
    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(key);

    return data.publicUrl;
  }
}
