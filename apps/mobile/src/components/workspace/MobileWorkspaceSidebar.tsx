import type { ReactNode } from 'react'
import {
  Archive,
  CaretDown,
  FileText,
  FolderOpen,
  Eye,
  Funnel,
  Plus,
  SidebarSimple,
  StackSimple,
  Star,
  Tag,
  Tray,
} from 'phosphor-react-native'
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui/text'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { MobileLayoutProbeReadout } from '../../qa/MobileLayoutProbeReadout'
import { probeProps, useMobileLayoutProbe, type MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileIconButton } from '../../ui/MobileIconButton'
import { MobilePanel, MobileToolbar } from '../../ui/MobilePanel'
import { desktopPanelParity, desktopSidebarParity, desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type {
  MobileNote,
  MobileSidebarIcon,
  MobileSidebarItem,
  MobileSidebarSection,
} from '../../workspace/mobileWorkspaceModel'
import { MobileSidebarCountPill } from './MobileSidebarCountPill'
import { FolderTree, type MobileSidebarFolderSelection } from './MobileWorkspaceSidebarFolderTree'
import { noteTypeColor, noteTypeSoftColor } from './mobileWorkspaceTone'

export type { MobileSidebarFolderSelection } from './MobileWorkspaceSidebarFolderTree'

export type MobileSidebarItemSelection = {
  count?: string
  id: string
  label: string
  sectionId: string
  typeName?: string
  viewId?: string
}

type SidebarDisplayLabel = string
type SidebarItemId = string
type SidebarMetricId = string
type SidebarSectionId = string
type SidebarSlug = string

type MobileWorkspaceSidebarProps = {
  activeFolderId?: string | null
  activeItemId?: string | null
  layoutProbe?: boolean
  onCollapse?: () => void
  onCreateFolder?: () => void
  onCreateType?: () => void
  onCreateView?: () => void
  onOpenFolderActions?: (selection: MobileSidebarFolderSelection) => void
  onOpenPrimaryActions?: (selection: MobileSidebarItemSelection) => void
  onOpenTypeVisibility?: () => void
  onOpenTypeActions?: (selection: MobileSidebarItemSelection) => void
  onOpenViewActions?: (selection: MobileSidebarItemSelection) => void
  onSelectFolder?: (selection: MobileSidebarFolderSelection) => void
  onSelectItem?: (selection: MobileSidebarItemSelection) => void
  sections: MobileSidebarSection[]
  title?: string
}

type SidebarItemProps = {
  active?: boolean
  activeBackgroundColor?: string
  activeColor?: string
  count?: string
  icon: ReactNode
  label: SidebarDisplayLabel
  layoutProbe?: MobileLayoutProbe
  metricId: SidebarMetricId
  onLongPress?: () => void
  onPress?: () => void
  slug: SidebarSlug
}

export function MobileWorkspaceSidebar(props: MobileWorkspaceSidebarProps) {
  const {
    activeFolderId,
    activeItemId,
    layoutProbe: layoutProbeEnabled = false,
    onCollapse,
    onCreateFolder,
    onCreateType,
    onCreateView,
    onOpenFolderActions,
    onOpenPrimaryActions,
    onOpenTypeVisibility,
    onOpenTypeActions,
    onOpenViewActions,
    onSelectFolder,
    onSelectItem,
    sections,
    title = 'Tolaria Vault',
  } = props
  const layoutProbe = useMobileLayoutProbe(layoutProbeEnabled)

  return (
    <MobilePanel {...layoutProbe.probe('sidebar.panel')} style={styles.panel} testID="workspace-sidebar-panel">
      <MobileToolbar testID="sidebar-toolbar">
        <MobileIconButton accessibilityLabel={mobileText('sidebar.action.collapse')} testID="sidebar-collapse-action" onPress={onCollapse}>
          <SidebarSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        </MobileIconButton>
        <Text numberOfLines={1} style={styles.vaultTitle} testID="sidebar-toolbar-title">{title}</Text>
      </MobileToolbar>
      <ScrollView {...layoutProbe.probe('sidebar.scroll')} contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <SidebarSection
            activeFolderId={activeFolderId}
            activeItemId={activeItemId}
            key={section.id}
            layoutProbe={layoutProbe.probe}
            section={section}
            onCreateFolder={onCreateFolder}
            onCreateType={onCreateType}
            onCreateView={onCreateView}
            onOpenFolderActions={onOpenFolderActions}
            onOpenPrimaryActions={onOpenPrimaryActions}
            onOpenTypeVisibility={onOpenTypeVisibility}
            onOpenTypeActions={onOpenTypeActions}
            onOpenViewActions={onOpenViewActions}
            onSelectFolder={onSelectFolder}
            onSelectItem={onSelectItem}
          />
        ))}
      </ScrollView>
      {layoutProbeEnabled ? <MobileLayoutProbeReadout metrics={layoutProbe.metrics} testID="sidebar-layout-metrics" /> : null}
    </MobilePanel>
  )
}

function SidebarSection({
  activeFolderId,
  activeItemId,
  layoutProbe,
  onCreateView,
  onCreateFolder,
  onCreateType,
  onOpenFolderActions,
  onOpenPrimaryActions,
  onOpenTypeVisibility,
  onOpenTypeActions,
  onOpenViewActions,
  onSelectFolder,
  onSelectItem,
  section,
}: {
  activeFolderId?: string | null
  activeItemId?: string | null
  layoutProbe: MobileLayoutProbe
  onCreateFolder?: () => void
  onCreateType?: () => void
  onCreateView?: () => void
  onOpenFolderActions?: (selection: MobileSidebarFolderSelection) => void
  onOpenPrimaryActions?: (selection: MobileSidebarItemSelection) => void
  onOpenTypeVisibility?: () => void
  onOpenTypeActions?: (selection: MobileSidebarItemSelection) => void
  onOpenViewActions?: (selection: MobileSidebarItemSelection) => void
  onSelectFolder?: (selection: MobileSidebarFolderSelection) => void
  onSelectItem?: (selection: MobileSidebarItemSelection) => void
  section: MobileSidebarSection
}) {
  return (
    <View
      {...probeProps(layoutProbe, `sidebar.section.${section.id}.container`)}
      style={[styles.section, section.id === 'primary' ? styles.primarySection : styles.groupSection]}
      testID={`sidebar-section-${section.id}`}
    >
      <SidebarSectionTitle
        layoutProbe={layoutProbe}
        section={section}
        onCreateFolder={onCreateFolder}
        onCreateType={onCreateType}
        onCreateView={onCreateView}
        onOpenTypeVisibility={onOpenTypeVisibility}
      />
      <SidebarSectionItems
        activeItemId={activeItemId}
        layoutProbe={layoutProbe}
        section={section}
        onOpenTypeActions={onOpenTypeActions}
        onOpenViewActions={onOpenViewActions}
        onOpenPrimaryActions={onOpenPrimaryActions}
        onSelectItem={onSelectItem}
      />
      {section.folders ? (
        <FolderTree
          activeFolderId={activeFolderId}
          folders={section.folders}
          layoutProbe={layoutProbe}
          onOpenFolderActions={onOpenFolderActions}
          onSelectFolder={onSelectFolder}
        />
      ) : null}
    </View>
  )
}

function SidebarSectionTitle({
  layoutProbe,
  onCreateFolder,
  onCreateType,
  onCreateView,
  onOpenTypeVisibility,
  section,
}: {
  layoutProbe: MobileLayoutProbe
  onCreateFolder?: () => void
  onCreateType?: () => void
  onCreateView?: () => void
  onOpenTypeVisibility?: () => void
  section: MobileSidebarSection
}) {
  if (!section.label) return null

  return (
    <SectionTitle
      count={section.count}
      label={sidebarSectionLabel(section.id, section.label)}
      layoutProbe={layoutProbe}
      sectionId={section.id}
      createAccessibilityLabel={sectionCreateAccessibilityLabel(section.id)}
      onCreate={sectionCreateHandler(section.id, onCreateFolder, onCreateType, onCreateView)}
      visibilityAccessibilityLabel={sectionVisibilityAccessibilityLabel(section.id)}
      onVisibility={sectionVisibilityHandler(section.id, onOpenTypeVisibility)}
    />
  )
}

function sectionVisibilityAccessibilityLabel(sectionId: SidebarSectionId) {
  if (sectionId === 'types') return mobileText('sidebar.section.showInSidebar')
  return undefined
}

function sectionVisibilityHandler(
  sectionId: SidebarSectionId,
  onOpenTypeVisibility?: () => void,
) {
  if (sectionId === 'types') return onOpenTypeVisibility
  return undefined
}

function sectionCreateAccessibilityLabel(sectionId: SidebarSectionId) {
  if (sectionId === 'folders') return mobileText('sidebar.action.createFolder')
  if (sectionId === 'types') return mobileText('sidebar.action.createType')
  if (sectionId === 'views') return mobileText('sidebar.action.createView')
  return undefined
}

function sectionCreateHandler(
  sectionId: SidebarSectionId,
  onCreateFolder?: () => void,
  onCreateType?: () => void,
  onCreateView?: () => void,
) {
  if (sectionId === 'folders') return onCreateFolder
  if (sectionId === 'types') return onCreateType
  if (sectionId === 'views') return onCreateView
  return undefined
}

function SidebarSectionItems({
  activeItemId,
  layoutProbe,
  onSelectItem,
  onOpenTypeActions,
  onOpenViewActions,
  onOpenPrimaryActions,
  section,
}: {
  activeItemId?: string | null
  layoutProbe: MobileLayoutProbe
  onSelectItem?: (selection: MobileSidebarItemSelection) => void
  onOpenTypeActions?: (selection: MobileSidebarItemSelection) => void
  onOpenViewActions?: (selection: MobileSidebarItemSelection) => void
  onOpenPrimaryActions?: (selection: MobileSidebarItemSelection) => void
  section: MobileSidebarSection
}) {
  return section.items?.map((item) => {
    const active = activeItemId ? item.id === activeItemId : item.active
    const label = sidebarLabel(item.id, item.label)
    const selection = sidebarItemSelection(item, label, section.id)

    return (
      <SidebarItem
        active={active}
        activeBackgroundColor={sidebarActiveBackgroundColor(item.tone)}
        activeColor={sidebarActiveColor(item.tone)}
        count={item.count}
        icon={sidebarIcon(item.icon, active ? item.tone ?? 'primary' : item.tone)}
        key={item.id}
        label={label}
        layoutProbe={layoutProbe}
        metricId={`sidebar.item.${item.id}`}
        slug={item.id}
        onLongPress={sidebarItemLongPress({
          onOpenPrimaryActions,
          onOpenTypeActions,
          onOpenViewActions,
          sectionId: section.id,
          selection,
        })}
        onPress={() => onSelectItem?.(selection)}
      />
    )
  }) ?? null
}

function sidebarItemLongPress({
  onOpenPrimaryActions,
  onOpenTypeActions,
  onOpenViewActions,
  sectionId,
  selection,
}: {
  onOpenPrimaryActions?: (selection: MobileSidebarItemSelection) => void
  onOpenTypeActions?: (selection: MobileSidebarItemSelection) => void
  onOpenViewActions?: (selection: MobileSidebarItemSelection) => void
  sectionId: SidebarSectionId
  selection: MobileSidebarItemSelection
}) {
  if (sectionId === 'primary' && primaryItemCanCustomizeColumns(selection.id)) return () => onOpenPrimaryActions?.(selection)
  if (sectionId === 'types') return () => onOpenTypeActions?.(selection)
  if (sectionId === 'views') return () => onOpenViewActions?.(selection)
  return undefined
}

function primaryItemCanCustomizeColumns(itemId: SidebarItemId) {
  return itemId === 'all-notes' || itemId === 'inbox'
}

function sidebarItemSelection(
  item: MobileSidebarItem,
  label: SidebarDisplayLabel,
  sectionId: SidebarSectionId,
): MobileSidebarItemSelection {
  return {
    count: item.count,
    id: item.id,
    label,
    sectionId,
    typeName: item.typeName,
    viewId: item.viewId,
  }
}

function SidebarItem(props: SidebarItemProps) {
  const {
    active = false,
    activeBackgroundColor = mobileColors.primarySoft,
    activeColor = mobileColors.primary,
    count,
    icon,
    label,
    layoutProbe,
    metricId,
    onLongPress,
    onPress,
    slug,
  } = props

  return (
    <Pressable
      {...probeProps(layoutProbe, `${metricId}.row`)}
      accessibilityLabel={label}
      accessibilityRole="button"
      delayLongPress={300}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[
        styles.item,
        sidebarItemPadding(Boolean(count)),
        active ? { backgroundColor: activeBackgroundColor } : null,
      ]}
      testID={`sidebar-item-${slug}`}
    >
      <View {...probeProps(layoutProbe, `${metricId}.content`)} style={styles.itemContent}>
        {icon}
        <Text
          {...probeProps(layoutProbe, `${metricId}.label`)}
          numberOfLines={1}
          style={[styles.itemText, nativeItemTextStyle, active ? { color: activeColor } : null]}
          testID={`sidebar-item-${slug}-label`}
        >
          {label}
        </Text>
        {count ? (
          <MobileSidebarCountPill
            activeColor={active ? activeColor : undefined}
            layoutProbe={layoutProbe}
            metricId={`${metricId}.count`}
            testID={`sidebar-item-${slug}-count`}
            value={count}
          />
        ) : null}
      </View>
    </Pressable>
  )
}

function SectionTitle({
  count,
  createAccessibilityLabel,
  label,
  layoutProbe,
  onCreate,
  onVisibility,
  sectionId,
  visibilityAccessibilityLabel,
}: {
  count?: string
  createAccessibilityLabel?: string
  label: SidebarDisplayLabel
  layoutProbe?: MobileLayoutProbe
  onCreate?: () => void
  onVisibility?: () => void
  sectionId: SidebarSectionId
  visibilityAccessibilityLabel?: string
}) {
  const metricId = `sidebar.section.${sectionId}`

  return (
    <View
      {...probeProps(layoutProbe, `${metricId}.row`)}
      style={[styles.sectionTitleRow, nativeSectionTitleRowStyle, count ? styles.sectionTitleRowWithCount : styles.sectionTitleRowRegular]}
      testID={`sidebar-section-title-${sectionId}`}
    >
      <CaretDown color={mobileColors.textMuted} size={11} />
      <Text
        {...probeProps(layoutProbe, `${metricId}.label`)}
        style={[styles.sectionTitle, nativeSectionTitleTextStyle]}
        testID={`sidebar-section-title-text-${sectionId}`}
      >
        {label}
      </Text>
      {count ? (
        <MobileSidebarCountPill
          compact
          layoutProbe={layoutProbe}
          metricId={`${metricId}.count`}
          testID={`sidebar-section-count-${sectionId}`}
          value={count}
        />
      ) : null}
      {onVisibility ? (
        <MobileIconButton
          accessibilityLabel={visibilityAccessibilityLabel ?? mobileText('sidebar.section.showInSidebar')}
          testID={`sidebar-section-visibility-${sectionId}`}
          onPress={onVisibility}
        >
          <Eye color={mobileColors.textMuted} size={12} />
        </MobileIconButton>
      ) : null}
      {onCreate ? (
        <MobileIconButton
          accessibilityLabel={createAccessibilityLabel ?? mobileText('sidebar.action.createView')}
          testID={`sidebar-section-create-${sectionId}`}
          onPress={onCreate}
        >
          <Plus color={mobileColors.textMuted} size={12} />
        </MobileIconButton>
      ) : null}
    </View>
  )
}

function sidebarIcon(icon: MobileSidebarIcon, tone?: MobileNote['typeTone'] | 'primary') {
  const color = sidebarIconColor(tone)

  if (icon === 'archive') return <Archive color={color} size={15} />
  if (icon === 'folder') return <FolderOpen color={color} size={15} />
  if (icon === 'inbox') return <Tray color={color} size={15} />
  if (icon === 'procedure') return <StackSimple color={color} size={15} />
  if (icon === 'star') return <Star color={color} size={15} />
  if (icon === 'tag') return <Tag color={color} size={15} />
  if (icon === 'view') return <Funnel color={color} size={15} />

  return <FileText color={color} size={15} />
}

function sidebarIconColor(tone?: MobileNote['typeTone'] | 'primary') {
  if (tone === 'primary') return mobileColors.primary
  if (tone) return noteTypeColor(tone)

  return mobileColors.textMuted
}

function sidebarActiveColor(tone?: MobileNote['typeTone']) {
  return tone ? noteTypeColor(tone) : mobileColors.primary
}

function sidebarActiveBackgroundColor(tone?: MobileNote['typeTone']) {
  return tone ? noteTypeSoftColor(tone) : mobileColors.primarySoft
}

function sidebarLabel(id: SidebarItemId, fallback: SidebarDisplayLabel) {
  if (id === 'all-notes') return mobileCopy.allNotes
  if (id === 'archive') return mobileCopy.archive
  if (id === 'inbox') return mobileCopy.inbox

  return fallback
}

function sidebarSectionLabel(id: SidebarSectionId, fallback: SidebarDisplayLabel) {
  if (id === 'folders') return mobileText('sidebar.group.folders')
  if (id === 'favorites') return mobileCopy.favorites
  if (id === 'types') return mobileCopy.types
  if (id === 'views') return mobileCopy.views

  return fallback
}

const panelStyles = StyleSheet.create({
  content: { padding: 0 },
  groupSection: { paddingHorizontal: desktopSidebarParity.sectionHorizontalPadding },
  panel: {
    alignSelf: 'stretch',
    width: desktopPanelParity.sidebarWidth,
    height: '100%',
    backgroundColor: mobileColors.sidebar,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  primarySection: {
    paddingBottom: desktopSidebarParity.topNavPadding.bottom,
    paddingLeft: desktopSidebarParity.topNavPadding.left,
    paddingRight: desktopSidebarParity.topNavPadding.right,
    paddingTop: desktopSidebarParity.topNavPadding.top,
  },
  section: { borderBottomColor: mobileColors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  vaultTitle: {
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
    fontWeight: '600',
  },
})

const itemStyles = StyleSheet.create({
  item: {
    justifyContent: 'center',
    borderRadius: desktopSidebarParity.itemRadius,
    width: '100%',
  },
  itemContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: desktopSidebarParity.itemGap,
  },
  itemPressed: { backgroundColor: mobileColors.control },
  itemText: {
    flex: 1,
    color: mobileColors.text,
    fontSize: desktopSidebarParity.itemTextSize,
    fontWeight: '500',
  },
})

const sectionTitleStyles = StyleSheet.create({
  sectionTitle: {
    flex: 1,
    color: mobileColors.textMuted,
    fontSize: desktopSidebarParity.countPillTextSize,
    fontWeight: desktopSidebarParity.sectionTitleFontWeight,
    letterSpacing: desktopSidebarParity.sectionTitleLetterSpacing,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.xs,
  },
  sectionTitleRowRegular: {
    paddingBottom: desktopSidebarParity.groupHeaderPadding.regular.bottom,
    paddingLeft: desktopSidebarParity.groupHeaderPadding.regular.left,
    paddingRight: desktopSidebarParity.groupHeaderPadding.regular.right,
    paddingTop: desktopSidebarParity.groupHeaderPadding.regular.top,
  },
  sectionTitleRowWithCount: {
    paddingBottom: desktopSidebarParity.groupHeaderPadding.withCount.bottom,
    paddingLeft: desktopSidebarParity.groupHeaderPadding.withCount.left,
    paddingRight: desktopSidebarParity.groupHeaderPadding.withCount.right,
    paddingTop: desktopSidebarParity.groupHeaderPadding.withCount.top,
  },
})

const styles = {
  ...panelStyles,
  ...itemStyles,
  ...sectionTitleStyles,
} as const

const nativeRowStyles = StyleSheet.create({
  sectionTitleRow: { minHeight: 30 },
})

const nativeTextStyles = StyleSheet.create({
  itemText: { lineHeight: 18 },
  sectionTitle: { lineHeight: 14 },
})

const nativeItemTextStyle = Platform.OS === 'web' ? null : nativeTextStyles.itemText
const nativeSectionTitleRowStyle = Platform.OS === 'web' ? null : nativeRowStyles.sectionTitleRow
const nativeSectionTitleTextStyle = Platform.OS === 'web' ? null : nativeTextStyles.sectionTitle


function sidebarItemPadding(hasCount: boolean) {
  const padding = hasCount ? desktopSidebarParity.itemPadding.withCount : desktopSidebarParity.itemPadding.regular

  return {
    paddingBottom: padding.bottom,
    paddingLeft: padding.left,
    paddingRight: padding.right,
    paddingTop: padding.top,
  }
}
