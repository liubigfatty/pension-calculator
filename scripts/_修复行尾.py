# -*- coding: utf-8 -*-
"""
修复 2026-10-21 文号订正脚本造成的行尾漂移。

事故原因：`_订正_引擎文号_20261021.py` 用文本模式读取（universal newlines 把 CRLF 吃成 LF）
再以 newline='' 写回 ⇒ CRLF 文件被整体改成 LF，git diff 出现数千行噪声。

修复方式（纯字节操作，不动内容）：
  - HEAD 版本为「纯 CRLF」的文件 ⇒ 当前内容统一转回 CRLF（精确逆操作）
  - HEAD 版本为「纯 LF」的文件 ⇒ 无需处理
  - 混合行尾文件 ⇒ 不在此处理，交由 build 脚本重建
"""
FILES = [
    'cloudfunctions/calculate/pension-engine.js',
    'docs/js/pension-engine-browser.js',
    'docs/js/pension-engine.js',
    'docs/网页版/js/pension-engine-browser.js',
    'engine/pension-engine.js',
    'scripts/_verify_minyears.js',
    'scripts/_verify_stop15.js',
    'scripts/_verify_years.js',
    'tests/test-engine.js',
    'web/engine.js',
]

for f in FILES:
    b = open(f, 'rb').read()
    if b.count(b'\r\n') > 0:
        print('跳过（已是 CRLF）:', f)
        continue
    # 统一 LF -> CRLF：先把可能残留的 \r 剥掉，再转换
    b = b.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
    open(f, 'wb').write(b)
    print('已转回 CRLF:', f)
