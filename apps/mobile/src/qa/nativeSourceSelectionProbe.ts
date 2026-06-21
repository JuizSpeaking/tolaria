import {
  activeMobileEmojiShortcodeQuery,
  activeMobilePersonMentionQuery,
  activeMobileSlashCommandQuery,
  activeMobileWikilinkQuery,
  replaceActiveMobileEmojiShortcodeQuery,
  replaceActiveMobilePersonMentionQuery,
  replaceActiveMobileWikilinkQuery,
} from '../workspace/mobileWikilinkAutocomplete'
import { mobileMarkdownSelectionAfterTextChange } from '../workspace/mobileMarkdownSourceSelection'
import type { NativeSourceSelectionProof } from './nativeSourceSelectionLog'

export function nativeSourceSelectionProof(): NativeSourceSelectionProof {
  const insertionCursor = selectionAfter(
    'Intro\n\nFollow up today',
    'Intro\n\nFollow up with Maria today',
    17,
  )
  const replacementCursor = selectionAfter(
    'Intro\n\nFollow up today',
    'Intro\n\nFollow up tomorrow',
    17,
    22,
  )
  const deletionCursor = selectionAfter(
    'Intro\n\nFollow up today',
    'Intro\n\nFollow today',
    17,
  )
  const autocompleteCursor = selectionAfter('Links [[Pro today', 'Links [[Proj today', 11)
  const wikilinkReplacement = replaceActiveMobileWikilinkQuery(
    'Links [[Proj today',
    autocompleteCursor,
    'projects/alpha',
  )
  const personAutocompleteCursor = selectionAfter('Assign @Ma today', 'Assign @Mar today', 10)
  const emojiAutocompleteCursor = selectionAfter('Mood :roc today', 'Mood :rock today', 9)
  const slashAutocompleteCursor = selectionAfter('Insert /ta today', 'Insert /tab today', 10)
  const personReplacement = replaceActiveMobilePersonMentionQuery(
    'Assign @Mar today',
    personAutocompleteCursor,
    'People/Maria Rossi',
  )
  const emojiReplacement = replaceActiveMobileEmojiShortcodeQuery(
    'Mood :rock today',
    emojiAutocompleteCursor,
    '🚀',
  )

  return {
    autocompleteCursor,
    autocompletePreserved: activeMobileWikilinkQuery('Links [[Proj today', autocompleteCursor)?.query === 'Proj',
    deletionCursor,
    deletionPreserved: deletionCursor === 14,
    emojiAutocompleteCursor,
    emojiAutocompletePreserved: activeMobileEmojiShortcodeQuery('Mood :rock today', emojiAutocompleteCursor)?.query === 'rock',
    emojiReplacementPreserved: emojiReplacement?.text === 'Mood 🚀 today',
    insertionCursor,
    insertionPreserved: insertionCursor === 28,
    personAutocompleteCursor,
    personAutocompletePreserved: activeMobilePersonMentionQuery('Assign @Mar today', personAutocompleteCursor)?.query === 'Mar',
    personReplacementPreserved: personReplacement?.text === 'Assign [[People/Maria Rossi]] today',
    replacementCursor,
    replacementPreserved: replacementCursor === 25,
    slashAutocompleteCursor,
    slashAutocompletePreserved: activeMobileSlashCommandQuery('Insert /tab today', slashAutocompleteCursor)?.query === 'tab',
    wikilinkReplacementPreserved: wikilinkReplacement?.text === 'Links [[projects/alpha]] today',
  }
}

export function nativeSourceSelectionProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('sourceSelectionProbe') === '1'
}

function selectionAfter(previousText: string, nextText: string, start: number, end = start): number {
  return mobileMarkdownSelectionAfterTextChange(previousText, nextText, { start, end }).start
}
