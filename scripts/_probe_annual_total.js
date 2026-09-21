/** 年领口径：月领×12 + 年度补贴（取暖补贴按年一次性发，不摊进月领） */
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')
const P = [['beijing','北京'],['tianjin','天津'],['hebei','河北'],['shanxi','山西'],['neimenggu','内蒙古'],['liaoning','辽宁'],['jilin','吉林'],['heilongjiang','黑龙江'],['shanghai','上海'],['jiangsu','江苏'],['zhejiang','浙江'],['anhui','安徽'],['fujian','福建'],['jiangxi','江西'],['shandong','山东'],['henan','河南'],['hubei','湖北'],['hunan','湖南'],['guangdong','广东'],['guangxi','广西'],['hainan','海南'],['chongqing','重庆'],['sichuan','四川'],['guizhou','贵州'],['yunnan','云南'],['xizang','西藏'],['shaanxi','陕西'],['gansu','甘肃'],['qinghai','青海'],['ningxia','宁夏'],['xinjiang','新疆']]
const BASE = { gender:'male', genderType:'male', birthYear:1965, birthMonth:9, workYear:1987, workMonth:7, cityType:'prov', retireDateInput:{year:2025,month:12}, avgIndex:1.0 }
const rows = P.map(([c,n]) => {
  const r = engine.calculate(getConfig(c), Object.assign({}, BASE)).legal
  const ann = (r.annualSubsidies || {}).amount || 0
  return { n, c, monthly: r.total, annual: ann, yearTotal: r.total * 12 + ann }
})
const byM = rows.slice().sort((a,b)=>b.monthly-a.monthly)
const byY = rows.slice().sort((a,b)=>b.yearTotal-a.yearTotal)
console.log('排名  月领口径          省/月领       年领口径          省/年领(=月领×12+年度补贴)')
for (let i=0;i<31;i++){
  const a=byM[i], b=byY[i]
  const delta = byM.findIndex(x=>x.c===b.c)+1 - (i+1)
  const d = delta===0?'  —':(delta>0?'↑'+delta:'↓'+(-delta))
  console.log(String(i+1).padStart(3)+'   '+a.n.padEnd(4)+a.monthly.toFixed(2).padStart(9)+'      '+b.n.padEnd(4)+b.yearTotal.toFixed(0).padStart(8)+'   '+d)
}
const mv=byM.map(x=>x.monthly), yv=byY.map(x=>x.yearTotal)
console.log('\n月领极差 '+(Math.max(...mv)-Math.min(...mv)).toFixed(2)+'（'+(Math.max(...mv)/Math.min(...mv)).toFixed(3)+'倍）')
console.log('年领极差 '+(Math.max(...yv)-Math.min(...yv)).toFixed(0)+'（'+(Math.max(...yv)/Math.min(...yv)).toFixed(3)+'倍）')
