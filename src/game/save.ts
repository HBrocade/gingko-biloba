// Unicode 安全的 base64（游戏文本是中文，仅靠 btoa 无法正常处理）。
export function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

export function b64decode(b64: string): string {
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export const SAVE_KEY = '_gingko_save'

/** 将存档对象序列化为可读的 JSON 文档文本（用于 .json 文件导出）。 */
export function encodeSaveJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * 容错解析存档来源，返回存档对象。
 * 依次尝试：① 明文 JSON（新版 .json 文档 / 直接粘贴）
 *          ② 旧版双重 base64  ③ 更旧版单层 base64。
 * 全部失败则抛出，交由调用方处理。
 */
export function decodeSave(src: string): unknown {
  const s = src.trim()
  if (!s) throw new Error('存档为空')
  try {
    return JSON.parse(s)
  } catch {
    /* 非明文 JSON，继续尝试 base64 兼容路径 */
  }
  try {
    return JSON.parse(b64decode(b64decode(s)))
  } catch {
    /* 非双重 base64，回退到单层 base64 */
  }
  return JSON.parse(b64decode(s))
}
