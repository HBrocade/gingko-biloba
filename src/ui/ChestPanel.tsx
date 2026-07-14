import { useGame } from '../game/store'
import { CHEST_TIERS, CHEST_TIER_ORDER, TEN_PULL, type ChestTierKey } from '../game/chest'
import { chestArt } from '../assets/chestArt'

/** 宝箱等级图标：优先用生成的 PNG，否则回退 emoji。 */
export function ChestGlyph({ tier, size = 30 }: { tier: ChestTierKey; size?: number }) {
  const t = CHEST_TIERS[tier]
  const art = chestArt(tier)
  if (art) return <img className="chest-img" src={art} alt={t.name} style={{ width: size, height: size }} />
  return (
    <span className="chest-emoji" style={{ color: t.color, fontSize: size }}>
      {t.icon}
    </span>
  )
}

/** 宝箱库存面板：按等级分组，手动开启。 */
export function ChestPanel() {
  const chests = useGame((s) => s.chests)
  const openChest = useGame((s) => s.openChest)
  const openTen = useGame((s) => s.openTen)

  if (!chests.length) {
    return (
      <div className="chest-panel">
        <div className="chest-empty">还没有宝箱。</div>
      </div>
    )
  }

  return (
    <div className="chest-panel">
      {CHEST_TIER_ORDER.map((key) => {
        const list = chests.filter((c) => c.tier === key)
        if (!list.length) return null
        const tier = CHEST_TIERS[key]
        const canTen = list.length >= TEN_PULL
        return (
          <div className="chest-row" key={key}>
            <ChestGlyph tier={key} />
            <div className="chest-meta">
              <div className="chest-name" style={{ color: tier.color }}>
                {tier.name} ×{list.length}
              </div>
              {canTen && <div className="chest-ten-hint">🎉 10 连有惊喜奖励</div>}
            </div>
            <div className="chest-actions">
              {canTen && (
                <button className="btn primary chest-ten" onClick={() => openTen(key)}>
                  十连抽
                </button>
              )}
              <button className={`btn${canTen ? '' : ' primary'}`} onClick={() => openChest(list[0].id)}>
                开启
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
