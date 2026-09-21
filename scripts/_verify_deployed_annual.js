/** 线上副本验证：annual_subsidies 是否真的部署成功（拉回的副本，非本地源码） */
const path = require('path')
const DIR = process.argv[2] || 'C:/Users/14041/AppData/Local/Temp/_vfy_calc'
const engine = require(path.join(DIR, 'pension-engine.js'))
const { getConfig } = require(path.join(DIR, 'provinces-data.js'))
const P = [['beijing','北京'],['tianjin','天津'],['hebei','河北'],['shanxi','山西'],['neimenggu','内蒙古'],['liaoning','辽宁'],['jilin','吉林'],['heilongjiang','黑龙江'],['shanghai','上海'],['jiangsu','江苏'],['zhejiang','浙江'],['anhui','安徽'],['fujian','福建'],['jiangxi','江西'],['shandong','山东'],['henan','河南'],['hubei','湖北'],['hunan','湖南'],['guangdong','广东'],['guangxi','广西'],['hainan','海南'],['chongqing','重庆'],['sichuan','四川'],['guizhou','贵州'],['yunnan','云南'],['xizang','西藏'],['shaanxi','陕西'],['gansu','甘肃'],['qinghai','青海'],['ningxia','宁夏'],['xinjiang','新疆']]
const BASE = { gender:'male', genderType:'male', birthYear:1965, birthMonth:9, workYear:1987, workMonth:7, cityType:'prov', retireDateInput:{year:2025,month:12}, avgIndex:1.0 }
const EXPECT = { shanxi:3360, ningxia:4394, qinghai:3900, shaanxi:2360, shandong:1700, hebei:1240, tianjin:520 }
console.log('[线上副本] ' + DIR)
console.log('省     月领       年度补贴    预期     状态')
let ok = 0, bad = []
for (const [c,n] of P) {
  const r = engine.calculate(getConfig(c), Object.assign({}, BASE)).legal
  const a = (r.annualSubsidies || {}).amount || 0
  const exp = EXPECT[c] || 0
  const pass = Math.abs(a - exp) < 0.01
  if (pass) ok++; else bad.push(n + '(实' + a + '/预' + exp + ')')
  console.log(n.padEnd(4)+' '+r.total.toFixed(2).padStart(9)+' '+a.toFixed(0).padStart(9)+' '+String(exp).padStart(8)+'   '+(pass?'OK':'✗'))
}
console.log('\n31省: ' + ok + '/31 通过' + (bad.length ? '  失败: ' + bad.join('、') : ''))
// 河北分档
for (const loc of ['prov','bashang','mountain']) {
  const r = engine.calculate(getConfig('hebei'), Object.assign({}, BASE, { cityType: loc, city: loc })).legal
  console.log('[河北/' + loc + '] 年度补贴 = ' + r.annualSubsidies.amount)
}
// 黑龙江御寒津贴
const hl = engine.calculate(getConfig('heilongjiang'), Object.assign({}, BASE)).legal
console.log('[黑龙江] 特殊增发 = ' + hl.specialAddition.amount + ' 元/月 / 月领 ' + hl.total.toFixed(2))
// 年度补贴不进月领的断言
const sx = engine.calculate(getConfig('shanxi'), Object.assign({}, BASE)).legal
console.log('\n[断言] 山西月领 ' + sx.total.toFixed(2) + '（应为 4663.20，年度补贴未混入）: ' + (Math.abs(sx.total-4663.20)<0.01 ? 'PASS' : 'FAIL'))
