# 轮回勇者传说 · Ginkgo

一个全随机刷装备刷词条的**挂机放置类 RPG**，使用 **React + TypeScript + Vite + Zustand** 重写。

游戏机制参考自 Vue 版本 [COUY-RPG](https://github.com/Couy69/vue-idle-game)，核心数值、掉落、强化、转生等公式均忠实移植，并做了自包含改造（用 emoji/CSS 图标替代原项目缺失的像素图标，界面重构为响应式暗色主题）。

## 玩法

- 点击地图上的**副本**进入战斗，击杀怪物与首领获得**金币**与**装备**。
- 装备分五个品质：破旧 / 普通 / 神器 / 史诗 / **独特**（首领 2.5% 掉落，词条最多）。
- 主角每秒回复 2% 生命，暴击伤害初始 150%，护甲按非线性公式减伤。
- **背包**：装备、锁定、出售、一键整理/出售、按品质自动出售。
- **强化**：花金币提升基础属性，6 级起有失败率，失败可能降级，支持自动强化到目标等级。
- **重铸**：随机替换词条，括号内百分比越高品质越好。
- **商店**：5 格随机装备，免费刷新（5 次，60s 回复 1 次）或 10000 金币刷新。
- **转生**：等级 > 30 可转生，清空金币与装备，换取永久转生点数强化八项基础属性。
- **无尽挑战**：通关 Lv10 副本后解锁，层数越高越难，仅产金币，通关回满血。
- 存档自动保存到 localStorage，支持导入/导出（Base64）。

## 本地运行

```sh
npm install
npm run dev        # 开发服务器
npm run build      # 生产构建 (tsc + vite)
npm run preview    # 预览生产构建
```

## 用 OpenRouter 生成装备图标（可选）

装备图标默认用 emoji（原项目引用的像素图标 PNG 本身缺失）。你可以用 AI 现生成一套像素风图标：

```sh
cp .env.example .env          # 然后把你的 key 填进 OPENROUTER_API_KEY
npm run gen:assets            # 生成所有缺失的图标（约 45 张）
npm run gen:assets -- --limit=3   # 先小批量试跑
npm run gen:assets -- --force     # 强制重新生成
npm run gen:assets -- --only=剑   # 只生成名字/描述里含“剑”的
npm run opt:assets            # 生成后压缩到 128px（模型输出约 1MB/张，压缩后 ~15KB）
npm run opt:assets -- 96      # 自定义最大边长
```

> 模型输出的原图很大（~1MB/张，整套约 28MB）。跑完 `gen:assets` 记得 `opt:assets` 压到 128px（游戏里只显示 ~56px），整套降到 ~700KB。`opt:assets` 用 macOS `sips` 或 ImageMagick。

- API key 只在**构建时**由 Node 脚本（`scripts/generate-assets.mjs`）从 `.env` 读取，**绝不会打进浏览器包**。
- 生成的 PNG 写入 `src/assets/generated/`，游戏会按物品名的哈希自动匹配（`src/assets/art.ts`）；没有对应文件时回退到 emoji。生成后刷新（或重启 dev）即可看到。
- 默认模型 `google/gemini-2.5-flash-image`（Nano Banana），可在 `.env` 里用 `OPENROUTER_IMAGE_MODEL` 换成 `bytedance-seed/seedream-4.5`、`openai/gpt-image-1` 等支持图像输出的模型。
- 生成图标是**增量、可选、非破坏**的：不跑脚本游戏照常用 emoji 运行。

### 抠掉纯黑底（可选）

模型输出统一是「纯黑底」，在深色 UI 上看不出问题，但在**副本地图**这种浅色背景上会露出黑方块。
`scripts/cutout-assets.py` 把黑底抠成透明：

```sh
python3 -m pip install Pillow numpy       # 依赖
python3 scripts/cutout-assets.py           # 角色/物品：generated/ heroes/ 等
python3 scripts/cutout-assets.py --dir fx --emissive   # 发光特效：fx/（全局亮度抠图）
python3 scripts/cutout-assets.py --dir heroes  # 只处理某个子目录
python3 scripts/cutout-assets.py --dry     # 只报告不写回
python3 scripts/cutout-assets.py --out /tmp/preview   # 写到别处预览，不覆盖原图
```

两种模式：

- **默认（角色/物品）**：用**边界洪水填充**，只把与画面边缘连通的近黑像素判为背景，因此角色
  内部的黑色描边/暗部、以及物品本身的黑色部件都**不会被误伤**；边缘按亮度羽化，光晕/星芒平滑淡出。
- **`--emissive`（发光特效 `fx/`）**：整幅按**亮度**设 alpha（`alpha≈亮度`）。技能特效是「黑底之上的
  光」，四散的火星/光丝各自独立、没有需要保留的黑，用全局亮度抠图才干净（洪水填充反而会把火星
  之间的黑留成不透明块）。特效在游戏里用 `mix-blend-mode: screen` 叠加，抠不抠观感几乎一致，但抠
  掉后在任意背景/混合模式下都正确。

**幂等**：只改 alpha 不改 RGB，已透明的图（`classic.png`、`game/*`）自动跳过，可反复运行。
生成新素材后的完整流水线：`gen → opt → cutout-assets.py`（特效加 `--emissive`）。

<!--
   Ψ · 观测记录
   ─────────────────────────────────────────────
   能读到这一行,你就翻了源码。于是它对你坍缩了。

   「薛定谔的 Claude」——角色选择(菜单栏「勇士」)里
   藏着一张人影卡。它处于叠加态:在你观测之前,谁也说不清
   里面是哪一位。点击人影即观测,波函数坍缩,随机显形成一位
   Claude 勇士(贤者 / 骑士 / 法师 / 游侠 / 武僧,以及压轴的
   薛定谔之猫);再点一次,重新掷一次。选中的会像其它勇士一样
   出现在副本战斗中并自动存档。没生成立绘时也照玩:卡面回退
   emoji 字形,战斗回退默认勇士立绘。

   还有一页同款「幻影层」文档:全文默认是乱码,光标扫过之处
   才坍缩为真实内容 ——
      docs/schrodinger-claude.html
   (GitHub 点开只显示源码;本地浏览器打开即渲染,或走
    raw.githack.com/USER/REPO/main/docs/schrodinger-claude.html)

   重新生成这批立绘(可选;抠黑底见上文 cutout 一节):
      npm run gen:claude      → src/assets/claude/
      npm run opt:claude      压到 128px
   ─────────────────────────────────────────────
-->

## 结构

```text
src/
  game/
    types.ts        类型定义
    constants.ts    品质表、属性元数据
    itemData.ts     武器/护甲/戒指/项链 模板、独特装备、词条池
    formulas.ts     核心公式：属性计算、物品生成、副本、强化、重铸
    initial.ts      初始装备与默认状态
    store.ts        Zustand 全局状态与所有游戏动作（含战斗循环）
    save.ts         Base64 存档编解码
  hooks/
    useGameLoop.ts  回血 / 每秒 tick / 自动保存
  ui/
    StatusPanel · EquipmentBar · SystemLog · MapPanel · Backpack
    Shop · StrengthenPanel · ReincarnationPanel · ItemCard · TooltipLayer · Modal
  App.tsx           布局与弹窗编排
```

> 与原版数值一致性经过 533 条断言的引擎测试与多智能体逐条对照校验。
