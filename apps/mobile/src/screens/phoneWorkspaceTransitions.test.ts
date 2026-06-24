import { describe, expect, it } from 'vitest'
import {
  phoneWorkspaceDragCommitOffset,
  phoneWorkspaceDragOffset,
  phoneWorkspaceSidebarDrawerWidth,
  phoneWorkspaceSwipeDestination,
  phoneWorkspaceTransitionDirection,
  type PhoneWorkspaceState,
} from './phoneWorkspaceTransitions'

describe('phoneWorkspaceTransitionDirection', () => {
  it.each([
    ['list', 'sidebar', 'fromLeft'],
    ['sidebar', 'list', 'fromRight'],
    ['list', 'editor', 'fromRight'],
    ['editor', 'list', 'fromLeft'],
    ['editor', 'properties', 'fromRight'],
    ['properties', 'editor', 'fromLeft'],
  ] satisfies Array<[PhoneWorkspaceState, PhoneWorkspaceState, ReturnType<typeof phoneWorkspaceTransitionDirection>]>)(
    'moves from %s to %s as %s',
    (previousState, nextState, direction) => {
      expect(phoneWorkspaceTransitionDirection(previousState, nextState)).toBe(direction)
    },
  )

  it('does not slide when the phone state is unchanged', () => {
    expect(phoneWorkspaceTransitionDirection('list', 'list')).toBe('fade')
  })
})

describe('phoneWorkspaceSwipeDestination', () => {
  it.each([
    ['sidebar', 'left', 'list'],
    ['list', 'right', 'sidebar'],
    ['editor', 'right', 'list'],
    ['editor', 'left', 'properties'],
    ['properties', 'right', 'editor'],
  ] satisfies Array<[PhoneWorkspaceState, 'left' | 'right', PhoneWorkspaceState]>)(
    'moves from %s on a %s swipe to %s',
    (state, direction, destination) => {
      expect(phoneWorkspaceSwipeDestination(state, direction)).toBe(destination)
    },
  )

  it.each([
    ['list', 'left'],
    ['sidebar', 'right'],
    ['properties', 'left'],
  ] satisfies Array<[PhoneWorkspaceState, 'left' | 'right']>)(
    'has no destination from %s on a %s swipe',
    (state, direction) => {
      expect(phoneWorkspaceSwipeDestination(state, direction)).toBeNull()
    },
  )
})

describe('phoneWorkspaceDragOffset', () => {
  it('clamps editor/properties drags to the screen width', () => {
    expect(phoneWorkspaceDragOffset('editor', -400, 320)).toBe(-320)
    expect(phoneWorkspaceDragOffset('editor', 180, 320)).toBe(180)
  })

  it('clamps sidebar/list rail drags to the drawer width', () => {
    expect(phoneWorkspaceDragOffset('list', 400, 320)).toBe(250)
    expect(phoneWorkspaceDragOffset('sidebar', -400, 320)).toBe(-250)
  })

  it('ignores drags without a neighboring phone state', () => {
    expect(phoneWorkspaceDragOffset('list', -120, 320)).toBe(0)
    expect(phoneWorkspaceDragOffset('sidebar', 120, 320)).toBe(0)
    expect(phoneWorkspaceDragOffset('properties', -120, 320)).toBe(0)
  })
})

describe('phoneWorkspaceDragCommitOffset', () => {
  it('settles sidebar/list rail transitions at the drawer edge', () => {
    expect(phoneWorkspaceDragCommitOffset('list', 'sidebar', 320)).toBe(250)
    expect(phoneWorkspaceDragCommitOffset('sidebar', 'list', 320)).toBe(-250)
  })

  it('settles editor/list/properties transitions at the screen edge', () => {
    expect(phoneWorkspaceDragCommitOffset('editor', 'list', 320)).toBe(320)
    expect(phoneWorkspaceDragCommitOffset('editor', 'properties', 320)).toBe(-320)
    expect(phoneWorkspaceDragCommitOffset('properties', 'editor', 320)).toBe(320)
  })

  it('does not move for unchanged state', () => {
    expect(phoneWorkspaceDragCommitOffset('list', 'list', 320)).toBe(0)
  })
})

describe('phoneWorkspaceSidebarDrawerWidth', () => {
  it('uses the compact drawer ratio until it reaches the max drawer width', () => {
    expect(phoneWorkspaceSidebarDrawerWidth(320)).toBe(250)
    expect(phoneWorkspaceSidebarDrawerWidth(500)).toBe(320)
  })
})
