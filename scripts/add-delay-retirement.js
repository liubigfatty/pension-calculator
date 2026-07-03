/**
 * 批量为各省 .js 文件添加 delay_retirement 配置
 * 插入到 getEngineConfig() 的 return 对象中
 *
 * 延迟退休配置(fw55 → female_worker):
 *   base_year: 1970, step: 4, cap_months: 36
 *
 * 跳过 jilin.js（已手动添加过）
 */
const fs = require('fs')
const path = require('path')

const PROVINCES_DIR = path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces')
const SKIP = ['jilin'] // 已手动添加

const INSERT_TEXT = `    // 延迟退休参数（fw55 通过 delayKeyMap 映射到 female_worker）
    delay_retirement: {
      effective_date: '2025-01-01',
      female_worker: { base_year: 1970, step: 4, cap_months: 36 }
    },\n  `

const files = fs.readdirSync(PROVINCES_DIR).filter(f => f.endsWith('.js'))
let added = 0, skipped = 0

for (const file of files) {
  const name = file.replace('.js', '')
  if (SKIP.includes(name)) { skipped++; continue }

  const filePath = path.join(PROVINCES_DIR, file)
  let content = fs.readFileSync(filePath, 'utf8')

  // 跳过已含 delay_retirement 的
  if (content.includes('delay_retirement')) { skipped++; continue }

  // 在 return 对象的最后一行（};\n）前插入
  const idx = content.lastIndexOf('};')
  if (idx === -1) {
    console.error(`⚠️  跳过 ${file}: 找不到返回值结尾`)
    skipped++
    continue
  }

  content = content.slice(0, idx) + INSERT_TEXT + content.slice(idx)
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`✅ ${file} - delay_retirement 已添加`)
  added++
}

console.log(`\n完成: ${added} 个文件已添加, ${skipped} 个已跳过`)
