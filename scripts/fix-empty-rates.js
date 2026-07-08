/**
 * 批量修复 9 个空省 interest_rates + 检查海南/黑龙江
 * 
 * 空省（interest_rates: {}）：
 *   重庆/贵州/江苏/江西/内蒙古/宁夏/青海/新疆/西藏
 * 
 * 补齐策略：写入 1996-2015 剪刀财经历史利率
 * （2016+ 由引擎 UNIFIED_INTEREST_RATES 统一覆盖）
 */

const fs = require('fs')
const path = require('path')

const PROVINCES_DIR = path.join(__dirname, '..', 'provinces')

// 剪刀财经 1996-2015 历史记账利率（用于补齐空省）
const PRE2016_RATES = {
  1996: 0.0804, 1997: 0.0567, 1998: 0.0447, 1999: 0.0225, 2000: 0.0225,
  2001: 0.0225, 2002: 0.0225, 2003: 0.0198, 2004: 0.0198, 2005: 0.0225,
  2006: 0.0252, 2007: 0.0414, 2008: 0.0414, 2009: 0.0225, 2010: 0.0225,
  2011: 0.0350, 2012: 0.0350, 2013: 0.0300, 2014: 0.0350, 2015: 0.0350
}

// 9个已知空省
const EMPTY_PROVINCES = [
  'chongqing', 'guizhou', 'jiangsu', 'jiangxi',
  'neimenggu', 'ningxia', 'qinghai', 'xinjiang', 'xizang'
]

// 需要检查自定义数据的省
const CHECK_PROVINCES = ['hainan', 'heilongjiang']

console.log('═'.repeat(70))
console.log('9 空省利率补齐 + 海南/黑龙江检查')
console.log('═'.repeat(70))
console.log()

// ─── 1) 补齐 9 个空省 ──────────────────────────────>
let fixedCount = 0
for (const slug of EMPTY_PROVINCES) {
  const filePath = path.join(PROVINCES_DIR, `${slug}.json`)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${slug}.json 不存在，跳过`)
    continue
  }
  
  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)
  
  const ir = data.interest_rates
  const keys = ir ? Object.keys(ir) : []
  const isEmpty = !ir || keys.length === 0
  
  if (!isEmpty) {
    console.log(`ℹ️  ${slug}: 非空(${keys.length}项)，跳过`)
    continue
  }
  
  // 写入 pre2016 利率
  data.interest_rates = { ...PRE2016_RATES }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  fixedCount++
  console.log(`✅ ${slug}: 已补齐 1996-2015 共${Object.keys(PRE2016_RATES).length}年利率`)
}

console.log()
console.log(`补齐完毕：${fixedCount}/${EMPTY_PROVINCES.length} 省`)

// ─── 2) 检查海南/黑龙江 ──────────────────────────────>
console.log()
console.log('─'.repeat(70))
console.log('海南 / 黑龙江 自定义利率检查')
console.log('─'.repeat(70))

for (const slug of CHECK_PROVINCES) {
  const filePath = path.join(PROVINCES_DIR, `${slug}.json`)
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${slug}.json 不存在`)
    continue
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const ir = data.interest_rates || {}
  const years = Object.keys(ir).sort()
  
  console.log(`\n${slug} (${years.length} 年):`)
  
  // 检查是否有 >=2016 的数据（会被引擎统一表覆盖，属于死数据）
  const deadData = years.filter(y => parseInt(y) >= 2016)
  if (deadData.length > 0) {
    console.log(`  ⚠️  含 ${deadData.length} 年>=2016数据（被UNIFIED_INTEREST_RATES覆盖=死数据）:`)
    for (const y of deadData) {
      console.log(`    ${y}: ${(ir[y] * 100).toFixed(2)}%`)
    }
  }
  
  // 显示 <2016 的有效数据
  const liveData = years.filter(y => parseInt(y) < 2016)
  if (liveData.length > 0) {
    console.log(`  ✅ 有效历史数据(${liveData.length}年<2016):`)
    for (const y of liveData.slice(0, 5)) {
      console.log(`    ${y}: ${(ir[y] * 100).toFixed(2)}%`)
    }
    if (liveData.length > 5) console.log(`    ... 等${liveData.length}年`)
  } else {
    console.log(`  ℹ️  无<2016历史数据，将走UNIFIED_INTEREST_RATES`)
  }
}

console.log()
console.log('═'.repeat(70))
console.log('全部完成')
