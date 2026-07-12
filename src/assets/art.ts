// Resolves generated item icons (if any) by item name. Works with emoji fallback:
// if `npm run gen:assets` has produced PNGs in ./generated, they light up automatically;
// otherwise itemArt() returns undefined and the UI shows the emoji icon.

/** djb2 hash — MUST stay identical to artKey() in scripts/asset-manifest.mjs. */
export function artKey(name: string): string {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = (((h << 5) + h) ^ name.charCodeAt(i)) >>> 0
  return 'item-' + h.toString(36)
}

// Eagerly collect any generated PNGs at build time (empty object if none exist yet).
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
