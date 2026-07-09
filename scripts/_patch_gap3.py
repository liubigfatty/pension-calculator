files = [
  'index-engine/calcIndex.js',
  'index-mini/cloudfunctions/calcIndex/calcIndex.js',
]
oldA = '''  // 首次/末次有缴费的年份（用于5省断缴判定：只计首次~末次之间的「内部空年」，
  // 首年前或末年后的空年（如清单铺到今年产生的尾部空年）视为未适用，不计入）
  const contribYears = yearlyRecords.filter(r => r.baseAvg > 0).map(r => r.year)
  const firstContribYear = contribYears.length ? Math.min(...contribYears) : null
  const lastContribYear = contribYears.length ? Math.max(...contribYears) : null'''
newA = '''  // 首次有缴费的年份（用于5省断缴判定：自首次缴费年起的空年均计入「应缴费年限」分母；
  // 首次缴费年之前的空年视为未开始，不计入）
  const contribYears = yearlyRecords.filter(r => r.baseAvg > 0).map(r => r.year)
  const firstContribYear = contribYears.length ? Math.min(...contribYears) : null'''
oldB = '''      // 5省：断缴计入分母；但仅计「首次~末次缴费之间的内部空年」
      // 首年前 / 末年后的空年（如清单铺到今年产生的尾部空年）视为未适用，不计入
      const isInteriorGap = firstContribYear != null && year > firstContribYear && year < lastContribYear
      if (gapYearCountsInAvg && isInteriorGap && gapSocial && gapSocial > 0) {'''
newB = '''      // 5省：断缴计入分母；自首次缴费年起的空年（含末次缴费后的年份，对应「应缴费年限」）均计入
      const isGapYear = firstContribYear != null && year >= firstContribYear
      if (gapYearCountsInAvg && isGapYear && gapSocial && gapSocial > 0) {'''
oldC = '''        const note = (gapSocial && gapSocial > 0)
          ? (gapYearCountsInAvg ? '未缴费年度（首年前/末年后，不计入）' : '断缴年份（不计入平均指数）')
          : `缺少${year}年社平`'''
newC = '''        const note = (gapSocial && gapSocial > 0)
          ? (gapYearCountsInAvg
              ? (year >= firstContribYear ? '断缴年份（计入平均指数，指数记0）' : '未缴费年度（首次缴费年前，不计入）')
              : '断缴年份（不计入平均指数）')
          : `缺少${year}年社平`'''
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        s = fh.read()
    c = 0
    for old, new in [(oldA,newA),(oldB,newB),(oldC,newC)]:
        if s.count(old) != 1:
            print('WARN', f, 'count=', s.count(old))
        s = s.replace(old, new); c += 1
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(s)
    print(f, 'patched blocks=', c)
