import { useState } from 'react'
import { useGame } from '../game/store'
import { useTooltip } from './tooltipStore'
import { QUALITY_NAMES } from '../game/constants'
import { ItemIcon } from './ItemIcon'

interface Props {
  onStrengthen: (index: number) => void
}

export function Backpack({ onStrengthen }: Props) {
  const backpack = useGame((s) => s.backpack)
  const equipment = useGame((s) => s.equipment)
  const playerLv = useGame((s) => s.lv)
  const autoSell = useGame((s) => s.autoSell)
  const equipItem = useGame((s) => s.equipItem)
  const sellFromBackpack = useGame((s) => s.sellFromBackpack)
  const toggleLock = useGame((s) => s.toggleLock)
  const unlockAllBackpack = useGame((s) => s.unlockAllBackpack)
  const neaten = useGame((s) => s.neatenBackpack)
  const optimalSort = useGame((s) => s.optimalSortBackpack)
  const autoEquip = useGame((s) => s.autoEquipBest)
  const sellAll = useGame((s) => s.sellAllBackpack)
  const setAutoSell = useGame((s) => s.setAutoSell)
  const show = useTooltip((s) => s.show)
  const hide = useTooltip((s) => s.hide)

  const [menu, setMenu] = useState<{ index: number } | null>(null)
  const [showAutoSell, setShowAutoSell] = useState(false)

  const count = backpack.filter(Boolean).length
  const lockedCount = backpack.filter((it) => it?.locked).length
  const nearFull = count / backpack.length > 0.8
  const menuItem = menu ? backpack[menu.index] : null

  return (
    <div className="backpack">
      <div className="grid-wrap">
        {backpack.map((item, k) => (
          <div
            key={k}
            className={`grid-cell${item ? '' : ' empty'}`}
            onMouseEnter={(e) => item && show(item, e, equipment[item.itemType])}
            onMouseLeave={hide}
            onClick={() => {
              if (item) setMenu(menu?.index === k ? null : { index: k })
            }}
          >
            {item && (
              <div
                className={`cell-icon${item.enchantlvl >= 13 ? ' red-flash' : ''}${item.quality.name === '独特' ? ' unique' : ''}${item.lv > playerLv ? ' over-level' : ''}`}
                style={{ boxShadow: `inset 0 0 7px 2px ${item.quality.color}` }}
              >
                <ItemIcon item={item} />
                {item.locked && <span className="cell-lock">🔒</span>}
                {item.lv > playerLv && <span className="cell-req" title={`需要 Lv${item.lv}`}>Lv{item.lv}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={`capacity${nearFull ? ' warn' : ''}`}>
        {count} / {backpack.length}
      </div>

      <div className="backpack-actions">
        <div className="autosell-wrap">
          <button className="link-btn" onClick={() => setShowAutoSell((v) => !v)}>
            自动出售设置 ⚙️
          </button>
          {showAutoSell && (
            <div className="autosell-menu">
              <p>勾选后，副本掉落该品质装备将自动出售（独特除外）</p>
              <div className="autosell-grid">
                {[0, 1, 2, 3].map((i) => (
                  <label key={i}>
                    <input type="checkbox" checked={autoSell[i]} onChange={(e) => setAutoSell(i, e.target.checked)} />
                    {QUALITY_NAMES[i]}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="btn primary" onClick={autoEquip} title="自动为每个部位穿上背包里战力最高的装备">
          一键换装
        </button>
        <button className="btn" onClick={neaten}>
          整理
        </button>
        <button className="btn" onClick={optimalSort} title="按槽位分组，组内按战力评分从高到低排序">
          最优排序
        </button>
        {lockedCount > 0 && (
          <button className="btn" onClick={unlockAllBackpack} title="一次性解除背包内全部装备的锁定">
            批量解锁 🔓{lockedCount}
          </button>
        )}
        <button className="btn" onClick={sellAll}>
          出售
        </button>
      </div>

      {menu && menuItem && (
        <>
          <div className="menu-overlay" onClick={() => setMenu(null)} />
          <ul className="context-menu" style={{ left: '50%', top: '20%' }}>
            <li className="cm-name" style={{ color: menuItem.quality.color }}>
              {menuItem.type.name}
            </li>
            <li onClick={() => { equipItem(menu.index); setMenu(null) }}>装备</li>
            <li onClick={() => { onStrengthen(menu.index); setMenu(null) }}>强化 / 重铸</li>
            <li onClick={() => { toggleLock(menu.index); setMenu(null) }}>{menuItem.locked ? '解锁' : '锁定'}</li>
            <li onClick={() => { sellFromBackpack(menu.index); setMenu(null) }}>出售</li>
          </ul>
        </>
      )}
    </div>
  )
}
