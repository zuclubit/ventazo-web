import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware
 * Catches all errors and returns consistent error responses
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error('Error:', err);

  // Default to 500 server error
  const statusCode = (err as Error & { statusCode?: number }).statusCode || 500;

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};
