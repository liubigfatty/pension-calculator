import json, glob, os

PROV_DIR = 'provinces'
count = 0

for f in sorted(glob.glob(os.path.join(PROV_DIR, '*.json'))):
    with open(f, encoding='utf-8') as fp:
        data = json.load(fp)
    
    if 'interest_rates' in data:
        del data['interest_rates']
        with open(f, 'w', encoding='utf-8') as fp:
            json.dump(data, fp, ensure_ascii=False, indent=2)
        count += 1

print(f'清空完成: {count} 个 root json 删除了 interest_rates 字段')
