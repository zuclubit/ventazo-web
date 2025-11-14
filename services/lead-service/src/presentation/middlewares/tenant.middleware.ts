import { Request, Response, NextFunction } from 'express';

/**
 * Tenant context middleware
 * Extracts tenant ID from JWT token (placeholder for now)
 * In production, this would validate JWT and extract tenant_id from claims
 */
export const tenantContext = (req: Request, res: Response, next: NextFunction): void => {
  // TODO: Implement JWT validation with Supabase Auth
  // For now, expect tenant ID in header for development
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Tenant ID is required',
    });
    return;
  }

  // Attach to request
  (req as Request & { tenantId: string }).tenantId = tenantId;
  next();
};
