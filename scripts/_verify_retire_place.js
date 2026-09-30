// 验证《换个退休地养老金差多少》文章数据：用文章同一套人设把 31 省逐省跑一遍
// 人设：男，1996-07 参工，退休锁 2025-12（29.42 年），100% 档（avgIndex=1.0），不含地方附加项
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

const rows = []
for (const code of CODES) {
  const config = provinces.getConfig(code)
  if (!config) { console.log('NO CONFIG:', code); continue }
  const input = {
    gender: 'male', genderType: 'male',
    birthYear: 1966, birthMonth: 7,            // 仅占位，退休点由 retireDateInput 锁死
    workYear: 1996, workMonth: 7,
    avgIndex: 1.0, personalAccInput: 0,
    cityType: 'prov',
    retireDateInput: { year: 2025, month: 12 }, // 锁退休点 → 缴费 29.42 年
  }
  const r = engine.calculate(config, input)
  const legal = r.legal
  const total = legal.total
  const basic = legal.basicPension ? legal.basicPension.amount : 0
  const personal = legal.personalAccount ? legal.personalAccount.amount : 0
  const trans = legal.transitionalPension ? legal.transitionalPension.amount : 0
  rows.push({ code, name: NAME[code], total, basic, personal, trans })
}

rows.sort((a,b) => b.total - a.total)
console.log('=== 31 省 100% 档 月领（高→低）===')
for (const x of rows) {
  console.log(`${x.name.padEnd(4)} ${String(x.total).padStart(7)}  基础${String(x.basic).padStart(6)} 个账${String(x.personal).padStart(6)} 过渡${String(x.trans).padStart(5)}`)
}
console.log('\n=== 极值 ===')
console.log('最高:', rows[0].name, rows[0].total)
console.log('最低:', rows[rows.length-1].name, rows[rows.length-1].total)
const sh = rows.find(r=>r.code==='shanghai')
const he = rows.find(r=>r.code==='henan')
console.log('上海:', sh.total, ' 河南:', he.total, ' 倍数:', (sh.total/he.total).toFixed(2))
console.log('上海排名:', rows.indexOf(sh)+1, ' 河南排名:', rows.indexOf(he)+1)
