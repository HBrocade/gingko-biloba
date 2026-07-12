import type { AttrType, Entry, ItemTemplate, ItemType } from './types'

/** 简洁地声明基础词条模板的辅助函数。 */
function e(type: AttrType, name: string, valCoefficient: number): Entry {
  return { type, name, valCoefficient, value: 0, showVal: '' }
}

/** 随机词缀池的一个选项（数值在生成时随机掷出）。 */
function a(type: AttrType, name: string): Entry {
  return { type, name, value: 0, showVal: '' }
}

/** 每个部位都具备的固有词缀：暴击伤害 + 白字 + 技伤（黄字不在池内，单独固定掉率）。 */
const UNIVERSAL_INNATE: Entry[] = [a('CRITDMG', '暴击伤害'), a('DMGADD', '伤害附加'), a('SKILLDMG', '技能伤害')]

/** 按品质名称决定物品获得多少个（不同类型的）固有词缀。 */
export const INNATE_COUNT: Record<string, number> = { 破旧: 0, 普通: 1, 神器: 2, 史诗: 3, 独特: 4 }

/** 黄字（伤害增幅）：所有品质装备统一的独立掉率——最稀有，绝大多数装备不产生。 */
export const DMGAMP_CHANCE = 0.04

// ---------------------------------------------------------------------------
// WEAPON
// ---------------------------------------------------------------------------
const WEAPON_CATEGORY: ItemTemplate[] = [
  { name: '狱岩石太刀', des: '用狱岩石制作的太刀，据说拥有让使用者潜力爆发的神秘力量', icon: '🗡️', entry: [e('ATK', '攻击力', 1.2), e('CRIT', '暴击率', 1.3)] },
  { name: '战士长剑', des: '六级战士使用的长剑', icon: '⚔️', entry: [e('ATK', '攻击力', 1.2), e('DEF', '防御力', 0.5)] },
  { name: '赤柳血刃', des: '似乎会给使用者提供生命气息', icon: '🩸', entry: [e('ATK', '攻击力', 1.3), e('HP', '生命值', 1.1)] },
  { name: '普通长剑', des: '朴实无华普通长剑，有的只有强力的攻击力', icon: '🗡️', entry: [e('ATK', '攻击力', 1.7)] },
  { name: '紫炎波刃剑', des: '传说中的狂战士最喜爱的剑。', icon: '🔥', entry: [e('ATK', '攻击力', 1.7)] },
  { name: '毛毛的爪子', des: '这？这也是武器？', icon: '🐾', entry: [e('ATK', '攻击力', 2), e('CRIT', '暴击率', 0.7)] },
  { name: '冰晶之刃', des: '剑锋覆盖着冰晶，碰到的敌人都会被冻住。', icon: '❄️', entry: [e('ATK', '攻击力', 1.4), e('CRITDMG', '暴击伤害', 1.3)] },
]

const WEAPON_UNIQUE: ItemTemplate[] = [
  { name: '创世亡命剑', des: '只有被选中的勇士才能唤醒它真正的力量。', icon: '🌟', entry: [e('ATK', '攻击力', 1.8), e('CRIT', '暴击率', 1.5), e('CRITDMG', '暴击伤害', 1.3)] },
  { name: '无名剑', des: '没有人知道它的来历。', icon: '🗿', entry: [e('ATK', '攻击力', 2.7), e('CRIT', '暴击率', 2.5)] },
  { name: '死亡之刃', des: '万物生自守恒，源力破则失。', icon: '💀', entry: [e('ATK', '攻击力', 1.8), e('CRIT', '暴击率', 1.5), e('CRITDMG', '暴击伤害', 1.3)] },
  { name: '霜龙利刃', des: '傲雪冷心绝，万念化冰华。', icon: '🐉', entry: [e('ATK', '攻击力', 1.8), e('CRIT', '暴击率', 1.5), e('CRITDMG', '暴击伤害', 1.3)] },
  { name: '阿加雷斯血色巨剑', des: '诚既勇兮又以武，终刚强兮不可凌。', icon: '🗡️', entry: [e('ATK', '攻击力', 1.8), e('CRIT', '暴击率', 1.5), e('CRITDMG', '暴击伤害', 1.3)] },
  { name: '神龙纳格林之刃', des: '神龙纳格林的爪子锻造的利刃', icon: '🐲', entry: [e('ATK', '攻击力', 2.8), e('CRITDMG', '暴击伤害', 2.2)] },
  { name: '大师大冒险家之剑', des: '大师大冒险家之剑', icon: '🎖️', entry: [e('ATK', '攻击力', 2.4), e('HP', '生命值', 1.8)] },
  { name: '六翼天使武刃', des: '六翼天使武刃', icon: '😇', entry: [e('ATK', '攻击力', 2.6), e('DEF', '防御力', 1.8)] },
  { name: '数珠丸恒次', des: '具体情况不明，传说为日莲上人所有', icon: '📿', entry: [e('ATK', '攻击力', 3.9)] },
  { name: '埃苏莱布斯军刀', des: '', icon: '🔪', entry: [e('ATK', '攻击力', 1.9), e('DEF', '防御力', 1.2), e('BLOC', '格挡', 1.2)] },
]

// 可重铸的基础词条（可换类型、可洗礼、吃强化）
const WEAPON_EXTRA: Entry[] = [a('ATK', '攻击力'), a('CRIT', '暴击率'), a('HP', '生命值'), a('DEF', '防御力')]
// 本体词条（部位百分比 + 暴击伤害 + 黄白技伤；不可重铸，可洗礼）
const WEAPON_INNATE: Entry[] = [a('ATKPERCENT', '攻击力'), ...UNIVERSAL_INNATE]

// ---------------------------------------------------------------------------
// ARMOR
// ---------------------------------------------------------------------------
const ARMOR_CATEGORY: ItemTemplate[] = [
  { name: '紫金守护胸甲', des: '够肉才能输出', icon: '🛡️', entry: [e('DEF', '防御力', 2), e('HP', '生命值', 0.6)] },
  { name: '战士重铠', des: '六级战士使用的重型铠甲', icon: '🛡️', entry: [e('DEF', '防御力', 1.1), e('HP', '生命值', 0.8)] },
  { name: '天权轻甲', des: '舍弃了防御性能的轻甲，攻击性能更加突出', icon: '🎽', entry: [e('DEF', '防御力', 0.7), e('HP', '生命值', 0.5), e('ATK', '攻击力', 0.5)] },
  { name: '赤柳血铠', des: '似乎会给使用者提供生命气息', icon: '🩸', entry: [e('DEF', '防御力', 0.9), e('HP', '生命值', 1.2)] },
  { name: '哈皮毛毛连身衣', des: '哈皮毛毛', icon: '🧥', entry: [e('DEF', '防御力', 0.8), e('HP', '生命值', 0.8), e('ATK', '攻击力', 0.4)] },
]

const ARMOR_UNIQUE: ItemTemplate[] = [
  { name: '红月的夜行衣', des: '', icon: '🌙', entry: [e('DEF', '防御力', 1.2), e('HP', '生命值', 1.5), e('ATK', '攻击力', 1.2)] },
  { name: '肃清者戎衣', des: '相传看到这一袭黑衣的人都死了。', icon: '🖤', entry: [e('HP', '生命值', 1.6), e('ATK', '攻击力', 2.4), e('BLOC', '格挡', 1.2)] },
  { name: '争执连身衣', des: '', icon: '👘', entry: [e('DEF', '防御力', 1.0), e('HP', '生命值', 1.4), e('ATK', '攻击力', 1.4)] },
  { name: '剑豪盔甲', des: '', icon: '🥋', entry: [e('DEF', '防御力', 2.1), e('HP', '生命值', 2.6)] },
  { name: '隐武士铠甲', des: '', icon: '🥷', entry: [e('DEF', '防御力', 1.3), e('HP', '生命值', 1.7), e('ATK', '攻击力', 0.9)] },
  { name: '芬撒里尔追踪者', des: '', icon: '🎯', entry: [e('DEF', '防御力', 0.9), e('CRITDMG', '暴击伤害', 1.7), e('ATK', '攻击力', 1.7)] },
  { name: '先代狂龙战士盔甲', des: '', icon: '🐉', entry: [e('DEF', '防御力', 1.5), e('BLOC', '格挡', 1.2), e('HP', '生命值', 1.4)] },
]

const ARMOR_EXTRA: Entry[] = [a('ATK', '攻击力'), a('HP', '生命值'), a('DEF', '防御力'), a('CRIT', '暴击率')]
const ARMOR_INNATE: Entry[] = [a('DEFPERCENT', '防御力'), a('HPPERCENT', '生命值'), ...UNIVERSAL_INNATE]

// ---------------------------------------------------------------------------
// RING
// ---------------------------------------------------------------------------
const RING_CATEGORY: ItemTemplate[] = [
  { name: '生命指环', des: '据说拥有增强佩戴者体质的神秘功效', icon: '💍', entry: [e('HP', '生命值', 1.1)] },
  { name: '毛毛指环', des: '喵喵戒指，上面有没有摸到毛毛jio的怨念', icon: '🐾', entry: [e('HP', '生命值', 0.9), e('ATK', '攻击力', 0.3), e('CRIT', '暴击率', 0.8)] },
  { name: '御魂之戒', des: '出来吧，卡赞！吸纳所有彷徨的灵魂！', icon: '💀', entry: [e('HP', '生命值', 0.7), e('ATK', '攻击力', 0.5)] },
]

const RING_UNIQUE: ItemTemplate[] = [
  { name: '真·毛毛指环', des: '', icon: '🐾', entry: [e('CRITDMG', '暴击伤害', 1.2), e('CRIT', '暴击率', 0.5), e('ATK', '攻击力', 0.7)] },
  { name: '死神名片戒指', des: '', icon: '💀', entry: [e('CRITDMG', '暴击伤害', 1.0), e('CRIT', '暴击率', 0.5), e('HP', '生命值', 0.8)] },
  { name: '先驱者戒指', des: '', icon: '🧭', entry: [e('CRITDMG', '暴击伤害', 1.0), e('CRIT', '暴击率', 0.5), e('HP', '生命值', 0.7)] },
  { name: '素盏呜尊的意志', des: '', icon: '⚡', entry: [e('CRITDMG', '暴击伤害', 1.6), e('ATK', '攻击力', 1.1)] },
  { name: '月夜见尊的意志', des: '', icon: '🌕', entry: [e('CRITDMG', '暴击伤害', 1.5), e('HP', '生命值', 1.2)] },
]

const RING_EXTRA: Entry[] = [a('ATK', '攻击力'), a('CRIT', '暴击率'), a('HP', '生命值'), a('DEF', '防御力')]
const RING_INNATE: Entry[] = [a('ATKPERCENT', '攻击力'), a('HPPERCENT', '生命值'), ...UNIVERSAL_INNATE]

// ---------------------------------------------------------------------------
// NECK
// ---------------------------------------------------------------------------
const NECK_CATEGORY: ItemTemplate[] = [
  { name: '十字军项链', des: '十字军佩戴的项链', icon: '✝️', entry: [e('DEF', '防御力', 0.9), e('HP', '生命值', 0.5), e('BLOC', '格挡', 0.6)] },
  { name: '冰龙凝雪', des: '冰龙凝雪', icon: '❄️', entry: [e('CRITDMG', '暴击伤害', 0.75), e('CRIT', '暴击率', 0.5), e('HP', '生命值', 0.5)] },
  { name: '银魂之眼', des: '银魂之眼', icon: '👁️', entry: [e('CRIT', '暴击率', 1.1), e('HP', '生命值', 0.5), e('ATK', '攻击力', 0.6)] },
]

const NECK_UNIQUE: ItemTemplate[] = [
  { name: '十字旅团降魔项链', des: '', icon: '✝️', entry: [e('ATK', '攻击力', 0.7), e('HP', '生命值', 0.8), e('DEF', '防御力', 0.9)] },
  { name: '进阶黑暗龙王项链', des: '', icon: '🐲', entry: [e('CRITDMG', '暴击伤害', 1.0), e('CRIT', '暴击率', 0.5), e('HP', '生命值', 0.8)] },
  { name: '伟大单身成员的项链', des: '真棒，真帅。有了这条帅气的项链，一辈子单身都不会孤独', icon: '💎', entry: [e('CRITDMG', '暴击伤害', 1.0), e('BLOC', '格挡', 1.2), e('HP', '生命值', 0.7)] },
  { name: '魔族之翼展', des: '你能看到什么呢', icon: '🦇', entry: [e('CRITDMG', '暴击伤害', 1.6), e('ATK', '攻击力', 1.6)] },
  { name: '伊帕娅之项链', des: '', icon: '📿', entry: [e('BLOC', '格挡', 0.9), e('DEF', '防御力', 0.9), e('HP', '生命值', 1.3)] },
]

const NECK_EXTRA: Entry[] = [a('ATK', '攻击力'), a('CRIT', '暴击率'), a('HP', '生命值'), a('DEF', '防御力'), a('BLOC', '格挡')]
const NECK_INNATE: Entry[] = [a('HPPERCENT', '生命值'), a('BLOCPERCENT', '格挡'), ...UNIVERSAL_INNATE]

// ---------------------------------------------------------------------------
export interface SlotData {
  category: ItemTemplate[]
  unique: ItemTemplate[]
  extra: Entry[]
  innatePool: Entry[]
  slotIcon: string
}

export const ITEM_DATA: Record<ItemType, SlotData> = {
  weapon: { category: WEAPON_CATEGORY, unique: WEAPON_UNIQUE, extra: WEAPON_EXTRA, innatePool: WEAPON_INNATE, slotIcon: '⚔️' },
  armor: { category: ARMOR_CATEGORY, unique: ARMOR_UNIQUE, extra: ARMOR_EXTRA, innatePool: ARMOR_INNATE, slotIcon: '🛡️' },
  ring: { category: RING_CATEGORY, unique: RING_UNIQUE, extra: RING_EXTRA, innatePool: RING_INNATE, slotIcon: '💍' },
  neck: { category: NECK_CATEGORY, unique: NECK_UNIQUE, extra: NECK_EXTRA, innatePool: NECK_INNATE, slotIcon: '📿' },
}

/** 重铸的目标类型——仅限基础属性（可重铸的基础词条）。 */
export const RECAST_POOL: { type: AttrType; name: string }[] = [
  { type: 'ATK', name: '攻击力' },
  { type: 'HP', name: '生命值' },
  { type: 'DEF', name: '防御力' },
  { type: 'CRIT', name: '暴击率' },
  { type: 'BLOC', name: '格挡' },
]
