import { useGame } from '../game/store'
import { IMG } from '../assets/game'
import { expForLevel, lingshiForLevels } from '../game/formulas'

function fmt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const PRIMARY_ROWS = [
  { k: 'STR', n: '力量', i: '💪', t: '力量 → 攻击' },
  { k: 'VIT', n: '体魄', i: '🫀', t: '体魄 → 生命' },
  { k: 'CON', n: '根骨', i: '🦴', t: '根骨 → 防御' },
  { k: 'AGI', n: '敏捷', i: '🌀', t: '敏捷 → 暴击' },
  { k: 'SPR', n: '神识', i: '🔮', t: '神识 → 法力' },
  { k: 'LUCK', n: '气运', i: '🍀', t: '气运 → 幸运' },
] as const

export function StatusPanel() {
  const attribute = useGame((s) => s.attribute)
  const lv = useGame((s) => s.lv)
  const exp = useGame((s) => s.exp)
  const gold = useGame((s) => s.gold)
  const reincarnation = useGame((s) => s.reincarnation)
  const mp = useGame((s) => s.mp)
  const maxMp = useGame((s) => s.maxMp)
  const skillDPS = useGame((s) => s.skillDPS)
  const totalDPS = useGame((s) => s.totalDPS)
  const primary = useGame((s) => s.primary)
  const buyLevels = useGame((s) => s.buyLevels)

  const expNeed = expForLevel(lv)
  const expPct = expNeed ? (exp / expNeed) * 100 : 0
  const hpPct = attribute.MAXHP.value ? (attribute.CURHP.value / attribute.MAXHP.value) * 100 : 0
  const mpPct = maxMp ? (mp / maxMp) * 100 : 0
  const reduc = ((1 - attribute.REDUCDMG) * 100).toFixed(1)

  const stats: { icon: string; label: string; value: string; title: string }[] = [
    { icon: IMG.atk, label: '攻击', value: fmt(attribute.ATK.value), title: '角色攻击力' },
    { icon: IMG.crit, label: '暴击', value: `${attribute.CRIT.value}%`, title: '暴击率（最高 100%）' },
    { icon: IMG.critdmg, label: '暴伤', value: `${attribute.CRITDMG.value}%`, title: '暴击伤害（初始 150%）' },
    { icon: IMG.def, label: '防御', value: fmt(attribute.DEF.value), title: `防御力 ${fmt(attribute.DEF.value)}（减伤 ${reduc}%，非线性）` },
    { icon: IMG.bloc, label: '格挡', value: fmt(attribute.BLOC.value), title: '格挡伤害' },
    {
      icon: IMG.dps,
      label: 'DPS',
      value: fmt(Math.round(totalDPS)),
      title: `总每秒伤害（普攻 ${attribute.DPS.toFixed(0)}${skillDPS > 0 ? ` + 技能 ${skillDPS.toFixed(0)}` : ''}，含黄字 ${attribute.DMGAMP}% · 白字 ${attribute.DMGADD}% · 技能伤害 ${attribute.SKILLDMG}%）`,
    },
  ]

  return (
    <div className="panel status-panel">
      <div className="row lv-row">
        <div className="lv-badge">Lv {lv}</div>
        <div className="rein-badge">转生 ×{reincarnation.count}</div>
        <div className="gold-badge" title="灵石">💎 {fmt(gold)}</div>
      </div>

      <div className="exp-row">
        <div className="exp-bar" title={`经验：${fmt(exp)} / ${fmt(expNeed)}（每秒自动获得，击杀只给灵石）`}>
          <div className="exp-fill" style={{ width: `${Math.min(100, expPct)}%` }} />
          <div className="exp-text">
            EXP {fmt(exp)} / {fmt(expNeed)}
          </div>
        </div>
        <div className="exp-convert" title="花灵石直接提升等级">
          {[1, 10, 100].map((n) => {
            const cost = lingshiForLevels(lv, exp, n)
            return (
              <button
                key={n}
                className="exp-btn"
                disabled={gold < cost}
                onClick={() => buyLevels(n)}
                title={`提升 ${n} 级，需 ${fmt(cost)} 灵石`}
              >
                +{n}
              </button>
            )
          })}
        </div>
      </div>

      <div className="hp-bar" title="当前 / 最大生命值（每秒回复 2%）">
        <div className="hp-fill" style={{ width: `${hpPct}%` }} />
        <div className="hp-text">
          <img className="stat-img hp-icon" src={IMG.hp} alt="hp" />
          {fmt(attribute.CURHP.value)} / {fmt(attribute.MAXHP.value)}
        </div>
      </div>

      <div className="mp-bar" title="法力值（每秒回复，释放技能消耗）">
        <div className="mp-fill" style={{ width: `${mpPct}%` }} />
        <div className="mp-text">
          ✦ {fmt(Math.floor(mp))} / {fmt(maxMp)}
        </div>
      </div>

      <div className="stat-area">
        <div className="stat-grid">
          {stats.map((s) => (
            <div className="stat-cell" key={s.label} title={s.title}>
              <img className="stat-img" src={s.icon} alt={s.label} />
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="primary-col">
          {PRIMARY_ROWS.map((p) => (
            <div className="pc-row" key={p.k} title={`${p.n}（${p.t}）`}>
              <span className="pc-i">{p.i}</span>
              <span className="pc-v">{fmt(primary[p.k])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dmg-strip">
        <span className="dmg-amp" title="伤害增幅 · 黄字（取最大值）">🟡 增幅 +{attribute.DMGAMP}%</span>
        <span className="dmg-add" title="伤害附加 · 白字（加算）">⚪ 附加 +{attribute.DMGADD}%</span>
        <span className="dmg-skill" title="技能伤害（乘算）">🔵 技伤 +{attribute.SKILLDMG}%</span>
      </div>
    </div>
  )
}
