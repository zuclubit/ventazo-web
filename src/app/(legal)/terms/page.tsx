import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terminos de Servicio - Ventazo CRM',
  description: 'Terminos y condiciones de uso de Ventazo CRM',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">Terminos de Servicio</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-muted-foreground">
          Ultima actualizacion: Diciembre 2025
        </p>

        <h2 className="mt-8 text-xl font-semibold">1. Aceptacion de los Terminos</h2>
        <p>
          Al acceder y utilizar Ventazo CRM, aceptas estos terminos de servicio.
          Si no estas de acuerdo con alguna parte de estos terminos, no podras usar nuestros servicios.
        </p>

        <h2 className="mt-8 text-xl font-semibold">2. Descripcion del Servicio</h2>
        <p>
          Ventazo CRM es una plataforma de gestion de relaciones con clientes (CRM)
          disenada para mercados de America Latina. Ofrecemos herramientas para la gestion
          de leads, oportunidades, clientes y automatizacion de ventas.
        </p>

        <h2 className="mt-8 text-xl font-semibold">3. Cuentas de Usuario</h2>
        <p>
          Eres responsable de mantener la confidencialidad de tu cuenta y contrasena.
          Debes notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta.
        </p>

        <h2 className="mt-8 text-xl font-semibold">4. Uso Aceptable</h2>
        <p>
          Te comprometes a usar el servicio solo para fines legales y de acuerdo con estos terminos.
          No debes usar el servicio de manera que pueda danar, deshabilitar o sobrecargar nuestros sistemas.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Propiedad Intelectual</h2>
        <p>
          El servicio y su contenido original son propiedad de Zuclubit.
          No puedes reproducir, distribuir o crear obras derivadas sin autorizacion expresa.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Limitacion de Responsabilidad</h2>
        <p>
          En ningún caso Zuclubit sera responsable por danos indirectos, incidentales,
          especiales o consecuentes que resulten del uso del servicio.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Contacto</h2>
        <p>
          Para preguntas sobre estos terminos, contactanos en{' '}
          <a href="mailto:legal@zuclubit.com" className="text-ventazo-600 hover:underline">
            legal@zuclubit.com
          </a>
        </p>
      </div>
    </div>
  );
}
