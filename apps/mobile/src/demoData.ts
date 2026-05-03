import { countWords, deriveDisplayTitleState, extractSnippet } from '@tolaria/markdown'

export interface MobileNote {
  id: string
  type: string
  icon: string
  date: string
  modified: string
  content: string
  title: string
  snippet: string
  words: number
  tags: string[]
}

const noteContent = [
  {
    id: 'workflow',
    type: 'Essay',
    icon: 'pen-nib',
    date: 'May 13, 2026',
    modified: '6h ago',
    filename: 'workflow-orchestration-kestra.md',
    tags: ['Design Inspiration', 'Tolaria MVP'],
    content: [
      '---',
      'title: Workflow Orchestration Essay',
      'type: Essay',
      '---',
      '',
      '# Workflow Orchestration Essay',
      '',
      '- The current narrative / temptation: everything routed through an LLM.',
      '- A real example (Tolaria + OpenClaw): OpenClaw does a lot for me in product development.',
      '- The cost of AI everywhere: expensive, slow, and unpredictable.',
      '- Where orchestration wins: observability, human-in-the-loop approvals, reliability.',
    ].join('\n'),
  },
  {
    id: 'release',
    type: 'Release Note',
    icon: 'flag',
    date: 'May 2, 2026',
    modified: '12h ago',
    filename: 'v2026-05-02.md',
    tags: ['Release', 'Stable'],
    content: [
      '---',
      'title: v2026-05-02',
      'type: Release Note',
      '---',
      '',
      '# v2026-05-02',
      '',
      'Another Tolaria release in the bag. This one is focused on performance, bug fixes, and lower-friction note workflows.',
    ].join('\n'),
  },
  {
    id: 'migration',
    type: 'Project',
    icon: 'git-branch',
    date: 'Apr 28, 2026',
    modified: '1d ago',
    filename: 'tolaria-obsidian-migration.md',
    tags: ['Project', 'Resources'],
    content: [
      '---',
      'title: Tolaria <> Obsidian migration proposal',
      'type: Project',
      '---',
      '',
      '# Tolaria <> Obsidian migration proposal',
      '',
      'Obsidian vaults are already close to Tolaria ideal substrate: local Markdown, portable attachments, and git-backed history.',
    ].join('\n'),
  },
]

export const notes: MobileNote[] = noteContent.map((note) => {
  const titleState = deriveDisplayTitleState({ content: note.content, filename: note.filename })
  return {
    ...note,
    title: titleState.title,
    snippet: extractSnippet(note.content),
    words: countWords(note.content),
  }
})

export const sidebarSections = [
  {
    title: 'Library',
    items: [
      { id: 'inbox', label: 'Inbox', count: 7, icon: 'tray' },
      { id: 'all', label: 'All Notes', count: 8846, icon: 'file-text' },
      { id: 'archive', label: 'Archive', count: 276, icon: 'archive' },
    ],
  },
  {
    title: 'Favorites',
    items: [
      { id: 'journal', label: 'Personal Journal', count: 0, icon: 'sun' },
      { id: 'mvp', label: 'Tolaria MVP', count: 0, icon: 'drop' },
    ],
  },
  {
    title: 'Types',
    items: [
      { id: 'projects', label: 'Projects', count: 6, icon: 'wrench' },
      { id: 'essays', label: 'Essays', count: 448, icon: 'pen-nib' },
      { id: 'resources', label: 'Resources', count: 840, icon: 'books' },
    ],
  },
]
