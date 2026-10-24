/**
 * 2026-10-09 订正：四川/云南案例补字段（纯文本按行插入，保留各行原始行尾）
 *
 * 背景：引擎四川增发养老金改为「默认不持证、不加发」（川劳社发〔2006〕18号 第五十条
 *       须持《独生子女父母光荣证》）。这 4 个四川案例的 notes 均写明
 *       「月增发养老金 X（指数化工资×0.1%×年限）」⇒ 该人**确实持证**，补 oneChild:true。
 *
 *       云南 4 号：notes 明写「独生子女补贴=2023年全省退休人员月平均基本养老金3431×5%
 *       （2024/2025年数据尚未公布，暂用2023年值）」——这是核定当时的真实口径，
 *       引擎默认已更新为 2024 年度 3553 ⇒ 给该 case 显式注入 3431 以保持核定表原貌。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

function patchLine(file, anchorRe, insertLine, marker) {
  const abs = path.join(ROOT, file)
  const raw = fs.readFileSync(abs, 'utf8')
  if (raw.includes(marker)) {
    console.log('  ⏭  已存在，跳过:', file)
    return false
  }
  const lines = raw.split(/\r?\n/)
  // 保留原始行尾：探测首行使用的换行符
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (anchorRe.test(lines[i])) { idx = i; break }
  }
  if (idx < 0) { console.log('  ❌ 未找到锚点:', file); return false }
  const indent = (lines[idx].match(/^\s*/) || [''])[0]
  lines.splice(idx, 0, indent + insertLine)
  fs.writeFileSync(abs, lines.join(eol), 'utf8')
  console.log('  ✅ 插入:', file, '→', indent + insertLine)
  return true
}

console.log('=== 四川：补 oneChild:true（持证，0.1% 增发档）===')
for (const f of ['1', '3', '4', 'chengdu-woman-2007-2026']) {
  patchLine('cases/sichuan/' + f + '.json', /^(\s*)"expected":\s*\{/, '"oneChild": true,', '"oneChild"')
}

console.log('=== 云南 4 号：注入核定当时的独子基数 3431 ===')
patchLine(
  'cases/yunnan/4.json',
  /^(\s*)"expected":\s*\{/,
  '"one_child_avg_pension": 3431,',
  '"one_child_avg_pension"'
)

console.log('\n完成。请跑 node scripts/run-cases.js 验证。')
