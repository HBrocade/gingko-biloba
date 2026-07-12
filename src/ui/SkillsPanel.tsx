import { useGame } from '../game/store'
import { SKILL_CATALOG } from '../game/skills'

export function SkillsPanel() {
  const skills = useGame((s) => s.skills)
  const gold = useGame((s) => s.gold)
  const atk = useGame((s) => s.attribute.ATK.value)
  const skillDPS = useGame((s) => s.skillDPS)
  const mpRegen = useGame((s) => s.mpRegen)
  const buySkill = useGame((s) => s.buySkill)

  const owned = SKILL_CATALOG.filter((s) => skills.includes(s.id))
  const forSale = SKILL_CATALOG.filter((s) => !skills.includes(s.id))
  const demand = owned.reduce((s, d) => s + d.mpCost / d.cooldown, 0)
  const throttled = demand > mpRegen

  return (
    <div className="skills-panel">
      <div className="sp-summary">
        <span>已学技能 {owned.length} / {SKILL_CATALOG.length}</span>
        <span>技能 DPS：<b>{skillDPS.toFixed(0)}</b></span>
      </div>
      {throttled && owned.length > 0 && (
        <div className="sp-warn">⚠️ 法力回复不足以全力释放所有技能（等级越高法力上限越高）。</div>
      )}

      {owned.length > 0 && (
        <>
          <div className="sp-section">已学技能</div>
          <div className="skill-list">
            {owned.map((sk) => (
              <div className="skill-card owned" key={sk.id}>
                <div className="sk-icon">{sk.icon}</div>
                <div className="sk-body">
                  <div className="sk-name">{sk.name}</div>
                  <div className="sk-stats">
                    <span title="每次伤害 = 倍率 × 攻击力">💥 {sk.multiplier}×攻击 ≈ {Math.round(sk.multiplier * atk).toLocaleString()}</span>
                    <span>✦ {sk.mpCost} MP</span>
                    <span>⏱ {sk.cooldown}s</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sp-section">技能商店</div>
      {forSale.length === 0 ? (
        <div className="sp-empty">已学会全部技能，你就是传说！</div>
      ) : (
        <div className="skill-list">
          {forSale.map((sk) => {
            const poor = gold < sk.price
            return (
              <div className="skill-card" key={sk.id}>
                <div className="sk-icon">{sk.icon}</div>
                <div className="sk-body">
                  <div className="sk-name">{sk.name}</div>
                  <div className="sk-desc">{sk.desc}</div>
                  <div className="sk-stats">
                    <span>✦ {sk.mpCost} MP</span>
                    <span>⏱ {sk.cooldown}s</span>
                  </div>
                </div>
                <div className="sk-buy">
                  <div className={`sk-price${poor ? ' poor' : ''}`}>💎 {sk.price.toLocaleString()}</div>
                  <button className="btn primary" disabled={poor} onClick={() => buySkill(sk.id)}>
                    {poor ? '钱不够' : '学习'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
