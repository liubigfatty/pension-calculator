// scripts/_gen_salary_data.js
// 生成「全国社平工资查询」页所需数据：聚合 31 省 + 深圳市的历年社平（元/月）
// 数据源：index-mini/cloudfunctions/calcIndex/provinces-data.js
//   （该文件由 _gen_province_data.js 从养老金引擎 getEngineConfig().avg_salary_history 生成，
//    未正式公布的 2025/2026 已按引擎计发口径外推补全，作为预发值）
// 输出：index-mini/data/salaryHistory.js （module.exports，小程序端直接 require）
//
// 运行方式：cd index-mini && node ../scripts/_gen_salary_data.js
// 说明：本环境 Node 对含中文的绝对路径 require 会失败，故统一用 cwd 相对路径 + fs 读取 + eval。

const fs = require('fs')
const path = require('path')

// 以 cwd（应为 index-mini 目录）为基准的相对路径
const SRC_REL = './cloudfunctions/calcIndex/provinces-data.js'
const OUT_REL = './data/salaryHistory.js'

// 规范省份名映射（与 index.js 的 PROVINCES 对齐；修正新疆 name 为空/slug 的问题）
const NAMES = {
  beijing: '北京市', tianjin: '天津市', hebei: '河北省', shanxi: '山西省',
  neimenggu: '内蒙古自治区', liaoning: '辽宁省', jilin: '吉林省', heilongjiang: '黑龙江省',
  shanghai: '上海市', jiangsu: '江苏省', zhejiang: '浙江省', anhui: '安徽省',
  fujian: '福建省', jiangxi: '江西省', shandong: '山东省', henan: '河南省',
  hubei: '湖北省', hunan: '湖南省', guangdong: '广东省', guangxi: '广西壮族自治区',
  hainan: '海南省', chongqing: '重庆市', sichuan: '四川省', guizhou: '贵州省',
  yunnan: '云南省', xizang: '西藏自治区', shaanxi: '陕西省', gansu: '甘肃省',
  qinghai: '青海省', ningxia: '宁夏回族自治区', xinjiang: '新疆维吾尔自治区'
}

function normHistory(obj) {
  const out = {}
  for (const k of Object.keys(obj)) {
    const y = Number(k)
    const v = Number(obj[k])
    if (!Number.isFinite(y) || !Number.isFinite(v) || v <= 0) continue
    out[y] = Math.round(v * 100) / 100
  }
  return out
}

function buildProvince(code, name, history) {
  const h = normHistory(history)
  const years = Object.keys(h).map(Number)
  if (!years.length) return null
  return { code, name, latest: Math.max(...years), earliest: Math.min(...years), history: h }
}

// 读取云数据（JS module.exports 对象字面量），用 eval 解析，避免 require 中文绝对路径失败
const raw = fs.readFileSync(SRC_REL, 'utf-8')
const m = raw.match(/module\.exports\s*=\s*([\s\S]*?)\s*;?\s*$/)
if (!m) { console.error('无法解析源数据'); process.exit(1) }
const src = eval('(' + m[1] + ')')

const provinces = []
for (const code of Object.keys(src)) {
  const entry = src[code]
  if (!entry || !entry.avg_salary_history) continue

  if (code === 'guangdong') {
    const ah = entry.avg_salary_history
    if (ah.prov) { const p = buildProvince('guangdong', '广东省', ah.prov); if (p) provinces.push(p) }
    if (ah.shenzhen) { const s = buildProvince('shenzhen', '深圳市', ah.shenzhen); if (s) provinces.push(s) }
    continue
  }

  const name = NAMES[code] || entry.name || code
  const p = buildProvince(code, name, entry.avg_salary_history)
  if (p) provinces.push(p)
}

provinces.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))

const meta = {
  generatedAt: new Date().toISOString().slice(0, 10),
  unit: '元/月',
  source: '养老金计算引擎 provinces-data（计发用全口径城镇单位就业人员月平均工资）',
  note: '2025、2026 年对尚未正式公布的省份，为引擎按计发口径外推的预发估算值（预发年持平、之后按约2%复利），仅供参考；各地统计局公布后以官方为准。',
  extrapolation: true
}

const out = { meta, provinces }
const banner = `/* 自动生成 - 全国社平工资查询数据包\n * 生成时间: ${meta.generatedAt}\n * 来源: ${meta.source}\n * 单位: ${meta.unit}；2025/2026 未公布省份为引擎外推预发值\n * 请勿手改，由 scripts/_gen_salary_data.js 重新生成\n */\n`
fs.mkdirSync(path.dirname(OUT_REL), { recursive: true })
fs.writeFileSync(OUT_REL, banner + 'module.exports = ' + JSON.stringify(out, null, 2) + '\n', 'utf-8')

console.log(`OK -> ${OUT_REL}`)
console.log(`  省份条数(含深圳): ${provinces.length}`)
let total = 0
for (const p of provinces) {
  const n = Object.keys(p.history).length
  total += n
  console.log(`   ${p.name.padEnd(8)} ${p.earliest}-${p.latest} (${n}年)`)
}
console.log(`  数据总条数: ${total}`)
