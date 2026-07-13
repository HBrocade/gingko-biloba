import { DMGAMP_CHANCE, INNATE_COUNT, ITEM_DATA, RECAST_POOL } from './itemData'
import { qualityTable, QUALITY_PROBABILITY } from './constants'
import { fmtNum } from './format'
import type {
  AttrType,
  Dungeon,
  DungeonDifficulty,
  DungeonEvent,
  Entry,
  Item,
  ItemType,
  PlayerAttribute,
  Quality,
  QualityIndex,
  ReincarnationAttribute,
} from './types'

// ---- 辅助函数 ----
const R = Math.random
const fl = (n: number) => Math.floor(n)
const round2 = (n: number) => Math.round(n * 100) / 100

let _idc = 0
export function uid(prefix = 'it'): string {
  _idc += 1
  return `${prefix}_${Date.now().toString(36)}_${_idc.toString(36)}_${fl(R() * 1e6).toString(36)}`
}

/** 显示值带 % 的属性类型。 */
export function isPercentDisplay(type: AttrType): boolean {
  return (
    type === 'CRIT' ||
    type === 'CRITDMG' ||
    type === 'EVA' ||
    type === 'ATKPERCENT' ||
    type === 'DEFPERCENT' ||
    type === 'HPPERCENT' ||
    type === 'BLOCPERCENT' ||
    type === 'DMGAMP' ||
    type === 'DMGADD' ||
    type === 'SKILLDMG'
  )
}

function showVal(type: AttrType, value: number): string {
  return isPercentDisplay(type) ? `+${value}%` : `+${fmtNum(value)}`
}

// ---------------------------------------------------------------------------
// 强化 (强化)
// ---------------------------------------------------------------------------
/** 在指定强化等级下作用于基础词条的乘数。 */
export function enchantMultiplier(lv: number): number {
  if (!lv) return 1
  return Math.pow(1.055, Math.pow(lv, 1.1))
}

/** 返回已叠加强化等级的基础词条副本。 */
export function applyEnchant(entries: Entry[], lv: number): Entry[] {
  const a = enchantMultiplier(lv)
  return entries.map((item) => {
    const value = Math.round(a * item.value)
    return { ...item, value, showVal: showVal(item.type, value) }
  })
}

// ---------------------------------------------------------------------------
// 物品生成
// ---------------------------------------------------------------------------
/** 掷取一个基础词条数值（保留原版的分部位规则）。 */
function rollBase(slot: ItemType, type: AttrType, lv: number, qc: number, valCoef: number): number {
  switch (type) {
    case 'ATK':
    case 'DEF':
      return Math.max(1, fl(fl(lv * valCoef + (R() * lv / 2 + 1)) * qc))
    case 'HP':
      return Math.max(1, fl(fl(lv * valCoef * 10 + (R() * lv / 2 + 1)) * qc))
    case 'CRIT':
      if (slot === 'weapon') return fl(fl(R() * 5 + 7) * qc)
      if (slot === 'armor') return fl(fl(R() * 5 + 5) * qc)
      return fl(fl(R() * 5 + 10) * qc * valCoef) // 戒指 / 项链使用 valCoef
    case 'CRITDMG':
      if (slot === 'weapon' || slot === 'armor') return fl(fl(R() * 20 + 20) * qc)
      return fl(fl(R() * 20 + 30) * qc * valCoef) // 戒指 / 项链使用 valCoef
    case 'BLOC':
      if (slot === 'armor') return Math.max(1, fl(fl(lv * 1.3 + (R() * lv / 2 + 1)) * qc))
      return Math.max(1, fl(fl(lv * 0.4 + (R() * lv / 2 + 1)) * qc)) // 武器 / 项链
    default:
      return 0
  }
}

// ---- 词条品质数值系统（额外 + 本体词条）----
/** 词条类型在品质与强化前的基准量值。 */
function baseAffixMagnitude(type: AttrType, lv: number): number {
  switch (type) {
    case 'ATK': return lv * 1.4
    case 'HP': return lv * 9
    case 'DEF': return lv * 0.7
    case 'BLOC': return lv * 0.7
    case 'CRIT': return 8
    case 'CRITDMG': return 26
    case 'ATKPERCENT': return lv * 0.12 + 8
    case 'DEFPERCENT': return lv * 0.11 + 7
    case 'HPPERCENT': return lv * 0.13 + 8
    case 'BLOCPERCENT': return lv * 0.1 + 7
    case 'DMGAMP': return lv * 0.03 + 10
    case 'DMGADD': return lv * 0.02 + 5
    case 'SKILLDMG': return lv * 0.01 + 4
    default: return 1
  }
}

/** 品质 q∈[0,1] 下的数值：基准量的 0.5x (q=0) .. 1.5x (q=1)，并按品质系数缩放。 */
export function affixValue(type: AttrType, lv: number, qc: number, q: number): number {
  const mag = baseAffixMagnitude(type, lv) * qc * (0.5 + q)
  return isPercentDisplay(type) ? round2(mag) : Math.max(1, Math.round(mag))
}

/** 以给定的品质掷值构建一个词条。 */
function makeAffix(type: AttrType, name: string, lv: number, qc: number, q: number): Entry {
  const value = affixValue(type, lv, qc, q)
  return { type, name, value, showVal: showVal(type, value), q }
}

/** 使用加权表掷取一个随机品质索引。 */
function randomQualityIndex(): QualityIndex {
  const r = R()
  let acc = 0
  for (let i = 0; i < QUALITY_PROBABILITY.length; i++) {
    acc += QUALITY_PROBABILITY[i]
    if (r < acc) return i as QualityIndex
  }
  return 0
}

/**
 * 生成一件新物品。
 * @param slot 装备部位
 * @param qualityIndex 0..4，或 -1 表示随机掷取品质
 * @param lv 物品等级，或 0 表示随机掷取等级 (1..39)
 */
export function createItem(slot: ItemType, qualityIndex: number, lv?: number): Item {
  const table = qualityTable(slot)
  const quality: Quality = qualityIndex > -1 ? table[qualityIndex] : table[randomQualityIndex()]
  const itemLv = lv || fl(R() * 39) + 1
  const qc = quality.qualityCoefficient

  const data = ITEM_DATA[slot]
  const pool = quality.name === '独特' ? data.unique : data.category
  const template = pool[fl(R() * pool.length)]

  const entry: Entry[] = template.entry.map((base) => {
    const value = rollBase(slot, base.type, itemLv, qc, base.valCoefficient ?? 1)
    return { type: base.type, name: base.name, value, showVal: showVal(base.type, value) }
  })

  // 可重铸基础词条（随机类型 + 随机品质）
  const extraEntry: Entry[] = []
  for (let i = 0; i < quality.extraEntryNum; i++) {
    const pick = data.extra[fl(R() * data.extra.length)]
    extraEntry.push(makeAffix(pick.type, pick.name, itemLv, qc, R()))
  }

  // 本体词条（部位百分比 + 暴击伤害 + 白字 + 技伤；不重复类型，不可重铸，可洗礼）
  const innate: Entry[] = []
  const available = [...data.innatePool]
  const innateCount = Math.min(INNATE_COUNT[quality.name] ?? 0, available.length)
  for (let i = 0; i < innateCount; i++) {
    const pick = available.splice(fl(R() * available.length), 1)[0]
    innate.push(makeAffix(pick.type, pick.name, itemLv, qc, R()))
  }
  // 黄字（伤害增幅）：独立于品质的固定低掉率——所有装备一样稀有，多数装备不产生
  if (R() < DMGAMP_CHANCE) innate.push(makeAffix('DMGAMP', '伤害增幅', itemLv, qc, R()))

  return {
    id: uid(),
    lv: itemLv,
    itemType: slot,
    quality,
    icon: template.icon,
    type: { name: template.name, des: template.des, icon: template.icon, entry },
    extraEntry,
    innate,
    enchantlvl: 0,
  }
}

// ---------------------------------------------------------------------------
// 重铸 (重铸, 更改类型) & 品质洗礼 (洗礼, 重掷数值品质)
// ---------------------------------------------------------------------------
/** 将一条基础属性词条重铸为指定类型，品质固定为中等 (固定数值)。 */
export function createEntryOfType(lv: number, qc: number, type: AttrType): Entry {
  const name = RECAST_POOL.find((p) => p.type === type)?.name ?? type
  return makeAffix(type, name, lv, qc, 0.5)
}

/** 重铸为随机的基础属性类型，品质固定为中等。 */
export function createRandomEntry(lv: number, qc: number): Entry {
  const pick = RECAST_POOL[fl(R() * RECAST_POOL.length)]
  return createEntryOfType(lv, qc, pick.type)
}

/** 品质洗礼：重掷一条词条的品质（保留类型 / 名称 / 锁定）。 */
export function baptizeAffix(affix: Entry, lv: number, qc: number): Entry {
  const q = R()
  const value = affixValue(affix.type, lv, qc, q)
  return { ...affix, value, showVal: showVal(affix.type, value), q }
}

// ---------------------------------------------------------------------------
// 强化花费 / 重铸花费
// ---------------------------------------------------------------------------
export function strengthenNeedGold(item: Item): number {
  return (
    fl((item.lv + 1) * Math.pow(1.1, Math.pow(item.enchantlvl, 1.1)) * (10 + item.lv / 5)) + 100
  )
}

export function recastNeedGold(item: Item): number {
  return fl((item.lv * item.quality.qualityCoefficient * (200 + 10 * item.lv)) / 4)
}

/** 品质洗礼花费——随锁定词条数量增长（锁定需额外付费）。 */
export function baptizeNeedGold(item: Item, lockedCount: number): number {
  return fl(recastNeedGold(item) * (1 + lockedCount * 0.8))
}

/** 在给定当前等级下一次强化尝试的成功几率。 */
export function enchantSuccessRate(lv: number): number {
  if (lv <= 5) return 1
  if (lv === 6) return 0.8
  if (lv === 7) return 0.65
  if (lv === 8) return 0.45
  if (lv === 9) return 0.3
  return 0.2
}

/** 出售一件物品获得的金币。 */
export function sellPrice(item: Item): number {
  return fl(item.lv * item.quality.qualityCoefficient * 30)
}

/** 物品的粗略战力评分——用于背包排序。可跨部位比较。 */
const SCORE_W: Record<AttrType, number> = {
  ATK: 2,
  DEF: 1.5,
  HP: 0.2,
  CRIT: 3,
  CRITDMG: 1,
  BLOC: 1,
  EVA: 2,
  ATKPERCENT: 3,
  DEFPERCENT: 2,
  HPPERCENT: 2,
  BLOCPERCENT: 2,
  DMGAMP: 5,
  DMGADD: 4,
  SKILLDMG: 4,
}

export function itemScore(item: Item): number {
  let s = 0
  for (const e of applyEnchant(item.type.entry, item.enchantlvl)) s += Number(e.value) * (SCORE_W[e.type] ?? 1)
  for (const e of applyEnchant(item.extraEntry, item.enchantlvl)) s += Number(e.value) * (SCORE_W[e.type] ?? 1)
  for (const e of item.innate ?? []) s += Number(e.value) * (SCORE_W[e.type] ?? 1)
  return Math.round(s)
}

/** 物品在商店的挂牌价格。 */
export function shopPrice(item: Item): number {
  return fl(item.lv * item.quality.qualityCoefficient * (250 + 20 * item.lv))
}

// ---------------------------------------------------------------------------
// 升级 / 经验
// ---------------------------------------------------------------------------
/** 1 灵石 可转换为的 EXP 数量。 */
export const LINGSHI_TO_EXP = 10

/** 每秒获得的被动 EXP，随等级缩放。 */
export function autoExpPerSec(lv: number): number {
  return Math.max(1, lv)
}

/** 从 `lv` 升到 `lv + 1` 所需的 EXP。 */
export function expForLevel(lv: number): number {
  return Math.floor(40 * Math.pow(lv, 1.5) + 60 * lv)
}

/** 从状态 (lv, exp) 起恰好提升 `n` 个整级所需的总 EXP。 */
export function expToRaise(lv: number, exp: number, n: number): number {
  let total = Math.max(0, expForLevel(lv) - exp)
  for (let k = 1; k < n; k++) total += expForLevel(lv + k)
  return total
}

/** 从 (lv, exp) 提升 `n` 级所需的 灵石 花费——按每 灵石 LINGSHI_TO_EXP 点 exp 计价。 */
export function lingshiForLevels(lv: number, exp: number, n: number): number {
  return Math.ceil(expToRaise(lv, exp, n) / LINGSHI_TO_EXP)
}

// ---------------------------------------------------------------------------
// 主属性 (力量 / 体魄 / ...) —— 随等级成长，供给战斗
// ---------------------------------------------------------------------------
export interface Primary {
  STR: number // 力量 → 攻击
  VIT: number // 体魄 → 生命
  CON: number // 根骨 → 防御
  AGI: number // 敏捷 → 暴击
  SPR: number // 神识 → 法力
  LUCK: number // 气运 → 幸运
}

export const ZERO_PRIMARY: Primary = { STR: 0, VIT: 0, CON: 0, AGI: 0, SPR: 0, LUCK: 0 }

export function computePrimary(lv: number, reinCount: number): Primary {
  return {
    STR: lv * 3,
    VIT: lv * 4,
    CON: lv * 2,
    AGI: lv * 2,
    SPR: lv * 3,
    LUCK: lv + reinCount * 10,
  }
}

/** 每点主属性对战斗属性的贡献量。 */
export const PRIMARY_EFFECT = {
  STR: { stat: '攻击', per: 1 },
  VIT: { stat: '生命', per: 5 },
  CON: { stat: '防御', per: 1 },
  AGI: { stat: '暴击', per: 0.05 },
  SPR: { stat: '法力', per: 4 },
  LUCK: { stat: '幸运', per: 0 },
} as const

// ---------------------------------------------------------------------------
// 玩家属性计算（属性面板的核心）
// ---------------------------------------------------------------------------
export function computePlayerAttribute(
  equipment: { weapon: Item; armor: Item; ring: Item; neck: Item },
  rA: ReincarnationAttribute,
  prevHpRatio: number | null,
  primary: Primary = ZERO_PRIMARY,
): PlayerAttribute {
  let ATK = rA.ATK + primary.STR
  let DEF = rA.DEF + primary.CON
  let MAXHP = rA.HP + primary.VIT * 5
  let CRIT = rA.CRIT + Math.floor(primary.AGI * 0.05)
  let CRITDMG = rA.CRITDMG
  let BLOC = rA.BLOC

  const slots: Item[] = [equipment.weapon, equipment.armor, equipment.ring, equipment.neck]
  const entries: Entry[] = []
  for (const it of slots) {
    entries.push(...applyEnchant(it.type.entry, it.enchantlvl))
    entries.push(...applyEnchant(it.extraEntry, it.enchantlvl)) // 基础词条吃强化
    if (it.innate) entries.push(...it.innate) // 本体词条固定，不吃强化
  }

  let hitChance = 1
  for (const item of entries) {
    switch (item.type) {
      case 'ATK': ATK += Number(item.value); break
      case 'DEF': DEF += Number(item.value); break
      case 'HP': MAXHP += Number(item.value); break
      case 'CRIT': CRIT += Number(item.value); break
      case 'CRITDMG': CRITDMG += Number(item.value); break
      case 'EVA': hitChance *= 1 - Number(item.value) / 100; break
      case 'BLOC': BLOC += Number(item.value); break
      default: break
    }
  }

  let ATKP = 0, DEFP = 0, HPP = 0, BLOCP = 0
  let dmgAmp = 0 // 黄字：取最大
  let dmgAdd = 0 // 白字：加算
  let skillChain = 1 // 技能伤害：乘算
  for (const item of entries) {
    switch (item.type) {
      case 'ATKPERCENT': ATKP += Number(item.value); break
      case 'DEFPERCENT': DEFP += Number(item.value); break
      case 'HPPERCENT': HPP += Number(item.value); break
      case 'BLOCPERCENT': BLOCP += Number(item.value); break
      case 'DMGAMP': dmgAmp = Math.max(dmgAmp, Number(item.value)); break
      case 'DMGADD': dmgAdd += Number(item.value); break
      case 'SKILLDMG': skillChain *= 1 + Number(item.value) / 100; break
      default: break
    }
  }

  ATK = fl((ATK * (100 + ATKP)) / 100)
  DEF = fl((DEF * (100 + DEFP)) / 100)
  MAXHP = fl((MAXHP * (100 + HPP)) / 100)
  BLOC = fl((BLOC * (100 + BLOCP)) / 100)
  const EVA = round2((1 - hitChance) * 100)

  MAXHP += 200
  const CURHP = prevHpRatio != null ? fl(MAXHP * prevHpRatio) : MAXHP
  CRITDMG += 150

  const crit = CRIT > 100 ? 100 : CRIT
  const DPS = (1 - crit / 100) * ATK + (crit / 100) * (CRITDMG / 100) * ATK
  const REDUCDMG = 1 - (0.05 * DEF) / (1 + 0.0525 * DEF)

  const mk = (value: number, show: string) => ({ value, showValue: show })
  return {
    CURHP: mk(CURHP, `${CURHP}`),
    MAXHP: mk(MAXHP, `${MAXHP}`),
    ATK: mk(ATK, `+${ATK}`),
    DEF: mk(DEF, `+${DEF}`),
    CRIT: mk(CRIT, `+${CRIT}%`),
    CRITDMG: mk(CRITDMG, `+${CRITDMG}%`),
    BLOC: mk(BLOC, `+${BLOC}`),
    EVA: mk(EVA, `${EVA}%`),
    REDUCDMG,
    DPS,
    DMGAMP: round2(dmgAmp),
    DMGADD: round2(dmgAdd),
    SKILLDMG: round2((skillChain - 1) * 100),
  }
}

// ---------------------------------------------------------------------------
// 副本生成
// ---------------------------------------------------------------------------
function difficultyName(d: DungeonDifficulty): string {
  return d === 1 ? '普通' : d === 2 ? '困难' : '极难'
}

/** 按等级层级划分的主题化副本名称。 */
const DUNGEON_NAMES: { max: number; names: string[] }[] = [
  { max: 15, names: ['新手林地', '野狼谷', '碎石坡', '萤火沼泽', '蛛丝洞窟', '青苔矿洞', '落叶谷'] },
  { max: 40, names: ['幽暗密林', '白骨荒原', '赤焰峡谷', '寒霜山道', '毒雾湿地', '废弃矿坑', '群狼岭'] },
  { max: 80, names: ['亡灵墓园', '熔岩深渊', '雷鸣高地', '魔化古林', '枯骨战场', '幽鬼回廊', '蚀骨沼泽'] },
  { max: 150, names: ['血色战场', '龙脊山脉', '幽冥地宫', '混沌裂谷', '焚天火海', '万魔窟', '镇妖塔'] },
  { max: Infinity, names: ['九幽炼狱', '仙魔战场', '弑神之巅', '鸿蒙秘境', '太虚幻境', '诸天万界', '混沌之心'] },
]

function pickDungeonName(lv: number): string {
  const tier = DUNGEON_NAMES.find((t) => lv <= t.max) ?? DUNGEON_NAMES[DUNGEON_NAMES.length - 1]
  return tier.names[fl(R() * tier.names.length)]
}

function monsterEvent(elv: number, df: number): DungeonEvent {
  return {
    name: '怪物',
    type: 'monster',
    lv: elv,
    attribute: {
      HP: fl(elv * Math.pow(elv, 1.1) * (R() * 5 + 16) * df),
      ATK: fl(elv * Math.pow(elv, 1.1) * (R() * 1 + 2) * df),
    },
    trophy: {
      gold: fl(Math.pow(elv, 1.16) * (R() * 5 + 11) * df),
      equip: [0.2 * df, 0.08 * df, 0.03 * df, 0 * df],
    },
  }
}

export function createRandomDungeon(lv: number, difficulty: DungeonDifficulty): Dungeon {
  lv = lv || 1
  const df = difficulty === 1 ? 1 : difficulty === 2 ? 1.15 : 1.4
  const lvMin = Math.max(1, lv - 2)
  const lvMax = Math.max(lvMin, lv + 2)

  // 4 个怪物从 lvMin 逐级逼近首领；首领位于 lvMax。
  const events: DungeonEvent[] = []
  for (let i = 0; i < 4; i++) events.push(monsterEvent(Math.max(1, lv - 2 + i), df))
  events.push({
    name: '首领',
    type: 'boss',
    lv: lvMax,
    attribute: {
      HP: fl(lvMax * Math.pow(lvMax, 1.1) * (R() * 5 + 30) * df),
      ATK: fl(lvMax * Math.pow(lvMax, 1.1) * (R() * 1 + 3) * df),
    },
    trophy: {
      gold: fl(Math.pow(lvMax, 1.16) * (R() * 10 + 28) * df),
      equip: [0.25 - 0.05 * df, 0.55 - 0.15 * df, 0.15 + 0.15 * df, 0.05 + 0.05 * df],
    },
  })

  return {
    id: uid('dg'),
    name: pickDungeonName(lv),
    eventNum: 5,
    lv,
    lvMin,
    lvMax,
    needDPS: fl(lvMax * Math.pow(lvMax, 1.3) * 2 * difficulty),
    difficulty,
    difficultyName: difficultyName(difficulty),
    top: `${R() * 70 + 15}%`,
    left: `${R() * 70 + 10}%`,
    eventType: events,
  }
}

/** 围绕玩家等级构建副本列表（与原版刷新规则一致）。 */
export function refreshDungeonList(playerLv: number): Dungeon[] {
  const list: Dungeon[] = []
  const Co = [0.85, 0.1, 0.05]

  const rollDifficulty = (): DungeonDifficulty => {
    const r = R()
    if (r <= Co[0]) return 1
    if (r < Co[0] + Co[1]) return 2
    return 3
  }
  const scaledLv = (i: number): number => {
    if (i > 100) return fl(playerLv * (100 + (i - playerLv)) / 100)
    return i
  }

  for (let i = playerLv - 1; i > playerLv - 5; i--) {
    if (i < 1) break
    const difficulty = rollDifficulty()
    const lv = scaledLv(i)
    list.push(createRandomDungeon(lv, 1))
    if (difficulty !== 1) list.push(createRandomDungeon(lv, difficulty))
  }
  for (let i = playerLv; i < playerLv + 6; i++) {
    const difficulty = rollDifficulty()
    const lv = scaledLv(i)
    list.push(createRandomDungeon(lv, 1))
    if (difficulty !== 1) list.push(createRandomDungeon(lv, difficulty))
  }
  return list
}

/** 为给定的无尽层数构建一个无尽模式副本。 */
export function createEndlessDungeon(endlessLv: number): Dungeon {
  const d = createRandomDungeon(endlessLv * 5, 3)
  d.lv = endlessLv
  d.lvMin = endlessLv
  d.lvMax = endlessLv
  d.type = 'endless'
  d.name = `无尽 · 第${endlessLv}层`
  return d
}

// ---------- 深渊 (深渊) 模式 ----------
// 与无尽并行的纯掉落模式：需消耗金币进入，只掉落装备，且
// 掉率提升（无 灵石）。玩家选择一个难度档位 (副本级别)，其数值成长
// 刻意设计为非等差；层级 (深渊层级) 像无尽一样递增。

export interface AbyssTier {
  key: string
  name: string
  /** 副本级别 —— 用于花费与怪物强度的基准等级（非等差）。 */
  level: number
  /** 在基准等级属性之上的怪物 HP/ATK 乘数。 */
  monsterMul: number
  /** 相对普通副本的基础装备掉率乘数。 */
  dropMul: number
}

export const ABYSS_TIERS: AbyssTier[] = [
  { key: 't1', name: '微光裂隙', level: 20, monsterMul: 1.0, dropMul: 1.6 },
  { key: 't2', name: '幽暗深穴', level: 45, monsterMul: 1.7, dropMul: 2.2 },
  { key: 't3', name: '炼狱熔渊', level: 90, monsterMul: 2.8, dropMul: 3.0 },
  { key: 't4', name: '虚空回廊', level: 160, monsterMul: 4.5, dropMul: 3.9 },
  { key: 't5', name: '混沌深渊', level: 280, monsterMul: 7.2, dropMul: 5.0 },
]

export function abyssTierByKey(key: string): AbyssTier {
  return ABYSS_TIERS.find((t) => t.key === key) ?? ABYSS_TIERS[0]
}

/** 进入所需金币：副本级别 × 角色等级 × 深渊层级。 */
export function abyssEntryCost(tier: AbyssTier, charLv: number, abyssLv: number): number {
  return Math.floor(tier.level * Math.max(1, charLv) * Math.max(1, abyssLv))
}

/** 为某个档位 + 层级构建一个深渊副本：怪物更强、无 灵石、掉落提升。 */
export function createAbyssDungeon(tier: AbyssTier, abyssLv: number): Dungeon {
  const effLv = Math.max(1, Math.round(tier.level * (1 + (abyssLv - 1) * 0.12)))
  const d = createRandomDungeon(effLv, 3)
  d.type = 'abyss'
  d.lv = abyssLv
  d.lvMin = effLv
  d.lvMax = effLv
  d.name = `${tier.name} · 第${abyssLv}层`
  // 层级越高掉落越多；按档位缩放怪物强度
  const dropBoost = tier.dropMul * (1 + (abyssLv - 1) * 0.05)
  for (const ev of d.eventType) {
    ev.attribute.HP = fl(ev.attribute.HP * tier.monsterMul)
    ev.attribute.ATK = fl(ev.attribute.ATK * tier.monsterMul)
    ev.trophy.gold = 0 // 深渊不给 灵石
    // 在保持品质分布的前提下提升总掉落率。equip[] 是一个按品质划分的
    // 概率向量，以有序累积掷取的方式消费（最差品质在前），
    // 因此逐桶相乘会把概率前置堆到最差档位上。
    // 改为整体缩放该向量，使其总和 (= 总掉落几率) 向上限靠拢。
    const sum = ev.trophy.equip.reduce((s, p) => s + p, 0)
    if (sum > 0) {
      const target = Math.max(sum, Math.min(0.995, sum * dropBoost))
      const k = target / sum
      ev.trophy.equip = ev.trophy.equip.map((p) => p * k)
    }
  }
  return d
}

// ---------- 矿场 (mine) ----------
// 无风险的经济副本：当矿奴，一边挖矿一边稳定获得微薄的 灵石，没有战斗、不掉血。
// 适合起步经济差时用来攒钱；收益随等级缓慢增长，但始终远低于打副本的产出。

/** 每挖矿周期获得的 灵石（微薄，随等级缓慢增长）。 */
export function mineYield(lv: number): number {
  return Math.floor(5 + Math.max(1, lv) * 1.5)
}

/** 构造矿场副本（无战斗、无等级）。 */
export function createMineDungeon(): Dungeon {
  return {
    id: uid('mine'),
    name: '矿场',
    eventNum: 1,
    lv: 0,
    lvMin: 0,
    lvMax: 0,
    needDPS: 0,
    difficulty: 1,
    difficultyName: '',
    top: '6%',
    left: '36%',
    eventType: [],
    type: 'mine',
  }
}
