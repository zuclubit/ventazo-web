import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de Privacidad - Ventazo CRM',
  description: 'Politica de privacidad y proteccion de datos de Ventazo CRM',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">Politica de Privacidad</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-muted-foreground">
          Ultima actualizacion: Diciembre 2025
        </p>

        <h2 className="mt-8 text-xl font-semibold">1. Informacion que Recopilamos</h2>
        <p>
          Recopilamos informacion que nos proporcionas directamente, como tu nombre,
          correo electronico, informacion de la empresa y datos de contacto de tus clientes.
        </p>

        <h2 className="mt-8 text-xl font-semibold">2. Uso de la Informacion</h2>
        <p>
          Utilizamos la informacion recopilada para:
        </p>
        <ul className="list-disc pl-6">
          <li>Proporcionar y mantener nuestros servicios</li>
          <li>Mejorar y personalizar tu experiencia</li>
          <li>Comunicarnos contigo sobre actualizaciones y promociones</li>
          <li>Proteger contra actividades fraudulentas</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">3. Compartir Informacion</h2>
        <p>
          No vendemos ni compartimos tu informacion personal con terceros,
          excepto cuando sea necesario para proporcionar nuestros servicios
          o cuando la ley lo requiera.
        </p>

        <h2 className="mt-8 text-xl font-semibold">4. Seguridad de los Datos</h2>
        <p>
          Implementamos medidas de seguridad tecnicas y organizativas para proteger
          tu informacion contra acceso no autorizado, alteracion o destruccion.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Tus Derechos</h2>
        <p>
          Tienes derecho a acceder, corregir o eliminar tu informacion personal.
          Tambien puedes oponerte al procesamiento de tus datos o solicitar su portabilidad.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Cookies</h2>
        <p>
          Utilizamos cookies y tecnologias similares para mejorar tu experiencia,
          analizar el uso del servicio y personalizar el contenido.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Retencion de Datos</h2>
        <p>
          Conservamos tu informacion mientras tu cuenta este activa o sea necesario
          para proporcionarte servicios. Puedes solicitar la eliminacion de tus datos
          en cualquier momento.
        </p>

        <h2 className="mt-8 text-xl font-semibold">8. Contacto</h2>
        <p>
          Para preguntas sobre privacidad, contactanos en{' '}
          <a href="mailto:privacy@zuclubit.com" className="text-ventazo-600 hover:underline">
            privacy@zuclubit.com
          </a>
        </p>
      </div>
    </div>
  );
}
