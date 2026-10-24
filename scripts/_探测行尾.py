# -*- coding: utf-8 -*-
"""探测本次被订正脚本改过的文件，其 HEAD 版本的行尾类型（CRLF / LF / 混合）"""
import subprocess

FILES = [
    'CONTEXT-CARD.md', 'README.md',
    'cloudfunctions/calculate/pension-engine.js',
    'cloudfunctions/calculate/provinces-data.js',
    'cloudfunctions/calculate/provinces/jilin.js',
    'cloudfunctions/calculate/provinces/sichuan.js',
    'cloudfunctions/generateReportImage/report-render.js',
    'docs/js/pension-engine-browser.js', 'docs/js/pension-engine.js',
    'docs/网页版/js/pension-engine-browser.js',
    'engine.js', 'engine/pension-engine.js',
    'miniprogram/pages/report/report-template.js',
    'miniprogram/pages/report/report.wxml',
    'provinces-bundle.js',
    'scripts/_export_cheatsheet.js', 'scripts/_verify_article.js',
    'scripts/_verify_delay.js', 'scripts/_verify_minyears.js',
    'scripts/_verify_stop15.js', 'scripts/_verify_years.js',
    'scripts/calc_matrix_start22.js', 'scripts/cohort.js',
    'scripts/solve_threshold.js', 'tests/test-engine.js',
    'web/engine.js', 'web/provinces-bundle.js',
    'docs/07-归档/v2.0-完成报告-20260625.md',
    'docs/07-归档/上线准备清单-20260626.md',
    'docs/07-归档/完整总结-v1.0.5-v2.0-20260626.md',
    'docs/99-决策日志/P3-女工人延迟退休修复方案（2026-09-12）.md',
    'docs/99-决策日志/延迟退休配置归属核查（2026-09-12）.md',
    'docs/99-决策日志/引擎延迟退休缺陷修复记录（2026-09-12）.md',
]

res = {'CRLF': [], 'LF': [], 'MIX': []}
for f in FILES:
    h = subprocess.run(['git', 'show', 'HEAD:' + f], capture_output=True).stdout
    cur = open(f, 'rb').read()
    hl = h.count(b'\n')
    hc = h.count(b'\r\n')
    cl = cur.count(b'\n')
    cc = cur.count(b'\r\n')
    if hl == 0:
        kind = 'LF'
    elif hc / hl > 0.95:
        kind = 'CRLF'
    elif hc / hl < 0.05:
        kind = 'LF'
    else:
        kind = 'MIX'
    res[kind].append((f, hl, hc, cl, cc))

for k in ('CRLF', 'LF', 'MIX'):
    print('--- %s (%d)' % (k, len(res[k])))
    for f, hl, hc, cl, cc in res[k]:
        print('   %-56s HEAD CRLF %d/%d   当前 CRLF %d/%d' % (f[:56], hc, hl, cc, cl))
