/**
 * OKF (Open Knowledge Format) compatibility utilities.
 *
 * OKF spec v0.1 defines:
 * - `type` frontmatter field (required) — Tolaria maps this to `isA` internally
 * - Recommended fields: `title`, `description`, `resource`, `tags`, `timestamp`
 * - Reserved filenames: `index.md` (directory listing), `log.md` (update history)
 * - `okf_version` field in root `index.md` frontmatter
 *
 * Tolaria already preserves unknown frontmatter fields, so OKF compatibility
 * is primarily about rendering and display, not storage.
 */

import type { ParsedFrontmatter } from './frontmatter'

/** Reserved OKF filenames that are NOT concept documents. */
export const OKF_RESERVED_FILENAMES = new Set(['index.md', 'log.md'])

/**
 * Check if a filename is an OKF reserved file (index.md or log.md).
 * These are structural files, not regular notes/concepts.
 */
export function isOkfReservedFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  return OKF_RESERVED_FILENAMES.has(lower)
}

/**
 * Check if a filename is specifically an OKF index.md file.
 */
export function isOkfIndexFile(filename: string): boolean {
  return filename.toLowerCase() === 'index.md'
}

/**
 * Get the `resource` URI from parsed frontmatter, if present.
 * OKF spec: `resource` is an optional canonical URI for the underlying asset.
 */
export function getOkfResource(frontmatter: ParsedFrontmatter): string | null {
  const value = frontmatter.resource
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

/**
 * Get the `timestamp` from parsed frontmatter, if present.
 * OKF spec: `timestamp` is an ISO 8601 datetime of last meaningful change.
 */
export function getOkfTimestamp(frontmatter: ParsedFrontmatter): string | null {
  const value = frontmatter.timestamp
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

/**
 * Get the `okf_version` from parsed frontmatter, if present.
 * OKF spec: bundles MAY declare the OKF version they target.
 */
export function getOkfVersion(frontmatter: ParsedFrontmatter): string | null {
  const value = frontmatter.okf_version
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

/**
 * Check if frontmatter declares this as an OKF bundle (has okf_version).
 */
export function isOkfBundle(frontmatter: ParsedFrontmatter): boolean {
  return getOkfVersion(frontmatter) !== null
}

/**
 * Format an ISO 8601 timestamp for display.
 * Returns the raw string if parsing fails.
 */
export function formatOkfTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z')
}