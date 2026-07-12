import { useMemo } from 'react'
import { useGame } from '../game/store'
import { REIN_ATTRS, reinPointsOf } from '../game/reincarnation'

function computeGain(lv: number, eq: { lv: number; enchantlvl: number; quality: { qualityCoefficient: number } }[]): number {
  const lvPoint = lv >= 20 ? Math.floor(Math.pow(lv - 20, 1.1) / 2.1) : 0
  let sum = lvPoint
  for (const it of eq) {
    if (it.lv >= 20) {
      sum += Math.floor(
        Math.pow((it.lv - 20) / 10, 1.1) * (0.1 * Math.pow(it.enchantlvl, 1.5) + 1) * it.quality.qualityCoefficient / 3.5,
      )
    }
  }
  return Math.floor(sum * 1.2)
}

export function ReincarnationPanel({ onClose }: { onClose: () => void }) {
  const lv = useGame((s) => s.lv)
  const equipment = useGame((s) => s.equipment)
  const reincarnation = useGame((s) => s.reincarnation)
  const reincarnationAttribute = useGame((s) => s.reincarnationAttribute)
  const doReincarnate = useGame((s) => s.doReincarnate)

  const willGet = useMemo(
    () => computeGain(lv, [equipment.weapon, equipment.armor, equipment.ring, equipment.neck]),
    [lv, equipment],
  )

  const points = reinPointsOf(reincarnationAttribute)
  const totalPoints = REIN_ATTRS.reduce((sum, a) => sum + points[a.key], 0)

  const confirm = () => {
    if (lv <= 30) return
    // eslint-disable-next-line no-alert
    if (!window.confirm(`将获得 ${willGet} 转生点数（随机分配到各项属性），灵石与装备都会消失，确认转生？`)) return
    doReincarnate(willGet)
    onClose()
  }

  return (
    <div className="reincarnation">
      <div className="rein-top">
        <p>现在转生可获得 <b>{willGet}</b> 转生点数</p>
        <div className="rein-note">
          <p>· 转生会清空灵石与装备，但保留已获得的转生属性</p>
          <p>· 点数根据人物等级、身上装备的品质与强化等级计算</p>
          <p>· 转生点数会<b>随机分配</b>到下列各项属性上</p>
          <p>· 等级需超过 30 才能转生</p>
        </div>
        <button className="btn primary" onClick={confirm} disabled={lv <= 30}>
          确认转生
        </button>
      </div>

      <div className="rein-info">
        <span>转生次数：{reincarnation.count}</span>
        <span>已分配点数：{totalPoints}</span>
      </div>

      <div className="rein-attrs">
        {REIN_ATTRS.map((a) => (
          <div className="rein-attr" key={a.key}>
            <span className="ra-name">
              {a.icon} {a.name}：{a.display(points[a.key])}
            </span>
            <span className="ra-pts">{points[a.key]} 点</span>
          </div>
        ))}
      </div>
    </div>
  )
}
