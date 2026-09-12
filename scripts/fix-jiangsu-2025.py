# -*- coding: utf-8 -*-
"""
江苏 AVG_SALARY_HISTORY 2025=8537 无官方出处，批量删除。
依据：苏税发〔2026〕3号明文 —— 2026 年度缴费工资基数上下限"暂按2025年度标准执行"
（上限24762/下限4952，对应 2024 全口径社平 8254 元/月），
"待2025年度全口径城镇单位就业人员平均工资数据确定后"才发布 2026 年度标准。
故江苏官方有据序列止于 2024=8254。删除后引擎走 getBase 的"预发年=沿用上年原值"回退到 8254。
"""
import os, re, io

BASE = r"C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台"

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

PAT = re.compile(r'^"?20(25|26)"?\s*:\s*8537\s*,?\s*(//.*)?$')

total = 0
for rel in FILES:
    p = os.path.join(BASE, rel)
    if not os.path.exists(p):
        print("MISSING ", rel); continue
    src = io.open(p, encoding="utf-8").read()
    lines = src.split("\n")
    drop = set()
    for i, ln in enumerate(lines):
        if PAT.match(ln.strip()):
            # 只在江苏段内删除：向上找到最近的省份锚点
            drop.add(i)
    if not drop:
        print("SKIP (no 8537):", rel); continue

    out = []
    prev_dropped = False
    for i, ln in enumerate(lines):
        if i in drop:
            prev_dropped = True
            total += 1
            continue
        # 被删行的前一行若带尾逗号且后面紧跟 '}' / ']'，去掉逗号
        if prev_dropped and (i - 1) in drop:
            s = ln.rstrip()
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if s.endswith(",") and (nxt.startswith("}") or nxt.startswith("]")):
                ln = s[:-1]
        prev_dropped = False
        out.append(ln)

    text = "\n".join(out)
    io.open(p, "w", encoding="utf-8", newline="").write(text)
    print("OK  removed %d line(s): %s" % (len(drop), rel))

print("TOTAL removed:", total)
