'use client';

import * as React from 'react';

import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';

// Premium animation presets with physics-based timing
type AnimationPreset =
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'fade'
  | 'scale'
  | 'scale-up'
  | 'blur'
  | 'slide-up'
  | 'slide-rotate'
  | 'spring-up'
  | 'elastic'
  | 'smooth-rise'
  | 'gentle-float';

// Easing functions - Fast, fluid, organic motion curves
const easingCurves = {
  // Snappy spring - minimal overshoot, very responsive
  spring: 'cubic-bezier(0.22, 1.0, 0.36, 1)',
  // Fast deceleration - quick start, smooth end
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  // Subtle elastic - barely noticeable bounce
  elastic: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
  // Ultra smooth - Apple-like, fast
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  // Organic flow - natural and fast
  gentle: 'cubic-bezier(0.0, 0, 0.2, 1)',
  // Fast expo - premium snappy feel
  expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // For exit animations - quick
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  // Symmetric for bidirectional - fast
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

interface AnimationConfig {
  initial: React.CSSProperties;
  visible: React.CSSProperties;
  easing: string;
  exitEasing: string;
  defaultDuration: number;
  exitDuration: number;
}

// Fast, fluid animation configurations - snappy and instant feel
const animationPresets: Record<AnimationPreset, AnimationConfig> = {
  'fade-up': {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, 12px, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
    easing: easingCurves.expo,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 280,
    exitDuration: 180,
  },
  'fade-down': {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, -12px, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
    easing: easingCurves.expo,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 280,
    exitDuration: 180,
  },
  'fade-left': {
    initial: {
      opacity: 0,
      transform: 'translate3d(16px, 0, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
    easing: easingCurves.expo,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 260,
    exitDuration: 160,
  },
  'fade-right': {
    initial: {
      opacity: 0,
      transform: 'translate3d(-16px, 0, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
    easing: easingCurves.expo,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 260,
    exitDuration: 160,
  },
  fade: {
    initial: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
    easing: easingCurves.smooth,
    exitEasing: easingCurves.smooth,
    defaultDuration: 220,
    exitDuration: 150,
  },
  scale: {
    initial: {
      opacity: 0,
      transform: 'scale3d(0.97, 0.97, 1)',
    },
    visible: {
      opacity: 1,
      transform: 'scale3d(1, 1, 1)',
    },
    easing: easingCurves.spring,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 250,
    exitDuration: 160,
  },
  'scale-up': {
    initial: {
      opacity: 0,
      transform: 'scale3d(0.96, 0.96, 1) translate3d(0, 10px, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'scale3d(1, 1, 1) translate3d(0, 0, 0)',
    },
    easing: easingCurves.expo,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 300,
    exitDuration: 180,
  },
  blur: {
    initial: {
      opacity: 0,
      filter: 'blur(4px)',
      transform: 'scale3d(1.01, 1.01, 1)',
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      transform: 'scale3d(1, 1, 1)',
    },
    easing: easingCurves.smooth,
    exitEasing: easingCurves.smooth,
    defaultDuration: 260,
    exitDuration: 160,
  },
  'slide-up': {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, 20px, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
    easing: easingCurves.expo,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 320,
    exitDuration: 200,
  },
  'slide-rotate': {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, 14px, 0) rotate3d(1, 0, 0, 2deg)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0) rotate3d(0, 0, 0, 0deg)',
    },
    easing: easingCurves.expo,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 280,
    exitDuration: 180,
  },
  'spring-up': {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, 14px, 0) scale3d(0.98, 0.98, 1)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
    },
    easing: easingCurves.spring,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 280,
    exitDuration: 180,
  },
  elastic: {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, 12px, 0) scale3d(0.98, 0.98, 1)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
    },
    easing: easingCurves.elastic,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 300,
    exitDuration: 180,
  },
  'smooth-rise': {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, 10px, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
    easing: easingCurves.gentle,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 260,
    exitDuration: 160,
  },
  'gentle-float': {
    initial: {
      opacity: 0,
      transform: 'translate3d(0, 8px, 0)',
    },
    visible: {
      opacity: 1,
      transform: 'translate3d(0, 0, 0)',
    },
    easing: easingCurves.easeOut,
    exitEasing: easingCurves.easeInOut,
    defaultDuration: 240,
    exitDuration: 150,
  },
};

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  preset?: AnimationPreset;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  easing?: keyof typeof easingCurves;
  style?: React.CSSProperties;
}

export function ScrollReveal({
  children,
  className,
  preset = 'smooth-rise',
  delay = 0,
  duration,
  threshold = 0.15,
  once = false, // Default to bidirectional
  easing,
  style,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation({
    threshold,
    triggerOnce: once,
    delay,
  });

  const config = animationPresets[preset];
  const finalDuration = duration ?? (isVisible ? config.defaultDuration : config.exitDuration);
  const finalEasing = easing
    ? easingCurves[easing]
    : (isVisible ? config.easing : config.exitEasing);

  const animationStyle: React.CSSProperties = {
    ...(isVisible ? config.visible : config.initial),
    transitionProperty: 'opacity, transform, filter',
    transitionDuration: `${finalDuration}ms`,
    transitionTimingFunction: finalEasing,
    transitionDelay: isVisible ? `${delay}ms` : '0ms', // No delay on exit
    willChange: 'opacity, transform, filter',
    backfaceVisibility: 'hidden',
    perspective: 1000,
    WebkitFontSmoothing: 'antialiased',
    ...style,
  };

  return (
    <div ref={ref} className={cn('transform-gpu', className)} style={animationStyle}>
      {children}
    </div>
  );
}

// Premium staggered group animation - bidirectional
interface ScrollRevealGroupProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  preset?: AnimationPreset;
  duration?: number;
  threshold?: number;
  easing?: keyof typeof easingCurves;
  once?: boolean;
}

export function ScrollRevealGroup({
  children,
  className,
  staggerDelay = 100,
  preset = 'smooth-rise',
  duration,
  threshold = 0.1,
  easing,
  once = false,
}: ScrollRevealGroupProps) {
  const { ref, isVisible } = useScrollAnimation({
    threshold,
    triggerOnce: once,
  });

  const config = animationPresets[preset];
  const finalDuration = duration ?? (isVisible ? config.defaultDuration : config.exitDuration);
  const finalEasing = easing
    ? easingCurves[easing]
    : (isVisible ? config.easing : config.exitEasing);

  return (
    <div ref={ref} className={className}>
      {React.Children.map(children, (child, index) => {
        // Reverse stagger on exit for more natural feel
        const entryDelay = index * staggerDelay;
        const exitDelay = (React.Children.count(children) - 1 - index) * (staggerDelay * 0.5);
        const itemDelay = isVisible ? entryDelay : exitDelay;

        const animationStyle: React.CSSProperties = {
          ...(isVisible ? config.visible : config.initial),
          transitionProperty: 'opacity, transform, filter',
          transitionDuration: `${finalDuration}ms`,
          transitionTimingFunction: finalEasing,
          transitionDelay: `${itemDelay}ms`,
          willChange: 'opacity, transform, filter',
          backfaceVisibility: 'hidden',
        };

        return (
          <div className="transform-gpu" style={animationStyle}>
            {child}
          </div>
        );
      })}
    </div>
  );
}

// Text reveal animation for headings - bidirectional
interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  preset?: 'word' | 'character';
  once?: boolean;
}

export function TextReveal({
  children,
  className,
  delay = 0,
  staggerDelay = 50,
  preset = 'word',
  once = false,
}: TextRevealProps) {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.2,
    triggerOnce: once,
    delay,
  });

  const items = preset === 'word' ? children.split(' ') : children.split('');
  const separator = preset === 'word' ? ' ' : '';

  return (
    <span ref={ref} className={cn('inline-block', className)}>
      {items.map((item, index) => {
        const entryDelay = index * staggerDelay;
        const exitDelay = (items.length - 1 - index) * (staggerDelay * 0.5);
        const itemDelay = isVisible ? entryDelay : exitDelay;

        return (
          <span
            key={index}
            className="inline-block transform-gpu"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 20px, 0)',
              transitionProperty: 'opacity, transform',
              transitionDuration: isVisible ? '600ms' : '400ms',
              transitionTimingFunction: isVisible ? easingCurves.expo : easingCurves.easeInOut,
              transitionDelay: `${itemDelay}ms`,
            }}
          >
            {item}
            {separator}
          </span>
        );
      })}
    </span>
  );
}
