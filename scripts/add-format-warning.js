/**
 * 为已生成的MD文件添加数据格式警告
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = 'C:\\Users\\14041\\养老金数据整理';

// 检查 avg_salary_history 数据格式
function checkDataFormat(avgSalaryHistory) {
  if (!avgSalaryHistory) return '无数据';
  
  const entries = Object.entries(avgSalaryHistory).filter(([k, v]) => k !== '_source');
  if (entries.length === 0) return '无数据';
  
  const values = entries.map(([k, v]) => v).filter(v => typeof v === 'number' && !isNaN(v));
  if (values.length === 0) return '数据格式错误';
  
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  // 检测格式问题：
  // 1. 如果 max > 50000，可能有元/年数据混入
  // 2. 如果 min < 500，可能数值太小
  // 3. 如果某些年份 > 5000 且某些年份 < 5000，格式可能不一致
  
  const hasHighValues = values.some(v => v > 50000);
  const hasLowValues = values.some(v => v < 500);
  
  if (hasHighValues && hasLowValues) {
    return '⚠️ 格式混乱（元/月和元/年混合）';
  } else if (hasHighValues) {
    return '⚠️ 可能为元/年格式（非元/月）';
  } else if (max > 5000) {
    return '✅ 可能为元/月格式';
  } else {
    return '⚠️ 数据值异常（过小）';
  }
}

// 主函数
async function main() {
  const provinces = [
    '北京', '天津', '上海', '重庆',
    '河北', '山西', '辽宁', '吉林', '黑龙江',
    '江苏', '浙江', '安徽', '福建', '江西', '山东',
    '河南', '湖北', '湖南', '广东', '海南',
    '四川', '贵州', '云南', '陕西', '甘肃', '青海',
    '内蒙古', '广西', '西藏', '宁夏', '新疆'
  ];
  
  let summary = '# 数据格式说明\n\n';
  summary += `> 生成时间：${new Date().toISOString().split('T')[0]}\n\n`;
  summary += `本文档说明各省份社平工资数据的格式状态。\n\n`;
  summary += `## 背景\n\n`;
  summary += `- \`avg_salary_history\` 用于个人账户养老金计算\n`;
  summary += `- 正确格式应为：**元/月**（月度平均值）\n`;
  summary += `- 部分省份数据可能存在格式混乱（元/年和元/月混合）\n\n`;
  
  summary += `## 各省份数据格式状态\n\n`;
  summary += `| 省份 | 数据状态 | 说明 |\n`;
  summary += `|------|---------|------|\n`;
  
  for (const prov of provinces) {
    const provDir = path.join(BASE_DIR, prov);
    const salaryFile = path.join(provDir, '社平工资历史数据.md');
    
    if (!fs.existsSync(salaryFile)) {
      summary += `| ${prov} | 无文件 | 社平工资文件不存在 |\n`;
      continue;
    }
    
    // 读取原始数据
    const provCode = getProvCode(prov);
    const jsonPath = path.join(__dirname, '../cloudfunctions/calculate/provinces', `${provCode}.json`);
    
    let status = '未知';
    let note = '';
    
    if (fs.existsSync(jsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        status = checkDataFormat(data.avg_salary_history);
        
        if (data.avg_salary_history) {
          const entries = Object.entries(data.avg_salary_history).filter(([k, v]) => k !== '_source');
          const values = entries.map(([k, v]) => v).filter(v => typeof v === 'number' && !isNaN(v));
          const max = Math.max(...values);
          const min = Math.min(...values);
          note = `数值范围：${min} ~ ${max}`;
        }
      } catch (e) {
        status = '⚠️ 读取失败';
        note = e.message;
      }
    } else {
      status = '无原始数据';
      note = '.json 文件不存在';
    }
    
    summary += `| ${prov} | ${status} | ${note} |\n`;
    
    // 在省文件夹的 MD 文件开头加入警告
    addWarningToMarkdown(salaryFile, status);
  }
  
  // 写入格式说明文件
  const summaryPath = path.join(BASE_DIR, '数据格式说明.md');
  fs.writeFileSync(summaryPath, summary, 'utf8');
  console.log('已生成：', summaryPath);
  
  // 同时更新"提取汇总.md"
  const summary2Path = path.join(BASE_DIR, '提取汇总.md');
  if (fs.existsSync(summary2Path)) {
    const oldContent = fs.readFileSync(summary2Path, 'utf8');
    const newContent = oldContent + '\n\n## 数据格式警告\n\n请同时参考《数据格式说明.md》文件，了解各省份数据的格式状态。\n';
    fs.writeFileSync(summary2Path, newContent, 'utf8');
    console.log('已更新：', summary2Path);
  }
}

function getProvCode(provName) {
  const map = {
    '北京': 'beijing', '天津': 'tianjin', '上海': 'shanghai', '重庆': 'chongqing',
    '河北': 'hebei', '山西': 'shanxi', '辽宁': 'liaoning', '吉林': 'jilin',
    '黑龙江': 'heilongjiang', '江苏': 'jiangsu', '浙江': 'zhejiang', '安徽': 'anhui',
    '福建': 'fujian', '江西': 'jiangxi', '山东': 'shandong', '河南': 'henan',
    '湖北': 'hubei', '湖南': 'hunan', '广东': 'guangdong', '海南': 'hainan',
    '四川': 'sichuan', '贵州': 'guizhou', '云南': 'yunnan', '陕西': 'shaanxi',
    '甘肃': 'gansu', '青海': 'qinghai', '内蒙古': 'neimenggu', '广西': 'guangxi',
    '西藏': 'xizang', '宁夏': 'ningxia', '新疆': 'xinjiang'
  };
  return map[provName] || provName;
}

function addWarningToMarkdown(filePath, status) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 检查是否已经有警告
  if (content.includes('⚠️ 数据格式警告')) return;
  
  let warning = '';
  if (status.includes('⚠️') || status.includes('格式混乱')) {
    warning = '\n> ⚠️ 数据格式警告：该省份的社平工资数据可能存在格式问题（元/月和元/年混合），请谨慎使用。\n';
  }
  
  // 在第一个 ## 之前插入警告
  const lines = content.split('\n');
  let insertPos = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      insertPos = i;
      break;
    }
  }
  
  if (insertPos >= 0) {
    lines.splice(insertPos, 0, warning + '\n');
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('  已添加警告：', filePath);
  }
}

main().catch(console.error);
