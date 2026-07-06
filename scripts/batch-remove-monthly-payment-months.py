"""
计发月数表批量替换脚本
1. 删除所有省份JSON配置中的 monthly_payment_months（用引擎默认表替代）
2. 更新引擎默认表为官方精确到月版本
"""
import json, os, glob, re

BASE = r'C:\Users\14041\AppData\Roaming\winclaw\.openclaw\workspace\养老金计算平台'

# ===== 官方精确到月的计发月数表 =====
# key = 从0岁开始的总月数（如600=50岁0月, 601=50岁1月, ..., 780=65岁0月）
OFFICIAL_TABLE = {}
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
for year in range(50, 65):
    for month in range(12):
        key = year * 12 + month
        OFFICIAL_TABLE[str(key)] = ROWS[year][month]
# 65岁0月
OFFICIAL_TABLE[str(65 * 12)] = 101

# ===== 1. 删除所有省份JSON的monthly_payment_months =====
json_dirs = [
    'provinces',
    'cloudfunctions/calculate/provinces',
    'miniprogram/cloud-functions/calculate/provinces',
    'docs/js/provinces',
    'pension-engine/js',
]

removed_count = 0
for d in json_dirs:
    dir_path = os.path.join(BASE, d)
    if not os.path.isdir(dir_path):
        continue
    for f in sorted(glob.glob(os.path.join(dir_path, '*.json'))):
        name = os.path.basename(f)
        if 'generate' in name or '.tmp' in name:
            continue
        try:
            data = json.load(open(f, 'r', encoding='utf-8'))
        except:
            print(f'  SKIP (parse error): {d}/{name}')
            continue
        if 'monthly_payment_months' in data:
            del data['monthly_payment_months']
            json.dump(data, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            removed_count += 1
            print(f'  REMOVED: {d}/{name}')

print(f'\nTotal monthly_payment_months removed from JSON: {removed_count}')

# ===== 2. 删除sichuan.js中的monthly_payment_months =====
sichuan_js_path = os.path.join(BASE, 'cloudfunctions', 'calculate', 'provinces', 'sichuan.js')
if os.path.isfile(sichuan_js_path):
    content = open(sichuan_js_path, 'r', encoding='utf-8').read()
    if 'monthly_payment_months' in content:
        # Remove the monthly_payment_months line from the getEngineConfig return
        # Pattern: /monthly_payment_months.*\n/g
        new_content = re.sub(r'.*monthly_payment_months.*\n?', '', content)
        open(sichuan_js_path, 'w', encoding='utf-8').write(new_content)
        print(f'  REMOVED: cloudfunctions/calculate/provinces/sichuan.js')

# ===== 3. 删除pension-engine/js其它JS中的monthly_payment_months =====
js_dirs = ['pension-engine/js']
for d in js_dirs:
    dir_path = os.path.join(BASE, d)
    if not os.path.isdir(dir_path):
        continue
    for f in sorted(glob.glob(os.path.join(dir_path, '*.js'))):
        if 'pension-engine' in os.path.basename(f):
            continue  # engine file handled separately
        try:
            content = open(f, 'r', encoding='utf-8').read()
        except:
            continue
        if 'monthly_payment_months' in content:
            new_content = re.sub(r'.*monthly_payment_months.*\n?', '', content)
            open(f, 'w', encoding='utf-8').write(new_content)
            print(f'  REMOVED: {d}/{os.path.basename(f)}')

print('\nDone! Remove monthly_payment_months step complete.')
