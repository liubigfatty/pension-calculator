# -*- coding: utf-8 -*-
"""
统一 avg_salary_history 的年度语义为「执行年」：
    [Y] = Y 年度（Y-01-01 ~ Y-12-31）实际执行的社保缴费基数所依据的全口径月社平
    ⇔ [Y] = Y-1 统计年社平

背景（2026-09-20 审计）：
  原库 29 省为「统计年」语义（[Y]=Y统计年=Y+1年度执行），湖南/西藏为「执行年」语义，
  且 2026-09 入库的 [2026] 一律按执行年写入 —— 同一数组内两套语义打架，
  导致 22 省出现「[2026] < [2025]」的假回落，并使引擎缴费基数整体错配一年。

变换规则：
  · 统计年语义省（29）：new[Y+1] = old[Y]（Y ≤ 2024）；new[2026] = 2026年度官方值（已核实22省）
  · 执行年语义省（hunan/xizang，2）：原样不动
  · 2026 年度未公布的 9 省：不写 [2026]，留空由引擎 inferGrowthRate 外推
  · 丢弃 old[2025]（多为外推值，且已被 2026 年度官方值取代）
  · 首端保留：new[minYear] = old[minYear]，避免早期参保年份无值（calc-index 无 fallback）

幂等：写入标记 SALARY_SEMANTICS_V2，已转换的文件跳过。
"""
import io, os, re, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROV_DIR = os.path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces')
MARKER = 'SALARY_SEMANTICS_V2'

# ── 2026 年度已核实官方值（22 省，docs/06-数据 锚点表第四节）──
ANCHOR_2026 = {
    'beijing': 12116, 'tianjin': 8634, 'hebei': 6794, 'shanxi': 7073, 'neimenggu': 8430,
    'liaoning': 7555, 'jilin': 7481.5, 'heilongjiang': 7705, 'shanghai': 12577, 'anhui': 7257,
    'fujian': 7631, 'shandong': 7621, 'hunan': 6843, 'chongqing': 7588.33, 'sichuan': 7831,
    'guizhou': 7376.75, 'yunnan': 7339, 'xizang': 11954, 'shaanxi': 7895, 'gansu': 7542,
    'ningxia': 8371, 'xinjiang': 8744,
}
# 已是执行年语义，不做右移
NO_SHIFT = {'hunan', 'xizang'}

KEY_RE = re.compile(r'^(\s*)("?)(\d{4})("?)(\s*:)')


def transform_flat(hist):
    """扁平 {year: value} → 右移后的新 dict"""
    years = sorted(int(y) for y in hist.keys())
    if not years:
        return hist, []
    new = {}
    log = []
    min_y = years[0]
    for y in years:
        v = hist[str(y)] if str(y) in hist else hist[y]
        if y <= 2024:
            new[y + 1] = v
        # y == 2025 的外推值丢弃；y == 2026 由 ANCHOR 覆盖
    # 首端兜底：保留最早年份原值
    new[min_y] = hist[str(min_y)] if str(min_y) in hist else hist[min_y]
    return new, log


def transform_nested(node):
    """广东类嵌套 {prov:{...}, shenzhen:{...}}"""
    out = {}
    for k, sub in node.items():
        if isinstance(sub, dict):
            out[k], _ = transform_flat(sub)
        else:
            out[k] = sub
    return out


def is_nested(hist):
    return bool(hist) and all(isinstance(v, dict) for v in hist.values())


# ────────────────────────── 1. 处理 .json ──────────────────────────
def process_json(code):
    path = os.path.join(PROV_DIR, code + '.json')
    if not os.path.exists(path):
        return None
    raw = io.open(path, encoding='utf-8').read()
    if MARKER in raw:
        return 'skip'
    data = json.loads(raw)
    key = 'avg_salary_history' if 'avg_salary_history' in data else ('AVG_SALARY_HISTORY' if 'AVG_SALARY_HISTORY' in data else None)
    if key is None:
        return None
    old = data[key]
    nested = is_nested(old)
    if code in NO_SHIFT:
        new = old
    elif nested:
        new = transform_nested(old)
    else:
        new, _ = transform_flat(old)
        a26 = ANCHOR_2026.get(code)
        if a26 is not None:
            new[2026] = a26
    if nested:
        # 嵌套（广东：prov/shenzhen/深圳）→ 各子集内部按年份排序，key 保持字符串
        data[key] = {k: dict(sorted(((int(y), v) for y, v in sub.items()), key=lambda x: x[0]))
                     for k, sub in new.items()}
    else:
        data[key] = dict(sorted(((int(y), v) for y, v in new.items()), key=lambda x: x[0]))
    data['_salary_semantics'] = 'execution_year'   # [Y] = Y 年度执行社平
    data['_salary_semantics_note'] = 'MARKER_V2: [Y]=Y年度执行=Y-1统计年；2026年度未公布省留空走外推'
    out = json.dumps(data, ensure_ascii=False, indent=2)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(out + '\n')
    return 'ok'


# ────────────────────────── 2. 处理 .js 常量块 ──────────────────────────
def find_block(text, start_idx):
    """从 start_idx（指向 '{'）做括号计数，返回匹配的 '}' 下标"""
    depth = 0
    i = start_idx
    in_str = None
    while i < len(text):
        c = text[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
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


def process_js(code):
    path = os.path.join(PROV_DIR, code + '.js')
    if not os.path.exists(path):
        return None
    text = io.open(path, encoding='utf-8').read()
    if MARKER in text:
        return 'skip'
    m = re.search(r'const\s+AVG_SALARY_HISTORY\s*=\s*\{', text)
    if not m:
        return 'no-const'
    open_idx = m.end() - 1
    close_idx = find_block(text, open_idx)
    if close_idx < 0:
        return 'block-error'
    block = text[open_idx:close_idx + 1]
    lines = block.split('\n')
    out_lines = []
    stats = {'shift': 0, 'drop': 0, 'keep26': 0}
    nested = code in NO_SHIFT is False and '{' in '\n'.join(lines[1:-1])
    for ln in lines:
        mm = KEY_RE.match(ln)
        if mm and code not in NO_SHIFT:
            y = int(mm.group(3))
            if y <= 2024:
                out_lines.append('%s%s%d%s%s' % (mm.group(1), mm.group(2), y + 1, mm.group(4), mm.group(5)) + ln[mm.end():])
                stats['shift'] += 1
            elif y == 2025:
                # 外推值，丢弃（注释留存备查）
                out_lines.append('%s// [V2已删] %s' % (mm.group(1), ln.strip()))
                stats['drop'] += 1
            else:  # 2026：官方值，保留不动
                out_lines.append(ln)
                stats['keep26'] += 1
        else:
            out_lines.append(ln)
    new_block = '\n'.join(out_lines)
    new_text = text[:open_idx] + new_block + text[close_idx + 1:]
    # 写入语义标记
    marker_line = '// %s: avg_salary_history[Y] = Y 年度执行社平（= Y-1 统计年），2026-09-20 统一\n' % MARKER
    new_text = new_text.replace(m.group(0), marker_line + m.group(0), 1)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(new_text)
    return stats


def main():
    codes = sorted(set(
        f[:-5] for f in os.listdir(PROV_DIR)
        if f.endswith('.json')
    ))
    report = []
    for code in codes:
        rj = process_json(code)
        rjs = process_js(code)
        report.append((code, rj, rjs))
    print('%-12s %-8s %s' % ('省份', 'json', 'js'))
    for code, rj, rjs in report:
        print('%-12s %-8s %s' % (code, rj, rjs))
    ok = sum(1 for _, a, b in report if a == 'ok' and isinstance(b, dict))
    skip = sum(1 for _, a, b in report if a == 'skip')
    print('\n转换 %d 省，跳过(已转换) %d 省' % (ok, skip))


if __name__ == '__main__':
    main()
