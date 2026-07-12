import { useGame } from '../game/store'
import { useTooltip } from './tooltipStore'
import { SLOT_META } from '../game/constants'
import { ItemIcon } from './ItemIcon'
import type { Item, ItemType } from '../game/types'

const ORDER: ItemType[] = ['weapon', 'armor', 'ring', 'neck']

export function EquipmentBar() {
  const equipment = useGame((s) => s.equipment)
  const show = useTooltip((s) => s.show)
  const hide = useTooltip((s) => s.hide)

  return (
    <div className="panel equip-bar">
      <div className="panel-heading">当前装备</div>
      <div className="equip-slots">
        {ORDER.map((slot) => {
          const item: Item = equipment[slot]
          const color = item.quality.color
          return (
            <div
              key={slot}
              className={`equip-slot${item.quality.name === '独特' ? ' unique' : ''}${item.enchantlvl >= 13 ? ' red-flash' : ''}`}
              onMouseEnter={(e) => show(item, e)}
              onMouseLeave={hide}
            >
              <div className="equip-icon" style={{ boxShadow: `inset 0 0 8px 2px ${color}` }}>
                <ItemIcon item={item} />
              </div>
              <div className="equip-meta">
                <div className="equip-slot-label">{SLOT_META[slot].label}</div>
                <div className="equip-name" style={{ color }}>
                  {item.type.name}
                  {item.enchantlvl ? ` +${item.enchantlvl}` : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
