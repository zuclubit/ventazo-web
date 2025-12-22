'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useOnboardingStore } from '@/store/onboarding.store';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data } = useOnboardingStore();

  // Redirect to signup if no user data
  useEffect(() => {
    if (!data.userId) {
      // Check if there's an authenticated user from Supabase
      // For now, allow access for development
      // In production, redirect to signup
      // router.push('/signup');
    }
  }, [data.userId, router]);

  return <>{children}</>;
}
