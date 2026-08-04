import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Genuinely global, cross-page UI state only — sidebar collapse and the
 * mobile drawer. Server data (matches, stats, users, ...) belongs to
 * TanStack Query, never here.
 */
interface UiState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: 'cecafa-dashboard-ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
)
