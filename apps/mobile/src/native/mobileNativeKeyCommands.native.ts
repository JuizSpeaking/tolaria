import { requireOptionalNativeModule } from 'expo'
import type { NativeMobileKeyCommandsModule } from './mobileNativeKeyCommands'

let cachedModule: NativeMobileKeyCommandsModule | null | undefined

export function optionalNativeMobileKeyCommandsModule(): NativeMobileKeyCommandsModule | null {
  if (cachedModule !== undefined) return cachedModule
  cachedModule = requireOptionalNativeModule<NativeMobileKeyCommandsModule>('TolariaKeyCommands')
  return cachedModule
}
