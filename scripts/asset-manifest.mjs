// Asset generation manifest — one entry per equipment template in the game.
// The `name` MUST match the item name in src/game/itemData.ts so the game can
// resolve the generated PNG at runtime (via the same `artKey` hash).

/** djb2 hash — MUST stay identical to artKey() in src/assets/art.ts. */
export function artKey(name) {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = (((h << 5) + h) ^ name.charCodeAt(i)) >>> 0
  return 'item-' + h.toString(36)
}

const SLOT_WORD = {
  weapon: 'fantasy weapon',
  armor: 'fantasy body armor',
  ring: 'magic ring',
  neck: 'magic amulet necklace',
}

/** Build a consistent pixel-art icon prompt. */
export function buildPrompt(name, slot, rarity, desc) {
  const rare =
    rarity === 'unique'
      ? 'legendary artifact, ornate detailed design, glowing magical aura, radiant highlights'
      : 'ordinary craftsmanship, modest design'
  return (
    `A single ${SLOT_WORD[slot]}: ${desc}. ${rare}. ` +
    `16-bit pixel art RPG inventory icon, single object centered, front / three-quarter view, ` +
    `crisp clean pixels, bold saturated colors with clear silhouette, soft rim light, ` +
    `isolated on a solid pure black background, no text, no letters, no watermark, no border, ` +
    `no frame, no drop shadow on ground, video game item sprite.`
  )
}

// [name (Chinese, matches itemData.ts), slot, rarity, english descriptor]
const ITEMS = [
  // ---- weapons ----
  ['狱岩石太刀', 'weapon', 'common', 'a katana forged from volcanic hell-stone, glowing cracks'],
  ['战士长剑', 'weapon', 'common', 'a plain steel warrior longsword'],
  ['赤柳血刃', 'weapon', 'common', 'a crimson blood-red curved blade with a willow motif'],
  ['普通长剑', 'weapon', 'common', 'a simple iron longsword'],
  ['紫炎波刃剑', 'weapon', 'common', 'a wavy-edged sword wreathed in purple flame'],
  ['毛毛的爪子', 'weapon', 'common', 'a furry beast paw claw weapon, cute'],
  ['冰晶之刃', 'weapon', 'common', 'a sword blade encased in blue ice crystals'],
  ['创世亡命剑', 'weapon', 'unique', 'a cosmic genesis greatsword crackling with star energy'],
  ['无名剑', 'weapon', 'unique', 'a mysterious nameless ancient sword'],
  ['死亡之刃', 'weapon', 'unique', 'a black death blade dripping dark energy'],
  ['霜龙利刃', 'weapon', 'unique', 'a frost dragon sword of blue ice'],
  ['阿加雷斯血色巨剑', 'weapon', 'unique', 'a massive blood-red demonic greatsword'],
  ['神龙纳格林之刃', 'weapon', 'unique', 'a jade dragon-claw blade'],
  ['大师大冒险家之剑', 'weapon', 'unique', 'a heroic adventurer’s golden longsword'],
  ['六翼天使武刃', 'weapon', 'unique', 'a radiant six-winged angelic holy sword'],
  ['数珠丸恒次', 'weapon', 'unique', 'an ornate Japanese tachi wrapped in prayer beads'],
  ['埃苏莱布斯军刀', 'weapon', 'unique', 'an ornate curved military saber'],
  // ---- armor ----
  ['紫金守护胸甲', 'armor', 'common', 'a purple-and-gold guardian breastplate'],
  ['战士重铠', 'armor', 'common', 'heavy steel warrior plate armor'],
  ['天权轻甲', 'armor', 'common', 'light agile leather-and-cloth armor'],
  ['赤柳血铠', 'armor', 'common', 'crimson blood-red plate armor'],
  ['哈皮毛毛连身衣', 'armor', 'common', 'a fuzzy furry onesie armor, cute'],
  ['红月的夜行衣', 'armor', 'unique', 'a red-moon ninja night stealth outfit'],
  ['肃清者戎衣', 'armor', 'unique', 'a black executioner’s battle robe'],
  ['争执连身衣', 'armor', 'unique', 'a discord-themed jumpsuit armor'],
  ['剑豪盔甲', 'armor', 'unique', 'a samurai swordmaster full armor'],
  ['隐武士铠甲', 'armor', 'unique', 'a hidden shadow-samurai armor'],
  ['芬撒里尔追踪者', 'armor', 'unique', 'a sleek ranger tracker leather armor'],
  ['先代狂龙战士盔甲', 'armor', 'unique', 'an ancient dragon-knight ornate armor'],
  // ---- rings ----
  ['生命指环', 'ring', 'common', 'a green life ring with a leaf gem'],
  ['毛毛指环', 'ring', 'common', 'a ring with a tiny cute furry paw'],
  ['御魂之戒', 'ring', 'common', 'a soul-binding ring with a purple soul gem'],
  ['真·毛毛指环', 'ring', 'unique', 'a glowing legendary furry-paw ring'],
  ['死神名片戒指', 'ring', 'unique', 'a reaper skull signet ring'],
  ['先驱者戒指', 'ring', 'unique', 'a pioneer ring with a radiant compass gem'],
  ['素盏呜尊的意志', 'ring', 'unique', 'a storm-god ring crackling with lightning'],
  ['月夜见尊的意志', 'ring', 'unique', 'a moon-god ring glowing with silver moonlight'],
  // ---- necklaces ----
  ['十字军项链', 'neck', 'common', 'a crusader cross amulet'],
  ['冰龙凝雪', 'neck', 'common', 'an ice-dragon snowflake pendant'],
  ['银魂之眼', 'neck', 'common', 'a silver eye amulet'],
  ['十字旅团降魔项链', 'neck', 'unique', 'a holy demon-slaying cross necklace'],
  ['进阶黑暗龙王项链', 'neck', 'unique', 'a dark dragon-king amulet with a black gem'],
  ['伟大单身成员的项链', 'neck', 'unique', 'a flashy diamond bling necklace'],
  ['魔族之翼展', 'neck', 'unique', 'a spread demon-wings pendant'],
  ['伊帕娅之项链', 'neck', 'unique', 'an elegant guardian amulet with a teal gem'],
]

export const MANIFEST = ITEMS.map(([name, slot, rarity, desc]) => ({
  name,
  slot,
  rarity,
  key: artKey(name),
  file: `${artKey(name)}.png`,
  prompt: buildPrompt(name, slot, rarity, desc),
}))

// ---- Scene sprites (hero / monsters), generated with `--scene` into src/assets/scene/ ----
const SPRITE_STYLE =
  'full body character sprite, front-facing, standing idle pose, ' +
  '16-bit SNES JRPG pixel art, clean crisp pixels, bold outline, vibrant colors, ' +
  'isolated on a solid pure black background, no text, no watermark, no border, no shadow, game asset.'

export const SCENE = [
  { name: 'hero-knight', file: 'hero-knight.png', prompt: `A heroic young warrior knight in shining silver plate armor with a blue cape, holding a sword and round shield. ${SPRITE_STYLE}` },
  { name: 'hero-ranger', file: 'hero-ranger.png', prompt: `A nimble adventurer ranger in a green hooded cloak with leather armor, holding twin daggers. ${SPRITE_STYLE}` },
  { name: 'hero-mage', file: 'hero-mage.png', prompt: `A battle-mage hero in dark blue robes with a glowing arcane staff, sparks of magic around them. ${SPRITE_STYLE}` },
  { name: 'hero-samurai', file: 'hero-samurai.png', prompt: `A fierce samurai swordmaster hero in red lacquered armor, holding a katana in a ready stance. ${SPRITE_STYLE}` },
]

// ---- 薛定谔的 Claude 名册（人影彩蛋），用 `--claude` 生成到 src/assets/claude/ ----
// 统一设定：温暖的陶土/珊瑚橙/米白配色 + 一枚会发光的琥珀色八角星芒（Anthropic 的
// 招牌火花）作标志性点缀，友善、英气。文件名必须与 src/assets/claudes.ts 的 file 对应。
const CLAUDE_STYLE =
  'full body character sprite, front-facing, standing idle heroic pose, ' +
  '16-bit SNES JRPG pixel art, clean crisp pixels, bold dark outline, vibrant but warm shading, ' +
  'signature palette of terracotta clay orange, warm coral, cream and soft amber gold, ' +
  'a small glowing amber eight-pointed sunburst spark (a friendly little star) as the recurring signature accent, ' +
  'gentle radiant rim light, warm friendly confident expression, ' +
  'isolated on a solid pure black background, no text, no letters, no watermark, no border, no shadow, game asset sprite.'

export const CLAUDE = [
  { name: 'claude-sage', file: 'claude-sage.png', prompt: `A wise, kindly scholar-sage hero named Claude, wearing flowing cream and terracotta-orange layered robes, holding an open glowing spellbook in one arm, a small amber sunburst spark of light hovering above his other open palm. ${CLAUDE_STYLE}` },
  { name: 'claude-knight', file: 'claude-knight.png', prompt: `A noble paladin knight hero named Claude in warm coral-and-terracotta enameled plate armor with a flowing cream cape, a glowing amber eight-pointed sunburst emblem emblazoned on his round shield, raising a radiant longsword. ${CLAUDE_STYLE}` },
  { name: 'claude-mage', file: 'claude-mage.png', prompt: `An arcane battle-mage hero named Claude in layered terracotta and cream robes with a soft hood, conjuring a glowing amber sunburst spell cupped between his raised hands, a couple of small amber runes floating close to his hands. ${CLAUDE_STYLE}` },
  { name: 'claude-ranger', file: 'claude-ranger.png', prompt: `A nimble ranger hero named Claude in warm burnt-orange and clay-brown leather armor with a hood and cream scarf, drawing a longbow strung with light, the arrow tipped with a glowing amber sunburst spark. ${CLAUDE_STYLE}` },
  { name: 'claude-monk', file: 'claude-monk.png', prompt: `A serene martial-arts monk hero named Claude in cream and clay-orange cloth wraps and sash, standing in a calm ready stance with glowing amber sunburst chi energy swirling around his fists. ${CLAUDE_STYLE}` },
  { name: 'claude-cat', file: 'claude-cat.png', prompt: `Schrodinger's cat reimagined as an adorable tiny wizard hero named Claude: a cute orange tabby cat standing upright on two legs, wearing a little terracotta wizard cloak and pointed hat, holding a small wooden staff topped with a glowing amber sunburst spark, one front paw drawn faintly translucent and ghostly to hint at quantum superposition. ${CLAUDE_STYLE}` },
]

// 宝箱系统图标（5 个等级）。文件名必须为 chest-<tier>.png，与 src/assets/chestArt.ts 的解析一致。
// 生成：npm run gen:chest（输出到 src/assets/chest/），未生成时游戏用 emoji 兜底。
const CHEST_STYLE =
  '16-bit pixel art RPG inventory icon, a single closed treasure chest centered, three-quarter front view, ' +
  'crisp clean pixels, bold saturated colors with a clear silhouette, soft rim light, ' +
  'isolated on a solid pure black background, no text, no letters, no watermark, no border, no frame, ' +
  'no ground shadow, video game item sprite.'

export const CHEST = [
  { name: 'chest-wood', file: 'chest-wood.png', prompt: `A humble small wooden treasure chest made of worn oak planks with simple iron bands and a plain latch. ${CHEST_STYLE}` },
  { name: 'chest-iron', file: 'chest-iron.png', prompt: `A sturdy iron-reinforced treasure chest with riveted grey steel corners, thick metal bands and a heavy padlock. ${CHEST_STYLE}` },
  { name: 'chest-silver', file: 'chest-silver.png', prompt: `An ornate polished silver treasure chest with engraved filigree scrollwork and small pale-blue gemstone inlays, gleaming metal. ${CHEST_STYLE}` },
  { name: 'chest-gold', file: 'chest-gold.png', prompt: `A luxurious ornate golden treasure chest with baroque gold trim, a few gold coins peeking out of the lid seam, warm radiant glow. ${CHEST_STYLE}` },
  { name: 'chest-legend', file: 'chest-legend.png', prompt: `A legendary mythical treasure chest carved from dark obsidian and rose-gold metal, crackling with pink-magenta magical energy, glowing runes along the lid and a radiant aura. ${CHEST_STYLE}` },
]
