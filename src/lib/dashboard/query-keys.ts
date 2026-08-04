/** Centralized TanStack Query key factory — one place to keep collection keys from drifting. */
export const queryKeys = {
  stats: () => ['dashboard-stats'] as const,
  matches: {
    all: () => ['matches'] as const,
    detail: (id: number | string) => ['matches', id] as const,
  },
}
