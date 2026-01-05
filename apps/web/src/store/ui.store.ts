// ============================================
// UI Store - FASE 2
// Zustand store for UI state
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================
// Types
// ============================================

export interface SidebarState {
  isCollapsed: boolean;
  openSections: string[];
  width: number;
}

export type Theme = 'light' | 'dark' | 'system';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  sidebar: SidebarState;

  // Theme
  theme: Theme;

  // Command palette
  commandPaletteOpen: boolean;

  // Notifications panel
  notificationsPanelOpen: boolean;

  // Toasts
  toasts: Toast[];

  // Mobile
  isMobileMenuOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSection: (section: string) => void;
  setTheme: (theme: Theme) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleNotificationsPanel: () => void;
  setNotificationsPanelOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

// ============================================
// Store
// ============================================

export const useUIStore = create<UIState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      sidebar: {
        isCollapsed: false,
        openSections: ['Principal', 'Ventas'],
        width: 256,
      },
      theme: 'system',
      commandPaletteOpen: false,
      notificationsPanelOpen: false,
      toasts: [],
      isMobileMenuOpen: false,

      // ============================================
      // Sidebar Actions
      // ============================================

      toggleSidebar: () => {
        set((state) => {
          state.sidebar.isCollapsed = !state.sidebar.isCollapsed;
        });
      },

      setSidebarCollapsed: (collapsed) => {
        set((state) => {
          state.sidebar.isCollapsed = collapsed;
        });
      },

      toggleSection: (section) => {
        set((state) => {
          const index = state.sidebar.openSections.indexOf(section);
          if (index > -1) {
            state.sidebar.openSections.splice(index, 1);
          } else {
            state.sidebar.openSections.push(section);
          }
        });
      },

      // ============================================
      // Theme Actions
      // ============================================

      setTheme: (theme) => {
        set((state) => {
          state.theme = theme;
        });
      },

      // ============================================
      // Command Palette Actions
      // ============================================

      toggleCommandPalette: () => {
        set((state) => {
          state.commandPaletteOpen = !state.commandPaletteOpen;
        });
      },

      setCommandPaletteOpen: (open) => {
        set((state) => {
          state.commandPaletteOpen = open;
        });
      },

      // ============================================
      // Notifications Panel Actions
      // ============================================

      toggleNotificationsPanel: () => {
        set((state) => {
          state.notificationsPanelOpen = !state.notificationsPanelOpen;
        });
      },

      setNotificationsPanelOpen: (open) => {
        set((state) => {
          state.notificationsPanelOpen = open;
        });
      },

      // ============================================
      // Toast Actions
      // ============================================

      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => {
          state.toasts.push({ ...toast, id });
        });

        // Auto-remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, duration);
        }

        return id;
      },

      removeToast: (id) => {
        set((state) => {
          const index = state.toasts.findIndex((t) => t.id === id);
          if (index > -1) {
            state.toasts.splice(index, 1);
          }
        });
      },

      clearToasts: () => {
        set((state) => {
          state.toasts = [];
        });
      },

      // ============================================
      // Mobile Menu Actions
      // ============================================

      toggleMobileMenu: () => {
        set((state) => {
          state.isMobileMenuOpen = !state.isMobileMenuOpen;
        });
      },

      setMobileMenuOpen: (open) => {
        set((state) => {
          state.isMobileMenuOpen = open;
        });
      },
    })),
    {
      name: 'zuclubit-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebar: state.sidebar,
        theme: state.theme,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const useSidebar = () => useUIStore((state) => state.sidebar);
export const useIsSidebarCollapsed = () =>
  useUIStore((state) => state.sidebar.isCollapsed);
export const useTheme = () => useUIStore((state) => state.theme);
export const useIsCommandPaletteOpen = () =>
  useUIStore((state) => state.commandPaletteOpen);
export const useToasts = () => useUIStore((state) => state.toasts);
export const useIsMobileMenuOpen = () =>
  useUIStore((state) => state.isMobileMenuOpen);

// Toast helper hook
export function useToast() {
  const addToast = useUIStore((state) => state.addToast);
  const removeToast = useUIStore((state) => state.removeToast);

  return {
    toast: addToast,
    dismiss: removeToast,
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
  };
}
