const fs = require('fs');
const OTHER = 'C:/Users/14041/WorkBuddy/pension-backup-20260516/养老金计算平台/cases/other';
const CUR = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cases';

const pyMap = {
  '北京市':'beijing','天津市':'tianjin','河北省':'hebei','山西省':'shanxi','内蒙古自治区':'neimenggu',
  '辽宁省':'liaoning','吉林省':'jilin','黑龙江省':'heilongjiang','上海市':'shanghai','江苏省':'jiangsu',
  '浙江省':'zhejiang','安徽省':'anhui','福建省':'fujian','江西省':'jiangxi','山东省':'shandong',
  '河南省':'henan','湖北省':'hubei','湖南省':'hunan','广东省':'guangdong','广西壮族自治区':'guangxi',
  '海南省':'hainan','重庆市':'chongqing','四川省':'sichuan','贵州省':'guizhou','云南省':'yunnan',
  '西藏自治区':'xizang','陕西省':'shaanxi','甘肃省':'gansu','青海省':'qinghai','宁夏回族自治区':'ningxia',
  '新疆':'xinjiang'
};
function toPy(cn){
  if (!cn) return '?';
  if (pyMap[cn]) return pyMap[cn];
  for (const k of Object.keys(pyMap)) if (cn.includes(k.replace('回族自治区','').replace('壮族自治区','').replace('维吾尔自治区','').replace('自治区',''))) return pyMap[k];
  if (cn.includes('云南')) return 'yunnan';
  if (cn.includes('宁夏')) return 'ningxia';
  if (cn.includes('贵州')) return 'guizhou';
  if (cn.includes('青海')) return 'qinghai';
  if (cn.includes('湖北')) return 'hubei';
  if (cn.includes('福建')) return 'fujian';
  if (cn.includes('陕西')) return 'shaanxi';
  if (cn.includes('西藏')) return 'xizang';
  if (cn.includes('江西')) return 'jiangxi';
  if (cn.includes('四川')) return 'sichuan';
  if (cn.includes('浙江')) return 'zhejiang';
  if (cn.includes('上海')) return 'shanghai';
  if (cn.includes('天津')) return 'tianjin';
  return '?';
}

function findNum(obj, keys){
  let res;
  (function walk(o){
    if (res !== undefined || o == null || typeof o !== 'object') return;
    for (const k in o){
      if (keys.includes(k) && typeof o[k] === 'number'){ res = o[k]; return; }
      if (typeof o[k] === 'object') walk(o[k]);
    }
  })(obj);
  return res;
}
function hasKey(obj, keys){
  let res = false;
  (function walk(o){
    if (res || o == null || typeof o !== 'object') return;
    for (const k in o){
      if (keys.includes(k) && typeof o[k] === 'number'){ res = true; return; }
      if (typeof o[k] === 'object') walk(o[k]);
    }
  })(obj);
  return res;
}

const files = fs.readdirSync(OTHER).filter(f => f.endsWith('.json'));
const rows = [];
for (const f of files) {
  let c;
  try { c = JSON.parse(fs.readFileSync(OTHER + '/' + f, 'utf8')); }
  catch (e) { rows.push({file:f, err:e.message}); continue; }

  const basic = findNum(c, ['basic_pension','basicPension','total_basic']);
  const pers  = findNum(c, ['personal_pension','personalPension','personal_account_pension']);
  const trans = findNum(c, ['transition_pension','transitional_pension','transPension']);
  const total = findNum(c, ['total','total_pension','total_basic_pension']);

  const special = [];
  if (hasKey(c, ['plateau_subsidy','plateau_subsidy_amount'])) special.push('高原补贴');
  if (hasKey(c, ['heating_fee','heating_allowance','取暖费','heating'])) special.push('采暖');
  if (hasKey(c, ['transport_fee','transport_allowance'])) special.push('交通');
  if (hasKey(c, ['welfare_fund','welfare'])) special.push('福利');
  if (hasKey(c, ['only_child_bonus','only_child','one_child_bonus','独生子女奖励'])) special.push('独生子女奖励');

  const cn = c.province || c.region || '';
  const py = toPy(cn);
  const notesStr = (Array.isArray(c.notes) ? c.notes.join('') : (c.notes || '')) + ' ' + (c.data_source || '');
  const bad = /推算|估算|网络流传|非官方核定|不含最终/.test(notesStr);
  const goodSource = /用户提供|核定表|官方|社会保险|业务核定|用户提供图片|养老待遇核定/.test(notesStr) || c.verified === true;
  const hasFull = typeof basic === 'number' && typeof pers === 'number' && typeof trans === 'number' && typeof total === 'number';
  const curExists = fs.existsSync(CUR + '/' + py);
  // 纳入: 完整分项 + 非bad + (verified 或 可信来源)
  const include = hasFull && !bad;
  rows.push({ file:f, cn, py, verified:c.verified, hasFull, special:special.join('/'), bad, goodSource, include, curExists, total: typeof total==='number'?total:'-', ds:(c.data_source||(Array.isArray(c.notes)?'':(c.notes||''))).toString().slice(0,22) });
}

console.log('file | cn | py | verified | hasFull | special | bad | include | curExists | total');
for (const r of rows) {
  console.log([r.file, r.cn, r.py, r.verified, r.hasFull, r.special||'-', r.bad, r.include, r.curExists, r.total].join(' | '));
}
const inc = rows.filter(r => r.include);
console.log('\n== 纳入候选 ('+inc.length+'):');
for (const r of inc) console.log('  ', r.py, '|', r.file, '|', r.special||'无特殊项', '| curExists=', r.curExists, '| total=', r.total, '| ds=', r.ds);
console.log('\n== 排除 (bad或空壳):', rows.filter(r=>!r.include).length);
for (const r of rows.filter(r=>!r.include)) console.log('  ', r.py, '|', r.file, '| bad=', r.bad, '| hasFull=', r.hasFull, '| goodSrc=', r.goodSource);
console.log('\n== 按目标省聚合(纳入):');
const byProv = {};
for (const r of inc) (byProv[r.py] = byProv[r.py]||[]).push(r.file + (r.special?('['+r.special+']'):''));
console.log(JSON.stringify(byProv, null, 2));
