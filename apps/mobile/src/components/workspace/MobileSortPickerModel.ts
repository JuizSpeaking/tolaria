export type MobileSortDirection = 'asc' | 'desc'

export type MobileCustomSort = {
  direction: MobileSortDirection | null
  field: string
}

const desktopBuiltInSortFields = new Set(['created', 'modified', 'status', 'title'])

export function mobileCustomSortFromValue(value: string): MobileCustomSort {
  const normalized = value.trim()
  const separator = normalized.lastIndexOf(':')
  if (separator <= 0) return noCustomSort()

  const direction = normalized.slice(separator + 1)
  if (!isMobileSortDirection(direction)) return noCustomSort()

  const rawField = normalized.slice(0, separator)
  const field = rawField.startsWith('property:') ? rawField.slice('property:'.length) : rawField
  return mobileSortFieldIsDesktopBuiltIn(field) ? noCustomSort() : { direction, field }
}

export function mobileCustomPropertySortValue(field: string, direction: MobileSortDirection) {
  return `property:${field.trim()}:${direction}`
}

export function mobileSortFieldIsDesktopBuiltIn(field: string) {
  return desktopBuiltInSortFields.has(field.trim().toLowerCase())
}

export function mobileSortFieldMatches(property: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  return property.toLowerCase().includes(normalizedQuery)
}

function noCustomSort(): MobileCustomSort {
  return { direction: null, field: '' }
}

function isMobileSortDirection(value: string): value is MobileSortDirection {
  return value === 'asc' || value === 'desc'
}
