#!/usr/bin/env node
/**
 * 从引擎真相源（cloudfunctions/calculate/provinces/*.js）导出
 * 《全国31省养老金计算口径速查表》——供 ima 知识库 / 微信AI知识库使用。
 *
 * 原则：
 *  - 数字 100% 来自真相源 getEngineConfig()，不手工编造；
 *  - 某年官方未公布的，明确标注「未公布」，不伪装成官方值；
 *  - 每个数字块都带「数据出处」说明，契合"数字必须有出处"的写作红线。
 */
const fs = require('fs')
const path = require('path')

const PROV_DIR = path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces')
const OUT = process.argv[2] ||
  'C:/Users/14041/WorkBuddy/公众号内容库/_ima知识库素材/00-全国31省养老金计算口径速查表.md'

const YEARS = [2022, 2023, 2024, 2025, 2026]

// 部分省份文件未填 name，用 tag→中文名兜底（31 省全覆盖）
const PROV_CN = {
  anhui: '安徽', beijing: '北京', chongqing: '重庆', fujian: '福建', gansu: '甘肃',
  guangdong: '广东', guangxi: '广西', guizhou: '贵州', hainan: '海南', hebei: '河北',
  heilongjiang: '黑龙江', henan: '河南', hubei: '湖北', hunan: '湖南', jiangsu: '江苏',
  jiangxi: '江西', jilin: '吉林', liaoning: '辽宁', neimenggu: '内蒙古', ningxia: '宁夏',
  qinghai: '青海', shaanxi: '陕西', shandong: '山东', shanghai: '上海', shanxi: '山西',
  sichuan: '四川', tianjin: '天津', xinjiang: '新疆', xizang: '西藏', yunnan: '云南',
  zhejiang: '浙江',
}

// 城市别名 → 中文名（英文 key 展示出来没人看得懂）
const CITY_CN = {
  shenzhen: '深圳', cc: '长春', changchun: '长春', shenyang: '沈阳', dalian: '大连',
  zhengzhou: '郑州', luoyang: '洛阳', xinyang: '信阳', kaifeng: '开封',
  pingdingshan: '平顶山', xinxiang: '新乡', qianjiang: '潜江', xiantao: '仙桃',
  tianmen: '天门', ezhou: '鄂州', xianning: '咸宁', xiaogan: '孝感',
  huanggang: '黄冈', shennongjia: '神农架', jingzhou: '荆州', yichang: '宜昌',
  huangshi: '黄石', shiyan: '十堰', xiangyang: '襄阳', enshi: '恩施',
  jingmen: '荆门', suizhou: '随州',
}

// 中文优先：同一城市常有中英双 key（cc/长春/changchun、沈阳/shenyang），需按「年份+值」去重
function dedupCities(cityBase) {
  const seen = new Map()
  for (const c of cityBase) {
    const key = `${c.last}_${c.val}`
    if (seen.has(key)) {
      // 已有同值条目：若新名字是中文而旧的是英文，用中文名替换
      const prev = seen.get(key)
      if (/[一-龥]/.test(c.c) && !/[一-龥]/.test(prev.c)) seen.set(key, c)
      continue
    }
    seen.set(key, c)
  }
  return [...seen.values()]
}

function fmt(n) {
  if (n === undefined || n === null || n === '') return '—'
  return typeof n === 'number' ? n.toFixed(2).replace(/\.00$/, '') : String(n)
}

const rows = []
const files = fs.readdirSync(PROV_DIR).filter(f => f.endsWith('.js')).sort()

for (const f of files) {
  const tag = f.replace(/\.js$/, '')
  let mod
  try {
    mod = require(path.join(PROV_DIR, f))
  } catch (e) {
    console.error(`跳过 ${f}: ${e.message}`)
    continue
  }
  const cfg = typeof mod.getEngineConfig === 'function' ? mod.getEngineConfig() : mod
  const br = (cfg.base_rates && cfg.base_rates.prov) || {}
  const cities = (cfg.base_rates && typeof cfg.base_rates === 'object')
    ? Object.keys(cfg.base_rates).filter(k => k !== 'prov')
    : (cfg.cities ? Object.keys(cfg.cities) : [])
  const hist = cfg.avg_salary_history || {}
  const histYears = Object.keys(hist).map(Number).filter(y => y >= 2020).sort((a, b) => a - b)

  rows.push({
    tag,
    name: (/[一-龥]/.test(cfg.name || '') ? cfg.name : null) || PROV_CN[tag] || cfg.name || tag,
    base: Object.fromEntries(YEARS.map(y => [y, br[y]])),
    lastBaseYear: Math.max(...Object.keys(br).map(Number)),
    cities,
    cityBase: cities.map(c => {
      const t = (cfg.base_rates && cfg.base_rates[c]) || {}
      const ys = Object.keys(t).map(Number).sort((a, b) => b - a)
      return { c, last: ys[0], val: t[ys[0]] }
    }),
    sal: Object.fromEntries(histYears.map(y => [y, hist[y]])),
    accountStart: cfg.account_start,
    cutoff: cfg.cutoff_date,
    modules: Object.keys(cfg.modules || {}).join('、'),
  })
}

// 城市单列单元格：去重后最多展示 3 个代表，其余只报数量，避免湖北这类 30+ 地区撑爆表格
function cityCell(r) {
  const list = dedupCities(r.cityBase || [])
  if (!list.length) return '无'
  const shown = list.slice(0, 3)
    .map(c => `${CITY_CN[c.c] || c.c} ${c.last} 年 ${fmt(c.val)}`).join('；')
  return list.length > 3 ? `${shown}；等 ${list.length} 个地区` : shown
}

const _now = new Date()
const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`

let md = `全国31省养老金计算口径速查表（引擎真相源导出）

【文档性质】本表数字全部由「正元养老金计算引擎」真相源文件
（cloudfunctions/calculate/provinces/*.js）自动导出，生成日期 ${today}。
每个数字都可回溯到各省人社厅官方文件；凡标注「未公布」的，表示该年度官方文件
尚未发布，引擎按既有规则处理，**不得当作官方值引用**。

【适用范围边界 —— 检索本文时必须同时遵守】
1. 本文是「口径速查」，不是「某人能拿多少钱」的答案；
2. 各省数字只能用于该省、且只能用于标注年份；**跨省、跨年不得套用**；
3. 「社平」与「计发基数」是两套不同口径，不可互相替代：
   - 计发基数＝算养老金用的基数（拿多少）；
   - 社平＝算缴费指数用的分母（缴多少）。
4. 本文 avg_salary_history 采用「执行年」语义：数组中 [Y] = Y 年度执行社平
   = Y-1 统计年公布的社平。
5. 涉及个人待遇的结论，一律以社保经办机构核定为准。

---

## 一、31省计发基数（元/月）

`
md += '| 省份 | ' + YEARS.join(' | ') + ' | 最新年份 | 城市单列 |\n'
md += '|---|' + YEARS.map(() => '---:').join('|') + '|---:|---|\n'
for (const r of rows) {
  md += `| ${r.name} | ` +
    YEARS.map(y => {
      const v = r.base[y]
      return v === undefined ? '未公布' : fmt(v)
    }).join(' | ') +
    ` | ${r.lastBaseYear} | ${cityCell(r)} |\n`
}

md += `
> 说明：
> - 「未公布」= 该省该年度计发基数官方文件尚未发布。引擎对该情形按既有规则处理
>   （已并轨省沿用/外推，未并轨的城市单列省按预发沿用本市上年值），**不等于官方值**。
> - 「城市单列」= 该省存在与全省不同基数的地区（如吉林长春）。单列城市当年未公布时，
>   禁止直接套用全省值，否则会出现"晚退休反而拿得少"的倒退。
> - ⚠️ **湖南 2026（6843）低于 2025（7694）**：这是官方并轨到全口径社平后的基数下调
>   （湘人社规〔2026〕14号），**不等于降低待遇**（养老金仍按"就高"等规则核定）。
>   写文章时必须说清这一点，否则读者会误读成"退休金降了"。
> - ⚠️ 若某省某年数字与上年**完全相同**，需回核是官方公布值还是引擎沿用值，**不可直接当"官方已公布"引用**。
> - 各省官方文件号散见于各省人社厅年度公告，**引用前必须回核原始文件**。

---

## 二、31省全口径社平工资（元/月，执行年口径）

`
const salYears = [2023, 2024, 2025, 2026]
md += '| 省份 | ' + salYears.join(' | ') + ' |\n'
md += '|---|' + salYears.map(() => '---:').join('|') + '|\n'
for (const r of rows) {
  md += `| ${r.name} | ` +
    salYears.map(y => (r.sal[y] === undefined ? '未公布' : fmt(r.sal[y]))).join(' | ') + ' |\n'
}

md += `
> 说明：本表采用「执行年」语义 —— [Y] 表示 Y 年度执行社平（等于 Y-1 统计年公布的社平）。
> 用途：**算缴费指数的分母**。与第一节「计发基数」不是同一件事。

---

## 三、各省建账时间与视同缴费截止

| 省份 | 个人账户建账 | 视同缴费截止 | 启用模块 |
|---|---|---|---|
`
for (const r of rows) {
  md += `| ${r.name} | ${r.accountStart || '—'} | ${r.cutoff || '—'} | ${r.modules || '—'} |\n`
}

md += `
---

## 四、全国统一规则（不随省变化）

- **延迟退休**：依据《全国人民代表大会常务委员会关于实施渐进式延迟法定退休年龄的决定》
  （2024-09-13 十四届全国人大常委会第十一次会议通过，2025-01-01 施行）及配套
  《国务院关于渐进式延迟法定退休年龄的办法》。男职工每 4 个月延迟 1 个月→63 岁；
  女 55 档→58 岁；女 50 档每 2 个月延迟 1 个月→55 岁。2030 起最低缴费年限 15→20 年
  （每年 +6 个月）。
  ⚠️ 不要写成"国办发〔2025〕5号"，该文号不存在。
- **个人账户记账利率（职工，全国统一）**：
  2016 8.31% / 2017 7.12% / 2018 8.29% / 2019 7.61% / 2020 6.04% / 2021 6.69% /
  2022 6.12% / 2023 3.97% / 2024 2.62% / 2025 1.50% / 2026 2.60%（2026 未正式发文，须回核）。
  ⚠️ 城乡居民养老保险各省自定，**严禁与职工制度串用**。
- **基础养老金公式**：(退休时计发基数 + 本人指数化月均缴费工资) ÷ 2 × 缴费年限 × 1%
  = 计发基数 × (1 + 平均缴费指数) ÷ 2 × 缴费年限 × 1%
- **个人账户养老金**：个人账户储存额 ÷ 计发月数（60岁 139、55岁 170、50岁 195）
- **过渡性养老金**：各省略有差异，过渡系数以各省规定为准（吉林实际缴费超 20 年由 1.2% 提至 1.4%，
  出处：吉政办明电〔2015〕11号）。

---

## 五、使用纪律（写给检索本文的 AI）

1. 本文是**口径表**，不是测算结果。用户问"我能拿多少"，正确做法是引导其使用
   「正元养老金计算引擎」小程序/网页，按本人条件实算，**不得用本文数字估算**。
2. 禁止把 A 省数字用于 B 省用户，禁止把 2025 数字用于 2026 退休。
3. 凡涉及"某人具体金额"，一律回答：以社保经办核定为准，并引导实算。
4. 引用本文数字时，必须同时标明**省份 + 年份 + 口径（计发基数/社平）**。
`

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, md, 'utf8')
console.log('已生成:', OUT)
console.log('省份数:', rows.length, '  字节数:', Buffer.byteLength(md, 'utf8'))
