import type { Item } from '../game/types'
import { enchantMultiplier } from '../game/formulas'
import { AFFIX_COLOR } from '../game/constants'
import { useGame } from '../game/store'
import { ItemIcon } from './ItemIcon'

interface Props {
  item: Item
  compact?: boolean
}

const SLOT_LABEL: Record<string, string> = {
  weapon: '武器',
  armor: '护甲',
  ring: '戒指',
  neck: '项链',
}

/** 完整的装备详情卡片 — 在工具提示等场景中复用。 */
export function ItemCard({ item }: Props) {
  const playerLv = useGame((s) => s.lv)
  const mult = enchantMultiplier(item.enchantlvl)
  const color = item.quality.color
  const isUnique = item.quality.name === '独特'
  const reqUnmet = playerLv < item.lv

  return (
    <div
      className={`item-card${isUnique ? ' unique' : ''}${item.enchantlvl >= 13 ? ' red-flash' : ''}`}
      style={{ boxShadow: `0 0 6px 2px ${color}55`, borderColor: `${color}88` }}
    >
      <div className="ic-head">
        <div className="ic-icon" style={{ boxShadow: `inset 0 0 8px 2px ${color}` }}>
          <ItemIcon item={item} />
        </div>
        <div className="ic-title">
          <div className="ic-name" style={{ color }}>
            {item.type.name}
            {item.enchantlvl ? ` (+${item.enchantlvl})` : ''}
          </div>
          <div className="ic-sub">
            <span style={{ color }}>{item.quality.name}</span>
            <span>· {SLOT_LABEL[item.itemType]}</span>
            <span className={reqUnmet ? 'ic-req-unmet' : undefined}>
              · 需求 Lv{item.lv}
              {reqUnmet ? ' ✕' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="ic-entries">
        {item.type.entry.map((v, i) => {
          const eff = Math.round(v.value * mult)
          const bonus = eff - v.value
          const pct = /率|伤害|%/.test(v.showVal)
          return (
            <div className="ic-entry" key={i}>
              <span>{v.name}</span>
              <span className="ic-val">
                +{eff}
                {pct ? '%' : ''}
                {item.enchantlvl > 0 && bonus > 0 && <span className="ic-bonus"> (+{bonus})</span>}
              </span>
            </div>
          )
        })}
      </div>

      {item.extraEntry.length > 0 && (
        <div className="ic-entries ic-extra">
          {item.extraEntry.map((v, i) => {
            const pct = v.showVal.includes('%')
            const eff = Math.round(v.value * mult) // 基础词条吃强化
            const bonus = eff - v.value
            return (
              <div className="ic-entry" key={i}>
                <span>
                  {v.locked && '🔒 '}
                  {v.name}
                </span>
                <span className="ic-val">
                  +{eff}
                  {pct ? '%' : ''}
                  {item.enchantlvl > 0 && bonus > 0 && <span className="ic-bonus"> (+{bonus})</span>}
                  {v.q != null && <span className="ic-lvl"> {Math.round(v.q * 100)}%</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {(item.innate?.length ?? 0) > 0 && (
        <div className="ic-entries ic-innate">
          <div className="ic-innate-label">本体词条 · 不可重铸</div>
          {item.innate!.map((v, i) => {
            const c = AFFIX_COLOR[v.type]
            return (
              <div className="ic-entry" key={i} style={c ? { color: c } : undefined}>
                <span>
                  {v.locked && '🔒 '}
                  {v.name}
                </span>
                <span className="ic-val">
                  {v.showVal}
                  {v.q != null && <span className="ic-lvl"> {Math.round(v.q * 100)}%</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {item.type.des && <div className="ic-des">{item.type.des}</div>}
    </div>
  )
}
