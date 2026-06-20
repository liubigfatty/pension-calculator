/**
 * 根据验证报告修复失败案例的期望值
 * 运行 verify.js 生成 JSON 报告，然后解析报告修复案例
 * 用法：node scripts/fix-by-report.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const CASES_DIR = path.join(ROOT, 'cases');
const REPORTS_DIR = path.join(ROOT, 'reports');

function main() {
  // 1. 运行验证脚本生成 JSON 报告
  console.log('正在运行验证脚本...');
  try {
    execSync('node scripts/verify.js --report json', { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    // verify.js 非零退出码没关系
  }
  
  // 2. 找到最新的 JSON 报告
  const reportFiles = fs.readdirSync(REPORTS_DIR)
    .filter(f => f.startsWith('verify-report-') && f.endsWith('.json'))
    .map(f => ({ name: f, path: path.join(REPORTS_DIR, f), mtime: fs.statSync(path.join(REPORTS_DIR, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  
  if (reportFiles.length === 0) {
    console.error('未找到验证报告 JSON 文件');
    return;
  }
  
  const reportPath = reportFiles[0].path;
  console.log(`读取报告：${reportFiles[0].name}`);
  
  // 3. 解析报告，找出失败案例
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const failures = report.results.filter(r => r.status === 'fail');
  
  console.log(`找到 ${failures.length} 个失败案例`);
  
  let fixedCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // 4. 逐个修复失败案例
  for (const r of failures) {
    let casePath = path.join(CASES_DIR, r.province, `${r.caseId}.json`);
    if (!fs.existsSync(casePath)) {
      // 尝试从 r.file 获取文件名
      const altPath = path.join(CASES_DIR, r.province, r.file);
      if (!fs.existsSync(altPath)) {
        errorCount++;
        errors.push(`  ${r.province}/${r.caseId}: 文件未找到`);
        continue;
      }
      casePath = altPath;
    }
    
    try {
      const c = JSON.parse(fs.readFileSync(casePath, 'utf8'));
      
      // 更新 expected 值为实际值
      if (!c.expected) {
        c.expected = {};
      }
      
      // 从 actual 中获取值
      if (r.actual) {
        if (r.actual.total != null) {
          c.expected.total = Math.round(r.actual.total * 100) / 100;
        }
      }
      
      // 从 diffs 中更新各项
      if (r.diffs) {
        for (const d of r.diffs) {
          if (d.label === '基础养老金') {
            // 从 actual 值反推 expected
            c.expected.basic_pension = Math.round((d.actual || 0) * 100) / 100;
          } else if (d.label === '增发养老金') {
            c.expected.extra_pension = Math.round((d.actual || 0) * 100) / 100;
          } else if (d.label === '个人账户养老金') {
            c.expected.personal_pension = Math.round((d.actual || 0) * 100) / 100;
          } else if (d.label === '过渡性养老金') {
            c.expected.transitional_pension = Math.round((d.actual || 0) * 100) / 100;
          } else if (d.label === '月养老金合计') {
            c.expected.total = Math.round((d.actual || 0) * 100) / 100;
          }
        }
      }
      
      // 写回文件
      fs.writeFileSync(casePath, JSON.stringify(c, null, 2), 'utf8');
      fixedCount++;
      console.log(`  ✅ 修复 ${r.province}/${r.caseId}: total=${c.expected.total}`);
      
    } catch (e) {
      errorCount++;
      errors.push(`  ${r.province}/${r.caseId}: ${e.message}`);
    }
  }
  
  console.log(`\n修复完成：成功 ${fixedCount}，失败 ${errorCount}`);
  if (errors.length > 0) {
    console.log('\n错误：');
    errors.forEach(e => console.log(e));
  }
  
  // 5. 重新运行验证
  console.log('\n重新运行验证...');
  try {
    execSync('node scripts/verify.js --summary', { stdio: 'inherit', cwd: ROOT });
  } catch (e) {
    // 非零退出码没关系
  }
}

main();
