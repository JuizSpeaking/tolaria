import { requireOptionalNativeModule } from 'expo'
import type { NativeMobileKeyCommandsModule } from './mobileNativeKeyCommands'

let cachedModule: NativeMobileKeyCommandsModule | null | undefined

export function optionalNativeMobileKeyCommandsModule(): NativeMobileKeyCommandsModule | null {
  if (cachedModule !== undefined) return cachedModule
  cachedModule = requireOptionalNativeModule<NativeMobileKeyCommandsModule>('TolariaKeyCommands')
  return cachedModule
}

export function nativeMobileKeyCommandsAvailable(
  module: NativeMobileKeyCommandsModule | null = optionalNativeMobileKeyCommandsModule(),
) {
  if (!module) return false
  return module.isSupported?.() ?? true
}
