import { useState } from 'react'
import { useGame } from '../game/store'
import { baptizeNeedGold, enchantMultiplier, recastNeedGold, strengthenNeedGold } from '../game/formulas'
import { fmtNum } from '../game/format'
import { RECAST_POOL } from '../game/itemData'
import { AFFIX_COLOR } from '../game/constants'
import type { AttrType } from '../game/types'

const REFORGE_OPTIONS = RECAST_POOL.map((p) => ({ type: p.type, label: p.name }))

export function StrengthenPanel() {
  const item = useGame((s) => s.strengthenTarget)
  const gold = useGame((s) => s.gold)
  const doStrengthen = useGame((s) => s.doStrengthen)
  const autoStrengthen = useGame((s) => s.autoStrengthen)
  const doReforge = useGame((s) => s.doReforge)
  const autoReforge = useGame((s) => s.autoReforge)
  const toggleAffixLock = useGame((s) => s.toggleAffixLock)
  const unlockAllAffixes = useGame((s) => s.unlockAllAffixes)
  const baptize = useGame((s) => s.baptize)
  const autoBaptize = useGame((s) => s.autoBaptize)

  const [autoTarget, setAutoTarget] = useState(12)
  const [baptizeTarget, setBaptizeTarget] = useState(80)
  const [pick, setPick] = useState<Record<number, AttrType | ''>>({})

  if (!item) return null

  const need = strengthenNeedGold(item)
  const recast = recastNeedGold(item)
  const innate = item.innate ?? []
  const lockedCount = [...item.extraEntry, ...innate].filter((e) => e.locked).length
  const totalAffixes = item.extraEntry.length + innate.length
  const baptizeCost = baptizeNeedGold(item, lockedCount)
  const mNow = enchantMultiplier(item.enchantlvl)
  const mNext = enchantMultiplier(item.enchantlvl + 1)

  return (
    <div className="strengthen">
      <div className="st-title" style={{ color: item.quality.color }}>
        <span className="st-icon">{item.icon}</span>
        {item.type.name} {item.enchantlvl ? `(+${item.enchantlvl})` : ''}
      </div>

      <div className="st-section-label" title="强化提升基础属性；6级起有失败概率，失败可能降级">
        — 强化 —
      </div>
      <div className="st-preview">
        {item.type.entry.map((v, i) => {
          const isPct = /率|伤害/.test(v.name)
          const now = Math.round(v.value * mNow)
          const next = Math.round(v.value * mNext)
          return (
            <div className="st-line" key={i}>
              <span>{v.name}</span>
              <span className="st-old">
                +{fmtNum(now)}
                {isPct ? '%' : ''}
              </span>
              <span className="st-arrow">➜</span>
              <span className="st-new">
                +{fmtNum(next)}
                {isPct ? '%' : ''} <span className="st-up">⬆{fmtNum(next - now)}</span>
              </span>
            </div>
          )
        })}
      </div>

      <div className="st-actions">
        <span>
          需要灵石：<b className={gold < need ? 'red' : ''}>{fmtNum(need)}</b>
        </span>
        <button className="btn primary" onClick={() => doStrengthen()}>
          强化至 +{item.enchantlvl + 1}
        </button>
      </div>
      <div className="st-actions">
        <span>一键强化到</span>
        <input
          type="number"
          min={1}
          max={15}
          value={autoTarget}
          onChange={(e) => setAutoTarget(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
        />
        <button
          className="btn"
          disabled={gold < need || item.enchantlvl >= autoTarget}
          onClick={() => autoStrengthen(autoTarget)}
          title={`一直强化直到 +${autoTarget} 或灵石不足（每级 ${fmtNum(need)}+ 灵石，越高越贵、可能失败降级）`}
        >
          强化到 +{autoTarget}
        </button>
      </div>

      <div className="st-section-label" title="重铸只改变基础词条的类型（固定数值、吃强化）；选一个方向可“洗到为止”">
        — 词条重铸 · 换类型（{fmtNum(recast)} 灵石 / 次）—
      </div>
      <div className="st-reforge">
        {item.extraEntry.map((v, k) => {
          const chosen = pick[k] ?? ''
          const label = REFORGE_OPTIONS.find((o) => o.type === chosen)?.label
          return (
            <div className="reforge-row" key={k}>
              <div className="re-affix">
                {v.name} : {v.showVal}
                {v.q != null && <span className="entry-lvl"> (品质 {Math.round(v.q * 100)}%)</span>}
              </div>
              <select
                className="re-select"
                value={chosen}
                onChange={(e) => setPick({ ...pick, [k]: e.target.value as AttrType | '' })}
              >
                <option value="">随机</option>
                {REFORGE_OPTIONS.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
              {chosen ? (
                <button className="btn primary re-btn" disabled={gold < recast} onClick={() => autoReforge(k, chosen)} title={`一直随机重铸直到洗出「${label}」或灵石不足`}>
                  洗到「{label}」
                </button>
              ) : (
                <button className="btn re-btn" disabled={gold < recast} onClick={() => doReforge(k)} title={`随机重铸一次，花费 ${fmtNum(recast)} 灵石`}>
                  重铸 💎{fmtNum(recast)}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="st-section-label" title="随机刷新所有未锁定词条的品质数值；点词条可锁定（洗礼时保留），锁得越多越贵">
        — 品质洗礼 · 刷数值（🔒 锁定不想洗的）—
      </div>
      <div className="st-baptize">
        {[
          ...item.extraEntry.map((v, i) => ({ v, section: 'extra' as const, i })),
          ...innate.map((v, i) => ({ v, section: 'innate' as const, i })),
        ].map(({ v, section, i }) => {
          const color = AFFIX_COLOR[v.type]
          return (
            <div
              className={`baptize-row${v.locked ? ' locked' : ''}`}
              key={`${section}-${i}`}
              onClick={() => toggleAffixLock(section, i)}
              title={v.locked ? '已锁定，洗礼时保留' : '点击锁定，洗礼时不改变'}
            >
              <span className="bp-lock">{v.locked ? '🔒' : '🔓'}</span>
              <span className="bp-name" style={color ? { color } : undefined}>
                {section === 'innate' ? '本体·' : ''}
                {v.name}
              </span>
              <span className="bp-val" style={color ? { color } : undefined}>
                {v.showVal}
                {v.q != null && <span className="bp-q"> ({Math.round(v.q * 100)}%)</span>}
              </span>
            </div>
          )
        })}
      </div>
      <div className="st-actions">
        <span>锁定 {lockedCount} / {totalAffixes} 条</span>
        <button
          className="link-btn"
          disabled={lockedCount === 0}
          onClick={() => unlockAllAffixes()}
          title="一次性解锁全部词条"
        >
          批量解锁
        </button>
        <button
          className="btn"
          disabled={gold < baptizeCost || lockedCount >= totalAffixes}
          onClick={() => baptize()}
          title="随机刷新一次所有未锁定词条的品质数值"
        >
          品质洗礼 💎{fmtNum(baptizeCost)}
        </button>
      </div>
      <div className="st-actions">
        <span>快速洗到品质 ≥</span>
        <input
          type="number"
          min={1}
          max={100}
          value={baptizeTarget}
          onChange={(e) => setBaptizeTarget(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
        />
        <span>%</span>
        <button
          className="btn primary"
          disabled={gold < baptizeCost || lockedCount >= totalAffixes}
          onClick={() => autoBaptize(baptizeTarget)}
          title={`反复洗礼未锁定词条，每条品质达到 ${baptizeTarget}% 就自动锁定，直到全部达标或灵石不足`}
        >
          快速洗礼
        </button>
      </div>
    </div>
  )
}
