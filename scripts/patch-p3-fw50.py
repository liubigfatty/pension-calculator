# -*- coding: utf-8 -*-
"""
2026-09-12 修复 P3：原 50 岁退休女性（企业女职工 / 女工人）不延迟的问题。

政策依据：国办发〔2025〕5号
  - 原 50 岁女职工：1975-01 起出生者，出生年月每往后 2 个月延迟 1 个月，逐步至 55 岁（cap 60）
  - 原 55 岁女职工（女干部/灵活就业）：1970-01 起，每 4 个月延迟 1 个月，至 58 岁（cap 36）
  - 男职工：1965-01 起，每 4 个月延迟 1 个月，至 63 岁（cap 36）

问题：引擎中 `if (type === 'fw50' || type === 'fw' || type === 'ef50') return 0;`
      把三类人群挡在计算之外，而下方 switch 里 `case 'fw'` 的参数（1975/2/60）本就正确，
      属「参数写了、执行路径短路了」的原始逻辑矛盾（源自首个提交 c1cd73e）。

本脚本对全部引擎副本做精准 patch（保持其余字节与换行不变），三处改动：
  1) 删除短路行
  2) switch 补 case 'fw50' / case 'ef50'（不补会落 default: return 0，等于没修）
  3) delayKeyMap 补 fw50 / ef50 映射

注意：引擎文件为 CRLF 换行，所有多行匹配必须用 \\r?\\n，否则静默不生效。
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TARGETS = [
    "engine/pension-engine.js",
    "cloudfunctions/calculate/pension-engine.js",
    "web/engine.js",
    "engine.js",
    "docs/js/pension-engine.js",
    "docs/js/pension-engine-browser.js",
    "docs/网页版/js/pension-engine-browser.js",
]

# ---- 1. 短路行（两种历史写法）----
RE_SHORT = re.compile(
    r"^([ \t]*)if \(type === 'fw50'(?: \|\| type === 'fw')?(?: \|\| type === 'ef50')?\) return 0;[ \t]*\r?\n",
    re.MULTILINE,
)
NOTE = (
    "{i}// 2026-09-12 修复 P3：原 50 岁退休女性（企业女职工/女工人）同样适用延迟退休。\n"
    "{i}//   国办发〔2025〕5号：1975-01 起出生者，出生年月每往后 2 个月延迟 1 个月，逐步至 55 岁（cap 60）。\n"
    "{i}//   此前此处有一行短路 return 0，使 fw / fw50 / ef50 三类人群延迟量恒为 0，与政策不符。\n"
)

# ---- 2. switch 补 case ----
RE_CASE = re.compile(r"case 'fw':(\r?\n)([ \t]*)baseYear = 1975; step = 2; cap = 60")
CASE_NEW = (
    "case 'fw':{n}{s}case 'fw50':{n}{s}case 'ef50':{n}{s}baseYear = 1975; step = 2; cap = 60"
)

# ---- 3. delayKeyMap ----
OLD_MAP = "const delayKeyMap = { 'male': 'male', 'fc': 'female_cadre', 'fw': 'female_worker', 'fw55': 'female_worker' }"
NEW_MAP = (
    "const delayKeyMap = { 'male': 'male', 'fc': 'female_cadre', 'fw': 'female_worker', "
    "'fw50': 'female_worker', 'ef50': 'female_worker', 'fw55': 'female_worker' }"
)


def patch(path):
    src = io.open(path, encoding="utf-8", newline="").read()
    out = src
    msgs = []

    # 0. 先判断是否已是「fw50 映射」写法（docs/网页版 副本，本就正确）
    if "if (type === 'fw50') type = 'fw'" in out:
        msgs.append("  [跳过短路] 该文件已是 fw50→fw 映射写法，无短路 bug")

    # 1. 短路行
    m = RE_SHORT.search(out)
    if m:
        indent = m.group(1)
        out = RE_SHORT.sub(NOTE.format(i=indent), out, count=1)
        msgs.append("  [已改] 短路行已删除")
    elif "if (type === 'fw50') type = 'fw'" not in out:
        msgs.append("  [警告] 未找到短路行，也未找到映射写法 —— 需人工确认")

    # 2. switch case
    n = len(RE_CASE.findall(out))
    if n == 1:
        mm = RE_CASE.search(out)
        out = RE_CASE.sub(CASE_NEW.format(n=mm.group(1), s=mm.group(2)), out, count=1)
        msgs.append("  [已改] switch 补 case 'fw50'/'ef50'")
    elif n == 0:
        if "case 'fw50':" in out:
            msgs.append("  [跳过] switch 已含 case 'fw50'")
        else:
            msgs.append("  [警告] switch 未匹配到 case 'fw' 参数行")
    else:
        msgs.append("  [警告] switch 匹配 %d 次（应为 1）" % n)

    # 3. delayKeyMap
    c = out.count(OLD_MAP)
    if c == 1:
        out = out.replace(OLD_MAP, NEW_MAP, 1)
        msgs.append("  [已改] delayKeyMap 补 fw50/ef50")
    elif c == 0:
        if "'fw50': 'female_worker'" in out:
            msgs.append("  [跳过] delayKeyMap 已含 fw50")
        else:
            msgs.append("  [警告] delayKeyMap 未匹配")
    else:
        msgs.append("  [警告] delayKeyMap 匹配 %d 次" % c)

    if out != src:
        io.open(path, "w", encoding="utf-8", newline="").write(out)
        msgs.append("  -> 已写入")
    else:
        msgs.append("  -> 无变化")
    return msgs


def main():
    for rel in TARGETS:
        path = os.path.join(ROOT, rel)
        print("=== %s ===" % rel)
        if not os.path.exists(path):
            print("  [缺失] 跳过")
            continue
        for line in patch(path):
            print(line)
        print("")
    print("完成。下一步：跑回归验证。")


if __name__ == "__main__":
    sys.exit(main())
