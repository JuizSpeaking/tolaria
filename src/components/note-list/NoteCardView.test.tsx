import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NoteCardView } from './NoteCardView'
import { makeEntry } from '../../test-utils/noteListTestUtils'

describe('NoteCardView', () => {
  it('renders empty message when no entries', () => {
    render(<NoteCardView entries={[]} selectedNotePath={null} onSelectNote={() => {}} />)
    expect(screen.getByText(/no notes/i)).toBeInTheDocument()
  })

  it('renders a card for each entry', () => {
    const entries = [
      makeEntry({ title: 'Pancakes', path: '/vault/pancakes.md' }),
      makeEntry({ title: 'Waffles', path: '/vault/waffles.md' }),
    ]
    const { container } = render(<NoteCardView entries={entries} selectedNotePath={null} onSelectNote={() => {}} />)
    expect(screen.getByText('Pancakes')).toBeInTheDocument()
    expect(screen.getByText('Waffles')).toBeInTheDocument()
    expect(container.querySelectorAll('button')).toHaveLength(2)
  })

  it('calls onSelectNote when card is clicked', () => {
    const entry = makeEntry({ title: 'Test Recipe', path: '/vault/test.md' })
    const onSelect = vi.fn()
    const { container } = render(<NoteCardView entries={[entry]} selectedNotePath={null} onSelectNote={onSelect} />)
    const button = container.querySelector('button')
    fireEvent.click(button!)
    expect(onSelect).toHaveBeenCalledWith(entry)
  })

  it('highlights selected note with blue border', () => {
    const entry = makeEntry({ title: 'Selected', path: '/vault/selected.md' })
    const { container } = render(<NoteCardView entries={[entry]} selectedNotePath="/vault/selected.md" onSelectNote={() => {}} />)
    const button = container.querySelector('button')!
    expect(button.style.borderLeft).toContain('var(--accent-blue)')
  })

  it('renders placeholder color for entries without images', () => {
    const entry = makeEntry({ title: 'No Image Note', path: '/vault/noimg.md' })
    const { container } = render(<NoteCardView entries={[entry]} selectedNotePath={null} onSelectNote={() => {}} />)
    const button = container.querySelector('button')!
    // Should have a background color set (not the default muted)
    expect(button.style.backgroundColor).toBeTruthy()
    expect(button.style.backgroundColor).not.toBe('var(--muted)')
  })
})