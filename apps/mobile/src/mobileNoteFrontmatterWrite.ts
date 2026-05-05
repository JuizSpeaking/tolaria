import { splitFrontmatter } from '@tolaria/markdown'

export type WritableMobileNoteFrontmatter = {
  date?: string
  icon?: string
  status?: string
  tags?: string[]
  type?: string
}

const writableKeys = new Set(['date', 'icon', 'status', 'tags', 'type'])

export function writeMobileNoteFrontmatter({
  content,
  metadata,
}: {
  content: string
  metadata: WritableMobileNoteFrontmatter
}) {
  const [frontmatter, body] = splitFrontmatter(content)
  const lines = [
    ...unknownFrontmatterLines(frontmatter),
    ...supportedFrontmatterLines(metadata),
  ]

  return lines.length > 0 ? `---\n${lines.join('\n')}\n---\n${body}` : body
}

function supportedFrontmatterLines(metadata: WritableMobileNoteFrontmatter) {
  return [
    scalarLine('type', metadata.type),
    scalarLine('status', metadata.status),
    scalarLine('date', metadata.date),
    scalarLine('icon', metadata.icon),
    tagsLine(metadata.tags),
  ].filter(isText)
}

function unknownFrontmatterLines(frontmatter: string) {
  return frontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(isUnknownFrontmatterLine)
}

function scalarLine(key: string, value: string | undefined) {
  return isText(value) ? `${key}: ${yamlValue(value.trim())}` : null
}

function tagsLine(tags: string[] | undefined) {
  const values = tags?.map((tag) => tag.trim()).filter(isText) ?? []
  return values.length > 0 ? `tags: [${values.map(yamlValue).join(', ')}]` : null
}

function yamlValue(value: string) {
  return /^[A-Za-z0-9 _/-]+$/.test(value) ? value : JSON.stringify(value)
}

function isUnknownFrontmatterLine(line: string) {
  return isText(line) && line !== '---' && !writableKeys.has(line.split(':', 1)[0])
}

function isText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
