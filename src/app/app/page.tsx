import { ArrowDown, ArrowUp, DollarSign, Target, TrendingUp, Users } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  {
    title: 'Total Leads',
    value: '1,234',
    change: '+12.5%',
    trend: 'up',
    icon: Users,
    description: 'vs. mes anterior',
  },
  {
    title: 'Oportunidades Activas',
    value: '89',
    change: '+4.3%',
    trend: 'up',
    icon: Target,
    description: 'vs. mes anterior',
  },
  {
    title: 'Valor en Pipeline',
    value: '$2.4M',
    change: '-2.1%',
    trend: 'down',
    icon: DollarSign,
    description: 'MXN vs. mes anterior',
  },
  {
    title: 'Tasa de Conversión',
    value: '24.5%',
    change: '+8.2%',
    trend: 'up',
    icon: TrendingUp,
    description: 'vs. mes anterior',
  },
];

const recentLeads = [
  { name: 'María García', email: 'maria@ejemplo.com', status: 'new', score: 85 },
  { name: 'Juan Pérez', email: 'juan@techcorp.mx', status: 'contacted', score: 72 },
  { name: 'Ana Rodríguez', email: 'ana@startup.io', status: 'qualified', score: 91 },
  { name: 'Carlos López', email: 'carlos@empresa.com', status: 'proposal', score: 68 },
  { name: 'Laura Martínez', email: 'laura@corp.mx', status: 'negotiation', score: 88 },
];

const statusLabels: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        description="Vista general de tu actividad de ventas"
        title="Dashboard"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stat.trend === 'up' ? (
                  <ArrowUp className="mr-1 h-3 w-3 text-success" />
                ) : (
                  <ArrowDown className="mr-1 h-3 w-3 text-destructive" />
                )}
                <span
                  className={
                    stat.trend === 'up' ? 'text-success' : 'text-destructive'
                  }
                >
                  {stat.change}
                </span>
                <span className="ml-1">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Leads */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Leads Recientes</CardTitle>
            <CardDescription>
              Últimos leads agregados a tu pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div
                  key={lead.email}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        {lead.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium status-${lead.status}`}
                    >
                      {statusLabels[lead.status]}
                    </span>
                    <div className="w-12 text-right">
                      <span
                        className={`text-sm font-medium ${
                          lead.score >= 80
                            ? 'text-success'
                            : lead.score >= 60
                              ? 'text-warning'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {lead.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas acciones en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  action: 'Lead calificado',
                  target: 'María García',
                  time: 'Hace 5 min',
                },
                {
                  action: 'Email enviado',
                  target: 'Juan Pérez',
                  time: 'Hace 15 min',
                },
                {
                  action: 'Reunión programada',
                  target: 'Ana Rodríguez',
                  time: 'Hace 1 hora',
                },
                {
                  action: 'Propuesta enviada',
                  target: 'Carlos López',
                  time: 'Hace 2 horas',
                },
                {
                  action: 'Nuevo lead',
                  target: 'Laura Martínez',
                  time: 'Hace 3 horas',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.target}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
