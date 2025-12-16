'use client';

/**
 * Login Page Loading State
 *
 * Skeleton loader displayed while the login page is loading.
 * Uses Suspense boundary for smoother page transitions.
 */

import { AuthPageSkeleton } from '@/components/auth';

export default function LoginLoading() {
  return <AuthPageSkeleton />;
}
