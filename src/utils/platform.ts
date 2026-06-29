import { isTauri } from '../mock-tauri'

function getUserAgent(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgent
}

export const MACOS_TRAFFIC_LIGHT_SAFE_PADDING = 90

export function isLinux(): boolean {
  const userAgent = getUserAgent()
  return userAgent.includes('Linux') && !userAgent.includes('Android')
}

export function isMac(): boolean {
  const userAgent = getUserAgent()
  return userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')
}

export function isWindows(): boolean {
  return getUserAgent().includes('Windows')
}

export function isMobile(): boolean {
  const userAgent = getUserAgent()
  return /Android|iPhone|iPad|iPod/i.test(userAgent)
}

export function shouldUseCustomWindowChrome(): boolean {
  return isTauri() && (isLinux() || isWindows())
}