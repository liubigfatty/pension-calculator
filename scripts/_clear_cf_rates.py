import re, glob, os

CF_DIR = 'cloudfunctions/calculate/provinces'
count_js = 0
count_const = 0

for f in sorted(glob.glob(os.path.join(CF_DIR, '*.js'))):
    with open(f, encoding='utf-8') as fp:
        content = fp.read()
    original = content

    # 1) 删除顶层 const INTEREST_RATES = {...};
    new_content = re.sub(
        r'const INTEREST_RATES\s*=\s*\{[^}]*\}\s*;',
        '', content, flags=re.DOTALL)
    if new_content != content:
        count_const += 1
        content = new_content

    # 2) 删除 getEngineConfig 返回里的 interest_rates: INTEREST_RATES,
    new_content = re.sub(
        r'\n\s*interest_rates:\s*INTEREST_RATES,?\n',
        '\n', content)
    if new_content != content:
        count_js += 1
        content = new_content

    # 3) 删除残留的 interest_rates: {} 或类似空对象（如果有）
    new_content = re.sub(r'\n\s*interest_rates:\s*\{\s*\},?\n', '\n', content)
    if new_content != content:
        content = new_content

    if content != original:
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(content)

print(f'清空完成: {count_js} 个 .js 删除了 getEngineConfig 的 interest_rates 字段')
print(f'          {count_const} 个 .js 删除了 INTEREST_RATES const')
