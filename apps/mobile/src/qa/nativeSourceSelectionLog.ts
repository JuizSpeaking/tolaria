type SourceSelectionLogText = string
type SourceSelectionLine = string

export type NativeSourceSelectionProof = {
  autocompleteCursor: number
  autocompletePreserved: boolean
  deletionCursor: number
  deletionPreserved: boolean
  emojiAutocompleteCursor: number
  emojiAutocompletePreserved: boolean
  emojiReplacementPreserved: boolean
  insertionCursor: number
  insertionPreserved: boolean
  personAutocompleteCursor: number
  personAutocompletePreserved: boolean
  personReplacementPreserved: boolean
  replacementCursor: number
  replacementPreserved: boolean
  slashAutocompleteCursor: number
  slashAutocompletePreserved: boolean
  wikilinkReplacementPreserved: boolean
}

export type NativeSourceSelectionAssertionFailure = {
  id: string
  message: string
}

const sourceSelectionLogPrefix = 'TOLARIA_MOBILE_SOURCE_SELECTION_PROBE'

export function nativeSourceSelectionLogLine(proof: NativeSourceSelectionProof): SourceSelectionLine {
  return `${sourceSelectionLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeSourceSelectionProofs(logText: SourceSelectionLogText): NativeSourceSelectionProof[] {
  return logText
    .split('\n')
    .map(parseSourceSelectionProofLine)
    .filter((proof): proof is NativeSourceSelectionProof => proof !== null)
}

export function assertNativeSourceSelectionProofs(
  proofs: NativeSourceSelectionProof[],
): NativeSourceSelectionAssertionFailure[] {
  const latest = proofs.at(-1)
  if (!latest) return [{ id: 'editor.source.selection', message: 'Native source selection proof was not logged' }]

  return [
    proofFailure(latest.insertionPreserved, 'editor.source.selection.insertion', 'Mid-document insertions keep the cursor after inserted text'),
    proofFailure(latest.replacementPreserved, 'editor.source.selection.replacement', 'Selected text replacements keep the cursor after replacement text'),
    proofFailure(latest.deletionPreserved, 'editor.source.selection.deletion', 'Backspace-style source edits keep the cursor at the deletion point'),
    proofFailure(latest.autocompletePreserved, 'editor.source.selection.autocomplete', 'Wikilink autocomplete remains active after in-place source edits'),
    proofFailure(latest.wikilinkReplacementPreserved, 'editor.source.selection.wikilinkReplacement', 'Wikilink autocomplete inserts the desktop-compatible wikilink target'),
    proofFailure(latest.personAutocompletePreserved, 'editor.source.selection.personAutocomplete', 'Person mention autocomplete remains active after native source edits'),
    proofFailure(latest.personReplacementPreserved, 'editor.source.selection.personReplacement', 'Person mention autocomplete inserts the desktop-compatible wikilink target'),
    proofFailure(latest.emojiAutocompletePreserved, 'editor.source.selection.emojiAutocomplete', 'Emoji shortcode autocomplete remains active after native source edits'),
    proofFailure(latest.emojiReplacementPreserved, 'editor.source.selection.emojiReplacement', 'Emoji shortcode autocomplete inserts the selected emoji'),
    proofFailure(latest.slashAutocompletePreserved, 'editor.source.selection.slashAutocomplete', 'Slash-command autocomplete remains active after native source edits'),
  ].filter((failure): failure is NativeSourceSelectionAssertionFailure => failure !== null)
}

export function formatNativeSourceSelectionFailures(
  failures: NativeSourceSelectionAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

function parseSourceSelectionProofLine(line: SourceSelectionLine): NativeSourceSelectionProof | null {
  const prefixIndex = line.indexOf(sourceSelectionLogPrefix)
  if (prefixIndex === -1) return null

  try {
    return JSON.parse(line.slice(prefixIndex + sourceSelectionLogPrefix.length).trim()) as NativeSourceSelectionProof
  } catch {
    return null
  }
}

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeSourceSelectionAssertionFailure | null {
  return passed ? null : { id, message }
}
