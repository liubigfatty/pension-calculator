# -*- coding: utf-8 -*-
"""
订正引擎/小程序代码里残留的错误政策文号（2026-10-21）

背景：2026-10-20 政策文件库建成后查出 4 处规模性引用错误并订正了公众号语料，
但引擎代码里的注释与「用户可见的报告免责声明」仍写着错误文号：
  ① 国办发〔2025〕5号  → 实为《国务院办公厅关于推动成品油流通高质量发展的意见》
                          ✅ 正确＝《国务院关于渐进式延迟法定退休年龄的办法》（2025-01-01 施行）
  ② 吉政发〔1998〕28号 → 该文号不存在
                          ✅ 正确＝吉政办明电〔2015〕11号（吉林长缴增发）

本脚本**只做纯文本替换**（不改任何计算逻辑），且跳过历史快照目录。
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 历史快照 / 备份 / 下载产物：按纪律不动
EXCLUDE_DIR = ('_backup_', '_tmp_download', '_verify_dl', 'node_modules', '.git', 'reports')

# 历史记录类文档：不动正文，由调用方单独加勘误注记
SKIP_FILES = {'CHANGELOG.md'}

EXTS = ('.js', '.json', '.md', '.wxml')

# ⚠️ 顺序敏感：先替换「用户可见的完整句子」，再替换通用文号
#    （UI 句子里含「国办发〔2025〕5号」，若先跑通用规则会把句子拆坏）
UI_OLD = '本报告依据国务院渐进式延迟退休政策（国办发〔2025〕5号）及'
UI_NEW = '本报告依据《国务院关于渐进式延迟法定退休年龄的办法》（2025年1月1日施行）及'

RULES = [
    ('国办发〔2025〕5号', '《国务院关于渐进式延迟法定退休年龄的办法》'),
    ('吉政发〔1998〕28号', '吉政办明电〔2015〕11号'),
]


def should_skip(path):
    rel = os.path.relpath(path, ROOT)
    parts = rel.split(os.sep)
    for p in parts[:-1]:
        if p.startswith(EXCLUDE_DIR):
            return True
    return parts[-1] in SKIP_FILES


def main():
    changed = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if not d.startswith(EXCLUDE_DIR) and d != 'node_modules' and d != '.git']
        for fn in filenames:
            if not fn.endswith(EXTS):
                continue
            path = os.path.join(dirpath, fn)
            if should_skip(path):
                continue
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    t = f.read()
            except Exception:
                continue
            orig = t
            if UI_OLD in t:
                t = t.replace(UI_OLD, UI_NEW)
            n = 0
            for a, b in RULES:
                c = t.count(a)
                if c:
                    t = t.replace(a, b)
                    n += c
            if t != orig:
                # 纯文本写回：保留原有行尾（newline='' 避免 LF→CRLF）
                with open(path, 'w', encoding='utf-8', newline='') as f:
                    f.write(t)
                changed.append((os.path.relpath(path, ROOT), n + (1 if UI_OLD in orig else 0)))

    print('订正文件数：%d' % len(changed))
    for p, n in sorted(changed):
        print('  %-58s %d 处' % (p, n))


if __name__ == '__main__':
    main()
