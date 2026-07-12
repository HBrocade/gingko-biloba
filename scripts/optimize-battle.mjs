// Downscale generated battle assets in place with macOS `sips`.
//   backgrounds (src/assets/battle/*.png) → max 1024px
//   effects     (src/assets/fx/*.png)     → max 128px
// Standalone so it won't collide with optimize-assets.mjs.

import { readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const TARGETS = [
  { dir: join(ROOT, 'src', 'assets', 'battle'), max: 1024 },
  { dir: join(ROOT, 'src', 'assets', 'fx'), max: 128 },
]

const isImg = (f) => /\.(png|jpe?g|webp)$/i.test(f)

let total = 0
for (const { dir, max } of TARGETS) {
  let files
  try {
    files = (await readdir(dir)).filter(isImg)
  } catch {
    continue
  }
  for (const f of files) {
    const p = join(dir, f)
    const r = spawnSync('sips', ['-Z', String(max), p], { encoding: 'utf8' })
    if (r.status === 0) {
      total++
      console.log(`  ✓ ${f} → ≤${max}px`)
    } else {
      console.log(`  ✗ ${f} — ${(r.stderr || '').trim() || 'sips failed'}`)
    }
  }
}
console.log(`\nDone: ${total} image(s) downscaled.`)
