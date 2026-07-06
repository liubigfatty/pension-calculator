// test-engine-estimate.js
// 直接调用引擎，看估算逻辑

const engine = require('./engine/pension-engine.js')

// 模拟江西案例
const params = {
  province: 'jiangxi',
  cityType: 'prov',
  gender: 'female',
  identity: 'enterprise',
  genderType: 'ent55',  // 企业女干部55岁退休
  birthDate: '1976-02',
  workStartDate: '1998-07',
  averageIndex: 1.0,
  personalAccount: 0,  // 0 → 引擎自动估算
  extras: {},
  estimateOnly: true
}

async function test() {
  console.log('=== 测试引擎估算逻辑 ===')
  console.log('参数:', JSON.stringify(params, null, 2))
  console.log('')
  
  try {
    // 直接调用引擎的 calcPersonalAccountPension 函数
    // 需要先加载省份配置
    const provinceModule = require(`./data/provinces/${params.province}.js`)
    
    console.log('江西 PROV_BASE 1998年:', provinceModule.PROV_BASE[1998])
    console.log('江西 PROV_BASE 2025年:', provinceModule.PROV_BASE[2025])
    console.log('')
    
    // 手动调用 calcPersonalAccountPension
    const config = provinceModule
    const avgIndex = params.averageIndex
    const fYear = 1998
    const fMonth = 7
    const retireDate = { year: 2026, month: 2 }  // 1976-02出生, 50岁退休 → 2026-02
    
    console.log('=== 手动计算个人账户余额 ===')
    console.log('退休日期:', retireDate.year + '-' + retireDate.month)
    console.log('')
    
    // 调用引擎的 calcPersonalAccountPension
    const result = engine.calcPersonalAccountPension(
      fYear, fMonth, avgIndex, retireDate, 'prov', config
    )
    
    console.log('引擎估算结果:', result)
    console.log('')
    
    // 打印每年用的缴费基数
    console.log('=== 引擎每年用的缴费基数 ===')
    for (let y = fYear; y <= retireDate.year; y++) {
      const base = engine.getBase('prov', y, config)
      if (base) {
        console.log(`${y}: ${base} 元/月`)
      }
    }
    
  } catch (err) {
    console.error('错误:', err.message)
    console.error(err.stack)
  }
}

test()
