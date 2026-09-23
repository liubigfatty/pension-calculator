/** 全量审计：31省地方项配置（special_addition / extra_pension / 调节金 / 当年增资） */
const { getConfig } = require('../cloudfunctions/calculate/provinces-data.js')
const P = [['beijing','北京'],['tianjin','天津'],['hebei','河北'],['shanxi','山西'],['neimenggu','内蒙古'],['liaoning','辽宁'],['jilin','吉林'],['heilongjiang','黑龙江'],['shanghai','上海'],['jiangsu','江苏'],['zhejiang','浙江'],['anhui','安徽'],['fujian','福建'],['jiangxi','江西'],['shandong','山东'],['henan','河南'],['hubei','湖北'],['hunan','湖南'],['guangdong','广东'],['guangxi','广西'],['hainan','海南'],['chongqing','重庆'],['sichuan','四川'],['guizhou','贵州'],['yunnan','云南'],['xizang','西藏'],['shaanxi','陕西'],['gansu','甘肃'],['qinghai','青海'],['ningxia','宁夏'],['xinjiang','新疆']]
console.log('省     特殊增发enabled/type                       增发基础(extra)  调节金  备注')
for (const [c,n] of P) {
  const cfg = getConfig(c)
  const m = cfg.modules || {}
  const sa = m.special_addition
  const ep = m.extra_pension
  const af = m.adjustment_fund || m.transition_adjust
  const yi = m.yearly_increase
  const sz = cfg.cities && cfg.cities.shenzhen
  console.log(
    n.padEnd(4) + ' ' +
    (sa ? (String(sa.enabled).padEnd(5) + '/' + String(sa.type||'(无type)')).padEnd(38) : '—'.padEnd(38)) + ' ' +
    (ep ? ('enabled=' + ep.enabled + ' rate=' + (ep.rate??ep.extra_rate??'—')).padEnd(16) : '—'.padEnd(16)) + ' ' +
    (af ? ('enabled=' + af.enabled).padEnd(7) : '—'.padEnd(7)) + ' ' +
    (yi ? ('增资=' + JSON.stringify(yi)) : '') + (sz ? ' [深圳模块]' : '')
  )
}
// 打印有 type 的配置详情
console.log('\n===== 有 type 的 special_addition 完整配置 =====')
for (const [c,n] of P) {
  const cfg = getConfig(c); const sa = (cfg.modules||{}).special_addition
  if (sa && sa.enabled && sa.type) console.log(n + ' :: ' + JSON.stringify(sa))
}
