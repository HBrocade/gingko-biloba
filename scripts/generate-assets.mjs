// Generate pixel-art item icons via OpenRouter and write them to src/assets/generated/.
//
// Usage:
//   1. cp .env.example .env  &&  put your key in OPENROUTER_API_KEY
//   2. npm run gen:assets                 # generate all missing icons
//      npm run gen:assets -- --force      # regenerate everything
//      npm run gen:assets -- --only=剑    # only entries whose name/desc matches
//      npm run gen:assets -- --limit=5    # cap the number generated (good for a test run)
//
// The API key is read from the environment (.env) at BUILD TIME only — it is never
// bundled into the browser app.

import { writeFile, mkdir, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST, SCENE, CLAUDE } from './asset-manifest.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
// pick a target: --scene (heroes/monsters), --claude (Schrödinger's Claude roster), or default (items)
const target = process.argv.includes('--claude')
  ? { source: CLAUDE, dir: 'claude' }
  : process.argv.includes('--scene')
    ? { source: SCENE, dir: 'scene' }
    : { source: MANIFEST, dir: 'generated' }
const SOURCE = target.source
const OUT_DIR = join(__dirname, '..', 'src', 'assets', target.dir)

const API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image'
const REFERER = process.env.OPENROUTER_REFERER || 'http://localhost:5173'
const TITLE = process.env.OPENROUTER_TITLE || 'Gingko Idle RPG'
const BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '')
const ENDPOINT = `${BASE_URL}/chat/completions`
const CONCURRENCY = 3

// ---- CLI args ----
const args = process.argv.slice(2)
const force = args.includes('--force')
const onlyArg = args.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.slice('--only='.length) : null
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : Infinity

function fail(msg) {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

if (!API_KEY) {
  fail(
    'OPENROUTER_API_KEY is not set.\n' +
      '  1. cp .env.example .env\n' +
      '  2. put your key from https://openrouter.ai/keys into OPENROUTER_API_KEY\n' +
      '  3. re-run: npm run gen:assets',
  )
}

const exists = (p) =>
  access(p)
    .then(() => true)
    .catch(() => false)

/** Extract raw PNG bytes from an OpenRouter response (handles both API shapes). */
function extractImage(json) {
  const msg = json?.choices?.[0]?.message
  const imgs = msg?.images
  if (Array.isArray(imgs) && imgs.length) {
    const url = imgs[0]?.image_url?.url ?? imgs[0]?.url
    const m = /^data:image\/\w+;base64,(.*)$/s.exec(url || '')
    if (m) return Buffer.from(m[1], 'base64')
  }
  // dedicated /images-style payload, just in case a model returns it
  if (json?.data?.[0]?.b64_json) return Buffer.from(json.data[0].b64_json, 'base64')
  return null
}

async function generateOne(spec, attempt = 1) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': REFERER,
      'X-Title': TITLE,
    },
    body: JSON.stringify({
      model: MODEL,
      modalities: ['image', 'text'],
      messages: [{ role: 'user', content: spec.prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (attempt < 2 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 2500))
      return generateOne(spec, attempt + 1)
    }
    throw new Error(`HTTP ${res.status} ${text.slice(0, 300)}`)
  }

  const json = await res.json()
  const buf = extractImage(json)
  if (!buf) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500))
      return generateOne(spec, attempt + 1)
    }
    throw new Error(`no image in response: ${JSON.stringify(json).slice(0, 300)}`)
  }
  await writeFile(join(OUT_DIR, spec.file), buf)
  return buf.length
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true })

  let jobs = SOURCE.filter((s) => !only || s.name.includes(only) || s.prompt.includes(only))
  // skip already-generated files unless --force
  const pending = []
  for (const s of jobs) {
    if (!force && (await exists(join(OUT_DIR, s.file)))) continue
    pending.push(s)
  }
  jobs = pending.slice(0, limit)

  if (!jobs.length) {
    console.log('✓ Nothing to do (all icons already generated — use --force to regenerate).')
    return
  }

  console.log(`Generating ${jobs.length} icon(s) with ${MODEL}\n  → ${OUT_DIR}\n`)

  let done = 0
  let failed = 0
  let idx = 0
  async function worker() {
    while (idx < jobs.length) {
      const spec = jobs[idx++]
      try {
        const bytes = await generateOne(spec)
        done++
        console.log(`  ✓ [${done + failed}/${jobs.length}] ${spec.name}  (${(bytes / 1024).toFixed(0)} KB)`)
      } catch (e) {
        failed++
        console.log(`  ✗ [${done + failed}/${jobs.length}] ${spec.name}  — ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker))

  console.log(`\nDone: ${done} generated, ${failed} failed.`)
  if (done > 0) console.log('Refresh the game — generated icons are picked up automatically.')
}

run().catch((e) => fail(e.stack || e.message))
