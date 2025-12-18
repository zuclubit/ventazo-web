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
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
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

  // Redirect to signup if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signup');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (isLoading) {
    return <SplashScreen message="Verificando sesión..." variant="branded" />;
  }

  // Don't render until authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
