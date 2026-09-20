/**
 * 引擎隐患排查 · 第 1 步：全量枚举 31 省 modules 配置
 * 目的：找出所有"无条件触发"的加发/增发/调节金项 —— 这类项会在用户未勾选任何东西时
 *       自动计入养老金，属于潜在虚高风险（用户画像无该项资格却被默认发放）。
 * 只读，不改任何文件。
 */
const path = require('path');
const root = path.resolve(__dirname, '..');
const data = require(path.join(root, 'cloudfunctions/calculate/provinces-data.js'));

const provinces = data.PROVINCE_CONFIGS || {};
const names = Object.keys(provinces);

// 判定：某个 module 是否"无条件触发"（不依赖任何用户输入即返回 >0）
function unconditionalish(mod, key) {
  if (!mod || !mod.enabled) return false;
  const t = mod.type;
  // 明确需要用户输入才生效的
  const conditionalTypes = {
    age: '需 retireAge 落档',
    hardship: '需 location 命中',
    intellectual: '需 intellectual=true',
    manual: '需 context.items 选择',
    one_child: '需 oneChild=true',
    zhengzhou_subsidy: '需 location=zz',
    shenzhen_local: '需 localYears>0',
  };
  if (conditionalTypes[t]) return false;
  // 无条件型
  if (t === 'fixed') return true;
  if (t === 'qinghai_27_doc') return true;
  if (t === 'xizang_subsidies') return true; // 西藏全员有（按地区类别）
  // 无 type 字段（走兜底返回 0）
  if (!t) return null; // 死代码
  return 'UNKNOWN:' + t;
}

const rows = [];
for (const p of names) {
  const cfg = provinces[p];
  if (!cfg) continue;
  const mods = cfg.modules || {};
  for (const [key, mod] of Object.entries(mods)) {
    if (!mod || typeof mod !== 'object') continue;
    if (!mod.enabled) continue;
    // 基础三项是"是否计入"的开关，不走 calcSpecialAddition，跳过
    if (['basic_pension', 'personal_account', 'transitional_pension'].includes(key)) continue;
    const verdict = unconditionalish(mod, key);
    rows.push({
      province: cfg.name || p,
      code: p,
      module: key,
      type: mod.type || '(无type)',
      amount: mod.amount != null ? mod.amount : (mod.xining_addition ? `${mod.xining_addition}/${mod.other_addition}` : ''),
      verdict: verdict === true ? '⚠️无条件发放' : verdict === null ? '❗死代码(无type→兜底0)' : (typeof verdict === 'string' && verdict.startsWith('UNKNOWN') ? '❓未知类型' : '✅有条件'),
    });
  }
  // 顶层特殊字段
  for (const k of ['adjustment_fund', 'minimum_pension', 'extra_pension', 'special_addition']) {
    if (cfg[k] && cfg[k].enabled && !mods[k]) {
      rows.push({ province: cfg.name || p, code: p, module: k + '(顶层)', type: cfg[k].type || '(无type)', amount: cfg[k].amount ?? '', verdict: '⚠️顶层字段，需单独核对' });
    }
  }
}

console.log('=== 31 省 modules(enabled) 全量清单 ===');
console.log('共 ' + rows.length + ' 项 enabled 模块\n');
const warn = rows.filter(r => r.verdict.startsWith('⚠️') || r.verdict.startsWith('❗') || r.verdict.startsWith('❓'));
console.log('--- 需重点排查（无条件 / 死代码 / 未知）共 ' + warn.length + ' 项 ---');
for (const r of warn) {
  console.log(`${r.province}(${r.code}) · ${r.module} · type=${r.type} · amount=${r.amount} → ${r.verdict}`);
}
console.log('\n--- 有条件项一览 ---');
for (const r of rows.filter(r => r.verdict === '✅有条件')) {
  console.log(`${r.province}(${r.code}) · ${r.module} · type=${r.type}`);
}
