import { describe, expect, it } from 'vitest'
import {
  frontmatterFlag,
  frontmatterList,
  frontmatterProperties,
  frontmatterRelationships,
  frontmatterScalar,
  parseLocalVaultDocument,
  serializeLocalVaultFrontmatterKey,
  serializeLocalVaultFrontmatterScalar,
} from './localVaultFrontmatter'

describe('local vault frontmatter', () => {
  it('reads desktop-normalized metadata aliases without exposing them as properties', () => {
    const document = parseLocalVaultDocument(`---
is a: Project
STATUS: Active
TAGS:
  - Design
custom: value
related to:
  - "[[Target]]"
---
Body.
`)

    expect(frontmatterScalar(document.frontmatter, ['type', 'Is A', 'is_a'])).toBe('Project')
    expect(frontmatterScalar(document.frontmatter, ['status'])).toBe('Active')
    expect(frontmatterList(document.frontmatter, ['tags'])).toEqual(['Design'])
    expect(frontmatterProperties(document.frontmatter)).toEqual({ custom: 'value' })
  })

  it('prefers exact frontmatter keys before normalized aliases', () => {
    expect(frontmatterScalar({
      'is a': 'Project',
      type: 'Note',
    }, ['type', 'Is A', 'is_a'])).toBe('Note')
  })

  it('keeps quoted commas inside desktop inline array frontmatter values', () => {
    const document = parseLocalVaultDocument(`---
aliases: ["Mobile, UI", "Tablet"]
tags: ['AI, UX', Design]
score: [1, true, "Needs, Review"]
---
Body.
`)

    expect(frontmatterList(document.frontmatter, ['aliases'])).toEqual(['Mobile, UI', 'Tablet'])
    expect(frontmatterList(document.frontmatter, ['tags'])).toEqual(['AI, UX', 'Design'])
    expect(document.frontmatter.score).toEqual([1, true, 'Needs, Review'])
  })

  it('parses desktop quoted frontmatter keys with special characters', () => {
    const document = parseLocalVaultDocument(`---
"due date": 2026-06-01
"key:value": "kept"
"has#tag": true
"key.name": plain
---
Body.
`)

    expect(frontmatterProperties(document.frontmatter)).toMatchObject({
      'due date': '2026-06-01',
      'has#tag': true,
      'key.name': 'plain',
      'key:value': 'kept',
    })
  })

  it.each([
    ['inline arrays', 'owner: [Luca]\ntags: [Design, Mobile]'],
    ['YAML lists', 'owner:\n  - Luca\ntags:\n  - Design\n  - Mobile'],
  ])('collapses one-item %s to scalars like desktop', (_format, frontmatter) => {
    const document = parseLocalVaultDocument(`---
${frontmatter}
---
Body.
`)

    expect(document.frontmatter.owner).toBe('Luca')
    expect(document.frontmatter.tags).toEqual(['Design', 'Mobile'])
    expect(frontmatterList(document.frontmatter, ['owner'])).toEqual(['Luca'])
  })

  it('ignores desktop block-scalar frontmatter placeholders instead of exposing bogus properties', () => {
    const document = parseLocalVaultDocument(`---
summary: |
  Mobile should not surface the YAML pipe marker.
notes: >
  Folded text is not parsed by the lightweight desktop parser.
template: |
  ## Objective

  ## Timeline
status: Active
---
Body.
`)

    expect(frontmatterScalar(document.frontmatter, ['status'])).toBe('Active')
    expect(frontmatterScalar(document.frontmatter, ['template'])).toContain('## Objective')
    expect(frontmatterScalar(document.frontmatter, ['template'])).toContain('## Timeline')
    expect(frontmatterProperties(document.frontmatter)).toEqual({})
  })

  it('uses desktop canonical last-wins semantics for colliding frontmatter keys', () => {
    const document = parseLocalVaultDocument(`---
Status: Draft
status: Active
is a: Project
type: Essay
Owner: Luca
owner: Giulia
Belongs to:
  - "[[Old Project]]"
belongs_to:
  - "[[New Project]]"
---
Body.
`)

    expect(frontmatterScalar(document.frontmatter, ['Status', 'status'])).toBe('Active')
    expect(frontmatterScalar(document.frontmatter, ['type', 'Is A', 'is_a'])).toBe('Essay')
    expect(frontmatterProperties(document.frontmatter)).toEqual({ owner: 'Giulia' })
    expect(frontmatterRelationships(document.frontmatter)).toEqual({ belongs_to: ['[[New Project]]'] })
  })

  it('keeps desktop blank scalar frontmatter values unless list items follow', () => {
    const document = parseLocalVaultDocument(`---
type: Book
start date:
rating:
tags:
  - Reading
---
Body.
`)

    expect(document.frontmatter['start date']).toBe('')
    expect(document.frontmatter.rating).toBe('')
    expect(frontmatterList(document.frontmatter, ['tags'])).toEqual(['Reading'])
  })

  it('keeps quoted numeric frontmatter values as strings like desktop', () => {
    const document = parseLocalVaultDocument(`---
version: "42"
rating: '3.5'
order: 3.5
---
Body.
`)

    expect(document.frontmatter.version).toBe('42')
    expect(document.frontmatter.rating).toBe('3.5')
    expect(document.frontmatter.order).toBe(3.5)
  })

  it('decodes desktop quoted frontmatter scalar escapes', () => {
    const document = parseLocalVaultDocument(String.raw`---
title: "Luca \"Focus\" \u2605"
Status: "Needs\nReview"
aliases: ["Mobile \"QA\"", 'Owner''s Plan']
related_to:
  - "[[Project \"A\"]]"
---
Body.
`)

    expect(frontmatterScalar(document.frontmatter, ['title'])).toBe('Luca "Focus" \u2605')
    expect(frontmatterScalar(document.frontmatter, ['Status', 'status'])).toBe('Needs\nReview')
    expect(frontmatterList(document.frontmatter, ['aliases'])).toEqual(['Mobile "QA"', "Owner's Plan"])
    expect(frontmatterRelationships(document.frontmatter)).toEqual({
      related_to: ['[[Project "A"]]'],
    })
  })

  it('keeps null frontmatter scalars as literal strings like desktop', () => {
    const document = parseLocalVaultDocument(`---
empty: null
quoted: "null"
values: [null, "null"]
---
Body.
`)

    expect(document.frontmatter.empty).toBe('null')
    expect(document.frontmatter.quoted).toBe('null')
    expect(document.frontmatter.values).toEqual(['null', 'null'])
  })

  it('serializes multiline frontmatter strings as desktop block scalars', () => {
    expect(serializeLocalVaultFrontmatterScalar('## Objective\n\n## Timeline\n')).toBe('|\n  ## Objective\n\n  ## Timeline')
  })

  it.each(['true', 'false', 'null', '42', '3.5'])(
    'quotes ambiguous desktop string scalar %s instead of changing its type',
    (value) => {
      expect(serializeLocalVaultFrontmatterScalar(value)).toBe(JSON.stringify(value))
    },
  )

  it.each(['key:value', 'has#tag', 'key.name'])(
    'quotes desktop frontmatter key %s when serializing',
    (key) => {
      expect(serializeLocalVaultFrontmatterKey(key)).toBe(JSON.stringify(key))
    },
  )

  it('preserves unquoted relationship labels with spaces', () => {
    expect(serializeLocalVaultFrontmatterKey('Related to')).toBe('Related to')
  })

  it('reads desktop numeric boolean frontmatter flags', () => {
    const document = parseLocalVaultDocument(`---
_archived: 1
_favorite: 0
_organized: 2
---
Body.
`)

    expect(frontmatterFlag(document.frontmatter, ['_archived'])).toBe(true)
    expect(frontmatterFlag(document.frontmatter, ['_favorite'])).toBe(false)
    expect(frontmatterFlag(document.frontmatter, ['_organized'])).toBe(true)
  })
})
