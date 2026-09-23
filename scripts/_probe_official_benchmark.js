/**
 * 引擎测算值 × 官方统计口径人均养老金 —— 对照校准
 *
 * 目的（用户 2026-09-22 指令2）：把「同一个人换省」的测算，和各省官方公布的
 *   企业退休人员月人均养老金（统计口径）放到一起看
 *
 * ⚠️ 口径差异必须说清：
 *   引擎值 = 同一人（1987-07 参工、38.42 年、某档位、2025-12 退休）的**制度产出**
 *   官方值 = 该省**全体**企业退休人员的实际平均（含短工龄、断缴、早年退休未充分调整者）
 *   两者不可直接比大小；有意义的是**比值**——它衡量「该省实际人群相对我们样本的位置」
 *
 * 官方数据来源（只收有出处的，自媒体「估算值」一律不收）：
 *   贵州 3162  —— 贵州省人社厅《2025年度人社事业发展统计公报》
 *   海南 3041  —— 海南省社保医保公共服务平台《2025年海南省社会保险情况》
 *   宁夏 3870  —— 宁夏人社厅 2025 年第 21 次调整后口径（媒体转述，待公报原文核）
 *   云南 3623  —— 云南省人社厅公布（媒体转述，待公报原文核）
 *   河南 3340  —— 河南省人社厅 2025 年社保数据（媒体转述）；安阳市 2938（河南省政府官网）
 *   广东 —— 无省级人均；市级：佛山 2982.56、清远 2322.25、珠海 3224.24、深圳 3615(2024)
 *   西藏 —— 无省级人均；山南市 5620（山南网/市人社局，西藏人社厅统一部署后）
 *   全国 —— 企业退休人员 3322（由 2023 年 3162 按调整比例测算，非公报直载）
 *
 * ❌ 不采用：网传「31省人均养老金排名」两张表互相矛盾（西藏 5653 vs 11256.92；
 *    四川 3108.96 vs 3456 vs 3300），且均自述为「估算值」，无官方出处。
 */
const engine = require('../cloudfunctions/calculate/pension-engine.js')
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')

// 官方锚点：[省份名, 官方值, 口径说明]
const OFFICIAL = [
  ['西藏', 5620, '山南市（西藏人社厅统一部署后），非全区'],
  ['宁夏', 3870, '宁夏人社厅（媒体转述，待公报原文核）'],
  ['云南', 3623, '云南省人社厅（媒体转述，待公报原文核）'],
  ['河南', 3340, '河南省人社厅（媒体转述）；安阳市 2938'],
  ['贵州', 3162, '贵州省人社厅 2025 公报（省级，最硬）'],
  ['海南', 3041, '海南省社保局 2025 社会保险情况（省级，最硬）']
]
// 市级参考（不入省际对照，仅作省内离散度提示）
const CITY_REF = [
  ['广东·深圳', 3615, '2024 年度深圳市社保信息披露'],
  ['广东·珠海', 3224.24, '珠海市社保中心 2025'],
  ['广东·佛山', 2982.56, '佛山市 2025 社保信息披露'],
  ['广东·清远', 2322.25, '清远市 2025 社保信息披露'],
  ['河南·安阳', 2938, '河南省政府官网 2026-01'],
  ['山东·邹平', 2915, '邹平市统计公报（不含灵活就业）'],
  ['西藏·山南', 5620, '山南网/市人社局']
]

const P = {
  gender: 'male', genderType: 'male', birthYear: 1965, birthMonth: 9,
  workYear: 1987, workMonth: 7, cityType: 'prov',
  retireDateInput: { year: 2025, month: 12 }
}

const PROVS = [
  ['beijing', '北京'], ['tianjin', '天津'], ['hebei', '河北'], ['shanxi', '山西'],
  ['neimenggu', '内蒙古'], ['liaoning', '辽宁'], ['jilin', '吉林'], ['heilongjiang', '黑龙江'],
  ['shanghai', '上海'], ['jiangsu', '江苏'], ['zhejiang', '浙江'], ['anhui', '安徽'],
  ['fujian', '福建'], ['jiangxi', '江西'], ['shandong', '山东'], ['henan', '河南'],
  ['hubei', '湖北'], ['hunan', '湖南'], ['guangdong', '广东'], ['guangxi', '广西'],
  ['hainan', '海南'], ['chongqing', '重庆'], ['sichuan', '四川'], ['guizhou', '贵州'],
  ['yunnan', '云南'], ['xizang', '西藏'], ['shaanxi', '陕西'], ['gansu', '甘肃'],
  ['qinghai', '青海'], ['ningxia', '宁夏'], ['xinjiang', '新疆']
]

const map = {}
PROVS.forEach(([code, name]) => {
  const cfg = getConfig(code)
  const r60 = engine.calculate(cfg, Object.assign({}, P, { avgIndex: 0.6 })).legal
  const r100 = engine.calculate(cfg, Object.assign({}, P, { avgIndex: 1.0 })).legal
  map[name] = { code, t60: r60.total, t100: r100.total }
})

console.log('=== 引擎测算 vs 官方人均（有官方出处的 6 个省级锚点 + 1 个市级）===')
console.log('引擎值：1987-07 参工 / 38.42 年 / 2025-12 退休 / 男 / 口径B（含地方项到手）')
console.log('')
console.log('省份   官方人均   引擎60%档  比值   引擎100%档  比值   官方数据出处')
OFFICIAL.forEach(([name, off, src]) => {
  const m = map[name]
  if (!m) return
  console.log(
    name.padEnd(4) +
    ' ' + off.toFixed(0).padStart(7) +
    ' ' + m.t60.toFixed(2).padStart(10) +
    ' ' + (m.t60 / off).toFixed(3).padStart(6) +
    ' ' + m.t100.toFixed(2).padStart(11) +
    ' ' + (m.t100 / off).toFixed(3).padStart(6) +
    '  ' + src
  )
})

console.log('\n=== 市级官方参考（省内离散度，广东最典型）===')
CITY_REF.forEach(([name, off, src]) => {
  console.log('  ' + name.padEnd(11) + ' ' + off.toFixed(2).padStart(8) + '  ' + src)
})
const gd = map['广东']
console.log('  → 广东省级测算 60%档 ' + gd.t60.toFixed(2) + ' / 100%档 ' + gd.t100.toFixed(2) +
  '，而市级官方实际 2322.25～3615，省内最大差 ' + (3615 - 2322.25).toFixed(2) + ' 元')

console.log('\n=== 全国口径 ===')
console.log('  全国企业退休人员月人均 3322（由 2023 年 3162 按调整比例测算，非公报直载）')
console.log('  全国全口径（含机关事业）月人均 3962（2025 年全国人社统计公报解读）')
console.log('  本引擎河南 60% 档 38.42 年 = ' + map['河南'].t60.toFixed(2) + '，与全国企退人均 3322 同量级')
