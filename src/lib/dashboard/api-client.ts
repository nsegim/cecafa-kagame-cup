export class DashboardApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Thin fetch wrapper for the `/api/dashboard/*` aggregation routes — normalizes errors. */
export async function dashboardFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new DashboardApiError(body?.error || `Request failed (${res.status})`, res.status)
  }

  return res.json() as Promise<T>
}
