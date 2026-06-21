import type { TiptapJsonNode } from '../../workspace/mobileDocumentContent'
import type { NativeWysiwygSelection } from './MobileWysiwygWikilinkBridgeModel'

const mathBlockType = 'mathBlock'
const mathInlineType = 'mathInline'

type MathEditKind = typeof mathBlockType | typeof mathInlineType
type MathEditResult = {
  edited: boolean
  node: TiptapJsonNode
}
type MathEditRequest = {
  json: unknown
  latex: string
  selection?: NativeWysiwygSelection
}
type MathNodeEditor = (node: TiptapJsonNode) => TiptapJsonNode

export function nativeWysiwygDocumentWithEditableInlineMathSource({
  json,
  selection,
}: {
  json: unknown
  selection?: NativeWysiwygSelection
}): TiptapJsonNode | null {
  if (!isTiptapDocument(json)) return null

  const result = editFirstSelectedMathNode({
    editNode: inlineMathSourceTextNode,
    kind: mathInlineType,
    node: json,
    selection: normalizedSelectionOrNull(selection),
  })
  return result.edited ? result.node : null
}

export function nativeWysiwygDocumentWithUpdatedMathBlock({
  json,
  latex,
  selection,
}: MathEditRequest): TiptapJsonNode | null {
  if (!isTiptapDocument(json)) return null

  const result = editFirstSelectedMathNode({
    editNode: (node) => ({
      ...cloneNode(node),
      attrs: {
        ...(node.attrs ?? {}),
        latex,
      },
    }),
    kind: mathBlockType,
    node: json,
    selection: normalizedSelectionOrNull(selection),
  })
  return result.edited ? result.node : null
}

export function nativeWysiwygDocumentHasInlineMathNode(json: unknown): boolean {
  return isTiptapJsonNode(json) && containsNodeType(json, mathInlineType)
}

export function nativeWysiwygDocumentHasInlineMathSource(json: unknown, latex: string): boolean {
  return isTiptapJsonNode(json) && containsText(json, `$${latex}$`)
}

function editFirstSelectedMathNode({
  editNode,
  kind,
  node,
  selection,
  start = 0,
}: {
  editNode: MathNodeEditor
  kind: MathEditKind
  node: TiptapJsonNode
  selection: NativeWysiwygSelection | null
  start?: number
}): MathEditResult {
  if (node.type === kind && selectionMatchesNode({ node, selection, start })) {
    return { edited: true, node: editNode(node) }
  }

  const children = node.content ?? []
  if (children.length === 0) return { edited: false, node: cloneNode(node) }

  const nextChildren: TiptapJsonNode[] = []
  let childStart = node.type === 'doc' ? start : start + 1
  let edited = false

  for (const child of children) {
    const childEnd = childStart + tiptapNodeSize(child)
    if (!edited && selectionMayTargetChild({ childEnd, childStart, selection })) {
      const childResult = editFirstSelectedMathNode({
        editNode,
        kind,
        node: child,
        selection,
        start: childStart,
      })
      edited = childResult.edited
      nextChildren.push(childResult.node)
    } else {
      nextChildren.push(cloneNode(child))
    }
    childStart = childEnd
  }

  return {
    edited,
    node: {
      ...cloneNode(node),
      content: nextChildren,
    },
  }
}

function selectionMayTargetChild({
  childEnd,
  childStart,
  selection,
}: {
  childEnd: number
  childStart: number
  selection: NativeWysiwygSelection | null
}): boolean {
  if (!selection) return true
  if (selection.from === selection.to) return selection.from >= childStart && selection.from <= childEnd

  return selection.from <= childEnd && selection.to >= childStart
}

function selectionMatchesNode({
  node,
  selection,
  start,
}: {
  node: TiptapJsonNode
  selection: NativeWysiwygSelection | null
  start: number
}): boolean {
  if (!selection) return true

  const end = start + tiptapNodeSize(node)
  if (selection.from === selection.to) return selection.from >= start && selection.from <= end

  return selection.from <= start && selection.to >= end
}

function inlineMathSourceTextNode(node: TiptapJsonNode): TiptapJsonNode {
  return {
    text: `$${mathNodeLatex(node)}$`,
    type: 'text',
  }
}

function mathNodeLatex(node: TiptapJsonNode): string {
  const latex = node.attrs?.latex
  return typeof latex === 'string' ? latex : ''
}

function normalizedSelectionOrNull(selection?: NativeWysiwygSelection): NativeWysiwygSelection | null {
  if (!selection) return null

  return {
    from: Math.max(0, Math.min(selection.from, selection.to)),
    to: Math.max(0, Math.max(selection.from, selection.to)),
  }
}

function containsNodeType(node: TiptapJsonNode, type: string): boolean {
  if (node.type === type) return true
  return (node.content ?? []).some((child) => containsNodeType(child, type))
}

function containsText(node: TiptapJsonNode, text: string): boolean {
  if (node.text?.includes(text)) return true
  return (node.content ?? []).some((child) => containsText(child, text))
}

function isTiptapDocument(value: unknown): value is TiptapJsonNode {
  return isTiptapJsonNode(value) && value.type === 'doc'
}

function isTiptapJsonNode(value: unknown): value is TiptapJsonNode {
  return Boolean(value && typeof value === 'object')
}

function tiptapNodeSize(node: TiptapJsonNode): number {
  if (typeof node.text === 'string') return node.text.length
  if (!node.content) return 1

  return node.content.reduce((size, child) => size + tiptapNodeSize(child), 2)
}

function cloneNode(node: TiptapJsonNode): TiptapJsonNode {
  return {
    ...node,
    attrs: node.attrs ? { ...node.attrs } : undefined,
    content: node.content?.map(cloneNode),
    marks: node.marks?.map((mark) => ({
      ...mark,
      attrs: mark.attrs ? { ...mark.attrs } : undefined,
    })),
  }
}
