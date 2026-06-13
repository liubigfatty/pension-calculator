const fs = require('fs');
const path = require('path');

const casesDir = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cases';

const provinces = [
  'anhui','beijing','fujian','gansu','guangdong','guizhou','hebei','heilongjiang',
  'hennan','hubei','hunan','jiangsu','jiangxi','jilin','liaoning','ningxia',
  'qinghai','shaanxi','shandong','shanghai','shanxi','sichuan','tianjin','xizang',
  'yunnan','zhejiang'
];

const results = [];

for (const province of provinces) {
  const dir = path.join(casesDir, province);
  if (!fs.existsSync(dir)) continue;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const j = JSON.parse(content);
      
      // 提取性别
      let gender = j.gender || j.sex || j.参保人员性别 || '';
      if (!gender && j.calculation_parameters) {
        gender = j.calculation_parameters.gender || j.calculation_parameters.sex || '';
      }
      
      // 提取退休类型
      let retireType = j.retirement_type || j.retire_type || j.退休类型 || '';
      
      // 提取退休年龄
      let retireAge = j.retire_age || j.retirement_age || '';
      if (!retireAge && j.calculation_parameters) {
        retireAge = j.calculation_parameters.retire_age || j.calculation_parameters.retirement_age || '';
      }
      
      // 验证状态
      const verified = j.verified === true;
      
      results.push({
        province,
        file,
        gender: String(gender).replace(/[男Mm]/, '男').replace(/[女Ff]/, '女') || '?',
        retireType: retireType || '?',
        retireAge: retireAge || '?',
        verified
      });
    } catch (e) {
      results.push({ province, file, gender: '?', retireType: '?', retireAge: '?', verified: false, error: e.message });
    }
  }
}

// 输出CSV格式
console.log('省份,文件,性别,退休类型,退休年龄,已验证');
for (const r of results) {
  console.log(`${r.province},${r.file},${r.gender},${r.retireType},${r.retireAge},${r.verified ? '✅' : '❌'}`);
}
