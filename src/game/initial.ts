import type { Item, Quality, ReincarnationAttribute } from './types'
import { uid } from './formulas'

const WORN: Quality = {
  name: '破旧',
  qualityCoefficient: 0.7,
  probability: '0.25',
  color: '#a1a1a1',
  extraEntryNum: 1,
}

export function initialWeapon(): Item {
  return {
    id: uid(),
    lv: 1,
    itemType: 'weapon',
    quality: WORN,
    icon: '🗡️',
    type: {
      name: '新手短剑',
      des: '新手菜鸡使用的短剑',
      icon: '🗡️',
      entry: [{ type: 'ATK', name: '攻击力', valCoefficient: 0.9, value: 1, showVal: '+1' }],
    },
    extraEntry: [{ type: 'ATK', name: '攻击力', value: 1, showVal: '+1' }],
    enchantlvl: 0,
  }
}

export function initialArmor(): Item {
  return {
    id: uid(),
    lv: 1,
    itemType: 'armor',
    quality: WORN,
    icon: '🛡️',
    type: {
      name: '新手布衣',
      des: '新手菜鸡穿的普通衣物',
      icon: '🛡️',
      entry: [{ type: 'DEF', name: '防御力', valCoefficient: 0.9, value: 1, showVal: '+1' }],
    },
    extraEntry: [{ type: 'HP', name: '生命值', value: 10, showVal: '+10' }],
    enchantlvl: 0,
  }
}

export function initialNeck(): Item {
  return {
    id: uid(),
    lv: 1,
    itemType: 'neck',
    quality: WORN,
    icon: '📿',
    type: {
      name: '新手项坠',
      des: '一个普通的项坠',
      icon: '📿',
      entry: [{ type: 'HP', name: '生命值', valCoefficient: 0.9, value: 20, showVal: '+20' }],
    },
    extraEntry: [{ type: 'CRIT', name: '暴击率', value: 10, showVal: '+10%' }],
    enchantlvl: 0,
  }
}

export function initialRing(): Item {
  return {
    id: uid(),
    lv: 1,
    itemType: 'ring',
    quality: WORN,
    icon: '💍',
    type: {
      name: '新手指环',
      des: '一个普通的指环',
      icon: '💍',
      entry: [{ type: 'HP', name: '生命值', valCoefficient: 0.9, value: 20, showVal: '+20' }],
    },
    extraEntry: [{ type: 'CRIT', name: '暴击率', value: 10, showVal: '+10%' }],
    enchantlvl: 0,
  }
}

export const EMPTY_REINCARNATION_ATTR: ReincarnationAttribute = {
  HP: 0,
  ATK: 0,
  CRIT: 0,
  CRITDMG: 0,
  DEF: 0,
  BLOC: 0,
  MOVESPEED: 0,
  BATTLESPEED: 0,
}

export const BACKPACK_SIZE = 1000
export const SHOP_SIZE = 5
