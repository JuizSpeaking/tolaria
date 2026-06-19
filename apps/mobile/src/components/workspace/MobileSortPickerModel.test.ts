import { describe, expect, it } from 'vitest'
import {
  mobileCustomPropertySortValue,
  mobileCustomSortFromValue,
  mobileSortFieldIsDesktopBuiltIn,
  mobileSortFieldMatches,
} from './MobileSortPickerModel'

describe('MobileSortPickerModel', () => {
  it('treats only desktop sort options as built-ins', () => {
    expect(mobileSortFieldIsDesktopBuiltIn('title')).toBe(true)
    expect(mobileSortFieldIsDesktopBuiltIn('type')).toBe(false)
  })

  it('keeps bare desktop custom-property sort strings editable', () => {
    expect(mobileCustomSortFromValue('type:asc')).toEqual({ direction: 'asc', field: 'type' })
    expect(mobileCustomSortFromValue('property:type:desc')).toEqual({ direction: 'desc', field: 'type' })
    expect(mobileCustomSortFromValue('title:asc')).toEqual({ direction: null, field: '' })
  })

  it('serializes custom property sorts and filters suggestions', () => {
    expect(mobileCustomPropertySortValue(' type ', 'asc')).toBe('property:type:asc')
    expect(mobileSortFieldMatches('Priority', 'prio')).toBe(true)
    expect(mobileSortFieldMatches('Priority', 'owner')).toBe(false)
  })
})
