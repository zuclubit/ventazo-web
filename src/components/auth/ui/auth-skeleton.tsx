'use client';

/**
 * Auth Skeleton Components
 *
 * Loading skeletons for authentication pages.
 * Provides visual feedback while content is loading.
 */

import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ============================================
// Auth Form Skeleton
// ============================================

export function AuthFormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Form fields skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      {/* Button skeleton */}
      <Skeleton className="h-10 w-full mt-4" />
      {/* Link skeleton */}
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  );
}

// ============================================
// Auth Card Skeleton
// ============================================

export function AuthCardSkeleton() {
  return (
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
        <AuthFormSkeleton />
      </CardContent>
    </Card>
  );
}

// ============================================
// Auth Page Skeleton
// ============================================

export function AuthPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <AuthCardSkeleton />
    </div>
  );
}

// ============================================
// Register Form Skeleton (with more fields)
// ============================================

export function RegisterFormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Name field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      {/* Email field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      {/* Password field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
        {/* Strength indicator */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-1 flex-1 rounded-full" />
          ))}
        </div>
      </div>
      {/* Confirm password field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-full" />
      </div>
      {/* Button skeleton */}
      <Skeleton className="h-10 w-full mt-4" />
      {/* Link skeleton */}
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  );
}

// ============================================
// Input Field Skeleton
// ============================================

export function InputFieldSkeleton({ showLabel = true }: { showLabel?: boolean }) {
  return (
    <div className="space-y-2">
      {showLabel && <Skeleton className="h-4 w-24" />}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// ============================================
// Button Skeleton
// ============================================

export function ButtonSkeleton({ fullWidth = true }: { fullWidth?: boolean }) {
  return (
    <Skeleton className={`h-10 ${fullWidth ? 'w-full' : 'w-32'}`} />
  );
}

// ============================================
// Loading Spinner
// ============================================

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]}`} />
  );
}

// ============================================
// Full Page Loading
// ============================================

export function FullPageLoading({ message }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
}
