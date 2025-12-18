import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'sales' | 'viewer';
}

export interface SidebarState {
  isCollapsed: boolean;
  openSections: string[];
}

export interface UIState {
  sidebar: SidebarState;
  theme: 'light' | 'dark' | 'system';
  commandPaletteOpen: boolean;
}

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // UI state
  ui: UIState;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;

  // UI Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSection: (section: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

const initialUIState: UIState = {
  sidebar: {
    isCollapsed: false,
    openSections: ['Principal', 'Ventas'],
  },
  theme: 'system',
  commandPaletteOpen: false,
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      ui: initialUIState,

      // User actions
      setUser: (user) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = !!user;
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.isAuthenticated = false;
        }),

      // UI actions
      toggleSidebar: () =>
        set((state) => {
          state.ui.sidebar.isCollapsed = !state.ui.sidebar.isCollapsed;
        }),

      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.ui.sidebar.isCollapsed = collapsed;
        }),

      toggleSection: (section) =>
        set((state) => {
          const index = state.ui.sidebar.openSections.indexOf(section);
          if (index > -1) {
            state.ui.sidebar.openSections.splice(index, 1);
          } else {
            state.ui.sidebar.openSections.push(section);
          }
        }),

      setTheme: (theme) =>
        set((state) => {
          state.ui.theme = theme;
        }),

      setCommandPaletteOpen: (open) =>
        set((state) => {
          state.ui.commandPaletteOpen = open;
        }),
    })),
    {
      name: 'zuclubit-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ui: state.ui,
        // Don't persist user - that should come from auth
      }),
    }
  )
);

// Selectors for performance
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAppStore((state) => state.isAuthenticated);
export const useSidebarState = () => useAppStore((state) => state.ui.sidebar);
export const useTheme = () => useAppStore((state) => state.ui.theme);
