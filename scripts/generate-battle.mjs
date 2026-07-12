// Generate battle-scene backgrounds + attack/skill effect sprites via OpenRouter.
// Standalone (does not touch asset-manifest.mjs) so it won't collide with other
// asset work.
//
// Usage:
//   npm run gen:battle                 # generate all missing battle assets
//   npm run gen:battle -- --force      # regenerate everything
//   npm run gen:battle -- --only=fire  # only specs whose id/name matches
//   npm run gen:battle -- --limit=3    # cap how many are generated (test run)
//
// Output:
//   backgrounds → src/assets/battle/<tier>.png   (forest/wild/cave/abyss/void)
//   effects     → src/assets/fx/<name>.png       (basic + each skill id)
//
// Effect sprites are drawn on pure black so the app can blend them with
// `mix-blend-mode: screen` (black → transparent glow). The API key is read from
// the environment (.env) at BUILD TIME only — never bundled into the browser app.

import { writeFile, mkdir, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BG_DIR = join(ROOT, 'src', 'assets', 'battle')
const FX_DIR = join(ROOT, 'src', 'assets', 'fx')

const API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image'
const REFERER = process.env.OPENROUTER_REFERER || 'http://localhost:5173'
const TITLE = process.env.OPENROUTER_TITLE || 'Gingko Idle RPG'
const BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '')
const ENDPOINT = `${BASE_URL}/chat/completions`
const CONCURRENCY = 3

// ---------- specs ----------
const BG_STYLE =
  'Wide 16:9 side-scrolling RPG battle background, painterly pixel-art game art, ' +
  'horizontal ground plane along the lower third for characters to stand on, ' +
  'atmospheric depth, empty stage with NO characters and NO text or UI, ' +
  'dramatic game lighting, high detail.'

const BACKGROUNDS = [
  { id: 'forest', name: '幽暗森林', file: 'forest.png', prompt: `${BG_STYLE} Scene: a lush shadowy enchanted forest, tall mossy trees, shafts of green-gold sunlight, ferns and glowing mushrooms, misty depths.` },
  { id: 'wild', name: '荒野', file: 'wild.png', prompt: `${BG_STYLE} Scene: a rugged windswept wasteland at dusk, dry cracked earth, scattered boulders and dead trees, distant mesas, amber and brown palette.` },
  { id: 'cave', name: '幽深洞窟', file: 'cave.png', prompt: `${BG_STYLE} Scene: a deep underground cavern, jagged rock walls, glowing crystal clusters, an underground stream, cold blue-violet ambient light.` },
  { id: 'abyss', name: '炼狱深渊', file: 'abyss.png', prompt: `${BG_STYLE} Scene: a hellish abyss, rivers of glowing magma, black volcanic rock, floating embers, ominous purple-red sky, demonic ruins in the distance.` },
  { id: 'void', name: '虚空秘境', file: 'void.png', prompt: `${BG_STYLE} Scene: a cosmic void realm, floating shattered platforms, swirling nebula of deep blue and violet, distant stars and galaxies, ethereal glowing runes.` },
]

const FX_STYLE =
  'Centered game VFX effect sprite on a SOLID PURE BLACK (#000000) background, ' +
  'bright glowing energy, no character, no text, no ground, no border, ' +
  'square composition, vivid saturated colors, pixel-art game effect.'

const EFFECTS = [
  { id: 'basic', name: '普通攻击', file: 'basic.png', prompt: `${FX_STYLE} Effect: a sharp white-silver slashing sword arc, crescent-shaped motion trail with a few spark particles.` },
  { id: 'slash', name: '裂斩', file: 'slash.png', prompt: `${FX_STYLE} Effect: a powerful steel-blue rending double slash, two crossing crescent blades of wind energy with sparks.` },
  { id: 'iceLance', name: '寒冰刺', file: 'iceLance.png', prompt: `${FX_STYLE} Effect: a burst of cyan crystalline ice shards and frozen spikes radiating outward, cold blue glow and frost mist.` },
  { id: 'fireball', name: '火球术', file: 'fireball.png', prompt: `${FX_STYLE} Effect: a fiery orange-red exploding fireball with billowing flames and ember sparks.` },
  { id: 'thunder', name: '雷霆万钧', file: 'thunder.png', prompt: `${FX_STYLE} Effect: a jagged bright yellow-white lightning bolt strike with crackling electric arcs and a blue-white flash.` },
  { id: 'holy', name: '圣光裁决', file: 'holy.png', prompt: `${FX_STYLE} Effect: a radiant golden holy light judgment, descending divine beam with sparkling halo and feather-light glow.` },
  { id: 'meteor', name: '流星火雨', file: 'meteor.png', prompt: `${FX_STYLE} Effect: a blazing crimson meteor streaking down with a long fiery tail, molten rock core and trailing embers.` },
]

const JOBS = [
  ...BACKGROUNDS.map((s) => ({ ...s, dir: BG_DIR, kind: 'bg' })),
  ...EFFECTS.map((s) => ({ ...s, dir: FX_DIR, kind: 'fx' })),
]

// ---------- CLI ----------
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
      '  3. re-run: npm run gen:battle',
  )
}

const exists = (p) =>
  access(p)
    .then(() => true)
    .catch(() => false)

/** Extract raw image bytes from an OpenRouter response (handles both API shapes). */
function extractImage(json) {
  const msg = json?.choices?.[0]?.message
  const imgs = msg?.images
  if (Array.isArray(imgs) && imgs.length) {
    const url = imgs[0]?.image_url?.url ?? imgs[0]?.url
    const m = /^data:image\/\w+;base64,(.*)$/s.exec(url || '')
    if (m) return Buffer.from(m[1], 'base64')
  }
  if (json?.data?.[0]?.b64_json) return Buffer.from(json.data[0].b64_json, 'base64')
  return null
}

/** True if the response looks like an out-of-credits / payment error. */
function isCreditError(status, text) {
  if (status === 402) return true
  return /insufficient|credit|quota|billing|payment required/i.test(text || '')
}

class CreditError extends Error {}

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
    if (isCreditError(res.status, text)) throw new CreditError(`HTTP ${res.status} ${text.slice(0, 200)}`)
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
  await writeFile(join(spec.dir, spec.file), buf)
  return buf.length
}

async function run() {
  await mkdir(BG_DIR, { recursive: true })
  await mkdir(FX_DIR, { recursive: true })

  let jobs = JOBS.filter((s) => !only || s.id.includes(only) || s.name.includes(only))
  const pending = []
  for (const s of jobs) {
    if (!force && (await exists(join(s.dir, s.file)))) continue
    pending.push(s)
  }
  jobs = pending.slice(0, limit)

  if (!jobs.length) {
    console.log('✓ Nothing to do (all battle assets already generated — use --force to regenerate).')
    return
  }

  console.log(`Generating ${jobs.length} battle asset(s) with ${MODEL}\n`)

  let done = 0
  let failed = 0
  let outOfCredits = false
  let idx = 0
  async function worker() {
    while (idx < jobs.length && !outOfCredits) {
      const spec = jobs[idx++]
      try {
        const bytes = await generateOne(spec)
        done++
        console.log(`  ✓ [${done + failed}/${jobs.length}] ${spec.kind}:${spec.name}  (${(bytes / 1024).toFixed(0)} KB)`)
      } catch (e) {
        if (e instanceof CreditError) {
          outOfCredits = true
          console.log(`  ✗ ${spec.name} — OUT OF CREDITS (${e.message})`)
          return
        }
        failed++
        console.log(`  ✗ [${done + failed}/${jobs.length}] ${spec.kind}:${spec.name}  — ${e.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker))

  console.log(`\nDone: ${done} generated, ${failed} failed${outOfCredits ? ', stopped (out of credits)' : ''}.`)
  if (outOfCredits) {
    console.log('\n⚠️  OpenRouter credits are exhausted — top up at https://openrouter.ai/credits and re-run `npm run gen:battle`.')
    process.exit(3)
  }
  if (done > 0) console.log('Next: `npm run opt:battle` to downscale, then refresh the game.')
}

run().catch((e) => fail(e.stack || e.message))
