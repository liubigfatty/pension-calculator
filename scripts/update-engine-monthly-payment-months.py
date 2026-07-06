"""
引擎计发月数表更新脚本
替换DEFAULT_MONTHLY_PAYMENT_MONTHS + 更新getRetireMonths为月精度
"""
import re, os, glob

BASE = r'C:\Users\14041\AppData\Roaming\winclaw\.openclaw\workspace\养老金计算平台'

# ===== 官方精确到月的计发月数表（月总数key） =====
ROWS = {
    50: [195, 194.6, 194.2, 193.8, 193.3, 192.9, 192.5, 192.1, 191.7, 191.3, 190.8, 190.4],
    51: [190, 189.6, 189.2, 188.8, 188.3, 187.9, 187.5, 187.1, 186.7, 186.3, 185.8, 185.4],
    52: [185, 184.6, 184.2, 183.8, 183.3, 182.9, 182.5, 182.1, 181.7, 181.3, 180.8, 180.4],
    53: [180, 179.6, 179.2, 178.8, 178.3, 177.9, 177.5, 177.1, 176.7, 176.3, 175.8, 175.4],
    54: [175, 174.6, 174.2, 173.8, 173.3, 172.9, 172.5, 172.1, 171.7, 171.3, 170.8, 170.4],
    55: [170, 169.6, 169.2, 168.8, 168.3, 167.9, 167.5, 167.1, 166.7, 166.3, 165.8, 165.4],
    56: [164, 163.5, 163, 162.5, 162, 161.5, 161, 160.5, 160, 159.5, 159, 158.5],
    57: [158, 157.5, 157, 156.5, 156, 155.5, 155, 154.5, 154, 153.5, 153, 152.5],
    58: [152, 151.4, 150.8, 150.3, 149.7, 149.1, 148.5, 147.9, 147.3, 146.8, 146.2, 145.6],
    59: [145, 144.5, 144, 143.5, 143, 142.5, 142, 141.5, 141, 140.5, 140, 139.5],
    60: [139, 138.4, 137.8, 137.3, 136.7, 136.1, 135.5, 134.9, 134.3, 133.8, 133.2, 132.6],
    61: [132, 131.4, 130.8, 130.3, 129.7, 129.1, 128.5, 127.9, 127.3, 126.8, 126.2, 125.6],
    62: [125, 124.3, 123.7, 123, 122.3, 121.7, 121, 120.3, 119.7, 119, 118.3, 117.7],
    63: [117, 116.3, 115.7, 115, 114.3, 113.7, 113, 112.3, 111.7, 111, 110.3, 109.7],
    64: [109, 108.3, 107.7, 107, 106.3, 105.7, 105, 104.3, 103.7, 103, 102.3, 101.7],
    65: [101]
}

# 生成JS代码
table_lines = []
table_lines.append('// 官方计发月数表（精确到月）- 国发〔2005〕38号配套标准')
table_lines.append('// key = 从0岁开始的总月数（如600=50岁0月, 601=50岁1月, ...）')
table_lines.append('const STANDARD_MONTHLY_PAYMENT_MONTHS = {')
for year in range(50, 66):
    vals = ROWS[year]
    for month, val in enumerate(vals):
        key = year * 12 + month
        suffix = ',' if not (year == 65 and month == 0) else ''
        table_lines.append(f'  "{key}": {val}{suffix}')
table_lines.append('}')
TABLE_JS = '\n'.join(table_lines)

# getRetireMonths 新函数体
NEW_FUNC_BODY = '''function getRetireMonths(ageExact, config) {
  const table = config.monthly_payment_months || STANDARD_MONTHLY_PAYMENT_MONTHS
  
  // 将年龄转换为总月数（精确到月），避免浮点问题
  const totalMonths = Math.round(ageExact * 12)
  const key = String(totalMonths)
  
  if (table[key] !== undefined) return table[key]
  
  // 超出50-65岁范围，兜底返回60岁（139个月）
  return 139
}'''

# ===== 遍历所有 engine 文件 =====
engine_files = [
    'engine/pension-engine.js',
    'cloudfunctions/calculate/pension-engine.js',
    'miniprogram/cloud-functions/calculate/pension-engine.js',
    'docs/js/pension-engine.js',
    'pension-engine/js/pension-engine.js',
    'js/pension-engine.js',
]
# Also check docs/js/pension-engine-browser.js and js/pension-engine-browser.js
browser_files = [
    'docs/js/pension-engine-browser.js',
    'js/pension-engine-browser.js',
    'pension-engine/js/pension-engine-browser.js',
]

# 先处理主引擎文件
for rel_path in engine_files + browser_files:
    full_path = os.path.join(BASE, rel_path)
    if not os.path.isfile(full_path):
        print(f'SKIP (not found): {rel_path}')
        continue
    
    content = open(full_path, 'r', encoding='utf-8').read()
    original = content
    
    # Step 1: 替换 DEFAULT_MONTHLY_PAYMENT_MONTHS 定义
    pattern_old_table = r'// 国家标准计发月数表.*?^\}'
    replacement = TABLE_JS
    content = re.sub(pattern_old_table, replacement, content, count=1, flags=re.MULTILINE | re.DOTALL)
    
    # Step 2: 替换 getRetireMonths 函数体
    # 从 function getRetireMonths( 到下一个 function / 注释块
    pattern_old_func = r'function getRetireMonths\([^)]+\) \{[^}]+\n\}'
    # 更精确的匹配：找到函数开始到函数结束
    pattern_func_start = r'(function getRetireMonths\(ageExact\s*,\s*config\)\s*\{)'
    # 找到函数体并替换
    content = re.sub(
        r'function getRetireMonths\([^)]*\) \{[^}]*\n\}',
        NEW_FUNC_BODY,
        content,
        count=1
    )
    
    if content != original:
        open(full_path, 'w', encoding='utf-8').write(content)
        print(f'UPDATED: {rel_path}')
    else:
        print(f'NO CHANGE: {rel_path} (pattern not matched)')

print('\nDone! Engine update complete.')
