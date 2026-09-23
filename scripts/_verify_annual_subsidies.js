/** 验证：年度补贴（不进月领）+ 黑龙江御寒津贴（进月领） */
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')
const P = [['beijing','北京'],['tianjin','天津'],['hebei','河北'],['shanxi','山西'],['neimenggu','内蒙古'],['liaoning','辽宁'],['jilin','吉林'],['heilongjiang','黑龙江'],['shanghai','上海'],['jiangsu','江苏'],['zhejiang','浙江'],['anhui','安徽'],['fujian','福建'],['jiangxi','江西'],['shandong','山东'],['henan','河南'],['hubei','湖北'],['hunan','湖南'],['guangdong','广东'],['guangxi','广西'],['hainan','海南'],['chongqing','重庆'],['sichuan','四川'],['guizhou','贵州'],['yunnan','云南'],['xizang','西藏'],['shaanxi','陕西'],['gansu','甘肃'],['qinghai','青海'],['ningxia','宁夏'],['xinjiang','新疆']]
const BASE = { gender:'male', genderType:'male', birthYear:1965, birthMonth:9, workYear:1987, workMonth:7, cityType:'prov', retireDateInput:{year:2025,month:12}, avgIndex:1.0 }
console.log('省     月领(元/月)   年度补贴(元/年)   项目名称 / 发放方式')
let withAnnual = 0
for (const [c,n] of P) {
  const r = engine.calculate(getConfig(c), Object.assign({}, BASE)).legal
  const a = r.annualSubsidies || { amount: 0, items: [] }
  if (a.amount > 0) withAnnual++
  const desc = a.items.length ? a.items.map(i => i.name + ' ' + i.amount + i.unit + '（' + i.when + '）').join(' + ') : '—'
  console.log(n.padEnd(4)+' '+r.total.toFixed(2).padStart(10)+' '+a.amount.toFixed(0).padStart(12)+'   '+desc)
}
console.log('\n有年度补贴的省：'+withAnnual+' 个')
// 黑龙江御寒津贴验证
const hl = engine.calculate(getConfig('heilongjiang'), Object.assign({}, BASE)).legal
console.log('\n[黑龙江] 特殊增发 = ' + hl.specialAddition.amount + ' 元/月 —— ' + hl.specialAddition.description)
console.log('[黑龙江] 月领 = ' + hl.total.toFixed(2) + '（改前 4615.29，应 +45）')
// 河北分档验证
for (const loc of ['prov','bashang','mountain']) {
  const r = engine.calculate(getConfig('hebei'), Object.assign({}, BASE, { cityType: loc, city: loc })).legal
  console.log('[河北/' + loc + '] 年度补贴 = ' + r.annualSubsidies.amount)
}
