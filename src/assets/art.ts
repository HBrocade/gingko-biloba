// 按物品名称解析已生成的物品图标（如果有）。支持 emoji 回退：
// 若 `npm run gen:assets` 已在 ./generated 中生成 PNG，它们会自动启用；
// 否则 itemArt() 返回 undefined，UI 显示 emoji 图标。

/** djb2 hash——必须与 scripts/asset-manifest.mjs 中的 artKey() 保持完全一致。 */
export function artKey(name: string): string {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = (((h << 5) + h) ^ name.charCodeAt(i)) >>> 0
  return 'item-' + h.toString(36)
}

// 在构建时急切收集所有已生成的 PNG（若尚不存在则为空对象）。
const files = import.meta.glob('./generated/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const byKey: Record<string, string> = {}
for (const path in files) {
  const m = /\/([^/]+)\.png$/.exec(path)
  if (m) byKey[m[1]] = files[path]
}

export function itemArt(name: string): string | undefined {
  return byKey[artKey(name)]
}
