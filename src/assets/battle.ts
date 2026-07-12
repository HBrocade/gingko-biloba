// 战斗场景背景 + 攻击/技能特效精灵图。
// 生成的图片（若存在）会覆盖内置的 CSS/emoji 兜底方案：
//   背景 → src/assets/battle/<tier>.{png,jpg}
//   特效 → src/assets/fx/<name>.{png,webp}

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

/** 根据（有效）地下城等级得出战斗场景层级 —— 与地下城名称层级保持一致。 */
export function battleTier(lv: number): BattleTier {
  if (lv <= 15) return 'forest'
  if (lv <= 40) return 'wild'
  if (lv <= 80) return 'cave'
  if (lv <= 150) return 'abyss'
  return 'void'
}

/** 某层级对应的生成战斗背景（若存在）。 */
export function battleBgUrl(tier: string): string | undefined {
  return bgByTier[tier]
}

/** 某名称对应的生成特效精灵图（例如 'basic'、技能 id），若存在。 */
export function fxUrl(name: string): string | undefined {
  return fxByName[name]
}
