import {
  Code,
  CodeBlock,
  ClipboardText,
  FlowArrow,
  LinkSimple,
  ListBullets,
  ListChecks,
  ListNumbers,
  Minus,
  Paperclip,
  Pi,
  Quotes,
  ScribbleLoop,
  Table,
  TextB,
  TextHFive,
  TextHFour,
  TextHOne,
  TextHSix,
  TextHThree,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
} from 'phosphor-react-native'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { mobileText } from '../../i18n/mobileText'
import { MobileIconButton } from '../../ui/MobileIconButton'
import { desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace } from '../../ui/tokens'
import { probeProps, type MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import type { MobileMarkdownFormatAction } from '../../workspace/mobileMarkdownFormatting'

type FormattingCommand = {
  action: MobileMarkdownFormatAction
  icon: (color: string) => ReactNode
  label: string
  testID: string
}

const formattingCommands: FormattingCommand[] = [
  {
    action: 'attachment',
    icon: (color) => <Paperclip color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.attachment'),
    testID: 'editor-format-attachment',
  },
  {
    action: 'pastePlainText',
    icon: (color) => <ClipboardText color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('command.note.pastePlainText'),
    testID: 'editor-format-paste-plain-text',
  },
  {
    action: 'bold',
    icon: (color) => <TextB color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.bold'),
    testID: 'editor-format-bold',
  },
  {
    action: 'italic',
    icon: (color) => <TextItalic color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.italic'),
    testID: 'editor-format-italic',
  },
  {
    action: 'strike',
    icon: (color) => <TextStrikethrough color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.strikethrough'),
    testID: 'editor-format-strike',
  },
  {
    action: 'code',
    icon: (color) => <Code color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.code'),
    testID: 'editor-format-code',
  },
  {
    action: 'highlight',
    icon: (color) => <TextB color={color} size={desktopToolbarActionParity.iconSize} weight="fill" />,
    label: mobileText('editor.formatting.highlight'),
    testID: 'editor-format-highlight',
  },
  {
    action: 'wikilink',
    icon: (color) => <LinkSimple color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.wikilink'),
    testID: 'editor-format-wikilink',
  },
  {
    action: 'heading1',
    icon: (color) => <TextHOne color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.heading1'),
    testID: 'editor-format-heading-1',
  },
  {
    action: 'heading2',
    icon: (color) => <TextHTwo color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.heading2'),
    testID: 'editor-format-heading-2',
  },
  {
    action: 'heading3',
    icon: (color) => <TextHThree color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.heading3'),
    testID: 'editor-format-heading-3',
  },
  {
    action: 'heading4',
    icon: (color) => <TextHFour color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.heading4'),
    testID: 'editor-format-heading-4',
  },
  {
    action: 'heading5',
    icon: (color) => <TextHFive color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.heading5'),
    testID: 'editor-format-heading-5',
  },
  {
    action: 'heading6',
    icon: (color) => <TextHSix color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.heading6'),
    testID: 'editor-format-heading-6',
  },
  {
    action: 'bulletList',
    icon: (color) => <ListBullets color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.bulletList'),
    testID: 'editor-format-bullet-list',
  },
  {
    action: 'orderedList',
    icon: (color) => <ListNumbers color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.orderedList'),
    testID: 'editor-format-ordered-list',
  },
  {
    action: 'taskList',
    icon: (color) => <ListChecks color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.taskList'),
    testID: 'editor-format-task-list',
  },
  {
    action: 'quote',
    icon: (color) => <Quotes color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.quote'),
    testID: 'editor-format-quote',
  },
  {
    action: 'divider',
    icon: (color) => <Minus color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.divider'),
    testID: 'editor-format-divider',
  },
  {
    action: 'codeBlock',
    icon: (color) => <CodeBlock color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.codeBlock'),
    testID: 'editor-format-code-block',
  },
  {
    action: 'mathBlock',
    icon: (color) => <Pi color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.mathBlock'),
    testID: 'editor-format-math-block',
  },
  {
    action: 'mermaid',
    icon: (color) => <FlowArrow color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.mermaid'),
    testID: 'editor-format-mermaid',
  },
  {
    action: 'whiteboard',
    icon: (color) => <ScribbleLoop color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.whiteboard'),
    testID: 'editor-format-whiteboard',
  },
  {
    action: 'table',
    icon: (color) => <Table color={color} size={desktopToolbarActionParity.iconSize} />,
    label: mobileText('editor.formatting.table'),
    testID: 'editor-format-table',
  },
]

export function MobileMarkdownFormattingToolbar({
  actions,
  layoutProbe,
  metricId,
  onFormat,
}: {
  actions?: readonly MobileMarkdownFormatAction[]
  layoutProbe?: MobileLayoutProbe
  metricId?: string
  onFormat: (action: MobileMarkdownFormatAction) => void
}) {
  const visibleActions = new Set(actions ?? formattingCommands.map((command) => command.action))

  return (
    <ScrollView
      accessibilityLabel={mobileText('editor.formatting.toolbar')}
      alwaysBounceHorizontal={false}
      contentContainerStyle={styles.toolbarContent}
      horizontal
      keyboardShouldPersistTaps="handled"
      {...formattingProbeProps(layoutProbe, metricId)}
      showsHorizontalScrollIndicator={false}
      style={styles.toolbarViewport}
      testID="editor-formatting-toolbar"
    >
      {formattingCommands.filter((command) => visibleActions.has(command.action)).map((command) => (
        <View
          key={command.action}
          {...formattingProbeProps(layoutProbe, metricId, `action.${command.action}`)}
          style={styles.actionProbe}
        >
          <MobileIconButton
            accessibilityLabel={command.label}
            testID={command.testID}
            onPress={() => onFormat(command.action)}
          >
            {command.icon(mobileColors.textMuted)}
          </MobileIconButton>
        </View>
      ))}
    </ScrollView>
  )
}

function formattingProbeProps(
  layoutProbe: MobileLayoutProbe | undefined,
  metricId: string | undefined,
  segment?: string,
) {
  if (!layoutProbe || !metricId) return {}
  return probeProps(layoutProbe, segment ? `${metricId}.${segment}` : metricId)
}

const styles = StyleSheet.create({
  actionProbe: {
    height: desktopToolbarActionParity.iconButtonSize,
    width: desktopToolbarActionParity.iconButtonSize,
  },
  toolbarContent: {
    flexDirection: 'row',
    gap: mobileSpace.xs,
    paddingBottom: mobileSpace.xs,
  },
  toolbarViewport: {
    flexGrow: 0,
  },
})
