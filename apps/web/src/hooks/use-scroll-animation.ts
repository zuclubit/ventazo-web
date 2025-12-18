'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
}

interface ScrollAnimationState {
  isVisible: boolean;
  hasAnimated: boolean;
  progress: number;
  direction: 'up' | 'down' | null;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -60px 0px',
    triggerOnce = false, // Changed default to false for bidirectional
    delay = 0
  } = options;

  const ref = useRef<T>(null);
  const lastScrollY = useRef(0);
  const [state, setState] = useState<ScrollAnimationState>({
    isVisible: false,
    hasAnimated: false,
    progress: 0,
    direction: null
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Track scroll direction
    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = currentScrollY;
      return direction;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const isIntersecting = entry.isIntersecting;
        const progress = Math.min(Math.max(entry.intersectionRatio, 0), 1);
        const direction = updateScrollDirection();

        if (isIntersecting) {
          // Element is entering viewport
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          if (delay > 0) {
            timeoutRef.current = setTimeout(() => {
              setState(prev => ({
                ...prev,
                isVisible: true,
                hasAnimated: true,
                progress,
                direction
              }));
            }, delay);
          } else {
            setState(prev => ({
              ...prev,
              isVisible: true,
              hasAnimated: true,
              progress,
              direction
            }));
          }

          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          // Element is leaving viewport - reset for re-animation
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          setState(prev => ({
            ...prev,
            isVisible: false,
            progress: 0,
            direction
          }));
        }
      },
      {
        threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, delay]);

  return {
    ref,
    isVisible: state.isVisible,
    hasAnimated: state.hasAnimated,
    progress: state.progress,
    direction: state.direction
  };
}

// Enhanced hook with parallax support
export function useParallaxScroll<T extends HTMLElement = HTMLDivElement>(
  speed: number = 0.5
) {
  const ref = useRef<T>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId: number;
    let ticking = false;

    const updatePosition = () => {
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementCenter = rect.top + rect.height / 2;
      const windowCenter = windowHeight / 2;
      const distanceFromCenter = elementCenter - windowCenter;

      const newOffset = distanceFromCenter * speed * -0.1;
      setOffset(newOffset);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(updatePosition);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updatePosition();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [speed]);

  return { ref, offset };
}

// Hook for staggered group animations
export function useStaggeredAnimation(
  itemCount: number,
  baseDelay: number = 80,
  options: UseScrollAnimationOptions = {}
) {
  const { ref, isVisible, progress, direction } = useScrollAnimation(options);

  const getItemStyle = useCallback((index: number) => {
    const delay = index * baseDelay;
    return {
      transitionDelay: `${delay}ms`,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'none' : 'translateY(24px)'
    };
  }, [isVisible, baseDelay]);

  const getDelay = useCallback((index: number) => index * baseDelay, [baseDelay]);

  return { ref, isVisible, progress, direction, getItemStyle, getDelay };
}
