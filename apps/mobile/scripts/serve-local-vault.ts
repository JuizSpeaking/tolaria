import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { access, readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import { performance } from 'node:perf_hooks'
import { buildLocalVaultWorkspaceSnapshot, mobileFileKindForPath, type LocalVaultFile } from '../src/workspace/localVaultSnapshot'

type AbsolutePath = string
type DirectoryName = string
type RelativePath = string
type VaultPath = string

type LocalVaultSnapshotState = {
  buildDurationMs: number
  fileCount: number
  noteContents: Record<string, string>
  readDurationMs: number
  snapshot: ReturnType<typeof buildLocalVaultWorkspaceSnapshot>
  totalDurationMs: number
  vaultPath: VaultPath
}

const defaultVaultPath = '/Users/luca/Laputa'
const defaultPort = 8765
const host = '0.0.0.0'
const cacheTtlMs = 1500

let cachedSnapshot: { expiresAt: number; state: LocalVaultSnapshotState } | null = null

async function main() {
  const vaultPath = process.env.MOBILE_DEV_VAULT_PATH || process.env.MOBILE_QA_VAULT_PATH || defaultVaultPath
  const port = numericEnv('MOBILE_DEV_VAULT_PORT', defaultPort)
  await assertVaultReadable(vaultPath)

  const server = createServer((request, response) => {
    void handleRequest(request, response, vaultPath)
  })

  server.listen(port, host, () => {
    console.log(`Tolaria mobile dev vault bridge: http://${localLanHint()}:${port}/snapshot`)
    console.log(`Vault: ${vaultPath}`)
  })
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  vaultPath: VaultPath,
) {
  withCors(response)
  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  const path = request.url?.split('?')[0] ?? '/'
  if (request.method === 'GET' && path === '/health') {
    writeJson(response, 200, { ok: true })
    return
  }
  if (request.method === 'GET' && path === '/snapshot') {
    await writeSnapshot(response, vaultPath)
    return
  }

  writeJson(response, 404, { error: 'Not found' })
}

async function writeSnapshot(response: ServerResponse, vaultPath: VaultPath) {
  try {
    writeJson(response, 200, await localVaultSnapshotState(vaultPath))
  } catch (error) {
    writeJson(response, 500, { error: errorMessage(error) })
  }
}

async function localVaultSnapshotState(vaultPath: VaultPath): Promise<LocalVaultSnapshotState> {
  const now = Date.now()
  const cachedState = cachedSnapshotState(vaultPath, now)
  if (cachedState) return cachedState

  const state = await buildLocalVaultSnapshotState(vaultPath)
  cachedSnapshot = { expiresAt: now + cacheTtlMs, state }
  return state
}

function cachedSnapshotState(vaultPath: VaultPath, now: number): LocalVaultSnapshotState | null {
  if (!cachedSnapshot) return null
  if (cachedSnapshot.expiresAt <= now) return null
  if (cachedSnapshot.state.vaultPath !== vaultPath) return null
  return cachedSnapshot.state
}

async function buildLocalVaultSnapshotState(vaultPath: VaultPath): Promise<LocalVaultSnapshotState> {
  const startedAt = performance.now()
  const files = await readLocalVaultFiles(vaultPath)
  const folderPaths = await readLocalVaultDirectories(vaultPath)
  const readAt = performance.now()
  const snapshot = buildLocalVaultWorkspaceSnapshot({
    files,
    folderPaths,
    vaultLabel: basename(vaultPath),
    vaultPath,
  })
  const endedAt = performance.now()

  return {
    buildDurationMs: endedAt - readAt,
    fileCount: files.length,
    noteContents: noteContentMap(files),
    readDurationMs: readAt - startedAt,
    snapshot,
    totalDurationMs: endedAt - startedAt,
    vaultPath,
  }
}

function noteContentMap(files: LocalVaultFile[]): Record<string, string> {
  return Object.fromEntries(
    files
      .filter((file) => file.fileKind !== 'binary')
      .map((file) => [file.relativePath, file.content]),
  )
}

async function readLocalVaultFiles(vaultPath: VaultPath): Promise<LocalVaultFile[]> {
  const paths = await listWorkspaceFiles(vaultPath)
  const files: LocalVaultFile[] = []

  for (let index = 0; index < paths.length; index += 64) {
    const chunk = paths.slice(index, index + 64)
    files.push(...await Promise.all(chunk.map((absolutePath) => readLocalVaultFile(vaultPath, absolutePath))))
  }

  return files
}

function readLocalVaultDirectories(vaultPath: VaultPath): Promise<RelativePath[]> {
  return listWorkspaceDirectories(vaultPath)
}

async function listWorkspaceFiles(
  vaultPath: VaultPath,
  currentPath: AbsolutePath = vaultPath,
): Promise<AbsolutePath[]> {
  const entries = await readdir(currentPath, { withFileTypes: true })
  const files: AbsolutePath[] = []

  for (const entry of entries) {
    const absolutePath = join(currentPath, entry.name)
    if (entry.isDirectory() && shouldReadDirectory(entry.name)) {
      files.push(...await listWorkspaceFiles(vaultPath, absolutePath))
    } else if (entry.isFile() && shouldReadFile(relativePath(vaultPath, absolutePath))) {
      files.push(absolutePath)
    }
  }

  return files
}

async function listWorkspaceDirectories(
  vaultPath: VaultPath,
  currentPath: AbsolutePath = vaultPath,
): Promise<RelativePath[]> {
  const entries = await readdir(currentPath, { withFileTypes: true })
  const directories: RelativePath[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || !shouldReadDirectory(entry.name)) continue

    const absolutePath = join(currentPath, entry.name)
    directories.push(relativePath(vaultPath, absolutePath))
    directories.push(...await listWorkspaceDirectories(vaultPath, absolutePath))
  }

  return directories
}

async function readLocalVaultFile(vaultPath: VaultPath, absolutePath: AbsolutePath): Promise<LocalVaultFile> {
  const relativeVaultPath = relativePath(vaultPath, absolutePath)
  const fileKind = mobileFileKindForPath(relativeVaultPath)
  const [content, metadata] = await Promise.all([
    fileKind === 'binary' ? Promise.resolve('') : readTextFile(absolutePath),
    stat(absolutePath),
  ])

  return {
    absolutePath,
    content,
    createdAt: metadata.birthtimeMs,
    fileKind,
    modifiedAt: metadata.mtimeMs,
    relativePath: relativeVaultPath,
    size: metadata.size,
  }
}

async function readTextFile(absolutePath: AbsolutePath): Promise<string> {
  try {
    return await readFile(absolutePath, 'utf8')
  } catch {
    return ''
  }
}

async function assertVaultReadable(vaultPath: VaultPath) {
  await access(vaultPath)
}

function relativePath(vaultPath: VaultPath, absolutePath: AbsolutePath): RelativePath {
  return relative(vaultPath, absolutePath).replaceAll('\\', '/')
}

function shouldReadFile(path: RelativePath): boolean {
  return Boolean(path.split('/').at(-1))
}

function shouldReadDirectory(name: DirectoryName): boolean {
  return !name.startsWith('.') && name !== 'node_modules'
}

function numericEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function withCors(response: ServerResponse) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function writeJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function localLanHint(): string {
  return process.env.MOBILE_DEV_VAULT_HOST || '127.0.0.1'
}

void main().catch((error) => {
  console.error(errorMessage(error))
  process.exitCode = 1
})
