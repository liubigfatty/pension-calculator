// 主程序 AI SKILL 原子接口回归测试（node 直跑，不依赖 wx）
// 覆盖：省份识别 / 人员类型解析 / 引擎调用 / handoff 结构 / 数值合理 / 异常分支
const fs = require('fs');
const path = require('path');
const ROOT = fs.realpathSync(process.cwd());
const calc = require(path.join(ROOT, 'miniprogram', 'ai', 'pension-calc-skill', 'apis', 'calculatePension.js'));

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }

(async () => {
  // ① 正常：吉林企业职工男，中文省名
  console.log('① 吉林企业男（中文省名）');
  let r = await calc({ province: '吉林省', personType: '企业男', birthDate: '1975-02', workStartDate: '1998-07', averageIndex: 1.0 });
  ok(r.isError === false, '成功计算');
  ok(r.structuredContent.province === '吉林', '省份=吉林');
  ok(/岁/.test(r.structuredContent.retireAge), '退休年龄含"岁"：' + r.structuredContent.retireAge);
  ok(/年\d+月/.test(r.structuredContent.retireDate), '退休时间格式：' + r.structuredContent.retireDate);
  ok(r.structuredContent.monthlyPension > 1000, '月养老金合理：' + r.structuredContent.monthlyPension);
  ok(typeof r.handoff === 'function', 'handoff 是函数');
  const ho = r.handoff();
  ok(ho.payload && ho.payload.calcResult && ho.payload.calcResult._raw, 'handoff payload 含 _raw');
  ok(ho.payload.calcResult._raw.legal && ho.payload.calcResult._raw.legal.total != null, '_raw.legal.total 存在');
  ok(ho.payload.calcResult.provinceName === '吉林', 'payload provinceName=吉林');
  // handoff payload 必须 JSON 安全（无函数）
  let jsonSafe = true; try { JSON.stringify(ho.payload); } catch (e) { jsonSafe = false; }
  ok(jsonSafe, 'handoff payload JSON 可序列化（函数已剥离）');

  // ② slug 直传 + 灵活就业女
  console.log('② 浙江灵活女（slug 直传）');
  r = await calc({ province: 'zhejiang', personType: '灵活女', birthDate: '1978-05', workStartDate: '2005-03', averageIndex: 0.8 });
  ok(r.isError === false, '成功计算');
  ok(r.structuredContent.province === '浙江', '省份=浙江');
  ok(r.structuredContent.monthlyPension > 0, '月养老金>0：' + r.structuredContent.monthlyPension);

  // ③ 分字段（gender+identity+femaleRetireType）北京企业女55
  console.log('③ 北京企业女55（分字段）');
  r = await calc({ province: '北京', gender: '女', identity: '企业职工', femaleRetireType: '55', birthDate: '1976-08', workStartDate: '2000-01', averageIndex: 1.5 });
  ok(r.isError === false, '成功计算');
  ok(r.structuredContent.province === '北京', '省份=北京');

  // ④ retirePlan=early 走 flex 源
  console.log('④ 弹性提前退休 early');
  r = await calc({ province: '吉林', personType: '企业男', birthDate: '1975-02', workStartDate: '1998-07', averageIndex: 1.0, retirePlan: 'early' });
  ok(r.isError === false, '成功计算');
  ok(ho.payload.calcResult, 'early 分支正常');
  const hoE = r.handoff();
  ok(hoE.payload.calcResult.retirePlan === 'early', 'payload.retirePlan=early');

  // ⑤ 异常：未知省份
  console.log('⑤ 异常分支');
  r = await calc({ province: '火星省', personType: '企业男', birthDate: '1975-02', workStartDate: '1998-07', averageIndex: 1.0 });
  ok(r.isError === true, '未知省份报错');
  // 缺出生年月
  r = await calc({ province: '吉林', personType: '企业男', workStartDate: '1998-07', averageIndex: 1.0 });
  ok(r.isError === true, '缺出生年月报错');
  // 缺指数
  r = await calc({ province: '吉林', personType: '企业男', birthDate: '1975-02', workStartDate: '1998-07' });
  ok(r.isError === true, '缺平均指数报错');

  // ⑥ 31 省全覆盖冒烟（都能算出正数养老金）
  console.log('⑥ 31 省冒烟');
  const { SLUGS } = require(path.join(ROOT, 'miniprogram', 'ai', 'pension-calc-skill', 'engine', 'provinces-index.js'));
  let smokeFail = [];
  for (const s of SLUGS) {
    const rr = await calc({ province: s, personType: '企业男', birthDate: '1975-02', workStartDate: '1998-07', averageIndex: 1.0 });
    if (rr.isError || !(rr.structuredContent.monthlyPension > 0)) smokeFail.push(s);
  }
  ok(smokeFail.length === 0, '31 省均算出正数养老金' + (smokeFail.length ? '（失败：' + smokeFail.join(',') + '）' : '（' + SLUGS.length + '省）'));

  console.log('\n===== 结果：' + pass + ' 通过 / ' + fail + ' 失败 =====');
  process.exit(fail ? 1 : 0);
})();
