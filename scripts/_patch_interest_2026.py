# -*- coding: utf-8 -*-
"""
把 2026 年度记账利率 2.60% 固化到全部引擎副本，并补订正残留的 2021 = 5.35%。

事实依据（2026-09-15 核）：
- 2025 = 1.50%：官方值。多地人社局《2025 年度社会保险信息披露》明写
  "由人社部确定的城镇职工基本养老保险个人账户记账利率为 1.5%"
  （南昌市人社局、金昌市人社局等政府官网公告）
- 2026 = 2.60%：内蒙古社保个人账户台账最早露出，广东"粤省事"小程序利息
  数据二次印证（参保人按 2.6% 代入月积数法可复算到分）。
  人社部/财政部尚未公开发文 ⇒ 标注为"系统台账反推值"，非官方公告值。
- 2021 = 6.69%：城镇职工全国统一值。5.35% 是青海省 2021 年城乡居民记账
  利率（青人社厅函〔2021〕637号），属串轨。
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 单行紧凑格式（calc-index 系列 / 小程序 / 对比脚本）
SINGLE_OLD = "2021: 0.0535, 2022: 0.0612, 2023: 0.0397, 2024: 0.0262, 2025: 0.0150"
SINGLE_NEW = ("2021: 0.0669, 2022: 0.0612, 2023: 0.0397, 2024: 0.0262, "
              "2025: 0.0150, 2026: 0.0260")
SINGLE_OLD2 = "2024: 0.0262, 2025: 0.0150"
SINGLE_NEW2 = "2024: 0.0262, 2025: 0.0150, 2026: 0.0260"

# 多行格式（主引擎）2025 行 → 加逗号 + 追加 2026 行
MULTI_OLD = "  2025: 0.0150"
MULTI_NEW = ("  2025: 0.0150,  // 1.50%（官方：多地人社局 2025 年度社保信息披露）\n"
             "  2026: 0.0260   // 2.60%（内蒙古/广东社保系统台账反推，人社部尚未正式发文）")

# 回退逻辑
FALLBACK_OLD = """  // 未来年份 → 取最新已知（2025 = 1.50%）
  if (year > 2025) {
    return UNIFIED_INTEREST_RATES[2025]
  }"""
FALLBACK_NEW = """  // 未来年份 → 取最新已知（2026 = 2.60%）
  if (year > 2026) {
    return UNIFIED_INTEREST_RATES[2026]
  }"""

TARGETS = [
    "calc-index.js",
    "cloudfunctions/calculate/pension-engine.js",
    "docs/js/pension-engine-browser.js",
    "docs/js/pension-engine.js",
    "docs/网页版/js/pension-engine-browser.js",
    "engine/pension-engine.js",
    "engine.js",
    "index-engine/calcIndex.js",
    "index-mini/cloudfunctions/calcIndex/calcIndex.js",
    "miniprogram/pages/step2/step2.js",
    "web/calc-index.js",
    "web/engine.js",
    "web-index/calc-index.js",
]

changed = []
for rel in TARGETS:
    p = os.path.join(ROOT, rel)
    if not os.path.isfile(p):
        print("MISS   ", rel)
        continue
    t = io.open(p, encoding="utf-8").read()
    orig = t
    # 1) 单行紧凑格式
    if SINGLE_OLD in t:
        t = t.replace(SINGLE_OLD, SINGLE_NEW)
    elif SINGLE_OLD2 in t:
        t = t.replace(SINGLE_OLD2, SINGLE_NEW2)
    # 2) 多行格式：只处理本文件里没有 2026 的
    elif "2026: 0.0260" not in t and MULTI_OLD in t:
        t = t.replace(MULTI_OLD, MULTI_NEW)
    # 3) 回退逻辑
    if FALLBACK_OLD in t:
        t = t.replace(FALLBACK_OLD, FALLBACK_NEW)
    if t != orig:
        io.open(p, "w", encoding="utf-8").write(t)
        changed.append(rel)
        print("PATCHED", rel)
    else:
        print("no-op  ", rel)

print("\n改动文件数：", len(changed))
