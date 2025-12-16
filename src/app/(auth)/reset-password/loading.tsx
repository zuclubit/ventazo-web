'use client';

/**
 * Reset Password Page Loading State
 *
 * Skeleton loader displayed while the reset password page is loading.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RegisterFormSkeleton } from '@/components/auth';

export default function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          {/* Logo skeleton */}
          <div className="mx-auto">
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
          {/* Title skeleton */}
          <Skeleton className="h-8 w-52 mx-auto" />
          {/* Subtitle skeleton */}
          <Skeleton className="h-4 w-72 mx-auto" />
        </CardHeader>
        <CardContent>
          {/* Password fields skeleton */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-1 flex-1 rounded-full" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full mt-4" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
