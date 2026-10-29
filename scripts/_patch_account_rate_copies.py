#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
把「个人账户分年记账比例」改造同步到引擎副本链。2026-10-30。

真相源已改（cloudfunctions/calculate/pension-engine.js、engine/pension-engine.js），
本脚本把同样的改动打到其余副本，保持各文件自身换行符不变。

⚠️ 铁律：二进制读写（rb → bytes.replace → wb），禁止 json.dump / 文本模式重写。
用法：python scripts/_patch_account_rate_copies.py [--apply]
"""
import io
import os
import sys

APPLY = '--apply' in sys.argv

TARGETS = [
    'docs/js/pension-engine.js',
    'docs/js/pension-engine-browser.js',
    u'docs/网页版/js/pension-engine-browser.js',
    'web/engine.js',
    'engine.js',
]

ANCHOR = b'function getAccRate(year, config) {'

BLOCK_LF = u'''/**
 * 个人账户**记账比例**（不是缴费比例）——按省、按年。2026-10-30 新增。
 *
 * 全国基准：1998-01-01 起按本人缴费工资 **11%** 记账（国发〔1997〕26号）。
 * 规模 11%→8% 的起点全国分三批：
 *   ① 辽宁  2001-07-01  辽政发〔2001〕24号 二/四（国函〔2001〕辽宁试点方案）
 *   ② 吉林、黑龙江 2004-01-01  吉政发〔2004〕28号 二（国函〔2004〕35号）；国函〔2004〕36号（黑）
 *   ③ 其余 28 省 2006-01-01  国发〔2005〕38号 六
 *
 * ⚠️ 年中分界的年份按**年度加权平均**填（各省滚存按年走，年内各月基数相同期等价）：
 *    吉林 1998 = (6×16% + 6×11%)/12 = 13.5%；辽宁 2001 = (6×11% + 6×8%)/12 = 9.5%
 *
 * ⚠️ 1998 年之前各省不一（辽 12%、吉 16%、多数省 12%），**只填有省级明文的三省**，
 *    其余省 1998 前维持 8%（未查全，不臆断）。
 */
const HLJ_SCHEDULE = { 1998: 0.11, 1999: 0.11, 2000: 0.11, 2001: 0.11, 2002: 0.11, 2003: 0.11 }

const ACCOUNT_RATE_SCHEDULE = {
  // 吉政发〔1998〕22号 四(一)3：1995-07-01~1998-06-30 记 16%；1998-07-01 起 11%
  // 吉政发〔2004〕28号 二：2004-01-01 起 8%
  jilin: { 1995: 0.16, 1996: 0.16, 1997: 0.16, 1998: 0.135, 1999: 0.11, 2000: 0.11, 2001: 0.11, 2002: 0.11, 2003: 0.11 },
  // 辽宁省人社厅《辽宁试点前后基本养老保险个人账户有什么不同?》：1996-01-01~1997-12-31 记 12%；1998-01 起 11%
  // 辽政发〔2001〕24号：2001-07-01 起 8%
  liaoning: { 1996: 0.12, 1997: 0.12, 1998: 0.11, 1999: 0.11, 2000: 0.11, 2001: 0.095 },
  // 国函〔2004〕36号：2004-01-01 起 8%（1996-1997 段黑龙江省级比例未查到明文，不填）
  // ⚠️ 黑龙江 config.province 的值是 'hlj'，两个 key 都要有
  heilongjiang: HLJ_SCHEDULE,
  hlj: HLJ_SCHEDULE
}

function getAccountRate(year, config, provinceCode) {
  const code = provinceCode || (config && (config.province || config.code))
  const sch = code && ACCOUNT_RATE_SCHEDULE[code]
  if (sch && sch[year] != null) return sch[year]
  return 0.08
}

'''

REPLACES = [
    (b'baseY * avgIndex * 0.08',
     b'baseY * avgIndex * getAccountRate(fYear, config)'),
    (b'baseYear * avgIndex * 0.08 * 12',
     b'baseYear * avgIndex * getAccountRate(y, config) * 12'),
    (b'baseRetire * avgIndex * 0.08',
     b'baseRetire * avgIndex * getAccountRate(retireDate.year, config)'),
]


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for rel in TARGETS:
        p = os.path.join(root, rel)
        if not os.path.exists(p):
            print('  SKIP (不存在) %s' % rel)
            continue
        raw = open(p, 'rb').read()
        crlf = raw.count(b'\r\n')
        lf = raw.count(b'\n') - crlf
        eol = b'\r\n' if crlf > lf else b'\n'

        if b'ACCOUNT_RATE_SCHEDULE' in raw:
            print('  OK  已打过补丁      %-44s (%s)' % (rel, 'CRLF' if eol == b'\r\n' else 'LF'))
            continue

        n_anchor = raw.count(ANCHOR)
        n_rep = sum(raw.count(a) for a, _ in REPLACES)
        if n_anchor != 1 or n_rep != 3:
            print('  ❌ 锚点异常 %s：getAccRate=%d，写死点=%d（期望 1 / 3）' % (rel, n_anchor, n_rep))
            continue

        block = BLOCK_LF.replace(u'\n', eol.decode('ascii')).encode('utf-8')
        out = raw.replace(ANCHOR, block + ANCHOR, 1)
        for a, b in REPLACES:
            out = out.replace(a, b)

        print('  %s %-44s 锚点1 替换3  (%s, %d→%d 字节)'
              % ('PATCH' if APPLY else 'DRY  ', rel,
                 'CRLF' if eol == b'\r\n' else 'LF', len(raw), len(out)))
        if APPLY:
            open(p, 'wb').write(out)

    print()
    print('模式：%s' % ('已应用' if APPLY else 'DRY-RUN（加 --apply 才写盘）'))


if __name__ == '__main__':
    main()
