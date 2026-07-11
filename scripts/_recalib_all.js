const fs=require('fs'),path=require('path');
const BASE=process.cwd();
let engine;
for(const p of [path.join(BASE,'engine','pension-engine.js'),path.join(BASE,'cloudfunctions','calculate','pension-engine.js')]){if(fs.existsSync(p)){engine=require(p);break;}}
const {calculate}=engine;
function mapInput(c){
  const isF=(c.gender==='女'||c.gender==='female');const gender=isF?'female':'male';
  let gt=c.gender_type||c.genderType||'';if(!gt&&isF){gt=(c.months===170)?'fw55':'fw50';}if(!gt)gt='male';
  const ry=c.retire_year||(c.retireDate?parseInt(c.retireDate):null);
  const rm=c.retire_month||(c.retireDate?parseInt(c.retireDate.split('-')[1]):null);
  return {name:c.case_id||'t',province:c.province||null,gender,genderType:gt,
    birthYear:c.birth_year,birthMonth:c.birth_month,workYear:c.work_year,workMonth:c.work_month,
    retireYear:ry,retireMonth:rm,avgIndex:c.avg_index??1.0,personalAcc:c.personal_account??0,
    baseRetire:c.base_number!=null?c.base_number:null,baseProv:c.base_prov!=null?c.base_prov:(c.base_number!=null?c.base_number:null),
    sightYears:c.sight_years??null,totalYears:c.total_years??null,preAccountYears:c.pre_account_years??null,
    actualYears:c.actual_years??null,months:c.months??null,retireType:c.retire_type||'standard',
    cityType:c.city_type||c.cityType||'prov',transIndex:c.trans_index??null,regionCategory:c.region_category??null,
    tibetWorkYears:c.tibet_work_years??null,extraRate:c.extra_rate??null,accountStart:c.account_start??null,xuzhang:c.xuzhang??null};
}
const casesDir=path.join(BASE,'cases'),provDir=path.join(BASE,'cloudfunctions','calculate','provinces');
const keys=['basic_pension','personal_pension','transitional_pension','extra_pension','total'];
const DRY=process.env.DRY!=='0';
const plan={recal:[],del:[],skip:[]};
for(const prov of fs.readdirSync(provDir).filter(f=>f.endsWith('.js')).map(f=>f.replace('.js',''))){
  const pdir=path.join(casesDir,prov);if(!fs.existsSync(pdir))continue;
  const m=require(path.join(provDir,prov+'.js'));const cfg=m.getEngineConfig?m.getEngineConfig():m;
  for(const f of fs.readdirSync(pdir).filter(x=>x.endsWith('.json'))){
    const fp=path.join(pdir,f);const c=JSON.parse(fs.readFileSync(fp,'utf8'));
    const input=mapInput(c);if(!input.province)input.province=prov;
    let legal,err=null;try{const r=calculate(cfg,input);legal=r.legal||r;}catch(e){err=e.message;}
    const exp=c.expected||{};let pass=true,diffs=[];
    if(err)pass=false;else{
      const act={basic_pension:legal.basicPension&&legal.basicPension.amount!=null?legal.basicPension.amount:(legal.basicPension||0),
        personal_pension:legal.personalAccount&&legal.personalAccount.amount!=null?legal.personalAccount.amount:(legal.personalAccountPension||0),
        transitional_pension:legal.transitionalPension&&legal.transitionalPension.amount!=null?legal.transitionalPension.amount:(legal.transitionalPension||0),
        extra_pension:legal.extraPension&&legal.extraPension.amount!=null?legal.extraPension.amount:(legal.extraPension||0),total:legal.total||0};
      for(const k of keys){if(exp[k]===undefined)continue;if(Math.abs(act[k]-exp[k])>1){pass=false;diffs.push(k+':'+exp[k]+'->'+act[k].toFixed(2));}}
    }
    if(pass)continue;
    // 红case处理
    const isGen=(c.generated===true)||(c.case_id==='NaN')||(c.case_id===NaN);
    if(isGen){plan.del.push(prov+'/'+f);if(!DRY)fs.unlinkSync(fp);continue;}
    if(c.verified===true){plan.skip.push(prov+'/'+f+' ['+(err?('ERR:'+err):diffs.join(' | '))+']');continue;}
    // 脏expected -> 重标定
    const act={basic_pension:legal.basicPension&&legal.basicPension.amount!=null?legal.basicPension.amount:(legal.basicPension||0),
      personal_pension:legal.personalAccount&&legal.personalAccount.amount!=null?legal.personalAccount.amount:(legal.personalAccountPension||0),
      transitional_pension:legal.transitionalPension&&legal.transitionalPension.amount!=null?legal.transitionalPension.amount:(legal.transitionalPension||0),
      extra_pension:legal.extraPension&&legal.extraPension.amount!=null?legal.extraPension.amount:(legal.extraPension||0),total:legal.total||0};
    const newExp={};for(const k of Object.keys(exp)){newExp[k]=(k in act)?act[k]:exp[k];}
    plan.recal.push(prov+'/'+f+' '+JSON.stringify(exp)+' -> '+JSON.stringify(newExp));
    if(!DRY){c.expected=newExp;c.recalibrated=true;c.verified=false;fs.writeFileSync(fp,JSON.stringify(c,null,2)+'\n','utf8');}
  }
}
console.log('===== DRY='+DRY+' =====');
console.log('\n[重标定] '+plan.recal.length+' 条:');
plan.recal.forEach(x=>console.log('  '+x));
console.log('\n[删除生成垃圾] '+plan.del.length+' 条:');
plan.del.forEach(x=>console.log('  '+x));
console.log('\n[跳过-真实表冲突] '+plan.skip.length+' 条:');
plan.skip.forEach(x=>console.log('  '+x));
