// 宝箱系统：等级化的战利品箱。击败副本首领必得，挖矿低概率获得。
// 开箱掉落与玩家当前等级持平的装备（各等级宝箱只在品质概率上区分——高级箱更易开出「独特」），
// 或直接给经济奖励（灵石）。
import type { Item, ItemType } from './types'
import { createItem, type AbyssTier } from './formulas'

export type ChestTierKey = 'wood' | 'iron' | 'silver' | 'gold' | 'legend'

export interface ChestTier {
  key: ChestTierKey
  name: string
  /** emoji 兜底图标（若 src/assets/chest/chest-<key>.png 存在则用生成图）。 */
  icon: string
  color: string
  /** 单个奖励槽落到「经济奖励」而非装备的概率。 */
  goldChance: number
  /** 经济奖励额度 ≈ goldMul × (玩家等级 + 1) × 随机(0.75~1.25)。 */
  goldMul: number
  /** 装备品质权重 [破旧, 普通, 神器, 史诗, 独特]——各等级宝箱仅在此区分（越高级越易出独特）。 */
  qualityWeights: [number, number, number, number, number]
  /** 每个宝箱产出的奖励槽数量。 */
  rewards: number
  /** 开启单个宝箱消耗的灵石（随玩家等级缩放）。 */
  openCost: (playerLv: number) => number
}

export interface ChestInstance {
  id: string
  tier: ChestTierKey
  /** 开箱时用于缩放奖励的来源等级。 */
  lv: number
}

export type ChestReward =
  | { kind: 'gold'; amount: number; converted?: boolean }
  | { kind: 'item'; item: Item }

export interface ChestReveal {
  tier: ChestTierKey
  rewards: ChestReward[]
  /** 一次开启的宝箱数量（十连抽为 10，单开省略/为 1）。 */
  pulls?: number
}

/** 十连抽所需的同级宝箱数量。 */
export const TEN_PULL = 10
/** 百连抽所需的同级宝箱数量。 */
export const HUNDRED_PULL = 100

export const CHEST_TIERS: Record<ChestTierKey, ChestTier> = {
  wood:   { key: 'wood',   name: '木箱',   icon: '📦', color: '#c39a6b', goldChance: 0.6,  goldMul: 45,   qualityWeights: [38, 46, 13, 3, 0.2], rewards: 1, openCost: (lv) => Math.floor(50 * Math.max(1, lv)) },
  iron:   { key: 'iron',   name: '铁箱',   icon: '🧰', color: '#9fb2c4', goldChance: 0.4,  goldMul: 130,  qualityWeights: [8, 44, 32, 15, 1],   rewards: 1, openCost: (lv) => Math.floor(150 * Math.max(1, lv)) },
  silver: { key: 'silver', name: '银箱',   icon: '💠', color: '#dfe7f0', goldChance: 0.3,  goldMul: 360,  qualityWeights: [0, 20, 42, 33, 5],   rewards: 2, openCost: (lv) => Math.floor(400 * Math.max(1, lv)) },
  gold:   { key: 'gold',   name: '金箱',   icon: '🏆', color: '#ffca3a', goldChance: 0.22, goldMul: 950,  qualityWeights: [0, 5, 30, 55, 10],   rewards: 2, openCost: (lv) => Math.floor(1000 * Math.max(1, lv)) },
  legend: { key: 'legend', name: '传说箱', icon: '👑', color: '#ff5b7f', goldChance: 0.12, goldMul: 2600, qualityWeights: [0, 0, 0, 68, 32],    rewards: 3, openCost: (lv) => Math.floor(2500 * Math.max(1, lv)) },
}

export const CHEST_TIER_ORDER: ChestTierKey[] = ['wood', 'iron', 'silver', 'gold', 'legend']

/** 合法宝箱等级键集合——用于加载存档时过滤损坏数据。 */
export const CHEST_TIER_KEYS = new Set<string>(CHEST_TIER_ORDER)

const SLOTS: ItemType[] = ['weapon', 'armor', 'ring', 'neck']

/** 按权重掷出品质索引 0..4。 */
function pickQualityIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r < 0) return i
  }
  return weights.length - 1
}

/** 高级装备几率翻倍：神器/史诗/独特（索引 2/3/4）的权重 ×multiplier。用于连抽的惊喜奖励。 */
function boostHighTier(w: readonly number[], multiplier = 2): number[] {
  return [w[0], w[1], w[2] * multiplier, w[3] * multiplier, w[4] * multiplier]
}

/**
 * 开箱：掷出奖励。所有等级宝箱的装备等级统一（= 玩家当前等级），
 * 各等级仅在品质概率上区分（高级箱更易出「独特」）；也可能是经济奖励。
 * qualityBoost 为高级装备（神器/史诗/独特）权重倍率，默认 1（无加成）。
 */
export function rollChestRewards(tierKey: ChestTierKey, playerLv: number, opts?: { qualityBoost?: number }): ChestReward[] {
  const tier = CHEST_TIERS[tierKey]
  const lv = Math.max(1, Math.floor(playerLv))
  const weights = opts?.qualityBoost ? boostHighTier(tier.qualityWeights, opts.qualityBoost) : tier.qualityWeights
  const out: ChestReward[] = []
  for (let i = 0; i < tier.rewards; i++) {
    if (Math.random() < tier.goldChance) {
      const amount = Math.floor(tier.goldMul * (lv + 1) * (0.75 + Math.random() * 0.5))
      out.push({ kind: 'gold', amount: Math.max(1, amount) })
    } else {
      const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)]
      const qualityIndex = pickQualityIndex(weights)
      out.push({ kind: 'item', item: createItem(slot, qualityIndex, lv) })
    }
  }
  return out
}

/**
 * 十连抽：连开 10 个同级宝箱。第 10 个给「惊喜奖励」——奖励翻倍，
 * 且这份双倍奖励的高级装备几率也翻倍。返回合并后的全部奖励。
 */
export function rollTenPull(tierKey: ChestTierKey, playerLv: number): ChestReward[] {
  const all: ChestReward[] = []
  for (let i = 0; i < TEN_PULL; i++) {
    all.push(...rollChestRewards(tierKey, playerLv))
    // 第 10 个双倍：额外再掷一份，且高级装备几率翻倍
    if (i === TEN_PULL - 1) all.push(...rollChestRewards(tierKey, playerLv, { qualityBoost: 2 }))
  }
  return all
}

/**
 * 百连抽：连开 100 个同级宝箱。第 100 个给「超级惊喜」——奖励翻倍，
 * 且这份双倍奖励的高级装备几率 ×4。返回合并后的全部奖励。
 */
export function rollHundredPull(tierKey: ChestTierKey, playerLv: number): ChestReward[] {
  const all: ChestReward[] = []
  for (let i = 0; i < HUNDRED_PULL; i++) {
    all.push(...rollChestRewards(tierKey, playerLv))
    // 第 100 个双倍：额外再掷一份，且高级装备几率 ×4
    if (i === HUNDRED_PULL - 1) all.push(...rollChestRewards(tierKey, playerLv, { qualityBoost: 4 }))
  }
  return all
}

/**
 * 击败首领时的宝箱等级：随副本难度提升，并有小概率越级。
 *
 * 等级差动态调节：玩家等级高于首领 → 高级宝箱概率降低（虐菜收益递减）；
 * 玩家等级低于首领 → 高级宝箱概率提高（越级挑战回报更高）。
 */
export function bossChestTier(difficulty: number, playerLv: number, bossLv: number): ChestTierKey {
  // 等级比：>1 表示玩家碾压，<1 表示越级挑战
  const ratio = bossLv > 0 ? playerLv / bossLv : 1
  // 线性调节：玩家每高出首领 1 倍等级，高级宝箱概率衰减约 40%。
  // 当玩家等级达到首领 ~3.5× 时降为 0（虐菜完全无高级货）。
  // 越级挑战则反向加成，上限 2.0。
  const adjustment = Math.max(0, Math.min(2.0, 1 + (1 - ratio) * 0.4))

  const r = Math.random()
  if (difficulty >= 3) return r < 0.25 * adjustment ? 'legend' : 'gold'
  if (difficulty === 2) return r < 0.18 * adjustment ? 'gold' : 'silver'
  return r < 0.15 * adjustment ? 'silver' : 'iron'
}

/**
 * 深渊首领宝箱等级：不同环节（tier）有独立的高级宝箱概率。
 * 等级差动态调节与常规副本一致——虐菜收益递减，越级挑战回报更高。
 */
export function abyssBossChestTier(tier: AbyssTier, playerLv: number, bossLv: number): ChestTierKey {
  // 等级比：>1 表示玩家碾压，<1 表示越级挑战
  const ratio = bossLv > 0 ? playerLv / bossLv : 1
  const adjustment = Math.max(0, Math.min(2.0, 1 + (1 - ratio) * 0.4))

  const legendChance = tier.legendChestChance * adjustment
  const r = Math.random()
  return r < legendChance ? 'legend' : 'gold'
}

/**
 * 挖矿每个周期获得宝箱的概率：随等级上升而下降。
 * lv1 时 10%，随后按几何衰减，到 lv100 及以后达到最低值 0.01%。
 * （新手前期靠挖矿容易攒箱起步；后期几乎不再依赖挖矿出箱。）
 */
export function mineChestChance(lv: number): number {
  const HI = 0.1 // lv1 起始概率
  const LO = 0.0001 // lv100+ 最低概率
  const t = Math.min(1, Math.max(0, (lv - 1) / 99))
  return HI * Math.pow(LO / HI, t)
}

/** 挖矿掉落的宝箱等级：以木箱为主，偶见更好。 */
export function mineChestTier(): ChestTierKey {
  const r = Math.random()
  if (r < 0.02) return 'silver'
  if (r < 0.15) return 'iron'
  return 'wood'
}
