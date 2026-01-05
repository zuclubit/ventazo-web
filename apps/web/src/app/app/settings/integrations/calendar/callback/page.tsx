'use client';

/**
 * Calendar OAuth Callback Page
 *
 * Handles OAuth callback from Google/Microsoft and redirects to calendar settings.
 * The actual OAuth processing happens in the parent page.
 *
 * @module app/settings/integrations/calendar/callback
 */

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Calendar } from 'lucide-react';

export default function CalendarOAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    // Forward all query params to parent page for processing
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    // Redirect to calendar settings page with query params
    const redirectUrl = `/app/settings/integrations/calendar${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(redirectUrl);
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="p-4 rounded-full bg-primary/10">
        <Calendar className="h-8 w-8 text-primary" />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Procesando autorizacion...</span>
      </div>
    </div>
  );
}
