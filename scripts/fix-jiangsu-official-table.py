# -*- coding: utf-8 -*-
"""
按官方《计算实际缴费工资指数的基数》汇编（1992-2024，缴费年度口径）全量精确化江苏 AVG_SALARY_HISTORY。
表 Y（缴费年）→ 统计年 Y-1，值÷12 保留两位。差异：2000 年 858→759.17（高13%，唯一实质订正）；
其余为四舍五入精确化。块级定位，只动江苏 avg_salary_history 块。
"""
import re, io, os

BASE = r"C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台"

# 统计年 -> 官方基数(元/年)÷12
FIX = {
    1995: 5943/12, 1996: 6603/12, 1997: 7108/12, 1998: 8256/12, 1999: 9171/12,
    2000: 9110/12, 2001: 11842/12, 2002: 13509/12, 2003: 15712/12, 2004: 18202/12,
    2005: 20957/12, 2006: 23782/12, 2007: 27374/12, 2008: 31667/12, 2009: 35890/12,
    2010: 40505/12, 2011: 45987/12, 2012: 51279/12, 2013: 57985/12, 2014: 61783/12,
    2015: 67200/12, 2016: 72684/12, 2017: 79741/12,
}
FIX = {y: round(v, 2) for y, v in FIX.items()}

FILES = [
    "cloudfunctions/calculate/provinces/jiangsu.js",
    "cloudfunctions/calculate/provinces/jiangsu.json",
    "docs/js/provinces/jiangsu.json",
    "docs/网页版/provinces/jiangsu.json",
    "provinces/jiangsu.json",
    "provinces-bundle.js",
    "web/provinces-bundle.js",
    "index-mini/cloudfunctions/calcIndex/provinces-data.js",
    "index-mini/data/salaryHistory.js",
    "web/provinces-index-data.js",
    "web-index/provinces-index-data.js",
]

def find_matching_brace(s, start):
    depth = 0
    for i in range(start, len(s)):
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
            if depth == 0:
                return i
    return -1

def fmt(v):
    return repr(v)  # 688 -> '688', 495.25 -> '495.25'

changed_years_total = {}
for rel in FILES:
    p = os.path.join(BASE, rel)
    s = io.open(p, encoding="utf-8").read()
    out = s
    report = []
    for m in list(re.finditer(r'avg_salary_history"\s*:\s*\{|avg_salary_history\s*:\s*\{|AVG_SALARY_HISTORY\s*=\s*\{', out)):
        ob = out.index('{', m.start())
        cb = find_matching_brace(out, ob)
        block = out[ob:cb+1]
        # 只处理江苏块：含 1995 起点 + 2018=7215.83 特征
        if '7215.83' not in block or '"1995"' not in block and '1995:' not in block:
            continue
        nb = block
        for y, v in FIX.items():
            pat = re.compile(r'("?' + str(y) + r'"?\s*:\s*)([\d.]+)')
            mm = pat.search(nb)
            if not mm:
                report.append(str(y) + ':MISSING')
                continue
            old = float(mm.group(2))
            if abs(old - v) < 0.005:
                continue
            nb = nb[:mm.start(2)] + fmt(v) + nb[mm.end(2):]
            report.append(str(y) + ':' + mm.group(2) + '->' + fmt(v))
        out = out[:ob] + nb + out[cb+1:]
    if out != s:
        io.open(p, "w", encoding="utf-8", newline="").write(out)
    print(rel, '| changes:', len(report), ('| ' + ' '.join(report) if report else '(already exact)'))

print('DONE')
