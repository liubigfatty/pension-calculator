# -*- coding: utf-8 -*-
"""
补齐 provinces/*.js 的 avg_salary_history 首端年份。

背景：_normalize_salary_semantics.py 的 process_js 只做「年份 key +1」，
未实现 process_json 里的「首端兜底」（new[minYear] = old[minYear]），
导致 .js 首端比 .json 少一年，早期参保年份（如广西 1995）取不到社平。

本脚本按 .json（已含首端）为准，在 .js 的 AVG_SALARY_HISTORY 块中补齐缺失的首年。
支持扁平 {year:val} 与嵌套（广东 prov/shenzhen/深圳）两种结构。
幂等：首端年份已存在则跳过。
"""
import io, os, re, json, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROV = os.path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces')
KEY_RE = re.compile(r'^\s*("?)(\d{4})("?)\s*:')
NOTE = '   // 首端兜底：早于数据起始年的参保年份取最早已知值（SALARY_SEMANTICS_V2）'


def find_block(text, start_idx):
    depth, i, in_str = 0, start_idx, None
    while i < len(text):
        c = text[i]
        if in_str:
            if c == '\\':
                i += 2; continue
            if c == in_str:
                in_str = None
        elif c in '"\'`':
            in_str = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def years_in(lines):
    return [int(m.group(2)) for m in (KEY_RE.match(l) for l in lines) if m]


def process(code):
    jf = os.path.join(PROV, code + '.json')
    sf = os.path.join(PROV, code + '.js')
    if not (os.path.exists(jf) and os.path.exists(sf)):
        return 'missing'
    data = json.loads(io.open(jf, encoding='utf-8').read())
    hist = data.get('avg_salary_history')
    if not isinstance(hist, dict) or not hist:
        return 'no-hist'
    nested = all(isinstance(v, dict) for v in hist.values())

    text = io.open(sf, encoding='utf-8').read()
    m = re.search(r'const\s+AVG_SALARY_HISTORY\s*=\s*\{', text)
    if not m:
        return 'no-const'
    open_idx = m.end() - 1
    close_idx = find_block(text, open_idx)
    if close_idx < 0:
        return 'block-error'

    if nested:
        # 逐子集补齐：定位 "<sub>: {" 之后的第一个年份行
        inserts = []   # (插入行下标, 待插入文本)
        lines = text[open_idx:close_idx + 1].split('\n')
        for sub, subhist in hist.items():
            want = min(int(y) for y in subhist)
            val = subhist[str(want)]
            # 找到 "sub: {" 所在行
            start = None
            for i, ln in enumerate(lines):
                if re.match(r'^\s*["\']?%s["\']?\s*:\s*\{' % re.escape(sub), ln):
                    start = i
                    break
            if start is None:
                continue
            # 该子集内已有年份
            sub_lines, j = [], start + 1
            depth = 1
            while j < len(lines) and depth > 0:
                depth += lines[j].count('{') - lines[j].count('}')
                sub_lines.append(lines[j])
                j += 1
            have = years_in(sub_lines)
            if have and want in have:
                continue
            indent = re.match(r'^(\s*)', sub_lines[0]).group(1) if sub_lines else '    '
            inserts.append((start + 1, '%s%s: %s,%s' % (indent, want, val, NOTE)))
        if not inserts:
            return 'ok(nochange)'
        for pos, txt in sorted(inserts, key=lambda x: -x[0]):
            lines.insert(pos, txt)
        new_block = '\n'.join(lines)
    else:
        want = min(int(y) for y in hist)
        val = hist[str(want)]
        lines = text[open_idx:close_idx + 1].split('\n')
        have = years_in(lines)
        if want in have:
            return 'ok(nochange)'
        # 插到第一个年份行之前
        pos = next((i for i, ln in enumerate(lines) if KEY_RE.match(ln)), None)
        if pos is None:
            return 'no-yearline'
        indent = re.match(r'^(\s*)', lines[pos]).group(1)
        lines.insert(pos, '%s%s: %s,%s' % (indent, want, val, NOTE))
        new_block = '\n'.join(lines)

    new_text = text[:open_idx] + new_block + text[close_idx + 1:]
    io.open(sf, 'w', encoding='utf-8', newline='\n').write(new_text)
    return 'fixed'


def main():
    codes = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(PROV, '*.json')))
    n_fixed = 0
    for c in codes:
        r = process(c)
        if r == 'fixed':
            n_fixed += 1
            print('  修复 %s' % c)
        elif r not in ('ok(nochange)',):
            print('  ⚠️ %s: %s' % (c, r))
    print('\n补齐首端 %d 省' % n_fixed)


if __name__ == '__main__':
    main()
