import { itemArt } from '../assets/art'
import type { Item } from '../game/types'

/** 如果该物品存在生成的 PNG 图标则渲染它，否则回退渲染 emoji。 */
export function ItemIcon({ item }: { item: Item }) {
  const art = itemArt(item.type.name)
  if (art) return <img className="item-art" src={art} alt={item.type.name} />
  return <>{item.icon}</>
}
