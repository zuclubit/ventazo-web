// Layout components - Organisms
export * from './dashboard-shell';
// mobile-sidebar removed - consolidated into mobile-bottom-bar
export * from './navbar';
export * from './sidebar';
export * from './sidebar-context';
export * from './sidebar-nav';

// Premium Sidebar Components 2025
export * from './sidebar-premium';
export * from './sidebar-brand';
export * from './nav-item-premium';
export * from './mobile-bottom-bar';

// Page Container - Standard layout system
export { PageContainer } from './page-container';
export type {
  PageContainerProps,
  PageHeaderProps as PageContainerHeaderProps,
  PageContentProps,
  PageSidebarProps,
  PageVariant,
  ScrollBehavior,
} from './page-container';

// Re-export PageHeader from common for backwards compatibility
export { PageHeader } from '@/components/common/page-header';
