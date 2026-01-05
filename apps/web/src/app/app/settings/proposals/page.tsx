import { TemplateList } from './components';

export const metadata = {
  title: 'Plantillas de Propuesta | Ventazo',
  description: 'Personaliza el formato de tus cotizaciones PDF',
};

export default function ProposalsSettingsPage() {
  return (
    <div className="container py-6 max-w-7xl">
      <TemplateList />
    </div>
  );
}
