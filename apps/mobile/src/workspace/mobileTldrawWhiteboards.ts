import {
  isMobileMarkdownCodeFenceClose,
  readMobileMarkdownCodeFence,
} from './mobileMarkdownCodeFence'

export type MobileTldrawWhiteboard = {
  boardId: string
  endLine: number
  height: string
  key: string
  metadataSuffix: string
  snapshot: string
  startLine: number
  width: string
}

type MobileTldrawFenceMetadata = Pick<MobileTldrawWhiteboard, 'boardId' | 'height' | 'metadataSuffix' | 'width'>

type MobileTldrawWhiteboardUpdate = {
  height?: string
  key: string
  snapshot?: string
  width?: string
}

type MobileTldrawFenceBody = {
  endLine: number
  snapshot: string
}

type MobileTldrawFenceMatch = {
  nextLine: number
  whiteboard: MobileTldrawWhiteboard
}

export const mobileTldrawDefaultHeight = '520'
export const mobileTldrawEmptySnapshot = '{}'

export function readMobileTldrawWhiteboards({ markdown }: { markdown: string }): MobileTldrawWhiteboard[] {
  const lines = markdownLines({ markdown })
  const whiteboards: MobileTldrawWhiteboard[] = []
  let lineNumber = 0

  while (lineNumber < lines.length) {
    const match = readMobileTldrawFenceAt({ lineNumber, lines })
    if (!match) {
      lineNumber += 1
      continue
    }

    whiteboards.push(match.whiteboard)
    lineNumber = match.nextLine
  }

  return whiteboards
}

export function updateMobileTldrawWhiteboard(
  { markdown, update }: { markdown: string; update: MobileTldrawWhiteboardUpdate },
): { markdown: string; updated: boolean } {
  const lines = markdownLines({ markdown })
  const whiteboard = readMobileTldrawWhiteboards({ markdown }).find((candidate) => candidate.key === update.key)
  if (!whiteboard) return { markdown, updated: false }

  const nextSource = mobileTldrawFenceSource({
    boardId: whiteboard.boardId,
    height: normalizedDimension({
      blankFallback: mobileTldrawDefaultHeight,
      fallback: whiteboard.height,
      value: update.height,
    }),
    metadataSuffix: whiteboard.metadataSuffix,
    snapshot: normalizedSnapshot({ snapshot: update.snapshot ?? whiteboard.snapshot }),
    width: normalizedDimension({ blankFallback: '', fallback: whiteboard.width, value: update.width }),
  })
  const nextLines = [
    ...lines.slice(0, whiteboard.startLine),
    ...nextSource.split('\n'),
    ...lines.slice(whiteboard.endLine + 1),
  ]

  return {
    markdown: nextLines.join('\n'),
    updated: true,
  }
}

export function mobileTldrawFenceSource({
  boardId,
  height,
  metadataSuffix = '',
  snapshot,
  width,
}: Pick<MobileTldrawWhiteboard, 'boardId' | 'height' | 'snapshot' | 'width'> & {
  metadataSuffix?: string
}): string {
  const fence = '`'.repeat(fenceLengthForSnapshot({ snapshot }))
  return `${fence}tldraw${mobileTldrawFenceMetadata({
    boardId,
    height,
    metadataSuffix,
    width,
  })}\n${snapshotBody({ snapshot })}${fence}`
}

function readMobileTldrawFenceAt({
  lineNumber,
  lines,
}: {
  lineNumber: number
  lines: string[]
}): MobileTldrawFenceMatch | null {
  const opening = readMobileMarkdownCodeFence(lines[lineNumber] ?? '')
  const metadata = opening?.info ? readMobileTldrawFenceMetadata({ info: opening.info }) : null
  if (!opening || !metadata) return null

  const body = readMobileTldrawFenceBody({ lineNumber, lines, opening })
  if (!body) return null

  return {
    nextLine: body.endLine + 1,
    whiteboard: {
      ...metadata,
      endLine: body.endLine,
      key: mobileTldrawWhiteboardKey({ boardId: metadata.boardId, startLine: lineNumber }),
      snapshot: body.snapshot,
      startLine: lineNumber,
    },
  }
}

function readMobileTldrawFenceBody({
  lineNumber,
  lines,
  opening,
}: {
  lineNumber: number
  lines: string[]
  opening: NonNullable<ReturnType<typeof readMobileMarkdownCodeFence>>
}): MobileTldrawFenceBody | null {
  const bodyLines: string[] = []
  let closeLine = lineNumber + 1

  while (closeLine < lines.length && !isMobileMarkdownCodeFenceClose(lines[closeLine] ?? '', opening)) {
    bodyLines.push(lines[closeLine] ?? '')
    closeLine += 1
  }

  if (closeLine >= lines.length) return null
  return {
    endLine: closeLine,
    snapshot: normalizedSnapshot({ snapshot: bodyLines.join('\n') }),
  }
}

function readMobileTldrawFenceMetadata({ info }: { info: string }): MobileTldrawFenceMetadata | null {
  const [language = '', ...metadataParts] = info.trim().split(/\s+/u)
  if (language.toLowerCase() !== 'tldraw') return null

  const metadata = metadataParts.join(' ')
  return {
    boardId: readFenceAttribute({ info: metadata, name: 'id' }),
    height: readFenceAttribute({ info: metadata, name: 'height' }) || mobileTldrawDefaultHeight,
    metadataSuffix: metadataWithoutKnownAttributes({ metadata }),
    width: readFenceAttribute({ info: metadata, name: 'width' }),
  }
}

function mobileTldrawWhiteboardKey({ boardId, startLine }: { boardId: string; startLine: number }): string {
  return boardId || `line:${startLine}`
}

function mobileTldrawFenceMetadata({
  boardId,
  height,
  metadataSuffix,
  width,
}: MobileTldrawFenceMetadata): string {
  const attributes: string[] = []
  if (boardId) attributes.push(`id="${escapeFenceAttribute({ value: boardId })}"`)
  if (height) attributes.push(`height="${escapeFenceAttribute({ value: height })}"`)
  if (width) attributes.push(`width="${escapeFenceAttribute({ value: width })}"`)
  if (metadataSuffix.trim()) attributes.push(metadataSuffix.trim())
  return attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
}

function metadataWithoutKnownAttributes({ metadata }: { metadata: string }): string {
  return metadata
    .replace(/\b(?:height|id|width)=(?:"[^"]*"|'[^']*'|[^\s]+)/gu, ' ')
    .trim()
    .replace(/\s+/gu, ' ')
}

function readFenceAttribute({ info, name }: { info: string; name: 'height' | 'id' | 'width' }): string {
  for (const match of info.matchAll(/\b([A-Za-z][\w-]*)=(?:"([^"]+)"|'([^']+)'|([^\s]+))/gu)) {
    if (match.at(1) === name) return match.at(2) ?? match.at(3) ?? match.at(4) ?? ''
  }
  return ''
}

function normalizedDimension({
  blankFallback,
  fallback,
  value,
}: {
  blankFallback: string
  fallback: string
  value: string | undefined
}): string {
  const trimmed = value?.trim()
  if (trimmed) return trimmed
  return fallback.trim() || blankFallback
}

function normalizedSnapshot({ snapshot }: { snapshot: string }): string {
  const normalized = snapshot.replace(/\r\n/g, '\n')
  return normalized.trim().length > 0 ? normalized : mobileTldrawEmptySnapshot
}

function snapshotBody({ snapshot }: { snapshot: string }): string {
  return snapshot.endsWith('\n') ? snapshot : `${snapshot}\n`
}

function fenceLengthForSnapshot({ snapshot }: { snapshot: string }): number {
  const longestRun = Math.max(0, ...Array.from(snapshot.matchAll(/`+/gu), match => match[0].length))
  return Math.max(3, longestRun + 1)
}

function escapeFenceAttribute({ value }: { value: string }): string {
  return value.replace(/"/gu, '&quot;')
}

function markdownLines({ markdown }: { markdown: string }): string[] {
  return markdown.replace(/\r\n/g, '\n').split('\n')
}
