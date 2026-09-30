// 三档位验证：上海/河南是否始终为 31 省的极值
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const provinces = require('../cloudfunctions/calculate/provinces-data.js')

const CODES = ['beijing','tianjin','hebei','shanxi','neimenggu','liaoning','jilin','heilongjiang',
  'shanghai','jiangsu','zhejiang','anhui','fujian','jiangxi','shandong','henan','hubei','hunan',
  'guangdong','guangxi','hainan','chongqing','sichuan','guizhou','yunnan','xizang',
  'shaanxi','gansu','qinghai','ningxia','xinjiang']
const NAME = {beijing:'北京',tianjin:'天津',hebei:'河北',shanxi:'山西',neimenggu:'内蒙古',liaoning:'辽宁',
  jilin:'吉林',heilongjiang:'黑龙江',shanghai:'上海',jiangsu:'江苏',zhejiang:'浙江',anhui:'安徽',fujian:'福建',
  jiangxi:'江西',shandong:'山东',henan:'河南',hubei:'湖北',hunan:'湖南',guangdong:'广东',guangxi:'广西',
  hainan:'海南',chongqing:'重庆',sichuan:'四川',guizhou:'贵州',yunnan:'云南',xizang:'西藏',
  shaanxi:'陕西',gansu:'甘肃',qinghai:'青海',ningxia:'宁夏',xinjiang:'新疆'}

function run(avgIndex) {
  const rows = []
  for (const code of CODES) {
    const config = provinces.getConfig(code)
    const input = { gender:'male', genderType:'male', birthYear:1966, birthMonth:7,
      workYear:1996, workMonth:7, avgIndex, personalAccInput:0, cityType:'prov',
      retireDateInput:{year:2025, month:12} }
    const r = engine.calculate(config, input)
    rows.push({ name:NAME[code], code, total:r.legal.total,
      basic:r.legal.basicPension?r.legal.basicPension.amount:0,
      personal:r.legal.personalAccount?r.legal.personalAccount.amount:0 })
  }
  rows.sort((a,b)=>b.total-a.total)
  return rows
}

for (const tier of [0.6, 1.0, 3.0]) {
  const rows = run(tier)
  const hi = rows[0], lo = rows[rows.length-1]
  console.log(`\n===== ${tier===0.6?'60%':tier===1.0?'100%':'300%'} 档 =====`)
  console.log(`最高: ${hi.name} ${hi.total.toFixed(1)} | 最低: ${lo.name} ${lo.total.toFixed(1)} | 倍数 ${(hi.total/lo.total).toFixed(2)}`)
  console.log(`上海排名#${rows.findIndex(r=>r.code==='shanghai')+1} (${rows.find(r=>r.code==='shanghai').total.toFixed(1)})  河南排名#${rows.findIndex(r=>r.code==='henan')+1} (${rows.find(r=>r.code==='henan').total.toFixed(1)})`)
}
