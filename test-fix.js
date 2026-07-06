/**
 * 测试江西案例：1998年7月工作，2026年2月退休，指数1.0
 * 验证修复后的个人账户余额计算
 */
const fs = require('fs');
const path = require('path');

// 加载引擎
const engine = require('./engine/pension-engine.js');

// 加载江西配置
const jiangxiPath = path.join(__dirname, 'provinces', 'jiangxi.json');
const config = JSON.parse(fs.readFileSync(jiangxiPath, 'utf8'));

console.log('=== 江西案例测试（修复后）===');
console.log('工作日期: 1998.07');
console.log('退休日期: 2026.02');
console.log('平均缴费指数: 1.0');
console.log('');

// 直接调用calcPersonalAccountPension
const city = 'prov';
const avgIndex = 1.0;
const retireDate = { year: 2026, month: 2 };
const startInfo = {
  accountStart: { year: 1996, month: 1 },
  actualStart: { year: 1998, month: 7 }
};
const months = 195;

const result = engine.calcPersonalAccountPension(city, avgIndex, retireDate, startInfo, config, months, null);

console.log('计算结果:');
console.log('- 个人账户余额:', result.balance.toLocaleString(), '元');
console.log('- 个人账户养老金:', result.amount.toFixed(2), '元/月');
console.log('');
console.log('计算描述:');
console.log(result.description);
console.log('');

// 验证合理性
console.log('=== 合理性检查 ===');
const years = 27.58;
const avgMonthlyPay = result.balance / years / 12;
console.log('年均个人账户存入:', (result.balance / years).toFixed(0), '元/年');
console.log('月均个人账户存入:', avgMonthlyPay.toFixed(0), '元/月');
console.log('');
console.log('参考值：');
console.log('- 1998年缴费基数约2000元/年，个人缴费8% = 160元/年');
console.log('- 2025年缴费基数约7054×12=84648元/年，个人缴费8% = 6772元/年');
console.log('- 27年累计缴费（不计利息）约: (160+6772)/2 × 27 = 93672元');
console.log('- 加上利息，合理范围: 9-15万元');
