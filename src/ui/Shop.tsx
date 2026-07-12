import { useState } from 'react'
import { useGame } from '../game/store'
import { useTooltip } from './tooltipStore'
import { ItemIcon } from './ItemIcon'

export function Shop() {
  const shop = useGame((s) => s.shop)
  const gold = useGame((s) => s.gold)
  const equipment = useGame((s) => s.equipment)
  const backpack = useGame((s) => s.backpack)
  const refreshLeft = useGame((s) => s.shopRefreshLeft)
  const regenSec = useGame((s) => s.shopRegenSec)
  const refreshShop = useGame((s) => s.refreshShop)
  const buyShopItem = useGame((s) => s.buyShopItem)
  const show = useTooltip((s) => s.show)
  const hide = useTooltip((s) => s.hide)

  const [confirmRefresh, setConfirmRefresh] = useState<'free' | 'gold' | null>(null)

  const empty = shop.every((i) => !i)
  const bagFull = !backpack.some((s) => !s)
  const bagFree = backpack.filter((s) => !s).length
  const hasUnique = shop.some((i) => i?.quality.name === '独特')

  // 防止把独特装备刷新掉 —— 先询问确认。
  const onRefresh = (mode: 'free' | 'gold') => {
    if (hasUnique) setConfirmRefresh(mode)
    else refreshShop(mode)
  }

  return (
    <div className="shop">
      {bagFull ? (
        <div className="shop-banner warn">⚠️ 背包已满，无法购买 —— 请先到背包清理或出售装备。</div>
      ) : (
        <div className="shop-banner">背包剩余 {bagFree} 格</div>
      )}
      <div className="shop-grid">
        {shop.map((item, k) => {
          const price = item?.gold ?? 0
          const poor = gold < price
          const blocked = poor || bagFull
          const label = poor ? '钱不够' : bagFull ? '背包满' : '购买'
          const unique = item?.quality.name === '独特'
          return (
            <div className="shop-cell" key={k}>
              {item && (
                <div
                  className={`shop-name${unique ? ' flash' : ''}`}
                  style={{ color: item.quality.color }}
                  title={`${item.quality.name} · ${item.type.name}`}
                >
                  {item.type.name}
                </div>
              )}
              <div
                className={`grid-cell${item ? '' : ' empty'}`}
                onMouseEnter={(e) => item && show(item, e, equipment[item.itemType])}
                onMouseLeave={hide}
              >
                {item && (
                  <div
                    className={`cell-icon${item.quality.name === '独特' ? ' unique' : ''}`}
                    style={{ boxShadow: `inset 0 0 7px 2px ${item.quality.color}` }}
                  >
                    <ItemIcon item={item} />
                  </div>
                )}
              </div>
              {item && (
                <>
                  <div className={`shop-price${poor ? ' poor' : ''}`}>💎 {price.toLocaleString()}</div>
                  <button
                    className="btn buy-btn"
                    disabled={blocked}
                    title={poor ? '灵石不足' : bagFull ? '背包已满，请先清理背包' : `花费 ${price} 灵石购买`}
                    onClick={() => buyShopItem(k)}
                  >
                    {label}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {empty && <div className="shop-empty">商店空了，点下方刷新试试运气。</div>}

      <div className="shop-actions">
        <div className="shop-info">
          <span>剩余免费刷新：{refreshLeft} 次</span>
          {refreshLeft < 5 && <span className="dim">下次 +1：{regenSec}s</span>}
        </div>
        <button className="btn" onClick={() => onRefresh('gold')}>
          10000 灵石刷新
        </button>
        <button className="btn primary" onClick={() => onRefresh('free')}>
          免费刷新
        </button>
      </div>

      {confirmRefresh && (
        <div className="shop-confirm-backdrop" onClick={() => setConfirmRefresh(null)}>
          <div className="shop-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="sc-title">⚠️ 货架上有<span className="sc-unique">独特</span>装备</div>
            <p>刷新会把它冲掉，确定要刷新吗？</p>
            <div className="sc-btns">
              <button className="btn" onClick={() => setConfirmRefresh(null)}>
                算了，我再看看
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  refreshShop(confirmRefresh)
                  setConfirmRefresh(null)
                }}
              >
                确定刷新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
