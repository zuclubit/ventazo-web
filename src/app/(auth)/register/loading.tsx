'use client';

/**
 * Register Page Loading State
 *
 * Skeleton loader displayed while the register page is loading.
 * Uses RegisterFormSkeleton for more accurate visual representation.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RegisterFormSkeleton } from '@/components/auth';

export default function RegisterLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          {/* Logo skeleton */}
          <div className="mx-auto">
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
          {/* Title skeleton */}
          <Skeleton className="h-8 w-48 mx-auto" />
          {/* Subtitle skeleton */}
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>
        <CardContent>
          <RegisterFormSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
