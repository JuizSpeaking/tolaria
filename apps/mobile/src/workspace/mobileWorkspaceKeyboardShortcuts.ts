import { useEffect } from 'react'

type KeyboardShortcutHandlers = {
  onCreateNote?: () => void
  onOpenCommandPalette: () => void
  onOpenSearch: () => void
}

type KeyboardDocument = {
  addEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
  removeEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
}

export function useMobileWorkspaceKeyboardShortcuts({
  onCreateNote,
  onOpenCommandPalette,
  onOpenSearch,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    const document = keyboardDocument()
    if (!document) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      const action = mobileWorkspaceKeyboardAction(event)
      if (!action) return

      event.preventDefault()
      if (action === 'commandPalette') onOpenCommandPalette()
      else if (action === 'search') onOpenSearch()
      else onCreateNote?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCreateNote, onOpenCommandPalette, onOpenSearch])
}

function keyboardDocument(): KeyboardDocument | null {
  const maybeDocument = (globalThis as { document?: KeyboardDocument }).document
  return maybeDocument ?? null
}

export function mobileWorkspaceKeyboardAction(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
): 'commandPalette' | 'createNote' | 'search' | null {
  if ((!event.metaKey && !event.ctrlKey) || event.altKey || event.shiftKey) return null

  const key = event.key.toLowerCase()
  if (key === 'k') return 'commandPalette'
  if (key === 'o' || key === 'p') return 'search'
  if (key === 'n') return 'createNote'
  return null
}
