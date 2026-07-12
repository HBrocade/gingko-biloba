// ---- Core type definitions for the idle RPG ----

/** Every attribute an entry / affix can grant. */
export type AttrType =
  | 'ATK'
  | 'DEF'
  | 'HP'
  | 'CRIT'
  | 'CRITDMG'
  | 'BLOC'
  | 'EVA'
  | 'ATKPERCENT'
  | 'DEFPERCENT'
  | 'HPPERCENT'
  | 'BLOCPERCENT'
  | 'DMGAMP' // 黄字 · 伤害增幅（只取最大值）
  | 'DMGADD' // 白字 · 伤害附加（加算）
  | 'SKILLDMG' // 技能伤害（乘算）

export type ItemType = 'weapon' | 'armor' | 'ring' | 'neck'

/** Quality tier index: 0 破旧 · 1 普通 · 2 神器 · 3 史诗 · 4 独特 */
export type QualityIndex = 0 | 1 | 2 | 3 | 4

export interface Quality {
  name: string
  qualityCoefficient: number
  probability: string
  color: string
  extraEntryNum: number
}

/** A single stat line on an item (either a base entry or a random affix). */
export interface Entry {
  type: AttrType
  name: string
  value: number
  showVal: string
  /** Only present on base entries — scales the value with item level. */
  valCoefficient?: number
  /** Quality roll 0..1 for reforgeable/innate affixes — 品质洗礼 rerolls this. */
  q?: number
  /** Whether this affix is locked (protected from 品质洗礼). */
  locked?: boolean
}

export interface ItemTemplate {
  name: string
  des: string
  icon: string
  entry: Entry[]
}

export interface Item {
  /** Unique runtime id so React lists / inventory ops are stable. */
  id: string
  lv: number
  itemType: ItemType
  quality: Quality
  icon: string
  type: {
    name: string
    des: string
    icon: string
    entry: Entry[]
  }
  extraEntry: Entry[]
  /** 本体固定词条（黄字/白字/技能伤害）——掉落时生成，无法重铸/强化改变。 */
  innate?: Entry[]
  enchantlvl: number
  locked?: boolean
  /** Shop price, only present on shop items. */
  gold?: number
}

/** A computed player attribute value + display string. */
export interface AttrValue {
  value: number
  showValue: string
}

export interface PlayerAttribute {
  CURHP: AttrValue
  MAXHP: AttrValue
  ATK: AttrValue
  DEF: AttrValue
  CRIT: AttrValue
  CRITDMG: AttrValue
  BLOC: AttrValue
  EVA: AttrValue
  /** Damage-taken ratio derived from armor (0..1, lower = better). */
  REDUCDMG: number
  /** Damage-per-second (raw auto-attack, before 黄字/白字 multipliers). */
  DPS: number
  /** 黄字 · 伤害增幅 %：取所有装备的最大值。 */
  DMGAMP: number
  /** 白字 · 伤害附加 %：所有装备加算。 */
  DMGADD: number
  /** 技能伤害 %：所有装备乘算后的合计增幅。 */
  SKILLDMG: number
}

export interface ReincarnationAttribute {
  HP: number
  ATK: number
  CRIT: number
  CRITDMG: number
  DEF: number
  BLOC: number
  MOVESPEED: number
  BATTLESPEED: number
}

export interface Reincarnation {
  count: number
  point: number
}

export type DungeonDifficulty = 1 | 2 | 3

export interface DungeonEvent {
  name: string
  type: 'monster' | 'boss'
  /** This event's own level (events span the dungeon's level range). */
  lv: number
  attribute: { HP: number; ATK: number }
  trophy: {
    gold: number
    /** Drop probabilities per quality [破旧, 普通, 神器, 史诗]. */
    equip: number[]
  }
}

export interface Dungeon {
  id: string
  name: string
  eventNum: number
  /** Representative (center) level. */
  lv: number
  /** Level range spanned by this dungeon's events. */
  lvMin: number
  lvMax: number
  needDPS: number
  difficulty: DungeonDifficulty
  difficultyName: string
  top: string
  left: string
  eventType: DungeonEvent[]
  /** Set for the endless dungeon. */
  type?: 'endless'
}

export type SysInfoType = '' | 'warning' | 'battle' | 'win' | 'trophy'

export interface SysInfo {
  type: SysInfoType
  msg: string
  time?: string
  equip?: Item[]
}
