#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""极简 Markdown -> 微信公众号兼容 HTML 转换器（内联样式，无需外部 API）。
仅覆盖本项目文章用到的语法：标题/段落/加粗/斜体/链接/表格/引用/有序无序列表/分割线。"""
import sys, re, html

def inline(text: str) -> str:
    text = html.escape(text, quote=False)
    # 加粗 **x** 或 __x__
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)
    # 斜体 *x* 或 _x_
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)\*(?!\*)', r'<em>\1</em>', text)
    # 链接 [t](u)
    text = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<a href="\1">\2</a>', text)
    text = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<a href="\2">\1</a>', text)
    return text

def parse_table(lines):
    # 过滤分隔行（|---|），取表头与数据
    rows = []
    for ln in lines:
        if re.fullmatch(r'\s*\|[\s:\-|]+\|\s*', ln.strip()):
            continue
        cells = [c.strip() for c in ln.strip().strip('|').split('|')]
        rows.append(cells)
    if not rows:
        return ''
    # rows[0] 表头, rows[1:] 数据
    out = ['<table style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.6;margin:12px 0;">']
    head = rows[0]
    out.append('<thead><tr>')
    for c in head:
        out.append(f'<th style="border:1px solid #ddd;padding:6px 8px;text-align:center;background:#f5f5f5;font-weight:bold;">{inline(c)}</th>')
    out.append('</tr></thead><tbody>')
    for r in rows[1:]:
        out.append('<tr>')
        for c in r:
            out.append(f'<td style="border:1px solid #ddd;padding:6px 8px;text-align:center;">{inline(c)}</td>')
        out.append('</tr>')
    out.append('</tbody></table>')
    return '\n'.join(out)

def convert(md: str) -> str:
    lines = md.split('\n')
    out = []
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        s = ln.strip()
        if s == '':
            i += 1; continue
        if s == '---':
            out.append('<hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;">')
            i += 1; continue
        if s.startswith('# '):
            out.append(f'<h1 style="font-size:20px;font-weight:bold;color:#1a1a1a;border-bottom:1px solid #eee;padding-bottom:6px;margin:20px 0 10px;">{inline(s[2:])}</h1>')
            i += 1; continue
        if s.startswith('## '):
            out.append(f'<h2 style="font-size:18px;font-weight:bold;color:#2c3e50;margin:18px 0 8px;">{inline(s[3:])}</h2>')
            i += 1; continue
        if s.startswith('### '):
            out.append(f'<h3 style="font-size:16px;font-weight:bold;color:#34495e;margin:14px 0 6px;">{inline(s[4:])}</h3>')
            i += 1; continue
        if s.startswith('> '):
            # 合并连续引用
            buf = []
            while i < n and lines[i].strip().startswith('> '):
                buf.append(lines[i].strip()[2:])
                i += 1
            txt = '<br>'.join(inline(b) for b in buf)
            out.append(f'<blockquote style="border-left:4px solid #d0d0d0;padding:8px 12px;color:#6b6b6b;background:#f7f7f7;margin:12px 0;font-size:15px;line-height:1.7;">{txt}</blockquote>')
            continue
        if s.startswith('|') and s.endswith('|'):
            # 收集连续表格行
            buf = []
            while i < n and lines[i].strip().startswith('|'):
                buf.append(lines[i]); i += 1
            # 过滤纯分隔行
            buf = [b for b in buf if not re.fullmatch(r'\s*\|[\s:\-|]+\|\s*', b)]
            out.append(parse_table(buf))
            continue
        if re.match(r'^\d+\.\s', s):
            buf = []
            while i < n and re.match(r'^\d+\.\s', lines[i].strip()):
                buf.append(re.sub(r'^\d+\.\s', '', lines[i].strip())); i += 1
            out.append('<ol style="padding-left:22px;margin:10px 0;font-size:16px;line-height:1.8;color:#3f3f3f;">' +
                       ''.join(f'<li style="margin:4px 0;">{inline(b)}</li>' for b in buf) + '</ol>')
            continue
        if s.startswith('- ') or s.startswith('* '):
            buf = []
            while i < n and (lines[i].strip().startswith('- ') or lines[i].strip().startswith('* ')):
                buf.append(re.sub(r'^[-*]\s', '', lines[i].strip())); i += 1
            out.append('<ul style="padding-left:22px;margin:10px 0;font-size:16px;line-height:1.8;color:#3f3f3f;">' +
                       ''.join(f'<li style="margin:4px 0;">{inline(b)}</li>' for b in buf) + '</ul>')
            continue
        # 普通段落
        out.append(f'<p style="font-size:16px;line-height:1.8;color:#3f3f3f;margin:10px 0;letter-spacing:0.3px;">{inline(s)}</p>')
        i += 1
    return '\n'.join(out)

def main():
    if len(sys.argv) < 3:
        print("usage: md2wx_local.py input.md output.html"); sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        md = f.read()
    body = convert(md)
    html_doc = f'''<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<section style="font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;max-width:680px;margin:0 auto;padding:12px;">
{body}
</section>
</body>
</html>'''
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        f.write(html_doc)
    print("OK", sys.argv[2], len(html_doc), "bytes")

if __name__ == '__main__':
    main()
