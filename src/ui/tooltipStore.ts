import { create } from 'zustand'
import type { Item } from '../game/types'

interface TooltipState {
  item: Item | null
  compare: Item | null
  x: number
  y: number
  show: (item: Item, e: { clientX: number; clientY: number }, compare?: Item | null) => void
  hide: () => void
}

export const useTooltip = create<TooltipState>((set) => ({
  item: null,
  compare: null,
  x: 0,
  y: 0,
  show: (item, e, compare = null) =>
    set({ item, compare: compare && compare.id !== item.id ? compare : null, x: e.clientX, y: e.clientY }),
  hide: () => set({ item: null, compare: null }),
}))
