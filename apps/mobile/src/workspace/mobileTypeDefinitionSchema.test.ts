import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import type { MobileTypeDefinition } from './mobileWorkspaceModel'
import {
  addTypeSchemaProperty,
  addTypeSchemaRelationshipRef,
  mobileTypeSchemaRelationshipValueText,
  typeDefinitionSchemaPatch,
  typeSchemaPropertiesForForm,
  typeSchemaRelationshipsForForm,
} from './mobileTypeDefinitionSchema'

describe('mobile type definition schema helpers', () => {
  it('splits Type scalar defaults from relationship schema rows', () => {
    const definition: MobileTypeDefinition = {
      properties: {
        Priority: 'High',
        has: 'Milestone',
      },
      relationships: {
        depends_on: ['[[Project Board]]'],
      },
    }

    expect(typeSchemaPropertiesForForm(definition)).toEqual([
      { key: 'Priority', value: 'High' },
    ])
    expect(typeSchemaRelationshipsForForm(definition)).toEqual([
      { key: 'depends_on', refs: ['[[Project Board]]'] },
      { key: 'has', placeholderValue: 'Milestone', refs: [] },
    ])
  })

  it('writes schema rows back to the desktop Type frontmatter contract', () => {
    expect(typeDefinitionSchemaPatch([
      { key: 'Priority', value: 'High' },
    ], [
      { key: 'depends_on', refs: ['[[Project Board]]'] },
      { key: 'has', placeholderValue: 'Milestone', refs: [] },
    ])).toEqual({
      properties: {
        Priority: 'High',
        has: 'Milestone',
      },
      relationships: {
        depends_on: ['[[Project Board]]'],
      },
    })
  })

  it('parses property defaults and resolves relationship targets from notes', () => {
    const notes = workspaceScenarioForId('default').notes
    const properties = addTypeSchemaProperty([], 'Stage', 'Design, Build')
    const relationships = addTypeSchemaRelationshipRef([], 'belongs to', 'How I Run an Open Source Project', notes)

    expect(properties).toEqual([{ key: 'Stage', value: ['Design', 'Build'] }])
    expect(relationships).toEqual([{ key: 'belongs_to', refs: ['[[Tolaria/Mobile UI/How I Run an Open Source Project]]'] }])
    expect(mobileTypeSchemaRelationshipValueText(relationships[0], notes)).toBe('How I Run an Open Source Project')
  })
})
