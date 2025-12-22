'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { CTAButton, HeaderCTAProps } from './types';

/**
 * HeaderCTA Component
 *
 * Renders CTA buttons with premium styling.
 * Matches hero button styles for visual consistency.
 */
export function HeaderCTA({ buttons, className }: HeaderCTAProps) {
  const getButtonStyles = (variant: CTAButton['variant']) => {
    switch (variant) {
      case 'primary':
        return 'rounded-full bg-gradient-to-r from-ventazo-500 to-ventazo-600 px-5 text-white shadow-lg shadow-ventazo-500/25 transition-all hover:shadow-xl hover:shadow-ventazo-500/35 hover:scale-[1.02] active:scale-[0.98]';
      case 'secondary':
        return 'rounded-full bg-white/10 px-5 text-white backdrop-blur-sm transition-all hover:bg-white/20';
      case 'outline':
        return 'rounded-full border-white/20 bg-transparent px-5 text-white transition-all hover:border-white/40 hover:bg-white/5';
      case 'ghost':
        return 'rounded-full px-5 text-white/70 transition-colors hover:text-white hover:bg-white/5';
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {buttons.map((button, index) => (
        <Button
          key={index}
          asChild
          className={cn(
            getButtonStyles(button.variant),
            'focus-visible:ring-2 focus-visible:ring-ventazo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
          )}
          size="sm"
          variant={button.variant === 'outline' ? 'outline' : 'default'}
        >
          <Link href={button.href}>
            {button.icon && button.iconPosition === 'left' && (
              <button.icon className="mr-2 h-4 w-4" />
            )}
            {button.label}
            {button.icon && button.iconPosition === 'right' && (
              <button.icon className="ml-2 h-4 w-4" />
            )}
          </Link>
        </Button>
      ))}
    </div>
  );
}
