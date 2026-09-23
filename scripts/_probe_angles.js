const ROOT='C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台';
const CF=ROOT+'/cloudfunctions/calculate';
const engine=require(CF+'/pension-engine.js');
const {getConfig}=require(CF+'/provinces-data.js');
const {buildCohorts}=require(ROOT+'/scripts/cohort.js');
const COHORTS=buildCohorts(2025,12,22,7);
const f=(n,p=2)=>Number(n).toFixed(p);
function run(prov,city,opt={}){
  const c=COHORTS[60];
  const r=engine.calculate(getConfig(prov),{
    gender:'male', genderType:'male',
    birthYear:c.birthYear,birthMonth:c.birthMonth,
    workYear:opt.workYear??c.work.year, workMonth:opt.workMonth??c.work.month,
    avgIndex:opt.avgIndex??1.0, cityType:city,
    retireDateInput:{year:2025,month:12},
  }).legal;
  return r;
}
console.log('=== 自检：吉林长春 100档 ===');
const j=run('jilin','cc');
console.log('合计',f(j.total),'基础',f(j.basicPension.amount),'个账',f(j.personalAccount.amount),'过渡',f(j.transitionalPension.amount),'增发',f(j.extraPension.amount));
console.log('年限',f(j.totalYears),'实缴',f(j.actualYears),'视同',f(j.sightYears));

console.log('\n=== 候选① 31省横评（男60·100档·全省口径·22岁参工·2025-12退）===');
const P=[['jilin','吉林'],['liaoning','辽宁'],['heilongjiang','黑龙江'],['shandong','山东'],['henan','河南'],
['jiangsu','江苏'],['zhejiang','浙江'],['guangdong','广东'],['shanghai','上海'],['beijing','北京'],['xizang','西藏'],
['sichuan','四川'],['hubei','湖北'],['hunan','湖南'],['jiangxi','江西'],['hebei','河北'],['anhui','安徽'],
['fujian','福建'],['shaanxi','陕西'],['neimenggu','内蒙古'],['xinjiang','新疆'],['gansu','甘肃'],['qinghai','青海'],
['ningxia','宁夏'],['shanxi','山西'],['tianjin','天津'],['chongqing','重庆'],['guizhou','贵州'],['yunnan','云南'],
['guangxi','广西'],['hainan','海南']];
const out=[];
for(const [p,nm] of P){
  try{const r=run(p,'prov'); out.push([nm,r.total,r.sightYears,r.actualYears,r.basicPension.amount,r.transitionalPension.amount,r.personalAccount.amount]);}
  catch(e){out.push([nm,null,e.message.slice(0,50)]);}
}
out.sort((a,b)=>(b[1]||0)-(a[1]||0));
out.forEach(([nm,t,s,a,b,tr,pa],i)=>console.log(String(i+1).padStart(2),nm.padEnd(5),
 '合计',String(t==null?'ERR':f(t)).padStart(9),' 视同',String(s==null?'-':f(s)).padStart(5),' 实缴',String(a==null?'-':f(a)).padStart(6),
 ' 基础',String(b==null?'-':f(b)).padStart(9),' 过渡',String(tr==null?'-':f(tr)).padStart(8),' 个账',String(pa==null?'-':f(pa)).padStart(8)));
const ok=out.filter(o=>o[1]!=null);
console.log('有效',ok.length,'| 极差',(ok[0][1]/ok[ok.length-1][1]).toFixed(3),'倍 | 最高',ok[0][0],'| 最低',ok[ok.length-1][0]);
console.log('视同年限区间:',Math.min(...ok.map(o=>o[2])),'~',Math.max(...ok.map(o=>o[2])),'年');

console.log('\n=== 候选② 缴满就停（吉林·长春·100档）===');
[[15,2010,12],[20,2005,12],[25,2000,12],[30,1995,12],[38.42,1987,7]].forEach(([y,wy,wm])=>{
  const r=run('jilin','cc',{workYear:wy,workMonth:wm});
  console.log('缴',String(y).padStart(5),'年 → 合计',f(r.total).padStart(8),
   ' 总',f(r.totalYears).padStart(6),' 实缴',f(r.actualYears).padStart(6),' 视同',f(r.sightYears).padStart(5),
   ' 基础',f(r.basicPension.amount).padStart(8),' 个账',f(r.personalAccount.amount).padStart(8),' 过渡',f(r.transitionalPension.amount).padStart(8));
});

console.log('\n=== 派生① 同样一年"视同缴费"，在各省值多少钱 ===');
const rows=ok.filter(o=>o[2]>0).map(([nm,t,s,a,b,tr])=>({nm,t,s,tr,per:tr/s,ratio:tr/t*100}));
rows.sort((x,y)=>y.per-x.per);
rows.slice(0,8).forEach(r=>console.log(r.nm.padEnd(5),'视同',String(f(r.s)).padStart(5),'年  过渡',String(f(r.tr)).padStart(8),
  '  →每年视同值',String(f(r.per)).padStart(7),'元/月   占月领',String(f(r.ratio,1)).padStart(5)+'%'));
console.log('  ...');
rows.slice(-5).forEach(r=>console.log(r.nm.padEnd(5),'视同',String(f(r.s)).padStart(5),'年  过渡',String(f(r.tr)).padStart(8),
  '  →每年视同值',String(f(r.per)).padStart(7),'元/月   占月领',String(f(r.ratio,1)).padStart(5)+'%'));
console.log('每年视同 极差:', (rows[0].per/rows[rows.length-1].per).toFixed(2),'倍 (',rows[0].nm,'vs',rows[rows.length-1].nm,')');

console.log('\n=== 派生② 过渡性养老金占月领比重：省际差异 ===');
const byRatio=[...rows].sort((x,y)=>y.ratio-x.ratio);
console.log('最高5:', byRatio.slice(0,5).map(r=>r.nm+' '+f(r.ratio,1)+'%').join(' | '));
console.log('最低5:', byRatio.slice(-5).map(r=>r.nm+' '+f(r.ratio,1)+'%').join(' | '));

console.log('\n=== 派生③ 缴满就停：少缴的年限 vs 少领的月钱 ===');
const Y={15:1905.56,20:2434.20,25:2956.12,30:3468.69,38.42:5097.19};
const full=Y[38.42];
[15,20,25,30].forEach(y=>{
  const d=full-Y[y];
  console.log('缴',String(y).padStart(5),'年 → 比缴满少领',f(d).padStart(8),'元/月  仅为缴满的',f(Y[y]/full*100,1)+'%');
});
console.log('15年 vs 38.42年：月领差', f(full-Y[15]), '元，倍数', (full/Y[15]).toFixed(3));
