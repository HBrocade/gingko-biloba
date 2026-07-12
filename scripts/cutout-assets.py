#!/usr/bin/env python3
# 把「纯黑底」的生成素材抠成透明 PNG。
#
# 用法：
#   python3 scripts/cutout-assets.py                 # 处理默认目录（generated/heroes/claude）
#   python3 scripts/cutout-assets.py --dir claude     # 只处理某个子目录
#   python3 scripts/cutout-assets.py --dir fx --emissive   # 发光特效：全局亮度抠图
#   python3 scripts/cutout-assets.py --dry             # 只报告不写回
#   python3 scripts/cutout-assets.py --out /tmp/x      # 写到别处（预览用，不覆盖原图）
#
# 两种模式：
#  · 默认（角色/物品）：从四条边界做「洪水填充」，只把**与边界连通**的近黑像素判为背景，
#    因此角色内部的黑色描边/暗部、物品的黑色部件都不会被误伤；边缘按亮度羽化平滑淡出。
#  · --emissive（发光特效，如 fx/）：整幅按**亮度**设 alpha（alpha≈亮度）。发光特效是
#    「黑底之上的光」，没有需要保留的「有意义的黑」，四散的火星/光丝各自独立，用全局亮度
#    抠图才干净——洪水填充反而会把火星之间的黑留成不透明块。
#
# 已透明的图（classic.png、game/*）自动跳过；只改 alpha 不改 RGB，可反复运行。
# 需要 Pillow + numpy（`pip install Pillow numpy`）。

import argparse, glob, os, sys
from collections import deque
import numpy as np
from PIL import Image

T_LOW = 12    # 亮度 <= T_LOW 的背景像素 -> 全透明
T_HIGH = 46   # 洪水填充上限 & 羽化顶端；亮度 > T_HIGH 视为前景，停止扩散
BORDER_BLACK_MAX = 24  # 判定「黑底」：四边最亮像素 <= 此值

# 发光特效（--emissive）的亮度→alpha 曲线：亮度 >= E_HIGH 全不透明（保住特效核心与主体），
# 只有暗部/黑底按亮度渐隐，既能在浅色背景上正确显示，又几乎不改动 screen 混合下的观感。
E_LOW = 6
E_HIGH = 64


def brightness(rgb):
    return rgb.max(axis=2)


def border_is_transparent(a):
    edges = np.concatenate([a[0, :, 3], a[-1, :, 3], a[:, 0, 3], a[:, -1, 3]])
    return int(edges.min()) == 0 and int(edges.max()) < 8


def border_is_black(a):
    mx = brightness(a[:, :, :3].astype(np.int32))
    edges = np.concatenate([mx[0, :], mx[-1, :], mx[:, 0], mx[:, -1]])
    return int(edges.max()) <= BORDER_BLACK_MAX


def flood_bg(mx):
    """与边界连通、亮度 <= T_HIGH 的像素 = 背景。返回 bool mask。"""
    h, w = mx.shape
    passable = mx <= T_HIGH
    visited = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if passable[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if passable[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and passable[ny, nx]:
                visited[ny, nx] = True
                dq.append((ny, nx))
    return visited


def cutout_emissive(path, out_path):
    """发光特效：整幅按亮度设 alpha（黑底之上的光）。"""
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.int16).copy()
    if border_is_transparent(a):
        return 'skip-transparent'
    mx = brightness(a[:, :, :3].astype(np.int32))
    alpha = np.clip((mx - E_LOW) * (255.0 / (E_HIGH - E_LOW)), 0, 255).astype(np.int16)
    a[:, :, 3] = np.minimum(a[:, :, 3], alpha)
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(out_path)
    return f'ok-emissive(vis={float((alpha > 8).mean()):.0%})'


def cutout(path, out_path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.int16).copy()
    if border_is_transparent(a):
        return 'skip-transparent'
    if not border_is_black(a):
        return 'skip-not-black'
    mx = brightness(a[:, :, :3].astype(np.int32))
    bg = flood_bg(mx)
    frac = bg.mean()
    if frac > 0.92:  # 抠掉了几乎整张图 -> 判定异常，跳过以免毁图
        return f'skip-suspicious({frac:.2f})'
    feather = np.clip((mx - T_LOW) * (255.0 / (T_HIGH - T_LOW)), 0, 255).astype(np.int16)
    alpha = a[:, :, 3]
    a[:, :, 3] = np.where(bg, np.minimum(alpha, feather), alpha)
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(out_path)
    return f'ok(bg={frac:.0%})'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', action='append', help='src/assets 下的子目录，可多次')
    ap.add_argument('--out', help='输出目录（默认原地覆盖）')
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--emissive', action='store_true', help='发光特效模式（全局亮度抠图，用于 fx/）')
    args = ap.parse_args()

    root = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets')
    dirs = args.dir or ['generated', 'heroes', 'claude']
    files = []
    for d in dirs:
        files += sorted(glob.glob(os.path.join(root, d, '*.png')))

    done = skipped = 0
    for f in files:
        out = f
        if args.out:
            out = os.path.join(args.out, os.path.relpath(f, root))
            os.makedirs(os.path.dirname(out), exist_ok=True)
        if args.dry:
            im = np.asarray(Image.open(f).convert('RGBA')).astype(np.int16)
            status = 'transparent' if border_is_transparent(im) else ('black' if border_is_black(im) else 'other')
            print(f'  {status:12} {os.path.relpath(f, root)}')
            continue
        r = cutout_emissive(f, out) if args.emissive else cutout(f, out)
        if r.startswith('ok'):
            done += 1
        else:
            skipped += 1
        print(f'  {r:22} {os.path.relpath(f, root)}')
    if not args.dry:
        print(f'\nDone: {done} cut out, {skipped} skipped.')


if __name__ == '__main__':
    main()
