import { itemArt } from '../assets/art'
import type { Item } from '../game/types'

/** Renders a generated PNG icon if one exists for this item, else the emoji fallback. */
export function ItemIcon({ item }: { item: Item }) {
  const art = itemArt(item.type.name)
  if (art) return <img className="item-art" src={art} alt={item.type.name} />
  return <>{item.icon}</>
}
