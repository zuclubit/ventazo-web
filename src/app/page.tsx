'use client';

import Image from 'next/image';
import Link from 'next/link';

import {
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Globe,
  Layers,
  LineChart,
  Mail,
  MessageSquare,
  Phone,
  Play,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';

import { AIChatDemo, LandingHeader } from '@/components/landing';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';

/**
 * Landing Page - Ventazo by Zuclubit
 * Multi-language and multi-currency support for LATAM
 */
export default function HomePage() {
  const { t, country, pricing } = useI18n();

  // Feature cards with icons and routes - Ventazo color scheme (kept for future use)
  const _featureCards = [
    {
      icon: Users,
      data: t.features.leads,
      href: '/app/leads',
      color: 'from-ventazo-500 to-ventazo-600',
    },
    {
      icon: Target,
      data: t.features.opportunities,
      href: '/app/opportunities',
      color: 'from-coral-400 to-coral-500',
    },
    {
      icon: Users,
      data: t.features.customers,
      href: '/app/customers',
      color: 'from-emerald-500 to-ventazo-600',
    },
    {
      icon: CheckCircle2,
      data: t.features.tasks,
      href: '/app/tasks',
      color: 'from-coral-500 to-coral-600',
    },
    {
      icon: Workflow,
      data: t.features.automations,
      href: '/app/workflows',
      color: 'from-ventazo-600 to-ventazo-700',
    },
    {
      icon: BarChart3,
      data: t.features.analytics,
      href: '/app/dashboard',
      color: 'from-ventazo-400 to-ventazo-500',
    },
    {
      icon: Layers,
      data: t.features.catalog,
      href: '/app/services',
      color: 'from-ventazo-500 to-coral-400',
    },
    {
      icon: Calendar,
      data: t.features.calendar,
      href: '/app/tasks',
      color: 'from-coral-400 to-ventazo-500',
    },
  ];

  // AI features (kept for future use)
  const _aiFeatures = [
    { icon: Gauge, data: t.ai.scoring },
    { icon: Mail, data: t.ai.emails },
    { icon: MessageSquare, data: t.ai.conversations },
    { icon: TrendingUp, data: t.ai.forecasting },
    { icon: Sparkles, data: t.ai.summaries },
    { icon: Bell, data: t.ai.alerts },
  ];

  // Communication channels
  const channels = [
    { icon: MessageSquare, data: t.communication.whatsapp, color: 'bg-green-500' },
    { icon: Mail, data: t.communication.email, color: 'bg-blue-500' },
    { icon: Phone, data: t.communication.calls, color: 'bg-violet-500' },
    { icon: MessageSquare, data: t.communication.sms, color: 'bg-amber-500' },
    { icon: Bell, data: t.communication.notifications, color: 'bg-rose-500' },
  ];

  // Security features
  const securityFeatures = [
    { icon: Shield, data: t.security.encryption },
    { icon: FileText, data: t.security.gdpr },
    { icon: Settings, data: t.security.access },
    { icon: LineChart, data: t.security.audit },
  ];

  // Integration tools
  const integrationTools = [
    'Salesforce', 'HubSpot', 'Slack', 'Gmail', 'Outlook', 'Stripe',
    'Zapier', 'Teams', 'Google Calendar', 'Zoom', 'Shopify', 'QuickBooks',
  ];

  // Sample inbox messages (localized phone number based on country)
  const inboxMessages = [
    {
      channel: 'WhatsApp',
      from: 'Carlos Lopez',
      message: country.locale.startsWith('pt')
        ? 'Ola, estou interessado na proposta que enviaram...'
        : 'Hola, me interesa la propuesta que enviaron...',
      time: '2 min',
      color: 'bg-green-500'
    },
    {
      channel: 'Email',
      from: 'Ana Rodriguez',
      message: country.locale.startsWith('pt')
        ? 'Re: Orcamento servicos premium'
        : 'Re: Cotizacion servicios premium',
      time: '15 min',
      color: 'bg-blue-500'
    },
    {
      channel: 'SMS',
      from: country.phoneCode + ' 1234 5678',
      message: country.locale.startsWith('pt')
        ? 'Confirmado para amanha as 10h'
        : 'Confirmado para manana a las 10am',
      time: '1 hr',
      color: 'bg-amber-500'
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* ============================================
          HERO SECTION - Premium 2025 SaaS Design
          Stripe-level quality, high conversion
          ============================================ */}
      <div className="relative min-h-screen overflow-hidden" style={{ background: 'linear-gradient(165deg, #041A1A 0%, #052828 25%, #073838 50%, #063030 75%, #041E1E 100%)' }}>

        {/* === PREMIUM BACKGROUND SYSTEM === */}

        {/* Deep atmospheric gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(13,148,136,0.15),transparent)]" />

        {/* Vignette - focuses attention toward center-left */}
        <div className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse 100% 100% at 30% 50%, transparent 40%, rgba(4,26,26,0.6) 100%)'
        }} />

        {/* Primary ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          {/* Top-right teal glow - premium depth */}
          <div className="absolute -right-40 -top-40 h-[700px] w-[700px] rounded-full bg-[#0D9488]/12 blur-[150px]" />
          {/* Left teal accent - supports text area */}
          <div className="absolute -left-20 top-1/3 h-[500px] w-[500px] rounded-full bg-[#14B8A6]/8 blur-[120px]" />
          {/* Bottom coral warmth - emotional accent */}
          <div className="absolute -bottom-32 left-1/4 h-[400px] w-[400px] rounded-full bg-[#FF6B35]/6 blur-[100px]" />
          {/* Center subtle glow */}
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0F766E]/5 blur-[150px]" />
        </div>

        {/* Subtle noise texture for depth */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />

        {/* === NAVIGATION === */}
        <LandingHeader variant="transparent" sticky={false} />

        {/* === HERO CONTENT === */}
        <section className="relative flex min-h-[calc(100vh-80px)] items-center py-12 lg:py-20">

          {/* Hero Image - Right side integration */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {/* Image container */}
            <div className="absolute bottom-0 right-0 top-0 flex w-[90%] items-center justify-end sm:w-[80%] md:w-[65%] lg:w-[55%] xl:w-[52%]">

              {/* Gradient fades for seamless blend */}
              <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#052828] via-[#052828]/95 via-35% to-[#052828]/20 to-70%" />
              <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#041A1A]/60 via-transparent to-[#041E1E]/70" />

              {/* Ambient glow behind figure */}
              <div className="absolute right-[5%] top-1/2 h-[80%] w-[80%] -translate-y-1/2 rounded-full bg-gradient-to-l from-[#14B8A6]/15 via-[#0D9488]/8 to-transparent blur-[100px]" />

              {/* Image */}
              <div className="relative mr-[-2%] flex items-center justify-end lg:mr-0">
                <div className="absolute inset-0 scale-105 rounded-full bg-gradient-to-t from-[#FF6B35]/8 via-transparent to-[#14B8A6]/8 blur-3xl" />
                <Image
                  src="/images/hero/woman_hero_logo.png"
                  alt="Profesional usando Ventazo CRM"
                  width={680}
                  height={680}
                  className="relative h-auto w-auto max-w-none object-contain drop-shadow-[0_30px_80px_rgba(13,148,136,0.3)]"
                  style={{ height: 'min(88vh, 680px)' }}
                  priority
                />
              </div>

              {/* Floating elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute right-[15%] top-[20%] h-3 w-3 animate-pulse rounded-full bg-[#14B8A6]/40 blur-[1px]" />
                <div className="absolute bottom-[30%] right-[20%] h-2 w-2 animate-pulse rounded-full bg-[#FF6B35]/30 blur-[1px] [animation-delay:1s]" />
              </div>
            </div>
          </div>

          {/* === TEXT CONTENT === */}
          <div className="container relative z-20">
            <div className="max-w-[680px] lg:max-w-[640px] xl:max-w-[700px]">

              {/* Category Badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/20 bg-[#14B8A6]/5 px-4 py-2 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-[#2DD4BF]" />
                <span className="text-sm font-medium text-[#5EEAD4]">CRM + IA + WhatsApp</span>
              </div>

              {/* Main Headline - 64-80px, optimized hierarchy */}
              <h1 className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
                Ese prospecto{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-[#FB923C] via-[#F97316] to-[#EA580C] bg-clip-text text-transparent">
                    se fue
                  </span>
                  <span className="absolute -inset-x-2 -inset-y-1 -z-10 rounded-lg bg-[#FF6B35]/15 blur-xl" />
                </span>
                <br />
                <span className="text-[#B6C5C8]">porque nadie lo atendió a tiempo</span>
              </h1>

              {/* Subheadline - 20-24px, max-width 600-680px */}
              <p className="mb-10 max-w-[580px] text-[clamp(1.125rem,2vw,1.375rem)] leading-[1.5] text-[#94A3AB]">
                <span className="font-medium text-white">Ventazo</span> centraliza WhatsApp, correo y llamadas en un solo lugar.
                La IA te dice a quién llamar primero. Nunca más pierdas una venta.
              </p>

              {/* CTAs - Premium styling */}
              <div className="mb-8 flex flex-col gap-4 sm:flex-row">
                {/* Primary CTA */}
                <Button asChild size="lg" className="group h-14 gap-2.5 rounded-[18px] bg-gradient-to-r from-[#0D9488] to-[#14B8A6] px-8 text-[15px] font-semibold text-white shadow-[0_8px_30px_-6px_rgba(13,148,136,0.5),0_2px_8px_-2px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_12px_40px_-6px_rgba(13,148,136,0.6),0_4px_12px_-2px_rgba(0,0,0,0.3)] hover:brightness-105">
                  <Link href="/register">
                    Empieza gratis ahora
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>

                {/* Secondary CTA - Ghost style */}
                <Button asChild size="lg" variant="outline" className="group h-14 gap-2 rounded-[18px] border-white/15 bg-white/[0.03] px-8 text-[15px] font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/[0.06]">
                  <Link href="/app">
                    <Play className="h-4 w-4 text-[#5EEAD4]" />
                    Ver demostración
                  </Link>
                </Button>
              </div>

              {/* Trust Elements - Horizontal */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="flex items-center gap-2 text-sm text-[#7A8F94]">
                  <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                  Sin tarjeta de crédito
                </span>
                <span className="flex items-center gap-2 text-sm text-[#7A8F94]">
                  <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                  Listo en 5 minutos
                </span>
                <span className="flex items-center gap-2 text-sm text-[#7A8F94]">
                  <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                  +2,000 equipos activos
                </span>
              </div>
            </div>
          </div>

          {/* Scroll indicator - minimal */}
          <div className="absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
            <div className="h-8 w-5 rounded-full border border-white/15 p-1">
              <div className="h-1.5 w-full animate-bounce rounded-full bg-white/30" />
            </div>
          </div>
        </section>

        {/* Bottom gradient transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#052525] to-transparent" />
      </div>

      <main className="flex-1">
        {/* ============================================
            FEATURES SECTION - Ventazo Design System v1.0
            Flat-Premium SaaS 2025 Style
            ============================================ */}
        <section id="features" className="relative overflow-hidden py-32 md:py-40" style={{ background: 'linear-gradient(175deg, #0A534E 0%, #0D6A64 50%, #0A534E 100%)' }}>
          {/* Subtle vignette overlay */}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(8,42,40,0.4) 100%)' }} />

          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-[#14B8A6]/8 blur-[160px]" />
            <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-[#F97316]/5 blur-[140px]" />
            <div className="absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#0D9488]/10 blur-[120px]" />
          </div>

          <div className="container relative">
            {/* ===== HEADER - Centered with Floating Image Accent ===== */}
            <div className="relative mx-auto mb-20 max-w-4xl text-center">

              {/* Floating Image - Decorative accent on right */}
              <div className="pointer-events-none absolute -right-8 top-1/2 hidden -translate-y-1/2 lg:block xl:-right-16">
                <div className="relative">
                  {/* Subtle glow */}
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#14B8A6]/15 to-[#F97316]/10 blur-[40px]" />
                  {/* Image card */}
                  <div className="relative w-[180px] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1.5 shadow-xl xl:w-[200px]">
                    <Image
                      src="/images/features/collaboration.png"
                      alt=""
                      width={200}
                      height={150}
                      className="w-full rounded-xl object-cover"
                      aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A534E]/50 via-transparent to-transparent" />
                    {/* Live indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#0A534E]/90 px-2.5 py-1 backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2DD4BF] opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
                        </span>
                        <span className="text-[10px] font-medium text-[#5EEAD4]">En vivo</span>
                      </div>
                    </div>
                  </div>
                  {/* Sparkle */}
                  <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-lg">
                    <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
                  </div>
                </div>
              </div>

              {/* Section Badge */}
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-[#14B8A6]/15 bg-[#0D9488]/8 px-5 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0D9488]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E]" />
                </div>
                <span className="text-sm font-medium tracking-wide text-[#5EEAD4]">CRM Inteligente</span>
              </div>

              {/* Main Title */}
              <h2 className="mb-6 text-[2.5rem] font-bold leading-[1.1] tracking-tight text-[#F1F5F9] md:text-5xl lg:text-[3.25rem]">
                {t.features.title}
              </h2>

              {/* Subtitle */}
              <p className="mx-auto max-w-[600px] text-lg leading-relaxed text-[#C7D1DA] md:text-xl">
                {t.features.subtitle}
              </p>

              {/* Quick stats - inline badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2">
                  <Users className="h-4 w-4 text-[#2DD4BF]" />
                  <span className="text-sm text-[#B6C5C8]">+2,500 equipos</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2">
                  <Zap className="h-4 w-4 text-[#FB923C]" />
                  <span className="text-sm text-[#B6C5C8]">Setup en 5 min</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2">
                  <Shield className="h-4 w-4 text-[#2DD4BF]" />
                  <span className="text-sm text-[#B6C5C8]">Datos seguros</span>
                </div>
              </div>
            </div>

            {/* ===== FEATURE CARDS - 2x4 Grid with consistent styling ===== */}
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:gap-8">

              {/* Card 1 - Teal */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#14B8A6]/15 hover:shadow-[0_16px_56px_-16px_rgba(20,184,166,0.15)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#14B8A6]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  {/* Icon - Large, geometric flat neumorphism */}
                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] shadow-[0_8px_24px_-4px_rgba(13,148,136,0.4)]">
                    <Users className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Todos tus prospectos en un lugar
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Cada prospecto <span className="font-medium text-[#C7D1DA]">llega automático</span> desde WhatsApp, tu sitio web o redes sociales.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">WhatsApp Business conectado</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Formularios de tu sitio web</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Importa Excel en 2 clics</span>
                    </li>
                </ul>
              </div>

              {/* Card 2 - Coral */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#F97316]/15 hover:shadow-[0_16px_56px_-16px_rgba(249,115,22,0.12)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#F97316]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-[0_8px_24px_-4px_rgba(249,115,22,0.4)]">
                    <BarChart3 className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Ve tus ventas de un vistazo
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Tablero Kanban con <span className="font-medium text-[#C7D1DA]">predicción de cierre por IA</span>. Sabes exactamente qué hacer.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Pipeline visual tipo Kanban</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">IA predice cuáles cierran</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Alertas proactivas</span>
                    </li>
                </ul>
              </div>

              {/* Card 3 - Teal */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#14B8A6]/15 hover:shadow-[0_16px_56px_-16px_rgba(20,184,166,0.15)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#14B8A6]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] shadow-[0_8px_24px_-4px_rgba(13,148,136,0.4)]">
                    <FileText className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Historia completa del cliente
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Conversaciones, cotizaciones, facturas y notas del equipo. <span className="font-medium text-[#C7D1DA]">Todo en un timeline</span>.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Timeline de interacciones</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Documentos guardados</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Notas compartidas</span>
                    </li>
                </ul>
              </div>

              {/* Card 4 - Coral */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#F97316]/15 hover:shadow-[0_16px_56px_-16px_rgba(249,115,22,0.12)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#F97316]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-[0_8px_24px_-4px_rgba(249,115,22,0.4)]">
                    <Bell className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Ventazo te recuerda, tú solo vendes
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Te dice <span className="font-medium text-[#C7D1DA]">a quién contactar hoy y por qué</span>. No más prospectos perdidos.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Recordatorios automáticos</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Tareas que se repiten solas</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Asignación inteligente</span>
                    </li>
                </ul>
              </div>

              {/* Card 5 - Teal */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#14B8A6]/15 hover:shadow-[0_16px_56px_-16px_rgba(20,184,166,0.15)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#14B8A6]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] shadow-[0_8px_24px_-4px_rgba(13,148,136,0.4)]">
                    <Workflow className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Automatización inteligente
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Define reglas y <span className="font-medium text-[#C7D1DA]">Ventazo las ejecuta automáticamente</span>. Cero trabajo manual.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Lead nuevo → asigna vendedor</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Sin respuesta → recordatorio</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Cotización aceptada → factura</span>
                    </li>
                </ul>
              </div>

              {/* Card 6 - Coral */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#F97316]/15 hover:shadow-[0_16px_56px_-16px_rgba(249,115,22,0.12)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#F97316]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-[0_8px_24px_-4px_rgba(249,115,22,0.4)]">
                    <LineChart className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Dashboard en tiempo real
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Abres el dashboard y <span className="font-medium text-[#C7D1DA]">ves todo lo importante</span>. Sin pedir reportes.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Métricas en tiempo real</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Proyección de ventas</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Comparativo por vendedor</span>
                    </li>
                </ul>
              </div>

              {/* Card 7 - Teal */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#14B8A6]/15 hover:shadow-[0_16px_56px_-16px_rgba(20,184,166,0.15)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#14B8A6]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] shadow-[0_8px_24px_-4px_rgba(13,148,136,0.4)]">
                    <Receipt className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Cotiza en segundos
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Tu catálogo y plantillas <span className="font-medium text-[#C7D1DA]">listas para enviar por WhatsApp</span>.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Catálogo de productos</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Plantillas personalizadas</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#14B8A6]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Envío directo por WhatsApp</span>
                    </li>
                </ul>
              </div>

              {/* Card 8 - Coral */}
              <div className="group relative h-full overflow-hidden rounded-[28px] border border-white/[0.04] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-9 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-500 hover:border-[#F97316]/15 hover:shadow-[0_16px_56px_-16px_rgba(249,115,22,0.12)]">
                  <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-br from-[#F97316]/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-[0_8px_24px_-4px_rgba(249,115,22,0.4)]">
                    <Calendar className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  <h3 className="mb-3 text-[22px] font-semibold tracking-tight text-[#F1F5F9]">
                    Agenda sincronizada
                  </h3>
                  <p className="mb-6 text-[15px] leading-relaxed text-[#B6C3C7]">
                    Agenda una cita y <span className="font-medium text-[#C7D1DA]">se sincroniza con Google y Outlook</span>.
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Sync bidireccional</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Link para clientes</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#F97316]/12">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <span className="text-[14px] text-[#B6C3C7]">Recordatorios automáticos</span>
                    </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* ============================================
            VALUE PROPOSITION SECTION - Why Modern Teams Choose Ventazo
            SaaS 2025 Premium Style - Two Column Layout
            ============================================ */}
        <section className="relative overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(180deg, #0A534E 0%, #0B5752 35%, #0D6159 70%, #0F6A64 100%)' }}>
          {/* Atmospheric lighting - soft and balanced */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-1/4 h-[450px] w-[450px] rounded-full bg-[#14B8A6]/6 blur-[120px]" />
            <div className="absolute -right-24 bottom-1/4 h-[350px] w-[350px] rounded-full bg-[#F97316]/4 blur-[100px]" />
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0D9488]/5 blur-[140px]" />
          </div>

          {/* Subtle geometric pattern - 3% opacity */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2314B8A6' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 20L20 0v20H0zm20 0L40 0v20H20zm0 0v20l20-20H20zm0 0H0l20 20V20z'/%3E%3C/g%3E%3C/svg%3E")`
          }} />

          {/* Soft vignette */}
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(8,40,38,0.3) 100%)' }} />

          <div className="container relative">
            <div className="mx-auto max-w-7xl">
              {/* Two Column Grid - 7/5 split */}
              <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16 xl:gap-20">

                {/* Left Column - Content */}
                <div className="lg:col-span-7">
                  {/* Section Badge */}
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/12 bg-[#14B8A6]/6 px-4 py-2">
                    <Sparkles className="h-4 w-4 text-[#2DD4BF]" strokeWidth={2} />
                    <span className="text-sm font-medium text-[#5EEAD4]">Por qué elegirnos</span>
                  </div>

                  {/* Headline - Premium typography */}
                  <h2 className="mb-6 text-[2rem] font-bold leading-[1.12] tracking-tight text-[#F5F7FA] sm:text-[2.5rem] lg:text-[2.75rem]">
                    <span className="relative">
                      Así es como Ventazo
                      {/* Subtle headline glow */}
                      <span className="pointer-events-none absolute -inset-x-4 -inset-y-2 -z-10 rounded-2xl bg-[#14B8A6]/5 blur-2xl" />
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-[#FB923C] via-[#F97316] to-[#EA580C] bg-clip-text text-transparent">
                      transforma tu equipo
                    </span>
                  </h2>

                  {/* Description - max 560px */}
                  <p className="mb-10 max-w-[560px] text-[17px] leading-[1.7] text-[#B6C5C8]">
                    Los equipos de ventas pierden hasta <span className="font-semibold text-[#F5F7FA]">40% de su tiempo</span> en tareas administrativas.
                    Ventazo automatiza el seguimiento, organiza la información y te dice exactamente qué hacer para cerrar más negocios.
                  </p>

                  {/* Benefits List - Vertical with check icons */}
                  <ul className="mb-10 space-y-4">
                    {/* Benefit 1 */}
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#14B8A6]/15">
                        <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-[#F5F7FA]">Responde 3x más rápido</span>
                        <span className="ml-1.5 text-[15px] text-[#94A3AB]">— todos los mensajes en un solo lugar</span>
                      </div>
                    </li>

                    {/* Benefit 2 */}
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#14B8A6]/15">
                        <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-[#F5F7FA]">Cero prospectos olvidados</span>
                        <span className="ml-1.5 text-[15px] text-[#94A3AB]">— seguimiento automático garantizado</span>
                      </div>
                    </li>

                    {/* Benefit 3 */}
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#14B8A6]/15">
                        <CheckCircle2 className="h-4 w-4 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-[#F5F7FA]">IA que prioriza por ti</span>
                        <span className="ml-1.5 text-[15px] text-[#94A3AB]">— sabes a quién llamar primero</span>
                      </div>
                    </li>

                    {/* Benefit 4 */}
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/15">
                        <CheckCircle2 className="h-4 w-4 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-[#F5F7FA]">Métricas claras y accionables</span>
                        <span className="ml-1.5 text-[15px] text-[#94A3AB]">— toma decisiones con datos reales</span>
                      </div>
                    </li>
                  </ul>

                  {/* CTA Row */}
                  <div className="flex flex-wrap items-center gap-5">
                    <Button asChild size="lg" className="h-12 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#14B8A6] px-7 text-[15px] font-semibold text-white shadow-[0_6px_20px_-4px_rgba(13,148,136,0.45)] transition-all hover:shadow-[0_10px_28px_-4px_rgba(13,148,136,0.55)]">
                      <Link href="/register">
                        Prueba gratis 14 días
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="flex items-center gap-4 text-sm text-[#7A8F94]">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#14B8A6]" />
                        Sin tarjeta
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#14B8A6]" />
                        Cancela cuando quieras
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Illustration */}
                <div className="relative lg:col-span-5">
                  {/* Connection lines - teal 10% opacity */}
                  <div className="pointer-events-none absolute -inset-12 hidden lg:block">
                    <svg className="h-full w-full" viewBox="0 0 400 450" fill="none">
                      <path d="M40 80 Q120 30 180 120 T320 160" stroke="#14B8A6" strokeWidth="1" strokeDasharray="8 6" opacity="0.1" />
                      <path d="M60 350 Q160 400 220 300 T380 280" stroke="#14B8A6" strokeWidth="1" strokeDasharray="8 6" opacity="0.08" />
                      <path d="M0 220 Q80 200 140 240 T280 180" stroke="#F97316" strokeWidth="1" strokeDasharray="6 8" opacity="0.06" />
                    </svg>
                  </div>

                  {/* Illustration Container */}
                  <div className="relative mx-auto max-w-[420px] lg:mx-0 lg:max-w-none">
                    {/* Soft glow behind card */}
                    <div className="absolute -inset-8 rounded-[36px] bg-gradient-to-br from-[#14B8A6]/12 via-[#0D9488]/8 to-transparent blur-[50px]" />

                    {/* Main Card */}
                    <div className="relative overflow-hidden rounded-[26px] border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-2 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.35)]">
                      {/* Image Area */}
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[#0A4D4A]">
                        <Image
                          src="/images/hero/sales_team_celebration.png"
                          alt="Equipo de ventas celebrando éxito con Ventazo"
                          width={480}
                          height={360}
                          className="h-full w-full object-cover"
                        />
                        {/* Subtle overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A4D4A]/50 via-transparent to-[#0A4D4A]/20" />

                        {/* Floating Metric Card - Top Right */}
                        <div className="absolute right-3 top-3 rounded-xl border border-white/[0.08] bg-[#0A4D4A]/85 px-3.5 py-2.5 backdrop-blur-md">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#14B8A6]/20">
                              <TrendingUp className="h-4 w-4 text-[#2DD4BF]" strokeWidth={2} />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-[#5EEAD4]/60">Ventas</p>
                              <p className="text-base font-bold text-white">+47%</p>
                            </div>
                          </div>
                        </div>

                        {/* Floating Task Card - Bottom Left */}
                        <div className="absolute bottom-3 left-3 rounded-xl border border-white/[0.08] bg-[#0A4D4A]/85 px-3.5 py-2.5 backdrop-blur-md">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-[#F97316]/20">
                              <Zap className="h-3.5 w-3.5 text-[#FB923C]" strokeWidth={2} />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-white">12 tareas completadas</p>
                              <p className="text-[10px] text-[#94A3AB]">Hoy por IA</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Stats Row */}
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-center">
                          <p className="text-lg font-bold text-[#2DD4BF]">89%</p>
                          <p className="text-[10px] text-[#7A8F94]">Respuesta</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-center">
                          <p className="text-lg font-bold text-[#FB923C]">3.2x</p>
                          <p className="text-[10px] text-[#7A8F94]">Más rápido</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-center">
                          <p className="text-lg font-bold text-[#F5F7FA]">0</p>
                          <p className="text-[10px] text-[#7A8F94]">Perdidos</p>
                        </div>
                      </div>
                    </div>

                    {/* Decorative dots */}
                    <div className="pointer-events-none absolute -right-3 top-1/3 hidden lg:block">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]/40" />
                    </div>
                    <div className="pointer-events-none absolute -left-4 bottom-1/4 hidden lg:block">
                      <div className="h-2 w-2 rounded-full bg-[#F97316]/30" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            AI SECTION - Ventazo CRM Design System v1.0
            Clean, professional layout with clear hierarchy
            ============================================ */}
        <section id="ai" className="relative overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(165deg, #0A534E 0%, #0D6A64 50%, #0A534E 100%)' }}>
          {/* Ambient glow - subtle */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-[#14B8A6]/8 blur-[140px]" />
            <div className="absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full bg-[#F97316]/6 blur-[120px]" />
          </div>

          <div className="container relative">
            {/* Main Grid: 12 columns for precise control */}
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 xl:gap-20">

                {/* Left Column - Header + Chat (7 cols on lg) */}
                <div className="lg:col-span-7">
                  {/* Section Header - Left aligned on desktop */}
                  <div className="mb-8 text-center lg:text-left">
                    {/* AI Badge */}
                    <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#14B8A6]/20 bg-[#0D9488]/10 px-5 py-2.5 backdrop-blur-sm">
                      <div className="relative flex h-5 w-5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#14B8A6]/40 opacity-75" style={{ animationDuration: '2s' }} />
                        <Sparkles className="relative h-3.5 w-3.5 text-[#2DD4BF]" strokeWidth={2} />
                      </div>
                      <span className="text-sm font-medium tracking-wide text-[#2DD4BF]">{t.ai.badge}</span>
                      <span className="rounded-full bg-[#14B8A6]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#5EEAD4]">Beta</span>
                    </div>

                    {/* Title */}
                    <h2 className="mb-4 text-[2rem] font-semibold leading-[1.2] tracking-tight text-[#F5F7FA] sm:text-[2.5rem] lg:text-[2.75rem]">
                      Cierra más ventas con{' '}
                      <span className="relative inline-block">
                        <span className="bg-gradient-to-r from-[#2DD4BF] to-[#14B8A6] bg-clip-text text-transparent">IA</span>
                      </span>
                    </h2>

                    {/* Subtitle */}
                    <p className="mx-auto max-w-lg text-base leading-relaxed text-[#B6C5C8] lg:mx-0 lg:text-lg">
                      Pregúntale cualquier cosa a tu CRM. La IA analiza tus datos y responde con información accionable.
                    </p>
                  </div>

                  {/* Chat Demo */}
                  <div className="relative mx-auto max-w-lg lg:mx-0">
                    <AIChatDemo />
                  </div>

                  {/* CTA Buttons */}
                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                    <Button asChild size="default" className="h-11 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#14B8A6] px-6 text-sm font-semibold text-white shadow-[0_6px_20px_-4px_rgba(13,148,136,0.5)] transition-all hover:shadow-[0_8px_28px_-4px_rgba(13,148,136,0.6)]">
                      <Link href="/register">
                        Probar IA gratis
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="default" variant="outline" className="h-11 rounded-xl border-white/15 bg-white/[0.04] px-6 text-sm text-[#F5F7FA] hover:border-white/25 hover:bg-white/[0.08]">
                      <Link href="/app">
                        Ver demo
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Right Column - Feature Cards (5 cols on lg) */}
                <div className="flex flex-col justify-center lg:col-span-5">
                  {/* Compact label */}
                  <div className="mb-4 hidden text-center lg:block lg:text-left">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#5EEAD4]/70">Capacidades IA</span>
                  </div>

                  <div className="space-y-4">
                    {/* Card 1: Scoring Inteligente */}
                    <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#14B8A6]/25 hover:bg-white/[0.06]">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D9488] to-[#0F766E] shadow-lg shadow-[#0D9488]/30">
                          <Gauge className="h-5 w-5 text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <h4 className="mb-1 text-[15px] font-semibold text-[#F5F7FA]">Scoring Inteligente</h4>
                          <p className="mb-3 text-[13px] leading-relaxed text-[#B6C5C8]">
                            Prioriza automáticamente los leads con mayor probabilidad de compra.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#14B8A6]/10 px-2 py-1 text-[11px] font-medium text-[#5EEAD4]">
                              <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                              Auto-scoring
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#14B8A6]/10 px-2 py-1 text-[11px] font-medium text-[#5EEAD4]">
                              <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                              +34% conversión
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Asistente de Ventas */}
                    <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#F97316]/25 hover:bg-white/[0.06]">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-lg shadow-[#F97316]/30">
                          <MessageSquare className="h-5 w-5 text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <h4 className="mb-1 text-[15px] font-semibold text-[#F5F7FA]">Asistente de Ventas</h4>
                          <p className="mb-3 text-[13px] leading-relaxed text-[#B6C5C8]">
                            Genera emails, resúmenes y sugerencias de siguiente acción automáticamente.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F97316]/10 px-2 py-1 text-[11px] font-medium text-[#FDBA74]">
                              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                              Emails IA
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F97316]/10 px-2 py-1 text-[11px] font-medium text-[#FDBA74]">
                              <Clock className="h-3 w-3" strokeWidth={2.5} />
                              2h+ ahorro/día
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Predicción de Cierre - NEW */}
                    <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#14B8A6]/25 hover:bg-white/[0.06]">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] shadow-lg shadow-[#14B8A6]/30">
                          <Target className="h-5 w-5 text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <h4 className="mb-1 text-[15px] font-semibold text-[#F5F7FA]">Predicción de Cierre</h4>
                          <p className="mb-3 text-[13px] leading-relaxed text-[#B6C5C8]">
                            Conoce la probabilidad de cierre y el mejor momento para dar seguimiento.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#14B8A6]/10 px-2 py-1 text-[11px] font-medium text-[#5EEAD4]">
                              <BarChart3 className="h-3 w-3" strokeWidth={2.5} />
                              Forecast
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#14B8A6]/10 px-2 py-1 text-[11px] font-medium text-[#5EEAD4]">
                              <Bell className="h-3 w-3" strokeWidth={2.5} />
                              Alertas
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            WORLDCUP ANALYTICS SECTION - Promotional
            Demand forecasting for FIFA World Cup 2026
            ============================================ */}
        <section id="worldcup" className="relative -mt-px overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(165deg, #0A534E 0%, #0B5752 30%, #0C5F5A 60%, #0A534E 100%)' }}>
          {/* Ambient glows - with golden accent for World Cup theme */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-[#14B8A6]/8 blur-[140px]" />
            <div className="absolute -right-20 top-1/4 h-[400px] w-[400px] rounded-full bg-[#FFD700]/6 blur-[120px]" />
            <div className="absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-[#F97316]/5 blur-[100px]" />
          </div>

          {/* Subtle pattern overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='%2314B8A6'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />

          <div className="container relative">
            <div className="mx-auto max-w-7xl">
              {/* Two-column layout */}
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 xl:gap-20">

                {/* Left Column - Content */}
                <div className="lg:col-span-7">
                  {/* Badge with World Cup theme */}
                  <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/8 px-5 py-2.5 backdrop-blur-sm">
                    <div className="relative flex h-5 w-5 items-center justify-center">
                      <Globe className="relative h-4 w-4 text-[#FFD700]" strokeWidth={2} />
                    </div>
                    <span className="text-sm font-medium text-[#FFD700]">Mundial 2026</span>
                    <span className="rounded-full bg-[#F97316]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#FB923C]">Nuevo</span>
                  </div>

                  {/* Main Title */}
                  <h2 className="mb-6 text-[2rem] font-bold leading-[1.1] tracking-tight text-[#F5F7FA] sm:text-[2.5rem] lg:text-[2.75rem]">
                    Prepara tu negocio para el{' '}
                    <span className="relative inline-block">
                      <span className="bg-gradient-to-r from-[#FFD700] via-[#FB923C] to-[#F97316] bg-clip-text text-transparent">
                        Mundial 2026
                      </span>
                      <span className="pointer-events-none absolute -inset-x-2 -inset-y-1 -z-10 rounded-xl bg-[#FFD700]/10 blur-xl" />
                    </span>
                  </h2>

                  {/* Description */}
                  <p className="mb-8 max-w-[560px] text-[17px] leading-[1.7] text-[#D1DCE0]">
                    <span className="font-semibold text-white">6.5 millones de visitantes</span> llegarán a las 16 ciudades sede.
                    Predice la demanda, ajusta precios y optimiza tu personal con IA.
                  </p>

                  {/* Feature List */}
                  <ul className="mb-10 space-y-4">
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#14B8A6]/15">
                        <TrendingUp className="h-4 w-4 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-white">Predicción de demanda por IA</span>
                        <span className="ml-1.5 text-[15px] text-[#C7D1DA]">— anticipa picos de venta por partido</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/15">
                        <Receipt className="h-4 w-4 text-[#FB923C]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-white">Precios dinámicos sugeridos</span>
                        <span className="ml-1.5 text-[15px] text-[#C7D1DA]">— maximiza ingresos con data real</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#14B8A6]/15">
                        <Users className="h-4 w-4 text-[#2DD4BF]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-white">Recomendaciones de personal</span>
                        <span className="ml-1.5 text-[15px] text-[#C7D1DA]">— staffing óptimo por horario</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#FFD700]/15">
                        <Bell className="h-4 w-4 text-[#FFD700]" strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="text-[15px] font-medium text-white">Alertas proactivas</span>
                        <span className="ml-1.5 text-[15px] text-[#C7D1DA]">— notificaciones 48h antes de cada partido</span>
                      </div>
                    </li>
                  </ul>

                  {/* CTA Row */}
                  <div className="flex flex-wrap items-center gap-5">
                    <Button asChild size="lg" className="h-12 gap-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#FB923C] px-7 text-[15px] font-semibold text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.5)] transition-all hover:shadow-[0_10px_28px_-4px_rgba(249,115,22,0.6)]">
                      <Link href="/register?ref=worldcup2026">
                        Acceso anticipado
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="flex items-center gap-4 text-sm text-[#B6C5C8]">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                        Gratis hasta Jun 2026
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Stats & Preview */}
                <div className="relative lg:col-span-5">
                  {/* Decorative connection lines */}
                  <div className="pointer-events-none absolute -inset-8 hidden lg:block">
                    <svg className="h-full w-full" viewBox="0 0 400 450" fill="none">
                      <path d="M40 100 Q140 50 200 140 T360 120" stroke="#FFD700" strokeWidth="1" strokeDasharray="8 6" opacity="0.15" />
                      <path d="M20 300 Q120 350 200 280 T380 320" stroke="#14B8A6" strokeWidth="1" strokeDasharray="6 8" opacity="0.1" />
                    </svg>
                  </div>

                  {/* Main Preview Card */}
                  <div className="relative mx-auto max-w-[420px] lg:mx-0 lg:max-w-none">
                    {/* Glow effect */}
                    <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-[#FFD700]/15 via-[#F97316]/10 to-[#14B8A6]/8 blur-[50px]" />

                    <div className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.4)]">
                      {/* Header */}
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD700] to-[#F97316] shadow-lg shadow-[#F97316]/30">
                            <BarChart3 className="h-5 w-5 text-white" strokeWidth={2} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">Demand Forecast</p>
                            <p className="text-xs text-white/70">Ciudad de México</p>
                          </div>
                        </div>
                        <div className="rounded-lg bg-[#14B8A6]/20 px-2.5 py-1">
                          <span className="text-xs font-semibold text-[#5EEAD4]">LIVE</span>
                        </div>
                      </div>

                      {/* Match Info */}
                      <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-white/60">Próximo partido</span>
                          <span className="text-xs font-medium text-[#FDBA74]">15 Jun 2026</span>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center">
                            <span className="text-2xl">🇲🇽</span>
                            <p className="text-xs font-medium text-white/80">MEX</p>
                          </div>
                          <span className="text-lg font-bold text-white/50">vs</span>
                          <div className="text-center">
                            <span className="text-2xl">🇺🇸</span>
                            <p className="text-xs font-medium text-white/80">USA</p>
                          </div>
                        </div>
                      </div>

                      {/* Demand Index */}
                      <div className="mb-5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-white/60">Índice de demanda</span>
                          <span className="text-xs font-semibold text-[#5EEAD4]">MUY ALTA</span>
                        </div>
                        <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.12]">
                          <div className="absolute inset-y-0 left-0 w-[92%] rounded-full bg-gradient-to-r from-[#14B8A6] via-[#FB923C] to-[#F97316]" />
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] text-white/50">
                          <span>Normal</span>
                          <span className="font-bold text-[#FDBA74]">192%</span>
                        </div>
                      </div>

                      {/* Recommendations Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-[#14B8A6]/15 p-3 text-center">
                          <p className="text-lg font-bold text-[#5EEAD4]">+42%</p>
                          <p className="text-[10px] text-white/70">Precio sugerido</p>
                        </div>
                        <div className="rounded-xl bg-[#F97316]/15 p-3 text-center">
                          <p className="text-lg font-bold text-[#FDBA74]">+85%</p>
                          <p className="text-[10px] text-white/70">Personal extra</p>
                        </div>
                        <div className="rounded-xl bg-[#FFD700]/15 p-3 text-center">
                          <p className="text-lg font-bold text-[#FDE68A]">+57%</p>
                          <p className="text-[10px] text-white/70">Inventario</p>
                        </div>
                      </div>
                    </div>

                    {/* Floating Badge - Cities */}
                    <div className="absolute -left-4 bottom-1/4 hidden rounded-xl border border-white/[0.12] bg-[#0A534E]/95 px-3 py-2 backdrop-blur-md lg:block">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          <span className="text-sm">🇺🇸</span>
                          <span className="text-sm">🇲🇽</span>
                          <span className="text-sm">🇨🇦</span>
                        </div>
                        <span className="text-xs font-medium text-white/90">16 ciudades</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Stats Row */}
              <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold text-[#FDE68A]">104</p>
                  <p className="text-sm font-medium text-white/70">Partidos</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold text-[#5EEAD4]">48</p>
                  <p className="text-sm font-medium text-white/70">Selecciones</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold text-[#FDBA74]">6.5M</p>
                  <p className="text-sm font-medium text-white/70">Visitantes esperados</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 text-center backdrop-blur-sm">
                  <p className="text-2xl font-bold text-white">39</p>
                  <p className="text-sm font-medium text-white/70">Días de evento</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Communication Channels - Based on Logo Colors */}
        <section className="relative -mt-px overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(180deg, #0A534E 0%, #0D9488 25%, #115E59 50%, #0F766E 75%, #134E4A 100%)' }}>
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-20 h-[400px] w-[400px] rounded-full bg-[#2DD4BF]/15 blur-[100px]" />
            <div className="absolute -left-20 top-1/2 h-[350px] w-[350px] rounded-full bg-[#FF6B35]/12 blur-[90px]" />
            <div className="absolute -bottom-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#14B8A6]/10 blur-[120px]" />
          </div>

          <div className="container relative">
            <div className="mx-auto max-w-7xl">
              {/* Two-column layout */}
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">

                {/* Left Column - Header + Inbox Preview (7 cols) */}
                <div className="lg:col-span-7">
                  {/* Section Header */}
                  <div className="mb-8 text-center lg:text-left">
                    <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#14B8A6]/20 bg-[#0F766E]/10 px-5 py-2.5 backdrop-blur-sm">
                      <MessageSquare className="h-4 w-4 text-[#14B8A6]" />
                      <span className="text-sm font-medium text-[#14B8A6]">Comunicación Unificada</span>
                    </div>

                    <h2 className="mb-4 text-[2rem] font-semibold leading-[1.2] tracking-tight text-[#F5F7FA] sm:text-[2.5rem] lg:text-[2.75rem]">
                      Contéstales donde{' '}
                      <span className="bg-gradient-to-r from-[#2DD4BF] to-[#14B8A6] bg-clip-text text-transparent">
                        te escriban
                      </span>
                    </h2>

                    <p className="mx-auto max-w-lg text-base leading-relaxed text-[#B6C5C8] lg:mx-0 lg:text-lg">
                      WhatsApp, correo, SMS y más. Todos los mensajes en un solo lugar, sin brincar entre apps.
                    </p>
                  </div>

                  {/* Unified Inbox Preview */}
                  <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)]">
                    {/* Inbox Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] bg-gradient-to-r from-[#0F766E]/15 to-[#14B8A6]/10 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] shadow-lg shadow-[#0F766E]/25">
                          <Mail className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-white">{t.communication.inbox.title}</h3>
                      </div>
                      <span className="rounded-full bg-[#14B8A6]/20 px-2.5 py-1 text-xs font-semibold text-[#14B8A6]">
                        12 {t.communication.inbox.unread}
                      </span>
                    </div>

                    {/* Messages List */}
                    <div className="divide-y divide-white/[0.04] p-1.5">
                      {inboxMessages.map((msg, i) => {
                        const isWhatsApp = msg.channel === 'WhatsApp';
                        const isEmail = msg.channel === 'Email';
                        const gradientFrom = isWhatsApp ? '#22c55e' : isEmail ? '#3b82f6' : '#F97316';
                        const gradientTo = isWhatsApp ? '#16a34a' : isEmail ? '#2563eb' : '#FB923C';

                        return (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.03]"
                          >
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md"
                              style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
                            >
                              <MessageSquare className="h-4 w-4 text-white" strokeWidth={1.75} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 flex items-center justify-between gap-2">
                                <span className="text-[14px] font-semibold text-white">{msg.from}</span>
                                <span className="text-[11px] text-white/30">{msg.time}</span>
                              </div>
                              <p className="truncate text-[13px] text-white/50">{msg.message}</p>
                            </div>

                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#14B8A6]" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Inbox Footer */}
                    <div className="border-t border-white/[0.06] bg-white/[0.02] px-5 py-3">
                      <Button
                        variant="ghost"
                        className="h-9 w-full justify-center gap-2 rounded-xl text-sm text-[#14B8A6] hover:bg-[#14B8A6]/10 hover:text-[#14B8A6]"
                      >
                        Ver todos los mensajes
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Channel Cards (5 cols) */}
                <div className="flex flex-col justify-center lg:col-span-5">
                  <div className="mb-4 hidden text-center lg:block lg:text-left">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#5EEAD4]/70">Canales Integrados</span>
                  </div>

                  <div className="space-y-3">
                    {channels.map((channel, index) => {
                      const isTeal = index % 2 === 0;
                      const gradientFrom = isTeal ? '#0F766E' : '#F97316';
                      const gradientTo = isTeal ? '#14B8A6' : '#FB923C';
                      const shadowColor = isTeal ? '#0F766E' : '#F97316';

                      return (
                        <div
                          key={channel.data.name}
                          className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06]"
                        >
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105"
                              style={{
                                background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                                boxShadow: `0 6px 20px -4px ${shadowColor}50`
                              }}
                            >
                              <channel.icon className="h-5 w-5 text-white" strokeWidth={1.75} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-semibold text-white">{channel.data.name}</h3>
                              <p className="text-[13px] leading-relaxed text-white/50">{channel.data.description}</p>
                            </div>

                            {/* Arrow indicator */}
                            <ArrowRight className="h-4 w-4 shrink-0 text-white/20 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#14B8A6]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA under channels */}
                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                    <Button
                      asChild
                      size="default"
                      className="h-11 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#14B8A6] px-6 font-semibold text-white shadow-lg shadow-[#0D9488]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#0D9488]/40"
                    >
                      <Link href="/register">
                        Conectar canales
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Integrations - Based on Logo Colors */}
        <section id="integrations" className="relative -mt-px overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(180deg, #134E4A 0%, #0F766E 35%, #115E59 65%, #0D9488 100%)' }}>
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-1/4 h-[400px] w-[400px] rounded-full bg-[#2DD4BF]/12 blur-[100px]" />
            <div className="absolute -right-10 top-0 h-[350px] w-[350px] rounded-full bg-[#FF6B35]/10 blur-[90px]" />
            <div className="absolute bottom-1/4 left-1/2 h-[300px] w-[300px] rounded-full bg-[#14B8A6]/15 blur-[80px]" />
          </div>

          <div className="container relative">
            <div className="mx-auto max-w-7xl">
              {/* Two-column layout */}
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">

                {/* Left Column - Header + Integration Grid (7 cols) */}
                <div className="lg:col-span-7">
                  {/* Section Header */}
                  <div className="mb-8 text-center lg:text-left">
                    <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#14B8A6]/20 bg-[#0F766E]/10 px-5 py-2.5 backdrop-blur-sm">
                      <Globe className="h-4 w-4 text-[#14B8A6]" />
                      <span className="text-sm font-medium text-[#14B8A6]">Integraciones</span>
                    </div>

                    <h2 className="mb-4 text-[2rem] font-semibold leading-[1.2] tracking-tight text-[#F5F7FA] sm:text-[2.5rem] lg:text-[2.75rem]">
                      Conecta con{' '}
                      <span className="bg-gradient-to-r from-[#2DD4BF] to-[#14B8A6] bg-clip-text text-transparent">
                        lo que ya usas
                      </span>
                    </h2>

                    <p className="mx-auto max-w-lg text-base leading-relaxed text-[#B6C5C8] lg:mx-0 lg:text-lg">
                      {t.integrations.subtitle}
                    </p>
                  </div>

                  {/* Integration Tools Grid - More visual */}
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {integrationTools.map((tool, index) => {
                      const isTeal = index % 3 !== 2;

                      return (
                        <div
                          key={tool}
                          className="group relative flex h-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.08]"
                        >
                          {/* Hover glow effect */}
                          <div
                            className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            style={{
                              background: `radial-gradient(circle at center, ${isTeal ? 'rgba(20,184,166,0.15)' : 'rgba(249,115,22,0.15)'} 0%, transparent 70%)`
                            }}
                          />
                          <span className="relative text-[13px] font-medium text-white/70 transition-colors group-hover:text-white">
                            {tool}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA */}
                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                    <Button
                      asChild
                      size="default"
                      className="h-11 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#14B8A6] px-6 font-semibold text-white shadow-lg shadow-[#0D9488]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#0D9488]/40"
                    >
                      <Link href="/integrations">
                        Ver todas las integraciones
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <span className="text-sm text-white/40">+50 integraciones disponibles</span>
                  </div>
                </div>

                {/* Right Column - Invoice Card (5 cols) */}
                <div className="flex flex-col justify-center lg:col-span-5">
                  <div className="mb-4 hidden text-center lg:block lg:text-left">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#5EEAD4]/70">Facturación Local</span>
                  </div>

                  {/* Country-specific invoicing card */}
                  <div className="overflow-hidden rounded-2xl border border-[#FF6B35]/20 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_16px_32px_-8px_rgba(249,115,22,0.12)]">
                    <div className="mb-5 flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F97316] shadow-lg shadow-[#FF6B35]/30">
                        <Receipt className="h-6 w-6 text-white" strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{t.integrations.invoice.title}</h3>
                          <span className="text-xl">{country.flag}</span>
                        </div>
                        <p className="text-sm text-white/50">{country.invoiceSystem}</p>
                      </div>
                    </div>

                    <p className="mb-4 text-[14px] leading-relaxed text-white/60">
                      {t.integrations.invoice.description}
                    </p>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {t.integrations.invoice.features.map((feature) => (
                        <span key={feature} className="inline-flex items-center gap-1.5 rounded-md bg-[#FF6B35]/10 px-2.5 py-1 text-[11px] font-medium text-[#FDBA74]">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <span className="text-xs text-white/40">{country.taxName} {country.taxRate}%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg text-xs text-[#FB923C] hover:bg-[#FF6B35]/10 hover:text-[#FB923C]"
                      >
                        Configurar
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Additional integration highlight */}
                  <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6] shadow-lg shadow-[#0F766E]/30">
                        <Zap className="h-5 w-5 text-white" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] font-semibold text-white">Zapier & Webhooks</h4>
                        <p className="text-[13px] text-white/50">Automatiza con cualquier herramienta</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/20" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Security & Compliance - Based on Logo Colors */}
        <section className="relative -mt-px overflow-hidden py-24 md:py-32" style={{ background: 'linear-gradient(180deg, #0D9488 0%, #0F766E 30%, #115E59 60%, #134E4A 100%)' }}>
          {/* Dynamic color play based on logo */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 top-20 h-[400px] w-[400px] rounded-full bg-[#2DD4BF]/20 blur-[110px]" />
            <div className="absolute -left-20 bottom-1/3 h-[350px] w-[350px] rounded-full bg-[#FF6B35]/12 blur-[90px]" />
            <div className="absolute bottom-0 right-1/3 h-[300px] w-[300px] rounded-full bg-[#14B8A6]/15 blur-[80px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#2DD4BF]/5 via-transparent to-[#FF6B35]/5" />
          </div>

          <div className="container relative">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#14B8A6]/20 bg-[#0F766E]/10 px-4 py-2">
                <Shield className="h-4 w-4 text-[#14B8A6]" />
                <span className="text-sm font-medium text-[#14B8A6]">Seguridad</span>
              </div>
              <h2 className="mb-5 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[42px]">
                {t.security.title}
              </h2>
              <p className="text-lg leading-relaxed text-white/50">
                {t.security.subtitle}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {securityFeatures.map((item, index) => {
                const isTeal = index % 2 === 0;
                const gradientFrom = isTeal ? '#0F766E' : '#FF6B35';
                const gradientTo = isTeal ? '#14B8A6' : '#FB923C';
                const shadowColor = isTeal ? '#0F766E' : '#FF6B35';

                return (
                  <div
                    key={item.data.title}
                    className="group rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-7 text-center backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]"
                  >
                    <div
                      className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                        boxShadow: `0 8px 24px -4px ${shadowColor}40`
                      }}
                    >
                      <item.icon className="h-7 w-7 text-white" strokeWidth={1.75} />
                    </div>
                    <h3 className="mb-3 font-semibold tracking-tight text-white">{item.data.title}</h3>
                    <p className="text-sm leading-relaxed text-white/40">{item.data.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing - Based on Logo Colors */}
        <section id="pricing" className="relative -mt-px overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(180deg, #134E4A 0%, #115E59 25%, #0F766E 55%, #0D9488 100%)' }}>
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-0 h-[400px] w-[400px] rounded-full bg-[#2DD4BF]/15 blur-[100px]" />
            <div className="absolute -right-32 top-1/3 h-[350px] w-[350px] rounded-full bg-[#FF6B35]/12 blur-[90px]" />
            <div className="absolute -bottom-20 left-1/3 h-[300px] w-[300px] rounded-full bg-[#14B8A6]/15 blur-[80px]" />
          </div>

          <div className="container relative">
            {/* Header */}
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#FF6B35]/20 bg-[#FF6B35]/10 px-5 py-2.5 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-[#FB923C]" />
                <span className="text-sm font-medium text-[#FB923C]">Precios Transparentes</span>
              </div>

              <h2 className="mb-4 text-[2rem] font-semibold leading-[1.2] tracking-tight text-[#F5F7FA] sm:text-[2.5rem] lg:text-[2.75rem]">
                Precios{' '}
                <span className="bg-gradient-to-r from-[#FB923C] to-[#FF6B35] bg-clip-text text-transparent">
                  sin sorpresas
                </span>
              </h2>

              <p className="mx-auto max-w-lg text-base leading-relaxed text-[#B6C5C8] lg:text-lg">
                {t.pricing.subtitle}
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-3">
              {/* Starter Plan */}
              <div className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06]">
                <div className="mb-4">
                  <div className="mb-3 inline-flex items-center rounded-lg bg-[#14B8A6]/10 px-2.5 py-1">
                    <span className="text-xs font-semibold text-[#5EEAD4]">BÁSICO</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.pricing.starter.name}</h3>
                  <p className="mt-1 text-[13px] text-white/50">{t.pricing.starter.description}</p>
                </div>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{pricing.starter.formatted}</span>
                  <span className="text-sm text-white/40">/mes</span>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {t.pricing.starter.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-white/60">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#14B8A6]" strokeWidth={2.5} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button asChild variant="outline" className="h-11 w-full rounded-xl border-white/15 bg-white/5 font-medium text-white transition-all hover:border-white/25 hover:bg-white/10">
                  <Link href="/register">{t.pricing.starter.cta}</Link>
                </Button>
              </div>

              {/* Professional Plan - Featured */}
              <div className="group relative flex flex-col rounded-2xl border-2 border-[#14B8A6]/40 bg-gradient-to-b from-[#14B8A6]/15 to-white/[0.04] p-6 shadow-[0_16px_40px_-8px_rgba(20,184,166,0.25)] lg:-my-4 lg:py-8">
                {/* Popular badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-4 py-1.5 shadow-lg shadow-[#0F766E]/30">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">{t.pricing.professional.popular}</span>
                  </div>
                </div>

                <div className="mb-4 mt-2">
                  <div className="mb-3 inline-flex items-center rounded-lg bg-[#14B8A6]/20 px-2.5 py-1">
                    <span className="text-xs font-semibold text-[#5EEAD4]">RECOMENDADO</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.pricing.professional.name}</h3>
                  <p className="mt-1 text-[13px] text-white/50">{t.pricing.professional.description}</p>
                </div>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{pricing.professional.formatted}</span>
                  <span className="text-sm text-white/40">{t.pricing.perUser}</span>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {t.pricing.professional.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-white/70">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2DD4BF]" strokeWidth={2.5} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button asChild className="h-11 w-full rounded-xl bg-gradient-to-r from-[#0D9488] to-[#14B8A6] font-semibold text-white shadow-lg shadow-[#0D9488]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#0D9488]/40">
                  <Link href="/register">{t.pricing.professional.cta}</Link>
                </Button>
              </div>

              {/* Enterprise Plan */}
              <div className="group relative flex flex-col rounded-2xl border border-[#FF6B35]/20 bg-gradient-to-b from-[#FF6B35]/8 to-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:border-[#FF6B35]/30">
                <div className="mb-4">
                  <div className="mb-3 inline-flex items-center rounded-lg bg-[#FF6B35]/15 px-2.5 py-1">
                    <span className="text-xs font-semibold text-[#FDBA74]">EMPRESAS</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{t.pricing.enterprise.name}</h3>
                  <p className="mt-1 text-[13px] text-white/50">{t.pricing.enterprise.description}</p>
                </div>

                <div className="mb-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#FB923C]">{pricing.enterprise}</span>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {t.pricing.enterprise.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-white/60">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FB923C]" strokeWidth={2.5} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button asChild variant="outline" className="h-11 w-full rounded-xl border-[#FF6B35]/25 bg-[#FF6B35]/10 font-medium text-[#FB923C] transition-all hover:border-[#FF6B35]/40 hover:bg-[#FF6B35]/15">
                  <Link href="/register">{t.pricing.enterprise.cta}</Link>
                </Button>
              </div>
            </div>

            {/* Trust elements */}
            <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                <span>14 días gratis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                <span>Cancela cuando quieras</span>
              </div>
            </div>

            {/* Currency note */}
            <p className="mt-6 text-center text-xs text-white/30">
              {country.flag} {country.locale.startsWith('pt') ? 'Preços em' : 'Precios en'} {country.currencyName} ({country.currency})
            </p>
          </div>
        </section>

        {/* CTA - Based on Logo Colors */}
        <section className="relative -mt-px overflow-hidden py-16 md:py-24" style={{ background: 'linear-gradient(180deg, #0D9488 0%, #0F766E 50%, #115E59 100%)' }}>
          {/* Ambient glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full bg-[#2DD4BF]/15 blur-[100px]" />
            <div className="absolute -right-20 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full bg-[#FF6B35]/12 blur-[100px]" />
          </div>

          <div className="container relative">
            <div className="mx-auto max-w-4xl">
              {/* CTA Card */}
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-8 text-center shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] backdrop-blur-sm md:p-12">
                {/* Decorative accents */}
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-[#FF6B35]/25 to-transparent blur-2xl" />
                <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-br from-[#14B8A6]/25 to-transparent blur-2xl" />

                {/* Badge */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF6B35]/20 bg-[#FF6B35]/10 px-4 py-2">
                  <TrendingUp className="h-4 w-4 text-[#FB923C]" />
                  <span className="text-sm font-medium text-[#FB923C]">Aumenta tus ventas</span>
                </div>

                {/* Title */}
                <h2 className="mb-4 text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-[#F5F7FA] sm:text-[2.25rem] lg:text-[2.5rem]">
                  Deja de perder ventas{' '}
                  <span className="bg-gradient-to-r from-[#FB923C] to-[#FF6B35] bg-clip-text text-transparent">
                    que ya tenías ganadas
                  </span>
                </h2>

                {/* Subtitle */}
                <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-[#B6C5C8] lg:text-lg">
                  {t.cta.subtitle}
                </p>

                {/* Buttons */}
                <div className="mb-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="default" className="h-12 gap-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#F97316] px-7 font-semibold text-white shadow-lg shadow-[#FF6B35]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#FF6B35]/40">
                    <Link href="/register">
                      {t.cta.button}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="default" variant="outline" className="h-12 rounded-xl border-white/15 bg-white/5 px-7 font-medium text-white transition-all hover:border-white/25 hover:bg-white/10">
                    <Link href="/app">
                      {t.cta.buttonSecondary}
                    </Link>
                  </Button>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/40">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                    Setup en 5 minutos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                    Sin código
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#14B8A6]" />
                    Soporte en español
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative -mt-px overflow-hidden" style={{ background: 'linear-gradient(180deg, #115E59 0%, #0F766E 35%, #134E4A 100%)' }}>
        {/* Background pattern - visible and integrated */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'url(/images/patterns/footer-pattern.png)',
            backgroundSize: '350px 350px',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            opacity: 0.12,
          }}
        />
        {/* Gradient overlay to blend pattern edges */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#115E59]/40 via-transparent to-[#134E4A]/30" />

        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-0 h-[300px] w-[300px] rounded-full bg-[#2DD4BF]/8 blur-[100px]" />
          <div className="absolute -right-20 bottom-0 h-[250px] w-[250px] rounded-full bg-[#FF6B35]/6 blur-[80px]" />
        </div>

        <div className="container relative py-12 md:py-16">
          {/* Main Footer Content */}
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">

            {/* Brand Column */}
            <div className="lg:col-span-4">
              <Link href="/" className="group mb-5 inline-flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-xl bg-[#14B8A6]/20 blur-md transition-all group-hover:bg-[#14B8A6]/30" />
                  <Image
                    alt="Ventazo logo"
                    className="relative h-10 w-10 drop-shadow-lg transition-transform group-hover:scale-105"
                    height={40}
                    src="/images/hero/logo.png"
                    width={40}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white transition-colors group-hover:text-[#14B8A6]">Ventazo</span>
                  <span className="text-xs font-medium text-white/50">
                    by{' '}
                    <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
                      Zuclubit
                    </span>
                  </span>
                </div>
              </Link>

              <p className="mb-5 max-w-xs text-[14px] leading-relaxed text-white/50">
                {t.footer.description}
              </p>

              {/* Social Links */}
              <div className="flex gap-2">
                {['X', 'In', 'Git', 'YT'].map((social) => (
                  <Link
                    key={social}
                    href="#"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/50 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
                  >
                    {social}
                  </Link>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#5EEAD4]">{t.footer.product}</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="#features" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.nav.features}
                  </Link>
                </li>
                <li>
                  <Link href="#ai" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.ai.badge}
                  </Link>
                </li>
                <li>
                  <Link href="#integrations" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.nav.integrations}
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.nav.pricing}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources Links */}
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#FDBA74]">{t.footer.resources}</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/app" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.footer.demo}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.footer.documentation}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.footer.api}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.footer.blog}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/60">{t.footer.legal}</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.footer.privacy}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.footer.terms}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    {t.footer.cookies}
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    GDPR
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div className="lg:col-span-2">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/60">Soporte</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    Centro de ayuda
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-[14px] text-white/50 transition-colors hover:text-white">
                    Estado del sistema
                  </Link>
                </li>
              </ul>

              {/* Status indicator */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#14B8A6] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#14B8A6]" />
                </span>
                <span className="text-xs text-white/50">{t.footer.status}</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 md:flex-row">
            <p className="text-xs text-white/35">
              {t.footer.copyright}
            </p>

            <div className="flex items-center gap-4">
              {/* Countries */}
              <div className="flex items-center gap-1.5 text-xs text-white/35">
                <Globe className="h-3.5 w-3.5" />
                <span>{t.footer.countries}</span>
              </div>

              {/* Country flag */}
              <div className="flex items-center gap-1.5 text-xs text-white/35">
                <span>{country.flag}</span>
                <span>{country.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
