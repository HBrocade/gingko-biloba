import { useEffect } from 'react'
import { useGame } from '../game/store'

/** Drives the persistent timers: HP regen, per-second ticks, autosave. */
export function useGameLoop() {
  useEffect(() => {
    // Load any existing save, then set up the world.
    const store = useGame.getState()
    store.loadGame()
    store.recompute(false)
    store.refreshDungeons(true)
    store.restockShop() // stock the shop so it isn't empty on first open

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
