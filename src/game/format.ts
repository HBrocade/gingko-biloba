// 大数值格式化：中文万进制单位（万/亿/兆/京…），超出命名单位后回退科学计数法。
// 仅用于「数量」类数值：灵石、HP、攻击、防御、格挡、DPS、伤害、经验、花费、
// 战力评分、词条数值等。等级、百分比、层数、倍率、计数等不要用它。

const UNITS = ['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极']

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/** 把一个大数值压缩为带中文单位的紧凑字符串（保留约 3 位有效数字）。 */
export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  const sign = n < 0 ? '-' : ''
  let v = Math.abs(n)
  // 一万以内：整数加千位分隔，小数保留两位
  if (v < 10000) {
    return sign + (Number.isInteger(v) ? v.toLocaleString('en-US') : String(Math.round(v * 100) / 100))
  }
  let tier = 0
  while (v >= 10000 && tier < UNITS.length - 1) {
    v /= 10000
    tier++
  }
  if (v >= 10000) return sign + Math.abs(n).toExponential(2) // 超出命名单位
  const body = v >= 100 ? String(Math.round(v)) : v >= 10 ? trimZeros((Math.round(v * 10) / 10).toFixed(1)) : trimZeros((Math.round(v * 100) / 100).toFixed(2))
  return sign + body + UNITS[tier]
}
