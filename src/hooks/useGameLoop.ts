import { useEffect } from 'react'
import { useGame } from '../game/store'

/** 驱动持久化定时器：HP 回复、每秒 tick、自动存档。 */
export function useGameLoop() {
  useEffect(() => {
    // 加载已有存档，然后初始化世界。
    const store = useGame.getState()
    store.loadGame()
    store.recompute(false)
    store.refreshDungeons(true)
    store.restockShop() // 补充商店库存，使其首次打开时不为空

    const second = setInterval(() => {
      const s = useGame.getState()
      s.regenTick()
      s.tickSecond()
    }, 1000)

    const autosave = setInterval(() => {
      useGame.getState().saveGame(false)
    }, 5 * 60 * 1000)

    const onUnload = () => useGame.getState().saveGame(false)
    window.addEventListener('beforeunload', onUnload)

    return () => {
      clearInterval(second)
      clearInterval(autosave)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])
}
