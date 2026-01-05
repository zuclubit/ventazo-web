import { Suspense } from 'react';

import { AuthPageSkeleton } from '@/components/auth';

import { LoginForm } from './login-form';

/**
 * Login Page
 *
 * Premium 2025 authentication page with split-screen layout.
 * Wrapped in Suspense for useSearchParams compatibility.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
