# -*- coding: utf-8 -*-
"""
给引擎副本打「个账记账比例·全国默认段」补丁（2026-10-30）

真相源：cloudfunctions/calculate/pension-engine.js（已改好）
本脚本把同样的两处改动同步到其余副本，二进制读写、各自保留原行尾。

改动 1：在 `const HLJ_SCHEDULE = {...}` 行之后插入 DEFAULT_ACCOUNT_SCHEDULE 定义
改动 2：getAccountRate 返回值改为「有专属表→表内按表/表外 8%；无专属表→全国默认段」

用法： python scripts/_patch_account_rate_default.py [--apply]
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TARGETS = [
    'engine/pension-engine.js',
    'docs/js/pension-engine.js',
    'docs/js/pension-engine-browser.js',
    'web/engine.js',
    'engine.js',
    'docs/网页版/js/pension-engine-browser.js',
]

def old_rate_body(eol):
    return eol.join([
        b"  const sch = code && ACCOUNT_RATE_SCHEDULE[code]",
        b"  if (sch && sch[year] != null) return sch[year]",
        b"  return 0.08",
        b"",
    ])


def make_new_body(eol, indent):
    return eol.join([
        indent + b"const sch = code && ACCOUNT_RATE_SCHEDULE[code]",
        indent + u"if (sch) return (sch[year] != null) ? sch[year] : 0.08   // 有专属表 ⇒ 表内年份按表、表外按 8%".encode('utf-8'),
        indent + b"const d = DEFAULT_ACCOUNT_SCHEDULE[year]",
        indent + u"return (d != null) ? d : 0.08                            // 无专属表 ⇒ 走全国默认段".encode('utf-8'),
        b"",
    ])


DEFAULT_LINES = [
    u"// 全国默认段（未单列的 28 省）：国发〔1997〕26号 四 → 11%；国发〔2005〕38号 六 → 2006-01-01 起 8%".encode('utf-8'),
    u"// ⚠️ 1998 年之前各省建账早晚不一且缺明文，一律不填（维持 8% 兜底）".encode('utf-8'),
    b"const DEFAULT_ACCOUNT_SCHEDULE = { 1998: 0.11, 1999: 0.11, 2000: 0.11, 2001: 0.11, 2002: 0.11, 2003: 0.11, 2004: 0.11, 2005: 0.11 }",
]


def patch(rel, apply):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        return 'MISSING'
    raw = open(p, 'rb').read()
    eol = b'\r\n' if raw.count(b'\r\n') > (raw.count(b'\n') - raw.count(b'\r\n')) else b'\n'

    if b'DEFAULT_ACCOUNT_SCHEDULE' in raw:
        return 'ALREADY'

    # --- 改动 1：插入默认段定义 ---
    lines = raw.split(eol)
    idx = None
    for i, ln in enumerate(lines):
        if ln.lstrip().startswith(b'const HLJ_SCHEDULE'):
            idx = i
            break
    if idx is None:
        return 'NO-HLJ-ANCHOR'

    # 取缩进
    decl = lines[idx]
    indent = decl[:len(decl) - len(decl.lstrip())]

    ins = [indent + x for x in DEFAULT_LINES]
    out = lines[:idx + 1] + ins + [b''] + lines[idx + 1:]
    buf = eol.join(out)

    # --- 改动 2：替换 getAccountRate 返回值 ---
    ob = old_rate_body(eol)
    if ob not in buf:
        return 'NO-RATE-BODY'
    buf = buf.replace(ob, make_new_body(eol, indent), 1)

    if apply:
        open(p, 'wb').write(buf)
    return 'OK'


if __name__ == '__main__':
    do = '--apply' in sys.argv
    print(('[APPLY] ' if do else '[DRY] ') + '真相源: cloudfunctions/calculate/pension-engine.js（已改）')
    for t in TARGETS:
        r = patch(t, do)
        print('  %-52s %s' % (t, r))
    if not do:
        print('\n（dry-run，未写入。加 --apply 生效）')
