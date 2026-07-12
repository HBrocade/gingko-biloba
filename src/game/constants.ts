import type { AttrType, ItemType, Quality } from './types'

/** 武器和护甲的品质等级（系数更高）。 */
export const QUALITY_WEAPON_ARMOR: Quality[] = [
  { name: '破旧', qualityCoefficient: 0.7, probability: '0.25', color: '#a1a1a1', extraEntryNum: 1 },
  { name: '普通', qualityCoefficient: 1, probability: '0.55', color: '#ffffff', extraEntryNum: 2 },
  { name: '神器', qualityCoefficient: 1.5, probability: '0.15', color: '#ff4dff', extraEntryNum: 3 },
  { name: '史诗', qualityCoefficient: 2, probability: '0.05', color: '#f78918', extraEntryNum: 4 },
  { name: '独特', qualityCoefficient: 2.2, probability: '0', color: '#ff3b3b', extraEntryNum: 5 },
]

/** 戒指和项链的品质等级（系数略低）。 */
export const QUALITY_RING_NECK: Quality[] = [
  { name: '破旧', qualityCoefficient: 0.6, probability: '0.25', color: '#a1a1a1', extraEntryNum: 1 },
  { name: '普通', qualityCoefficient: 0.9, probability: '0.55', color: '#ffffff', extraEntryNum: 2 },
  { name: '神器', qualityCoefficient: 1.3, probability: '0.15', color: '#ff4dff', extraEntryNum: 3 },
  { name: '史诗', qualityCoefficient: 1.6, probability: '0.05', color: '#f78918', extraEntryNum: 4 },
  { name: '独特', qualityCoefficient: 2, probability: '0', color: '#ff3b3b', extraEntryNum: 5 },
]

export function qualityTable(itemType: ItemType): Quality[] {
  return itemType === 'weapon' || itemType === 'armor' ? QUALITY_WEAPON_ARMOR : QUALITY_RING_NECK
}

/** 随机抽取品质时使用的概率权重。 */
export const QUALITY_PROBABILITY = [0.25, 0.55, 0.15, 0.05]

/** 装备槽位的展示元数据。 */
export const SLOT_META: Record<ItemType, { label: string; icon: string }> = {
  weapon: { label: '武器', icon: '⚔️' },
  armor: { label: '护甲', icon: '🛡️' },
  ring: { label: '戒指', icon: '💍' },
  neck: { label: '项链', icon: '📿' },
}

/** 属性类型的展示元数据（名称 + 图标）。 */
export const ATTR_META: Record<AttrType, { name: string; icon: string; percent?: boolean }> = {
  ATK: { name: '攻击力', icon: '🗡️' },
  DEF: { name: '防御力', icon: '🛡️' },
  HP: { name: '生命值', icon: '❤️' },
  CRIT: { name: '暴击率', icon: '💥', percent: true },
  CRITDMG: { name: '暴击伤害', icon: '☄️', percent: true },
  BLOC: { name: '格挡', icon: '🔰' },
  EVA: { name: '闪避', icon: '💨', percent: true },
  ATKPERCENT: { name: '攻击力', icon: '🗡️', percent: true },
  DEFPERCENT: { name: '防御力', icon: '🛡️', percent: true },
  HPPERCENT: { name: '生命值', icon: '❤️', percent: true },
  BLOCPERCENT: { name: '格挡', icon: '🔰', percent: true },
  DMGAMP: { name: '伤害增幅', icon: '🟡', percent: true },
  DMGADD: { name: '伤害附加', icon: '⚪', percent: true },
  SKILLDMG: { name: '技能伤害', icon: '🔵', percent: true },
}

/** 特殊伤害词条的文本颜色（黄字 / 白字 / 技能伤害）。 */
export const AFFIX_COLOR: Partial<Record<AttrType, string>> = {
  DMGAMP: '#ffd23f', // 黄字
  DMGADD: '#ffffff', // 白字
  SKILLDMG: '#4db8ff', // 技能伤害（青字）
}

export const QUALITY_NAMES = ['破旧', '普通', '神器', '史诗', '独特'] as const
