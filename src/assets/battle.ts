// Battle scene backgrounds + attack/skill effect sprites.
// Generated images (if present) override the built-in CSS/emoji fallback:
//   backgrounds → src/assets/battle/<tier>.{png,jpg}
//   effects     → src/assets/fx/<name>.{png,webp}

const bgFiles = import.meta.glob('./battle/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const bgByTier: Record<string, string> = {}
for (const p in bgFiles) {
  const m = /\/([^/]+)\.\w+$/.exec(p)
  if (m) bgByTier[m[1]] = bgFiles[p]
}

const fxFiles = import.meta.glob('./fx/*.{png,webp,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const fxByName: Record<string, string> = {}
for (const p in fxFiles) {
  const m = /\/([^/]+)\.\w+$/.exec(p)
  if (m) fxByName[m[1]] = fxFiles[p]
}

export const BATTLE_TIERS = ['forest', 'wild', 'cave', 'abyss', 'void'] as const
export type BattleTier = (typeof BATTLE_TIERS)[number]

/** Battle scene tier from an (effective) dungeon level — matches the dungeon-name tiers. */
export function battleTier(lv: number): BattleTier {
  if (lv <= 15) return 'forest'
  if (lv <= 40) return 'wild'
  if (lv <= 80) return 'cave'
  if (lv <= 150) return 'abyss'
  return 'void'
}

/** Generated battle background for a tier, if one exists. */
export function battleBgUrl(tier: string): string | undefined {
  return bgByTier[tier]
}

/** Generated effect sprite for a name (e.g. 'basic', skill id), if one exists. */
export function fxUrl(name: string): string | undefined {
  return fxByName[name]
}
