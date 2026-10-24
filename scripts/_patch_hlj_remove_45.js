/**
 * 黑龙江案例订正：御寒津贴 45 从月基本养老金口径中移除（2026-10-09 用户拍板）
 * 依据：真实核定表（2024-11 退休）「核定基本养老金合计」7855.30 = 基础+个账+过渡，不含 45。
 * 做法：纯文本定点替换（保留原始行尾），special_addition 45→0，total −45，notes 追加订正说明。
 */
const fs = require('fs')
const path = require('path')

const dir = path.resolve(__dirname, '../cases/heilongjiang')
const NOTE_SUFFIX =
  ' [2026-10-09 再订正] 御寒津贴45元**不计入「核定基本养老金合计」口径**（真实核定表实证：7855.30＝基础+个账+过渡，不含45），' +
  '故 special_addition 归 0、total 回退 45，与核定表口径一致。津贴本身仍按月发放，只是不并入月基本养老金计。'

let n = 0
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue
  const p = path.join(dir, f)
  let t = fs.readFileSync(p, 'utf8')
  const before = t

  // 1) special_addition: 45 → 0
  t = t.replace(/("special_addition"\s*:\s*)45(\s*[,\n])/g, (m, a, b) => a + '0' + b)

  // 2) total: X → X - 45
  t = t.replace(/"total"\s*:\s*([0-9.]+)/g, (m, v) => {
    const nv = Math.round((parseFloat(v) - 45) * 100) / 100
    return '"total": ' + nv
  })

  // 3) notes 追加订正说明（避免重复追加）
  if (t.indexOf('2026-10-09 再订正') === -1) {
    t = t.replace(/"notes"\s*:\s*"((?:[^"\\]|\\.)*)"/g, (m, inner) => {
      return '"notes": "' + inner + NOTE_SUFFIX + '"'
    })
  }

  if (t !== before) {
    fs.writeFileSync(p, t)
    n++
    console.log('✅ 已订正', f)
  } else {
    console.log('⏭  无变化', f)
  }
}
console.log('\n共处理', n, '个文件')
