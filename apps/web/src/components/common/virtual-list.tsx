// ============================================
// Virtual List Component - FASE 5.12
// Efficient rendering for large data sets
// ============================================

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  innerClassName?: string;
  onScroll?: (scrollTop: number) => void;
  initialScrollTop?: number;
}

export interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  itemWidth: number;
  containerHeight: number;
  containerWidth: number;
  gap?: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  className?: string;
  innerClassName?: string;
}

// ============================================
// Virtual List Hook
// ============================================

interface UseVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

function useVirtualList(options: UseVirtualListOptions) {
  const { itemCount, itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = React.useState(0);

  const virtualItems = React.useMemo((): VirtualItem[] => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.floor(scrollTop / itemHeight) + visibleCount + overscan
    );

    const items: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight,
      });
    }

    return items;
  }, [scrollTop, itemCount, itemHeight, containerHeight, overscan]);

  const totalHeight = itemCount * itemHeight;

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop((e.target as HTMLElement).scrollTop);
  }, []);

  const scrollToIndex = React.useCallback(
    (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      let offset = index * itemHeight;
      if (align === 'center') {
        offset -= containerHeight / 2 - itemHeight / 2;
      } else if (align === 'end') {
        offset -= containerHeight - itemHeight;
      }
      setScrollTop(Math.max(0, Math.min(offset, totalHeight - containerHeight)));
    },
    [itemHeight, containerHeight, totalHeight]
  );

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    handleScroll,
    scrollToIndex,
    setScrollTop,
  };
}

// ============================================
// Virtual List Component
// ============================================

function VirtualListInner<T>(
  {
    items,
    itemHeight,
    containerHeight,
    overscan = 5,
    renderItem,
    getItemKey = (_, index) => index,
    className,
    innerClassName,
    onScroll,
    initialScrollTop = 0,
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { virtualItems, totalHeight, handleScroll, setScrollTop } = useVirtualList({
    itemCount: items.length,
    itemHeight,
    containerHeight,
    overscan,
  });

  // Set initial scroll position
  React.useEffect(() => {
    if (containerRef.current && initialScrollTop > 0) {
      containerRef.current.scrollTop = initialScrollTop;
      setScrollTop(initialScrollTop);
    }
  }, [initialScrollTop, setScrollTop]);

  const handleScrollEvent = React.useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      handleScroll(e);
      onScroll?.((e.target as HTMLElement).scrollTop);
    },
    [handleScroll, onScroll]
  );

  // Merge refs
  React.useImperativeHandle(ref, () => containerRef.current!);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScrollEvent}
    >
      <div
        className={cn('relative', innerClassName)}
        style={{ height: totalHeight }}
      >
        {virtualItems.map(({ index, start }) => {
          const item = items[index];
          if (!item) return null;

          const style: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: itemHeight,
            transform: `translateY(${start}px)`,
          };

          return (
            <React.Fragment key={getItemKey(item, index)}>
              {renderItem(item, index, style)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualList = React.forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

// ============================================
// Virtual Grid Component
// ============================================

function VirtualGridInner<T>(
  {
    items,
    itemHeight,
    itemWidth,
    containerHeight,
    containerWidth,
    gap = 0,
    overscan = 2,
    renderItem,
    getItemKey = (_, index) => index,
    className,
    innerClassName,
  }: VirtualGridProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

  const columnsCount = Math.floor(containerWidth / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const rowHeight = itemHeight + gap;
  const totalHeight = rowsCount * rowHeight;

  const virtualRows = React.useMemo(() => {
    const visibleRows = Math.ceil(containerHeight / rowHeight);
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(
      rowsCount - 1,
      Math.floor(scrollTop / rowHeight) + visibleRows + overscan
    );

    const rows: Array<{ rowIndex: number; start: number; items: T[] }> = [];
    for (let r = startRow; r <= endRow; r++) {
      const rowItems: T[] = [];
      for (let c = 0; c < columnsCount; c++) {
        const itemIndex = r * columnsCount + c;
        if (itemIndex < items.length) {
          const item = items[itemIndex];
          if (item !== undefined) {
            rowItems.push(item);
          }
        }
      }
      rows.push({
        rowIndex: r,
        start: r * rowHeight,
        items: rowItems,
      });
    }

    return rows;
  }, [scrollTop, items, columnsCount, rowsCount, rowHeight, containerHeight, overscan]);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop((e.target as HTMLElement).scrollTop);
  }, []);

  React.useImperativeHandle(ref, () => containerRef.current!);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className={cn('relative', innerClassName)}
        style={{ height: totalHeight }}
      >
        {virtualRows.map(({ rowIndex, start, items: rowItems }) => (
          <div
            key={rowIndex}
            className="absolute left-0 right-0 flex"
            style={{
              top: 0,
              transform: `translateY(${start}px)`,
              height: itemHeight,
              gap,
            }}
          >
            {rowItems.map((item, colIndex) => {
              const itemIndex = rowIndex * columnsCount + colIndex;
              const style: React.CSSProperties = {
                width: itemWidth,
                height: itemHeight,
                flexShrink: 0,
              };

              return (
                <React.Fragment key={getItemKey(item, itemIndex)}>
                  {renderItem(item, itemIndex, style)}
                </React.Fragment>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualGrid = React.forwardRef(VirtualGridInner) as <T>(
  props: VirtualGridProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

// ============================================
// Windowed Table Component
// ============================================

export interface VirtualTableColumn<T> {
  key: string;
  header: React.ReactNode;
  width?: number | string;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface VirtualTableProps<T> {
  items: T[];
  columns: VirtualTableColumn<T>[];
  rowHeight?: number;
  headerHeight?: number;
  containerHeight: number;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  rowClassName?: string | ((item: T, index: number) => string);
}

export function VirtualTable<T>({
  items,
  columns,
  rowHeight = 48,
  headerHeight = 44,
  containerHeight,
  overscan = 5,
  getItemKey = (_, index) => index,
  onRowClick,
  className,
  rowClassName,
}: VirtualTableProps<T>) {
  const bodyHeight = containerHeight - headerHeight;
  const { virtualItems, totalHeight, handleScroll } = useVirtualList({
    itemCount: items.length,
    itemHeight: rowHeight,
    containerHeight: bodyHeight,
    overscan,
  });

  return (
    <div className={cn('flex flex-col overflow-hidden border rounded-lg', className)}>
      {/* Header */}
      <div
        className="flex border-b bg-muted/50 shrink-0"
        style={{ height: headerHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={cn(
              'flex items-center px-4 font-medium text-muted-foreground text-sm',
              column.className
            )}
            style={{ width: column.width, flex: column.width ? 'none' : 1 }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        className="overflow-auto"
        style={{ height: bodyHeight }}
        onScroll={handleScroll}
      >
        <div className="relative" style={{ height: totalHeight }}>
          {virtualItems.map(({ index, start }) => {
            const item = items[index];
            if (!item) return null;

            const rowClassValue =
              typeof rowClassName === 'function'
                ? rowClassName(item, index)
                : rowClassName;

            return (
              <div
                key={getItemKey(item, index)}
                className={cn(
                  'absolute left-0 right-0 flex items-center border-b transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                  rowClassValue
                )}
                style={{
                  top: 0,
                  transform: `translateY(${start}px)`,
                  height: rowHeight,
                }}
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={cn('px-4 truncate', column.className)}
                    style={{ width: column.width, flex: column.width ? 'none' : 1 }}
                  >
                    {column.render(item, index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Infinite Scroll Hook
// ============================================

export interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  threshold?: number;
}

export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  threshold = 200,
}: UseInfiniteScrollOptions) {
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const [loadMoreRef, setLoadMoreRef] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!loadMoreRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    observerRef.current.observe(loadMoreRef);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loadMoreRef, hasNextPage, isFetchingNextPage, fetchNextPage, threshold]);

  return { loadMoreRef: setLoadMoreRef };
}

// ============================================
// Exports
// ============================================

export { useVirtualList };
