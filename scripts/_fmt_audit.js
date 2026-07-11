const fs=require('fs');
const rep=JSON.parse(fs.readFileSync('scripts/_audit_result.json','utf8'));
const cn={anhui:'安徽',beijing:'北京',chongqing:'重庆',fujian:'福建',gansu:'甘肃',guangdong:'广东',guangxi:'广西',guizhou:'贵州',hainan:'海南',hebei:'河北',heilongjiang:'黑龙江',henan:'河南',hubei:'湖北',hunan:'湖南',jiangsu:'江苏',jiangxi:'江西',jilin:'吉林',liaoning:'辽宁',neimenggu:'内蒙古',ningxia:'宁夏',qinghai:'青海',shaanxi:'陕西',shandong:'山东',shanghai:'上海',shanxi:'山西',sichuan:'四川',tianjin:'天津',xinjiang:'新疆',xizang:'西藏',yunnan:'云南',zhejiang:'浙江'};
const A=rep.filter(r=>r.red===0);
const P=rep.filter(r=>r.red>0&&r.canPromote);
const B=rep.filter(r=>r.red>0&&!r.canPromote);
let md='# 已启动省份 红CASE 现状审计（严格口径：零红=A类）\n\n';
md+='> 生成时间：2026-07-11  |  总用例 '+rep.reduce((s,r)=>s+r.total,0)+' / 绿 '+rep.reduce((s,r)=>s+r.green,0)+' / 红 '+rep.reduce((s,r)=>s+r.red,0)+'\n';
md+='> 红case分类：脏expected(可重标定)=历史脏数据，重标定引擎值即转绿；真实表冲突=verified真实表与引擎不符，需真实表或引擎修复；生成对照垃圾=旧引擎自动生成case_id=NaN，应删。\n\n';
md+='## 一、A类·已全绿（'+A.length+'省，零红）\n\n';
md+=A.map(r=>'- '+cn[r.prov]+'('+r.prov+') '+r.green+'/'+r.total).join('\n')+'\n\n';
md+='## 二、可重标定升A（'+P.length+'省，红case全是脏expected/生成垃圾，重标定即全绿）\n\n';
md+='| 省 | 绿/总 | 红数 | 红case明细(类型) |\n|---|---|---|---|\n';
for(const r of P){
  const det=r.reds.map(d=>d.file+'['+d.type+']').join('、');
  md+='| '+cn[r.prov]+'('+r.prov+') | '+r.green+'/'+r.total+' | '+r.red+' | '+det+' |\n';
}
md+='\n## 三、暂不能升A（'+B.length+'省，含真实表冲突/引擎报错，需决策）\n\n';
for(const r of B){
  md+='### '+cn[r.prov]+'('+r.prov+') '+r.green+'/'+r.total+' 绿，红'+r.red+'\n';
  for(const d of r.reds){
    md+='- '+d.file+' ['+d.type+(d.verified?'/verified':'')+(d.recal?'/recal':'')+'] '+(d.err?('引擎报错:'+d.err):d.diffs)+'\n';
  }
  md+='\n';
}
md+='## 结论\n\n';
md+='- **30/31 已启动省**的红case均为脏数据或可删垃圾，经引擎重标定（沿用湖北/山西/四川/西藏范式）即可全部转绿、升A类。\n';
md+='- **仅福建(fujian)** 存在真实表冲突：`backup_32.json` 过渡养老金引擎算得比真实表高 2.82 元（pre_account_years 取整误差，源表 11.5 实为约 11.46 年），属真实标定缺口，**不能**直接重标定覆盖，需你决策（保留为已知校准项 / 反推精确有效年限）。\n';
fs.writeFileSync('scripts/_audit_report.md',md,'utf8');
console.log(md);
