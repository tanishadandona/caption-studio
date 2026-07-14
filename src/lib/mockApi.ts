import type { ProjectSnapshot } from '@/types/caption'

const STORAGE_KEY = 'caption-studio:project'

/**
 * Mock project API — persists to localStorage to demonstrate
 * save/load without a backend. Swap these for real HTTP calls later.
 */
export const projectApi = {
  async save(snapshot: ProjectSnapshot): Promise<{ ok: true; id: string }> {
    await delay(180)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    return { ok: true, id: snapshot.id }
  },

  async load(): Promise<ProjectSnapshot | null> {
    await delay(120)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as ProjectSnapshot
    } catch {
      return null
    }
  },

  async clear(): Promise<void> {
    await delay(50)
    localStorage.removeItem(STORAGE_KEY)
  },
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
