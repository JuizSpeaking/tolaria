/**
 * Git sync for Tolaria Mobile using isomorphic-git.
 * Pure JavaScript — runs in the webview, no native code needed.
 * Works on both iOS and Android.
 */

import * as fs from '@isomorphic-git/lightning-fs'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'

// Lightning-fs provides a portable filesystem backed by IndexedDB.
// The vault directory is mounted at '/vault' in the virtual fs.
const pfs = new fs('tolaria-vault', { wipe: false })
const FS_DIR = '/vault'

export interface SyncStatus {
  ahead: number
  behind: number
  dirty: boolean
  lastCommit: string | null
}

export interface SyncResult {
  pulled: number
  pushed: number
  conflicts: string[]
}

let corsProxy = ''

/**
 * Configure the CORS proxy for GitHub auth (GitHub doesn't support CORS for git).
 * For v1, we use a simple proxy. Users can configure their own.
 */
export function setCorsProxy(url: string): void {
  corsProxy = url
}

/**
 * Clone a remote repository into the local virtual filesystem.
 */
export async function cloneRepo(
  remoteUrl: string,
  authToken: string | null,
): Promise<void> {
  const headers: Record<string, string> = {}
  if (authToken) {
    // GitHub: token as username, 'x-access-token' as password
    headers['Authorization'] = `Basic ${btoa(`x-access-token:${authToken}`)}`
  }

  await git.clone({
    fs: pfs,
    http,
    dir: FS_DIR,
    url: remoteUrl,
    corsProxy: corsProxy || undefined,
    headers,
    singleBranch: true,
    depth: 1, // shallow clone for speed
  })
}

/**
 * Pull changes from the remote.
 */
export async function pullRepo(
  authToken: string | null,
): Promise<SyncResult> {
  const headers: Record<string, string> = {}
  if (authToken) {
    headers['Authorization'] = `Basic ${btoa(`x-access-token:${authToken}`)}`
  }

  const before = await git.log({ fs: pfs, dir: FS_DIR, depth: 1 })
  const beforeOid = before[0]?.oid

  await git.pull({
    fs: pfs,
    http,
    dir: FS_DIR,
    corsProxy: corsProxy || undefined,
    headers,
    fastForward: true,
    singleBranch: true,
  })

  const after = await git.log({ fs: pfs, dir: FS_DIR, depth: 100 })
  const pulled = after.filter((entry) => entry.oid !== beforeOid).length

  return { pulled, pushed: 0, conflicts: [] }
}

/**
 * Stage all changes, commit, and push.
 */
export async function pushRepo(
  authToken: string | null,
  message: string,
): Promise<SyncResult> {
  const headers: Record<string, string> = {}
  if (authToken) {
    headers['Authorization'] = `Basic ${btoa(`x-access-token:${authToken}`)}`
  }

  // Stage all changes
  await git.add({ fs: pfs, dir: FS_DIR, filepath: '.' })

  // Commit
  await git.commit({
    fs: pfs,
    dir: FS_DIR,
    message,
    author: {
      name: 'Tolaria Mobile',
      email: 'mobile@tolaria.local',
    },
  })

  // Push
  await git.push({
    fs: pfs,
    http,
    dir: FS_DIR,
    corsProxy: corsProxy || undefined,
    headers,
  })

  return { pulled: 0, pushed: 1, conflicts: [] }
}

/**
 * Check sync status — how many commits ahead/behind the remote.
 */
export async function getSyncStatus(
  authToken: string | null,
): Promise<SyncStatus> {
  try {
    const headers: Record<string, string> = {}
    if (authToken) {
      headers['Authorization'] = `Basic ${btoa(`x-access-token:${authToken}`)}`
    }

    // Get local HEAD
    const localLog = await git.log({ fs: pfs, dir: FS_DIR, depth: 1 })
    const localOid = localLog[0]?.oid ?? null

    // Get remote HEAD (fetch without merge)
    const remoteRef = await git.fetch({
      fs: pfs,
      http,
      dir: FS_DIR,
      corsProxy: corsProxy || undefined,
      headers,
      ref: 'main',
      depth: 1,
    })

    const remoteOid = remoteRef.fetchHead

    // Count ahead/behind by comparing logs
    let ahead = 0
    let behind = 0

    if (localOid && remoteOid) {
      const localLogs = await git.log({ fs: pfs, dir: FS_DIR, depth: 50 })
      const localOids = new Set(localLogs.map((l) => l.oid))

      // Check if remote is ahead
      const remoteLogs = await git.log({
        fs: pfs,
        dir: FS_DIR,
        depth: 50,
        ref: 'refs/remotes/origin/main',
      })

      for (const entry of remoteLogs) {
        if (!localOids.has(entry.oid)) behind++
        else break
      }

      const remoteOids = new Set(remoteLogs.map((l) => l.oid))
      for (const entry of localLogs) {
        if (!remoteOids.has(entry.oid)) ahead++
        else break
      }
    }

    // Check for uncommitted changes
    const statusMatrix = await git.statusMatrix({ fs: pfs, dir: FS_DIR })
    const dirty = statusMatrix.some((row) => {
      // row: [filepath, HEAD status, WORKDIR status, STAGE status]
      // 0 = absent, 1 = present, 2 = changed
      return row[1] !== row[2] || row[2] !== row[3]
    })

    return { ahead, behind, dirty, lastCommit: localOid }
  } catch {
    return { ahead: 0, behind: 0, dirty: false, lastCommit: null }
  }
}

/**
 * Check if a vault has been cloned (filesystem has content).
 */
export async function isVaultCloned(): Promise<boolean> {
  try {
    const stat = await pfs.promises.stat(FS_DIR)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * Read a file from the virtual filesystem.
 */
export async function readFile(path: string): Promise<string> {
  const fullPath = `${FS_DIR}/${path}`
  return pfs.promises.readFile(fullPath, 'utf8') as Promise<string>
}

/**
 * Write a file to the virtual filesystem.
 */
export async function writeFile(path: string, content: string): Promise<void> {
  const fullPath = `${FS_DIR}/${path}`
  await pfs.promises.writeFile(fullPath, content)
}