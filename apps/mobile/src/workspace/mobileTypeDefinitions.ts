import {
  frontmatterProperties,
  frontmatterRelationships,
  parseLocalVaultDocument,
  type LocalVaultFrontmatter,
  type LocalVaultFrontmatterValue,
} from './localVaultFrontmatter'
import type {
  MobileTone,
  MobilePropertyValue,
  MobileTypeDefinition,
  MobileTypeDefinitions,
} from './mobileWorkspaceModel'

type TypeName = string
type TypePath = string
type TypeRawContent = string

export type MobileTypeDefinitionPatch = {
  icon?: string | null
  label?: string | null
  listPropertiesDisplay?: string[]
  order?: number | null
  properties?: Record<string, MobilePropertyValue>
  relationships?: Record<string, string[]>
  sort?: string | null
  template?: string | null
  tone?: MobileTone | null
  visible?: boolean | null
}

export function applyMobileTypeDefinitionPatch(
  definition: MobileTypeDefinition | undefined,
  patch: MobileTypeDefinitionPatch,
): MobileTypeDefinition {
  return {
    ...(definition ?? {}),
    ...normalizedTypePatch(patch),
  }
}

export function mobileTypeDefinitionPath(
  typeName: TypeName,
  definition?: MobileTypeDefinition,
): TypePath {
  return definition?.path ?? `${slugifyTypeName(typeName)}.md`
}

export function mobileTypeDefinitionContent(
  typeName: TypeName,
  definition: MobileTypeDefinition | undefined,
  patch: MobileTypeDefinitionPatch,
): TypeRawContent {
  const document = parseLocalVaultDocument(definition?.rawContent ?? defaultTypeDefinitionContent(typeName))
  return serializeTypeDocument(
    patchedTypeFrontmatter(document.frontmatter, patch),
    document.body,
  )
}

export function typeDefinitionsWithPatch(
  definitions: MobileTypeDefinitions | undefined,
  typeName: TypeName,
  patch: MobileTypeDefinitionPatch,
): MobileTypeDefinitions {
  const current = definitions ?? {}
  const existing = current[typeName]
  const nextDefinition = applyMobileTypeDefinitionPatch(existing, patch)

  return {
    ...current,
    [typeName]: {
      ...nextDefinition,
      path: mobileTypeDefinitionPath(typeName, existing),
      rawContent: mobileTypeDefinitionContent(typeName, existing, patch),
    },
  }
}

function normalizedTypePatch(patch: MobileTypeDefinitionPatch): MobileTypeDefinitionPatch {
  return {
    ...patch,
    label: normalizedTextPatch(patch.label),
    listPropertiesDisplay: normalizedListPatch(patch.listPropertiesDisplay),
    properties: normalizedPropertiesPatch(patch.properties),
    relationships: normalizedRelationshipsPatch(patch.relationships),
    sort: normalizedTextPatch(patch.sort),
    template: normalizedTextPatch(patch.template),
  }
}

function normalizedTextPatch(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizedListPatch(value: string[] | undefined) {
  if (value === undefined) return undefined
  return normalizedStringList(value)
}

function normalizedStringList(value: string[]) {
  const seen = new Set<string>()
  return value
    .map((item) => item.trim())
    .filter((item) => {
      const normalized = item.toLowerCase()
      if (!normalized || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
}

function normalizedPropertiesPatch(
  value: Record<string, MobilePropertyValue> | undefined,
) {
  if (value === undefined) return undefined

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, propertyValue]) => {
      const normalizedKey = key.trim()
      if (!normalizedKey) return []
      return [[normalizedKey, normalizedPropertyValue(propertyValue)]]
    }),
  )
}

function normalizedRelationshipsPatch(
  value: Record<string, string[]> | undefined,
) {
  if (value === undefined) return undefined

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, refs]) => {
      const normalizedKey = key.trim()
      const normalizedRefs = normalizedStringList(refs)
      if (!normalizedKey || normalizedRefs.length === 0) return []
      return [[normalizedKey, normalizedRefs]]
    }),
  )
}

function normalizedPropertyValue(value: MobilePropertyValue): MobilePropertyValue {
  if (!Array.isArray(value)) return value
  return normalizedStringList(value)
}

function patchedTypeFrontmatter(
  frontmatter: LocalVaultFrontmatter,
  patch: MobileTypeDefinitionPatch,
): LocalVaultFrontmatter {
  const nextFrontmatter = { ...frontmatter }
  writeFrontmatterValue(nextFrontmatter, 'type', 'Type')
  writeOptionalFrontmatterValue(nextFrontmatter, 'sidebar label', patch.label)
  writeOptionalFrontmatterValue(nextFrontmatter, 'color', patch.tone)
  writeOptionalFrontmatterValue(nextFrontmatter, 'icon', patch.icon)
  writeOptionalFrontmatterValue(nextFrontmatter, 'template', patch.template)
  writeOptionalFrontmatterValue(nextFrontmatter, 'sort', patch.sort)
  writeOptionalFrontmatterValue(nextFrontmatter, '_list_properties_display', patch.listPropertiesDisplay)
  writeOptionalFrontmatterValue(nextFrontmatter, 'order', patch.order)

  if (patch.visible !== undefined) {
    writeFrontmatterValue(nextFrontmatter, 'visible', patch.visible === false ? false : null)
  }

  if (patch.properties !== undefined || patch.relationships !== undefined) {
    replaceTypeSchemaFrontmatter(nextFrontmatter, patch.properties ?? {}, patch.relationships ?? {})
  }

  return nextFrontmatter
}

function replaceTypeSchemaFrontmatter(
  frontmatter: LocalVaultFrontmatter,
  properties: Record<string, MobilePropertyValue>,
  relationships: Record<string, string[]>,
) {
  for (const key of typeSchemaFrontmatterKeys(frontmatter)) {
    Reflect.deleteProperty(frontmatter, key)
  }

  for (const [key, value] of Object.entries(properties)) {
    writeFrontmatterValue(frontmatter, key, value)
  }

  for (const [key, refs] of Object.entries(relationships)) {
    writeFrontmatterValue(frontmatter, key, refs)
  }
}

function typeSchemaFrontmatterKeys(frontmatter: LocalVaultFrontmatter): string[] {
  return [
    ...Object.keys(frontmatterProperties(frontmatter)),
    ...Object.keys(frontmatterRelationships(frontmatter)),
  ]
}

function writeOptionalFrontmatterValue(
  frontmatter: LocalVaultFrontmatter,
  key: string,
  value: LocalVaultFrontmatterValue | undefined,
) {
  if (value !== undefined) writeFrontmatterValue(frontmatter, key, value)
}

function writeFrontmatterValue(
  frontmatter: LocalVaultFrontmatter,
  key: string,
  value: LocalVaultFrontmatterValue | undefined,
) {
  if (shouldRemoveFrontmatterValue(value)) {
    Reflect.deleteProperty(frontmatter, key)
    return
  }

  frontmatter[key] = value
}

function shouldRemoveFrontmatterValue(
  value: LocalVaultFrontmatterValue | undefined,
): value is undefined | null | [] {
  return value === undefined || value === null || (Array.isArray(value) && value.length === 0)
}

function defaultTypeDefinitionContent(typeName: TypeName): TypeRawContent {
  return serializeTypeDocument({ type: 'Type' }, `# ${typeName.trim() || 'Type'}\n`)
}

function serializeTypeDocument(
  frontmatter: LocalVaultFrontmatter,
  body: TypeRawContent,
): TypeRawContent {
  const entries = Object.entries(frontmatter).filter(([, value]) => value !== null && value !== undefined)
  if (entries.length === 0) return body

  return `---\n${entries.map(([key, value]) => serializeFrontmatterEntry(key, value)).join('\n')}\n---\n${body}`
}

function serializeFrontmatterEntry(
  key: string,
  value: LocalVaultFrontmatterValue,
): string {
  if (Array.isArray(value)) {
    return `${key}:\n${value.map((item) => `  - ${serializeScalar(item)}`).join('\n')}`
  }

  return `${key}: ${serializeScalar(value)}`
}

function serializeScalar(value: Exclude<LocalVaultFrontmatterValue, LocalVaultFrontmatterValue[]>): string {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (value === null) return 'null'
  if (value === '' || /[:#\n\r]/u.test(value)) return JSON.stringify(value)
  return value
}

function slugifyTypeName(value: TypeName): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '') || 'type'
}
