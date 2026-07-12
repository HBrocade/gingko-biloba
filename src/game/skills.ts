// ---- 技能系统 ----
// 每次施放的伤害 = 倍率 × ATK。每次施放消耗 MP；每个技能有各自的冷却时间。

export interface SkillDef {
  id: string
  name: string
  icon: string
  desc: string
  /** 每次施放的伤害 = 倍率 × ATK */
  multiplier: number
  /** 每次施放消耗的 MP */
  mpCost: number
  /** 两次施放之间的秒数 */
  cooldown: number
  /** 商店金币价格 */
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

/** 最大 MP 随玩家等级增长。 */
export function maxMpFor(lv: number): number {
  return 100 + lv * 12
}

/** 每秒回复的 MP（最大值的 10%）。 */
export function mpRegenFor(maxMp: number): number {
  return maxMp * 0.1
}

/**
 * 稳定状态下的技能 DPS 估算（用于属性面板）。技能会被限制到
 * MP 回复所能维持的水平：总需求 = Σ mpCost/cooldown。
 */
export function skillDpsDisplay(defs: SkillDef[], atk: number, mpRegen: number): number {
  if (!defs.length || atk <= 0) return 0
  const demand = defs.reduce((s, d) => s + d.mpCost / d.cooldown, 0)
  const uptime = demand > mpRegen ? mpRegen / demand : 1
  const raw = defs.reduce((s, d) => s + (d.multiplier * atk) / d.cooldown, 0)
  return raw * uptime
}

/**
 * 每场战斗的技能伤害。在 `fightTime` 秒内玩家可消耗
 * `curMp + mpRegen*fightTime` 点 MP；施放次数受冷却和 MP 限制，
 * 并优先使用 MP 效率最高的技能。返回总伤害和消耗的 MP。
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
    const maxByCd = Math.floor(Math.max(0, fightTime) / d.cooldown) + 1 // +1 表示开场的首次施放
    const maxByMp = Math.floor((mpAvail - mpSpent) / d.mpCost)
    const casts = Math.max(0, Math.min(maxByCd, maxByMp))
    dmg += casts * d.multiplier * atk
    mpSpent += casts * d.mpCost
  }
  return { dmg, mpSpent }
}
