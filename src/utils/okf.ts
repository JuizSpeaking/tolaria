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
import type { VaultEntry } from '../types'

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

/**
 * Build a markdown directory listing for a folder, following the OKF spec for
 * `index.md` content. Lists child markdown files (excluding index.md/log.md)
 * and subdirectories as markdown links.
 */
export function buildOkfDirectoryListing(entries: VaultEntry[], folderPath: string): string {
  const normalizedFolder = folderPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const folderName = normalizedFolder.split('/').pop() ?? normalizedFolder

  const childEntries = entries.filter((entry) => {
    const normalizedEntryPath = entry.path.replace(/\\/g, '/')
    return normalizedEntryPath.includes(`/${normalizedFolder}/`) || normalizedEntryPath.startsWith(`${normalizedFolder}/`)
  })

  const markdownFiles: VaultEntry[] = []
  const subdirs = new Set<string>()

  for (const entry of childEntries) {
    const normalizedEntryPath = entry.path.replace(/\\/g, '/')
    const relativePath = normalizedEntryPath.startsWith(`${normalizedFolder}/`)
      ? normalizedEntryPath.slice(normalizedFolder.length + 1)
      : normalizedEntryPath.slice(normalizedEntryPath.indexOf(`/${normalizedFolder}/`) + normalizedFolder.length + 2)

    if (relativePath.includes('/')) {
      const topDir = relativePath.split('/')[0] ?? ''
      if (topDir) subdirs.add(topDir)
      continue
    }

    if (isOkfReservedFile(relativePath)) continue
    markdownFiles.push(entry)
  }

  const lines: string[] = [`# ${folderName}`, '']

  if (subdirs.size > 0) {
    lines.push('## Directories', '')
    for (const dir of [...subdirs].sort()) {
      lines.push(`- [${dir}](./${dir}/)`)
    }
    lines.push('')
  }

  if (markdownFiles.length > 0) {
    lines.push('## Notes', '')
    for (const entry of markdownFiles) {
      const filename = entry.filename.replace(/\.md$/, '')
      const label = entry.title || filename
      lines.push(`- [${label}](./${entry.filename})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Export a vault (or subdirectory) as an OKF-compatible bundle.
 * Delegates to the Rust backend `export_okf_bundle` Tauri command.
 */
export async function exportOkfBundle(vaultPath: string, outputPath: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('export_okf_bundle', { vaultPath, outputPath })
}

/**
 * Import an OKF bundle into the vault, preserving directory structure.
 * Skips structural files (index.md, log.md). Delegates to the Rust backend
 * `import_okf_bundle` Tauri command.
 */
export async function importOkfBundle(bundlePath: string, vaultPath: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('import_okf_bundle', { bundlePath, vaultPath })
}