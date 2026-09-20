# -*- coding: utf-8 -*-
"""
把「2025 年统计口径全口径城镇单位就业人员平均工资」写入引擎。

口径说明（务必遵守）：
  引擎 AVG_SALARY_HISTORY[Y] = **Y 年度执行的社平**（= Y-1 自然年统计口径社平，元/月）。
  验证依据：
    - 湖南 2025 年度缴费基准值 6787 = 引擎 [2025]（2026-07-24 湘文件：2025 年统计口径 6843 用于 2026 年度）
    - 陕西 2025 年度 7750（93003/12）= 引擎 [2024]；2025 年统计口径 7895 用于 2026 年度
    - 吉林 吉人社联〔2026〕74 号：2025 年统计口径 7481.5，用于 2026-07 起新缴费周期
  ⇒ 本批「2025 自然年统计口径」数据一律写入 **[2026]**。

数据来源：各省人社厅/税务局 2026 年发布的正式文件（文号见 DATA 备注）。
"""
import re, os, sys, json, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'cloudfunctions', 'calculate', 'provinces')

# province_key: (2025年统计口径社平元/月, 2026年度缴费基数下限, 上限, 文号, 发布日期)
DATA = {
    'beijing':      (12116,   7270,    36348,    '京人社 2026 年缴费基数公告（2026-07 起执行）', '2026-07'),
    'tianjin':      (8634,    5180,    25902,    '津人社 2026 年度缴费基数', '2026'),
    'hebei':        (6794,    4076,    20382,    '冀人社 2026 年度缴费基数', '2026'),
    'shanxi':       (7073,    4244,    21219,    '晋人社厅发〔2026〕27 号', '2026-08-21'),
    'neimenggu':    (8430,    5058,    25290,    '内蒙古 2026 年度职工医保/养老缴费基数', '2026'),
    'liaoning':     (7555,    4533,    22665,    '辽人社 2026 年度缴费基数（2026-08-31 公布）', '2026-08-31'),
    'jilin':        (7481.5,  4488.9,  22444.5,  '吉人社联〔2026〕74 号（89778 元/年）', '2026-09-01'),
    'heilongjiang': (7705,    4623,    23115,    '黑人社 2026 年度缴费基数', '2026'),
    'shanghai':     (12577,   7546,    37731,    '沪人社 2026 年度缴费基数（2026-07 起）', '2026-07'),
    'anhui':        (7257,    4354,    21772,    '皖人社秘〔2026〕113 号', '2026-08-27'),
    'fujian':       (7631,    4579,    22893,    '闽人社 2026 年度职工医保/工伤保险缴费基数', '2026'),
    'shandong':     (7621,    4573,    22863,    '鲁人社字〔2026〕75 号（91452 元/年）', '2026-08-14'),
    'hunan':        (6843,    4106,    20529,    '湘人社 2026 年社保缴费基准值通知', '2026-07-24'),
    'chongqing':    (7588.33, 4553,    22765,    '渝人社规〔2026〕18 号（91059 元/年）', '2026-09-14'),
    'sichuan':      (7831,    4699,    23493,    '川人社 2026 年度缴费基数（2026-09-07 公布）', '2026-09-07'),
    'guizhou':      (7376.75, 4426.05, 22130.25, '黔人社 2026 年度缴费基数', '2026'),
    'yunnan':       (7339,    4403,    22017,    '云人社 2026 年度缴费基数', '2026'),
    'xizang':       (11954,   7172.4,  35862,    '藏人社 2026 年度缴费基数', '2026'),
    'shaanxi':      (7895,    4737,    23685,    '陕人社 2026 年度缴费基数通知', '2026-08-27'),
    'gansu':        (7542,    4526,    22626,    '甘人社 2026 年度缴费基数', '2026'),
    'ningxia':      (8371,    5023,    25113,    '宁人社 2026 年度缴费基数', '2026'),
    'xinjiang':     (8744,    5246,    26231,    '新人社 2026 年度缴费基数', '2026'),
}

# 反推校验：上限/3 与 下限/0.6 应≈社平（容差 1.5 元，取整差异）
def self_check():
    bad = []
    for k, (sal, lo, hi, doc, dt) in DATA.items():
        if abs(hi / 3 - sal) > 1.5:
            bad.append(f'{k}: 上限{hi}/3={hi/3:.2f} vs 社平{sal} 差{abs(hi/3-sal):.2f}')
        if abs(lo / 0.6 - sal) > 1.5:
            bad.append(f'{k}: 下限{lo}/0.6={lo/0.6:.2f} vs 社平{sal} 差{abs(lo/0.6-sal):.2f}')
    return bad


def find_const_name(src):
    m = re.search(r'avg_salary_history:\s*([A-Za-z_][A-Za-z_0-9]*)', src)
    return m.group(1) if m else None


def patch_js(path, value, dry=True):
    """在 AVG_SALARY_HISTORY 常量块内插入 2026 年"""
    s = open(path, encoding='utf-8').read()
    name = find_const_name(s)
    if not name:
        return ('SKIP', '未找到 avg_salary_history 引用常量')
    m = re.search(r'(const\s+' + re.escape(name) + r'\s*=\s*\{)(.*?)(\n\s*\})', s, re.S)
    if not m:
        return ('SKIP', f'未找到 const {name} 定义块')
    body = m.group(2)
    if re.search(r'\b2026\s*:', body):
        return ('SKIP', '已存在 2026，跳过')
    # 找最后一个 "YYYY: 数值" 条目，在其后插入
    ents = list(re.finditer(r'([ \t]*)(\d{4})\s*:\s*([0-9.]+)\s*,?[ \t]*(//[^\n]*)?', body))
    if not ents:
        return ('SKIP', '常量块内无年份条目')
    last = ents[-1]
    indent = last.group(1) or '  '
    newline = f'{last.group(0).rstrip()}'
    if not newline.endswith(','):
        newline += ','
    insert = f'\n{indent}2026: {value},   // 2025年统计口径社平（2026年度执行）'
    pos = last.end()
    newbody = body[:pos] + insert + body[pos:]
    news = s[:m.start(2)] + newbody + s[m.end(2):]
    if not dry:
        open(path, 'w', encoding='utf-8').write(news)
    return ('OK', f'{name} ← 2026: {value}')


def patch_json(path, value, lo, hi, dry=True):
    if not os.path.exists(path):
        return ('SKIP', '无 json')
    s = open(path, encoding='utf-8').read()
    d = json.loads(s)
    a = d.get('avg_salary_history') or {}
    if '2026' in a:
        return ('SKIP', 'json 已有 2026')
    a['2026'] = value
    d['avg_salary_history'] = dict(sorted(a.items(), key=lambda x: int(x[0])))
    d.setdefault('notes', {})
    if isinstance(d['notes'], dict):
        d['notes']['contribution_base_2026'] = {'min': lo, 'max': hi}
    if not dry:
        with io.open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
    return ('OK', f'json 2026={value} 基数[{lo}, {hi}]')


if __name__ == '__main__':
    dry = '--apply' not in sys.argv
    print('模式:', 'DRY-RUN（加 --apply 才写入）' if dry else '写入')
    bad = self_check()
    print(f'\n自校验：{len(DATA)} 省，上下限反推不一致 {len(bad)} 项')
    for b in bad:
        print('   ⚠', b)

    print('\n省份           结果   说明')
    ok = skip = 0
    for k, (sal, lo, hi, doc, dt) in sorted(DATA.items()):
        js = os.path.join(SRC, k + '.js')
        if not os.path.exists(js):
            print(f'{k:<14} MISS   js 不存在')
            continue
        st, msg = patch_js(js, sal, dry)
        st2, msg2 = patch_json(os.path.join(SRC, k + '.json'), sal, lo, hi, dry)
        print(f'{k:<14} {st:<6} {msg} | json: {st2}')
        if st == 'OK':
            ok += 1
        else:
            skip += 1
    print(f'\n合计：{ok} 省待写入 / {skip} 省跳过（共 {len(DATA)} 省）')
