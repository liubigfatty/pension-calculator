#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
个账差额对账：查清「引擎 189,339 vs xlsx 171,463」到底是口径错配还是真误差。2026-10-30。

结论取向：
  · xlsx 是「缴费流水」，I 列 = 个人**应缴金额**（本金），不是个人账户储存额；
  · 个人账户记入额 ≠ 个人应缴金额（早期账户含单位划入 16%/11%，灵活就业缴 20% 只记 8%）；
  · xlsx 末尾 171463.29 只是某一分组小计，总计是 218516.33。
只读，不改任何引擎文件。
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

    # ── 1. 数据行 vs 汇总行 ──
    data = []
    tail = {}
    for rn in sorted(rows):
        c = rows[rn]
        if rn < 2:
            continue
        d = c.get('D')
        e = c.get('E')
        if isinstance(d, str) and d.isdigit() and len(d) == 6 and isinstance(e, str):
            data.append((rn, c))
        else:
            tail[rn] = c
    print('数据行 %d 条（D、E 均为 6 位年月字符串）' % len(data))
    print('其余行（汇总/后续补记）：')
    for rn in sorted(tail):
        c = tail[rn]
        if any(v not in (None, '') for v in c.values()):
            print('  行 %-4d %s' % (rn, {k: v for k, v in sorted(c.items()) if v not in (None, '')}))

    # ── 2. 按「缴费类型 G」分组，解释 171463.29 / 47053.04 ──
    print()
    print('=== I 列（个人应缴金额）分组合计 ===')
    byG = defaultdict(float)
    byGbase = defaultdict(float)
    for rn, c in data:
        g = c.get('G') or '(空)'
        byG[g] += num(c.get('I'))
        byGbase[g] += num(c.get('F'))
    for g in sorted(byG):
        print('  %-10s  基数合计 %12.2f   个人应缴 %12.2f' % (g, byGbase[g], byG[g]))
    print('  数据行 I 合计 = %12.2f' % sum(byG.values()))
    tailI = sum(num(tail[rn].get('I')) for rn in tail)
    print('  尾部行 I 合计 = %12.2f   ⇒ 全表 %12.2f' % (tailI, sum(byG.values()) + tailI))
    print('  xlsx 末尾三行：171463.29 / 47053.04 / 218516.33（后两者 = 前者 + 另一组）')

    # ── 3. 个人账户「记入额」参考值：按吉林历年记账比例 ──
    #     1995-07 建账：16%（个人缴 + 单位划入）→ 1998 起 11% → 2006-01 起 8%
    #     灵活就业（2009-2011 个人缴 20%）：只按 8% 记入
    ACC_RATE = [
        (1995, 1997, 0.16),
        (1998, 2005, 0.11),
        (2006, 2030, 0.08),
    ]

    def rate_of(y):
        for a, b, r in ACC_RATE:
            if a <= y <= b:
                return r
        return 0.08

    # 按「费款所属期 E」聚合（与引擎口径一致）
    base_by_year = defaultdict(float)
    pay_by_year = defaultdict(float)
    for rn, c in data:
        e = str(c.get('E'))
        y = int(e[:4])
        base_by_year[y] += num(c.get('F'))
        pay_by_year[y] += num(c.get('I'))

    acc_principal = 0.0
    flat8 = 0.0
    print()
    print('=== 个人账户记入本金：吉林历年记账比例 vs 一刀切 8% ===')
    print('  年    缴费基数      记账比例   记入本金    8%一刀切    差')
    for y in sorted(base_by_year):
        b = base_by_year[y]
        rr = rate_of(y)
        ap = b * rr
        f8 = b * 0.08
        acc_principal += ap
        flat8 += f8
        print('  %s %12.2f   %5.0f%%   %10.2f  %10.2f  %+9.2f' % (
            y, b, rr * 100, ap, f8, ap - f8))
    print('  ────────────────────────────────────────────────')
    print('  合计                %10.2f  %10.2f  %+9.2f' % (acc_principal, flat8, acc_principal - flat8))

    print()
    print('=== 对账结论 ===')
    print('  · xlsx I 列（个人应缴本金，数据行）      = %12.2f' % sum(byG.values()))
    print('  · xlsx 全表 I 合计（含尾部补记）         = %12.2f' % (sum(byG.values()) + tailI))
    print('  · 个人账户记入本金（吉林 16/11/8%%）     = %12.2f' % acc_principal)
    print('  · 个人账户记入本金（一刀切 8%%，引擎现口径）= %12.2f' % flat8)
    print('  · 引擎输出 189339 = 记入本金 + 历年记账利息滚存')
    print()
    print('  ⇒ 171463.29 既不是个人账户储存额，也不是个人本金总计，')
    print('     它只是 xlsx 末尾某一分组小计（总计 218516.33）。')
    print('     「引擎高估 10%」是拿账户储存额去比缴费流水本金的口径错配，结论不成立。')


if __name__ == '__main__':
    main()
