import {
  frontmatterFlag,
  frontmatterList,
  frontmatterProperties,
  frontmatterRelationships,
  frontmatterScalar,
  parseLocalVaultDocument,
  type LocalVaultFrontmatter,
} from './localVaultFrontmatter'
import {
  deriveLocalVaultTitle,
  localVaultEditorBlocks,
  localVaultEditorBullets,
  localVaultOutgoingLinks,
  localVaultSnippet,
} from './localVaultMarkdown'
import {
  orderedMobileSavedViews,
  parseMobileSavedViewFile,
} from './mobileSavedViews'
import { buildMobileSidebarSections } from './mobileSidebarSections'
import { isMobileInboxNote } from './mobileNoteFilters'
import { normalizeMobileNoteWidth } from './mobileNoteWidth'
import { normalizeMobileWikilinkTarget } from './mobileWikilinks'
import { mobileWorkspaceAlias } from './mobileWorkspaceAlias'
import {
  mobileAllNotesFileVisibilityFromVaultConfig,
  mobileNoteListPropertyOverridesFromVaultConfig,
  normalizeMobileVaultConfig,
} from './mobileVaultConfig'
import type {
  MobileFileKind,
  MobileNote,
  MobileNoteWidth,
  MobileProperty,
  MobilePropertyValue,
  MobileRelationship,
  MobileRelationshipKind,
  MobileRelationshipValue,
  MobileSavedView,
  MobileTone,
  MobileTypeDefinition,
  MobileTypeDefinitions,
  MobileVaultConfig,
  MobileWorkspaceSnapshot,
} from './mobileWorkspaceModel'

type AbsoluteVaultPath = string
type LocalVaultLabel = string
type NoteId = string
type NoteTitle = string
type NoteTypeName = string
type RelationshipLabel = string
type RelativeVaultPath = string
type TimestampMs = number
type VaultRootPath = string
type WikilinkTarget = string

export type LocalVaultFile = {
  absolutePath: AbsoluteVaultPath
  content: string
  createdAt: TimestampMs | null
  fileKind?: MobileFileKind
  modifiedAt: TimestampMs | null
  relativePath: RelativeVaultPath
  size: number
}

export type LocalVaultSnapshotOptions = {
  folderPaths?: RelativeVaultPath[]
  files: LocalVaultFile[]
  maxNotes?: number
  vaultConfig?: MobileVaultConfig | null
  vaultAlias?: string | null
  vaultLabel: LocalVaultLabel
  vaultPath: VaultRootPath
}

type LocalVaultEntry = {
  archived: boolean
  aliases: string[]
  body: string
  createdAt: TimestampMs | null
  favorite: boolean
  favoriteIndex: number | null
  fileKind: MobileFileKind
  filename: string
  id: NoteId
  icon: string | null
  links: number
  modifiedAt: TimestampMs | null
  noteWidth: MobileNoteWidth | null
  organized: boolean
  outgoingLinks: string[]
  path: RelativeVaultPath
  properties: MobileProperty[]
  rawContent: string
  relationships: Record<RelationshipLabel, WikilinkTarget[]>
  status: string
  tags: string[]
  title: NoteTitle
  type: NoteTypeName
  typeDefinition: MobileTypeDefinition
  typeDefinitionTone: MobileTone
  typeTone: MobileTone
}

type RelationshipResolver = (target: WikilinkTarget) => LocalVaultEntry | null
type MobileNoteDetailLevel = 'editable' | 'summary'
type SnapshotFrontmatterValues = Map<string, unknown>

const DEFAULT_MAX_NOTES = 80
const absoluteDateFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
const absoluteDateCache = new Map<string, string>()
const snapshotFrontmatterValueCache = new WeakMap<LocalVaultFrontmatter, SnapshotFrontmatterValues>()
const snapshotFrontmatterLookupKeyCache = new Map<string, string>()
const textFileExtensions = new Set([
  'bash',
  'bat',
  'c',
  'cfg',
  'clj',
  'cmd',
  'conf',
  'cpp',
  'css',
  'csv',
  'dockerfile',
  'editorconfig',
  'el',
  'env',
  'erl',
  'ex',
  'exs',
  'fish',
  'gitignore',
  'go',
  'graphql',
  'h',
  'hcl',
  'hpp',
  'hs',
  'htm',
  'html',
  'ini',
  'java',
  'jl',
  'js',
  'json',
  'jsx',
  'kt',
  'less',
  'lisp',
  'lua',
  'makefile',
  'mdx',
  'ml',
  'nix',
  'properties',
  'ps1',
  'py',
  'r',
  'rb',
  'rs',
  'scss',
  'sh',
  'sql',
  'svelte',
  'swift',
  'tf',
  'toml',
  'ts',
  'tsx',
  'txt',
  'vim',
  'vue',
  'xml',
  'yaml',
  'yml',
  'zig',
  'zsh',
])
const extensionlessTextFilenames = new Set([
  '.editorconfig',
  '.env',
  '.gitattributes',
  '.gitignore',
  'brewfile',
  'dockerfile',
  'gemfile',
  'makefile',
  'procfile',
  'rakefile',
])

export function buildLocalVaultWorkspaceSnapshot({
  folderPaths = [],
  files,
  maxNotes = DEFAULT_MAX_NOTES,
  vaultAlias,
  vaultConfig,
  vaultLabel,
  vaultPath,
}: LocalVaultSnapshotOptions): MobileWorkspaceSnapshot {
  const workspaceAlias = mobileWorkspaceAlias({ alias: vaultAlias, label: vaultLabel, path: vaultPath })
  const workspaceIdentity = { alias: workspaceAlias, label: vaultLabel }
  const entries = applyTypeDefinitionTones(files.map(parseLocalVaultEntry))
  const typeDefinitions = localTypeDefinitions(entries)
  const allNoteEntries = [...entries].sort(compareByModifiedDate)
  const visibleEntries = visibleNoteEntries(entries)
  const selectedEntries = visibleEntries.slice(0, maxNotes)
  const resolveRelationship = relationshipResolver(entries, workspaceAlias)
  const allNotes = allNoteEntries.map((entry) => localEntryToMobileNote(entry, resolveRelationship, workspaceIdentity, 'summary'))
  const notes = selectedEntries.map((entry) => localEntryToMobileNote(entry, resolveRelationship, workspaceIdentity, 'editable'))
  const selectedNoteId = notes[0]?.id
  const views = orderedMobileSavedViews(files.map(parseViewFile).filter(isMobileSavedView))
  const normalizedVaultConfig = normalizeMobileVaultConfig(vaultConfig)

  return {
    allNotes,
    editorBlocks: notes[0]?.editorBlocks ?? [],
    editorBullets: notes[0]?.editorBullets ?? [],
    noteListSubtitle: noteListSubtitle(notes.length, visibleEntries.length),
    noteListPropertyOverrides: mobileNoteListPropertyOverridesFromVaultConfig(normalizedVaultConfig),
    notes,
    selectedNoteId,
    folderPaths,
    sidebarSections: buildMobileSidebarSections({
      allNotesFileVisibility: mobileAllNotesFileVisibilityFromVaultConfig(normalizedVaultConfig),
      folderPaths,
      notes: allNotes,
      typeDefinitions,
      views,
    }),
    source: {
      alias: workspaceAlias,
      kind: 'localVault',
      label: vaultLabel,
      totalNotes: entries.length,
      vaultPath,
      visibleNotes: notes.length,
    },
    sync: { kind: 'synced', minutesAgo: 0 },
    typeDefinitions,
    vaultConfig: normalizedVaultConfig,
    views,
  }
}

function applyTypeDefinitionTones(entries: LocalVaultEntry[]): LocalVaultEntry[] {
  const tones = new Map(
    entries
      .filter(isActiveTypeEntry)
      .map((entry) => [entry.title, entry.typeDefinitionTone]),
  )

  return entries.map((entry) => {
    if (entry.type === 'Type') return entry
    return {
      ...entry,
      typeTone: tones.get(entry.type) ?? entry.typeTone,
    }
  })
}

function parseLocalVaultEntry(file: LocalVaultFile): LocalVaultEntry {
  const fileKind = localVaultFileKind(file)
  return fileKind === 'markdown'
    ? parseMarkdownVaultEntry(file, fileKind)
    : parseNonMarkdownVaultEntry(file, fileKind)
}

function parseMarkdownVaultEntry(file: LocalVaultFile, fileKind: MobileFileKind): LocalVaultEntry {
  const document = parseLocalVaultDocument(file.content)
  const filename = file.relativePath.split('/').at(-1) ?? file.relativePath
  const type = cleanTypeName(frontmatterScalar(document.frontmatter, ['type', 'Is A', 'is_a']) ?? 'Note')
  const color = frontmatterScalar(document.frontmatter, ['color', '_color'])
  const outgoingLinks = localVaultOutgoingLinks(document.body)
  const title = deriveLocalVaultTitle({
    body: document.body,
    fallbackTitle: frontmatterScalar(document.frontmatter, ['title']),
    filename,
  })

  return {
    archived: frontmatterFlag(document.frontmatter, ['_archived', 'Archived', 'archived']),
    aliases: frontmatterList(document.frontmatter, ['aliases', 'Aliases']),
    body: document.body,
    createdAt: file.createdAt,
    favorite: frontmatterFlag(document.frontmatter, ['_favorite', 'favorite']),
    favoriteIndex: frontmatterNumber(document.frontmatter, ['_favorite_index', 'favorite_index', 'favorite index']),
    fileKind,
    filename,
    id: file.relativePath,
    icon: frontmatterText(document.frontmatter, ['_icon', 'icon']),
    links: outgoingLinks.length,
    modifiedAt: file.modifiedAt,
    noteWidth: normalizeMobileNoteWidth(frontmatterScalar(document.frontmatter, ['_width', 'width'])),
    organized: frontmatterFlag(document.frontmatter, ['_organized']),
    outgoingLinks,
    path: file.relativePath,
    properties: mobileProperties(frontmatterProperties(document.frontmatter)),
    rawContent: file.content,
    relationships: frontmatterRelationships(document.frontmatter),
    status: frontmatterScalar(document.frontmatter, ['Status', 'status']) ?? '',
    tags: frontmatterList(document.frontmatter, ['tags', 'Tags']).slice(0, 8),
    title,
    type,
    typeDefinition: typeDefinitionFromFrontmatter(document.frontmatter),
    typeDefinitionTone: toneFromDesktopColor(color, title),
    typeTone: toneFromDesktopColor(null, type),
  }
}

function parseNonMarkdownVaultEntry(file: LocalVaultFile, fileKind: MobileFileKind): LocalVaultEntry {
  const filename = file.relativePath.split('/').at(-1) ?? file.relativePath
  const title = nonMarkdownTitle(file, filename)

  return {
    archived: false,
    aliases: [],
    body: fileKind === 'text' ? file.content : '',
    createdAt: file.createdAt,
    favorite: false,
    favoriteIndex: null,
    fileKind,
    filename,
    id: file.relativePath,
    icon: null,
    links: 0,
    modifiedAt: file.modifiedAt,
    noteWidth: null,
    organized: false,
    outgoingLinks: [],
    path: file.relativePath,
    properties: [],
    rawContent: file.content,
    relationships: {},
    status: '',
    tags: [],
    title,
    type: 'File',
    typeDefinition: {},
    typeDefinitionTone: 'gray',
    typeTone: 'gray',
  }
}

function typeDefinitionFromFrontmatter(frontmatter: LocalVaultFrontmatter): MobileTypeDefinition {
  return {
    icon: frontmatterText(frontmatter, ['icon', '_icon']),
    label: frontmatterText(frontmatter, ['_sidebar_label', 'sidebar_label', 'sidebar label']),
    listPropertiesDisplay: frontmatterList(frontmatter, [
      '_list_properties_display',
      'list_properties_display',
      'listPropertiesDisplay',
    ]),
    order: frontmatterNumber(frontmatter, ['_order', 'order']),
    properties: mobileTypeDefinitionProperties(frontmatter),
    relationships: frontmatterRelationships(frontmatter),
    sort: frontmatterText(frontmatter, ['_sort', 'sort']),
    template: frontmatterText(frontmatter, ['template']),
    view: frontmatterText(frontmatter, ['view']),
    visible: frontmatterBoolean(frontmatter, ['visible']),
  }
}

function mobileTypeDefinitionProperties(frontmatter: LocalVaultFrontmatter): Record<string, MobilePropertyValue> {
  return Object.fromEntries(
    Object.entries(frontmatterProperties(frontmatter)).map(([key, value]) => [key, mobilePropertyValue(value)]),
  )
}

function frontmatterValue(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  for (const key of keys) {
    if (Object.hasOwn(frontmatter, key)) return frontmatter[key]

    const normalizedKey = normalizedFrontmatterLookupKey(key)
    const normalizedValues = snapshotFrontmatterValues(frontmatter)
    if (normalizedValues.has(normalizedKey)) return normalizedValues.get(normalizedKey)
  }
  return undefined
}

function snapshotFrontmatterValues(frontmatter: LocalVaultFrontmatter): SnapshotFrontmatterValues {
  const cached = snapshotFrontmatterValueCache.get(frontmatter)
  if (cached) return cached

  const values: SnapshotFrontmatterValues = new Map()
  for (const [key, value] of Object.entries(frontmatter)) {
    const normalizedKey = normalizedFrontmatterLookupKey(key)
    if (!values.has(normalizedKey)) values.set(normalizedKey, value)
  }
  snapshotFrontmatterValueCache.set(frontmatter, values)
  return values
}

function normalizedFrontmatterLookupKey(key: string): string {
  const cached = snapshotFrontmatterLookupKeyCache.get(key)
  if (cached) return cached

  const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_')
  snapshotFrontmatterLookupKeyCache.set(key, normalizedKey)
  return normalizedKey
}

function frontmatterText(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  const value = frontmatterValue(frontmatter, keys)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function frontmatterNumber(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  const value = frontmatterValue(frontmatter, keys)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function frontmatterBoolean(frontmatter: LocalVaultFrontmatter, keys: string[]) {
  const value = frontmatterValue(frontmatter, keys)
  return typeof value === 'boolean' ? value : null
}

function localTypeDefinitions(entries: LocalVaultEntry[]): MobileTypeDefinitions {
  return Object.fromEntries(
    entries
      .filter(isActiveTypeEntry)
      .map((entry) => [entry.title, {
        ...entry.typeDefinition,
        path: entry.path,
        rawContent: entry.rawContent,
        tone: entry.typeDefinitionTone,
      }]),
  )
}

function isActiveTypeEntry(entry: LocalVaultEntry): boolean {
  return entry.type === 'Type' && !entry.archived
}

function parseViewFile(file: LocalVaultFile, index: number): MobileSavedView | null {
  return parseMobileSavedViewFile(file, index)
}

function localVaultFileKind(file: LocalVaultFile): MobileFileKind {
  return file.fileKind ?? mobileFileKindForPath(file.relativePath)
}

export function mobileFileKindForPath(path: RelativeVaultPath): MobileFileKind {
  const filename = path.split('/').at(-1)?.toLowerCase() ?? path.toLowerCase()
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === filename.length - 1) {
    return extensionlessTextFilenames.has(filename) ? 'text' : 'binary'
  }

  const extension = filename.slice(dotIndex + 1)
  if (extension === 'md' || extension === 'markdown') return 'markdown'
  if (textFileExtensions.has(extension)) return 'text'
  return 'binary'
}

function nonMarkdownTitle(file: LocalVaultFile, filename: string): NoteTitle {
  return yamlName(file) ?? filename
}

function yamlName(file: LocalVaultFile): NoteTitle | null {
  const extension = file.relativePath.split('.').at(-1)?.toLowerCase()
  if (extension !== 'yml' && extension !== 'yaml') return null

  const match = file.content.match(/^name:\s*(.+?)\s*$/m)
  if (!match) return null

  return unquoteYamlScalar(match[1])
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim()
  if (isQuotedYamlScalar(trimmed)) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function isQuotedYamlScalar(value: string): boolean {
  return isWrappedBy(value, '"') || isWrappedBy(value, "'")
}

function isWrappedBy(value: string, quote: string): boolean {
  return value.startsWith(quote) && value.endsWith(quote)
}

function isMobileSavedView(view: MobileSavedView | null): view is MobileSavedView {
  return view !== null
}

function cleanTypeName(value: string): NoteTypeName {
  return wikilinkTarget(value).replace(/\.md$/, '')
}

function localEntryToMobileNote(
  entry: LocalVaultEntry,
  resolveRelationship: RelationshipResolver,
  workspace: { alias: string | null; label: string },
  detailLevel: MobileNoteDetailLevel,
): MobileNote {
  const blocks = detailLevel === 'editable' ? localVaultEditorBlocks(entry.body) : undefined

  return {
    created: relativeDate(entry.createdAt),
    createdAt: entry.createdAt,
    aliases: entry.aliases,
    date: absoluteDate(entry.modifiedAt),
    editorBlocks: blocks,
    editorBullets: blocks ? localVaultEditorBullets(blocks) : undefined,
    favorite: entry.favorite,
    favoriteIndex: entry.favoriteIndex,
    fileKind: entry.fileKind,
    id: entry.id,
    icon: entry.icon,
    links: entry.links,
    modified: relativeDate(entry.modifiedAt),
    modifiedAt: entry.modifiedAt,
    noteWidth: entry.noteWidth,
    archived: entry.archived,
    organized: entry.organized,
    outgoingLinks: entry.outgoingLinks,
    path: entry.path,
    properties: entry.properties,
    rawContent: detailLevel === 'editable' ? entry.rawContent : undefined,
    relationships: mobileRelationships(entry.relationships, resolveRelationship),
    snippet: localVaultSnippet(entry.body),
    status: entry.status,
    tags: entry.tags,
    title: entry.title,
    type: entry.type,
    typeTone: entry.typeTone,
    workspace: workspace.label,
    workspaceAlias: workspace.alias,
  }
}

function visibleNoteEntries(entries: LocalVaultEntry[]): LocalVaultEntry[] {
  return entries.filter(isMobileInboxNote).sort(compareByModifiedDate)
}

function compareByModifiedDate(left: LocalVaultEntry, right: LocalVaultEntry): number {
  return (right.modifiedAt ?? 0) - (left.modifiedAt ?? 0)
}

function noteListSubtitle(visibleCount: number, totalCount: number): string {
  if (visibleCount === totalCount) return totalCount.toLocaleString()
  return `${visibleCount.toLocaleString()} / ${totalCount.toLocaleString()}`
}

function mobileRelationships(
  relationships: Record<RelationshipLabel, WikilinkTarget[]>,
  resolveRelationship: RelationshipResolver,
): MobileRelationship[] {
  return Object.entries(relationships).map(([label, values]) => ({
    key: label,
    kind: relationshipKind(label),
    label: relationshipLabel(label),
    values: values.map((value) => relationshipValue(value, resolveRelationship)),
  }))
}

function relationshipKind(label: RelationshipLabel): MobileRelationshipKind {
  const canonical = label.toLowerCase().replaceAll(' ', '_')
  if (canonical === 'belongs_to') return 'belongsTo'
  if (canonical === 'related_to') return 'relatedTo'
  if (canonical === 'has' || canonical.startsWith('has_')) return 'has'
  return 'custom'
}

function relationshipLabel(label: RelationshipLabel): string | undefined {
  return relationshipKind(label) === 'custom' ? humanizeRelationshipKey(label) : undefined
}

function relationshipValue(rawValue: WikilinkTarget, resolveRelationship: RelationshipResolver): MobileRelationshipValue {
  const target = wikilinkTarget(rawValue)
  const entry = resolveRelationship(target)

  return {
    id: entry?.id,
    ref: rawValue,
    title: entry?.title ?? target,
    type: entry?.type ?? 'Note',
    typeTone: entry?.typeTone ?? 'gray',
  }
}

function mobileProperties(properties: Record<string, unknown>): MobileProperty[] {
  return Object.entries(properties).map(([key, value]) => ({
    key,
    label: humanizeRelationshipKey(key),
    value: mobilePropertyValue(value),
  }))
}

function mobilePropertyValue(value: unknown): MobilePropertyValue {
  if (Array.isArray(value)) return value.flatMap(scalarPropertyArrayItem)
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return ''
}

function scalarPropertyArrayItem(value: unknown): string[] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  return []
}

function relationshipResolver(entries: LocalVaultEntry[], workspaceAlias: string | null): RelationshipResolver {
  const index = new Map<string, LocalVaultEntry>()
  for (const entry of entries) {
    for (const target of relationshipResolverTargets(entry, workspaceAlias)) {
      addRelationshipResolverTarget(index, target, entry)
    }
  }

  return (target) => index.get(normalizeMobileWikilinkTarget(target)) ?? null
}

function relationshipResolverTargets(entry: LocalVaultEntry, workspaceAlias: string | null): string[] {
  const targets = [
    entry.path,
    entry.path.replace(/\.[^.]+$/, ''),
    entry.filename.replace(/\.[^.]+$/, ''),
    ...entry.aliases,
    entry.title,
  ]
  if (!workspaceAlias) return targets

  return [
    ...targets,
    ...targets.map((target) => `${workspaceAlias}/${target}`),
  ]
}

function addRelationshipResolverTarget(
  index: Map<string, LocalVaultEntry>,
  target: string,
  entry: LocalVaultEntry,
) {
  const normalized = normalizeMobileWikilinkTarget(target)
  if (normalized && !index.has(normalized)) index.set(normalized, entry)
}

function wikilinkTarget(value: string): WikilinkTarget {
  const match = value.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/)
  return (match?.[1] ?? value).trim()
}

function toneFromDesktopColor(color: string | null, type: NoteTypeName): MobileTone {
  const normalized = color?.trim().toLowerCase()
  if (isMobileTone(normalized)) return normalized

  const fallback = typeToneFallbacks[type]
  return fallback ?? 'gray'
}

function isMobileTone(value: string | null | undefined): value is MobileTone {
  return value === 'blue'
    || value === 'gray'
    || value === 'green'
    || value === 'orange'
    || value === 'purple'
    || value === 'red'
    || value === 'yellow'
}

const typeToneFallbacks: Record<string, MobileTone> = {
  Event: 'yellow',
  Experiment: 'red',
  Person: 'yellow',
  Procedure: 'purple',
  Project: 'red',
  Responsibility: 'purple',
  Topic: 'green',
  Type: 'blue',
}

function relativeDate(timestamp: TimestampMs | null): string {
  if (!timestamp) return '-'

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000))
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`

  const elapsedHours = Math.round(elapsedMinutes / 60)
  if (elapsedHours < 48) return `${elapsedHours}h ago`

  const elapsedDays = Math.round(elapsedHours / 24)
  return `${elapsedDays}d ago`
}

function absoluteDate(timestamp: TimestampMs | null): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const cacheKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  const cached = absoluteDateCache.get(cacheKey)
  if (cached) return cached

  const formatted = absoluteDateFormatter.format(date)
  absoluteDateCache.set(cacheKey, formatted)
  return formatted
}

function humanizeRelationshipKey(label: RelationshipLabel): string {
  return label
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
