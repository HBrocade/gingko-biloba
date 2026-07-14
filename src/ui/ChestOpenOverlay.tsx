import { useEffect, useState } from 'react'
import { useGame } from '../game/store'
import { CHEST_TIERS } from '../game/chest'
import { fmtNum } from '../game/format'
import { ItemCard } from './ItemCard'
import { ChestGlyph } from './ChestPanel'

// 开箱时快速滚动的物品符号（老虎机式），最终定格到真实奖励。
const REEL_GLYPHS = ['⚔️', '🛡️', '💍', '📿', '💎', '🗡️', '👑', '🔮', '⭐', '💰', '🏆', '🪙']
const REEL_MS = 3000

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** 全屏开箱动画覆盖层：3 秒滚动 → 揭晓奖励；出现「独特」装备时全屏闪光。 */
export function ChestOpenOverlay() {
  const reveal = useGame((s) => s.chestReveal)
  const dismiss = useGame((s) => s.dismissChestReveal)
  const [done, setDone] = useState(false)
  const [reelIdx, setReelIdx] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!reveal) return
    const hasUnique = reveal.rewards.some((r) => r.kind === 'item' && r.item.quality.name === '独特')
    setDone(false)
    setFlash(false)

    if (reducedMotion()) {
      setDone(true)
      return
    }
    const spin = setInterval(() => setReelIdx((i) => i + 1), 85)
    const end = setTimeout(() => {
      clearInterval(spin)
      setDone(true)
      if (hasUnique) {
        setFlash(true)
        setTimeout(() => setFlash(false), 900)
      }
    }, REEL_MS)
    return () => {
      clearInterval(spin)
      clearTimeout(end)
    }
  }, [reveal])

  if (!reveal) return null
  const tier = CHEST_TIERS[reveal.tier]
  const isTen = (reveal.pulls ?? 1) >= 2

  return (
    <div className="chest-overlay">
      <div className="chest-stage" style={{ borderColor: `${tier.color}99`, boxShadow: `0 0 44px ${tier.color}55` }}>
        {!done ? (
          <div className="chest-reeling">
            <div className="chest-open-icon">
              <ChestGlyph tier={reveal.tier} size={76} />
            </div>
            <div className="chest-reel">{REEL_GLYPHS[reelIdx % REEL_GLYPHS.length]}</div>
            <div className="chest-open-label" style={{ color: tier.color }}>
              {isTen ? `${tier.name} 十连抽中…` : `开启${tier.name}中…`}
            </div>
          </div>
        ) : (
          <div className="chest-result">
            <div className="chest-open-label" style={{ color: tier.color }}>
              {isTen ? `${tier.name} 十连抽 · 开启！` : `${tier.name} · 开启！`}
            </div>
            {isTen && <div className="chest-ten-banner">🎉 10 连有惊喜奖励 · 第 10 个双倍，高级装备几率翻倍</div>}
            <div className="chest-rewards">
              {reveal.rewards.map((r, i) =>
                r.kind === 'gold' ? (
                  <div className="chest-gold-reward" key={i}>
                    <span className="chest-gold-icon">💎</span>
                    <span className="chest-gold-amt">{fmtNum(r.amount)}</span>
                    <span className="chest-gold-note">{r.converted ? '背包已满 · 折算灵石' : '灵石'}</span>
                  </div>
                ) : (
                  <div className="chest-item-reward" key={i}>
                    <ItemCard item={r.item} />
                  </div>
                ),
              )}
            </div>
            <button className="btn primary chest-collect" onClick={dismiss}>
              收下
            </button>
          </div>
        )}
      </div>
      {flash && <div className="chest-flash" />}
    </div>
  )
}
