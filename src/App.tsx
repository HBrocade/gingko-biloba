import { useState, type ChangeEvent } from 'react'
import { useGame } from './game/store'
import { useGameLoop } from './hooks/useGameLoop'
import { StatusPanel } from './ui/StatusPanel'
import { EquipmentBar } from './ui/EquipmentBar'
import { SystemLog } from './ui/SystemLog'
import { MapPanel } from './ui/MapPanel'
import { Backpack } from './ui/Backpack'
import { Shop } from './ui/Shop'
import { StrengthenPanel } from './ui/StrengthenPanel'
import { ReincarnationPanel } from './ui/ReincarnationPanel'
import { HeroPicker } from './ui/HeroPicker'
import { SkillsPanel } from './ui/SkillsPanel'
import { CharacterPanel } from './ui/CharacterPanel'
import { Modal } from './ui/Modal'
import { TooltipLayer } from './ui/TooltipLayer'
import { ChestPanel } from './ui/ChestPanel'
import { ChestOpenOverlay } from './ui/ChestOpenOverlay'

type Panel = 'char' | 'backpack' | 'shop' | 'skills' | 'rein' | 'hero' | 'gm' | 'import' | 'export' | 'chest' | null

const MENU: { key: Panel | 'refresh' | 'save'; icon: string; label: string }[] = [
  { key: 'char', icon: '📋', label: '角色' },
  { key: 'backpack', icon: '🎒', label: '背包' },
  { key: 'chest', icon: '🎁', label: '宝箱' },
  { key: 'shop', icon: '🏪', label: '商店' },
  { key: 'skills', icon: '📖', label: '技能' },
  { key: 'refresh', icon: '🔄', label: '刷新副本' },
  { key: 'hero', icon: '🧙', label: '勇士' },
  { key: 'rein', icon: '🌀', label: '转生' },
  { key: 'save', icon: '💾', label: '保存' },
  { key: 'export', icon: '📤', label: '导出' },
  { key: 'import', icon: '📥', label: '导入' },
  // GM 工具仅开发模式可见；生产构建中 import.meta.env.DEV 为 false，此项会被摇树移除。
  ...(import.meta.env.DEV ? [{ key: 'gm' as Panel, icon: '🛠️', label: 'GM' }] : []),
]

/** 触发浏览器下载一段文本为文件。 */
function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** 生成带时间戳的存档文件名，如 gingko-存档-20260713-164900.json。 */
function saveFilename() {
  const d = new Date()
  const p = (n: number) => `${n}`.padStart(2, '0')
  return `gingko-存档-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.json`
}

function ImportExport({ mode, onClose }: { mode: 'import' | 'export'; onClose: () => void }) {
  const exportSave = useGame((s) => s.exportSave)
  const loadGame = useGame((s) => s.loadGame)
  const [text, setText] = useState(mode === 'export' ? exportSave() : '')
  const [status, setStatus] = useState('')

  const doImport = (raw: string) => {
    if (!raw.trim()) {
      setStatus('请先选择存档文件，或在下方粘贴存档内容。')
      return
    }
    if (loadGame(raw)) onClose()
    else setStatus('存档解析失败，请确认文件完整且未被截断。')
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许再次选择同一文件
    if (!file) return
    try {
      const txt = await file.text()
      setText(txt)
      doImport(txt)
    } catch {
      setStatus('读取文件失败。')
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('已复制到剪贴板。')
    } catch {
      setStatus('当前环境无法访问剪贴板，请改用“下载 JSON 文件”。')
    }
  }

  return (
    <div className="io-panel">
      {mode === 'import' && (
        <label className="btn primary io-file">
          选择存档文件（.json）
          <input type="file" accept="application/json,.json" onChange={onFile} hidden />
        </label>
      )}
      <textarea
        className="io-text"
        value={text}
        placeholder={mode === 'import' ? '或在此粘贴存档 JSON 内容…' : ''}
        onChange={(e) => setText(e.target.value)}
        readOnly={mode === 'export'}
      />
      {mode === 'export' ? (
        <div className="io-row">
          <button className="btn primary" onClick={() => downloadText(saveFilename(), text)}>
            下载 JSON 文件
          </button>
          <button className="btn" onClick={copyToClipboard}>
            复制到剪贴板
          </button>
        </div>
      ) : (
        <button className="btn primary" onClick={() => doImport(text)}>
          导入
        </button>
      )}
      {status && <div className="io-status">{status}</div>}
    </div>
  )
}

function GMPanel({ onClose }: { onClose: () => void }) {
  const gmGrant = useGame((s) => s.gmGrant)
  const grantChest = useGame((s) => s.grantChest)
  const [gold, setGold] = useState(1000000)
  const [playerLv, setPlayerLv] = useState(1)
  const [equipLv, setEquipLv] = useState(40)
  const [equipQua, setEquipQua] = useState(4)
  return (
    <div className="gm-panel">
      <label>
        增加灵石 <input type="number" value={gold} onChange={(e) => setGold(Number(e.target.value))} />
      </label>
      <label>
        玩家等级 <input type="number" value={playerLv} onChange={(e) => setPlayerLv(Number(e.target.value))} />
      </label>
      <label>
        装备等级 <input type="number" value={equipLv} onChange={(e) => setEquipLv(Number(e.target.value))} />
      </label>
      <label>
        装备品质 (0-4) <input type="number" min={0} max={4} value={equipQua} onChange={(e) => setEquipQua(Math.max(0, Math.min(4, Number(e.target.value))))} />
      </label>
      <button
        className="btn primary"
        onClick={() => {
          gmGrant({ gold, playerLv, equipLv, equipQua })
          onClose()
        }}
      >
        确定
      </button>
      <button
        className="btn"
        onClick={() => {
          ;(['wood', 'iron', 'silver', 'gold', 'legend'] as const).forEach((t) => grantChest(t, 40))
          onClose()
        }}
      >
        🎁 发放各级宝箱
      </button>
    </div>
  )
}

export default function App() {
  useGameLoop()
  const [panel, setPanel] = useState<Panel>(null)
  const refreshDungeons = useGame((s) => s.refreshDungeons)
  const saveGame = useGame((s) => s.saveGame)
  const hardReset = useGame((s) => s.hardReset)
  const strengthenTarget = useGame((s) => s.strengthenTarget)
  const openStrengthen = useGame((s) => s.openStrengthen)
  const closeStrengthen = useGame((s) => s.closeStrengthen)
  const chestCount = useGame((s) => s.chests.length)

  const onMenu = (key: (typeof MENU)[number]['key']) => {
    if (key === 'refresh') return refreshDungeons()
    if (key === 'save') return saveGame(true)
    setPanel(key as Panel)
  }

  return (
    <div className="game-root">
      <div className="game-frame">
        <div className="left-col">
          <div className="top-panels">
            <StatusPanel />
            <EquipmentBar />
          </div>
          <SystemLog />
        </div>
        <div className="right-col">
          <MapPanel />
          <div className="menu-bar">
            {MENU.map((m) => (
              <button key={m.label} className="menu-btn" onClick={() => onMenu(m.key)} title={m.label}>
                <span className="menu-icon">{m.icon}</span>
                <span className="menu-label">{m.label}</span>
                {m.key === 'chest' && chestCount > 0 && <span className="menu-badge">{chestCount}</span>}
              </button>
            ))}
            <button className="menu-btn danger" onClick={() => window.confirm('确定清除存档并重新开始？') && hardReset()} title="清除存档">
              <span className="menu-icon">🗑️</span>
              <span className="menu-label">清档</span>
            </button>
          </div>
        </div>
      </div>

      {panel === 'char' && (
        <Modal title="角色属性" onClose={() => setPanel(null)}>
          <CharacterPanel />
        </Modal>
      )}
      {panel === 'backpack' && (
        <Modal title="背包" onClose={() => setPanel(null)} wide>
          <Backpack
            onStrengthen={(index) => {
              openStrengthen(index)
              setPanel(null)
            }}
          />
        </Modal>
      )}
      {panel === 'chest' && (
        <Modal title="宝箱" onClose={() => setPanel(null)}>
          <ChestPanel />
        </Modal>
      )}
      {panel === 'shop' && (
        <Modal title="装备商店" onClose={() => setPanel(null)} wide>
          <Shop />
        </Modal>
      )}
      {panel === 'skills' && (
        <Modal title="技能" onClose={() => setPanel(null)} wide>
          <SkillsPanel />
        </Modal>
      )}
      {panel === 'rein' && (
        <Modal title="角色转生" onClose={() => setPanel(null)}>
          <ReincarnationPanel onClose={() => setPanel(null)} />
        </Modal>
      )}
      {panel === 'hero' && (
        <Modal title="选择勇士" onClose={() => setPanel(null)}>
          <HeroPicker />
        </Modal>
      )}
      {import.meta.env.DEV && panel === 'gm' && (
        <Modal title="GM 面板" onClose={() => setPanel(null)}>
          <GMPanel onClose={() => setPanel(null)} />
        </Modal>
      )}
      {(panel === 'import' || panel === 'export') && (
        <Modal title={panel === 'import' ? '导入存档' : '导出存档'} onClose={() => setPanel(null)}>
          <ImportExport mode={panel} onClose={() => setPanel(null)} />
        </Modal>
      )}
      {strengthenTarget && (
        <Modal title="强化 / 重铸" onClose={closeStrengthen}>
          <StrengthenPanel />
        </Modal>
      )}

      <ChestOpenOverlay />
      <TooltipLayer />
    </div>
  )
}
