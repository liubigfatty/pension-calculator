#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
补录 1995-1998 社平（湖北/海南/西藏），2026-10-30。

⚠️ 两套语义，别混：
   执行年（真相源 .js + 云函数内 .json + index-mini/web 产物）：hist[Y] = Y-1 统计年
   统计年（根 provinces/*.json + docs/js + docs/网页版）：      hist[Y] = Y   统计年
   西藏是「当年」口径，两套同值。

数据来源（均在报告中标明）：
   湖北 = 武汉市城镇非私营单位在岗职工平均工资 ÷12（引擎该序列口径；1999-2005 与官方逐位吻合）
   海南 = 海南省在岗职工月平均工资（省人社厅历年序列；1998=520 与引擎现値一致）
   西藏 = 西藏统计局城镇非私营单位在岗职工平均工资 ÷12（1998=10987÷12=915.58 与引擎一致）

用法：python scripts/_backfill_salary_1995_1998.py [--apply]
      默认 dry-run，加 --apply 才写盘。
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = '--apply' in sys.argv

# 执行年语义（hist[Y] = Y-1 统计年）
EXEC = {
    'hubei':  [(1995, '381.67', '武汉市城镇非私营单位在岗职工平均工资 1994 年 4580 元/年 ÷12'),
               (1996, '443.91', '1995 年 5326.89 元/年 ÷12'),
               (1997, '498.41', '1996 年 5980.97 元/年 ÷12'),
               (1998, '533.81', '1997 年 6405.66 元/年 ÷12（原 706 为首端兜底值，已按官方值替换）')],
    'hainan': [(1995, '374',    '海南省在岗职工月平均工资 1994 年（历年序列）'),
               (1996, '445',    '1995 年（历年序列）'),
               (1997, '456',    '1996 年（省人社厅：1996 年 456 元）'),
               (1998, '472',    '1997 年（省人社厅：1997 年 472 元；原 520 为首端兜底值）')],
    'xizang': [(1995, '615.17', '西藏统计局 1995 年 7382 元/年 ÷12'),
               (1996, '923.92', '1996 年 11087 元/年 ÷12'),
               (1997, '841.5',  '1997 年 10098 元/年 ÷12（⚠️ 较 1996 降 8.9%，统计局口径如此，待核）')],
}
# 统计年语义（hist[Y] = Y 统计年）—— 湖北/海南 比执行年整体前移一年
STAT = {
    'hubei':  {1995: '443.91', 1996: '498.41', 1997: '533.81'},
    'hainan': {1995: '445',    1996: '456',    1997: '472'},
    'xizang': {1995: '615.17', 1996: '923.92', 1997: '841.5'},
}

TARGETS = [
    # (目录, 省份, 语义, 是否 .js)
    ('cloudfunctions/calculate/provinces', 'exec', True),   # 真相源 .js
    ('cloudfunctions/calculate/provinces', 'exec', False),  # 云函数内 .json
    ('provinces',                          'stat', False),
    ('docs/js/provinces',                  'stat', False),
    ('docs/网页版/provinces',               'stat', False),
]

LINE_RE = re.compile(r'^(\s*)"?1998"?\s*:\s*([\d.]+)\s*,?(.*)$')
KEY_RE = re.compile(r'^\s*"?(\d{4})"?\s*:')

changed = []


def process(path, prov, sem, is_js):
    with io.open(path, 'r', encoding='utf-8', newline='') as f:
        text = f.read()
    lines = text.splitlines(keepends=True)
    eol = '\r\n' if '\r\n' in text else '\n'

    # ⚠️ 必须先定位到 avg_salary_history 块：文件里 PROV_BASE / base_rates 同样有 1995~1998 键，
    #    直接全文件找第一个 1998 会锚到计发基数块（湖北 idx=45 是 1998: 1874）。
    blk = None
    for i, ln in enumerate(lines):
        # 必须是「定义行」而非文件头注释里提到的名字
        if re.search(r'^\s*(const\s+AVG_SALARY_HISTORY\s*=\s*\{|"?avg_salary_history"?\s*:\s*\{)', ln):
            blk = i
            break
    if blk is None:
        return 'NO-HIST-BLOCK'
    idx = None
    for i in range(blk, len(lines)):
        m = LINE_RE.match(lines[i].rstrip('\r\n'))
        if m:
            idx = i
            break
    if idx is None:
        return 'NO-1998-ANCHOR'

    # ⚠️ 只在锚点附近扫描（文件里 base_rates 等块也有 1995/1996 键，全文件扫会误判「已存在」）
    existing = set()
    # 扫到本块结束为止：块后紧接的就是 base_rates/PROV_BASE（同样含 1995~1997 键）
    blk_indent = len(re.match(r'\s*', lines[blk]).group(0))
    for ln in lines[blk:]:
        raw = ln.rstrip('\r\n')
        cur = len(re.match(r'\s*', raw).group(0))
        if ln is not lines[blk] and cur <= blk_indent:
            break
        if re.search(r'(base_rates|PROV_BASE)', raw):
            break
        k = KEY_RE.match(raw)
        if k:
            existing.add(int(k.group(1)))

    if sem == 'exec':
        rows = EXEC[prov]
        add = [(y, v) for y, v, _ in rows if y not in existing]
        new1998 = dict((y, v) for y, v, _ in rows).get(1998)
    else:
        add = sorted((y, v) for y, v in STAT[prov].items() if y not in existing)
        new1998 = None

    if not add and (new1998 is None or float(new1998) == float(LINE_RE.match(lines[idx].rstrip('\r\n')).group(2))):
        return 'ALREADY-OK'

    indent = LINE_RE.match(lines[idx].rstrip('\r\n')).group(1)
    notes = dict((y, n) for y, _, n in EXEC[prov]) if sem == 'exec' else {}

    # 替换/保留 1998 行
    buf = []
    if new1998 and float(new1998) != float(LINE_RE.match(lines[idx].rstrip('\r\n')).group(2)):
        if is_js:
            buf.append(u'%s1998: %s,   // ✅ 补录(2026-10-30)：%s%s' % (indent, new1998, notes.get(1998, ''), eol))
        else:
            buf.append(u'%s"1998": %s,%s' % (indent, new1998, eol))
    else:
        buf.append(lines[idx])

    ins = list(buf)
    for y, v in add:
        # 始终插到「1998 行」之前（buf 只有一行 1998），保证 1995→1996→1997 顺序
        if is_js:
            ins.insert(len(ins) - 1,
                       u'%s%d: %s,   // ✅ 补录(2026-10-30)：%s%s' % (indent, y, v, notes.get(y, ''), eol))
        else:
            ins.insert(len(ins) - 1,
                       u'%s"%d": %s,%s' % (indent, y, v, eol))

    out = lines[:idx] + ins + lines[idx + 1:] if buf[0] is lines[idx] else lines[:idx] + ins + lines[idx + 1:]
    # 上面分支冗余，统一重建
    out = lines[:idx] + ins + lines[idx + 1:]

    if APPLY:
        with io.open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(u''.join(out))
    return u'insert %s / 1998->%s' % ([y for y, _ in add], new1998 or 'unchanged')


for sub, sem, is_js in TARGETS:
    for prov in ('hubei', 'hainan', 'xizang'):
        p = os.path.join(ROOT, sub, '%s.%s' % (prov, 'js' if is_js else 'json'))
        if not os.path.exists(p):
            print('  MISSING', p)
            continue
        r = process(p, prov, sem, is_js)
        print('%-46s %-8s %-4s %s' % (os.path.relpath(p, ROOT), prov, sem, r))
        changed.append((p, r))

print()
print('APPLY =', APPLY, '| 文件数', len(changed))
