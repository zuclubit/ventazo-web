import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

import { InviteAcceptContent } from './invite-accept-content';

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando invitación...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitationAcceptPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InviteAcceptContent />
    </Suspense>
  );
}
