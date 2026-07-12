// Reincarnation (转生) attribute config + random point allocation.
// Shared by the store (auto-distributes gained points on reincarnate) and the
// panel (displays the accumulated allocation). Each attribute maps a whole number
// of "points" to a stored ReincarnationAttribute value via toRA/toPoints; some
// attributes have a point cap (max).

import type { ReincarnationAttribute } from './types'

export interface ReinAttrCfg {
  key: keyof ReincarnationAttribute
  name: string
  icon: string
  unit: string
  /** point cap (null = uncapped) */
  max: number | null
  /** points -> stored rA value */
  toRA: (p: number) => number
  /** stored rA value -> points */
  toPoints: (v: number) => number
  /** display bonus text for p points */
  display: (p: number) => string
}

export const REIN_ATTRS: ReinAttrCfg[] = [
  { key: 'HP', name: '生命值', icon: '❤️', unit: '', max: null, toRA: (p) => p * 10, toPoints: (v) => v / 10, display: (p) => `+${p * 10}` },
  { key: 'ATK', name: '攻击力', icon: '🗡️', unit: '', max: null, toRA: (p) => p * 3, toPoints: (v) => v / 3, display: (p) => `+${p * 3}` },
  { key: 'CRIT', name: '暴击率', icon: '💥', unit: '%', max: 500, toRA: (p) => Number((p * 0.1).toFixed(1)), toPoints: (v) => Math.round(v / 0.1), display: (p) => `+${(p * 0.1).toFixed(1)}%` },
  { key: 'CRITDMG', name: '暴击伤害', icon: '☄️', unit: '%', max: null, toRA: (p) => p, toPoints: (v) => v, display: (p) => `+${p}%` },
  { key: 'DEF', name: '护甲', icon: '🛡️', unit: '', max: null, toRA: (p) => p * 2, toPoints: (v) => v / 2, display: (p) => `+${p * 2}` },
  { key: 'BLOC', name: '格挡', icon: '🔰', unit: '', max: null, toRA: (p) => p * 2, toPoints: (v) => v / 2, display: (p) => `+${p * 2}` },
  { key: 'MOVESPEED', name: '行进速度', icon: '💨', unit: 'X', max: 500, toRA: (p) => -(p * 0.06), toPoints: (v) => Math.round(-v / 0.06), display: (p) => `+${(p * 0.01).toFixed(2)}X` },
  { key: 'BATTLESPEED', name: '战斗速度', icon: '⚡', unit: 'X', max: 500, toRA: (p) => -(p * 3), toPoints: (v) => Math.round(-v / 3), display: (p) => `+${(p * 0.01).toFixed(2)}X` },
]

/** Current allocated points per attribute, derived from stored RA values. */
export function reinPointsOf(rA: ReincarnationAttribute): Record<keyof ReincarnationAttribute, number> {
  const out = {} as Record<keyof ReincarnationAttribute, number>
  for (const a of REIN_ATTRS) out[a.key] = Math.max(0, Math.round(a.toPoints(rA[a.key])))
  return out
}

/**
 * Randomly spread `gain` points across the attributes (respecting each attribute's
 * point cap), added on top of the current allocation. Returns the resulting RA and
 * a per-attribute breakdown of how many points this call added. Points that cannot
 * be placed (every attribute capped) are discarded.
 */
export function randomAllocateReincarnation(
  rA: ReincarnationAttribute,
  gain: number,
  rand: () => number = Math.random,
): { attribute: ReincarnationAttribute; added: Record<string, number> } {
  const pts = reinPointsOf(rA)
  const added: Record<string, number> = {}
  for (const a of REIN_ATTRS) added[a.key] = 0

  let open = REIN_ATTRS.filter((a) => a.max == null || pts[a.key] < a.max)
  let remaining = Math.max(0, Math.floor(gain))
  while (remaining > 0 && open.length) {
    const a = open[Math.floor(rand() * open.length)]
    pts[a.key] += 1
    added[a.key] += 1
    remaining -= 1
    if (a.max != null && pts[a.key] >= a.max) open = open.filter((x) => x.key !== a.key)
  }

  const attribute = { ...rA }
  for (const a of REIN_ATTRS) attribute[a.key] = a.toRA(pts[a.key])
  return { attribute, added }
}
