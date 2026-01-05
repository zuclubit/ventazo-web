'use client';

import { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  MapPin,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Trophy,
  Zap,
  BarChart3,
  Clock
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

// Host Cities Data
const HOST_CITIES = [
  { code: 'MEX', name: 'Ciudad de México', country: 'Mexico', matches: 6 },
  { code: 'GDL', name: 'Guadalajara', country: 'Mexico', matches: 5 },
  { code: 'MTY', name: 'Monterrey', country: 'Mexico', matches: 5 },
  { code: 'LAX', name: 'Los Angeles', country: 'USA', matches: 8 },
  { code: 'NYC', name: 'New York/New Jersey', country: 'USA', matches: 8 },
  { code: 'DFW', name: 'Dallas', country: 'USA', matches: 9 },
  { code: 'MIA', name: 'Miami', country: 'USA', matches: 7 },
  { code: 'ATL', name: 'Atlanta', country: 'USA', matches: 8 },
  { code: 'SEA', name: 'Seattle', country: 'USA', matches: 6 },
  { code: 'SFO', name: 'San Francisco', country: 'USA', matches: 6 },
  { code: 'HOU', name: 'Houston', country: 'USA', matches: 6 },
  { code: 'BOS', name: 'Boston', country: 'USA', matches: 7 },
  { code: 'PHL', name: 'Philadelphia', country: 'USA', matches: 6 },
  { code: 'MCI', name: 'Kansas City', country: 'USA', matches: 6 },
  { code: 'YYZ', name: 'Toronto', country: 'Canada', matches: 6 },
  { code: 'VAN', name: 'Vancouver', country: 'Canada', matches: 7 },
];

// Mock forecast data
const generateForecastData = (days: number) => {
  const data = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Simulate higher demand on weekends and match days
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const hasMatch = Math.random() > 0.6;

    let demandIndex = 100;
    if (isWeekend) demandIndex += 20;
    if (hasMatch) demandIndex += 50 + Math.random() * 50;
    demandIndex += Math.random() * 20 - 10;

    data.push({
      date: date.toISOString().split('T')[0],
      demandIndex: Math.round(demandIndex),
      hasMatch,
      matchInfo: hasMatch ? 'USA vs MEX' : null,
    });
  }

  return data;
};

const stats = [
  {
    title: 'Índice de Demanda Actual',
    value: '156%',
    change: '+23%',
    trend: 'up',
    icon: TrendingUp,
    description: 'vs. día normal',
  },
  {
    title: 'Visitantes Esperados',
    value: '45,000',
    change: '+180%',
    trend: 'up',
    icon: Users,
    description: 'próximos 7 días',
  },
  {
    title: 'Ingresos Proyectados',
    value: '$2.8M',
    change: '+95%',
    trend: 'up',
    icon: DollarSign,
    description: 'MXN próxima semana',
  },
  {
    title: 'Alertas Activas',
    value: '3',
    change: '',
    trend: 'neutral',
    icon: AlertTriangle,
    description: 'requieren atención',
  },
];

const upcomingMatches = [
  {
    id: 1,
    teams: 'USA vs México',
    date: '2026-06-15',
    time: '18:00',
    stadium: 'Estadio Azteca',
    demandImpact: 'EXTREME',
    expectedVisitors: 85000,
  },
  {
    id: 2,
    teams: 'Argentina vs Brasil',
    date: '2026-06-18',
    time: '20:00',
    stadium: 'Estadio Azteca',
    demandImpact: 'VERY_HIGH',
    expectedVisitors: 80000,
  },
  {
    id: 3,
    teams: 'España vs Alemania',
    date: '2026-06-20',
    time: '16:00',
    stadium: 'Estadio Akron',
    demandImpact: 'HIGH',
    expectedVisitors: 45000,
  },
];

const alerts = [
  {
    id: 1,
    type: 'EXTREME_DEMAND',
    severity: 'critical',
    message: 'Demanda extrema esperada para USA vs México',
    action: 'Maximizar personal y stock',
    expiresIn: '2 días',
  },
  {
    id: 2,
    type: 'STAFFING',
    severity: 'warning',
    message: 'Se requieren 8 empleados adicionales para el fin de semana',
    action: 'Contratar personal temporal',
    expiresIn: '5 días',
  },
  {
    id: 3,
    type: 'INVENTORY',
    severity: 'info',
    message: 'Stock de bebidas debe incrementarse 150%',
    action: 'Hacer pedido adicional',
    expiresIn: '3 días',
  },
];

const recommendations = [
  {
    category: 'Precios',
    icon: DollarSign,
    suggestion: 'Incrementar precios 25-35% durante partidos',
    impact: 'Alto',
    difficulty: 'Bajo',
  },
  {
    category: 'Personal',
    icon: Users,
    suggestion: 'Contratar 5 empleados bilingües temporales',
    impact: 'Alto',
    difficulty: 'Medio',
  },
  {
    category: 'Marketing',
    icon: Zap,
    suggestion: 'Lanzar promoción "Watch Party" en redes',
    impact: 'Medio',
    difficulty: 'Bajo',
  },
  {
    category: 'Inventario',
    icon: BarChart3,
    suggestion: 'Duplicar stock de cerveza y snacks',
    impact: 'Alto',
    difficulty: 'Medio',
  },
];

const getDemandColor = (impact: string) => {
  switch (impact) {
    case 'EXTREME': return 'bg-red-500';
    case 'VERY_HIGH': return 'bg-orange-500';
    case 'HIGH': return 'bg-yellow-500';
    case 'MEDIUM': return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'warning';
    default: return 'secondary';
  }
};

export default function WorldCupAnalyticsPage() {
  const [selectedCity, setSelectedCity] = useState('MEX');
  const forecastData = generateForecastData(14);

  const selectedCityData = HOST_CITIES.find(c => c.code === selectedCity);

  return (
    <>
      <PageHeader
        description="Predicciones de demanda y recomendaciones para el Mundial 2026"
        title={
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            WorldCup Analytics 2026
          </div>
        }
      />

      {/* City Selector */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Ciudad sede:</span>
        </div>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar ciudad" />
          </SelectTrigger>
          <SelectContent>
            {HOST_CITIES.map((city) => (
              <SelectItem key={city.code} value={city.code}>
                {city.name} ({city.country}) - {city.matches} partidos
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-auto">
          <Calendar className="mr-1 h-3 w-3" />
          11 Jun - 19 Jul 2026
        </Badge>
      </div>

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
                {stat.trend === 'up' && (
                  <ArrowUp className="mr-1 h-3 w-3 text-success" />
                )}
                {stat.trend === 'down' && (
                  <ArrowDown className="mr-1 h-3 w-3 text-destructive" />
                )}
                {stat.change && (
                  <span className={stat.trend === 'up' ? 'text-success' : stat.trend === 'down' ? 'text-destructive' : ''}>
                    {stat.change}
                  </span>
                )}
                <span className="ml-1">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">

        {/* Demand Forecast Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pronóstico de Demanda - Próximos 14 días
            </CardTitle>
            <CardDescription>
              Índice de demanda relativo a un día normal (100%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecastData.map((day) => (
                <div key={day.date} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(day.demandIndex, 200) / 2}
                        className={`h-3 ${day.demandIndex > 150 ? '[&>div]:bg-red-500' : day.demandIndex > 120 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                      />
                      <span className="w-12 text-sm font-medium">{day.demandIndex}%</span>
                    </div>
                  </div>
                  {day.hasMatch && (
                    <Badge variant="secondary" className="text-xs">
                      <Trophy className="mr-1 h-3 w-3" />
                      Partido
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge variant={getSeverityColor(alert.severity) as any}>
                    {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Advertencia' : 'Info'}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {alert.expiresIn}
                  </span>
                </div>
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Acción:</strong> {alert.action}
                </p>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              Ver todas las alertas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">

        {/* Upcoming Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Próximos Partidos en {selectedCityData?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">{match.teams}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(match.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} • {match.time}
                    </div>
                    <div className="text-xs text-muted-foreground">{match.stadium}</div>
                  </div>
                  <div className="text-right">
                    <Badge className={getDemandColor(match.demandImpact)}>
                      {match.demandImpact.replace('_', ' ')}
                    </Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {match.expectedVisitors.toLocaleString()} visitantes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Recomendaciones
            </CardTitle>
            <CardDescription>
              Acciones sugeridas para maximizar ingresos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <div className="rounded-full bg-muted p-2">
                    <rec.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rec.category}</span>
                      <Badge variant="outline" className="text-xs">
                        Impacto: {rec.impact}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rec.suggestion}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Aplicar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button>
              <BarChart3 className="mr-2 h-4 w-4" />
              Generar Reporte Completo
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Ver Calendario de Partidos
            </Button>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Planificar Personal
            </Button>
            <Button variant="outline">
              <DollarSign className="mr-2 h-4 w-4" />
              Configurar Precios Dinámicos
            </Button>
            <Button variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Configurar Alertas
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
