// 验证云端 calculate 副本的重庆独生子女增发修复
// 新人（1998-07 参工，无建账前年限）→ specialAddition 应为 0/不存在
// 中人（1990 参工，有建账前年限）→ specialAddition 应为 基础×3%
const path = require('path')
const liveDir = path.resolve(__dirname, '../_verify_dl/calculate_live')
const mod = require(path.join(liveDir, 'index.js'))

async function run(label, event) {
  const res = await mod.main(event)
  if (!res.success) {
    console.log(`【${label}】FAIL: ${res.message}`)
    return
  }
  const legal = res.data.legal
  const sa = legal && legal.specialAddition ? legal.specialAddition.amount : 0
  const base = legal ? legal.basicPension.amount : 0
  const trans = legal && legal.transitionalPension ? legal.transitionalPension.amount : 0
  console.log(`【${label}】transPension=${trans.toFixed(2)} oneChild增发=${sa.toFixed(2)} 基础养老金=${base.toFixed(2)} 总额=${legal.total.toFixed(2)}`)
  return { sa, trans, base, total: legal.total }
}

;(async () => {
  console.log('=== 云端 calculate 副本 · 重庆独生子女增发验证 ===')
  const newPerson = await run('新人 1998-07参工 oneChild=true', {
    province: 'chongqing', gender: 'male', birthDate: '1978-07', workStartDate: '1998-07',
    averageIndex: 1.0, extras: { oneChild: true },
  })
  const newPersonOff = await run('新人 1998-07参工 oneChild=false', {
    province: 'chongqing', gender: 'male', birthDate: '1978-07', workStartDate: '1998-07',
    averageIndex: 1.0, extras: { oneChild: false },
  })
  const midPerson = await run('中人 1990参工 oneChild=true', {
    province: 'chongqing', gender: 'male', birthDate: '1970-07', workStartDate: '1990-07',
    averageIndex: 1.0, extras: { oneChild: true },
  })
  const midPersonOff = await run('中人 1990参工 oneChild=false', {
    province: 'chongqing', gender: 'male', birthDate: '1970-07', workStartDate: '1990-07',
    averageIndex: 1.0, extras: { oneChild: false },
  })

  console.log('\n=== 判定 ===')
  const newDiff = Math.abs(newPerson.total - newPersonOff.total)
  const midDiff = Math.abs(midPerson.total - midPersonOff.total)
  console.log(`新人：oneChild 开/关 总额差 = ${newDiff.toFixed(2)} （应为 0.00 ✅ 新人不享受）`)
  console.log(`中人：oneChild 开/关 总额差 = ${midDiff.toFixed(2)} （应 >0，且 ≈ 基础×3% ✅ 中人保留）`)
  if (newDiff < 0.01 && midDiff > 0.01) {
    console.log('✅ 云端修复生效：新人归零 / 中人保留，符合重庆政策')
  } else {
    console.log('❌ 云端修复异常，需排查')
  }
})()
