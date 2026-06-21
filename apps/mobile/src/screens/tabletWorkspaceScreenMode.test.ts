import { describe, expect, it } from 'vitest'
import { desktopPanelParity } from '../ui/desktopParity'
import { tabletReadableEditorMinWidth, tabletScreenModeForWindow } from './tabletWorkspaceScreenMode'

const allPanelsMinWidth = desktopPanelParity.sidebarWidth
  + desktopPanelParity.noteListWidth
  + desktopPanelParity.inspectorWidth
  + tabletReadableEditorMinWidth

describe('tabletScreenModeForWindow', () => {
  it('keeps the properties panel closed by default when iPad portrait would collapse the editor', () => {
    expect(tabletScreenModeForWindow({
      height: allPanelsMinWidth,
      nativeIpad: true,
      screenHeight: allPanelsMinWidth,
      screenWidth: allPanelsMinWidth - 1,
      width: allPanelsMinWidth - 1,
    })).toEqual({
      compactTablet: false,
      defaultPropertiesVisible: false,
    })
  })

  it('opens the properties panel by default when the current iPad window fits all desktop panels', () => {
    expect(tabletScreenModeForWindow({
      height: allPanelsMinWidth - 1,
      nativeIpad: true,
      screenHeight: allPanelsMinWidth - 1,
      screenWidth: allPanelsMinWidth,
      width: allPanelsMinWidth,
    })).toEqual({
      compactTablet: false,
      defaultPropertiesVisible: true,
    })
  })

  it('can force desktop panels for full native layout QA routes', () => {
    expect(tabletScreenModeForWindow({
      forceDesktopPanels: true,
      height: allPanelsMinWidth,
      nativeIpad: true,
      screenHeight: allPanelsMinWidth,
      screenWidth: allPanelsMinWidth - 1,
      width: allPanelsMinWidth - 1,
    })).toEqual({
      compactTablet: false,
      defaultPropertiesVisible: true,
    })
  })

  it('keeps existing non-iPad compact tablet behavior', () => {
    expect(tabletScreenModeForWindow({
      height: 1200,
      nativeIpad: false,
      screenHeight: 1200,
      screenWidth: 900,
      width: 900,
    })).toEqual({
      compactTablet: true,
      defaultPropertiesVisible: true,
    })
  })
})
