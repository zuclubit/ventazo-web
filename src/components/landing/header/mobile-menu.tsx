'use client';

import { useEffect } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { CTAButton, MobileMenuProps } from './types';

/**
 * MobileMenu Component
 *
 * Full-screen mobile navigation menu with organic animations.
 * Includes backdrop blur and smooth transitions.
 */
export function MobileMenu({ items, ctaButtons, isOpen, onClose }: MobileMenuProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getButtonStyles = (variant: CTAButton['variant']) => {
    switch (variant) {
      case 'primary':
        return 'w-full rounded-2xl bg-gradient-to-r from-ventazo-500 to-ventazo-600 py-4 text-base font-semibold text-white shadow-lg shadow-ventazo-500/25';
      case 'outline':
        return 'w-full rounded-2xl border-white/20 bg-white/5 py-4 text-base text-white';
      default:
        return 'w-full rounded-2xl bg-white/10 py-4 text-base text-white';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        aria-label="Mobile navigation"
        aria-modal="true"
        className={cn(
          'fixed inset-x-0 top-0 z-50 flex h-[100dvh] flex-col bg-gradient-to-b from-[#062C2C] via-[#0A3D3D] to-[#052525] transition-transform duration-500 ease-out md:hidden',
          isOpen ? 'translate-y-0' : '-translate-y-full'
        )}
        role="dialog"
      >
        {/* Organic background shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 h-[400px] w-[400px] bg-gradient-to-bl from-ventazo-500/20 to-transparent blur-[80px]"
            style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
          />
          <div
            className="absolute -bottom-32 -left-20 h-[300px] w-[300px] bg-gradient-to-tr from-coral-500/15 to-transparent blur-[60px]"
            style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}
          />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5">
          <Link className="flex items-center gap-3" href="/" onClick={onClose}>
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-ventazo-500/30 blur-md" />
              <Image
                alt="Ventazo logo"
                className="relative h-10 w-10 object-contain drop-shadow-lg"
                height={40}
                src="/images/hero/logo.png"
                width={40}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white leading-tight">Ventazo</span>
              <span className="text-xs font-medium text-white/50">
                by{' '}
                <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
                  Zuclubit
                </span>
              </span>
            </div>
          </Link>
          <button
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="relative flex-1 overflow-y-auto px-6 py-8">
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.href}
                className="transform transition-all duration-300"
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? 'translateX(0)' : 'translateX(-20px)',
                }}
              >
                <Link
                  className={cn(
                    "flex items-center gap-4 rounded-2xl px-4 py-4 text-lg font-medium transition-all hover:bg-white/10",
                    item.highlight
                      ? "bg-gradient-to-r from-[#FDE68A]/15 to-[#FDBA74]/15 text-[#FDE68A] border border-[#FDE68A]/25 hover:from-[#FDE68A]/25 hover:to-[#FDBA74]/25"
                      : "text-white/90 hover:text-white"
                  )}
                  href={item.href}
                  onClick={onClose}
                >
                  {item.icon && <item.icon className="h-5 w-5 text-ventazo-400" />}
                  {item.label}
                  {item.highlight && (
                    <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[#FDE68A]" />
                  )}
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-coral-500 px-2 py-0.5 text-xs font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTA Buttons */}
        <div className="relative border-t border-white/10 px-6 py-6">
          <div className="space-y-3">
            {ctaButtons.map((button, index) => (
              <Button
                key={index}
                asChild
                className={getButtonStyles(button.variant)}
                size="lg"
                variant={button.variant === 'outline' ? 'outline' : 'default'}
              >
                <Link href={button.href} onClick={onClose}>
                  {button.icon && button.iconPosition === 'left' && (
                    <button.icon className="mr-2 h-5 w-5" />
                  )}
                  {button.label}
                  {button.icon && button.iconPosition === 'right' && (
                    <button.icon className="ml-2 h-5 w-5" />
                  )}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
