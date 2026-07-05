// Copia os binários UMD do @ffmpeg/core para public/ffmpeg/, para que sejam
// servidos localmente (same-origin) — sem depender de nenhuma CDN em runtime.
// Roda automaticamente no postinstall e antes de dev/build.
import { mkdir, copyFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
// Usamos o build ESM: o worker do @ffmpeg/ffmpeg é um module worker e importa
// o core via import() esperando um `export default` (presente só no ESM).
const srcDir = resolve(root, 'node_modules/@ffmpeg/core/dist/esm')
const outDir = resolve(root, 'public/ffmpeg')

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm']

async function main() {
  try {
    await access(resolve(srcDir, files[0]))
  } catch {
    console.warn('[copy-core] @ffmpeg/core não encontrado — pulei a cópia.')
    return
  }
  await mkdir(outDir, { recursive: true })
  for (const f of files) {
    await copyFile(resolve(srcDir, f), resolve(outDir, f))
  }
  console.log('[copy-core] core do FFmpeg copiado para public/ffmpeg/')
}

main().catch((err) => {
  console.error('[copy-core] falhou:', err)
  process.exit(1)
})
