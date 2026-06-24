export type NativeMobileKeyCommandEvent = {
  altKey: boolean
  code?: string
  ctrlKey: boolean
  key: string
  metaKey: boolean
  shiftKey: boolean
  source: 'native'
}

export type NativeMobileKeyCommandsModule = {
  addListener: (
    eventName: 'onShortcut',
    listener: (event: NativeMobileKeyCommandEvent) => void,
  ) => { remove: () => void }
}

export function optionalNativeMobileKeyCommandsModule(): NativeMobileKeyCommandsModule | null {
  return null
}
