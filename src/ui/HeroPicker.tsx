import { useGame } from '../game/store'
import { HEROES } from '../assets/heroes'
import { CLAUDES, claudeImg, getClaude, isClaudeId, rollClaude } from '../assets/claudes'

/** 一个赭色兜帽人影 —— 叠加态里那位「说不清是谁」的 Claude。 */
function Silhouette() {
  return (
    <svg className="schro-figure" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="schroBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2030" />
          <stop offset="1" stopColor="#0a0c12" />
        </linearGradient>
      </defs>
      <path
        d="M32 7c-8 0-12 6-12 12 0 4 2 7 5 9-9 3-15 13-15 31h44c0-18-6-28-15-31 3-2 5-5 5-9 0-6-4-12-12-12Z"
        fill="url(#schroBody)"
        stroke="#4a4160"
        strokeWidth="1.4"
      />
      {/* 藏在人影里的那枚星芒，隐约漏出来一点 */}
      <g className="schro-spark" transform="translate(32 30)">
        <path d="M0-7 1.6-1.6 7 0 1.6 1.6 0 7-1.6 1.6-7 0-1.6-1.6Z" fill="#e8a06a" />
      </g>
    </svg>
  )
}

export function HeroPicker() {
  const heroId = useGame((s) => s.heroId)
  const setHero = useGame((s) => s.setHero)

  const collapsed = isClaudeId(heroId) ? getClaude(heroId) : null

  // 坍缩后的立绘（还没 gen:claude 时为 undefined，回退到 emoji 字形）
  const art = collapsed ? claudeImg(collapsed.id) : undefined

  // 观测 → 波函数坍缩：随机显形成一位 Claude（尽量与当前不同）。
  function observe() {
    setHero(rollClaude(collapsed?.id).id)
  }

  return (
    <div className="hero-picker">
      <p className="hp-hint">选一个勇士，会出现在副本战斗中。选择自动保存。</p>
      <div className="hero-grid">
        {HEROES.map((h) => (
          <button
            key={h.id}
            className={`hero-card${h.id === heroId ? ' selected' : ''}`}
            onClick={() => setHero(h.id)}
          >
            <div className="hero-stage">
              <img className="sprite" src={h.img} alt={h.name} />
            </div>
            <div className="hero-name">{h.name}</div>
            <div className="hero-desc">{h.desc}</div>
            {h.id === heroId && <div className="hero-check">✓ 使用中</div>}
          </button>
        ))}

        {/* 人影彩蛋：薛定谔的 Claude */}
        <button
          className={`hero-card schro${collapsed ? ' selected collapsed' : ''}`}
          onClick={observe}
          title={collapsed ? '再次观测 · 重掷一位 Claude' : '点击观测 · 坍缩成一位 Claude'}
        >
          <div className="hero-stage schro-stage">
            {/* key=heroId：每次坍缩到不同 Claude 都会重挂载，重放显形动画 */}
            {!collapsed ? (
              <Silhouette />
            ) : art ? (
              <img key={heroId} className="sprite schro-reveal" src={art} alt={collapsed.name} />
            ) : (
              // 立绘还没生成时的字形回退
              <span key={heroId} className="schro-glyph schro-reveal">
                {collapsed.glyph}
              </span>
            )}
          </div>
          <div className="hero-name">{collapsed ? collapsed.name : '薛定谔的 Claude'}</div>
          <div className="hero-desc">
            {collapsed ? collapsed.desc : `人影 · ${CLAUDES.length} 态叠加`}
          </div>
          {collapsed ? (
            <div className="hero-check">✓ 使用中 · 再点重掷</div>
          ) : (
            <div className="schro-hint">◌ 点击观测</div>
          )}
        </button>
      </div>
    </div>
  )
}
