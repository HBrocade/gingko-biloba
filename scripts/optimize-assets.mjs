// Downscale generated icons to a sane size for the game (they render at ~56px).
// Uses macOS `sips` or ImageMagick (`magick`/`convert`), whichever is available.
//
//   npm run opt:assets            # resize generated PNGs to max 128px
//   npm run opt:assets -- 96      # custom max dimension

import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
// which subfolder of src/assets to optimize: --claude, --scene, or default (generated)
const args = process.argv.slice(2)
const sub = args.includes('--claude') ? 'claude' : args.includes('--scene') ? 'scene' : 'generated'
const DIR = join(__dirname, '..', 'src', 'assets', sub)
const MAX = parseInt(args.find((a) => /^\d+$/.test(a)) || '128', 10)

async function has(cmd, args) {
  try {
    await exec(cmd, args)
    return true
  } catch (e) {
    return e.code !== 'ENOENT'
  }
}

async function run() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.png'))
  if (!files.length) return console.log('No generated PNGs to optimize.')

  let resize
  if (await has('sips', ['--version'])) {
    resize = (p) => exec('sips', ['-Z', String(MAX), p])
  } else if (await has('magick', ['-version'])) {
    resize = (p) => exec('magick', [p, '-resize', `${MAX}x${MAX}>`, p])
  } else if (await has('convert', ['-version'])) {
    resize = (p) => exec('convert', [p, '-resize', `${MAX}x${MAX}>`, p])
  } else {
    console.error('✗ Need `sips` (macOS) or ImageMagick (`magick`/`convert`) to resize. Skipping.')
    process.exit(1)
  }

  console.log(`Resizing ${files.length} icon(s) to max ${MAX}px …`)
  for (const f of files) await resize(join(DIR, f))
  console.log('✓ Done.')
}

run().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
