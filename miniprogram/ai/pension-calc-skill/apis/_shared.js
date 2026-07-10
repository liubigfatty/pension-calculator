// 原子接口共享模块：省份解析 + 人员类型解析 + 小工具
const { getConfig, SLUGS } = require('../engine/provinces-index');

// 中文省名 -> slug（含直辖市/自治区全称与简称）
const CN2SLUG = {
  '北京市': 'beijing', '天津市': 'tianjin', '河北省': 'hebei', '山西省': 'shanxi',
  '内蒙古自治区': 'neimenggu', '辽宁省': 'liaoning', '吉林省': 'jilin', '黑龙江省': 'heilongjiang',
  '上海市': 'shanghai', '江苏省': 'jiangsu', '浙江省': 'zhejiang', '安徽省': 'anhui',
  '福建省': 'fujian', '江西省': 'jiangxi', '山东省': 'shandong', '河南省': 'henan',
  '湖北省': 'hubei', '湖南省': 'hunan', '广东省': 'guangdong', '广西壮族自治区': 'guangxi',
  '海南省': 'hainan', '重庆市': 'chongqing', '四川省': 'sichuan', '贵州省': 'guizhou',
  '云南省': 'yunnan', '西藏自治区': 'xizang', '陕西省': 'shaanxi', '甘肃省': 'gansu',
  '青海省': 'qinghai', '宁夏回族自治区': 'ningxia', '新疆维吾尔自治区': 'xinjiang'
};

// slug -> 中文简称（结果展示用）
const SLUG2CN = {
  beijing: '北京', tianjin: '天津', hebei: '河北', shanxi: '山西', neimenggu: '内蒙古',
  liaoning: '辽宁', jilin: '吉林', heilongjiang: '黑龙江', shanghai: '上海', jiangsu: '江苏',
  zhejiang: '浙江', anhui: '安徽', fujian: '福建', jiangxi: '江西', shandong: '山东',
  henan: '河南', hubei: '湖北', hunan: '湖南', guangdong: '广东', guangxi: '广西',
  hainan: '海南', chongqing: '重庆', sichuan: '四川', guizhou: '贵州', yunnan: '云南',
  xizang: '西藏', shaanxi: '陕西', gansu: '甘肃', qinghai: '青海', ningxia: '宁夏', xinjiang: '新疆'
};

const STRIP = /(省|市|自治区|维吾尔|壮族|回族|特别行政区)/g;

function resolveProvince(province) {
  if (!province) return null;
  const p = String(province).trim();
  if (SLUGS.indexOf(p) >= 0) return p;               // 直接 slug
  const norm = p.replace(STRIP, '');
  if (SLUGS.indexOf(norm) >= 0) return norm;         // 去后缀后匹配 slug
  if (CN2SLUG[p]) return CN2SLUG[p];                 // 中文全称
  for (const cn of Object.keys(CN2SLUG)) {
    if (cn.replace(STRIP, '') === norm) return CN2SLUG[cn]; // 中文去后缀匹配
  }
  return null;
}

// 解析人员类型 -> { gender, identity, genderType }
// 输入可为：personType 枚举 或 gender/identity/femaleRetireType 分字段
function resolvePerson({ personType, gender, identity, femaleRetireType }) {
  // 优先 personType 枚举
  if (personType) {
    const t = String(personType).replace(/\s/g, '');
    if (/(灵活|个体).*男/.test(t) || t === '灵活男') return { gender: 'male', identity: 'flexible', genderType: 'male' };
    if (/(灵活|个体).*女/.test(t) || t === '灵活女') return { gender: 'female', identity: 'flexible', genderType: 'fw55' };
    if (/(企业|职工|单位).*男/.test(t) || t === '企业男') return { gender: 'male', identity: 'employee', genderType: 'male' };
    if (/女.*55|女55|原55/.test(t)) return { gender: 'female', identity: 'employee', genderType: 'fw55' };
    if (/(企业|职工|单位).*女|女50|原50|女$/.test(t)) return { gender: 'female', identity: 'employee', genderType: 'fw50' };
    if (/男/.test(t)) return { gender: 'male', identity: 'employee', genderType: 'male' };
  }
  // 分字段
  let g = null, id = null;
  if (gender) {
    const gs = String(gender).trim();
    if (gs === 'male' || /男/.test(gs)) g = 'male';
    else if (gs === 'female' || /女/.test(gs)) g = 'female';
  }
  if (identity) {
    const is = String(identity).trim();
    if (is === 'flexible' || /灵活|个体/.test(is)) id = 'flexible';
    else if (is === 'employee' || /企业|职工|单位/.test(is)) id = 'employee';
  }
  g = g || 'male';
  id = id || 'employee';
  let genderType;
  if (g === 'male') genderType = 'male';
  else if (id === 'flexible') genderType = 'fw55';
  else genderType = (String(femaleRetireType) === '55') ? 'fw55' : 'fw50';
  return { gender: g, identity: id, genderType };
}

// "YYYY-MM" / "YYYY年MM月" / "YYYY.MM" / "YYYY" -> { year, month }
function parseYM(s) {
  if (s == null) return null;
  const str = String(s).trim();
  const m = str.match(/(\d{4})\D+(\d{1,2})/) || str.match(/^(\d{4})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = m[2] ? parseInt(m[2], 10) : 1;
  if (!year || month < 1 || month > 12) return null;
  return { year, month };
}

function makeErr(text, extra) {
  return Object.assign({ isError: true, content: [{ type: 'text', text }], structuredContent: { error: text } }, extra || {});
}

module.exports = { getConfig, SLUGS, CN2SLUG, SLUG2CN, resolveProvince, resolvePerson, parseYM, makeErr };
