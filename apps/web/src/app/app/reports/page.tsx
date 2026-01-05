'use client';

/**
 * Reports Page - Coming Soon
 *
 * Placeholder page for the reports/analytics feature.
 */

import { BarChart3, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Reportes
      </h1>

      <p className="text-muted-foreground text-center max-w-md mb-6">
        El módulo de reportes estará disponible próximamente.
        Podrás generar informes personalizados y analizar el rendimiento de ventas.
      </p>

      <Button variant="outline" asChild>
        <Link href="/app">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Link>
      </Button>
    </div>
  );
}
