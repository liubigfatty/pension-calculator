// 验证 AI SKILL 原子接口逻辑（node 直跑，模拟微信调用）
const calc = require('../index-mini/ai/pension-index-skill/apis/calculatePensionIndex');

(async () => {
  // 测1：中文省名「吉林省」+ 合成逐年数据
  const r1 = await calc({
    province: '吉林省',
    yearlyData: [
      { year: 2020, months: 12, baseAvg: 5000 },
      { year: 2021, months: 12, baseAvg: 6000 },
      { year: 2022, months: 12, baseAvg: 7000 }
    ]
  });
  console.log('测1 吉林:', JSON.stringify(r1.structuredContent), '| isError:', r1.isError);

  // 测2：拼音代码「zhejiang」+ 断缴年(baseAvg:0)
  const r2 = await calc({
    province: 'zhejiang',
    yearlyData: [
      { year: 2019, months: 12, baseAvg: 8000 },
      { year: 2020, months: 0, baseAvg: 0 }, // 断缴
      { year: 2021, months: 12, baseAvg: 9000 }
    ]
  });
  console.log('测2 浙江(含断缴):', JSON.stringify(r2.structuredContent), '| isError:', r2.isError);

  // 测3：北京断缴应计入分母(gapYears>0)
  const r3 = await calc({
    province: '北京市',
    yearlyData: [
      { year: 2020, months: 12, baseAvg: 10000 },
      { year: 2021, months: 12, baseAvg: 0 }, // 断缴
      { year: 2022, months: 12, baseAvg: 11000 }
    ]
  });
  console.log('测3 北京(断缴计入):', JSON.stringify(r3.structuredContent), '| isError:', r3.isError);

  // 测4：未知省份
  const r4 = await calc({ province: '火星省', yearlyData: [{ year: 2020, months: 12, baseAvg: 5000 }] });
  console.log('测4 未知省:', JSON.stringify(r4.structuredContent), '| isError:', r4.isError);

  // 校验返回结构合规
  const ok = r1.isError === false && typeof r1.structuredContent.avgIndex === 'number'
    && r2.isError === false && r3.structuredContent.gapYears > 0
    && r4.isError === true;
  console.log('\n=== 全部断言通过:', ok, '===');
})();
