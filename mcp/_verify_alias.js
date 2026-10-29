'use strict'

// 省份别名识别全量校验
// 教训：初版只对吉林/广东/北京三个「恰好有 name 字段」的省做过验证，
// 结果 31 省里 16 个识别不了（cfg 缺 name 字段）。本脚本强制全量覆盖，杜绝抽样侥幸。

const D = require('../cloudfunctions/calculate/provinces-data.js')
const A = require('./alias.js')

const ok = []
const bad = []
const check = (name, cond, detail) => {
  ;(cond ? ok : bad).push(name + (detail ? ' — ' + detail : ''))
  console.log((cond ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''))
}

// 每个省的多种叫法：中文全称、简称、拼音 key、常见口语
const EXPECT = {
  anhui: ['安徽', '安徽省'],
  beijing: ['北京', '北京市'],
  chongqing: ['重庆', '重庆市'],
  fujian: ['福建', '福建省'],
  gansu: ['甘肃', '甘肃省'],
  guangdong: ['广东', '广东省', '粤'],
  guangxi: ['广西', '广西壮族自治区', '广西省'],
  guizhou: ['贵州', '贵州省'],
  hainan: ['海南', '海南省'],
  hebei: ['河北', '河北省'],
  heilongjiang: ['黑龙江', '黑龙江省'],
  henan: ['河南', '河南省', '豫'],
  hubei: ['湖北', '湖北省'],
  hunan: ['湖南', '湖南省'],
  jiangsu: ['江苏', '江苏省', '苏'],
  jiangxi: ['江西', '江西省'],
  jilin: ['吉林', '吉林省'],
  liaoning: ['辽宁', '辽宁省'],
  neimenggu: ['内蒙古', '内蒙古自治区', '内蒙'],
  ningxia: ['宁夏', '宁夏回族自治区'],
  qinghai: ['青海', '青海省'],
  shaanxi: ['陕西', '陕西省'],
  shandong: ['山东', '山东省', '鲁'],
  shanghai: ['上海', '上海市'],
  shanxi: ['山西', '山西省', '晋'],
  sichuan: ['四川', '四川省'],
  tianjin: ['天津', '天津市'],
  xinjiang: ['新疆', '新疆维吾尔自治区'],
  xizang: ['西藏', '西藏自治区'],
  yunnan: ['云南', '云南省'],
  zhejiang: ['浙江', '浙江省', '浙']
}

function main () {
  console.log('--- 1. 31 省 × 多种叫法 ---')
  const keys = D.listProvinces()
  check('省份总数为 31', keys.length === 31, keys.length + ' 个')

  let failed = []
  keys.forEach((k) => {
    const forms = (EXPECT[k] || []).concat([k]) // 拼音 key 本身也要认
    const miss = forms.filter((f) => A.resolveProvince(f) !== k)
    if (miss.length) {
      failed.push(k + ' 无法识别: ' + miss.join('/'))
      console.log(`❌ ${k.padEnd(13)} 未识别: ${miss.join(' / ')}`)
    } else {
      console.log(`✅ ${k.padEnd(13)} ${forms.join(' / ')}`)
    }
  })
  check('31 省全部可识别', failed.length === 0, failed.length ? failed.length + ' 个省有缺口' : '全通过')

  console.log('\n--- 2. 近音/形近省份防串（陕西 vs 山西）---')
  const confuse = [
    ['陕西', 'shaanxi'], ['陕西省', 'shaanxi'], ['陕西西安', 'shaanxi'],
    ['山西', 'shanxi'], ['山西省', 'shanxi'], ['山西太原', 'shanxi']
  ]
  confuse.forEach(([input, want]) => {
    const got = A.resolveProvince(input)
    check(`"${input}" → ${want}`, got === want, '实得 ' + got)
  })

  console.log('\n--- 3. 带多余上下文的口语输入 ---')
  const noisy = [
    ['我在吉林省长春市', 'jilin'],
    ['山东省济南市', 'shandong'],
    ['我是广东深圳的', 'guangdong'],
    ['jilin', 'jilin'],
    ['JILIN', 'jilin'],
    [' 吉林 ', 'jilin']
  ]
  noisy.forEach(([input, want]) => {
    const got = A.resolveProvince(input)
    check(`"${input}" → ${want}`, got === want, '实得 ' + got)
  })

  console.log('\n--- 4. 非法输入不应误命中 ---')
  const junk = ['', '火星', '美国', '12345', null, undefined]
  junk.forEach((j) => {
    const got = A.resolveProvince(j)
    check(`"${String(j)}" → null`, got === null, '实得 ' + got)
  })

  console.log('\n--- 5. 城市别名（吉林/广东）---')
  ;['jilin', 'guangdong'].forEach((k) => {
    const cities = A.listCities(k)
    console.log(`   ${k}: ${cities.join(' / ') || '(无城市细分)'}`)
    cities.slice(0, 3).forEach((c) => {
      const r = A.resolveCity(k, c)
      console.log(`      "${c}" → ${r}`)
    })
  })

  console.log('\n===== 汇总 =====')
  console.log('通过 ' + ok.length + ' 项，失败 ' + bad.length + ' 项')
  if (bad.length) { console.log('失败项：'); bad.forEach((b) => console.log('  - ' + b)) }
}

main()
