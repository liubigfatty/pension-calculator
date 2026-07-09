const { calculateIndex } = require('../index-mini/cloudfunctions/calcIndex/calcIndex.js')
const PROV = require('../index-mini/cloudfunctions/calcIndex/provinces-data.js')
const SAMPLE = require('./_xls_yearly.json').yearly
const curY = new Date().getFullYear()
const beijing = PROV.beijing.avg_salary_history

// 1) 吉林样例铺到今年：尾部空年跳过
const jlFull = SAMPLE.slice()
for (let y = 2023; y <= curY; y++) jlFull.push({ year: y, months: 12, baseAvg: 0 })
const rJL = calculateIndex({ provinceConfig: PROV.jilin, contribution: jlFull, granularity: 'A', gapYearCountsInAvg: false })
console.log('吉林样例铺到今年 =>', rJL.avgIndex, '(预期1.6238) gapYears=', rJL._meta.gapYears)

// 2) 北京 用户举例 [缴2020 + 断2021]，list止于2021
const bjEx = [{ year: 2020, months: 12, baseAvg: beijing[2020] }, { year: 2021, months: 12, baseAvg: 0 }]
const rEx = calculateIndex({ provinceConfig: PROV.beijing, contribution: bjEx, granularity: 'A', gapYearCountsInAvg: true })
console.log('北京[缴1+断1] =>', rEx.avgIndex, '(预期0.5) gapYears=', rEx._meta.gapYears)

// 3) 北京 铺到今年 但2015后停缴（数据1998-2015, 清单到2026）：末次后空年计入
const bjStop = []
for (let y = 1998; y <= 2015; y++) bjStop.push({ year: y, months: 12, baseAvg: y === 2000 ? beijing[2000] : beijing[y] })
for (let y = 2016; y <= curY; y++) bjStop.push({ year: y, months: 12, baseAvg: 0 })
const rStop = calculateIndex({ provinceConfig: PROV.beijing, contribution: bjStop, granularity: 'A', gapYearCountsInAvg: true })
console.log('北京[1998-2015缴,2016-'+curY+'断] =>', rStop.avgIndex, 'gapYears=', rStop._meta.gapYears, '(末次后空年计入=官方应缴费年限)')
