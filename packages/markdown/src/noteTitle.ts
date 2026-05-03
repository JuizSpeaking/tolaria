import { splitFrontmatter } from './frontmatter'

interface ResolvedContentTitle {
  source: 'h1' | 'frontmatter'
  title: string
}

interface DisplayTitleInput {
  content: string
  filename: string
  frontmatterTitle?: string | null
}

interface DisplayTitleState {
  title: string
  hasH1: boolean
}

interface MarkdownText {
  text: string
}

interface FrontmatterLine {
  line: string
}

function replaceWikilinkAliases({ text }: MarkdownText): string {
  return text.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')
}

function replacePlainWikilinks({ text }: MarkdownText): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, '$1')
}

function replaceMarkdownLinks({ text }: MarkdownText): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function removeInlineMarkdownMarkers({ text }: MarkdownText): string {
  return text.replace(/[*_`~]/g, '')
}

function stripMarkdownFormatting({ text }: MarkdownText): string {
  const withoutWikilinkAliases = replaceWikilinkAliases({ text })
  const withoutPlainWikilinks = replacePlainWikilinks({ text: withoutWikilinkAliases })
  const withoutMarkdownLinks = replaceMarkdownLinks({ text: withoutPlainWikilinks })
  return removeInlineMarkdownMarkers({ text: withoutMarkdownLinks })
}

export function filenameStemToTitle(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '')
  return stem
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function extractH1TitleFromContent(content: string): string | null {
  const [, body] = splitFrontmatter(content)

  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    if (!trimmed.startsWith('# ')) {
      return null
    }

    const title = stripMarkdownFormatting({ text: trimmed.slice(2) }).trim()
    return title || null
  }

  return null
}

export function extractFrontmatterTitleFromContent(content: string): string | null {
  const [frontmatter] = splitFrontmatter(content)
  if (!frontmatter) {
    return null
  }

  for (const line of frontmatter.split(/\r?\n/)) {
    const title = parseFrontmatterTitleLine({ line })
    if (title !== null) {
      return title
    }
  }

  return null
}

export function contentDefinesDisplayTitle(content: string): boolean {
  return resolveContentTitle(content) !== null
}

export function deriveDisplayTitleState({
  content,
  filename,
  frontmatterTitle,
}: DisplayTitleInput): DisplayTitleState {
  const resolvedTitle = resolveContentTitle(content, frontmatterTitle)
  if (resolvedTitle) {
    return {
      title: resolvedTitle.title,
      hasH1: resolvedTitle.source === 'h1',
    }
  }

  return {
    title: filenameStemToTitle(filename),
    hasH1: false,
  }
}

function parseFrontmatterTitleLine({ line }: FrontmatterLine): string | null {
  const match = line.match(/^["']?title["']?\s*:\s*(.*)$/)
  if (!match) {
    return null
  }

  const rawTitle = match[1].trim()
  if (isNonScalarTitle({ text: rawTitle })) {
    return null
  }

  const title = unquote({ text: rawTitle }).trim()
  return title || null
}

function isNonScalarTitle({ text }: MarkdownText): boolean {
  return text === '|' || text === '>' || (text.startsWith('[') && text.endsWith(']') && !text.startsWith('[['))
}

function unquote({ text }: MarkdownText): string {
  return text.replace(/^["']|["']$/g, '')
}

function resolveContentTitle(content: string, frontmatterTitle?: string | null): ResolvedContentTitle | null {
  const h1Title = extractH1TitleFromContent(content)
  if (h1Title) {
    return { title: h1Title, source: 'h1' }
  }

  const resolvedFrontmatterTitle = frontmatterTitle?.trim() || extractFrontmatterTitleFromContent(content)
  if (resolvedFrontmatterTitle) {
    return { title: resolvedFrontmatterTitle, source: 'frontmatter' }
  }

  return null
}
