const fs = require('fs');
const OTHER = 'C:/Users/14041/WorkBuddy/pension-backup-20260516/养老金计算平台/cases/other';
const CUR = 'C:/Users/14041/AppData/Roaming/winclaw/.openclaw/workspace/养老金计算平台/cases';
const DRY = process.env.DRY === '1';
const TARGET = ['fujian','hubei','yunnan','guizhou','xizang'];
const skipNonTarget = [];

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
  for (const k of Object.keys(pyMap)) {
    const short = k.replace('回族自治区','').replace('壮族自治区','').replace('维吾尔自治区','').replace('自治区','').replace('省','');
    if (cn.includes(short)) return pyMap[k];
  }
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
function nested(obj, path){
  return path.split('.').reduce((o,k)=> (o&&typeof o==='object')? o[k] : undefined, obj);
}
function num(v){
  if (typeof v === 'number') return v;
  if (typeof v === 'string'){
    const m = v.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : undefined;
  }
  return undefined;
}
function parseYears(v){
  if (typeof v === 'number') return v;
  if (typeof v === 'string'){
    if (/年/.test(v)){
      const m = v.match(/(\d+)年(\d+)个月?/);
      if (m) return +m[1] + (+m[2])/12;
      const m2 = v.match(/([\d.]+)年/);
      if (m2) return parseFloat(m2[1]);
    }
    const m3 = v.match(/-?\d+(\.\d+)?/);
    if (m3) return parseFloat(m3[0]);
  }
  return undefined;
}
function parseYM(s){
  if (!s || typeof s !== 'string') return [null, null];
  let m = s.match(/(\d{4})年(\d{1,2})月/); if (m) return [+m[1], +m[2]];
  m = s.match(/(\d{4})-(\d{1,2})(?:-\d{1,2})?/); if (m) return [+m[1], +m[2]];
  m = s.match(/(\d{4})\.(\d{1,2})/); if (m) return [+m[1], +m[2]];
  return [null, null];
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
const plan = [];
for (const f of files) {
  let c;
  try { c = JSON.parse(fs.readFileSync(OTHER + '/' + f, 'utf8')); }
  catch (e) { continue; }
  const basic = findNum(c, ['basic_pension','basicPension','total_basic']);
  const pers  = findNum(c, ['personal_pension','personalPension','personal_account_pension']);
  const trans = findNum(c, ['transition_pension','transitional_pension','transPension']);
  const total = findNum(c, ['total','total_pension','total_basic_pension']);
  const notesStr = (Array.isArray(c.notes)?c.notes.join(' '):(c.notes||'')) + ' ' + (c.data_source||'');
  const bad = /推算|估算|网络流传|非官方核定|不含最终/.test(notesStr);
  const hasFull = [basic,pers,trans,total].every(v => typeof v === 'number');
  if (!hasFull || bad) continue;

  const cn = c.province || c.region || '';
  const py = toPy(cn);
  if (py === '?') continue;
  if (!TARGET.includes(py)) { skipNonTarget.push(f + ' (' + py + ', 已启动省, 本次不生成)'); continue; }

  const base = num(c.base_number) || num(findNum(c, ['pension_base','base_number','calculation_base']));
  if (base === undefined) { skipNonTarget.push(f + ' (' + py + ', 缺计发基数, 待反推后纳入)'); continue; }

  const special = [];
  if (hasKey(c, ['plateau_subsidy','plateau_subsidy_amount'])) special.push('高原补贴');
  if (hasKey(c, ['heating_fee','heating_allowance','取暖费','heating'])) special.push('采暖');
  if (hasKey(c, ['transport_fee','transport_allowance'])) special.push('交通');
  if (hasKey(c, ['welfare_fund','welfare'])) special.push('福利');
  if (hasKey(c, ['only_child_bonus','only_child','one_child_bonus','独生子女奖励'])) special.push('独生子女奖励');

  const [by,bm] = parseYM(c.birth || c.birth_date || nested(c,'case_data.basic_info.birth_date'));
  const [wy,wm] = parseYM(c.work_start || c.employment_start_date || nested(c,'case_data.basic_info.employment_start_date'));
  const [ry,rm] = parseYM(c.retirement_date || nested(c,'case_data.basic_info.retirement_date'));
  const ra = num(c.retirement_age);
  const gender = c.gender || (ra && ra >= 60 ? '男' : (ra ? '女' : ''));
  const genderNote = c.gender ? '' : (gender ? '[性别原数据未提供,按'+ra+'岁退休推测为'+gender+']' : '');

  const sight = parseYears(c.deemed_years) ?? parseYears(nested(c,'case_data.basic_info.deemed_contribution_years')) ?? parseYears(findNum(c,['deemed_years']));
  const totY  = parseYears(c.total_years) ?? parseYears(nested(c,'case_data.basic_info.total_contribution_years')) ?? parseYears(findNum(c,['total_years']));
  const actY  = parseYears(c.actual_years) ?? parseYears(c.combined_years) ?? parseYears(nested(c,'case_data.basic_info.actual_contribution_years')) ?? (totY!=null&&sight!=null ? totY - sight : undefined);

  // 独生子女奖励并入真实总待遇（引擎 special_addition 会计算并计入 total）
  let oneChildBonus = 0;
  if (special.includes('独生子女奖励')) {
    oneChildBonus = num(findNum(c,['only_child_bonus','only_child','one_child_bonus','独生子女奖励'])) || 0;
  }
  const expTotal = Math.round((total + oneChildBonus) * 100) / 100;

  // case_id：文件名非 ASCII（如"贵州.json"）时改用省份拼音，避免中文文件名
  const caseId = /^[A-Za-z0-9_\-\.]+$/.test(f) ? ('backup_' + f.replace('.json','')) : ('backup_' + py);

  const obj = {
    case_id: caseId,
    province: py,
    city: c.city || (cn.includes('市')? cn : ''),
    region_category: c.region_category || nested(c,'region_category') || null,
    gender: gender,
    birth_year: by, birth_month: bm,
    work_year: wy, work_month: wm,
    retire_year: ry, retire_month: rm,
    avg_index: num(c.avg_index) ?? num(findNum(c,['avg_index','average_wage_index','average_index','average_contribution_index'])),
    // 仅使用显式 trans_index；不回退到 pre_account_index/average_wage_index，
    // 否则会让"建账前指数化工资"被误当作过渡计发指数（如福建 case 32 的 0.921），
    // 导致过渡性养老金错算。福建/湖北/贵州/西藏的过渡均使用基础平均指数。
    trans_index: num(c.trans_index) ?? null,
    base_number: base,
    base_prov: base,
    personal_account: num(c.personal_account) ?? num(findNum(c,['personal_account_amount','total_amount','personal_account_total'])),
    months: num(c.months) ?? num(findNum(c,['benefit_months','payment_months','months'])),
    sight_years: sight,
    actual_years: actY,
    pre_account_years: num(c.pre_account_years) ?? null,
    total_years: totY,
    one_child: special.includes('独生子女奖励') ? true : (c.one_child === true ? true : undefined),
    expected: { basic_pension: basic, personal_pension: pers, transitional_pension: trans, total: expTotal },
    verified: true,
    _special: special,
    notes: (Array.isArray(c.notes)?c.notes.join('\n'):(c.notes||'')) + `\n[来源:备份 other/${f}${special.length?'；特殊项:'+special.join('/'):''}${oneChildBonus?('；独生子女奖励+'+oneChildBonus):''}]${genderNote}`
  };
  plan.push(obj);
}

const existing = {};
for (const py of fs.readdirSync(CUR)) {
  const dir = CUR + '/' + py;
  if (!fs.statSync(dir).isDirectory()) continue;
  existing[py] = fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>{
    try { return JSON.parse(fs.readFileSync(dir+'/'+f,'utf8')); } catch(e){ return null; }
  }).filter(Boolean);
}
const finalPlan = [];
const skip = [];
for (const o of plan) {
  const ex = existing[o.province] || [];
  const dup = ex.find(e => e.expected && typeof e.expected.total==='number' && Math.abs(e.expected.total - o.expected.total) < 1 && e.verified===true);
  if (dup) { skip.push(o.case_id + ' (已有同total verified case in '+o.province+')'); continue; }
  finalPlan.push(o);
}

console.log('== 将生成 ('+finalPlan.length+'):');
for (const o of finalPlan) {
  console.log('  '+o.province+'/'+o.case_id+'.json | '+o.gender+' | 出生='+o.birth_year+'/'+o.birth_month+' | 退休='+o.retire_year+'/'+o.retire_month+' | 基数='+o.base_number+' | 基础指数='+o.avg_index+' | 过渡指数='+o.trans_index+' | 视同='+o.sight_years+' | 实际='+o.actual_years+' | 总='+o.total_years+' | 合计='+o.expected.total+(o._special.length?' | 特殊:'+o._special.join('/'):''));
}
console.log('\n== 跳过:', skip.length);
skip.forEach(s=>console.log('  '+s));
console.log('\n== 跳过(已启动省/缺基数):', skipNonTarget.length);
skipNonTarget.forEach(s=>console.log('  '+s));

if (!DRY) {
  for (const o of finalPlan) {
    const dir = CUR + '/' + o.province;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
    const {_special, ...out} = o;
    fs.writeFileSync(dir + '/' + o.case_id + '.json', JSON.stringify(out, null, 2) + '\n');
  }
  console.log('\n已生成 '+finalPlan.length+' 个 case 文件。');
} else {
  console.log('\n[DRY] 未写入任何文件。');
}
