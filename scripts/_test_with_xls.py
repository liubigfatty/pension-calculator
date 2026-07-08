# -*- coding: utf-8 -*-
import json
path = r'C:\Users\14041\Documents\12 廉政档案\个人缴费信息查询.xls'
import xlrd
wb = xlrd.open_workbook(path)
sh = wb.sheet_by_index(0)

rows = []
for r in range(1, sh.nrows):
    period = str(int(sh.cell_value(r, 0)))
    base = float(sh.cell_value(r, 3))
    acc = float(sh.cell_value(r, 4))
    if not period or base == 0:
        continue
    y = int(period[:4]); m = int(period[4:6])
    rows.append({'year': y, 'month': m, 'base': base, 'acc': acc})

rows.sort(key=lambda x: (x['year'], x['month']))
total_months = len(rows)
start_year = rows[0]['year']; start_month = rows[0]['month']
bases = [x['base'] for x in rows]
monthly_avg = sum(bases) / total_months
principal_sum = sum(x['acc'] for x in rows)

from collections import defaultdict
year_map = defaultdict(list)
for x in rows:
    year_map[x['year']].append(x['base'])
yearly = []
for y in sorted(year_map):
    bs = year_map[y]
    yearly.append({'year': y, 'months': len(bs), 'baseAvg': round(sum(bs)/len(bs), 2)})

out = {
  'province': 'jilin', 'start_year': start_year, 'start_month': start_month,
  'total_months': total_months, 'monthly_avg': round(monthly_avg, 2),
  'principal_sum': round(principal_sum, 2),
  'yearly': yearly
}
with open('scripts/_xls_yearly.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print('解析完成: 记录数=%d 起止=%d-%02d ~ %d 月均基数=%.2f 本金和=%.2f 年度数=%d' %
      (total_months, start_year, start_month, yearly[-1]['year'], monthly_avg, principal_sum, len(yearly)))
print('已保存 scripts/_xls_yearly.json')
