import { useGame } from '../game/store'
import { computePlayerAttribute, itemScore } from '../game/formulas'
import type { Item } from '../game/types'

/** Shows how the player's stats would change if this item were equipped. */
export function CompareDelta({ item }: { item: Item }) {
  const equipment = useGame((s) => s.equipment)
  const rA = useGame((s) => s.reincarnationAttribute)
  const attribute = useGame((s) => s.attribute)
  const primary = useGame((s) => s.primary)

  const slot = item.itemType
  const equipped = equipment[slot]
  // Don't show a delta for the item that's already equipped in that slot.
  if (equipped.id === item.id) return null

  const ratio = attribute.MAXHP.value ? attribute.CURHP.value / attribute.MAXHP.value : 1
  const cur = computePlayerAttribute(equipment, rA, ratio, primary)
  const next = computePlayerAttribute({ ...equipment, [slot]: item }, rA, ratio, primary)

  // effective auto DPS including 黄字/白字 multipliers (skills excluded here for a quick estimate)
  const effDps = (x: typeof cur) => x.DPS * (1 + x.DMGAMP / 100) * (1 + x.DMGADD / 100)

  const rows = [
    { k: 'DPS', d: effDps(next) - effDps(cur), dec: 1 },
    { k: '攻击', d: next.ATK.value - cur.ATK.value, dec: 0 },
    { k: '生命', d: next.MAXHP.value - cur.MAXHP.value, dec: 0 },
    { k: '防御', d: next.DEF.value - cur.DEF.value, dec: 0 },
    { k: '暴击', d: next.CRIT.value - cur.CRIT.value, dec: 0, unit: '%' },
    { k: '暴伤', d: next.CRITDMG.value - cur.CRITDMG.value, dec: 0, unit: '%' },
    { k: '格挡', d: next.BLOC.value - cur.BLOC.value, dec: 0 },
    { k: '黄字', d: next.DMGAMP - cur.DMGAMP, dec: 0, unit: '%' },
    { k: '白字', d: next.DMGADD - cur.DMGADD, dec: 0, unit: '%' },
    { k: '技能', d: next.SKILLDMG - cur.SKILLDMG, dec: 1, unit: '%' },
  ].filter((r) => Math.abs(r.d) > (r.dec ? 0.05 : 0.5))

  const scoreDelta = itemScore(item) - itemScore(equipped)

  return (
    <div className="compare-delta">
      <div className={`cd-title ${scoreDelta > 0 ? 'up' : scoreDelta < 0 ? 'down' : ''}`}>
        装备后变化
        <span className="cd-verdict">
          {scoreDelta > 0 ? '↑ 提升' : scoreDelta < 0 ? '↓ 下降' : '＝ 持平'}
        </span>
      </div>
      <div className="cd-rows">
        {rows.length === 0 && <div className="cd-none">主要属性无变化</div>}
        {rows.map((r) => (
          <div className="cd-row" key={r.k}>
            <span className="cd-k">{r.k}</span>
            <span className={r.d > 0 ? 'up' : 'down'}>
              {r.d > 0 ? '▲' : '▼'} {Math.abs(r.d).toFixed(r.dec)}
              {r.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
