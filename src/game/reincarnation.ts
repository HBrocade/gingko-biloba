// 转生属性配置 + 随机点数分配。
// 由 store（转生时自动分配获得的点数）与
// 面板（展示累计分配）共享。每个属性通过 toRA/toPoints 将整数
// “点数”映射为存储的 ReincarnationAttribute 值；部分
// 属性有点数上限（max）。

import type { ReincarnationAttribute } from './types'

export interface ReinAttrCfg {
  key: keyof ReincarnationAttribute
  name: string
  icon: string
  unit: string
  /** 点数上限（null = 不限） */
  max: number | null
  /** 点数 -> 存储的 rA 值 */
  toRA: (p: number) => number
  /** 存储的 rA 值 -> 点数 */
  toPoints: (v: number) => number
  /** p 点对应的加成显示文本 */
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

/** 各属性当前已分配的点数，由存储的 RA 值推导得出。 */
export function reinPointsOf(rA: ReincarnationAttribute): Record<keyof ReincarnationAttribute, number> {
  const out = {} as Record<keyof ReincarnationAttribute, number>
  for (const a of REIN_ATTRS) out[a.key] = Math.max(0, Math.round(a.toPoints(rA[a.key])))
  return out
}

/**
 * 将 `gain` 点随机分配到各属性上（遵守每个属性的
 * 点数上限），叠加在当前分配之上。返回最终的 RA 以及
 * 本次调用为每个属性新增点数的明细。无法放置的点数
 *（所有属性均已达上限）将被丢弃。
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
