import knight from './heroes/knight.png'
import ranger from './heroes/ranger.png'
import mage from './heroes/mage.png'
import samurai from './heroes/samurai.png'
import classic from './heroes/classic.png'
import { claudeImg } from './claudes'

export interface HeroDef {
  id: string
  name: string
  desc: string
  img: string
}

/** 可选择的战斗头像。 */
export const HEROES: HeroDef[] = [
  { id: 'knight', name: '骑士', desc: '银甲蓝披风，剑与盾', img: knight },
  { id: 'ranger', name: '游侠', desc: '绿袍兜帽，双匕首', img: ranger },
  { id: 'mage', name: '法师', desc: '深蓝法袍，奥术法杖', img: mage },
  { id: 'samurai', name: '武士', desc: '朱漆铠甲，太刀', img: samurai },
  { id: 'classic', name: '经典', desc: '初代像素小人', img: classic },
]

export const DEFAULT_HERO = 'knight'

export function heroImg(id: string): string {
  // 薛定谔的 Claude：坍缩后的勇士立绘走 ./claude/。没生成立绘时回退到默认勇士。
  const claude = claudeImg(id)
  if (claude) return claude
  return (HEROES.find((h) => h.id === id) ?? HEROES[0]).img
}
