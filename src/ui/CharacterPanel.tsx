import { useGame } from '../game/store'
import { expForLevel, PRIMARY_EFFECT } from '../game/formulas'
import { fmtNum } from '../game/format'

function fmt(n: number): string {
  return fmtNum(Math.round(n))
}

const PRIMARY_ROWS: { key: keyof typeof PRIMARY_EFFECT; name: string; icon: string; desc: string }[] = [
  { key: 'STR', name: '力量', icon: '💪', desc: '强健的体魄带来更高攻击' },
  { key: 'VIT', name: '体魄', icon: '🫀', desc: '越强壮生命值越高' },
  { key: 'CON', name: '根骨', icon: '🦴', desc: '根骨深厚，防御更强' },
  { key: 'AGI', name: '敏捷', icon: '🌀', desc: '身法越快暴击越高' },
  { key: 'SPR', name: '神识', icon: '🔮', desc: '神识决定法力上限' },
  { key: 'LUCK', name: '气运', icon: '🍀', desc: '气运加身，福泽绵长' },
]

export function CharacterPanel() {
  const lv = useGame((s) => s.lv)
  const exp = useGame((s) => s.exp)
  const reincarnation = useGame((s) => s.reincarnation)
  const primary = useGame((s) => s.primary)
  const a = useGame((s) => s.attribute)
  const mp = useGame((s) => s.mp)
  const maxMp = useGame((s) => s.maxMp)
  const skillDPS = useGame((s) => s.skillDPS)
  const totalDPS = useGame((s) => s.totalDPS)

  const reduc = ((1 - a.REDUCDMG) * 100).toFixed(1)

  const combatRows: { label: string; value: string; color?: string }[] = [
    { label: '生命值', value: `${fmt(a.CURHP.value)} / ${fmt(a.MAXHP.value)}` },
    { label: '法力值', value: `${fmt(mp)} / ${fmt(maxMp)}` },
    { label: '攻击力', value: fmt(a.ATK.value) },
    { label: '暴击率', value: `${a.CRIT.value}%` },
    { label: '暴击伤害', value: `${a.CRITDMG.value}%` },
    { label: '防御力', value: `${fmt(a.DEF.value)}（减伤 ${reduc}%）` },
    { label: '格挡', value: fmt(a.BLOC.value) },
    { label: '闪避', value: `${a.EVA.value}%` },
    { label: '伤害增幅（黄字·取最大）', value: `+${a.DMGAMP}%`, color: '#ffd23f' },
    { label: '伤害附加（白字·加算）', value: `+${a.DMGADD}%`, color: '#ffffff' },
    { label: '技能伤害（乘算）', value: `+${a.SKILLDMG}%`, color: '#4db8ff' },
    { label: '总 DPS', value: `${fmt(Math.round(totalDPS))}（普攻 ${a.DPS.toFixed(0)} + 技能 ${skillDPS.toFixed(0)}，已含增幅）` },
  ]

  return (
    <div className="char-panel">
      <div className="char-section">基础</div>
      <ul className="attr-list">
        <li><span className="al-k">等级</span><span className="al-v">Lv {lv}</span></li>
        <li><span className="al-k">经验</span><span className="al-v">{fmt(exp)} / {fmt(expForLevel(lv))}</span></li>
        <li><span className="al-k">转生次数</span><span className="al-v">{reincarnation.count}</span></li>
        <li><span className="al-k">转生点数</span><span className="al-v">{reincarnation.point}</span></li>
      </ul>

      <div className="char-section">主属性 <span className="cs-hint">随等级成长，加成战斗属性</span></div>
      <ul className="attr-list primary">
        {PRIMARY_ROWS.map((r) => {
          const val = primary[r.key]
          const eff = PRIMARY_EFFECT[r.key]
          return (
            <li key={r.key} title={r.desc}>
              <span className="al-k">
                <span className="al-icon">{r.icon}</span>
                {r.name}
              </span>
              <span className="al-mid">{eff.per > 0 ? `→ ${eff.stat}` : '　'}</span>
              <span className="al-v strong">{fmt(val)}</span>
            </li>
          )
        })}
      </ul>

      <div className="char-section">战斗属性</div>
      <ul className="attr-list">
        {combatRows.map((r) => (
          <li key={r.label}>
            <span className="al-k" style={r.color ? { color: r.color } : undefined}>{r.label}</span>
            <span className="al-v" style={r.color ? { color: r.color } : undefined}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
