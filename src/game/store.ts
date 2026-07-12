import { create } from 'zustand'
import type {
  AttrType,
  Dungeon,
  DungeonEvent,
  Item,
  ItemType,
  PlayerAttribute,
  Reincarnation,
  ReincarnationAttribute,
  SysInfo,
} from './types'
import {
  computePlayerAttribute,
  createEndlessDungeon,
  createAbyssDungeon,
  abyssEntryCost,
  abyssTierByKey,
  autoExpPerSec,
  baptizeAffix,
  baptizeNeedGold,
  computePrimary,
  createItem,
  createRandomEntry,
  enchantSuccessRate,
  expForLevel,
  expToRaise,
  itemScore,
  LINGSHI_TO_EXP,
  type Primary,
  recastNeedGold,
  refreshDungeonList,
  sellPrice,
  shopPrice,
  strengthenNeedGold,
  uid,
} from './formulas'
import { REIN_ATTRS, randomAllocateReincarnation } from './reincarnation'
import { fmtNum } from './format'
import {
  BACKPACK_SIZE,
  EMPTY_REINCARNATION_ATTR,
  initialArmor,
  initialNeck,
  initialRing,
  initialWeapon,
  SHOP_SIZE,
} from './initial'
import { RECAST_POOL } from './itemData'
import { b64decode, b64encode, SAVE_KEY } from './save'
import { DEFAULT_HERO } from '../assets/heroes'
import {
  maxMpFor,
  mpRegenFor,
  ownedSkillDefs,
  skillById,
  skillDpsDisplay,
} from './skills'

const SLOTS: ItemType[] = ['weapon', 'armor', 'ring', 'neck']
const MAX_LOG = 60

// ---- 战斗计时（模块级作用域，不属于渲染状态） ----
let battleTimer: ReturnType<typeof setInterval> | null = null
const BATTLE_TICK_MS = 50
const MOVE_STEP_BASE = 1.0
const ENEMY_ATK_MS = 700 // 实时对决中敌人的挥击间隔
const MAX_FIGHT_MS = 15000 // 僵局保护：超过这个时长后强制分出胜负
// 等比例放大双方的每次命中伤害，使战斗更快结束，且
// 胜负结果与承受的总伤害保持不变 —— 纯粹是节奏调整，而非数值平衡。
const COMBAT_SPEED = 2
let fxSeq = 0 // 单调递增的 id，便于 UI 重新触发每次命中的动画

/** 一次命中，暴露给战斗 UI 用于显示伤害数字 / 特效。 */
export interface FightHitFx {
  dmg: number
  crit?: boolean
  skill?: string
  id: number
}

/** 当前实时战斗的实时状态（非战斗时为 null）。 */
export interface FightState {
  enemyHp: number
  enemyMaxHp: number
  blocLeft: number // 剩余的一次性格挡缓冲（对应解析模型中的 CURHP+bloc）
  dmgTaken: number // 本场战斗中英雄累计承受的伤害
  fightStart: number
  nextHeroHit: number
  nextEnemyHit: number
  skillReady: Record<string, number> // skillId -> 下次可释放的时间戳
  heroFx: FightHitFx | null // 英雄对敌人的最近一次命中
  enemyFx: FightHitFx | null // 敌人对英雄的最近一次命中
}

export interface BattleState {
  dungeon: Dungeon
  left: number // 0..100 地图上的推进进度
  nextEvent: number // 1..5（下一个待处理事件的索引）
  phase: 'move' | 'fight'
  fightUntil: number // 胜利后停顿结束的时间戳
  lastResult: { win: boolean; name: string; dmg: number } | null
  fight: FightState | null
}

interface Equipment {
  weapon: Item
  armor: Item
  ring: Item
  neck: Item
}

export interface GameState {
  lv: number
  exp: number
  gold: number
  endlessLv: number
  abyssLv: number
  abyssTier: string
  reincarnation: Reincarnation
  reincarnationAttribute: ReincarnationAttribute
  equipment: Equipment
  attribute: PlayerAttribute
  primary: Primary
  healthRecoverySpeed: number
  heroId: string

  skills: string[]
  mp: number
  maxMp: number
  mpRegen: number
  skillDPS: number
  /** 完整加成后的 DPS（自动 + 技能，含 黄字/白字/技能伤害 倍率）—— 用于显示。 */
  totalDPS: number

  backpack: (Item | null)[]
  autoSell: boolean[]

  shop: (Item | null)[]
  shopRefreshLeft: number
  shopRegenSec: number

  dungeons: Dungeon[]
  selectedDungeon: Dungeon | null
  dungeonCd: number // 刷新冷却剩余秒数
  reChallenge: boolean
  upEChallenge: boolean
  reEChallenge: boolean
  upAChallenge: boolean
  reAChallenge: boolean

  battle: BattleState | null
  sysInfo: SysInfo[]

  strengthenTarget: Item | null
  strengthenIndex: number

  // ---- 操作 ----
  setHero: (id: string) => void
  buySkill: (id: string) => void
  gainExp: (amount: number) => void
  buyLevels: (n: number) => void
  log: (info: SysInfo) => void
  clearLog: () => void
  recompute: (preserveHp?: boolean) => void
  regenTick: () => void
  tickSecond: () => void

  addGold: (n: number) => void

  equipItem: (backpackIndex: number) => void
  addToBackpack: (item: Item) => boolean
  sellFromBackpack: (index: number, opts?: { silent?: boolean }) => void
  toggleLock: (index: number) => void
  unlockAllBackpack: () => void
  neatenBackpack: () => void
  optimalSortBackpack: () => void
  autoEquipBest: () => void
  sellAllBackpack: () => void
  setAutoSell: (index: number, value: boolean) => void

  refreshShop: (mode: 'free' | 'gold') => void
  restockShop: () => void
  buyShopItem: (index: number) => void

  refreshDungeons: (force?: boolean) => void
  selectDungeon: (d: Dungeon) => void
  selectEndless: () => void
  selectAbyss: () => void
  setAbyssTier: (key: string) => void
  closeDungeon: () => void
  resetEndlessLv: () => void
  resetAbyssLv: () => void
  setChallengeFlag: (key: 'reChallenge' | 'upEChallenge' | 'reEChallenge' | 'upAChallenge' | 'reAChallenge', v: boolean) => void

  beginBattle: () => void
  stopBattle: (manual?: boolean) => void

  openStrengthen: (index: number) => void
  closeStrengthen: () => void
  doStrengthen: () => 'ok' | 'nogold'
  autoStrengthen: (targetLv: number) => void
  doReforge: (entryIndex: number) => 'ok' | 'nogold'
  autoReforge: (entryIndex: number, targetType: AttrType) => void
  toggleAffixLock: (section: 'extra' | 'innate', index: number) => void
  unlockAllAffixes: () => void
  baptize: () => void
  autoBaptize: (targetPct: number) => void

  doReincarnate: (gainedPoint: number) => void

  gmGrant: (opts: { gold: number; playerLv: number; equipLv: number; equipQua: number }) => void

  saveGame: (notify?: boolean) => void
  loadGame: (raw?: string) => boolean
  exportSave: () => string
  hardReset: () => void
}

function freshEquipment(): Equipment {
  return { weapon: initialWeapon(), armor: initialArmor(), ring: initialRing(), neck: initialNeck() }
}

function emptyBackpack(): (Item | null)[] {
  return new Array(BACKPACK_SIZE).fill(null)
}

/** 生成一批随玩家等级缩放的全新商店物品。 */
function buildShop(playerLv: number): (Item | null)[] {
  const equip = [0.4, 0.342, 0.25, 0.008] // 普通 / 神器 / 史诗 / 独特
  const shop: (Item | null)[] = new Array(SHOP_SIZE).fill(null)
  for (let i = 0; i < SHOP_SIZE; i++) {
    const lv = Math.floor(playerLv + Math.random() * 3)
    let qua = -1
    const r = Math.random()
    let acc = 0
    for (let q = 0; q < 4; q++) {
      acc += equip[q]
      if (r < acc) {
        qua = q + 1 // 商店品质为 普通..独特（索引 1..4）
        break
      }
    }
    if (qua !== -1) {
      const slot = SLOTS[Math.floor(Math.random() * 4)]
      const item = createItem(slot, qua, lv)
      item.gold = shopPrice(item)
      shop[i] = item
    }
  }
  return shop
}

function nowTime(): string {
  const d = new Date()
  const p = (n: number) => `${n}`.padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export const useGame = create<GameState>((set, get) => {
  // -- 操作实时 store 的内部辅助函数 --

  const pushLog = (info: SysInfo) => {
    const sysInfo = [...get().sysInfo, { ...info, time: nowTime() }]
    if (sysInfo.length > MAX_LOG) sysInfo.shift()
    set({ sysInfo })
  }

  const setCurhp = (delta: number | 'full' | 'dead') => {
    const attr = get().attribute
    const cur = { ...attr.CURHP }
    if (delta === 'dead') cur.value = 1
    else if (delta === 'full') cur.value = attr.MAXHP.value
    else {
      cur.value = Math.floor(cur.value + delta)
      if (cur.value > attr.MAXHP.value) cur.value = attr.MAXHP.value
      if (cur.value < 1) cur.value = 1
    }
    cur.showValue = `${cur.value}`
    set({ attribute: { ...attr, CURHP: cur } })
  }

  const setMp = (value: number) => {
    const { maxMp } = get()
    set({ mp: Math.max(0, Math.min(maxMp, value)) })
  }

  const firstEmpty = (arr: (Item | null)[]) => arr.findIndex((x) => x == null)

  const addItemToBackpack = (item: Item): boolean => {
    const backpack = [...get().backpack]
    const idx = firstEmpty(backpack)
    if (idx === -1) return false
    backpack[idx] = item
    set({ backpack })
    return true
  }

  const writeBackItem = (updated: Item) => {
    const s = get()
    if (s.strengthenIndex < 0) return
    const backpack = [...s.backpack]
    backpack[s.strengthenIndex] = updated
    set({ backpack })
  }

  // -- 为单个获胜事件发放灵石 + 战利品 --
  const awardTrophy = (dungeon: Dungeon, event: DungeonEvent) => {
    const isEndless = dungeon.type === 'endless'
    const isAbyss = dungeon.type === 'abyss'
    const lv = event.lv // 掉落按事件自身的等级缩放（在副本的等级范围内）
    const state = get()
    const items: Item[] = []

    // 独特掉落（仅 boss，非无尽）
    if (event.type === 'boss' && !isEndless) {
      const threshold = 1 - 0.02 * ((dungeon.difficulty - 1) * 2 + 1)
      if (Math.random() > threshold) {
        const rr = Math.random()
        const slot: ItemType = rr <= 0.3 ? 'weapon' : rr <= 0.5 ? 'armor' : rr <= 0.75 ? 'ring' : 'neck'
        items.push(createItem(slot, 4, Math.floor(lv + Math.random() * 6)))
      }
    }

    // 按品质表进行的普通掉落
    const equip = event.trophy.equip
    let equipQua = -1
    const r = Math.random()
    let acc = 0
    for (let q = 0; q < 4; q++) {
      acc += equip[q]
      if (r < acc) {
        equipQua = q
        break
      }
    }

    if (equipQua !== -1) {
      const slot = SLOTS[Math.floor(Math.random() * 4)]
      const rolled = createItem(slot, equipQua, lv)
      if (isEndless) {
        // 无尽：不掉装备，只掉提升后的 灵石
        const gold = Math.floor(event.trophy.gold * 1.5)
        get().addGold(gold)
        pushLog({ type: 'trophy', msg: `获得灵石 ${fmtNum(gold)}` })
        return
      }
      const dropItems = [...items, rolled]
      if (isAbyss) {
        // 深渊：只掉装备，不掉 灵石
        pushLog({ type: 'trophy', msg: '深渊掉落装备', equip: dropItems })
      } else {
        const gold = Math.floor(event.trophy.gold)
        get().addGold(gold)
        pushLog({ type: 'trophy', msg: `获得灵石 ${fmtNum(gold)}`, equip: dropItems })
      }
      for (const it of dropItems) {
        if (state.autoSell[equipQua] && it.quality.name !== '独特') {
          const g = sellPrice(it)
          get().addGold(g)
          pushLog({ type: 'trophy', msg: `自动出售装备获得灵石 ${fmtNum(g)}` })
        } else {
          const ok = addItemToBackpack(it)
          if (!ok) pushLog({ type: 'warning', msg: '背包已满，装备无法拾取！' })
        }
      }
    } else if (!isAbyss) {
      // 没有掉出装备 —— 发放 灵石（深渊 未命中时不给任何奖励）
      const goldRatio = isEndless ? 2.6 : 1
      const gold = Math.floor(event.trophy.gold * goldRatio)
      get().addGold(gold)
      pushLog({ type: 'trophy', msg: `获得灵石 ${fmtNum(gold)}` })
    }
  }

  // -- 实时战斗辅助函数 --
  const initFight = (event: DungeonEvent, now: number): FightState => ({
    enemyHp: event.attribute.HP,
    enemyMaxHp: event.attribute.HP,
    blocLeft: get().attribute.BLOC.value,
    dmgTaken: 0,
    fightStart: now,
    nextHeroHit: now, // 接触即挥击
    nextEnemyHit: now + 350, // 敌人在首次挥击前会短暂预警
    skillReady: {},
    heroFx: null,
    enemyFx: null,
  })

  // 当前属性对阵单个怪物时的每次命中战斗数值。
  // 英雄每秒自动 DPS 保持等于 a.DPS（解析模型假设
  // 约 1 次挥击/秒），所以更高的 BATTLESPEED 意味着更多、更小的挥击 —— 而非更高 DPS。
  // 敌人每秒 DPS = REDUCDMG × ATK，BLOC 作为一次性缓冲 —— 与
  // 旧的解析式 playerDeadTime = (CURHP + bloc) / reduc / mATK 一致。
  const combatProfile = (event: DungeonEvent) => {
    const a = get().attribute
    const rA = get().reincarnationAttribute
    const reduc = a.REDUCDMG
    const mATK = event.attribute.ATK || 0.0001
    const ampMult = 1 + (a.DMGAMP || 0) / 100
    const addMult = 1 + (a.DMGADD || 0) / 100
    const skillMult = 1 + (a.SKILLDMG || 0) / 100
    const autoDPS = (a.DPS || 0.0001) * ampMult * addMult
    const heroAtkMs = Math.max(250, 900 + rA.BATTLESPEED)
    const heroHit = Math.max(1, Math.floor((autoDPS * heroAtkMs * COMBAT_SPEED) / 1000))
    const enemyHit = (reduc * mATK * ENEMY_ATK_MS * COMBAT_SPEED) / 1000
    const skills = ownedSkillDefs(get().skills).map((d) => ({
      id: d.id,
      cooldownMs: (d.cooldown * 1000) / COMBAT_SPEED, // 与加速后的战斗保持同步释放
      mpCost: d.mpCost,
      dmg: Math.max(1, Math.floor(d.multiplier * a.ATK.value * skillMult * ampMult * addMult)),
    }))
    return { heroAtkMs, heroHit, enemyHit, skills }
  }

  const onDungeonClear = () => {
    const s = get()
    const dungeon = s.battle!.dungeon
    stopTimer()

    if (dungeon.type === 'endless') {
      pushLog({ type: 'win', msg: '挑战成功，可以挑战下一层了！' })
      set({ endlessLv: Math.max(1, s.endlessLv + 1) })
      setCurhp('full')
    } else if (dungeon.type === 'abyss') {
      pushLog({ type: 'win', msg: '深渊层探索成功！可以挑战更深一层了。' })
      set({ abyssLv: Math.max(1, s.abyssLv + 1) })
      setCurhp('full')
    } else {
      pushLog({ type: 'win', msg: '副本探索成功！' })
      if (dungeon.lv >= 10 && !s.endlessLv) {
        set({ endlessLv: 1 })
        pushLog({ type: 'warning', msg: '开启了无尽挑战，点击地图左上角进入，试试你的极限吧！' })
      }
    }

    // 决定是否自动重复挑战
    const st = get()
    const backpackFull = st.backpack.filter(Boolean).length / st.backpack.length >= 0.8
    if (dungeon.type !== 'endless' && dungeon.type !== 'abyss' && st.reChallenge && !backpackFull) {
      set({ battle: null })
      get().beginBattle()
    } else if (dungeon.type === 'endless' && st.reEChallenge) {
      set({ endlessLv: Math.max(1, st.endlessLv - 1), selectedDungeon: createEndlessDungeon(Math.max(1, st.endlessLv - 1)), battle: null })
      get().beginBattle()
    } else if (dungeon.type === 'endless' && st.upEChallenge) {
      const nextD = createEndlessDungeon(st.endlessLv)
      set({ selectedDungeon: nextD, battle: null })
      get().beginBattle()
    } else if (dungeon.type === 'abyss' && st.reAChallenge) {
      // 重复挑战：刷刚通关的那一层 —— 始终撤销通关时的 +1（即使
      // 背包已满并停止时也是如此），否则层数会悄悄往上爬。
      const layer = Math.max(1, st.abyssLv - 1)
      if (backpackFull) {
        pushLog({ type: 'warning', msg: '背包将满，深渊重复挑战暂停。' })
        set({ abyssLv: layer, battle: null, selectedDungeon: null })
      } else {
        set({ abyssLv: layer, selectedDungeon: createAbyssDungeon(abyssTierByKey(st.abyssTier), layer), battle: null })
        get().beginBattle()
      }
    } else if (dungeon.type === 'abyss' && st.upAChallenge && !backpackFull) {
      const nextD = createAbyssDungeon(abyssTierByKey(st.abyssTier), st.abyssLv)
      set({ selectedDungeon: nextD, battle: null })
      get().beginBattle()
    } else {
      set({ battle: null, selectedDungeon: null })
    }
    get().saveGame(false)
  }

  const battleStep = () => {
    const s = get()
    const b = s.battle
    if (!b) return
    const now = Date.now()
    const rA = s.reincarnationAttribute

    // ---- 在事件之间移动 ----
    if (b.phase === 'move') {
      const moveInterval = Math.max(15, 50 + rA.MOVESPEED)
      const step = MOVE_STEP_BASE * (50 / moveInterval)
      let left = b.left + step
      const threshold = b.nextEvent * (100 / b.dungeon.eventNum)
      if (left >= threshold) {
        left = threshold
        const event = b.dungeon.eventType[b.nextEvent - 1]
        pushLog({ type: 'battle', msg: `遭遇 ${event.name}（Lv${event.lv}），战斗中…` })
        set({ battle: { ...b, left, phase: 'fight', fightUntil: 0, lastResult: null, fight: initFight(event, now) } })
      } else {
        set({ battle: { ...b, left } })
      }
      return
    }

    // ---- 实时对决 ----
    const f = b.fight
    if (!f) {
      set({ battle: { ...b, phase: 'move' } })
      return
    }

    // 胜利后停顿：敌人已死亡，先保持画面再推进
    if (f.enemyHp <= 0) {
      if (now >= b.fightUntil) {
        const nextEvent = b.nextEvent + 1
        if (nextEvent > b.dungeon.eventNum) onDungeonClear()
        else set({ battle: { ...b, nextEvent, phase: 'move', fight: null } })
      }
      return
    }

    const event = b.dungeon.eventType[b.nextEvent - 1]
    const prof = combatProfile(event)
    let enemyHp = f.enemyHp
    let blocLeft = f.blocLeft
    let dmgTaken = f.dmgTaken
    let nextHeroHit = f.nextHeroHit
    let nextEnemyHit = f.nextEnemyHit
    let skillReady = f.skillReady
    let heroFx = f.heroFx
    let enemyFx = f.enemyFx

    // 英雄自动攻击
    if (now >= nextHeroHit) {
      enemyHp -= prof.heroHit
      heroFx = { dmg: prof.heroHit, id: ++fxSeq }
      nextHeroHit = now + prof.heroAtkMs
    }
    // 英雄技能 —— 每个 tick 释放一个已就绪且法力足够的技能，使节奏易于观察
    if (enemyHp > 0) {
      for (const sk of prof.skills) {
        if (now >= (skillReady[sk.id] ?? 0) && get().mp >= sk.mpCost) {
          enemyHp -= sk.dmg
          setMp(get().mp - sk.mpCost)
          skillReady = { ...skillReady, [sk.id]: now + sk.cooldownMs }
          heroFx = { dmg: sk.dmg, skill: sk.id, id: ++fxSeq }
          break
        }
      }
    }
    // 敌人攻击 —— 先消耗一次性格挡缓冲
    if (enemyHp > 0 && now >= nextEnemyHit) {
      let raw = prof.enemyHit
      if (blocLeft > 0) {
        const absorbed = Math.min(blocLeft, raw)
        raw -= absorbed
        blocLeft -= absorbed
      }
      const dmg = Math.max(1, Math.floor(raw))
      setCurhp(-dmg)
      dmgTaken += dmg
      enemyFx = { dmg, id: ++fxSeq }
      nextEnemyHit = now + ENEMY_ATK_MS
    }

    const heroHp = get().attribute.CURHP.value

    const winFight = () => {
      // 击杀奖励 灵石 + 装备（通过 awardTrophy）；EXP 来自被动
      // 涓流以及 灵石→经验 转换，而非击杀。
      awardTrophy(b.dungeon, event)
      // 困难/极难副本仅可挑战一次 —— 首次获胜后从地图上移除
      if (b.dungeon.type !== 'endless' && b.dungeon.type !== 'abyss' && b.dungeon.difficulty !== 1) {
        set({ dungeons: get().dungeons.filter((d) => d.id !== b.dungeon.id) })
      }
      const pauseMs = Math.max(250, 900 + rA.BATTLESPEED)
      set({
        battle: {
          ...get().battle!,
          fightUntil: now + pauseMs,
          lastResult: { win: true, name: event.name, dmg: dmgTaken },
          fight: { ...f, enemyHp: 0, blocLeft, dmgTaken, nextHeroHit, nextEnemyHit, skillReady, heroFx, enemyFx },
        },
      })
    }

    if (enemyHp <= 0) {
      winFight()
    } else if (heroHp <= 1) {
      stopTimer()
      pushLog({ type: 'warning', msg: `战斗失败！本场受到了 ${fmtNum(dmgTaken)} 点伤害。` })
      pushLog({ type: 'warning', msg: '试试强化或重铸装备之后再来挑战吧。' })
      set({ battle: null, selectedDungeon: null })
    } else if (now - f.fightStart > MAX_FIGHT_MS) {
      // 僵局保护：仅在接近击杀时计为获胜，否则无奖励撤退
      if (enemyHp <= f.enemyMaxHp * 0.2) {
        winFight()
      } else {
        stopTimer()
        pushLog({ type: 'warning', msg: '战斗超时，撤退了。' })
        set({ battle: null, selectedDungeon: null })
      }
    } else {
      set({
        battle: {
          ...b,
          fight: { ...f, enemyHp, blocLeft, dmgTaken, nextHeroHit, nextEnemyHit, skillReady, heroFx, enemyFx },
        },
      })
    }
  }

  const startTimer = () => {
    if (battleTimer) clearInterval(battleTimer)
    battleTimer = setInterval(battleStep, BATTLE_TICK_MS)
  }
  const stopTimer = () => {
    if (battleTimer) clearInterval(battleTimer)
    battleTimer = null
  }

  // =====================================================================
  const initialPrimary = computePrimary(1, 0)
  const initialAttr = computePlayerAttribute(freshEquipment(), EMPTY_REINCARNATION_ATTR, null, initialPrimary)

  return {
    lv: 1,
    exp: 0,
    gold: 0,
    endlessLv: 0,
    abyssLv: 1,
    abyssTier: 't1',
    reincarnation: { count: 0, point: 0 },
    reincarnationAttribute: { ...EMPTY_REINCARNATION_ATTR },
    equipment: freshEquipment(),
    attribute: initialAttr,
    primary: initialPrimary,
    healthRecoverySpeed: 1,
    heroId: DEFAULT_HERO,

    skills: [],
    mp: maxMpFor(1),
    maxMp: maxMpFor(1),
    mpRegen: mpRegenFor(maxMpFor(1)),
    skillDPS: 0,
    totalDPS: initialAttr.DPS,

    backpack: emptyBackpack(),
    autoSell: [false, false, false, false],

    shop: new Array(SHOP_SIZE).fill(null),
    shopRefreshLeft: 5,
    shopRegenSec: 60,

    dungeons: [],
    selectedDungeon: null,
    dungeonCd: 0,
    reChallenge: false,
    upEChallenge: false,
    reEChallenge: false,
    upAChallenge: false,
    reAChallenge: false,

    battle: null,
    sysInfo: [
      { type: '', msg: '欢迎你，勇士！点击地图上的副本开始战斗。' },
      { type: '', msg: '菜单栏可以刷新当前世界副本。' },
    ],

    strengthenTarget: null,
    strengthenIndex: -1,

    // ---- 操作 ----
    setHero: (id) => {
      set({ heroId: id })
      get().saveGame(false)
    },
    buySkill: (id) => {
      const s = get()
      if (s.skills.includes(id)) return
      const def = skillById(id)
      if (!def) return
      if (s.gold < def.price) {
        pushLog({ type: 'warning', msg: '灵石不够啊，学不起这门技能。' })
        return
      }
      set({ gold: s.gold - def.price, skills: [...s.skills, id] })
      get().recompute()
      get().saveGame(false)
      pushLog({ type: 'win', msg: `习得了技能【${def.name}】！` })
    },
    gainExp: (amount) => {
      let lv = get().lv
      let exp = get().exp + Math.max(0, Math.floor(amount))
      let leveled = 0
      while (exp >= expForLevel(lv)) {
        exp -= expForLevel(lv)
        lv++
        leveled++
      }
      set({ lv, exp })
      if (leveled) {
        get().recompute()
        setCurhp('full')
        setMp(get().maxMp)
        pushLog({ type: 'win', msg: `升级了！Lv${lv}（+${leveled}），生命与法力已回满，可刷新更高等级副本。` })
      }
    },
    buyLevels: (n) => {
      const s = get()
      if (n <= 0) return
      const totalExp = expToRaise(s.lv, s.exp, n)
      const cost = Math.ceil(totalExp / LINGSHI_TO_EXP)
      if (s.gold < cost) {
        pushLog({ type: 'warning', msg: `灵石不足：提升 ${n} 级需要 ${fmtNum(cost)} 灵石（当前 ${fmtNum(s.gold)}）。` })
        return
      }
      set({ gold: s.gold - cost })
      get().gainExp(totalExp)
    },
    log: pushLog,
    clearLog: () => set({ sysInfo: get().sysInfo.slice(0, 1) }),

    recompute: (preserveHp = true) => {
      const s = get()
      let ratio: number | null = null
      if (preserveHp && s.attribute.MAXHP.value) {
        ratio = s.attribute.CURHP.value / s.attribute.MAXHP.value
      }
      const primary = computePrimary(s.lv, s.reincarnation.count)
      const attribute = computePlayerAttribute(s.equipment, s.reincarnationAttribute, ratio, primary)
      const maxMp = maxMpFor(s.lv)
      const mpRegen = mpRegenFor(maxMp)
      const defs = ownedSkillDefs(s.skills)
      const skillDPS = skillDpsDisplay(defs, attribute.ATK.value, mpRegen)
      // 应用 黄字/白字/技能伤害 倍率以得到真实的总 DPS
      const ampMult = 1 + attribute.DMGAMP / 100
      const addMult = 1 + attribute.DMGADD / 100
      const skillMult = 1 + attribute.SKILLDMG / 100
      const totalDPS = attribute.DPS * ampMult * addMult + skillDPS * skillMult * ampMult * addMult
      set({ attribute, primary, maxMp, mpRegen, skillDPS, totalDPS, mp: Math.min(s.mp, maxMp) })
    },

    regenTick: () => {
      const s = get()
      // 战斗进行中不回复 HP —— 只在战斗之间回复。
      const inFight = !!(s.battle && s.battle.phase === 'fight' && s.battle.fight && s.battle.fight.enemyHp > 0)
      const heal = s.healthRecoverySpeed * (s.attribute.MAXHP.value / 50)
      if (!inFight && s.attribute.CURHP.value < s.attribute.MAXHP.value) setCurhp(heal)
      if (s.mp < s.maxMp) setMp(s.mp + s.mpRegen)
    },

    tickSecond: () => {
      const s = get()
      // 被动 EXP 涓流，随等级缩放
      get().gainExp(autoExpPerSec(s.lv))
      const patch: Partial<GameState> = {}
      if (s.dungeonCd > 0) patch.dungeonCd = s.dungeonCd - 1
      if (s.shopRefreshLeft < 5) {
        let sec = s.shopRegenSec - 1
        if (sec <= 0) {
          patch.shopRefreshLeft = Math.min(5, s.shopRefreshLeft + 1)
          sec = 60
        }
        patch.shopRegenSec = sec
      }
      if (Object.keys(patch).length) set(patch)
    },

    addGold: (n) => set({ gold: Math.max(0, get().gold + Math.floor(n)) }),

    equipItem: (backpackIndex) => {
      const s = get()
      const item = s.backpack[backpackIndex]
      if (!item) return
      if (s.lv < item.lv) {
        pushLog({ type: 'warning', msg: `需要等级 Lv${item.lv} 才能装备【${item.type.name}】（当前 Lv${s.lv}）。` })
        return
      }
      const slot = item.itemType
      const backpack = [...s.backpack]
      backpack[backpackIndex] = s.equipment[slot] // 把旧装备换回背包
      const equipment: Equipment = { ...s.equipment, [slot]: item }
      set({ equipment, backpack })
      get().recompute()
    },

    addToBackpack: (item) => addItemToBackpack(item),

    sellFromBackpack: (index, opts) => {
      const s = get()
      const item = s.backpack[index]
      if (!item) return
      if (item.locked) {
        if (!opts?.silent) pushLog({ type: 'warning', msg: '装备已锁定，请先解锁再出售。' })
        return
      }
      const backpack = [...s.backpack]
      backpack[index] = null
      const g = sellPrice(item)
      set({ backpack, gold: s.gold + g })
      if (!opts?.silent) pushLog({ type: 'trophy', msg: `出售装备获得灵石 ${fmtNum(g)}` })
    },

    toggleLock: (index) => {
      const s = get()
      const item = s.backpack[index]
      if (!item) return
      const backpack = [...s.backpack]
      backpack[index] = { ...item, locked: !item.locked }
      set({ backpack })
    },

    // 批量解锁：一次性解除背包内所有装备的锁定（保护锁）。
    unlockAllBackpack: () => {
      const s = get()
      if (!s.backpack.some((it) => it?.locked)) return
      const backpack = s.backpack.map((it) => (it?.locked ? { ...it, locked: false } : it))
      set({ backpack })
    },

    neatenBackpack: () => {
      const items = get().backpack.filter(Boolean) as Item[]
      const backpack = emptyBackpack()
      items.forEach((it, i) => (backpack[i] = it))
      set({ backpack })
    },

    optimalSortBackpack: () => {
      const order: Record<ItemType, number> = { weapon: 0, armor: 1, ring: 2, neck: 3 }
      const items = (get().backpack.filter(Boolean) as Item[]).slice()
      items.sort((a, b) => order[a.itemType] - order[b.itemType] || itemScore(b) - itemScore(a))
      const backpack = emptyBackpack()
      items.forEach((it, i) => (backpack[i] = it))
      set({ backpack })
      pushLog({ type: 'win', msg: '背包已按槽位 + 战力最优排序。' })
    },

    autoEquipBest: () => {
      const playerLv = get().lv
      const backpack = [...get().backpack]
      const equipment: Equipment = { ...get().equipment }
      let changed = 0
      let blocked = 0
      for (const slot of SLOTS) {
        let bestIdx = -1
        let bestScore = itemScore(equipment[slot])
        for (let i = 0; i < backpack.length; i++) {
          const it = backpack[i]
          if (it && it.itemType === slot && it.lv > playerLv) {
            if (itemScore(it) > bestScore) blocked++ // 存在更强的装备但等级不足
            continue
          }
          if (it && it.itemType === slot) {
            const sc = itemScore(it)
            if (sc > bestScore) {
              bestScore = sc
              bestIdx = i
            }
          }
        }
        if (bestIdx >= 0) {
          const picked = backpack[bestIdx]!
          backpack[bestIdx] = equipment[slot] // 旧装备放回背包
          equipment[slot] = picked
          changed++
        }
      }
      const blockedNote = blocked ? `（有 ${blocked} 件更强装备等级不足，暂不能装备）` : ''
      if (changed) {
        set({ equipment, backpack })
        get().recompute()
        get().saveGame(false)
        pushLog({ type: 'win', msg: `一键换装：更换了 ${changed} 件更强的装备。${blockedNote}` })
      } else {
        pushLog({ type: '', msg: `一键换装：身上已是可装备的最强搭配。${blockedNote}` })
      }
    },

    sellAllBackpack: () => {
      const s = get()
      let gold = s.gold
      const backpack = [...s.backpack]
      let sold = 0
      for (let i = 0; i < backpack.length; i++) {
        const it = backpack[i]
        if (it && !it.locked) {
          gold += sellPrice(it)
          backpack[i] = null
          sold++
        }
      }
      set({ backpack, gold })
      pushLog({ type: 'trophy', msg: sold ? `一键出售了 ${sold} 件装备。` : '没有可出售的装备（已锁定的不会出售）。' })
    },

    setAutoSell: (index, value) => {
      const autoSell = [...get().autoSell]
      autoSell[index] = value
      set({ autoSell })
    },

    refreshShop: (mode) => {
      const s = get()
      if (mode === 'gold') {
        if (s.gold < 10000) {
          pushLog({ type: 'warning', msg: '灵石不够啊，想啥呢。' })
          return
        }
        set({ gold: s.gold - 10000 })
      } else {
        if (s.shopRefreshLeft < 1) {
          pushLog({ type: 'warning', msg: '刷新次数不够了，等等吧。' })
          return
        }
        set({ shopRefreshLeft: s.shopRefreshLeft - 1, shopRegenSec: s.shopRefreshLeft - 1 < 5 ? s.shopRegenSec : 60 })
      }
      const shop = buildShop(get().lv)
      set({ shop })
      if (shop.some((it) => it?.quality.name === '独特')) {
        pushLog({ type: 'win', msg: '商店刷新出了独特装备，快去看看！' })
      }
    },

    // 若商店当前为空则免费补货（游戏开始时的初始补货）。
    restockShop: () => {
      if (get().shop.some(Boolean)) return
      set({ shop: buildShop(get().lv) })
    },

    buyShopItem: (index) => {
      const s = get()
      const item = s.shop[index]
      if (!item) return
      if (s.gold < (item.gold ?? 0)) {
        pushLog({ type: 'warning', msg: '灵石不够啊，买啥呢。' })
        return
      }
      if (!addItemToBackpack(item)) {
        pushLog({ type: 'warning', msg: '背包已满，无法购买。' })
        return
      }
      const shop = [...get().shop]
      shop[index] = null
      set({ shop, gold: get().gold - (item.gold ?? 0) })
      pushLog({ type: 'win', msg: `购买了 ${item.type.name}。` })
    },

    refreshDungeons: (force) => {
      const s = get()
      if (!force && s.dungeonCd > 0) {
        pushLog({ type: 'warning', msg: `刚刷新过，还需等待 ${s.dungeonCd} 秒。` })
        return
      }
      set({ dungeons: refreshDungeonList(s.lv), dungeonCd: force ? 0 : 30 })
    },

    selectDungeon: (d) => set({ selectedDungeon: d, reChallenge: d.difficulty !== 1 ? false : get().reChallenge }),

    selectEndless: () => {
      const s = get()
      set({ selectedDungeon: createEndlessDungeon(s.endlessLv || 1), reChallenge: false })
    },

    selectAbyss: () => {
      const s = get()
      set({ selectedDungeon: createAbyssDungeon(abyssTierByKey(s.abyssTier), s.abyssLv || 1), reChallenge: false })
    },

    setAbyssTier: (key) => {
      const s = get()
      const refresh = s.selectedDungeon?.type === 'abyss'
      set({
        abyssTier: key,
        ...(refresh ? { selectedDungeon: createAbyssDungeon(abyssTierByKey(key), s.abyssLv || 1) } : {}),
      })
    },

    closeDungeon: () => set({ selectedDungeon: null }),

    resetEndlessLv: () => {
      set({ endlessLv: 1, selectedDungeon: null })
      pushLog({ type: 'win', msg: '无尽挑战层数已重置到第 1 层。' })
    },

    resetAbyssLv: () => {
      const s = get()
      set({ abyssLv: 1, selectedDungeon: s.selectedDungeon?.type === 'abyss' ? createAbyssDungeon(abyssTierByKey(s.abyssTier), 1) : s.selectedDungeon })
      pushLog({ type: 'win', msg: '深渊层数已重置到第 1 层。' })
    },

    setChallengeFlag: (key, v) => {
      if (key === 'upEChallenge') set({ upEChallenge: v, reEChallenge: !v })
      else if (key === 'reEChallenge') set({ reEChallenge: v, upEChallenge: !v })
      else if (key === 'upAChallenge') set({ upAChallenge: v, reAChallenge: !v })
      else if (key === 'reAChallenge') set({ reAChallenge: v, upAChallenge: !v })
      else set({ reChallenge: v })
    },

    beginBattle: () => {
      const s = get()
      const dungeon = s.selectedDungeon
      if (!dungeon) return
      // 深渊 进入需消耗灵石：副本级别 × 角色等级 × 深渊层级
      if (dungeon.type === 'abyss') {
        const cost = abyssEntryCost(abyssTierByKey(s.abyssTier), s.lv, s.abyssLv)
        if (s.gold < cost) {
          pushLog({ type: 'warning', msg: `进入深渊需要 ${fmtNum(cost)} 灵石，灵石不足。` })
          return
        }
        set({ gold: s.gold - cost })
        pushLog({ type: 'warning', msg: `支付 ${fmtNum(cost)} 灵石，进入 ${dungeon.name}` })
      } else {
        pushLog({ type: 'warning', msg: `进入 ${dungeon.type === 'endless' ? `无尽（第${dungeon.lv}层）` : dungeon.name}` })
      }
      set({
        battle: { dungeon, left: 0, nextEvent: 1, phase: 'move', fightUntil: 0, lastResult: null, fight: null },
      })
      startTimer()
    },

    stopBattle: (manual) => {
      stopTimer()
      set({ battle: null, selectedDungeon: null })
      if (manual) pushLog({ type: 'warning', msg: '手动中断了挑战。' })
    },

    openStrengthen: (index) => {
      const item = get().backpack[index]
      if (!item) return
      set({ strengthenTarget: item, strengthenIndex: index })
    },
    closeStrengthen: () => set({ strengthenTarget: null, strengthenIndex: -1 }),

    doStrengthen: () => {
      const s = get()
      const item = s.strengthenTarget
      if (!item) return 'ok'
      const need = strengthenNeedGold(item)
      if (s.gold < need) {
        pushLog({ type: 'warning', msg: '灵石不够啊，强化啥呢。' })
        return 'nogold'
      }
      let lv = item.enchantlvl
      const rate = enchantSuccessRate(lv)
      if (Math.random() < rate) lv++
      else if (lv >= 5) lv--
      const updated: Item = { ...item, enchantlvl: lv, locked: true }
      writeBackItem(updated)
      set({ gold: s.gold - need, strengthenTarget: updated })
      return 'ok'
    },

    // 反复尝试强化（含成功/失败/降级的判定），直到
    // 装备达到目标等级，或 灵石 耗尽 —— 全部在一次同步的批量执行中完成。
    autoStrengthen: (targetLv) => {
      const s = get()
      const start = s.strengthenTarget
      if (!start) return
      if (start.enchantlvl >= targetLv) {
        pushLog({ type: '', msg: `已经强化到 +${start.enchantlvl} 了。` })
        return
      }
      let item = start
      let gold = s.gold
      let attempts = 0
      while (item.enchantlvl < targetLv && attempts < 100000) {
        const need = strengthenNeedGold(item)
        if (gold < need) break
        gold -= need
        let lv = item.enchantlvl
        if (Math.random() < enchantSuccessRate(lv)) lv++
        else if (lv >= 5) lv--
        item = { ...item, enchantlvl: lv, locked: true }
        attempts++
      }
      writeBackItem(item)
      set({ gold, strengthenTarget: item })
      const spent = s.gold - gold
      if (item.enchantlvl >= targetLv) {
        pushLog({ type: 'win', msg: `强化 ${attempts} 次达到 +${item.enchantlvl}，共花费 ${fmtNum(spent)} 灵石。` })
      } else {
        pushLog({ type: 'warning', msg: `灵石不足停止：强化 ${attempts} 次，当前 +${item.enchantlvl}（目标 +${targetLv}），花费 ${fmtNum(spent)} 灵石。` })
      }
    },

    doReforge: (entryIndex) => {
      const s = get()
      const item = s.strengthenTarget
      if (!item) return 'ok'
      const need = recastNeedGold(item)
      if (s.gold < need) {
        pushLog({ type: 'warning', msg: '灵石不够啊，重铸啥呢。' })
        return 'nogold'
      }
      const newEntry = createRandomEntry(item.lv, item.quality.qualityCoefficient)
      const extraEntry = [...item.extraEntry]
      extraEntry[entryIndex] = newEntry
      const updated: Item = { ...item, extraEntry, locked: true }
      writeBackItem(updated)
      set({ gold: s.gold - need, strengthenTarget: updated })
      return 'ok'
    },

    // 反复随机重铸某个词条，直到它变为目标类型（或 灵石 耗尽）。
    autoReforge: (entryIndex, targetType) => {
      const s = get()
      const item = s.strengthenTarget
      if (!item) return
      const qc = item.quality.qualityCoefficient
      const cost = recastNeedGold(item)
      const name = RECAST_POOL.find((p) => p.type === targetType)?.name ?? targetType
      const extraEntry = [...item.extraEntry]
      if (extraEntry[entryIndex].type === targetType) {
        pushLog({ type: '', msg: `该词条已经是【${name}】了。` })
        return
      }
      if (s.gold < cost) {
        pushLog({ type: 'warning', msg: '灵石不够啊，重铸啥呢。' })
        return
      }
      let gold = s.gold
      let attempts = 0
      while (extraEntry[entryIndex].type !== targetType && gold >= cost && attempts < 100000) {
        extraEntry[entryIndex] = createRandomEntry(item.lv, qc)
        gold -= cost
        attempts++
      }
      const hit = extraEntry[entryIndex].type === targetType
      const updated: Item = { ...item, extraEntry, locked: true }
      writeBackItem(updated)
      set({ gold, strengthenTarget: updated })
      const spent = s.gold - gold
      if (hit) {
        pushLog({ type: 'win', msg: `重铸 ${attempts} 次命中【${name}】，共花费 ${fmtNum(spent)} 灵石。` })
      } else {
        pushLog({ type: 'warning', msg: `灵石不足停止：重铸 ${attempts} 次仍未洗出【${name}】，花费 ${fmtNum(spent)} 灵石。` })
      }
    },

    toggleAffixLock: (section, index) => {
      const item = get().strengthenTarget
      if (!item) return
      if (section === 'extra') {
        const extraEntry = [...item.extraEntry]
        if (!extraEntry[index]) return
        extraEntry[index] = { ...extraEntry[index], locked: !extraEntry[index].locked }
        const updated: Item = { ...item, extraEntry }
        writeBackItem(updated)
        set({ strengthenTarget: updated })
      } else {
        const innate = [...(item.innate ?? [])]
        if (!innate[index]) return
        innate[index] = { ...innate[index], locked: !innate[index].locked }
        const updated: Item = { ...item, innate }
        writeBackItem(updated)
        set({ strengthenTarget: updated })
      }
    },

    // 批量解锁：一次性解锁所有词条锁（不影响装备本身的保护锁 item.locked）。
    unlockAllAffixes: () => {
      const item = get().strengthenTarget
      if (!item) return
      const extraEntry = item.extraEntry.map((e) => (e.locked ? { ...e, locked: false } : e))
      const innate = (item.innate ?? []).map((e) => (e.locked ? { ...e, locked: false } : e))
      const updated: Item = { ...item, extraEntry, innate }
      writeBackItem(updated)
      set({ strengthenTarget: updated })
    },

    // 品质洗礼：一次性重掷所有未锁定词条（额外 + 固有）的品质。
    baptize: () => {
      const s = get()
      const item = s.strengthenTarget
      if (!item) return
      const all = [...item.extraEntry, ...(item.innate ?? [])]
      const lockedCount = all.filter((e) => e.locked).length
      if (lockedCount >= all.length) {
        pushLog({ type: '', msg: '所有词条都锁定了，没什么可洗的。' })
        return
      }
      const cost = baptizeNeedGold(item, lockedCount)
      if (s.gold < cost) {
        pushLog({ type: 'warning', msg: `灵石不足：本次洗礼需 ${fmtNum(cost)} 灵石。` })
        return
      }
      const lv = item.lv
      const qc = item.quality.qualityCoefficient
      const reroll = (e: (typeof all)[number]) => (e.locked ? e : baptizeAffix(e, lv, qc))
      const extraEntry = item.extraEntry.map(reroll)
      const innate = (item.innate ?? []).map(reroll)
      const updated: Item = { ...item, extraEntry, innate, locked: true }
      writeBackItem(updated)
      set({ gold: s.gold - cost, strengthenTarget: updated })
      pushLog({ type: 'win', msg: `品质洗礼完成，花费 ${fmtNum(cost)} 灵石。` })
    },

    // 快速洗礼：反复洗未锁定词条，某条品质达标即自动锁定，直到全部达标或灵石不足。
    autoBaptize: (targetPct) => {
      const s = get()
      const item = s.strengthenTarget
      if (!item) return
      const targetQ = Math.max(0, Math.min(100, targetPct)) / 100
      const lv = item.lv
      const qc = item.quality.qualityCoefficient
      const autolock = (arr: Item['extraEntry']) =>
        arr.map((e) => (!e.locked && (e.q ?? 0) >= targetQ ? { ...e, locked: true } : e))
      let extra = autolock([...item.extraEntry])
      let innate = autolock([...(item.innate ?? [])])
      const allLocked = () => [...extra, ...innate].every((e) => e.locked)
      const lockedNow = () => [...extra, ...innate].filter((e) => e.locked).length
      const total = extra.length + innate.length

      let gold = s.gold
      let iters = 0
      while (!allLocked() && iters < 100000) {
        const cost = baptizeNeedGold(item, lockedNow())
        if (gold < cost) break
        gold -= cost
        iters++
        const reroll = (arr: Item['extraEntry']) => arr.map((e) => (e.locked ? e : baptizeAffix(e, lv, qc)))
        extra = autolock(reroll(extra))
        innate = autolock(reroll(innate))
      }
      const updated: Item = { ...item, extraEntry: extra, innate, locked: true }
      writeBackItem(updated)
      set({ gold, strengthenTarget: updated })
      const spent = s.gold - gold
      if (allLocked()) {
        pushLog({ type: 'win', msg: `快速洗礼完成：全部达到品质 ${targetPct}%，洗礼 ${iters} 次，共花费 ${fmtNum(spent)} 灵石。` })
      } else {
        pushLog({ type: 'warning', msg: `灵石不足停止：${lockedNow()}/${total} 条达到品质 ${targetPct}%，洗礼 ${iters} 次，花费 ${fmtNum(spent)} 灵石。` })
      }
    },

    doReincarnate: (gainedPoint) => {
      const s = get()
      // 将获得的点数随机分散到每个属性上（在之前
      // 转生已累积的基础之上）。
      const { attribute, added } = randomAllocateReincarnation(s.reincarnationAttribute, gainedPoint)
      set({
        gold: 0,
        equipment: freshEquipment(),
        backpack: emptyBackpack(),
        lv: 1,
        exp: 0,
        reincarnation: { count: s.reincarnation.count + 1, point: s.reincarnation.point + gainedPoint },
        reincarnationAttribute: attribute,
      })
      get().recompute(false)
      get().refreshDungeons(true)
      const parts = REIN_ATTRS.filter((a) => added[a.key] > 0).map((a) => `${a.name}+${fmtNum(added[a.key])}`)
      pushLog({ type: 'win', msg: `转生成功！获得 ${fmtNum(gainedPoint)} 点，随机分配：${parts.join('、') || '无'}。` })
    },

    gmGrant: ({ gold, playerLv, equipLv, equipQua }) => {
      const s = get()
      set({ gold: s.gold + gold, lv: Math.max(1, playerLv) })
      for (const slot of SLOTS) {
        const it = createItem(slot, equipQua, equipLv)
        addItemToBackpack(it)
      }
      get().refreshDungeons(true)
      pushLog({ type: 'win', msg: 'GM：已发放灵石与一套装备。' })
    },

    saveGame: (notify) => {
      const s = get()
      const data = {
        v: 1,
        lv: s.lv,
        exp: s.exp,
        gold: s.gold,
        endlessLv: s.endlessLv,
        abyssLv: s.abyssLv,
        abyssTier: s.abyssTier,
        reincarnation: s.reincarnation,
        reincarnationAttribute: s.reincarnationAttribute,
        equipment: s.equipment,
        backpack: s.backpack,
        autoSell: s.autoSell,
        heroId: s.heroId,
        skills: s.skills,
        curhpRatio: s.attribute.MAXHP.value ? s.attribute.CURHP.value / s.attribute.MAXHP.value : 1,
      }
      try {
        localStorage.setItem(SAVE_KEY, b64encode(b64encode(JSON.stringify(data))))
        if (notify) pushLog({ type: 'win', msg: '游戏进度已保存。' })
      } catch {
        pushLog({ type: 'warning', msg: '保存失败。' })
      }
    },

    loadGame: (raw) => {
      try {
        const src = raw ?? localStorage.getItem(SAVE_KEY)
        if (!src) return false
        const json = b64decode(b64decode(src))
        const d = JSON.parse(json)
        set({
          lv: d.lv ?? 1,
          exp: d.exp ?? 0,
          gold: d.gold ?? 0,
          endlessLv: d.endlessLv ?? 0,
          abyssLv: d.abyssLv ?? 1,
          abyssTier: d.abyssTier ?? 't1',
          reincarnation: d.reincarnation ?? { count: 0, point: 0 },
          reincarnationAttribute: d.reincarnationAttribute ?? { ...EMPTY_REINCARNATION_ATTR },
          equipment: d.equipment ?? freshEquipment(),
          backpack: normalizeBackpack(d.backpack),
          autoSell: d.autoSell ?? [false, false, false, false],
          heroId: d.heroId ?? DEFAULT_HERO,
          skills: Array.isArray(d.skills) ? d.skills.filter((id: string) => !!skillById(id)) : [],
        })
        get().recompute(false)
        setMp(get().maxMp)
        const ratio = typeof d.curhpRatio === 'number' ? d.curhpRatio : 1
        setCurhp('full')
        setCurhp(-(get().attribute.MAXHP.value * (1 - ratio)))
        pushLog({ type: 'win', msg: '读取存档成功。' })
        return true
      } catch {
        pushLog({ type: 'warning', msg: '糟糕，存档坏了！' })
        return false
      }
    },

    exportSave: () => {
      get().saveGame(false)
      return localStorage.getItem(SAVE_KEY) ?? ''
    },

    hardReset: () => {
      stopTimer()
      localStorage.removeItem(SAVE_KEY)
      set({
        lv: 1,
        exp: 0,
        gold: 0,
        endlessLv: 0,
        abyssLv: 1,
        abyssTier: 't1',
        reincarnation: { count: 0, point: 0 },
        reincarnationAttribute: { ...EMPTY_REINCARNATION_ATTR },
        equipment: freshEquipment(),
        backpack: emptyBackpack(),
        autoSell: [false, false, false, false],
        heroId: DEFAULT_HERO,
        skills: [],
        shop: new Array(SHOP_SIZE).fill(null),
        shopRefreshLeft: 5,
        dungeons: [],
        selectedDungeon: null,
        battle: null,
        strengthenTarget: null,
        strengthenIndex: -1,
        sysInfo: [{ type: '', msg: '存档已清除，游戏重新开始。' }],
      })
      get().recompute(false)
      get().refreshDungeons(true)
    },
  }
})

function normalizeBackpack(bp: unknown): (Item | null)[] {
  const out = emptyBackpack()
  if (Array.isArray(bp)) {
    for (let i = 0; i < Math.min(bp.length, BACKPACK_SIZE); i++) {
      const it = bp[i]
      out[i] = it && typeof it === 'object' && (it as Item).lv ? (it as Item) : null
      // 确保旧版物品上存在稳定的 id
      if (out[i] && !(out[i] as Item).id) (out[i] as Item).id = uid()
    }
  }
  return out
}
