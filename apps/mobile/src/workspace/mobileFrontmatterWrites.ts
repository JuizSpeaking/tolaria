import type {
  LocalVaultFrontmatter,
  LocalVaultFrontmatterValue,
} from './localVaultFrontmatter'

type FrontmatterKey = string

type CanonicalFrontmatterWriteRule = {
  aliases: readonly FrontmatterKey[]
  writeKey: FrontmatterKey
}

const canonicalFrontmatterWriteRules: readonly CanonicalFrontmatterWriteRule[] = [
  { aliases: ['type', 'is_a', 'Is A'], writeKey: 'type' },
  { aliases: ['_archived', 'Archived', 'archived'], writeKey: '_archived' },
  { aliases: ['_favorite', 'favorite'], writeKey: '_favorite' },
  { aliases: ['_favorite_index', 'favorite_index', 'favorite index'], writeKey: '_favorite_index' },
  { aliases: ['_icon', 'icon'], writeKey: '_icon' },
  { aliases: ['_order', 'order'], writeKey: '_order' },
  { aliases: ['_sidebar_label', 'sidebar_label', 'sidebar label'], writeKey: '_sidebar_label' },
  { aliases: ['_sort', 'sort'], writeKey: '_sort' },
  { aliases: ['_width', 'width'], writeKey: '_width' },
]

export const writeMobileFrontmatterValue = (
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey,
  value: LocalVaultFrontmatterValue | undefined,
): LocalVaultFrontmatter => {
  const rule = canonicalFrontmatterWriteRule(key)
  const writeKey = rule?.writeKey ?? key
  const frontmatterWithoutAliases = rule
    ? deleteFrontmatterAliases(frontmatter, rule)
    : { ...frontmatter }

  const nextFrontmatter = { ...frontmatterWithoutAliases }
  if (shouldRemoveFrontmatterValue(value)) {
    Reflect.deleteProperty(nextFrontmatter, writeKey)
    return nextFrontmatter
  }

  nextFrontmatter[writeKey] = value as LocalVaultFrontmatterValue
  return nextFrontmatter
}

function canonicalFrontmatterWriteRule(
  key: FrontmatterKey,
): CanonicalFrontmatterWriteRule | null {
  const normalizedKey = normalizedFrontmatterKey(key)
  return canonicalFrontmatterWriteRules.find((rule) => {
    return rule.aliases.some((alias) => normalizedFrontmatterKey(alias) === normalizedKey)
  }) ?? null
}

function deleteFrontmatterAliases(
  frontmatter: LocalVaultFrontmatter,
  rule: CanonicalFrontmatterWriteRule,
): LocalVaultFrontmatter {
  const nextFrontmatter = { ...frontmatter }
  for (const key of Object.keys(frontmatter)) {
    if (rule.aliases.some((alias) => normalizedFrontmatterKey(alias) === normalizedFrontmatterKey(key))) {
      Reflect.deleteProperty(nextFrontmatter, key)
    }
  }
  return nextFrontmatter
}

function shouldRemoveFrontmatterValue(
  value: LocalVaultFrontmatterValue | undefined,
): boolean {
  return value === undefined || value === null || (Array.isArray(value) && value.length === 0)
}

function normalizedFrontmatterKey(key: FrontmatterKey): FrontmatterKey {
  return key.trim().toLowerCase().replaceAll(' ', '_')
}
