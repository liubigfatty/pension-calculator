# -*- coding: utf-8 -*-
"""
把「贵州独生子女增发需持证」修复同步到所有同代际引擎副本。

背景：cloudfunctions/calculate/pension-engine.js 中贵州分支漏了 data.oneChild 判断，
      导致默认人人加发 5%（248.70 元/月）。重庆(3%)、海南(5%/10%)同类分支均有该判断。
      修复：条件追加 && data.oneChild

同步原则（血泪教训 2026-09-09）：
  - 只做**精准 patch**，绝不整体覆盖（副本存在代际差异）
  - 按**代码特征**定位，不按文件名
  - 幂等：已修复的文件跳过
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OLD = "if (config.province === 'guizhou' && config.modules?.special_addition?.enabled) {"
NEW = "if (config.province === 'guizhou' && config.modules?.special_addition?.enabled && data.oneChild) {"

TARGETS = [
    'cloudfunctions/calculate/pension-engine.js',
    'engine/pension-engine.js',
    'engine.js',
    'web/engine.js',
    'provinces-bundle.js',
    'web/provinces-bundle.js',
]


def main():
    dry = '--apply' not in sys.argv
    print('模式:', 'DRY-RUN（加 --apply 写入）' if dry else '写入')
    print()
    done = skip = miss = 0
    for rel in TARGETS:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            print(f'{rel:<44} MISS  文件不存在')
            miss += 1
            continue
        s = open(p, encoding='utf-8').read()
        if NEW in s:
            print(f'{rel:<44} SKIP  已修复')
            skip += 1
            continue
        if OLD not in s:
            print(f'{rel:<44} WARN  未找到目标行（代际不同，需人工确认）')
            miss += 1
            continue
        cnt = s.count(OLD)
        s2 = s.replace(OLD, NEW)
        if not dry:
            open(p, 'w', encoding='utf-8').write(s2)
        print(f'{rel:<44} PATCH 替换 {cnt} 处')
        done += 1
    print(f'\n合计：{done} 个待同步 / {skip} 个已修复 / {miss} 个需人工处理')


if __name__ == '__main__':
    main()
