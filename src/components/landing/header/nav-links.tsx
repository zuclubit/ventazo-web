'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { NavLinksProps } from './types';

/**
 * NavLinks Component
 *
 * Renders navigation links in a pill-style container.
 * Includes organic hover effects matching the hero design.
 */
export function NavLinks({ items, className, variant = 'pill' }: NavLinksProps) {
  if (items.length === 0) return null;

  const containerStyles = {
    pill: 'rounded-full border border-white/10 bg-white/5 px-2 py-1.5 backdrop-blur-md',
    minimal: 'gap-1',
    underline: 'gap-2',
  };

  const linkStyles = {
    pill: 'rounded-full px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white',
    minimal: 'px-3 py-2 text-sm text-white/70 transition-colors hover:text-white',
    underline: 'px-3 py-2 text-sm text-white/70 transition-colors hover:text-white relative after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-ventazo-400 after:scale-x-0 after:transition-transform hover:after:scale-x-100',
  };

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'flex items-center',
        containerStyles[variant],
        className
      )}
      role="navigation"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          className={cn(
            linkStyles[variant],
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ventazo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
          )}
          href={item.href}
          {...(item.isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {item.icon && <item.icon className="mr-2 h-4 w-4" />}
          {item.label}
          {item.badge && (
            <span className="ml-2 rounded-full bg-coral-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
