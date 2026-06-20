import type { AnyExtension, Editor } from '@tiptap/core'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'

const TableNode = Table.configure({
  allowTableNodeSelection: true,
  lastColumnResizable: false,
  resizable: false,
})
const tableExtensions: AnyExtension[] = [
  TableNode,
  TableRow,
  TableHeader,
  TableCell,
]

type MobileTableBridgeExtension = {
  clone: () => MobileTableBridgeExtension
  config?: unknown
  configureCSS: (css: string) => MobileTableBridgeExtension
  configureExtension: (config: unknown) => MobileTableBridgeExtension
  configureTiptapExtensionsOnRunTime: (config: unknown, extendConfig: unknown) => (AnyExtension | undefined)[]
  extendEditorInstance: (sendBridgeMessage: SendMobileTableBridgeMessage) => MobileTableBridgeEditorInstance
  extendEditorState: (editor: Editor) => MobileTableBridgeEditorState
  extendExtension: (extendConfig: unknown) => MobileTableBridgeExtension
  extendConfig?: unknown
  extendCSS: string
  name: string
  onBridgeMessage: (editor: Editor, message: unknown) => boolean
  tiptapExtension: AnyExtension
}

type MobileTableBridgeOptions = {
  config?: unknown
  css?: string
  extendConfig?: unknown
}
type MobileTableBridgeActionType =
  | 'mobile-table-add-column-after'
  | 'mobile-table-add-row-after'
  | 'mobile-table-delete-column'
  | 'mobile-table-delete-row'
type MobileTableBridgeEditorInstance = {
  addColumnAfter: () => void
  addRowAfter: () => void
  deleteColumn: () => void
  deleteRow: () => void
}
type MobileTableBridgeEditorState = {
  canAddColumnAfter: boolean
  canAddRowAfter: boolean
  canDeleteColumn: boolean
  canDeleteRow: boolean
}
type MobileTableBridgeMessage = {
  type: MobileTableBridgeActionType
}
type SendMobileTableBridgeMessage = (message: MobileTableBridgeMessage) => void

export const MobileTableBridge = mobileTableBridge()

function mobileTableBridge({
  config,
  css = '',
  extendConfig,
}: MobileTableBridgeOptions = {}): MobileTableBridgeExtension {
  return {
    clone: () => mobileTableBridge({ config, css, extendConfig }),
    config,
    configureCSS: (nextCss) => mobileTableBridge({ config, css: nextCss, extendConfig }),
    configureExtension: (nextConfig) => mobileTableBridge({ config: nextConfig, css, extendConfig }),
    configureTiptapExtensionsOnRunTime: (runtimeConfig, runtimeExtendConfig) => (
      tableExtensions.map((extension) => configuredTableExtension(extension, {
        config: runtimeConfig,
        extendConfig: runtimeExtendConfig,
      }))
    ),
    extendEditorInstance: (sendBridgeMessage) => ({
      addColumnAfter: () => sendBridgeMessage({ type: 'mobile-table-add-column-after' }),
      addRowAfter: () => sendBridgeMessage({ type: 'mobile-table-add-row-after' }),
      deleteColumn: () => sendBridgeMessage({ type: 'mobile-table-delete-column' }),
      deleteRow: () => sendBridgeMessage({ type: 'mobile-table-delete-row' }),
    }),
    extendEditorState: (editor) => ({
      canAddColumnAfter: editor.can().addColumnAfter(),
      canAddRowAfter: editor.can().addRowAfter(),
      canDeleteColumn: editor.can().deleteColumn(),
      canDeleteRow: editor.can().deleteRow(),
    }),
    extendExtension: (nextExtendConfig) => mobileTableBridge({ config, css, extendConfig: nextExtendConfig }),
    extendConfig,
    extendCSS: css,
    name: TableNode.name,
    onBridgeMessage: (editor, message) => handleMobileTableBridgeMessage(editor, message),
    tiptapExtension: TableNode,
  }
}

function configuredTableExtension(
  extension: AnyExtension,
  options: { config: unknown; extendConfig: unknown },
): AnyExtension {
  if (extension.name !== TableNode.name) return extension

  const configuredExtension = options.config ? extension.configure(options.config) : extension
  return options.extendConfig ? configuredExtension.extend(options.extendConfig) : configuredExtension
}

function handleMobileTableBridgeMessage(editor: Editor, message: unknown): boolean {
  const action = mobileTableBridgeAction(message)
  if (!action) return false

  if (action === 'mobile-table-add-column-after') editor.chain().focus().addColumnAfter().run()
  if (action === 'mobile-table-add-row-after') editor.chain().focus().addRowAfter().run()
  if (action === 'mobile-table-delete-column') editor.chain().focus().deleteColumn().run()
  if (action === 'mobile-table-delete-row') editor.chain().focus().deleteRow().run()
  return false
}

function mobileTableBridgeAction(message: unknown): MobileTableBridgeActionType | null {
  if (!message || typeof message !== 'object') return null

  const type = (message as { type?: unknown }).type
  return isMobileTableBridgeActionType(type) ? type : null
}

function isMobileTableBridgeActionType(value: unknown): value is MobileTableBridgeActionType {
  return value === 'mobile-table-add-column-after'
    || value === 'mobile-table-add-row-after'
    || value === 'mobile-table-delete-column'
    || value === 'mobile-table-delete-row'
}
