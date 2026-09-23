// 医保体系篇派生数字（源：国家医保局《2025年全国医疗保障事业发展统计公报》2026-07-16）
const B = {
  total_insured: 133069.39,   // 万人
  total_rev: 35921.32,        // 亿元
  total_exp: 30055.19,        // 亿元
  staff_ins: 38856.12,        // 万人
  staff_onjob: 28062.32,
  staff_ret: 10793.80,
  staff_rev: 24683.60,
  staff_exp: 19376.55,
  staff_pool_rev: 18292.91,
  staff_pool_exp: 13594.28,
  staff_acct_rev: 6390.69,
  staff_acct_exp: 5782.28,
  staff_medcost: 20620.69,    // 医药总费用
  staff_med_inst: 18462.70,   // 医疗机构费用
  staff_onjob_cost: 8085.07,
  staff_ret_cost: 10377.63,
  staff_visits: 54.86,        // 亿人次
  staff_drugstore: 22.51,
  staff_inpatient: 0.83,
  res_ins: 94213.27,
  res_rev: 11237.72,
  res_exp: 10678.63,
  res_medcost: 19782.35,
  res_visits: 32.68,
  res_inpatient: 1.96,
  relief_total: 794.24,       // 医疗救助总金额
  relief_subsidize: 7666.47,  // 资助参保万人
  relief_times: 19915.60,     // 万人次
  relief_inp_avg: 1273,       // 次均住院救助元
  relief_out_avg: 86,
  ltc_ins: 30854.76,          // 长护险参保万人
  ltc_benefit: 192.91,        // 万人
  ltc_rev: 369.62,
  ltc_exp: 186.44,
  maternity_ins: 25958.05,
  maternity_exp: 1393.81,
  remote_visits: 4.73,        // 异地就医亿人次
  remote_cost: 8162.10,
  cross_prov: 3.08,           // 跨省直接结算亿人次
  cross_saved: 2075.06,       // 减少垫付亿元
  pool_both: 36322.72,
  pool_only: 2533.40,
  recovered: 342.19,
};
const d = (a,b)=> a/b;
const f = (n,p=2)=> n.toFixed(p);
console.log('=== 人均 ===');
console.log('全体人均基金支出      ', f(B.total_exp*1e8/(B.total_ins*1e4)), '元/年');
console.log('职工人均基金支出      ', f(B.staff_exp*1e8/(B.staff_ins*1e4)), '元/年');
console.log('居民人均基金支出      ', f(B.res_exp*1e8/(B.res_ins*1e4)), '元/年');
console.log('职工÷居民(支出)       ', f(B.staff_exp/B.staff_ins/(B.res_exp/B.res_ins),3), '倍');
console.log('职工人均缴费(含单位)  ', f(B.staff_rev*1e8/(B.staff_ins*1e4)), '元/年');
console.log('居民人均筹资          ', f(B.res_rev*1e8/(B.res_ins*1e4)), '元/年');
console.log('职工÷居民(筹资)       ', f(B.staff_rev/B.staff_ins/(B.res_rev/B.res_ins),3), '倍');
console.log('=== 退休 vs 在职 ===');
console.log('退休人均医疗费用      ', f(B.staff_ret_cost*1e8/(B.staff_ret*1e4)), '元/年');
console.log('在职人均医疗费用      ', f(B.staff_onjob_cost*1e8/(B.staff_onjob*1e4)), '元/年');
console.log('退休÷在职             ', f(B.staff_ret_cost/B.staff_ret/(B.staff_onjob_cost/B.staff_onjob),3), '倍');
console.log('职退比                ', f(B.staff_onjob/B.staff_ret,3));
console.log('退休人均费÷居民人均筹资', f((B.staff_ret_cost*1e8/(B.staff_ret*1e4))/(B.res_rev*1e8/(B.res_ins*1e4)),3), '倍');
console.log('=== 长护险 ===');
console.log('长护险人均待遇支出    ', f(B.ltc_exp*1e8/(B.ltc_benefit*1e4)), '元/年');
console.log('长护险待遇享受比例    ', f(B.ltc_benefit/B.ltc_ins*100,3), '%');
console.log('=== 救助与异地 ===');
console.log('次均救助(全部)        ', f(B.relief_total*1e8/(B.relief_times*1e4)), '元');
console.log('异地就医人均费用      ', f(B.remote_cost*1e8/(B.remote_visits*1e8)), '元');
console.log('跨省结算人均减垫付    ', f(B.cross_saved*1e8/(B.cross_prov*1e8)), '元');
console.log('=== 频次 ===');
console.log('职工人均待遇次数      ', f(B.staff_visits*1e8/(B.staff_ins*1e4),1), '次/年');
console.log('居民人均待遇次数      ', f(B.res_visits*1e8/(B.res_ins*1e4),1), '次/年');
console.log('职工药店购药占比      ', f(B.staff_drugstore/B.staff_visits*100,1), '%');
console.log('职工住院率(粗)        ', f(B.staff_inpatient*1e8/(B.staff_ins*1e4)*100,2), '%');
console.log('居民住院率(粗)        ', f(B.res_inpatient*1e8/(B.res_ins*1e4)*100,2), '%');
console.log('单建统筹占职工比      ', f(B.pool_only/B.staff_ins*100,2), '%');
console.log('个人账户当年结余      ', f(B.staff_acct_rev-B.staff_acct_exp), '亿元');
console.log('统筹基金结余(职工)    ', f(B.staff_rev-B.staff_exp), '亿元');
