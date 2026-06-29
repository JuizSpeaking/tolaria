import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { invoke } from '@tauri-apps/api/core'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { isTauri } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { NoteCardView } from '../components/note-list/NoteCardView'
import { pullRepo, pushRepo, getSyncStatus, isVaultCloned } from './sync'
import './styles/mobile.css'

// ─── Vault Provider ───────────────────────────────────────────────────────

interface VaultContextValue {
  entries: VaultEntry[]
  loading: boolean
  error: string | null
  vaultPath: string | null
  refresh: () => Promise<void>
  getNoteContent: (path: string) => Promise<string>
  types: VaultEntry[]
}

const VaultContext = createContext<VaultContextValue | null>(null)

function useVaultProvider(): VaultContextValue {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vaultPath, setVaultPath] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isTauri()) { setLoading(false); return }
    try {
      const path = await invoke<string>('get_vault_path')
      setVaultPath(path)
      const scanned = await invoke<VaultEntry[]>('scan_vault', { path })
      setEntries(scanned)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const getNoteContent = useCallback(async (path: string) => {
    return invoke<string>('read_file', { path })
  }, [])

  const types = entries.filter((e) => e.isA === 'Type')
  return { entries, loading, error, vaultPath, refresh, getNoteContent, types }
}

function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}

// ─── Sync Provider ────────────────────────────────────────────────────────

interface SyncContextValue {
  status: 'idle' | 'syncing' | 'ahead' | 'behind' | 'conflict' | 'offline' | 'unconfigured'
  lastSyncAt: Date | null
  syncAll: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

function useSyncProvider(): SyncContextValue {
  const [status, setStatus] = useState<SyncContextValue['status']>('unconfigured')
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)

  const syncAll = useCallback(async () => {
    setStatus('syncing')
    try {
      const token = localStorage.getItem('tolaria_git_token')
      await pullRepo(token)
      await pushRepo(token, 'mobile: auto-sync')
      setLastSyncAt(new Date())
      setStatus('idle')
    } catch {
      setStatus('conflict')
    }
  }, [])

  // Check status on mount
  useEffect(() => {
    isVaultCloned().then((cloned) => {
      if (!cloned) {
        setStatus('unconfigured')
        return
      }
      const token = localStorage.getItem('tolaria_git_token')
      getSyncStatus(token).then((s) => {
        if (s.behind > 0) setStatus('behind')
        else if (s.ahead > 0) setStatus('ahead')
        else setStatus('idle')
      })
    })
  }, [])

  return { status, lastSyncAt, syncAll }
}

function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}

// ─── Navigation ──────────────────────────────────────────────────────────

type Screen =
  | { name: 'typeList' }
  | { name: 'noteList'; typePath: string; useCardView: boolean }
  | { name: 'noteDetail'; notePath: string }
  | { name: 'capture' }
  | { name: 'search' }
  | { name: 'settings' }

interface NavContextValue {
  stack: Screen[]
  current: Screen
  push: (screen: Screen) => void
  pop: () => void
  resetTo: (screen: Screen) => void
}

const NavContext = createContext<NavContextValue | null>(null)

function useNavProvider(): NavContextValue {
  const [stack, setStack] = useState<Screen[]>([{ name: 'typeList' }])
  const push = useCallback((screen: Screen) => setStack((s) => [...s, screen]), [])
  const pop = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])
  const resetTo = useCallback((screen: Screen) => setStack([screen]), [])
  return { stack, current: stack[stack.length - 1], push, pop, resetTo }
}

function useNav(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavigationStack')
  return ctx
}

// ─── Screens ─────────────────────────────────────────────────────────────

function TypeListScreen() {
  const { types, loading, error, entries } = useVault()
  const { push } = useNav()
  if (loading) return <div className="mobile-loading">Loading vault...</div>
  if (error) return <div className="mobile-error">Error: {error}</div>
  const typeCounts = entries.reduce<Record<string, number>>((acc, e) => {
    const t = e.isA ?? 'Note'
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})
  return (
    <div className="mobile-screen">
      <h1 className="mobile-header">All Types</h1>
      <div className="mobile-list">
        {types.map((type) => (
          <button key={type.path} className="mobile-list-item"
            onClick={() => push({ name: 'noteList', typePath: type.path, useCardView: type.view === 'card' })}>
            <span className="mobile-list-item-label">{type.sidebarLabel ?? type.title}</span>
            <span className="mobile-list-item-count">{typeCounts[type.title] ?? 0}</span>
          </button>
        ))}
        {types.length === 0 && <p className="mobile-empty">No types found. Clone a vault in Settings.</p>}
      </div>
    </div>
  )
}

function NoteListScreen({ typePath, useCardView }: { typePath: string; useCardView: boolean }) {
  const { entries, vaultPath } = useVault()
  const { push, pop } = useNav()
  const typeDoc = entries.find((e) => e.path === typePath)
  const typeName = typeDoc?.title ?? 'Notes'
  const typeEntries = entries.filter((e) => e.isA === typeName && e.isA !== 'Type')
  if (useCardView) {
    return (
      <div className="mobile-screen">
        <div className="mobile-nav-bar">
          <button className="mobile-back" onClick={pop}>‹</button>
          <h1 className="mobile-header">{typeName}</h1>
        </div>
        <NoteCardView entries={typeEntries} vaultPath={vaultPath ?? undefined} selectedNotePath={null}
          onSelectNote={(entry: VaultEntry) => push({ name: 'noteDetail', notePath: entry.path })} />
      </div>
    )
  }
  return (
    <div className="mobile-screen">
      <div className="mobile-nav-bar">
        <button className="mobile-back" onClick={pop}>‹</button>
        <h1 className="mobile-header">{typeName}</h1>
      </div>
      <div className="mobile-list">
        {typeEntries.map((entry) => (
          <button key={entry.path} className="mobile-list-item"
            onClick={() => push({ name: 'noteDetail', notePath: entry.path })}>
            <span className="mobile-list-item-label">{entry.title}</span>
          </button>
        ))}
        {typeEntries.length === 0 && <p className="mobile-empty">No notes in this type.</p>}
      </div>
    </div>
  )
}

function NoteDetailScreen({ notePath }: { notePath: string }) {
  const { getNoteContent } = useVault()
  const { pop } = useNav()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getNoteContent(notePath).then((c) => { setContent(c); setLoading(false) }).catch(() => setLoading(false))
  }, [notePath, getNoteContent])
  return (
    <div className="mobile-screen">
      <div className="mobile-nav-bar">
        <button className="mobile-back" onClick={pop}>‹</button>
      </div>
      {loading ? <div className="mobile-loading">Loading...</div> : (
        <div className="mobile-note-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

function CaptureScreen() {
  const { vaultPath, refresh } = useVault()
  const { resetTo } = useNav()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!isTauri() || !vaultPath) return
    setSaving(true)
    try {
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `untitled-${Date.now()}`
      const path = `${vaultPath}/${slug}.md`
      const noteContent = `---\ntype: Note\n---\n\n# ${title || 'Untitled'}\n\n${body}\n`
      await invoke('write_file', { path, content: noteContent })
      await invoke('sync_push')
      await refresh()
      resetTo({ name: 'typeList' })
    } catch (e) { console.error('Save failed:', e) } finally { setSaving(false) }
  }
  return (
    <div className="mobile-screen">
      <h1 className="mobile-header">New Note</h1>
      <input className="mobile-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="mobile-textarea" placeholder="Write in markdown..." value={body}
        onChange={(e) => setBody(e.target.value)} rows={12} />
      <button className="mobile-save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}

function SearchScreen() {
  const { entries } = useVault()
  const { push } = useNav()
  const [query, setQuery] = useState('')
  const results = query.trim()
    ? entries.filter((e) => e.title.toLowerCase().includes(query.toLowerCase()) ||
        (e.snippet ?? '').toLowerCase().includes(query.toLowerCase()))
    : []
  return (
    <div className="mobile-screen">
      <h1 className="mobile-header">Search</h1>
      <input className="mobile-input" placeholder="Search notes..." value={query}
        onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="mobile-list">
        {results.map((entry) => (
          <button key={entry.path} className="mobile-list-item"
            onClick={() => push({ name: 'noteDetail', notePath: entry.path })}>
            <div>
              <div className="mobile-list-item-label">{entry.title}</div>
              {entry.snippet && <div className="mobile-list-item-snippet">{entry.snippet.slice(0, 80)}</div>}
            </div>
          </button>
        ))}
        {query && results.length === 0 && <p className="mobile-empty">No results found.</p>}
      </div>
    </div>
  )
}

function SettingsScreen() {
  const { vaultPath, entries } = useVault()
  const { resetTo } = useNav()
  return (
    <div className="mobile-screen">
      <div className="mobile-nav-bar">
        <button className="mobile-back" onClick={() => resetTo({ name: 'typeList' })}>‹</button>
        <h1 className="mobile-header">Settings</h1>
      </div>
      <div className="mobile-settings">
        <div className="mobile-setting-row">
          <span className="mobile-setting-label">Vault Path</span>
          <span className="mobile-setting-value">{vaultPath ?? 'Not configured'}</span>
        </div>
        <div className="mobile-setting-row">
          <span className="mobile-setting-label">Total Notes</span>
          <span className="mobile-setting-value">{entries.length}</span>
        </div>
        <div className="mobile-setting-row">
          <span className="mobile-setting-label">Git Remote</span>
          <span className="mobile-setting-value">Configure in v1.1</span>
        </div>
      </div>
    </div>
  )
}

// ─── Sync Bar + Tab Bar ──────────────────────────────────────────────────

function formatTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function SyncBar() {
  const { status, lastSyncAt, syncAll } = useSync()
  const { push } = useNav()
  const statusText = {
    idle: lastSyncAt ? `Synced ${formatTime(lastSyncAt)}` : 'Ready',
    syncing: 'Syncing...', ahead: 'Unpushed changes', behind: 'Pull needed',
    conflict: 'Sync conflict', offline: 'Offline', unconfigured: 'Not configured',
  }[status]
  return (
    <div className="mobile-sync-bar">
      <button className="mobile-sync-settings" onClick={() => push({ name: 'settings' })}>≡</button>
      <span className="mobile-sync-status">{statusText}</span>
      <button className="mobile-sync-btn" onClick={syncAll}>⟳</button>
    </div>
  )
}

function TabBar() {
  const { current, resetTo } = useNav()
  const activeTab = current.name === 'noteList' || current.name === 'noteDetail' || current.name === 'typeList'
    ? 'browse' : current.name === 'capture' ? 'capture' : current.name === 'search' ? 'search' : 'browse'
  return (
    <div className="mobile-tab-bar">
      <button className={`mobile-tab ${activeTab === 'browse' ? 'active' : ''}`}
        onClick={() => resetTo({ name: 'typeList' })}>📋 Browse</button>
      <button className={`mobile-tab ${activeTab === 'capture' ? 'active' : ''}`}
        onClick={() => resetTo({ name: 'capture' })}>✏️ Capture</button>
      <button className={`mobile-tab ${activeTab === 'search' ? 'active' : ''}`}
        onClick={() => resetTo({ name: 'search' })}>🔍 Search</button>
    </div>
  )
}

// ─── Screen Router ───────────────────────────────────────────────────────

function ScreenRouter() {
  const { current } = useNav()
  switch (current.name) {
    case 'typeList': return <TypeListScreen />
    case 'noteList': return <NoteListScreen typePath={current.typePath} useCardView={current.useCardView} />
    case 'noteDetail': return <NoteDetailScreen notePath={current.notePath} />
    case 'capture': return <CaptureScreen />
    case 'search': return <SearchScreen />
    case 'settings': return <SettingsScreen />
    default: return <TypeListScreen />
  }
}

// ─── Mobile App Root ─────────────────────────────────────────────────────

export function MobileApp() {
  const vault = useVaultProvider()
  const sync = useSyncProvider()
  const nav = useNavProvider()
  return (
    <VaultContext.Provider value={vault}>
      <SyncContext.Provider value={sync}>
        <NavContext.Provider value={nav}>
          <div className="mobile-app">
            <div className="mobile-content"><ScreenRouter /></div>
            <SyncBar />
            <TabBar />
          </div>
        </NavContext.Provider>
      </SyncContext.Provider>
    </VaultContext.Provider>
  )
}