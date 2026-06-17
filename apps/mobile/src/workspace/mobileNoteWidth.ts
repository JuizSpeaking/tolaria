import type { MobileNoteWidth } from './mobileWorkspaceModel'

export function normalizeMobileNoteWidth(value: unknown): MobileNoteWidth | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  return normalized === 'normal' || normalized === 'wide' ? normalized : null
}
