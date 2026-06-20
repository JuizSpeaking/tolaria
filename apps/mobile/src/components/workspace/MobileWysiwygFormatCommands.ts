import { mobileColors } from '../../ui/tokens'
import type { MobileMarkdownFormatAction } from '../../workspace/mobileMarkdownFormatting'
import {
  mobileMarkdownSourceBlockActions,
  type MobileMarkdownSourceBlockAction,
} from '../../workspace/mobileMarkdownSourceBlocks'

export type NativeWysiwygCommandBridge = {
  addColumnAfter?: () => void
  addRowAfter?: () => void
  deleteColumn?: () => void
  deleteRow?: () => void
  toggleBlockquote?: () => void
  toggleBold?: () => void
  toggleBulletList?: () => void
  toggleCode?: () => void
  toggleHeading?: (level: 1 | 2 | 3 | 4 | 5 | 6) => void
  toggleHighlight?: (color: string) => void
  toggleItalic?: () => void
  toggleOrderedList?: () => void
  toggleStrike?: () => void
  toggleTaskList?: () => void
}

type NativeWysiwygFormatCommand = (editor: NativeWysiwygCommandBridge) => void
type NativeWysiwygFormatCommandSpec = {
  action: MobileMarkdownFormatAction
  run: NativeWysiwygFormatCommand
}

export const nativeWysiwygMarkdownBlockActions = mobileMarkdownSourceBlockActions

export type NativeWysiwygMarkdownBlockAction = MobileMarkdownSourceBlockAction

export const nativeWysiwygFormattingActions = [
  'attachment',
  'pastePlainText',
  'bold',
  'italic',
  'strike',
  'code',
  'highlight',
  'wikilink',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'bulletList',
  'orderedList',
  'taskList',
  'quote',
  ...nativeWysiwygMarkdownBlockActions,
  'tableAddColumnAfter',
  'tableAddRowAfter',
  'tableDeleteColumn',
  'tableDeleteRow',
] as const satisfies readonly MobileMarkdownFormatAction[]

const nativeWysiwygFormatCommands = [
  { action: 'tableAddColumnAfter', run: (editor) => editor.addColumnAfter?.() },
  { action: 'tableAddRowAfter', run: (editor) => editor.addRowAfter?.() },
  { action: 'tableDeleteColumn', run: (editor) => editor.deleteColumn?.() },
  { action: 'tableDeleteRow', run: (editor) => editor.deleteRow?.() },
  { action: 'bold', run: (editor) => editor.toggleBold?.() },
  { action: 'bulletList', run: (editor) => editor.toggleBulletList?.() },
  { action: 'code', run: (editor) => editor.toggleCode?.() },
  { action: 'heading1', run: (editor) => editor.toggleHeading?.(1) },
  { action: 'heading2', run: (editor) => editor.toggleHeading?.(2) },
  { action: 'heading3', run: (editor) => editor.toggleHeading?.(3) },
  { action: 'heading4', run: (editor) => editor.toggleHeading?.(4) },
  { action: 'heading5', run: (editor) => editor.toggleHeading?.(5) },
  { action: 'heading6', run: (editor) => editor.toggleHeading?.(6) },
  { action: 'highlight', run: (editor) => editor.toggleHighlight?.(mobileColors.yellowSoft) },
  { action: 'italic', run: (editor) => editor.toggleItalic?.() },
  { action: 'orderedList', run: (editor) => editor.toggleOrderedList?.() },
  { action: 'quote', run: (editor) => editor.toggleBlockquote?.() },
  { action: 'strike', run: (editor) => editor.toggleStrike?.() },
  { action: 'taskList', run: (editor) => editor.toggleTaskList?.() },
] as const satisfies readonly NativeWysiwygFormatCommandSpec[]

export function applyNativeWysiwygFormat(
  editor: NativeWysiwygCommandBridge,
  action: MobileMarkdownFormatAction,
): void {
  const command = nativeWysiwygFormatCommands.find((candidate) => candidate.action === action)
  command?.run(editor)
}

export function isNativeWysiwygMarkdownBlockAction(
  action: MobileMarkdownFormatAction,
): action is NativeWysiwygMarkdownBlockAction {
  return nativeWysiwygMarkdownBlockActions.includes(action as NativeWysiwygMarkdownBlockAction)
}
