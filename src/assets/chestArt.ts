// 解析已生成的宝箱图标（如果有）。支持 emoji 回退：
// 若 `npm run gen:chest` 已在 ./chest 中生成 PNG（chest-<tier>.png），它们会自动启用；
// 否则 chestArt() 返回 undefined，UI 显示 emoji 兜底图标。
const files = import.meta.glob('./chest/*.{png,webp,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byName: Record<string, string> = {}
for (const path in files) {
  const m = /\/([^/]+)\.\w+$/.exec(path)
  if (m) byName[m[1]] = files[path]
}

/** 某等级宝箱对应的生成图（若存在），如 chestArt('legend') → chest-legend.png。 */
export function chestArt(tier: string): string | undefined {
  return byName[`chest-${tier}`]
}
