// fix-html.js - rebuild the JS section of index.html
const fs = require('fs');
let h = fs.readFileSync('docs/index.html', 'utf8');

// Find closing </script> and opening <script>
let scriptEnd = h.lastIndexOf('</script>');
let scriptStart = h.indexOf('<script>', h.indexOf('pension-engine-browser.js'));
if (scriptStart === -1 || scriptEnd === -1) { console.log('Cannot find script block'); process.exit(1); }

let before = h.substring(0, scriptStart + 8);
let after = h.substring(scriptEnd);

let js = `
// === 全局状态 ===
var currentConfig = null;
var provinceList = [];

// === 初始化 ===
async function init() {
  var list = [
    {id:"jilin",name:"吉林省"},{id:"liaoning",name:"辽宁省"},{id:"heilongjiang",name:"黑龙江省"},
    {id:"beijing",name:"北京市"},{id:"tianjin",name:"天津市"},{id:"shanghai",name:"上海市"},{id:"chongqing",name:"重庆市"},
    {id:"hebei",name:"河北省"},{id:"shanxi",name:"山西省"},{id:"neimenggu",name:"内蒙古"},
    {id:"shandong",name:"山东省"},{id:"henan",name:"河南省"},{id:"jiangsu",name:"江苏省"},
    {id:"zhejiang",name:"浙江省"},{id:"anhui",name:"安徽省"},{id:"fujian",name:"福建省"},
    {id:"jiangxi",name:"江西省"},{id:"hubei",name:"湖北省"},{id:"hunan",name:"湖南省"},
    {id:"guangdong",name:"广东省"},{id:"guangxi",name:"广西"},{id:"hainan",name:"海南省"},
    {id:"sichuan",name:"四川省"},{id:"guizhou",name:"贵州省"},{id:"yunnan",name:"云南省"},
    {id:"shaanxi",name:"陕西省"},{id:"gansu",name:"甘肃省"},{id:"qinghai",name:"青海省"},
    {id:"ningxia",name:"宁夏"},{id:"xinjiang",name:"新疆"},{id:"xizang",name:"西藏"}
  ];
  provinceList = list;
  var sel = document.getElementById("province");
  sel.innerHTML = list.map(function(p){return "<option value="+p.id+">"+p.name+"</option>";}).join("");
  document.getElementById("config-count").textContent = list.length;
  await loadProvince("jilin");
  sel.value = "jilin";
}

async function loadProvince(id) {
  try {
    var resp = await fetch("js/provinces/" + id + ".json");
    currentConfig = await resp.json();
    var citySel = document.getElementById("city");
    var cities = currentConfig.cities || [{code:"prov",name:"全省默认"}];
    citySel.innerHTML = cities.map(function(c){return "<option value="+c.code+">"+c.name+"</option>";}).join("");
  } catch(e) { console.error("Load province error:", e); currentConfig = null; }
}

function onProvinceChange() {
  var id = document.getElementById("province").value;
  loadProvince(id);
}

function nv(id) { var v = document.getElementById(id).value; return v ? parseFloat(v) : null; }

function calculate() {
  var errEl = document.getElementById("error-msg");
  errEl.style.display = "none";
  if (!currentConfig) { errEl.textContent = "省份配置加载中，请稍候再试"; errEl.style.display = "block"; return; }
  try {
    var by = parseInt(document.getElementById("birthYear").value);
    var bm = parseInt(document.getElementById("birthMonth").value);
    var wy = parseInt(document.getElementById("workYear").value);
    var wm = parseInt(document.getElementById("workMonth").value);
    if (!by || !bm || !wy || !wm) { errEl.textContent = "请填写完整的出生和参工年月"; errEl.style.display = "block"; return; }
    var input = {
      name: "测算用户",
      gender: document.getElementById("genderType").value === "male" ? "男" : "女",
      genderType: document.getElementById("genderType").value,
      cityType: document.getElementById("city").value,
      retireType: document.getElementById("retireType").value,
      birthYear: by, birthMonth: bm, workYear: wy, workMonth: wm,
      avgIndex: parseFloat(document.getElementById("avgIndex").value) || 1.0,
      personalAccInput: parseFloat(document.getElementById("personalAcc").value) || 0,
      skipDelay: false
    };
    var sy = nv("sightYears"); if (sy != null) input.sightYears = sy;
    var pa = nv("preAccountYears"); if (pa != null) input.preAccountYears = pa;
    var ty = nv("totalYears"); if (ty != null) input.totalYears = ty;
    var mo = nv("months"); if (mo != null) input.months = mo;
    var br = nv("baseRetire"); if (br != null) input.baseRetireInput = br;
    var bp = nv("baseProv"); if (bp != null) input.baseProvInput = bp;
    var ti = nv("transIndex"); if (ti != null) input.transIndex = ti;
    var sf = document.getElementById("specialFlags").value;
    if (sf === "oneChild" || sf === "both") input.oneChild = true;
    if (sf === "intellectual" || sf === "both") input.intellectual = true;
    var result = window.PensionEngine.calculate(currentConfig, input);
    displayResult(result);
  } catch(e) {
    errEl.textContent = "计算出错: " + e.message;
    errEl.style.display = "block";
  }
}

function displayResult(result) {
  var r = result.legal;
  document.getElementById("result-card").classList.remove("result-hidden");
  document.getElementById("total-amount").innerHTML = "\u00a5" + r.total.toLocaleString("zh-CN",{minimumFractionDigits:2}) + "<br><small>月基本养老金</small>";
  var items = [
    {label:"基础养老金",val:r.basicPension.amount,desc:r.basicPension.description},
    {label:"个人账户养老金",val:r.personalAccount.amount,desc:r.personalAccount.description}
  ];
  if (r.extraPension && r.extraPension.amount > 0) items.push({label:"增发基础养老金",val:r.extraPension.amount});
  if (r.transitionalPension && r.transitionalPension.amount > 0) items.push({label:"过渡性养老金",val:r.transitionalPension.amount,desc:r.transitionalPension.description});
  if (r.specialAddition && r.specialAddition.amount > 0) items.push({label:"特殊增发",val:r.specialAddition.amount,desc:r.specialAddition.description});
  if (r.adjustmentFund && r.adjustmentFund.amount > 0) items.push({label:"调节金",val:r.adjustmentFund.amount});
  var grid = document.getElementById("result-grid");
  grid.innerHTML = items.map(function(i){
    var d = i.desc ? " <span style='font-size:11px;color:#86868b'>("+i.desc+")</span>" : "";
    return "<div class='item'><div class='label'>"+i.label+d+"</div><div class='val'>\u00a5"+i.val.toLocaleString("zh-CN",{minimumFractionDigits:2})+"</div></div>";
  }).join("");
  var transCoef = (currentConfig.modules&&currentConfig.modules.transitional_pension?currentConfig.modules.transitional_pension.coefficient:0)*100;
  document.getElementById("info-bar").innerHTML = [
    "退休日期: " + (result.legalDate||"--"),
    "退休年龄: " + (r.ageStr||"--"),
    "计发月数: " + (r.months||"--"),
    "累计年限: " + (r.totalYears||0).toFixed(2) + "年",
    "计发基数: \u00a5" + (r.baseRetire||0).toLocaleString(),
    "过渡系数: " + transCoef + "%"
  ].map(function(t){return "<span class='info-tag'>"+t+"</span>";}).join("");
  var fc = document.getElementById("flex-compare");
  if (result.flex && result.flex.total) {
    fc.style.display = "block";
    fc.innerHTML = "<strong>弹性退休对比</strong><br>法定 \u00a5" + r.total.toFixed(2) + " | 提前 \u00a5" + result.flex.total.toFixed(2) + " | 差额: \u00a5" + ((result.flex.total||0)-(r.total||0)).toFixed(2);
  } else { fc.style.display = "none"; }
  document.getElementById("result-card").scrollIntoView({behavior:"smooth"});
}

init();
</script>`;

h = before + js + after;
fs.writeFileSync('docs/index.html', h);
console.log('Done, size:', h.length);
