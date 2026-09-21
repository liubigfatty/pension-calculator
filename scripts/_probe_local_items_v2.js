/**
 * 地方项 v2：区分【无条件】与【条件性】，并按"满资格"重跑
 * v1 的错误：默认参数不传 oneChild/intellectual/location 等开关 → 条件性项目算成 0 → 误判"该省没有地方项"
 */
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')
const P = [['beijing','北京'],['tianjin','天津'],['hebei','河北'],['shanxi','山西'],['neimenggu','内蒙古'],['liaoning','辽宁'],['jilin','吉林'],['heilongjiang','黑龙江'],['shanghai','上海'],['jiangsu','江苏'],['zhejiang','浙江'],['anhui','安徽'],['fujian','福建'],['jiangxi','江西'],['shandong','山东'],['henan','河南'],['hubei','湖北'],['hunan','湖南'],['guangdong','广东'],['guangxi','广西'],['hainan','海南'],['chongqing','重庆'],['sichuan','四川'],['guizhou','贵州'],['yunnan','云南'],['xizang','西藏'],['shaanxi','陕西'],['gansu','甘肃'],['qinghai','青海'],['ningxia','宁夏'],['xinjiang','新疆']]
const BASE = { gender:'male', genderType:'male', birthYear:1965, birthMonth:9, workYear:1987, workMonth:7, cityType:'prov', retireDateInput:{year:2025,month:12}, avgIndex:1.0 }
// 满资格：独生子女证 + 知识分子 + 艰苦边远 + 深圳地方补充年限 + 西藏二类区
const FULL = { oneChild:true, intellectual:true, location:'prov', localPensionYears:30, pre1992LocalYears:5, regionCategory:'二类地区', tibetWorkYears:20 }
function run(code, extra) {
  const cfg = getConfig(code)
  const r = engine.calculate(cfg, Object.assign({}, BASE, extra)).legal
  const core = ((r.basicPension||{}).amount||0) + ((r.personalAccount||{}).amount||0) + ((r.transitionalPension||{}).amount||0)
  return { core, ex:(r.extraPension||{}).amount||0, sp:(r.specialAddition||{}).amount||0, af:(r.adjustmentFund||{}).amount||0,
           total:r.total||0, other:(r.total||0)-core-((r.extraPension||{}).amount||0)-((r.specialAddition||{}).amount||0)-((r.adjustmentFund||{}).amount||0),
           spDesc:(r.specialAddition||{}).description||'', exDesc:(r.extraPension||{}).description||'' }
}
console.log('===== 默认参数（v1口径）vs 满资格（开 oneChild/intellectual/深圳/西藏）=====')
console.log('省     默认地方项   默认到手   满资格地方项  满资格到手   差额    地方项说明')
const rows=[]
for (const [c,n] of P) {
  const a = run(c, {}), b = run(c, FULL)
  const la = a.ex+a.sp+a.af, lb = b.ex+b.sp+b.af
  rows.push({n,c,a,b,la,lb})
  console.log(n.padEnd(4)+' '+la.toFixed(2).padStart(9)+' '+a.total.toFixed(2).padStart(10)+' '+lb.toFixed(2).padStart(12)+' '+b.total.toFixed(2).padStart(11)+' '+(lb-la).toFixed(2).padStart(8)+'  '+(lb>0.01?((b.spDesc||b.exDesc).slice(0,42)):''))
}
console.log('\n===== 满资格下地方项非零点名 =====')
rows.filter(x=>x.lb>0.01).sort((x,y)=>y.lb-x.lb).forEach(x=>{
  console.log('  '+x.n.padEnd(4)+' '+x.lb.toFixed(2).padStart(7)+'   增发'+x.b.ex.toFixed(2).padStart(7)+' | 特殊'+x.b.sp.toFixed(2).padStart(7)+' | 调节'+x.b.af.toFixed(2).padStart(6)+' | 其它'+x.b.other.toFixed(2).padStart(7))
})
console.log('  （满资格仍为 0 的省：'+rows.filter(x=>x.lb<=0.01).map(x=>x.n).join('、')+'）')
// 极差
const t1=rows.map(x=>x.a.total), t2=rows.map(x=>x.b.total)
console.log('\n默认到手极差 '+(Math.max(...t1)-Math.min(...t1)).toFixed(2)+'（'+(Math.max(...t1)/Math.min(...t1)).toFixed(3)+'倍）')
console.log('满资格到手极差 '+(Math.max(...t2)-Math.min(...t2)).toFixed(2)+'（'+(Math.max(...t2)/Math.min(...t2)).toFixed(3)+'倍）')
