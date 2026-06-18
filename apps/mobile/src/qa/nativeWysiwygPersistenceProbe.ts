import type { NativeWysiwygMutationProof } from './nativeWysiwygMutationProbe'

type PersistenceLogText = string
type PersistenceLine = string
type RelativeVaultPath = string

export type NativeWysiwygPersistenceProof = {
  mutation: NativeWysiwygMutationProof
  path: RelativeVaultPath
  persistedToNativeRepository: boolean
}

export type NativeWysiwygPersistenceAssertionFailure = {
  id: string
  message: string
}

const persistenceLogPrefix = 'TOLARIA_MOBILE_WYSIWYG_PERSISTENCE_PROBE'
export const nativeWysiwygPersistenceProbeVaultLabel = 'Tolaria WYSIWYG QA Vault'
export const nativeWysiwygPersistenceProbeNotePath = 'Tolaria/Mobile UI/WYSIWYG Persistence Probe.md'

export function nativeWysiwygPersistenceProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('wysiwygPersistenceProbe') === '1'
}

export function nativeWysiwygPersistenceLogLine(
  proof: NativeWysiwygPersistenceProof,
): PersistenceLine {
  return `${persistenceLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeWysiwygPersistenceProofs(
  logText: PersistenceLogText,
): NativeWysiwygPersistenceProof[] {
  return logText
    .split('\n')
    .map(parsePersistenceProofLine)
    .filter((proof): proof is NativeWysiwygPersistenceProof => proof !== null)
}

export function assertNativeWysiwygPersistenceProofs(
  proofs: NativeWysiwygPersistenceProof[],
): NativeWysiwygPersistenceAssertionFailure[] {
  const latest = proofs.at(-1)
  if (!latest) {
    return [{ id: 'editor.wysiwyg.persistence', message: 'Native WYSIWYG persistence proof was not logged' }]
  }

  return [
    proofFailure(latest.persistedToNativeRepository, 'editor.wysiwyg.persistence.native', 'Saved markdown was read back from the native Expo filesystem repository'),
    proofFailure(latest.path === nativeWysiwygPersistenceProbeNotePath, 'editor.wysiwyg.persistence.path', 'Native WYSIWYG write targets the seeded vault-relative note path'),
    ...mutationProofFailures(latest.mutation),
  ].filter((failure): failure is NativeWysiwygPersistenceAssertionFailure => failure !== null)
}

export function formatNativeWysiwygPersistenceFailures(
  failures: NativeWysiwygPersistenceAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

function parsePersistenceProofLine(line: PersistenceLine): NativeWysiwygPersistenceProof | null {
  const prefixIndex = line.indexOf(persistenceLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + persistenceLogPrefix.length).trim()
  try {
    const parsed: unknown = JSON.parse(rawJson)
    return parsedPersistenceProof(parsed)
  } catch {
    return null
  }
}

function parsedPersistenceProof(value: unknown): NativeWysiwygPersistenceProof | null {
  if (value === null) return null
  if (typeof value !== 'object') return null

  const candidate = value as Partial<NativeWysiwygPersistenceProof>
  if (!hasPersistenceProofFields(candidate)) return null
  if (!isMutationProofShape(candidate.mutation)) return null

  return {
    mutation: candidate.mutation,
    path: candidate.path,
    persistedToNativeRepository: candidate.persistedToNativeRepository,
  }
}

function hasPersistenceProofFields(
  candidate: Partial<NativeWysiwygPersistenceProof>,
): candidate is Partial<NativeWysiwygPersistenceProof> & Pick<
  NativeWysiwygPersistenceProof,
  'path' | 'persistedToNativeRepository'
> {
  return typeof candidate.path === 'string'
    && typeof candidate.persistedToNativeRepository === 'boolean'
}

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeWysiwygPersistenceAssertionFailure | null {
  return passed ? null : { id, message }
}

function isMutationProofShape(value: unknown): value is NativeWysiwygMutationProof {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<NativeWysiwygMutationProof>
  return typeof candidate.noteId === 'string'
    && typeof candidate.contentLength === 'number'
}

function mutationProofFailures(
  proof: NativeWysiwygMutationProof,
): Array<NativeWysiwygPersistenceAssertionFailure | null> {
  return [
    proofFailure(proof.frontmatterPreserved, 'editor.wysiwyg.persistence.mutation.frontmatter', 'Frontmatter boundary survives native WYSIWYG saves'),
    proofFailure(proof.typePreserved, 'editor.wysiwyg.persistence.mutation.type', 'Desktop type frontmatter survives native WYSIWYG saves'),
    proofFailure(proof.statusPreserved, 'editor.wysiwyg.persistence.mutation.status', 'Desktop status frontmatter survives native WYSIWYG saves'),
    proofFailure(proof.tagsPreserved, 'editor.wysiwyg.persistence.mutation.tags', 'Desktop tag frontmatter survives native WYSIWYG saves'),
    proofFailure(proof.favoritePreserved, 'editor.wysiwyg.persistence.mutation.favorite', 'Desktop boolean frontmatter survives native WYSIWYG saves'),
    proofFailure(proof.titleSaved, 'editor.wysiwyg.persistence.mutation.title', 'Optional H1 title is saved as document content'),
    proofFailure(proof.mutationTextSaved, 'editor.wysiwyg.persistence.mutation.body', 'TenTap body mutation reaches the markdown save pipeline'),
    proofFailure(proof.inlineMarksSaved, 'editor.wysiwyg.persistence.mutation.inline', 'Native WYSIWYG inline marks serialize to desktop markdown syntax'),
    proofFailure(proof.wikilinkSaved, 'editor.wysiwyg.persistence.mutation.wikilink', 'Native WYSIWYG links can preserve Tolaria wikilink markdown'),
    proofFailure(proof.listBlocksSaved, 'editor.wysiwyg.persistence.mutation.lists', 'Native WYSIWYG list blocks serialize to desktop markdown syntax'),
    proofFailure(proof.quoteSaved, 'editor.wysiwyg.persistence.mutation.quote', 'Native WYSIWYG quote blocks serialize to desktop markdown syntax'),
    proofFailure(proof.codeBlockSaved, 'editor.wysiwyg.persistence.mutation.codeBlock', 'Unsupported code-fence content remains editable desktop markdown lines'),
    proofFailure(proof.dividerSaved, 'editor.wysiwyg.persistence.mutation.divider', 'Unsupported divider content remains editable desktop markdown'),
    proofFailure(proof.tableLinesPreserved, 'editor.wysiwyg.persistence.mutation.table', 'Unsupported table content remains editable markdown lines'),
  ]
}
