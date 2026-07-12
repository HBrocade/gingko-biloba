import { useEffect, useRef } from 'react'
import { useGame } from '../game/store'
import { useTooltip } from './tooltipStore'

export function SystemLog() {
  const sysInfo = useGame((s) => s.sysInfo)
  const clearLog = useGame((s) => s.clearLog)
  const show = useTooltip((s) => s.show)
  const hide = useTooltip((s) => s.hide)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [sysInfo])

  return (
    <div className="panel log-panel">
      <div className="panel-heading">
        系统信息
        <button className="link-btn" onClick={clearLog}>
          清除
        </button>
      </div>
      <div className="log-body" ref={ref}>
        {sysInfo.map((v, k) => (
          <div className={`log-line ${v.type}`} key={k}>
            <i className="log-time">{v.time ? `[${v.time}] ` : ''}</i>
            <span className="log-msg">{v.msg}</span>
            {v.equip?.map((o, p) => (
              <a
                key={p}
                className="log-item"
                style={{ color: o.quality.color }}
                onMouseEnter={(e) => show(o, e)}
                onMouseLeave={hide}
              >
                {o.quality.name === '独特' ? '稀有掉落：' : ''}
                {o.type.name}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
