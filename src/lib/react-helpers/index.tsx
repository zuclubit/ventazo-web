// ============================================
// React Helpers - FASE 5.12
// Memoization, Suspense, and rendering optimization
// ============================================

import * as React from 'react';

import { createPortal } from 'react-dom';

// ============================================
// Memoization Helpers
// ============================================

/**
 * Create a memoized selector for React Query data
 * Prevents unnecessary re-renders when data reference changes but content is same
 */
export function createSelector<TData, TResult>(
  selector: (data: TData) => TResult
): (data: TData | undefined) => TResult | undefined {
  let lastData: TData | undefined;
  let lastResult: TResult | undefined;

  return (data: TData | undefined): TResult | undefined => {
    if (data === undefined) return undefined;

    // Fast path: same reference
    if (data === lastData) return lastResult;

    // Calculate new result
    const result = selector(data);

    // Check if result actually changed (shallow compare for arrays/objects)
    if (shallowEqual(result, lastResult)) {
      return lastResult;
    }

    lastData = data;
    lastResult = result;
    return result;
  };
}

/**
 * Shallow equality check
 */
function shallowEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Deep compare hook - returns stable reference if deeply equal
 */
export function useDeepMemo<T>(value: T): T {
  const ref = React.useRef<T>(value);

  if (!deepEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
}

/**
 * Deep equality check
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}

// ============================================
// Suspense Helpers
// ============================================

/**
 * Suspense-enabled resource factory
 */
interface Resource<T> {
  read(): T;
  preload(): void;
}

type ResourceStatus<T> =
  | { status: 'pending'; promise: Promise<T> }
  | { status: 'success'; value: T }
  | { status: 'error'; error: unknown };

export function createResource<T>(fetchFn: () => Promise<T>): Resource<T> {
  let state: ResourceStatus<T> | null = null;

  const load = (): Promise<T> => {
    const promise = fetchFn();
    state = { status: 'pending', promise };

    promise.then(
      (value) => {
        state = { status: 'success', value };
      },
      (error) => {
        state = { status: 'error', error };
      }
    );

    return promise;
  };

  return {
    read(): T {
      if (!state) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw load();
      }

      switch (state.status) {
        case 'pending':
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw state.promise;
        case 'error':
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw state.error;
        case 'success':
          return state.value;
      }
    },
    preload(): void {
      if (!state) {
        void load();
      }
    },
  };
}

/**
 * Suspense boundary with built-in error handling
 */
export interface SuspenseWithErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  errorFallback?: React.ReactNode | ((error: Error, retry: () => void) => React.ReactNode);
}

// ============================================
// Render Optimization Hooks
// ============================================

/**
 * Skip initial render effect
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps?: React.DependencyList
): void {
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Run effect only once on mount
 */
export function useMountEffect(effect: () => void | (() => void)): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(effect, []);
}

/**
 * Run effect on unmount
 */
export function useUnmountEffect(effect: () => void): void {
  const effectRef = React.useRef(effect);
  effectRef.current = effect;

  React.useEffect(() => {
    return () => effectRef.current();
  }, []);
}

/**
 * Previous value hook
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>();
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * Track if component is mounted
 */
export function useIsMounted(): () => boolean {
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return React.useCallback(() => isMounted.current, []);
}

/**
 * Force re-render hook
 */
export function useForceUpdate(): () => void {
  const [, setState] = React.useState(0);
  return React.useCallback(() => setState((n) => n + 1), []);
}

// ============================================
// Event Handlers
// ============================================

/**
 * Stable callback ref that doesn't cause re-renders
 */
export function useEventCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const ref = React.useRef(callback);

  React.useLayoutEffect(() => {
    ref.current = callback;
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(
    ((...args: Parameters<T>) => ref.current(...args)) as T,
    []
  );
}

/**
 * Latest value ref - always has the latest value without causing re-renders
 */
export function useLatestRef<T>(value: T): React.MutableRefObject<T> {
  const ref = React.useRef(value);
  ref.current = value;
  return ref;
}

// ============================================
// Conditional Rendering
// ============================================

/**
 * Conditionally render component - better than && for performance
 */
export function Show<T>({
  when,
  fallback,
  children,
}: {
  when: T | undefined | null | false;
  fallback?: React.ReactNode;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}): React.ReactElement | null {
  if (!when) {
    return fallback ? <>{fallback}</> : null;
  }

  if (typeof children === 'function') {
    return <>{children(when)}</>;
  }

  return <>{children}</>;
}

/**
 * Iterate and render items
 */
export function For<T>({
  each,
  fallback,
  children,
}: {
  each: T[] | undefined | null;
  fallback?: React.ReactNode;
  children: (item: T, index: number) => React.ReactNode;
}): React.ReactElement | null {
  if (!each || each.length === 0) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{each.map((item, index) => children(item, index))}</>;
}

// ============================================
// State Management
// ============================================

/**
 * Toggle hook
 */
export function useToggle(
  initialValue = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = React.useState(initialValue);
  const toggle = React.useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue];
}

/**
 * Counter hook
 */
export function useCounter(
  initialValue = 0
): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
} {
  const [count, setCount] = React.useState(initialValue);

  return {
    count,
    increment: React.useCallback(() => setCount((c) => c + 1), []),
    decrement: React.useCallback(() => setCount((c) => c - 1), []),
    reset: React.useCallback(() => setCount(initialValue), [initialValue]),
    set: setCount,
  };
}

/**
 * List state hook
 */
export function useList<T>(
  initialValue: T[] = []
): {
  list: T[];
  set: (newList: T[]) => void;
  push: (item: T) => void;
  remove: (index: number) => void;
  update: (index: number, item: T) => void;
  insert: (index: number, item: T) => void;
  clear: () => void;
  filter: (fn: (item: T) => boolean) => void;
} {
  const [list, setList] = React.useState(initialValue);

  return {
    list,
    set: setList,
    push: React.useCallback((item: T) => setList((l) => [...l, item]), []),
    remove: React.useCallback(
      (index: number) => setList((l) => l.filter((_, i) => i !== index)),
      []
    ),
    update: React.useCallback(
      (index: number, item: T) =>
        setList((l) => l.map((v, i) => (i === index ? item : v))),
      []
    ),
    insert: React.useCallback(
      (index: number, item: T) =>
        setList((l) => [...l.slice(0, index), item, ...l.slice(index)]),
      []
    ),
    clear: React.useCallback(() => setList([]), []),
    filter: React.useCallback(
      (fn: (item: T) => boolean) => setList((l) => l.filter(fn)),
      []
    ),
  };
}

// ============================================
// Portal Helper
// ============================================

/**
 * Create portal to body
 */
export function Portal({
  children,
  container,
}: {
  children: React.ReactNode;
  container?: Element | null;
}): React.ReactPortal | null {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const target = container ?? document.body;
  return createPortal(children, target);
}

// ============================================
// Component Composition
// ============================================

/**
 * Merge multiple refs
 */
export function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

/**
 * Compose event handlers
 */
export function composeEventHandlers<E>(
  originalHandler?: (event: E) => void,
  ourHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {}
): (event: E) => void {
  return (event: E) => {
    originalHandler?.(event);

    if (
      checkForDefaultPrevented === false ||
      !(event as unknown as { defaultPrevented: boolean }).defaultPrevented
    ) {
      ourHandler?.(event);
    }
  };
}
