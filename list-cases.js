/**
 * 生成案例完整清单（不修改文件，只读取和报告）
 * 用法：node list-cases.js
 */

const fs = require('fs')
const path = require('path')

const CASES_DIR = path.join(__dirname, 'cases')

// 从文件中提取关键信息
function extractInfo(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    // 省份
    const province = raw.province || raw.region || path.basename(path.dirname(filePath))
    
    // 性别
    let gender = raw.gender || ''
    if (gender === 'male') gender = '男'
    if (gender === 'female') gender = '女'
    
    // 退休年龄
    let retireAge = ''
    if (raw.retirement_age) retireAge = String(raw.retirement_age)
    if (raw.age_at_retirement) retireAge = String(raw.age_at_retirement)
    
    // 退休类型
    const retireType = raw.retirement_type || ''
    
    // 验证状态
    const verified = raw.verified ? '✅' : '❌'
    
    // 案例ID
    const caseId = raw.case_id || path.basename(filePath, '.json')
    
    return {
      province,
      caseId,
      gender,
      retireAge,
      retireType,
      verified,
      filePath: path.relative(CASES_DIR, filePath)
    }
  } catch (e) {
    return null
  }
}

// 主流程
const provinces = fs.readdirSync(CASES_DIR)
  .filter(f => fs.statSync(path.join(CASES_DIR, f)).isDirectory())
  .filter(f => !['skip', 'extracted', 'other'].includes(f))
  .sort()

let totalCases = 0
const results = []

console.log('# 养老金计算平台 - 案例完整清单\n')
console.log('| 省份 | 案例ID | 性别 | 退休年龄 | 退休类型 | 验证状态 | 文件路径 |')
console.log('|------|--------|------|----------|----------|----------|----------|')

for (const province of provinces) {
  const dirPath = path.join(CASES_DIR, province)
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.json'))
    .sort()
  
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const info = extractInfo(filePath)
    if (info) {
      console.log(`| ${info.province} | ${info.caseId} | ${info.gender} | ${info.retireAge} | ${info.retireType} | ${info.verified} | ${info.filePath} |`)
      totalCases++
    }
  }
}

console.log('\n---\n')
console.log(`**总计**：${totalCases} 个案例`)
console.log(`**省份数**：${provinces.length} 个`)
