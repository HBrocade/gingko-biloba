// 薛定谔的 Claude —— 角色选择里的「人影」彩蛋。
//
// 人影处于叠加态：你不知道里面是哪一位 Claude，直到你点击「观测」它——
// 波函数坍缩，随机显形成一位 Claude 勇士。再次观测即重掷。
//
// 立绘存放在专用文件夹 ./claude/ 下，通过 `npm run gen:claude` 用 OpenRouter 生成
// （提示词见 scripts/asset-manifest.mjs 的 CLAUDE 清单）。与游戏其它素材一样，
// 生成是**增量、可选、非破坏**的：没跑生成脚本时，人影仍然可玩，卡面回退到
// emoji 字形，战斗中回退到默认勇士立绘。

// 构建时收集 ./claude/ 下已生成的 PNG（还没生成时是空对象）。
const files = import.meta.glob('./claude/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byFile: Record<string, string> = {}
for (const path in files) {
  const m = /\/([^/]+)$/.exec(path) // 完整文件名（含 .png），与 ClaudeDef.file 对齐
  if (m) byFile[m[1]] = files[path]
}

export interface ClaudeDef {
  /** 也是存档里保存的 heroId，形如 'claude-sage'。 */
  id: string
  name: string
  desc: string
  /** 立绘缺失时的 emoji 回退。 */
  glyph: string
  /** ./claude/ 下的文件名。 */
  file: string
}

/**
 * Claude 勇士名册。统一形象设定：温暖的陶土 / 珊瑚橙配色 + 琥珀色星芒（Anthropic
 * 的招牌火花）为标志性点缀。压轴的「薛定谔之猫·Claude」把「薛定谔」这个梗和
 * Claude 缝在一起。
 */
export const CLAUDES: ClaudeDef[] = [
  { id: 'claude-sage', name: '贤者 Claude', desc: '赭橙长袍，掌心悬着一枚星芒', glyph: '📜', file: 'claude-sage.png' },
  { id: 'claude-knight', name: '骑士 Claude', desc: '珊瑚橙铠甲，盾上镌着星芒纹章', glyph: '🛡️', file: 'claude-knight.png' },
  { id: 'claude-mage', name: '法师 Claude', desc: '陶土法袍，指尖绽开橙色星芒', glyph: '🔮', file: 'claude-mage.png' },
  { id: 'claude-ranger', name: '游侠 Claude', desc: '赭色皮甲，箭尖凝着琥珀星火', glyph: '🏹', file: 'claude-ranger.png' },
  { id: 'claude-monk', name: '武僧 Claude', desc: '米白缠布，拳间萦绕星芒真气', glyph: '🧘', file: 'claude-monk.png' },
  { id: 'claude-cat', name: '薛定谔之猫 Claude', desc: '橘猫法师，半透明的爪子藏着叠加态', glyph: '🐱', file: 'claude-cat.png' },
]

const byId: Record<string, ClaudeDef> = {}
for (const c of CLAUDES) byId[c.id] = c

/** 该 heroId 是否属于 Claude 名册。 */
export function isClaudeId(id: string): boolean {
  return id in byId
}

export function getClaude(id: string): ClaudeDef | undefined {
  return byId[id]
}

/** 已生成的立绘 URL；还没生成时返回 undefined。 */
export function claudeImg(id: string): string | undefined {
  const c = byId[id]
  return c ? byFile[c.file] : undefined
}

/**
 * 坍缩：随机抽一位 Claude。尽量避开当前这位，让每次「观测」都看得见变化
 * （只有一位时自然无法避开）。
 */
export function rollClaude(excludeId?: string): ClaudeDef {
  const pool = excludeId && CLAUDES.length > 1 ? CLAUDES.filter((c) => c.id !== excludeId) : CLAUDES
  return pool[Math.floor(Math.random() * pool.length)]
}
