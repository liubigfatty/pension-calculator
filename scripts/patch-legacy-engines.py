# -*- coding: utf-8 -*-
"""
2026-09-12 补齐引擎副本同步。

背景：全仓库共 8 份引擎文件，首轮只同步了 3 份（engine/、cloudfunctions/、web/），
遗漏 5 份。其中根目录 engine.js 是 GitHub Pages 实际发布的线上引擎
（线上 index.html 引用 engine.js / provinces-bundle.js / app.js）。

本脚本对 4 份旧副本做精准 patch（保持其余字节不变），只改三处逻辑：
  1) P2 阶梯公式：floor((diff-1)/step)+1 -> floor(diff/step)+1，且 diff<0 才 return 0
  2) D2 fw55 参数：1975/2/60 -> 1970/4/36（原文 1975/2/60 是原 50 岁女职工的参数）
  3) D1 退休日期进位：月份超 12 时年份需 +1
第 5 份 docs/js/pension-engine.min.js 是 347 字节 stub（window.pensionEngine=null），
无逻辑，跳过。
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TARGETS = [
    "engine.js",
    "docs/js/pension-engine.js",
    "docs/js/pension-engine-browser.js",
    "docs/网页版/js/pension-engine-browser.js",
]

# ---- 1. P2 阶梯公式 ----
OLD_DELAY = """  if (diff <= 0) return 0

  // 阶梯计算延迟月数
  const delay = Math.floor((diff - 1) / step) + 1
"""
NEW_DELAY = """  if (diff < 0) return 0

  // 阶梯计算延迟月数
  // 国办发〔2025〕5号附表：基准年 1 月出生即延迟 1 个月，其后每 step 个月加 1 个月
  // 2026-09-12 修复：原式 floor((diff-1)/step)+1 使每组首月少算 1 个月
  //   （出生月落 1/5/9 月时命中，占 male/fc 人群约 20.8%）
  const delay = Math.floor(diff / step) + 1
"""

# ---- 2. D2 fw55 参数 ----
OLD_FW55 = """      case 'fw55':
        baseYear = 1975; step = 2; cap = 60  // 灵活就业女55岁退休
"""
NEW_FW55 = """      case 'fw55':
        // 2026-09-12 修复：原为 1975/2/60 —— 那是「原 50 岁女职工」的参数，
        // 与本分支 baseAge=55 自相矛盾（1975 年生人 55 岁已是 2030 年，delay 会爆表）。
        // 国办发〔2025〕5号：原 55 岁女职工自 1970 年起每 4 个月延迟 1 个月，逐步至 58 岁（cap 36）
        baseYear = 1970; step = 4; cap = 36  // 灵活就业女 / 女干部 55 岁退休
"""

# ---- 3. D1 退休日期进位 ----
OLD_DATE = """function getRetireDate(birthYear, birthMonth, totalMonths) {
  const year = birthYear + Math.floor(totalMonths / 12)
  const month = birthMonth + (totalMonths % 12)

  return {
    year,
    month: month > 12 ? month - 12 : month
  }
}"""
NEW_DATE = """function getRetireDate(birthYear, birthMonth, totalMonths) {
  // 2026-09-12 修复：原实现先算 year = birthYear + floor(totalMonths/12)，
  // 再算 month = birthMonth + (totalMonths%12)，当 month > 12 时只把月份回拨、
  // 未给年份进位。例：「1965-12 生 · 60岁3个月」被算成 2025-03（应为 2026-03），
  // 与同一次返回的 ageStr「60岁3个月」自相矛盾。
  // 该错误经 legalDate 传染到：缴费年限（calcYears）、计发基数取值年份、社平取值
  // 年份、最低缴费年限判断、弹性提前退休日期（flexDate）。
  // 改用总月数直接换算，进位天然正确。
  const t = birthYear * 12 + (birthMonth - 1) + totalMonths
  return { year: Math.floor(t / 12), month: (t % 12) + 1 }
}"""

PATCHES = [
    ("P2 阶梯公式", OLD_DELAY, NEW_DELAY),
    ("D2 fw55参数", OLD_FW55, NEW_FW55),
    ("D1 日期进位", OLD_DATE, NEW_DATE),
]


def main():
    all_ok = True
    for rel in TARGETS:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            print("  [缺失] %s" % rel)
            all_ok = False
            continue
        src = io.open(path, encoding="utf-8").read()
        out = src
        print("=== %s ===" % rel)
        for name, old, new in PATCHES:
            n = out.count(old)
            if n != 1:
                print("  [跳过] %s —— 匹配 %d 次（应为 1），疑似已改或文本不同" % (name, n))
                if n == 0:
                    # 检查是否已是修复后状态
                    probe = new.split("\n")[-2].strip()
                    if probe and probe in out:
                        print("           -> 已含修复后代码，视为已完成")
                        continue
                    all_ok = False
                continue
            out = out.replace(old, new, 1)
            print("  [已改] %s" % name)
        if out != src:
            io.open(path, "w", encoding="utf-8", newline="").write(out)
            print("  -> 已写入")
        else:
            print("  -> 无变化")
        print("")
    print("结果：%s" % ("全部完成" if all_ok else "存在未处理项，请人工确认"))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
