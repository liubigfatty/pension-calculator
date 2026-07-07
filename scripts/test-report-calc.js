// 复算验证：报告页"提前退休收益"与"累计领取对比"
// 用一组代表性输入（男，正常退休63 / 弹性提前60，计发基数≈10325）
const legalAge = 63, flexAge = 60
const flexAdvance = 36            // = legalTotalMonths - flexTotalMonths（提前月数）
const legalBaseRetire = 10325     // 计发基数
const avgIndex = 1.0
const legalTotal = 8000           // 正常退休月养老金
const flexTotal = 6500            // 弹性提前月养老金
const flexMonths = 139            // 计发月数(60岁)

function fmt(n){ return Math.round(n).toLocaleString() }

console.log('=== 输入 ===')
console.log('正常退休年龄', legalAge, ' 弹性提前', flexAge, ' 提前月数(flexAdvance)', flexAdvance)
console.log('计发基数', legalBaseRetire, ' 平均指数', avgIndex, ' 计发月数(提前)', flexMonths)
console.log('正常月养老金', legalTotal, ' 提前月养老金', flexTotal, ' 月差额', legalTotal-flexTotal)

// ---- 当前(有bug)逻辑：期间误用 flexMonths(计发月数) ----
const monthlyNetSalary = Math.round(legalBaseRetire * 0.92)
const salary3year_bug = Math.round(monthlyNetSalary * flexMonths)
const fund3year_bug   = Math.round(legalBaseRetire * 0.24 * flexMonths)
const monthlyPremium  = Math.round(legalBaseRetire * avgIndex * 0.2)
const savePremium_bug = Math.round(monthlyPremium * flexMonths)
const earlyPension_bug= Math.round(flexTotal * flexMonths)
const totalEarly_bug  = savePremium_bug + earlyPension_bug
const payback_bug     = Math.round(totalEarly_bug / (legalTotal-flexTotal) / 12)

console.log('\n=== 当前(误用计发月数=139) ===')
console.log('工资收入(正常多领)', fmt(salary3year_bug))
console.log('住房公积金', fmt(fund3year_bug))
console.log('灵活就业省保费', fmt(savePremium_bug))
console.log('早领养老金', fmt(earlyPension_bug))
console.log('合计好处', fmt(totalEarly_bug), ' 回本年限(年)', payback_bug)

// ---- 修正后：期间用 gapMonths = flexAdvance ----
const gapMonths = flexAdvance
const salary3year_fix = Math.round(monthlyNetSalary * gapMonths)
const fund3year_fix   = Math.round(legalBaseRetire * 0.24 * gapMonths)
const savePremium_fix = Math.round(monthlyPremium * gapMonths)
const earlyPension_fix= Math.round(flexTotal * gapMonths)
const totalEarly_fix  = savePremium_fix + earlyPension_fix
const payback_fix     = Math.round(totalEarly_fix / (legalTotal-flexTotal) / 12)

console.log('\n=== 修正后(期间=提前月数=36) ===')
console.log('工资收入(正常多领)', fmt(salary3year_fix))
console.log('住房公积金', fmt(fund3year_fix))
console.log('灵活就业省保费', fmt(savePremium_fix))
console.log('早领养老金', fmt(earlyPension_fix))
console.log('合计好处', fmt(totalEarly_fix), ' 回本年限(年)', payback_fix)

// ---- 模块3 累计领取对比（复刻 _calcCumulative） ----
function calcCumulative(legalAge, flexAge, legalAnnual, flexAnnual){
  const items=[]; let breakEvenAge=0, prevDiff=0
  const startAge=Math.min(Math.floor(legalAge), Math.floor(flexAge||99))
  for(let age=startAge; age<=90; age+=5){
    const legalYrs=Math.max(0,age-legalAge)
    const flexYrs=Math.max(0,age-flexAge)
    if(flexYrs===0 && age>flexAge) continue
    const lT=Math.round(legalYrs*legalAnnual), fT=Math.round(flexYrs*flexAnnual)
    const diff=fT-lT
    let isBE=false
    if(breakEvenAge===0 && prevDiff>0 && diff<=0){breakEvenAge=age;isBE=true}
    if(breakEvenAge>0 && age===breakEvenAge) isBE=true
    items.push({age, lT, fT, diff, isBE})
    prevDiff=diff
  }
  return {items, breakEvenAge}
}
const legalAnnual=legalTotal*12, flexAnnual=flexTotal*12
const cum=calcCumulative(legalAge, flexAge, legalAnnual, flexAnnual)
console.log('\n=== 模块3 累计领取对比（早期60 vs 正常'+legalAge+'） ===')
cum.items.forEach(it=>{
  console.log(`领到${it.age}岁 | 正常 ¥${(it.lT/10000).toFixed(1)}万 | 提前 ¥${(it.fT/10000).toFixed(1)}万 | 差额 ${it.isBE?'追平':(it.diff>=0?'+':'-')+Math.abs(it.diff/10000).toFixed(1)+'万'}`)
})
console.log('盈亏平衡点 ≈', cum.breakEvenAge, '岁')
