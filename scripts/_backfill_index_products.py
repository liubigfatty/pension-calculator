#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
同步 1995-1998 补录到「指数侧」三份 build 产物（执行年语义），2026-10-30。
   index-mini/cloudfunctions/calcIndex/provinces-data.js
   web/provinces-index-data.js
   web-index/provinces-index-data.js

⚠️ 这三份是 build 产物，本来应由生成脚本产出；此处只做「纯文本插入 1995-1998」，
   不触发 salaryHistory 重建（记忆纪律：别单独重建 salaryHistory）。
⚠️ 多省循环时插入会使后续行号漂移（西藏曾因此插错位置）
   ⇒ 先收集全部 (行号, 替换为多行)，再按行号降序一次性应用。

用法：python scripts/_backfill_index_products.py [--apply]
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = '--apply' in sys.argv

FILES = [
    'index-mini/cloudfunctions/calcIndex/provinces-data.js',
    'web/provinces-index-data.js',
    'web-index/provinces-index-data.js',
]
# 执行年语义（与真相源 .js 一致）
ADD = {
    'hubei':  [(1995, '381.67'), (1996, '443.91'), (1997, '498.41'), (1998, '533.81')],
    'hainan': [(1995, '374'), (1996, '445'), (1997, '456'), (1998, '472')],
    'xizang': [(1995, '615.17'), (1996, '923.92'), (1997, '841.5')],
}
KEY_RE = re.compile(r'^(\s*)"(\d{4})"\s*:\s*([\d.]+)\s*,?\s*$')
PROV_RE = re.compile(r'^(\s*)"(\w+)":\s*\{')


def process(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return 'MISSING'
    with io.open(path, 'r', encoding='utf-8', newline='') as f:
        text = f.read()
    lines = text.splitlines(keepends=True)
    eol = '\r\n' if '\r\n' in text else '\n'
    out = list(lines)
    log = []
    edits = []  # (idx, [替换行...])

    for prov, rows in ADD.items():
        # 1) 定位省份块（顶层缩进最小的 "prov": { ）
        start = None
        for i, ln in enumerate(lines):
            m = PROV_RE.match(ln.rstrip('\r\n'))
            if m and m.group(2) == prov:
                start = i
                break
        if start is None:
            log.append('%s:NO-BLOCK' % prov)
            continue
        # 2) 块内找 avg_salary_history
        blk = None
        for i in range(start + 1, len(lines)):
            raw = lines[i].rstrip('\r\n')
            if PROV_RE.match(raw) and len(re.match(r'\s*', raw).group(0)) <= len(re.match(r'\s*', lines[start]).group(0)):
                break
            if re.search(r'"avg_salary_history"\s*:', raw):
                blk = i
                break
        if blk is None:
            log.append('%s:NO-HIST' % prov)
            continue
        # 3) 块内扫描 existing + 1998 锚点；缩进回退即停（防止扫到别的省）
        blk_indent = len(re.match(r'\s*', lines[blk]).group(0))
        existing = {}
        idx = None
        for i in range(blk, len(lines)):
            raw = lines[i].rstrip('\r\n')
            if i > blk and len(re.match(r'\s*', raw).group(0)) <= blk_indent:
                break
            m = KEY_RE.match(raw)
            if m:
                existing[int(m.group(2))] = i
                if m.group(2) == '1998' and idx is None:
                    idx = i
        if idx is None:
            log.append('%s:NO-1998' % prov)
            continue

        indent = KEY_RE.match(lines[idx].rstrip('\r\n')).group(1)
        new1998 = dict(rows).get(1998)
        ins = []
        for y, v in rows:
            if y == 1998:
                continue
            if y in existing:
                continue
            ins.append(u'%s"%d": %s,%s' % (indent, y, v, eol))
        if new1998 and abs(float(new1998) - float(KEY_RE.match(lines[idx].rstrip('\r\n')).group(3))) > 1e-9:
            ins.append(u'%s"1998": %s,%s' % (indent, new1998, eol))
            note = '1998->%s' % new1998
        else:
            ins.append(lines[idx])
            note = '1998 keep'
        edits.append((idx, ins))
        log.append('%s:+%d@%d(%s)' % (prov, len(ins) - 1, idx + 1, note))

    # 4) 按行号降序应用，避免漂移
    for idx, ins in sorted(edits, key=lambda x: -x[0]):
        out[idx:idx + 1] = ins

    if APPLY and edits:
        with io.open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(u''.join(out))
    return ' '.join(log) if log else 'NO-CHANGE'


for rel in FILES:
    print('%-52s %s' % (rel, process(rel)))
print()
print('APPLY =', APPLY)
