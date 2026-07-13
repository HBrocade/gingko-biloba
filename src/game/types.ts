// ---- 放置类 RPG 的核心类型定义 ----

/** 词条 / 词缀可赋予的每一种属性。 */
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

/** 品质等级索引：0 破旧 · 1 普通 · 2 神器 · 3 史诗 · 4 独特 */
export type QualityIndex = 0 | 1 | 2 | 3 | 4

export interface Quality {
  name: string
  qualityCoefficient: number
  probability: string
  color: string
  extraEntryNum: number
}

/** 装备上的单条属性（基础词条或随机词缀）。 */
export interface Entry {
  type: AttrType
  name: string
  value: number
  showVal: string
  /** 仅出现在基础词条上——根据装备等级缩放数值。 */
  valCoefficient?: number
  /** 可重铸/固有词缀的品质掷值 0..1——品质洗礼会重掷该值。 */
  q?: number
  /** 该词缀是否被锁定（不受品质洗礼影响）。 */
  locked?: boolean
}

export interface ItemTemplate {
  name: string
  des: string
  icon: string
  entry: Entry[]
}

export interface Item {
  /** 唯一运行时 id，保证 React 列表 / 背包操作的稳定性。 */
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
  /** 商店价格，仅出现在商店物品上。 */
  gold?: number
}

/** 计算得到的玩家属性值 + 显示字符串。 */
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
  /** 由护甲推导的受伤比例（0..1，越低越好）。 */
  REDUCDMG: number
  /** 每秒伤害（原始普攻，黄字/白字 加成之前）。 */
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
  /** 该事件自身的等级（事件覆盖副本的等级范围）。 */
  lv: number
  attribute: { HP: number; ATK: number }
  trophy: {
    gold: number
    /** 各品质的掉落概率 [破旧, 普通, 神器, 史诗]。 */
    equip: number[]
  }
}

export interface Dungeon {
  id: string
  name: string
  eventNum: number
  /** 代表性（中心）等级。 */
  lv: number
  /** 该副本事件所覆盖的等级范围。 */
  lvMin: number
  lvMax: number
  needDPS: number
  difficulty: DungeonDifficulty
  difficultyName: string
  top: string
  left: string
  eventType: DungeonEvent[]
  /** 用于特殊模式：无尽（灵石）/ 深渊（装备）/ 矿场（无风险挖矿）。 */
  type?: 'endless' | 'abyss' | 'mine'
}

export type SysInfoType = '' | 'warning' | 'battle' | 'win' | 'trophy'

export interface SysInfo {
  type: SysInfoType
  msg: string
  time?: string
  equip?: Item[]
}
