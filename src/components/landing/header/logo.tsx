'use client';

import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { LogoProps } from './types';

/**
 * Logo Component
 *
 * Renders the brand logo with glow effect.
 * Matches the hero's visual style with organic gradients.
 */
export function Logo({ text, href = '/', className, showAttribution = false }: LogoProps) {
  return (
    <Link
      className={cn(
        'group flex items-center gap-3 transition-transform hover:scale-[1.02]',
        className
      )}
      href={href}
    >
      {/* Logo image with organic glow */}
      <div className="relative">
        {/* Ambient glow - organic shape */}
        <div
          className="absolute inset-0 bg-ventazo-500/40 blur-lg transition-all group-hover:bg-ventazo-400/50 group-hover:blur-xl"
          style={{ borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%' }}
        />
        {/* Logo image */}
        <Image
          priority
          alt={`${text} logo`}
          className="relative h-10 w-10 object-contain drop-shadow-lg transition-transform group-hover:scale-105"
          height={40}
          src="/images/hero/logo.png"
          width={40}
        />
      </div>
      {/* Brand text with optional attribution */}
      <div className="flex flex-col">
        <span className="text-xl font-bold text-white transition-colors group-hover:text-ventazo-100 leading-tight">
          {text}
        </span>
        {showAttribution && (
          <span className="text-xs font-medium text-white/50">
            by{' '}
            <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
              Zuclubit
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
