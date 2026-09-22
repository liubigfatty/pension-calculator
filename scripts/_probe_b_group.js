/** B组人设：1996-07参工（排除视同干扰）、2025-12退休、29.42年、男、本省、100%档核心三项拆解 */
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')
const P = [['beijing','北京'],['tianjin','天津'],['hebei','河北'],['shanxi','山西'],['neimenggu','内蒙古'],['liaoning','辽宁'],['jilin','吉林'],['heilongjiang','黑龙江'],['shanghai','上海'],['jiangsu','江苏'],['zhejiang','浙江'],['anhui','安徽'],['fujian','福建'],['jiangxi','江西'],['shandong','山东'],['henan','河南'],['hubei','湖北'],['hunan','湖南'],['guangdong','广东'],['guangxi','广西'],['hainan','海南'],['chongqing','重庆'],['sichuan','四川'],['guizhou','贵州'],['yunnan','云南'],['xizang','西藏'],['shaanxi','陕西'],['gansu','甘肃'],['qinghai','青海'],['ningxia','宁夏'],['xinjiang','新疆']]
const BASE = { gender:'male', genderType:'male', birthYear:1965, birthMonth:9, workYear:1996, workMonth:7, cityType:'prov', retireDateInput:{year:2025,month:12}, avgIndex:1.0 }

function hv(sal, y) {
  const v = sal ? sal[y] : null
  if (v == null) return null
  if (typeof v === 'object') return v.prov != null ? v.prov : (v.shenzhen || v.city || 0)
  return v
}

function run(code, idx) {
  const cfg = getConfig(code)
  const r = engine.calculate(cfg, Object.assign({}, BASE, { avgIndex: idx })).legal
  const basic = (r.basicPension||{}).amount||0
  const acct = (r.personalAccount||{}).amount||0
  const trans = (r.transitionalPension||{}).amount||0
  const core = basic + acct + trans
  const pb = cfg.PROV_BASE && (cfg.PROV_BASE[2025] || cfg.PROV_BASE['2025'])
  const sal = cfg.avg_salary_history
  let levAvg = 0
  if (sal) {
    let s=0, n=0
    for (let y=1996; y<=2024; y++) { const v = hv(sal, y); if (v) { s+=v; n++ } }
    levAvg = n ? s/n : 0
  }
  return { basic, acct, trans, core, pb: pb||0, levAvg, sal2025: hv(sal,2025) }
}

const idxs = { '60%':0.6, '100%':1.0, '300%':3.0 }
for (const label of Object.keys(idxs)) {
  const idx = idxs[label]
  const rows = P.map(([c,n])=>({ c,n, ...run(c, idx) }))
  const cores = rows.map(x=>x.core)
  console.log('\n===== ' + label + '档 核心三项（基础+个账+过渡） =====')
  console.log('省     核心合计     基础       个账       过渡      计发基数2025  历年均/2025')
  rows.slice().sort((a,b)=>b.core-a.core).forEach(x=>{
    const ratio = x.sal2025 ? (x.levAvg/x.sal2025) : 0
    console.log(x.n.padEnd(4)+' '+x.core.toFixed(2).padStart(9)+' '+x.basic.toFixed(2).padStart(9)+' '+x.acct.toFixed(2).padStart(9)+' '+x.trans.toFixed(2).padStart(8)+'  '+String(Math.round(x.pb)).padStart(7)+'     '+(x.sal2025? ratio.toFixed(4) : '—'))
  })
  const mn=Math.min(...cores), mx=Math.max(...cores)
  const top = rows.slice().sort((a,b)=>b.core-a.core)[0]
  const bot = rows.slice().sort((a,b)=>a.core-b.core)[0]
  console.log('极差 ' + (mx-mn).toFixed(2) + '  倍数 ' + (mx/mn).toFixed(3) + '  (最高 ' + top.n + ' / 最低 ' + bot.n + ')')
}

console.log('\n===== 100%档 三项各自极差 =====')
const r100 = P.map(([c,n])=>({c,n,...run(c,1.0)}))
for (const k of ['basic','acct','trans']) {
  const v=r100.map(x=>x[k]); const mn=Math.min(...v),mx=Math.max(...v)
  console.log(k.padEnd(5) + ' 极差 ' + (mx-mn).toFixed(2) + '  倍数 ' + (mx/mn).toFixed(3))
}
const pb=r100.map(x=>x.pb); const pmn=Math.min(...pb),pmx=Math.max(...pb)
console.log('计发基数2025 极差 ' + (pmx-pmn) + '  倍数 ' + (pmx/pmn).toFixed(3) + '  (min ' + pmn + ' / max ' + pmx + ')')
const rat=r100.map(x=> x.sal2025? x.levAvg/x.sal2025 : 0).filter(x=>x>0)
console.log('历年社平均/2025社平 最划算 ' + Math.min(...rat).toFixed(4) + '  最贵 ' + Math.max(...rat).toFixed(4))
