import { useTooltip } from './tooltipStore'
import { ItemCard } from './ItemCard'
import { CompareDelta } from './CompareDelta'

/** Renders the floating item tooltip (with optional comparison card + stat delta). */
export function TooltipLayer() {
  const { item, compare, x, y } = useTooltip()
  if (!item) return null

  const belowHalf = y > window.innerHeight / 2
  const style: React.CSSProperties = {
    left: Math.min(x + 18, window.innerWidth - 560),
    ...(belowHalf ? { bottom: window.innerHeight - y + 12 } : { top: y + 18 }),
  }

  return (
    <div className="tooltip-layer" style={style}>
      <div className="tt-main">
        <ItemCard item={item} />
        {compare && <CompareDelta item={item} />}
      </div>
      {compare && (
        <div className="tooltip-compare">
          <div className="compare-label">已装备</div>
          <ItemCard item={compare} />
        </div>
      )}
    </div>
  )
}
