files = [
  'index-engine/calcIndex.js',
  'index-mini/cloudfunctions/calcIndex/calcIndex.js',
]
old1 = '''  // 按年份排序
  yearlyRecords.sort((a, b) => a.year - b.year)

  for (const rec of yearlyRecords) {'''
new1 = '''  // 按年份排序
  yearlyRecords.sort((a, b) => a.year - b.year)

  // 首次/末次有缴费的年份（用于5省断缴判定：只计首次~末次之间的「内部空年」，
  // 首年前或末年后的空年（如清单铺到今年产生的尾部空年）视为未适用，不计入）
  const contribYears = yearlyRecords.filter(r => r.baseAvg > 0).map(r => r.year)
  const firstContribYear = contribYears.length ? Math.min(...contribYears) : null
  const lastContribYear = contribYears.length ? Math.max(...contribYears) : null

  for (const rec of yearlyRecords) {'''
old2 = '''    // ── 断缴年份处理（仅当该年无缴费基数 baseAvg<=0）──>
    if (rec.baseAvg <= 0) {
      const gapSocial = getSocialAvg(salaryHist, year)
      if (gapYearCountsInAvg && gapSocial && gapSocial > 0) {
        // 断缴年计入平均指数分母（指数记0），已有余额照常计息
        const grate = getRate(year)
        accountBalance = accountBalance * (1 + grate)
        totalWeight += rec.months
        yearsDetail.push({
          year, months: rec.months, baseAvg: 0,
          socialAvg: gapSocial, index: 0, weightedIndex: 0, rate: grate,
          accountContribution: 0, balanceAfterYear: accountBalance, gap: true
        })
      } else {
        // 多数省份：断缴年直接忽略（不计入公式）
        yearsDetail.push({
          year, months: rec.months, baseAvg: 0,
          socialAvg: (gapSocial && gapSocial > 0) ? gapSocial : null,
          index: null, gap: true, skipped: true,
          note: (gapSocial && gapSocial > 0) ? '断缴年份（不计入平均指数）' : `缺少${year}年社平`
        })
      }
      continue
    }'''
new2 = '''    // ── 断缴/空年处理（仅当该年无缴费基数 baseAvg<=0）──>
    if (rec.baseAvg <= 0) {
      const gapSocial = getSocialAvg(salaryHist, year)
      // 5省：断缴计入分母；但仅计「首次~末次缴费之间的内部空年」
      // 首年前 / 末年后的空年（如清单铺到今年产生的尾部空年）视为未适用，不计入
      const isInteriorGap = firstContribYear != null && year > firstContribYear && year < lastContribYear
      if (gapYearCountsInAvg && isInteriorGap && gapSocial && gapSocial > 0) {
        // 内部断缴年：计入平均指数分母（指数记0），已有余额照常计息
        const grate = getRate(year)
        accountBalance = accountBalance * (1 + grate)
        totalWeight += rec.months
        yearsDetail.push({
          year, months: rec.months, baseAvg: 0,
          socialAvg: gapSocial, index: 0, weightedIndex: 0, rate: grate,
          accountContribution: 0, balanceAfterYear: accountBalance, gap: true, gapCounted: true
        })
      } else {
        // 多数省份：断缴年忽略；或5省的尾部/首部空年：视为未适用忽略
        const note = (gapSocial && gapSocial > 0)
          ? (gapYearCountsInAvg ? '未缴费年度（首年前/末年后，不计入）' : '断缴年份（不计入平均指数）')
          : `缺少${year}年社平`
        yearsDetail.push({
          year, months: rec.months, baseAvg: 0,
          socialAvg: (gapSocial && gapSocial > 0) ? gapSocial : null,
          index: null, gap: true, skipped: true,
          note
        })
      }
      continue
    }'''
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        s = fh.read()
    c1 = s.count(old1); c2 = s.count(old2)
    if c1 != 1 or c2 != 1:
        print('WARN', f, 'c1=', c1, 'c2=', c2)
    s = s.replace(old1, new1)
    s = s.replace(old2, new2)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(s)
    print(f, 'patched (c1=%d c2=%d)' % (c1, c2))
