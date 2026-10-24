# -*- coding: utf-8 -*-
"""
补录「2025 统计年全口径社平」→ AVG_SALARY_HISTORY[2026]（2026 年度执行）
并对并轨省同步计发基数 → PROV_BASE[2026]

纪律：
- 纯文本插入，保留原文件编码 / 行尾 / BOM / 缩进（禁止 json.dump / 全量重写）
- 用「年份 + 值」双重定位，避免打到同构的其他序列块（PROV_BASE vs AVG_SALARY_HISTORY）
- 幂等：目标位置下一行若已是 2026 则跳过

来源（均已回官网核实）：
  浙江 8537  浙人社发〔2026〕52号（2026-10-08）——明文"2025年度加权平均工资102446元（8537元/月）"
  湖北 7587  鄂人社发〔2026〕29号（2026-08-12）——明文"2026社保年度缴费基数月标准为7587元"
  广东 9201  粤人社发〔2026〕24号（2026-09-17）——文件仅给上下限，未明文社平；由机关事业上限27603÷3反推
             （全省统一上下限 ⇒ 反推成立），广州市12345答复佐证
未发布（本次不写入）：河南、江西、海南、江苏（江苏仅有2026年度上下限25127/5025，
             苏人社发〔2026〕30号未明文社平，反推值8375.67 按纪律不写死）
"""
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'cloudfunctions', 'calculate', 'provinces'))

# ⚠️ 正则必须匹配「整行」（含行尾注释），否则插入点落在 "," 之后会把原行注释抢到新行末尾
# （2026-10-09 浙江 PROV_BASE 踩过：原行自带注释 ⇒ 变成 "2026: 8537, //新注释 //原注释"）
TASKS = [
    # (文件, 定位正则「整行：年份 值 + 可选注释」, 插入行内容)
    (
        'zhejiang.js',
        r'(\n(\s+)2025: 8432\.83,[^\n]*)',
        '2026: 8537,  // 浙人社发〔2026〕52号：2025年度非私营和私营单位加权平均工资102446元=8537元/月（2026年度执行）',
    ),
    (
        'zhejiang.js',
        r'(\n(\s+)2025: 8433,[^\n]*)',
        '2026: 8537,  // 浙江已并轨：2026年计发基数=2025年度加权平均工资8537元/月（浙人社发〔2026〕52号）',
    ),
    (
        'hubei.js',
        r'(\n(\s+)2025: 7496,[^\n]*)',
        '2026: 7587,  // 鄂人社发〔2026〕29号：2026社保年度缴费基数月标准7587元（上限22761/下限4552）=2025统计年全口径社平',
    ),
    (
        'guangdong.js',
        r'(\n(\s+)2025: 9183,[^\n]*)',
        '2026: 9201,  // 粤人社发〔2026〕24号：2026年机关事业缴费基数上限27603/下限5521 ⇒ 全省全口径社平9201元/月。⚠️文件未明文社平，为上下限反推值(27603÷3)，广州12345答复佐证',
    ),
]


def main():
    ok = skipped = failed = 0
    for fn, pat, newline in TASKS:
        p = os.path.join(ROOT, fn)
        if not os.path.isfile(p):
            print('FAIL 文件不存在:', p)
            failed += 1
            continue
        s = io.open(p, encoding='utf-8', newline='').read()
        matches = list(re.finditer(pat, s))
        if len(matches) != 1:
            print('FAIL 定位不唯一(%d处): %s %s' % (len(matches), fn, pat))
            failed += 1
            continue
        m = matches[0]
        indent = m.group(2)
        # 幂等检查：紧接着的下一行如果已经是 2026 就跳过
        tail = s[m.end():]
        nxt = tail.split('\n')[1] if len(tail.split('\n')) > 1 else ''
        if re.match(r'^\s*2026:', nxt):
            print('SKIP 已存在2026: %s (%s)' % (fn, nxt.strip()[:40]))
            skipped += 1
            continue
        ins = '\n' + indent + newline
        s2 = s[:m.end()] + ins + s[m.end():]
        io.open(p, 'w', encoding='utf-8', newline='').write(s2)
        print('OK  %s  插入: %s' % (fn, newline[:56]))
        ok += 1
    print('\n完成：成功 %d / 跳过 %d / 失败 %d' % (ok, skipped, failed))
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
