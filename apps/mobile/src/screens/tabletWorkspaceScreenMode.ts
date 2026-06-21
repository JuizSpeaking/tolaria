import { desktopPanelParity } from '../ui/desktopParity'

export const tabletReadableEditorMinWidth = 520

const tabletAllPanelsMinWidth = desktopPanelParity.sidebarWidth
  + desktopPanelParity.noteListWidth
  + desktopPanelParity.inspectorWidth
  + tabletReadableEditorMinWidth

export function tabletScreenModeForWindow({
  forceDesktopPanels = false,
  height,
  nativeIpad,
  screenHeight,
  screenWidth,
  width,
}: {
  forceDesktopPanels?: boolean
  height: number
  nativeIpad: boolean
  screenHeight: number
  screenWidth: number
  width: number
}) {
  return {
    compactTablet: !forceDesktopPanels && !nativeIpad && width < 1080 && width < height && screenWidth < screenHeight,
    defaultPropertiesVisible: forceDesktopPanels || (nativeIpad ? width >= tabletAllPanelsMinWidth : true),
  }
}
