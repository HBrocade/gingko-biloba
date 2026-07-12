import { DMGAMP_CHANCE, INNATE_COUNT, ITEM_DATA, RECAST_POOL } from './itemData'
import { qualityTable, QUALITY_PROBABILITY } from './constants'
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

// ---- small helpers ----
const R = Math.random
const fl = (n: number) => Math.floor(n)
const round2 = (n: number) => Math.round(n * 100) / 100

let _idc = 0
export function uid(prefix = 'it'): string {
  _idc += 1
  return `${prefix}_${Date.now().toString(36)}_${_idc.toString(36)}_${fl(R() * 1e6).toString(36)}`
}

/** Attribute types whose display value carries a %. */
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
  return isPercentDisplay(type) ? `+${value}%` : `+${value}`
}

// ---------------------------------------------------------------------------
// Enhancement (强化)
// ---------------------------------------------------------------------------
/** Multiplier applied to base entries at a given enhancement level. */
export function enchantMultiplier(lv: number): number {
  if (!lv) return 1
  return Math.pow(1.055, Math.pow(lv, 1.1))
}

/** Return a copy of base entries with the enhancement level baked in. */
export function applyEnchant(entries: Entry[], lv: number): Entry[] {
  const a = enchantMultiplier(lv)
  return entries.map((item) => {
    const value = Math.round(a * item.value)
    return { ...item, value, showVal: showVal(item.type, value) }
  })
}

// ---------------------------------------------------------------------------
// Item generation
// ---------------------------------------------------------------------------
/** Roll a base-entry value (per-slot rules preserved from the original). */
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
      return fl(fl(R() * 5 + 10) * qc * valCoef) // ring / neck use valCoef
    case 'CRITDMG':
      if (slot === 'weapon' || slot === 'armor') return fl(fl(R() * 20 + 20) * qc)
      return fl(fl(R() * 20 + 30) * qc * valCoef) // ring / neck use valCoef
    case 'BLOC':
      if (slot === 'armor') return Math.max(1, fl(fl(lv * 1.3 + (R() * lv / 2 + 1)) * qc))
      return Math.max(1, fl(fl(lv * 0.4 + (R() * lv / 2 + 1)) * qc)) // weapon / neck
    default:
      return 0
  }
}

// ---- Affix quality value system (extra + innate affixes) ----
/** Baseline magnitude of an affix type before quality & enchant. */
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

/** Value at quality q∈[0,1]: 0.5x (q=0) .. 1.5x (q=1) of the baseline, scaled by quality coef. */
export function affixValue(type: AttrType, lv: number, qc: number, q: number): number {
  const mag = baseAffixMagnitude(type, lv) * qc * (0.5 + q)
  return isPercentDisplay(type) ? round2(mag) : Math.max(1, Math.round(mag))
}

/** Build an affix entry with a given quality roll. */
function makeAffix(type: AttrType, name: string, lv: number, qc: number, q: number): Entry {
  const value = affixValue(type, lv, qc, q)
  return { type, name, value, showVal: showVal(type, value), q }
}

/** Roll a random quality index using the weighted table. */
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
 * Generate a new item.
 * @param slot which equipment slot
 * @param qualityIndex 0..4, or -1 to roll a random quality
 * @param lv item level, or 0 to roll a random level (1..39)
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
// Reforge (重铸, change type) & 品质洗礼 (baptism, reroll value quality)
// ---------------------------------------------------------------------------
/** Reforge a base-stat affix into a specific type at fixed mid quality (固定数值). */
export function createEntryOfType(lv: number, qc: number, type: AttrType): Entry {
  const name = RECAST_POOL.find((p) => p.type === type)?.name ?? type
  return makeAffix(type, name, lv, qc, 0.5)
}

/** Reforge into a random base-stat type at fixed mid quality. */
export function createRandomEntry(lv: number, qc: number): Entry {
  const pick = RECAST_POOL[fl(R() * RECAST_POOL.length)]
  return createEntryOfType(lv, qc, pick.type)
}

/** 品质洗礼: reroll one affix's quality (keeps type / name / locked). */
export function baptizeAffix(affix: Entry, lv: number, qc: number): Entry {
  const q = R()
  const value = affixValue(affix.type, lv, qc, q)
  return { ...affix, value, showVal: showVal(affix.type, value), q }
}

// ---------------------------------------------------------------------------
// Enhancement cost / reforge cost
// ---------------------------------------------------------------------------
export function strengthenNeedGold(item: Item): number {
  return (
    fl((item.lv + 1) * Math.pow(1.1, Math.pow(item.enchantlvl, 1.1)) * (10 + item.lv / 5)) + 100
  )
}

export function recastNeedGold(item: Item): number {
  return fl((item.lv * item.quality.qualityCoefficient * (200 + 10 * item.lv)) / 4)
}

/** 品质洗礼 cost — grows with the number of locked affixes (locking is a premium). */
export function baptizeNeedGold(item: Item, lockedCount: number): number {
  return fl(recastNeedGold(item) * (1 + lockedCount * 0.8))
}

/** Chance an enhancement attempt succeeds at the given current level. */
export function enchantSuccessRate(lv: number): number {
  if (lv <= 5) return 1
  if (lv === 6) return 0.8
  if (lv === 7) return 0.65
  if (lv === 8) return 0.45
  if (lv === 9) return 0.3
  return 0.2
}

/** Gold from selling an item. */
export function sellPrice(item: Item): number {
  return fl(item.lv * item.quality.qualityCoefficient * 30)
}

/** Rough power score for an item — used to rank the backpack. Cross-slot comparable. */
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

/** Shop listing price for an item. */
export function shopPrice(item: Item): number {
  return fl(item.lv * item.quality.qualityCoefficient * (250 + 20 * item.lv))
}

// ---------------------------------------------------------------------------
// Leveling / experience
// ---------------------------------------------------------------------------
export const LEVEL_CAP = 999

/** 1 灵石 converts to this much EXP. */
export const LINGSHI_TO_EXP = 10

/** Passive EXP gained per second, scaling with level. */
export function autoExpPerSec(lv: number): number {
  return Math.max(1, lv)
}

/** EXP required to advance from `lv` to `lv + 1`. */
export function expForLevel(lv: number): number {
  return Math.floor(40 * Math.pow(lv, 1.5) + 60 * lv)
}

/** Total EXP needed to raise exactly `n` full levels from the state (lv, exp). */
export function expToRaise(lv: number, exp: number, n: number): number {
  let total = Math.max(0, expForLevel(lv) - exp)
  for (let k = 1; k < n; k++) total += expForLevel(lv + k)
  return total
}

/** 灵石 cost to raise `n` levels from (lv, exp) — priced at LINGSHI_TO_EXP exp per 灵石. */
export function lingshiForLevels(lv: number, exp: number, n: number): number {
  return Math.ceil(expToRaise(lv, exp, n) / LINGSHI_TO_EXP)
}

// ---------------------------------------------------------------------------
// Primary character attributes (力量 / 体魄 / ...) — grow with level, feed combat
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

/** How much each primary attribute contributes to combat stats. */
export const PRIMARY_EFFECT = {
  STR: { stat: '攻击', per: 1 },
  VIT: { stat: '生命', per: 5 },
  CON: { stat: '防御', per: 1 },
  AGI: { stat: '暴击', per: 0.05 },
  SPR: { stat: '法力', per: 4 },
  LUCK: { stat: '幸运', per: 0 },
} as const

// ---------------------------------------------------------------------------
// Player attribute calculation (the heart of the stat sheet)
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
// Dungeon generation
// ---------------------------------------------------------------------------
function difficultyName(d: DungeonDifficulty): string {
  return d === 1 ? '普通' : d === 2 ? '困难' : '极难'
}

/** Themed dungeon names by level tier. */
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

  // 4 monsters climb from lvMin toward the boss; boss sits at lvMax.
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

/** Build the dungeon list around a player level (matches original refresh rules). */
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

/** Build an endless-mode dungeon for a given endless level. */
export function createEndlessDungeon(endlessLv: number): Dungeon {
  const d = createRandomDungeon(endlessLv * 5, 3)
  d.lv = endlessLv
  d.lvMin = endlessLv
  d.lvMax = endlessLv
  d.type = 'endless'
  d.name = `无尽 · 第${endlessLv}层`
  return d
}
