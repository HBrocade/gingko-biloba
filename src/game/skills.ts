// ---- Skill system ----
// Damage per cast = multiplier × ATK. Each cast costs MP; each skill has its own cooldown.

export interface SkillDef {
  id: string
  name: string
  icon: string
  desc: string
  /** damage per cast = multiplier × ATK */
  multiplier: number
  /** MP consumed per cast */
  mpCost: number
  /** seconds between casts */
  cooldown: number
  /** shop price in gold */
  price: number
}

export const SKILL_CATALOG: SkillDef[] = [
  { id: 'slash', name: '裂斩', icon: '🗡️', multiplier: 2.5, mpCost: 20, cooldown: 3, price: 8000, desc: '造成 250% 攻击力的物理伤害' },
  { id: 'iceLance', name: '寒冰刺', icon: '❄️', multiplier: 3.5, mpCost: 35, cooldown: 4, price: 25000, desc: '造成 350% 攻击力的冰霜伤害' },
  { id: 'fireball', name: '火球术', icon: '🔥', multiplier: 5, mpCost: 55, cooldown: 5, price: 70000, desc: '造成 500% 攻击力的火焰伤害' },
  { id: 'thunder', name: '雷霆万钧', icon: '⚡', multiplier: 7.5, mpCost: 90, cooldown: 7, price: 200000, desc: '造成 750% 攻击力的雷电伤害' },
  { id: 'holy', name: '圣光裁决', icon: '✨', multiplier: 11, mpCost: 140, cooldown: 9, price: 600000, desc: '造成 1100% 攻击力的神圣伤害' },
  { id: 'meteor', name: '流星火雨', icon: '☄️', multiplier: 16, mpCost: 220, cooldown: 12, price: 1800000, desc: '造成 1600% 攻击力的毁灭伤害' },
]

export function skillById(id: string): SkillDef | undefined {
  return SKILL_CATALOG.find((s) => s.id === id)
}

export function ownedSkillDefs(ids: string[]): SkillDef[] {
  return ids.map(skillById).filter((s): s is SkillDef => !!s)
}

/** Max MP scales with player level. */
export function maxMpFor(lv: number): number {
  return 100 + lv * 12
}

/** MP regenerated per second (10% of max). */
export function mpRegenFor(maxMp: number): number {
  return maxMp * 0.1
}

/**
 * Steady-state skill DPS estimate (for the stat panel). Skills are throttled to
 * whatever MP regen can sustain: total demand = Σ mpCost/cooldown.
 */
export function skillDpsDisplay(defs: SkillDef[], atk: number, mpRegen: number): number {
  if (!defs.length || atk <= 0) return 0
  const demand = defs.reduce((s, d) => s + d.mpCost / d.cooldown, 0)
  const uptime = demand > mpRegen ? mpRegen / demand : 1
  const raw = defs.reduce((s, d) => s + (d.multiplier * atk) / d.cooldown, 0)
  return raw * uptime
}

/**
 * Per-fight skill damage. Over `fightTime` seconds the player can spend
 * `curMp + mpRegen*fightTime` MP; casts are limited by cooldown and MP, with the
 * most MP-efficient skills prioritised. Returns total damage and MP spent.
 */
export function simulateSkillDamage(
  defs: SkillDef[],
  atk: number,
  curMp: number,
  mpRegen: number,
  fightTime: number,
): { dmg: number; mpSpent: number } {
  if (!defs.length || atk <= 0) return { dmg: 0, mpSpent: 0 }
  const sorted = [...defs].sort((a, b) => b.multiplier / b.mpCost - a.multiplier / a.mpCost)
  const mpAvail = curMp + mpRegen * Math.max(0, fightTime)
  let dmg = 0
  let mpSpent = 0
  for (const d of sorted) {
    const maxByCd = Math.floor(Math.max(0, fightTime) / d.cooldown) + 1 // +1 for the opening cast
    const maxByMp = Math.floor((mpAvail - mpSpent) / d.mpCost)
    const casts = Math.max(0, Math.min(maxByCd, maxByMp))
    dmg += casts * d.multiplier * atk
    mpSpent += casts * d.mpCost
  }
  return { dmg, mpSpent }
}
