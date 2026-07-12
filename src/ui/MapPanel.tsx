import { useGame } from '../game/store'
import { IMG } from '../assets/game'
import { heroImg } from '../assets/heroes'
import { battleTier, battleBgUrl, fxUrl } from '../assets/battle'
import { skillById } from '../game/skills'
import type { Dungeon } from '../game/types'

function BattleStage() {
  const battle = useGame((s) => s.battle)!
  const stopBattle = useGame((s) => s.stopBattle)
  const heroId = useGame((s) => s.heroId)
  const skills = useGame((s) => s.skills)
  const d = battle.dungeon

  const idx = Math.min(battle.nextEvent - 1, d.eventNum - 1)
  const ev = d.eventType[idx]
  const isBoss = ev.type === 'boss'
  const fighting = battle.phase === 'fight'
  const tier = battleTier(d.type === 'endless' ? d.lv * 5 : d.lvMin)
  const bg = battleBgUrl(tier)
  const skillFx = skills.map((id) => skillById(id)).filter(Boolean).slice(0, 4)
  const heroFx = fxUrl('basic')

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
          <div className="bs-name">{d.type === 'endless' ? `无尽 · 第${d.lv}层` : d.name}</div>
          <div className="bs-sub">
            {d.type === 'endless' ? '无尽挑战' : `Lv${d.lvMin}-${d.lvMax} · ${d.difficultyName}`} · 第 {battle.nextEvent}/{d.eventNum} 关
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
          <img className={`sprite bs-hero${fighting ? ' attacking' : ' walking'}`} src={heroImg(heroId)} alt="hero" />
        </div>
        <div className="bs-side enemy-side">
          <img key={idx} className={`sprite bs-enemy${isBoss ? ' boss' : ''}${fighting ? ' hurt' : ''}`} src={isBoss ? IMG.boss : IMG.monster} alt="enemy" />
          <div className="bs-enemy-lv">
            Lv{ev.lv} {ev.name}
          </div>
          {fighting && (
            <div className="bs-fx" key={`${idx}-${battle.fightUntil}`}>
              {heroFx ? <img className="bs-basic-fx sprite" src={heroFx} alt="" /> : <span className="bs-basic-fx">⚔️</span>}
              {skillFx.map((sk, i) => {
                const png = fxUrl(sk!.id)
                const style = { animationDelay: `${i * 120}ms`, left: `${-14 + i * 16}px`, top: `${-10 + (i % 2) * 20}px` }
                return png ? (
                  <img key={sk!.id} className="bs-skill-fx sprite" src={png} alt="" style={style} />
                ) : (
                  <span key={sk!.id} className="bs-skill-fx" style={style}>
                    {sk!.icon}
                  </span>
                )
              })}
            </div>
          )}
          {fighting && battle.lastResult && (
            <div className="bs-dmg" key={`dmg-${idx}-${battle.fightUntil}`}>
              -{battle.lastResult.dmg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DungeonInfo({ d }: { d: Dungeon }) {
  const beginBattle = useGame((s) => s.beginBattle)
  const closeDungeon = useGame((s) => s.closeDungeon)
  const resetEndlessLv = useGame((s) => s.resetEndlessLv)
  const reChallenge = useGame((s) => s.reChallenge)
  const upEChallenge = useGame((s) => s.upEChallenge)
  const reEChallenge = useGame((s) => s.reEChallenge)
  const setFlag = useGame((s) => s.setChallengeFlag)
  const isEndless = d.type === 'endless'

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
        <span className="di-dps">推荐 DPS：{isEndless ? '???' : d.needDPS}</span>
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
        <BattleStage />
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
          {selectedDungeon && <DungeonInfo d={selectedDungeon} />}
        </>
      )}
    </div>
  )
}
