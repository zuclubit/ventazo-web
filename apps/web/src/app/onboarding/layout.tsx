'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth';
import { SplashScreen } from '@/components/common/splash-screen';
import { useOnboardingStore } from '@/store/onboarding.store';

/**
 * Onboarding Layout
 *
 * Protects onboarding routes:
 * - Requires authentication
 * - Syncs auth user data to onboarding store
 * - Middleware handles the primary routing logic
 *
 * SPA OPTIMIZATION: Uses hasInitialized to show splash only during
 * first auth check. After that, content renders immediately.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasInitialized } = useAuth();
  const { data, updateData } = useOnboardingStore();

  // Sync auth user data to onboarding store
  React.useEffect(() => {
    if (isAuthenticated && user && !data.userId) {
      updateData({
        userId: user.id,
        email: user.email,
      });
    }
  }, [isAuthenticated, user, data.userId, updateData]);

  // Redirect to signup if not authenticated (only after initial check)
  React.useEffect(() => {
    if (hasInitialized && !isAuthenticated) {
      router.push('/signup');
    }
  }, [hasInitialized, isAuthenticated, router]);

  // FIRST LOAD ONLY: Show splash during initial auth check
  // After hasInitialized is true, never show splash again
  if (!hasInitialized && isLoading) {
    return <SplashScreen message="Verificando sesión..." variant="branded" />;
  }

  // Don't render until authenticated (waiting for redirect)
  if (hasInitialized && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
