import type { VaultEntry } from '../../types'
import { Info, Packages } from '@phosphor-icons/react'
import { countWords } from '../../utils/wikilinks'
import { translate, type AppLocale } from '../../lib/i18n'
import {
  formatTimestampForDateDisplay,
  type DateDisplayFormat,
} from '../../utils/dateDisplay'
import { useDateDisplayFormat } from '../../hooks/useAppPreferences'
import type { ParsedFrontmatter } from '../../utils/frontmatter'
import { getOkfTimestamp, getOkfVersion, formatOkfTimestamp } from '../../utils/okf'

function formatDate(timestamp: number | null, dateDisplayFormat: DateDisplayFormat): string {
  if (!timestamp) return '\u2014'
  return formatTimestampForDateDisplay(timestamp, dateDisplayFormat)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-2 items-center gap-2 px-1.5" data-testid="readonly-property">
      <span className="min-w-0 truncate text-[12px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-[12px]" style={{ color: 'var(--text-muted)' }}>{value}</span>
    </div>
  )
}

export function NoteInfoPanel({
  entry,
  content,
  frontmatter,
  locale = 'en',
}: {
  entry: VaultEntry
  content: string | null
  frontmatter?: ParsedFrontmatter
  locale?: AppLocale
}) {
  const dateDisplayFormat = useDateDisplayFormat()
  const wordCount = countWords(content ?? '')
  const okfTimestamp = frontmatter ? getOkfTimestamp(frontmatter) : null
  const okfVersion = frontmatter ? getOkfVersion(frontmatter) : null
  return (
    <div>
      <h4 className="font-mono-overline mb-2 flex items-center gap-1 text-muted-foreground">
        <Info size={12} className="shrink-0" />
        {translate(locale, 'inspector.info.title')}
      </h4>
      <div className="flex flex-col gap-1.5">
        <InfoRow label={translate(locale, 'inspector.info.modified')} value={formatDate(entry.modifiedAt, dateDisplayFormat)} />
        <InfoRow label={translate(locale, 'inspector.info.created')} value={formatDate(entry.createdAt, dateDisplayFormat)} />
        {okfTimestamp && (
          <InfoRow label="Timestamp" value={formatOkfTimestamp(okfTimestamp)} />
        )}
        <InfoRow label={translate(locale, 'inspector.info.words')} value={String(wordCount)} />
        <InfoRow label={translate(locale, 'inspector.info.size')} value={formatFileSize(entry.fileSize)} />
      </div>
      {okfVersion && (
        <div className="mt-2 flex items-center gap-1.5" data-testid="okf-bundle-badge">
          <Packages size={12} className="shrink-0 text-[var(--accent-blue)]" />
          <span
            className="inline-flex items-center rounded border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent-blue)]"
          >
            OKF Bundle v{okfVersion}
          </span>
        </div>
      )}
    </div>
  )
}