import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import { GuestGuard, AuthLayout } from '@/components/auth';
import { Card, CardContent } from '@/components/ui/card';

import { ResetPasswordForm } from './reset-password-form';

// Loading fallback
function LoadingFallback() {
  return (
    <GuestGuard>
      <AuthLayout variant="gradient" showFooter>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Cargando...
            </p>
          </CardContent>
        </Card>
      </AuthLayout>
    </GuestGuard>
  );
}

/**
 * Reset Password Page
 *
 * Password reset page accessed from email link.
 * Wrapped in Suspense for useSearchParams compatibility.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
