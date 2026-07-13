import { useGame } from '../game/store'
import { IMG } from '../assets/game'
import { heroImg } from '../assets/heroes'
import { battleTier, battleBgUrl, fxUrl } from '../assets/battle'
import { skillById } from '../game/skills'
import { ABYSS_TIERS, abyssTierByKey, abyssEntryCost, mineYield } from '../game/formulas'
import { fmtNum } from '../game/format'
import type { Dungeon } from '../game/types'

function BattleStage() {
  const battle = useGame((s) => s.battle)!
  const stopBattle = useGame((s) => s.stopBattle)
  const heroId = useGame((s) => s.heroId)
  const attribute = useGame((s) => s.attribute)
  const d = battle.dungeon

  const idx = Math.min(battle.nextEvent - 1, d.eventNum - 1)
  const ev = d.eventType[idx]
  const isBoss = ev.type === 'boss'
  const fight = battle.fight
  const fighting = battle.phase === 'fight' && !!fight && fight.enemyHp > 0
  // 无尽模式怪物等级为 lv*5（d.lv 是无尽层数）；深渊/普通副本在 d.lvMin 中
  // 暴露真实的怪物等级。
  const tier = battleTier(d.type === 'endless' ? d.lv * 5 : d.lvMin)
  const bg = battleBgUrl(tier)

  const enemyPct = fight ? Math.max(0, (fight.enemyHp / fight.enemyMaxHp) * 100) : 100
  const heroPct = attribute.MAXHP.value ? Math.max(0, (attribute.CURHP.value / attribute.MAXHP.value) * 100) : 0

  const heroFx = fight?.heroFx
  const enemyFx = fight?.enemyFx
  const skillDef = heroFx?.skill ? skillById(heroFx.skill) : undefined
  const skillPng = heroFx?.skill ? fxUrl(heroFx.skill) : undefined
  const basicPng = fxUrl('basic')

  const sub =
    d.type === 'endless' ? '无尽挑战' : d.type === 'abyss' ? '深渊挑战' : `Lv${d.lvMin}-${d.lvMax} · ${d.difficultyName}`

  return (
    <div
      className={`battle-scene tier-${tier}`}
      style={bg ? { backgroundImage: `linear-gradient(rgba(6,8,12,0.35), rgba(6,8,12,0.6)), url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <div className="bs-top">
        <button className="btn danger bs-stop" onClick={() => stopBattle(true)}>
          结束挑战
        </button>
        <div className="bs-info">
          <div className="bs-name">{d.name}</div>
          <div className="bs-sub">
            {sub} · 第 {battle.nextEvent}/{d.eventNum} 关
          </div>
        </div>
        <div className="bs-progress">
          <div className="bs-progress-fill" style={{ width: `${battle.left}%` }} />
          {d.eventType.map((e, i) => (
            <span
              key={i}
              className={`bs-node ${e.type}${battle.nextEvent > i + 1 ? ' cleared' : ''}`}
              style={{ left: `${((i + 1) / d.eventNum) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="bs-arena">
        <div className="bs-side hero-side">
          {enemyFx && (
            <div className="bs-dmg hero-dmg" key={`hd-${enemyFx.id}`}>
              -{fmtNum(enemyFx.dmg)}
            </div>
          )}
          <img className={`sprite bs-hero${fighting ? ' attacking' : ' walking'}`} src={heroImg(heroId)} alt="hero" />
          <div className="bs-hpbar hero">
            <div className="bs-hpbar-fill" style={{ width: `${heroPct}%` }} />
          </div>
        </div>
        <div className="bs-side enemy-side">
          {fighting && heroFx && (
            <div className="bs-fx" key={`fx-${heroFx.id}`}>
              {skillDef ? (
                skillPng ? (
                  <img className="bs-skill-fx sprite" src={skillPng} alt="" />
                ) : (
                  <span className="bs-skill-fx">{skillDef.icon}</span>
                )
              ) : basicPng ? (
                <img className="bs-basic-fx sprite" src={basicPng} alt="" />
              ) : (
                <span className="bs-basic-fx">⚔️</span>
              )}
            </div>
          )}
          {heroFx && (
            <div className={`bs-dmg enemy-dmg${skillDef ? ' skill' : ''}`} key={`ed-${heroFx.id}`}>
              -{fmtNum(heroFx.dmg)}
            </div>
          )}
          <img key={idx} className={`sprite bs-enemy${isBoss ? ' boss' : ''}${fighting ? ' hurt' : ''}`} src={isBoss ? IMG.boss : IMG.monster} alt="enemy" />
          <div className="bs-hpbar enemy">
            <div className="bs-hpbar-fill" style={{ width: `${enemyPct}%` }} />
          </div>
          <div className="bs-enemy-lv">
            Lv{ev.lv} {ev.name}
          </div>
        </div>
      </div>
    </div>
  )
}

function MineStage() {
  const battle = useGame((s) => s.battle)!
  const stopBattle = useGame((s) => s.stopBattle)
  const heroId = useGame((s) => s.heroId)
  const mined = battle.mined ?? 0
  const pop = battle.minePop
  const bg = battleBgUrl('cave')

  return (
    <div
      className="battle-scene tier-cave mine-scene"
      style={bg ? { backgroundImage: `linear-gradient(rgba(6,8,12,0.4), rgba(6,8,12,0.65)), url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <div className="bs-top">
        <button className="btn danger bs-stop" onClick={() => stopBattle(true)}>
          收工离开
        </button>
        <div className="bs-info">
          <div className="bs-name">矿场 · 矿奴</div>
          <div className="bs-sub">安全挖矿中… 本次已挖 💎{fmtNum(mined)}</div>
        </div>
        <div className="bs-progress">
          <div className="bs-progress-fill mine-fill" style={{ width: `${battle.left}%` }} />
        </div>
      </div>

      <div className="bs-arena mine-arena">
        {pop && (
          <div className="mine-pop" key={pop.id}>
            +{fmtNum(pop.dmg)} 💎
          </div>
        )}
        <div className="mine-figure">
          <img className="sprite bs-hero mining" src={heroImg(heroId)} alt="miner" />
          <span className="mine-pick" aria-hidden="true">
            <svg viewBox="0 0 44 44" width="44" height="44">
              {/* 镐头（金属弧）在顶端，木柄向下由矿奴握持 */}
              <path d="M5 15 Q22 4 39 15" fill="none" stroke="#dfe3ea" strokeWidth="6" strokeLinecap="round" />
              <path d="M5 15 Q22 4 39 15" fill="none" stroke="#9aa0ab" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
              <rect x="20" y="13" width="4.4" height="27" rx="2.2" fill="#9a6631" />
            </svg>
          </span>
          <span className="mine-spark" aria-hidden="true">✨</span>
          <span className="mine-ore">💎</span>
        </div>
      </div>
    </div>
  )
}

function DungeonInfo({ d }: { d: Dungeon }) {
  const beginBattle = useGame((s) => s.beginBattle)
  const closeDungeon = useGame((s) => s.closeDungeon)
  const resetEndlessLv = useGame((s) => s.resetEndlessLv)
  const resetAbyssLv = useGame((s) => s.resetAbyssLv)
  const reChallenge = useGame((s) => s.reChallenge)
  const upEChallenge = useGame((s) => s.upEChallenge)
  const reEChallenge = useGame((s) => s.reEChallenge)
  const upAChallenge = useGame((s) => s.upAChallenge)
  const reAChallenge = useGame((s) => s.reAChallenge)
  const setFlag = useGame((s) => s.setChallengeFlag)
  const setAbyssTier = useGame((s) => s.setAbyssTier)
  const abyssTier = useGame((s) => s.abyssTier)
  const abyssLv = useGame((s) => s.abyssLv)
  const gold = useGame((s) => s.gold)
  const charLv = useGame((s) => s.lv)
  const isEndless = d.type === 'endless'

  if (d.type === 'mine') {
    const perCycle = mineYield(charLv)
    return (
      <div className="dungeon-info">
        <div className="di-head">
          <span>当前：矿场</span>
          <div className="di-head-btns">
            <button className="link-btn" onClick={closeDungeon}>
              ✕
            </button>
          </div>
        </div>
        <div className="di-desc">
          <p>· 当矿奴挖矿，安全无风险、不掉血、不消耗</p>
          <p>· 每约 2.5 秒挖到约 💎{fmtNum(perCycle)} 灵石（随等级缓慢增长）</p>
          <p>· 收益微薄，适合起步经济差时慢慢攒钱</p>
        </div>
        <div className="di-actions">
          <button className="btn primary" onClick={beginBattle}>
            开始挖矿
          </button>
        </div>
      </div>
    )
  }

  if (d.type === 'abyss') {
    const tier = abyssTierByKey(abyssTier)
    const cost = abyssEntryCost(tier, charLv, abyssLv)
    const canAfford = gold >= cost
    return (
      <div className="dungeon-info">
        <div className="di-head">
          <span>当前副本：深渊</span>
          <div className="di-head-btns">
            <button className="link-btn" onClick={resetAbyssLv} title="重置深渊层数">
              重置
            </button>
            <button className="link-btn" onClick={closeDungeon}>
              ✕
            </button>
          </div>
        </div>
        <div className="di-row">
          <label className="di-tier">
            难度级别：
            <select value={abyssTier} onChange={(e) => setAbyssTier(e.target.value)}>
              {ABYSS_TIERS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}（副本级别 {t.level}）
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="di-row">
          <span>深渊层数：{abyssLv}</span>
          <span className={canAfford ? '' : 'red'}>进入花费：💎{fmtNum(cost)}</span>
        </div>
        <div className="di-desc">
          <p>· 深渊只掉落装备，不产出灵石</p>
          <p>· 装备爆率高于普通副本，且随层数提高</p>
          <p>· 每次进入扣除灵石 = 副本级别 × 角色等级 × 深渊层级</p>
          <p>· 挑战成功回满血并进入更深一层</p>
        </div>
        <div className="di-actions">
          <div className="di-options">
            <label>
              <input type="checkbox" checked={upAChallenge} onChange={(e) => setFlag('upAChallenge', e.target.checked)} /> 向上挑战
            </label>
            <label>
              <input type="checkbox" checked={reAChallenge} onChange={(e) => setFlag('reAChallenge', e.target.checked)} /> 重复挑战
            </label>
          </div>
          <button className="btn primary" onClick={beginBattle} disabled={!canAfford} title={canAfford ? '' : '灵石不足'}>
            开始挑战
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dungeon-info">
      <div className="di-head">
        <span>{isEndless ? '当前副本：无尽' : `${d.name} · ${d.difficultyName}`}</span>
        <div className="di-head-btns">
          {isEndless && (
            <button className="link-btn" onClick={resetEndlessLv} title="重置无尽层数">
              重置
            </button>
          )}
          <button className="link-btn" onClick={closeDungeon}>
            ✕
          </button>
        </div>
      </div>
      <div className="di-row">
        <span className="di-dps">推荐 DPS：{isEndless ? '???' : fmtNum(d.needDPS)}</span>
        <span>{isEndless ? `无尽层数：${d.lv}` : `副本等级：Lv${d.lvMin}-${d.lvMax}`}</span>
      </div>
      <div className="di-desc">
        {isEndless ? (
          <>
            <p>· 无尽难度大致为层数 ×5 的极难副本</p>
            <p>· 无尽模式仅能获得灵石，没有装备</p>
            <p>· 挑战成功会回满血并进入下一层</p>
          </>
        ) : (
          <>
            <p>· 难度分为：普通 / 困难 / 极难</p>
            <p>· 难度越高装备爆率越高</p>
            <p>· 困难、极难仅能挑战一次</p>
          </>
        )}
      </div>
      <div className="di-actions">
        <div className="di-options">
          {isEndless ? (
            <>
              <label>
                <input type="checkbox" checked={upEChallenge} onChange={(e) => setFlag('upEChallenge', e.target.checked)} /> 向上挑战
              </label>
              <label>
                <input type="checkbox" checked={reEChallenge} onChange={(e) => setFlag('reEChallenge', e.target.checked)} /> 重复挑战
              </label>
            </>
          ) : (
            d.difficulty === 1 && (
              <label>
                <input type="checkbox" checked={reChallenge} onChange={(e) => setFlag('reChallenge', e.target.checked)} /> 重复挑战
              </label>
            )
          )}
        </div>
        <button className="btn primary" onClick={beginBattle}>
          开始挑战
        </button>
      </div>
    </div>
  )
}

export function MapPanel() {
  const battle = useGame((s) => s.battle)
  const dungeons = useGame((s) => s.dungeons)
  const selectedDungeon = useGame((s) => s.selectedDungeon)
  const endlessLv = useGame((s) => s.endlessLv)
  const lv = useGame((s) => s.lv)
  const selectDungeon = useGame((s) => s.selectDungeon)
  const selectEndless = useGame((s) => s.selectEndless)
  const selectAbyss = useGame((s) => s.selectAbyss)
  const selectMine = useGame((s) => s.selectMine)

  return (
    <div
      className="panel map-panel"
      style={{
        backgroundImage: `linear-gradient(rgba(8,11,16,0.5), rgba(8,11,16,0.72)), url(${IMG.mapBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {battle ? (
        battle.dungeon.type === 'mine' ? (
          <MineStage />
        ) : (
          <BattleStage />
        )
      ) : (
        <>
          {dungeons.map((d) => (
            <button
              key={d.id}
              className={`map-node diff-${d.difficulty}`}
              style={{ top: d.top, left: d.left }}
              onClick={() => selectDungeon(d)}
              title={`${d.name} · Lv${d.lvMin}-${d.lvMax} · ${d.difficultyName}`}
            >
              <span className="node-icon">{d.difficulty === 3 ? '👹' : d.difficulty === 2 ? '⚔️' : '🗺️'}</span>
              <span className="node-name">{d.name}</span>
              <span className="node-lv">Lv{d.lvMin}-{d.lvMax}</span>
            </button>
          ))}
          {endlessLv > 0 && lv >= 10 && (
            <button className="map-node endless" style={{ top: '6%', left: '10%' }} onClick={selectEndless}>
              <span className="node-icon">♾️</span>
              <span className="node-lv">无尽</span>
            </button>
          )}
          {lv >= 10 && (
            <button className="map-node abyss" style={{ top: '6%', left: '23%' }} onClick={selectAbyss}>
              <span className="node-icon">🕳️</span>
              <span className="node-lv">深渊</span>
            </button>
          )}
          <button className="map-node mine" style={{ top: '6%', left: '36%' }} onClick={selectMine}>
            <span className="node-icon">⛏️</span>
            <span className="node-lv">矿场</span>
          </button>
          {selectedDungeon && <DungeonInfo d={selectedDungeon} />}
        </>
      )}
    </div>
  )
}
