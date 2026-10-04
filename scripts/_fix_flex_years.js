/**
 * 修复「弹性提前退休」缴费年限不自洽（2026-10-04）
 *
 * 问题：engine 里 flexBasic / flexExtra / flexTrans 传的都是**原始** totalYears / actualYears
 *       （＝缴到「法定退休」时点的年限），只有 flexPersonal 用了 flexDate（＝提前时点）。
 *       ⇒ 提前退休被算成「人退了但社保还继续缴到法定年龄」，月领偏高约 6%。
 *       且返回结果里展示的 flexTotalYears（已减提前月数）压根没参与算钱。
 *
 * 修法：把 flexAdvance / flexAdjYears / flexTotalYears / flexActualYears 提前到
 *       「弹性提前退休测算」段开头定义，再把三处金额计算的年限换成 flex* 版本。
 *
 * 用法：node scripts/_fix_flex_years.js [--dry]
 * 特点：**按行处理并保留每行原始行尾**（web/engine.js 是混合换行，整文件转行尾会炸 diff）
 * 说明：docs/js/pension-engine-browser.js 由 _rebuild_browser_engine.js 生成，改完跑那个脚本。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  'engine/pension-engine.js',
  'engine.js',
  'web/engine.js',
  'docs/js/pension-engine.js',
  'docs/网页版/js/pension-engine-browser.js',
  'cloudfunctions/calculate/pension-engine.js',
];

const dry = process.argv.includes('--dry');
// 额外目标：node scripts/_fix_flex_years.js <相对ROOT的路径或绝对路径> ...
// （用于给镜像站仓库等外部副本打同一个补丁）
const extra = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (extra.length) TARGETS.length = 0;
for (const e of extra) TARGETS.push(path.isAbsolute(e) ? e : path.join(ROOT, e));

const B_FLEXMONTHS = '  const flexMonths = getRetireMonths(flexAge, config)';
const B_BASICRET = '    retireBase: flexRetBase, provBase: flexProvBase,';
const B_BASICTY = '    avgIndex: data.avgIndex, totalYears,';
const B_EXTRA = '  const flexExtra = calcExtraPension({';
const B_TRANS = '  const flexTrans = calcTransitionalPension({';
const B_RESULT = '  // ===== 构建返回结果 =====';
const B_CANFLEX = '  const canFlex = flexTotalMonths < legalTotalMonths';
const B_ADV = '  const flexAdvance = legalTotalMonths - flexTotalMonths';

const INSERT = [
  '  // 弹性退休缴费年限：提前退休＝从退休当月起停缴，年限比法定少 flexAdvance 个月（与展示字段同源）',
  '  const flexAdvance = legalTotalMonths - flexTotalMonths',
  '  const flexAdjYears = flexAdvance / 12',
  '  const flexTotalYears = Math.max(0, (totalYears || 0) - flexAdjYears)',
  '  const flexActualYears = Math.max(0, (actualYears || 0) - flexAdjYears)',
];

const body = (l) => l.replace(/\r?\n$/, '');
const eolOf = (l) => (/\r\n$/.test(l) ? '\r\n' : /\n$/.test(l) ? '\n' : '');
const mkLine = (s, eol) => s + eol;

function findIdx(lines, b, from = 0) {
  for (let i = from; i < lines.length; i++) if (body(lines[i]) === b) return i;
  return -1;
}

let fail = 0;
for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.log('⚠️  不存在，跳过:', rel); continue; }
  const raw = fs.readFileSync(abs, 'utf8');
  const lines = raw.match(/[^\r\n]*(?:\r\n|\n|$)/g) || [];
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  // 幂等：已改过则跳过
  const iAdv = findIdx(lines, B_ADV);
  const iFlexMonths = findIdx(lines, B_FLEXMONTHS);
  if (iAdv >= 0 && iFlexMonths >= 0 && iAdv === iFlexMonths + 1) {
    console.log('⏭  已修复，跳过:', rel);
    continue;
  }

  const errs = [];
  // —— 定位 ——
  const iFM = iFlexMonths;
  if (iFM < 0) errs.push('flexMonths 未找到');

  let iBasic = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (body(lines[i]) === B_BASICRET && body(lines[i + 1]) === B_BASICTY) { iBasic = i + 1; break; }
  }
  if (iBasic < 0) errs.push('flexBasic 年限行未找到');

  const iExtra = findIdx(lines, B_EXTRA);
  if (iExtra < 0) errs.push('flexExtra 未找到');
  const iTrans = findIdx(lines, B_TRANS);
  if (iTrans < 0) errs.push('flexTrans 未找到');

  const iResult = findIdx(lines, B_RESULT);
  if (iResult < 0) errs.push('构建返回结果段未找到');

  if (errs.length) { console.log('❌', rel, '|', errs.join('; ')); fail++; continue; }

  // 在 flex* 块后 8 行内找 actualYears / totalYears
  function pickYears(start) {
    let ia = -1, it = -1;
    for (let i = start + 1; i < Math.min(start + 9, lines.length); i++) {
      const b = body(lines[i]);
      if (b === '    actualYears,' && ia < 0) ia = i;
      else if (b === '    totalYears,' && it < 0) it = i;
    }
    return [ia, it];
  }
  const [iaE, itE] = pickYears(iExtra);
  const [iaT, itT] = pickYears(iTrans);
  if (iaE < 0 || itE < 0) errs.push('flexExtra 内年限行未找到');
  if (iaT < 0 || itT < 0) errs.push('flexTrans 内年限行未找到');
  if (errs.length) { console.log('❌', rel, '|', errs.join('; ')); fail++; continue; }

  // —— 执行（从后往前改，避免索引漂移）——
  const out = lines.slice();
  const todo = [];
  // 5) 删除重复定义（构建返回结果段中的 5 行：注释 + flexAdvance + flexAdjYears + 两个年限）
  const DEL_BODIES = [
    '  // 弹性退休年限调整：提前退休意味着少缴费 flexAdvance 个月',
    B_ADV,
    '  const flexAdjYears = flexAdvance / 12',
    '  const flexTotalYears = Math.max(0, (totalYears || 0) - flexAdjYears)',
    '  const flexActualYears = Math.max(0, (actualYears || 0) - flexAdjYears)',
  ];
  for (let i = iResult + 1; i < Math.min(iResult + 8, out.length); i++) {
    if (DEL_BODIES.includes(body(out[i]))) todo.push(i);
  }
  if (todo.length !== DEL_BODIES.length) {
    console.log('❌', rel, `| 待删行数 ${todo.length}≠${DEL_BODIES.length}`);
    fail++; continue;
  }
  // 4) flexTrans
  todo.push(iaT, itT);
  // 3) flexExtra
  todo.push(iaE, itE);
  // 2) flexBasic
  todo.push(iBasic);

  const setMap = new Map();
  setMap.set(iaT, '    actualYears: flexActualYears,');
  setMap.set(itT, '    totalYears: flexTotalYears,');
  setMap.set(iaE, '    actualYears: flexActualYears,');
  setMap.set(itE, '    totalYears: flexTotalYears,');
  setMap.set(iBasic, '    avgIndex: data.avgIndex, totalYears: flexTotalYears,');

  const delSet = new Set(todo.filter((i) => !setMap.has(i)));
  for (const [i, s] of setMap) out[i] = mkLine(s, eolOf(lines[i]));
  const final = out.filter((_, i) => !delSet.has(i));

  // 1) 插入弹性年限定义
  const insAt = final.findIndex((l) => body(l) === B_FLEXMONTHS);
  if (insAt < 0) { console.log('❌', rel, '| 插入定位失败'); fail++; continue; }
  const insEol = eolOf(final[insAt]) || '\n';
  final.splice(insAt + 1, 0, ...INSERT.map((s) => mkLine(s, insEol)));

  const text = final.join('');
  if (!dry) {
    const bak = abs + '.bak-flex-' + Date.now();
    fs.copyFileSync(abs, bak);
    fs.writeFileSync(abs, text, 'utf8');
  }
  const crlf = (text.match(/\r\n/g) || []).length;
  console.log((dry ? '[dry] ✅ ' : '✅ 已修复 ') + rel,
    `| 改${setMap.size}行 删${delSet.size}行 插${INSERT.length}行 | CRLF=${crlf}/${(text.match(/\n/g) || []).length}`);
}

console.log(fail ? `\n❌ ${fail} 个文件未处理` : '\n🎉 全部处理完成');
process.exit(fail ? 1 : 0);
