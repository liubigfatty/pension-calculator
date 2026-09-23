# -*- coding: utf-8 -*-
"""
把验算脚本里"期望值"按引擎实测回填。

用法：
  1) node _verify_years.js --update | grep @@UM   → 得到 行号|实际值
  2) 本脚本按行号替换该行 ok()/eq() 调用的第 3 个参数（want）

安全规则（宁可漏改，不可错改）：
  - 同一行号出现多个不同实际值 ⇒ 该断言在循环内，跳过（必须人工改数组常量）
  - 行内含 `? 1 : 0` / `? 0 : 1` ⇒ 布尔型元检验，跳过
  - 括号跨行不平衡 ⇒ 跳过
  - 一行内有多个 ok( ⇒ 跳过
  - 实际值非数字 ⇒ 跳过
"""
import io
import re
import subprocess
import sys

ROOT = r"C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/scripts"
NODE = r"C:/Users/14041/.workbuddy/binaries/node/versions/22.22.2-2/node.exe"

TARGETS = ["_verify_years.js", "_verify_compare.js"]


def split_args(s):
    """按顶层逗号切分参数，返回 [(start, end, text)]"""
    out, depth, i, start = [], 0, 0, 0
    in_s = None
    while i < len(s):
        c = s[i]
        if in_s:
            if c == "\\":
                i += 2
                continue
            if c == in_s:
                in_s = None
        elif c in "'\"`":
            in_s = c
        elif c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        elif c == "," and depth == 0:
            out.append((start, i, s[start:i]))
            start = i + 1
        i += 1
    out.append((start, len(s), s[start:]))
    return out


def process(fname):
    path = ROOT + "/" + fname
    src = io.open(path, encoding="utf-8").read()
    lines = src.split("\n")

    r = subprocess.run([NODE, fname, "--update"], cwd=ROOT,
                       capture_output=True, text=True, encoding="utf-8")
    recs = []
    for ln in (r.stdout or "").split("\n"):
        m = re.match(r"@@UM\|(\d+)\|(.+)$", ln.strip())
        if m:
            recs.append((int(m.group(1)), m.group(2)))

    # 同号多值 ⇒ 循环内
    by_line = {}
    for ln, v in recs:
        by_line.setdefault(ln, set()).add(v)

    changed, skipped = [], []
    for ln in sorted(by_line):
        vals = by_line[ln]
        idx = ln - 1
        if idx >= len(lines):
            skipped.append((ln, "行号越界"))
            continue
        line = lines[idx]
        if len(vals) > 1:
            skipped.append((ln, "循环内多行值：%s" % sorted(vals)[:3]))
            continue
        if "? 1 : 0" in line or "? 0 : 1" in line:
            skipped.append((ln, "布尔元检验"))
            continue
        val = list(vals)[0]
        try:
            fv = float(val)
        except ValueError:
            skipped.append((ln, "非数字 %s" % val))
            continue
        # 找 ok( / eq( 调用
        m = re.search(r"\b(ok|eq)\s*\(", line)
        if not m:
            skipped.append((ln, "未找到 ok() 调用"))
            continue
        if len(re.findall(r"\b(?:ok|eq)\s*\(", line)) > 1:
            skipped.append((ln, "一行多个调用"))
            continue
        # 括号平衡（跨行检测）
        seg = line[m.end() - 1:]
        if seg.count("(") != seg.count(")"):
            skipped.append((ln, "跨行调用"))
            continue
        inner = seg[1:seg.rfind(")")]
        args = split_args(inner)
        if len(args) < 3:
            skipped.append((ln, "参数不足 %d" % len(args)))
            continue
        a0, a1, a2 = args[0], args[1], args[2]
        old = a2[2].strip()
        try:
            ov = float(old)
        except ValueError:
            skipped.append((ln, "原期望非数字 %r" % old))
            continue
        if abs(ov - fv) <= 1e-9:
            continue  # 已一致
        # 保持原书写形态（整数/小数位）
        newtxt = ("%d" % round(fv)) if "." not in old else (
            ("%%.%df" % (len(old.split(".")[1]))) % fv)
        newline = (line[:m.end() + a2[0]] + newtxt + line[m.end() + a2[1]:])
        lines[idx] = newline
        changed.append((ln, old, newtxt, line.strip()[:60]))

    if changed:
        io.open(path, "w", encoding="utf-8").write("\n".join(lines))
    print("=== %s ===" % fname)
    print("  回填 %d 处 / 跳过 %d 处" % (len(changed), len(skipped)))
    for ln, old, new, ctx in changed:
        print("   L%-4d %s → %s   | %s" % (ln, old, new, ctx))
    for ln, why in skipped:
        print("   ⚠ L%-4d 跳过：%s" % (ln, why))
    return len(changed), len(skipped)


if __name__ == "__main__":
    tot_c = tot_s = 0
    for f in TARGETS:
        c, s = process(f)
        tot_c += c
        tot_s += s
    print("\n合计回填 %d 处，跳过 %d 处" % (tot_c, tot_s))
