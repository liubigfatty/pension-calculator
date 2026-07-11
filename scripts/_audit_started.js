const fs=require('fs'),path=require('path');
const BASE=process.cwd();
let engine;
for(const p of [path.join(BASE,'engine','pension-engine.js'),path.join(BASE,'cloudfunctions','calculate','pension-engine.js')]){if(fs.existsSync(p)){engine=require(p);break;}}
const {calculate}=engine;
function mapInput(c){
  const isF=(c.gender==='女'||c.gender==='female');
  const gender=isF?'female':'male';
  let gt=c.gender_type||c.genderType||'';
  if(!gt&&isF){gt=(c.months===170)?'fw55':'fw50';}
  if(!gt)gt='male';
  const ry=c.retire_year||(c.retireDate?parseInt(c.retireDate):null);
  const rm=c.retire_month||(c.retireDate?parseInt(c.retireDate.split('-')[1]):null);
  return {name:c.case_id||'t',province:c.province||null,gender,genderType:gt,
    birthYear:c.birth_year,birthMonth:c.birth_month,workYear:c.work_year,workMonth:c.work_month,
    retireYear:ry,retireMonth:rm,avgIndex:c.avg_index??1.0,personalAcc:c.personal_account??0,
    baseRetire:c.base_number!=null?c.base_number:null,
    baseProv:c.base_prov!=null?c.base_prov:(c.base_number!=null?c.base_number:null),
    sightYears:c.sight_years??null,totalYears:c.total_years??null,preAccountYears:c.pre_account_years??null,
    actualYears:c.actual_years??null,months:c.months??null,retireType:c.retire_type||'standard',
    cityType:c.city_type||c.cityType||'prov',transIndex:c.trans_index??null,regionCategory:c.region_category??null,
    tibetWorkYears:c.tibet_work_years??null,extraRate:c.extra_rate??null,accountStart:c.account_start??null,xuzhang:c.xuzhang??null};
}
const casesDir=path.join(BASE,'cases'),provDir=path.join(BASE,'cloudfunctions','calculate','provinces');
const provs=fs.readdirSync(provDir).filter(f=>f.endsWith('.js')).map(f=>f.replace('.js',''));
const keys=['basic_pension','personal_pension','transitional_pension','extra_pension','total'];
const rep=[];
for(const prov of provs){
  const pdir=path.join(casesDir,prov);if(!fs.existsSync(pdir))continue;
  const files=fs.readdirSync(pdir).filter(f=>f.endsWith('.json'));
  const m=require(path.join(provDir,prov+'.js'));
  const cfg=m.getEngineConfig?m.getEngineConfig():m;
  let green=0;const reds=[];
  for(const f of files){
    const c=JSON.parse(fs.readFileSync(path.join(pdir,f),'utf8'));
    const input=mapInput(c);if(!input.province)input.province=prov;
    let legal,err=null;
    try{const r=calculate(cfg,input);legal=r.legal||r;}catch(e){err=e.message;}
    const exp=c.expected||{};let pass=true,diffs=[];
    if(err)pass=false;
    else{
      const act={
        basic_pension:legal.basicPension&&legal.basicPension.amount!=null?legal.basicPension.amount:(legal.basicPension||0),
        personal_pension:legal.personalAccount&&legal.personalAccount.amount!=null?legal.personalAccount.amount:(legal.personalAccountPension||0),
        transitional_pension:legal.transitionalPension&&legal.transitionalPension.amount!=null?legal.transitionalPension.amount:(legal.transitionalPension||0),
        extra_pension:legal.extraPension&&legal.extraPension.amount!=null?legal.extraPension.amount:(legal.extraPension||0),
        total:legal.total||0};
      for(const k of keys){if(exp[k]===undefined)continue;const d=Math.abs(act[k]-exp[k]);if(d>1){pass=false;diffs.push(k+':'+exp[k]+'->'+act[k].toFixed(2));}}
    }
    if(pass){green++;continue;}
    let type=err?'引擎报错':(c.verified===true?'真实表冲突':((c.generated===true||c.case_id==='NaN')?'生成对照垃圾':'脏expected(可重标定)'));
    reds.push({file:f,type,verified:c.verified||false,recal:c.recalibrated||false,diffs:diffs.join(' | '),err});
  }
  rep.push({prov,total:files.length,green,red:reds.length,reds,canPromote:reds.length===0||reds.every(d=>d.type==='脏expected(可重标定)'||d.type==='生成对照垃圾')});
}
fs.writeFileSync('scripts/_audit_result.json',JSON.stringify(rep,null,2),'utf8');
const A=rep.filter(r=>r.red===0).map(r=>r.prov);
const P=rep.filter(r=>r.red>0&&r.canPromote).map(r=>r.prov);
const B=rep.filter(r=>r.red>0&&!r.canPromote).map(r=>r.prov);
console.log('A类已全绿('+A.length+'): '+A.join(', '));
console.log('\n可重标定升A('+P.length+'): '+P.join(', '));
console.log('\n暂不能升A('+B.length+'): '+B.join(', '));
console.log('\n总用例='+rep.reduce((s,r)=>s+r.total,0)+' 绿='+rep.reduce((s,r)=>s+r.green,0)+' 红='+rep.reduce((s,r)=>s+r.red,0));
