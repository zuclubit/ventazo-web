'use client';

import * as React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ExternalLink,
  FileText,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Settings,
  Target,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
  isExternal?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { title: 'Dashboard', href: '/app', icon: Home },
      { title: 'Leads', href: '/app/leads', icon: Users, badge: '12' },
      { title: 'Oportunidades', href: '/app/opportunities', icon: Target },
      { title: 'Clientes', href: '/app/customers', icon: Building2 },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { title: 'Pipeline', href: '/app/pipeline', icon: Layers },
      { title: 'Cotizaciones', href: '/app/quotes', icon: FileText },
      { title: 'Facturación', href: '/app/billing', icon: Wallet },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { title: 'Email', href: '/app/email', icon: Mail },
      { title: 'WhatsApp', href: '/app/whatsapp', icon: MessageSquare },
      { title: 'Calendario', href: '/app/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Automatización',
    items: [
      { title: 'Workflows', href: '/app/workflows', icon: Workflow },
      { title: 'Reportes', href: '/app/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Desarrolladores',
    items: [
      {
        title: 'API Docs',
        href: process.env['NEXT_PUBLIC_API_DOCS_URL'] || 'https://zuclubit-lead-service.fly.dev/reference',
        icon: BookOpen,
        isExternal: true,
      },
    ],
  },
];

interface SidebarNavProps {
  isCollapsed?: boolean;
}

export function SidebarNav({ isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = React.useState<string[]>([
    'Principal',
    'Ventas',
  ]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  return (
    <ScrollArea className="flex-1 py-2">
      <TooltipProvider delayDuration={0}>
        <nav className="grid gap-1 px-2">
          {navigation.map((section) => (
            <div key={section.title} className="mb-2">
              {!isCollapsed && (
                <button
                  className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSection(section.title)}
                >
                  {section.title}
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform duration-200',
                      openSections.includes(section.title) && 'rotate-180'
                    )}
                  />
                </button>
              )}

              {(isCollapsed || openSections.includes(section.title)) && (
                <div className="grid gap-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    const LinkWrapper = item.isExternal
                      ? ({ children, ...props }: { children: React.ReactNode; href: string }) => (
                          <a href={props.href} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        )
                      : Link;

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.href} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <LinkWrapper href={item.href}>
                              <Button
                                className={cn(
                                  'h-9 w-9',
                                  isActive &&
                                    'bg-sidebar-accent text-sidebar-accent-foreground'
                                )}
                                size="icon"
                                variant={isActive ? 'secondary' : 'ghost'}
                              >
                                <item.icon className="h-4 w-4" />
                                <span className="sr-only">{item.title}</span>
                              </Button>
                            </LinkWrapper>
                          </TooltipTrigger>
                          <TooltipContent
                            className="flex items-center gap-2"
                            side="right"
                          >
                            {item.title}
                            {item.isExternal && <ExternalLink className="h-3 w-3" />}
                            {item.badge && (
                              <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                                {item.badge}
                              </span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <LinkWrapper key={item.href} href={item.href}>
                        <Button
                          className={cn(
                            'w-full justify-start gap-2',
                            isActive &&
                              'bg-sidebar-accent text-sidebar-accent-foreground'
                          )}
                          variant={isActive ? 'secondary' : 'ghost'}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                          {item.isExternal && <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />}
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                              {item.badge}
                            </span>
                          )}
                        </Button>
                      </LinkWrapper>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </TooltipProvider>

      {/* Settings at bottom */}
      <div className="mt-auto border-t px-2 pt-2">
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link href="/app/settings">
                <Button className="h-9 w-9" size="icon" variant="ghost">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Configuración</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Configuración</TooltipContent>
          </Tooltip>
        ) : (
          <Link href="/app/settings">
            <Button className="w-full justify-start gap-2" variant="ghost">
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
          </Link>
        )}
      </div>
    </ScrollArea>
  );
}
