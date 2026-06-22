import { useMemo, useState, type ReactNode } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native'
import { Text } from '../ui/text'
import { Input } from '../ui/input'
import { mobileText } from '../../i18n/mobileText'
import { MobileButton } from '../../ui/MobileButton'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { desktopPanelParity } from '../../ui/desktopParity'
import { mobileColors, mobileRadius, mobileSpace, mobileType } from '../../ui/tokens'
import {
  mobileCommandGroupLabel,
  mobileCommandPaletteResults,
  type MobileCommandPaletteCommand,
} from '../../workspace/mobileCommandPalette'

type MobileCommandPaletteProps = {
  commands: MobileCommandPaletteCommand[]
  onClose: () => void
}

export function MobileCommandPalette({ commands, onClose }: MobileCommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const results = useMemo(() => mobileCommandPaletteResults(commands, query), [commands, query])
  const selectCommand = (command: MobileCommandPaletteCommand) => {
    onClose()
    command.execute()
  }
  const selectActiveCommand = () => {
    const command = results.flatList.at(selectedIndex)
    if (command) selectCommand(command)
  }
  const handleQueryChange = (nextQuery: string) => {
    setSelectedIndex(0)
    setQuery(nextQuery)
  }
  const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key === 'ArrowDown') {
      setSelectedIndex((index) => Math.min(index + 1, Math.max(results.flatList.length - 1, 0)))
    } else if (event.nativeEvent.key === 'ArrowUp') {
      setSelectedIndex((index) => Math.max(index - 1, 0))
    } else if (event.nativeEvent.key === 'Enter') {
      selectActiveCommand()
    } else if (event.nativeEvent.key === 'Escape') {
      onClose()
    }
  }

  return (
    <View style={styles.overlay} testID="mobile-command-palette">
      <Pressable accessibilityLabel={mobileText('common.cancel')} style={styles.backdrop} testID="mobile-command-palette-backdrop" onPress={onClose} />
      <MobilePanel style={styles.palette} testID="mobile-command-palette-panel">
        <MobileToolbar testID="mobile-command-palette-toolbar">
          <MobileToolbarTitle title={mobileText('menu.view.commandPalette')} />
          <MobileToolbarSpacer />
          <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={onClose} />
        </MobileToolbar>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          clearButtonMode="while-editing"
          placeholder={mobileText('command.palettePlaceholder')}
          placeholderTextColor={mobileColors.textFaint}
          spellCheck={false}
          style={styles.input}
          testID="mobile-command-palette-input"
          value={query}
          onChangeText={handleQueryChange}
          onKeyPress={handleKeyPress}
          onSubmitEditing={selectActiveCommand}
        />
        <CommandResults
          groups={results.groups}
          selectedIndex={selectedIndex}
          onHover={setSelectedIndex}
          onSelect={selectCommand}
        />
      </MobilePanel>
    </View>
  )
}

function CommandResults({
  groups,
  selectedIndex,
  onHover,
  onSelect,
}: {
  groups: ReturnType<typeof mobileCommandPaletteResults>['groups']
  selectedIndex: number
  onHover: (index: number) => void
  onSelect: (command: MobileCommandPaletteCommand) => void
}) {
  if (groups.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{mobileText('command.noMatches')}</Text>
      </View>
    )
  }

  const indexedGroups = indexedCommandGroups(groups)
  return (
    <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
      {indexedGroups.map((group) => (
        <View key={group.group}>
          <Text style={styles.groupLabel}>{mobileCommandGroupLabel(group.group)}</Text>
          {group.items.map(({ command, index }) => (
            <CommandRow
              command={command}
              key={command.id}
              selected={index === selectedIndex}
              onHover={() => onHover(index)}
              onSelect={() => onSelect(command)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

function indexedCommandGroups(groups: ReturnType<typeof mobileCommandPaletteResults>['groups']) {
  let nextIndex = 0
  return groups.map((group) => ({
    group: group.group,
    items: group.items.map((command) => {
      const index = nextIndex
      nextIndex += 1
      return { command, index }
    }),
  }))
}

function CommandRow({
  command,
  selected,
  onHover,
  onSelect,
}: {
  command: MobileCommandPaletteCommand
  selected: boolean
  onHover: () => void
  onSelect: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, selected ? styles.rowSelected : null, pressed ? styles.rowPressed : null]}
      testID={`mobile-command-palette-command-${command.id}`}
      onPress={onSelect}
      onPressIn={onHover}
    >
      <Text numberOfLines={1} style={styles.rowLabel}>{command.label}</Text>
      {command.shortcut ? <Shortcut>{command.shortcut}</Shortcut> : null}
    </Pressable>
  )
}

function Shortcut({ children }: { children: ReactNode }) {
  return <Text numberOfLines={1} style={styles.shortcut}>{children}</Text>
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(55, 53, 47, 0.14)',
  },
  emptyState: {
    minHeight: 144,
    alignItems: 'center',
    justifyContent: 'center',
    padding: mobileSpace.lg,
  },
  emptyText: {
    color: mobileColors.textMuted,
    fontSize: mobileType.body,
  },
  groupLabel: {
    color: mobileColors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    paddingBottom: mobileSpace.xs,
    paddingHorizontal: mobileSpace.md,
    paddingTop: mobileSpace.sm,
  },
  input: {
    minHeight: 44,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    borderWidth: 0,
    color: mobileColors.text,
    fontSize: mobileType.body,
    paddingHorizontal: mobileSpace.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: desktopPanelParity.toolbarHeight + mobileSpace.xl,
    zIndex: 30,
  },
  palette: {
    maxHeight: 520,
    maxWidth: 540,
    width: '92%',
    backgroundColor: mobileColors.card,
    borderColor: mobileColors.borderStrong,
    borderRadius: mobileRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
  results: {
    paddingBottom: mobileSpace.sm,
    paddingTop: mobileSpace.xs,
  },
  row: {
    minHeight: 34,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderRadius: 6,
    marginHorizontal: mobileSpace.xs,
    paddingHorizontal: mobileSpace.sm,
    paddingVertical: mobileSpace.xs,
  },
  rowLabel: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
  },
  rowPressed: {
    opacity: 0.78,
  },
  rowSelected: {
    backgroundColor: mobileColors.control,
  },
  shortcut: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
  },
})
