// 批量修复 .js 文件中的 trailing comma（云函数环境不支持）
const fs = require('fs')
const path = require('path')

const DIR = path.join(__dirname, 'cloudfunctions/calculate/provinces')

const files = [
  'anhui.js', 'fujian.js', 'guangdong.js', 'hebei.js',
  'henan.js', 'hubei.js', 'sichuan.js', 'zhejiang.js'
]

let fixed = 0

for (const f of files) {
  const filePath = path.join(DIR, f)
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  // 删除 trailing comma（对象、数组、函数参数）
  // 模式：逗号 + 空白 + 闭合括号（}/]/)）
  content = content.replace(/,(\s*[\}\]\)])/g, '$1')

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ 修复: ${f}`)
    fixed++
  } else {
    console.log(`⚠️  无变化: ${f}（可能需要手动修复）`)
  }
}

console.log(`\n共修复 ${fixed} 个文件`)
