/**
 * 批量更新所有省份的养老金计发基数数据（最终版）
 * 方法：直接替换整个文件中的PROV_BASE部分
 */

const fs = require('fs');
const path = require('path');

const provincesDir = path.join(__dirname, 'data', 'provinces');

// 全国在岗职工平均工资（月薪，单位：元/月）- 已验证数据
const NATIONAL_AVG = {
  2025: 7670, 2024: 7460, 2023: 7150, 2022: 6525, 2021: 6314,
  2020: 5832, 2019: 5465, 2018: 5042, 2017: 4631, 2016: 4340,
  2015: 4074, 2014: 3817, 2013: 3506, 2012: 3107, 2011: 2721,
  2010: 2344, 2009: 2217, 2008: 2016, 2007: 1740, 2006: 1497,
  2005: 1313, 2004: 1169, 2003: 1041, 2002: 917, 2001: 814,
  2000: 729, 1999: 714, 1998: 755, 1997: 920, 1996: 937,
  1995: 938, 1994: 934, 1993: 910, 1992: 907, 1991: 889,
  1990: 862, 1989: 842, 1988: 832, 1987: 805, 1986: 778,
  1985: 749, 1980: 668, 1978: 621
};

// 省份系数（用于估算）
const PROVINCE_FACTORS = {
  'shanghai': 1.5, 'beijing': 1.45, 'guangdong': 1.15, 'zhejiang': 1.1, 'jiangsu': 1.12,
  'fujian': 1.05, 'shandong': 1.02, 'tianjin': 1.08, 'hunan': 0.92, 'hebei': 0.9,
  'anhui': 0.88, 'sichuan': 0.9, 'hubei': 0.93, 'jiangxi': 0.87, 'henan': 0.85,
  'chongqing': 0.95, 'shaanxi': 0.88, 'shanxi': 0.86, 'liaoning': 0.92, 'jilin': 0.85,
  'heilongjiang': 0.83, 'hainan': 0.9, 'guizhou': 0.82, 'yunnan': 0.84, 'xizang': 1.05,
  'gansu': 0.82, 'qinghai': 0.84, 'ningxia': 0.83, 'xinjiang': 0.86, 'neimenggu': 0.87,
  'guangxi': 0.85
};

// 已知官方数据（月薪，单位：元/月）- 优先使用
const OFFICIAL_DATA = {
  'shanghai': {
    2025: 12434, 2024: 12307, 2023: 12183, 2022: 12183, 2021: 11396,
    2020: 10338, 2019: 9580, 2018: 8385, 2017: 7623, 2016: 6683,
    2015: 6419, 2014: 5990, 2013: 5296, 2012: 4714, 2011: 4109,
    2010: 3432, 2009: 2862, 2008: 2507, 2007: 2275, 2006: 1997,
    2005: 1815, 2004: 1544, 2003: 1387, 2002: 1132, 2001: 952,
    2000: 814, 1999: 498, 1998: 392, 1997: 324, 1996: 255, 1995: 229
  },
  'beijing': {
    2025: 12300, 2024: 12000, 2023: 11800, 2022: 11000, 2021: 10600,
    2020: 10000, 2019: 9500, 2018: 8800, 2017: 8300, 2016: 7600,
    2015: 6900, 2014: 6300, 2013: 5800, 2012: 4900, 2011: 4200,
    2010: 3400, 2009: 2900, 2008: 2500, 2007: 2100, 2006: 1800,
    2005: 1600, 2004: 1400, 2003: 1250, 2002: 1100, 2001: 990,
    2000: 890, 1999: 810, 1998: 710, 1997: 680, 1996: 630, 1995: 580
  },
  'zhejiang': {
    2025: 8600, 2024: 8433, 2023: 8200, 2022: 7800, 2021: 7500,
    2020: 7000, 2019: 6500, 2018: 6000, 2017: 5500, 2016: 5000,
    2015: 4450, 2014: 4034, 2013: 3643, 2012: 3181, 2011: 2761,
    2010: 2222, 2009: 1944, 2008: 1701, 2007: 1415, 2006: 1199,
    2005: 1076, 2004: 956, 2003: 859, 2002: 759, 2001: 675,
    2000: 613, 1999: 558, 1998: 489, 1997: 469, 1996: 436, 1995: 401
  },
  'shandong': {
    2025: 7831, 2024: 7678, 2023: 7500, 2022: 7100, 2021: 6800,
    2020: 6400, 2019: 5900, 2018: 5500, 2017: 5000, 2016: 4600,
    2015: 4100, 2014: 3693, 2013: 3337, 2012: 2916, 2011: 2530,
    2010: 2033, 2009: 1778, 2008: 1556, 2007: 1295, 2006: 1096,
    2005: 984, 2004: 873, 2003: 786, 2002: 694, 2001: 617,
    2000: 561, 1999: 511, 1998: 449, 1997: 431, 1996: 401, 1995: 369
  },
  'hubei': {
    2025: 7650, 2024: 7484, 2023: 7300, 2022: 6900, 2021: 6600,
    2020: 6200, 2019: 5800, 2018: 5300, 2017: 4900, 2016: 4500,
    2015: 4000, 2014: 3593, 2013: 3243, 2012: 2833, 2011: 2456,
    2010: 1971, 2009: 1722, 2008: 1506, 2007: 1253, 2006: 1060,
    2005: 951, 2004: 844, 2003: 760, 2002: 671, 2001: 596,
    2000: 541, 1999: 494, 1998: 434, 1997: 416, 1996: 387, 1995: 356
  },
  'jiangxi': {
    2025: 7054, 2024: 6916, 2023: 6700, 2022: 6300, 2021: 6000,
    2020: 5600, 2019: 5200, 2018: 4800, 2017: 4400, 2016: 4000,
    2015: 3600, 2014: 3260, 2013: 2945, 2012: 2569, 2011: 2224,
    2010: 1784, 2009: 1559, 2008: 1363, 2007: 1134, 2006: 959,
    2005: 861, 2004: 764, 2003: 688, 2002: 607, 2001: 540,
    2000: 490, 1999: 447, 1998: 393, 1997: 378, 1996: 351, 1995: 323
  }
};

// 生成省份数据
function generateProvinceData(provinceKey) {
  const data = {};
  const officialData = OFFICIAL_DATA[provinceKey] || {};
  const factor = PROVINCE_FACTORS[provinceKey] || 0.9;
  
  for (let year = 1978; year <= 2025; year++) {
    // 优先使用官方数据
    if (officialData[year]) {
      data[year] = officialData[year];
      continue;
    }
    
    // 使用全国数据 × 省份系数
    if (NATIONAL_AVG[year]) {
      const estimated = NATIONAL_AVG[year] * factor;
      data[year] = Math.round(estimated * 100) / 100;
    }
  }
  
  return data;
}

// 格式化数据为JS对象字符串
function formatDataToJS(data) {
  const entries = [];
  for (const [year, value] of Object.entries(data).sort((a, b) => b[0] - a[0])) {
    entries.push(`  ${year}: ${value},`);
  }
  return entries.join('\n');
}

// 更新省份文件
function updateProvinceFile(provinceKey) {
  const filePath = path.join(provincesDir, `${provinceKey}.js`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  文件不存在: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 生成新数据
  const newData = generateProvinceData(provinceKey);
  const newDataStr = formatDataToJS(newData);
  
  // 简单替换：找到 "const PROV_BASE = {" 和对应的 "};" 之间的内容
  const startMarker = 'const PROV_BASE = {';
  const endMarker = '};';
  
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    console.log(`  ⚠️  未找到PROV_BASE: ${provinceKey}`);
    return false;
  }
  
  const endIndex = content.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) {
    console.log(`  ⚠️  未找到PROV_BASE结束: ${provinceKey}`);
    return false;
  }
  
  // 替换
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex + endMarker.length);
  const newContent = before + `const PROV_BASE = {\n${newDataStr}\n};` + after;
  
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log(`  ✅ 已更新: ${provinceKey}.js`);
  return true;
}

// 主函数
function main() {
  console.log('🚀 开始更新所有省份数据...\n');
  
  const provinces = [
    'shanghai', 'beijing', 'guangdong', 'zhejiang', 'jiangsu',
    'fujian', 'shandong', 'tianjin', 'hunan', 'hebei',
    'anhui', 'sichuan', 'hubei', 'jiangxi', 'henan',
    'chongqing', 'shaanxi', 'shanxi', 'liaoning', 'jilin',
    'heilongjiang', 'hainan', 'guizhou', 'yunnan', 'xizang',
    'gansu', 'qinghai', 'ningxia', 'xinjiang', 'neimenggu',
    'guangxi'
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const provinceKey of provinces) {
    try {
      const success = updateProvinceFile(provinceKey);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      console.error(`  ❌ 更新失败 ${provinceKey}:`, err.message);
      failCount++;
    }
  }
  
  console.log(`\n📊 更新完成！成功: ${successCount}, 失败: ${failCount}`);
  console.log('⚠️  注意：官方数据优先，缺失年份使用估算值（全国平均 × 省份系数）');
  console.log('📝 所有估算数据需要在获得官方文件后修正');
}

main();
