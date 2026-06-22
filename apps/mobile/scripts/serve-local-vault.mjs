import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { URL, fileURLToPath, pathToFileURL } from 'node:url'

const scriptPath = fileURLToPath(new URL('./serve-local-vault.ts', import.meta.url))
const outputPath = join(tmpdir(), 'tolaria-mobile', 'serve-local-vault.mjs')

await mkdir(dirname(outputPath), { recursive: true })
await build({
  bundle: true,
  entryPoints: [scriptPath],
  external: [],
  format: 'esm',
  logLevel: 'silent',
  outfile: outputPath,
  platform: 'node',
  target: 'node20',
})

await import(pathToFileURL(outputPath).href)
