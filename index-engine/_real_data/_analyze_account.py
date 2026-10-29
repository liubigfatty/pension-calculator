#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
解「副本个人缴费信息查询.xlsx」，逐年实测个人缴费比例与账户口径，2026-10-30。
目的：查清引擎个人账户 189,339 vs 实际 171,463 的 10% 差额根因。

只读，不写任何引擎文件。
"""
import zipfile, xml.etree.ElementTree as ET
from collections import defaultdict

M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
PATH = r'C:\Users\14041\Desktop\副本个人缴费信息查询.xlsx'


def load():
    z = zipfile.ZipFile(PATH)
    sst = []
    r = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in r.findall(M + 'si'):
        sst.append(''.join(t.text or '' for t in si.iter(M + 't')))
    sh = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = {}
    for row in sh.iter(M + 'row'):
        rn = int(row.get('r'))
        cells = {}
        for c in row.findall(M + 'c'):
            col = ''.join(ch for ch in c.get('r') if ch.isalpha())
            t = c.get('t')
            v = c.find(M + 'v')
            if v is None:
                val = None
            elif t == 's':
                val = sst[int(v.text)]
            else:
                try:
                    val = float(v.text)
                except Exception:
                    val = v.text
            cells[col] = val
        rows[rn] = cells
    return rows


def num(x):
    if x is None:
        return 0.0
    if isinstance(x, (int, float)):
        return float(x)
    try:
        return float(str(x).strip())
    except Exception:
        return 0.0


def main():
    rows = load()
    hdr = rows.get(1, {})
    print('=== 表头 ===')
    for k in sorted(hdr):
        print('  %s = %s' % (k, hdr[k]))

    recs = []
    for rn in sorted(rows):
        if rn < 2:
            continue
        c = rows[rn]
        d = c.get('D') or c.get('E')
        if d is None:
            continue
        s = str(d).strip()
        if not (s.isdigit() and len(s) >= 6):
            continue
        recs.append((rn, c, s))
    print()
    print('数据行数：%d   期间：%s ~ %s' % (len(recs), recs[0][2], recs[-1][2]))

    tot = defaultdict(float)
    peryear = defaultdict(lambda: defaultdict(float))
    peryear_months = defaultdict(int)
    for rn, c, s in recs:
        y = s[:4]
        peryear_months[y] += 1
        for k in 'FGHIJKLMN':
            v = num(c.get(k))
            tot[k] += v
            peryear[y][k] += v

    print()
    print('=== 全表各列合计 ===')
    for k in sorted(tot):
        print('  %s = %14.2f' % (k, tot[k]))

    print()
    print('=== 逐年个人缴费比例（I 个人应缴 ÷ F 缴费基数）===')
    print('  年   行数  缴费基数合计   个人应缴    个人比例   单位应缴   单位比例')
    for y in sorted(peryear):
        p = peryear[y]
        if p['F'] <= 0:
            continue
        print('  %s  %4d  %12.0f  %10.2f  %7.2f%%  %10.2f  %7.2f%%' % (
            y, peryear_months[y], p['F'], p['I'], p['I'] / p['F'] * 100,
            p['H'], p['H'] / p['F'] * 100))

    print()
    print('=== 账户口径候选 ===')
    print('  个人本金 I            = %12.2f' % tot['I'])
    print('  个人利息 K            = %12.2f' % tot['K'])
    print('  个人本金+个人利息 I+K = %12.2f' % (tot['I'] + tot['K']))
    print('  单位本金 H            = %12.2f' % tot['H'])
    print('  单位利息 J            = %12.2f' % tot['J'])
    print('  全部本金 H+I          = %12.2f' % (tot['H'] + tot['I']))
    print('  H+I+J+K               = %12.2f' % (tot['H'] + tot['I'] + tot['J'] + tot['K']))
    print()
    print('  xlsx 表尾汇总行（若存在）：')
    mx = max(rows)
    for rn in range(mx - 6, mx + 1):
        c = rows.get(rn, {})
        if c.get('I') is not None and (c.get('F') is None or num(c.get('F')) == 0):
            print('   行 %d: %s' % (rn, {k: v for k, v in sorted(c.items()) if v not in (None, '')}))


if __name__ == '__main__':
    main()
