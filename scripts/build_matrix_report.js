// 从 matrix.json 生成可视化情景矩阵报告（HTML）
// 用法：node scripts/build_matrix_report.js [--dir=reports/xxx]
const fs = require('fs')
const path = require('path')

const ROOT = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台'
function arg(name, def) {
  const p = process.argv.find(a => a.startsWith('--' + name + '='))
  return p ? p.slice(name.length + 3) : def
}
const DIR = arg('dir', ROOT + '/reports/matrix-jilin-delay-2026-09-10')

const data = JSON.parse(fs.readFileSync(path.join(DIR, 'matrix.json'), 'utf8'))
const meta = data.meta
const rows = data.rows

// 兼容旧 meta（无 agesInfo 时从 ages + ageLabels 兜底）
const agesInfo = meta.agesInfo || meta.ages.map(a => ({ age: a, role: (meta.ageLabels || {})[a] || '', gender: a >= 60 ? 'male' : 'female' }))
const get = (age, years, tier) => rows.find(r => r.age === age && r.years === years && r.tier === tier)

const tMin = Math.min(...rows.map(r => r.total))
const tMax = Math.max(...rows.map(r => r.total))
const rMin = Math.min(...rows.map(r => r.replaceRate))
const rMax = Math.max(...rows.map(r => r.replaceRate))

function hex2rgb(h) {
  h = h.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b)
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'
}

// ---------- 三张表 ----------
const tables = agesInfo.map(info => {
  const sample = get(info.age, meta.years[0], meta.tiers[0])
  let body = ''
  for (const yrs of meta.years) {
    let tds = ''
    for (const tier of meta.tiers) {
      const r = get(info.age, yrs, tier)
      const hi = r.replaceRate >= 50 ? ' hi' : ''
      const warn = yrs < 20 ? ' warn' : ''
      const tip = `参保年龄 ${r.startAge} 岁｜基础养老金 ${r.basic}｜增发 ${r.extra}｜个人账户 ${r.personal}（余额 ${r.balance.toLocaleString()} ÷ ${r.months}月）｜过渡性 ${r.transitional}｜缴费基数 ${r.payBase.toLocaleString()} 元`
      tds += `<td class="c${hi}${warn}" data-total="${r.total}" data-rate="${r.replaceRate}" title="${tip}">`
        + `<span class="a">${r.total.toFixed(2)}</span>`
        + `<span class="b">${r.replaceRate}%</span></td>`
    }
    body += `<tr><th class="rh">${yrs} 年</th>${tds}</tr>`
  }
  const head = meta.tiers.map(t => `<th>${t} 档</th>`).join('')
  return `<section class="block">
  <h2>${info.age} 岁退休${info.role ? ' · ' + info.role : ''}<span class="mk">计发月数 ${sample.months}</span></h2>
  <table>
    <thead><tr><th class="rh">年限 ↓ / 档位 →</th>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</section>`
}).join('\n')

// ---------- 观察（全部由数据实时计算） ----------
const A = agesInfo.map(x => x.age)
const a0 = A[0], aMid = A[1], aTop = A[A.length - 1]
const midName = (agesInfo[1].role ? agesInfo[1].role + ' ' : '') + aMid

// 1. 延迟退休的"免费增益"（计发月数杠杆）
const L55 = get(a0, 20, 60), LTop = get(aTop, 20, 60)
const lev = `退休年龄越晚、个人账户养老金越高（60 档缴 20 年，一分钱没多缴）：${a0} 岁退 ${L55.personal} 元（÷${L55.months} 月）→ ${aTop} 岁退 ${LTop.personal} 元（÷${LTop.months} 月），<b>个账 +${((LTop.personal / L55.personal - 1) * 100).toFixed(1)}%</b>；合计养老金 ${L55.total} → ${LTop.total} 元，<b>+${((LTop.total / L55.total - 1) * 100).toFixed(1)}%</b>。这部分增益 100% 来自计发月数（${L55.months} → ${LTop.months}），与缴费无关。`

// 2. 基础养老金与退休年龄无关
const o2 = get(aMid, 20, 60)
const obs2 = `基础养老金与退休年龄<b>完全无关</b>：${A.join(' / ')} 岁退休的基础养老金都是 <b>${o2.basic}</b> 元，个人账户余额也都是 <b>${o2.balance.toLocaleString()}</b> 元——公式里根本没有"退休年龄"这个变量。年龄只通过计发月数影响个人账户那一项。`

// 3. 档位线性 + 相对增幅递减
const g60 = get(aMid, 15, 60).total, g100 = get(aMid, 15, 100).total
const g200 = get(aMid, 15, 200).total, g300 = get(aMid, 15, 300).total
const per10 = (g300 - g200) / 10
const obs3 = `金额对档位是<b>严格线性</b>的：${aMid} 岁退休、缴 15 年，每提高 10 个档位固定增加 <b>${per10.toFixed(2)} 元</b>（60→100 档 +${(g100 - g60).toFixed(2)}，200→300 档 +${(g300 - g200).toFixed(2)}）。但<b>相对增幅必然递减</b>：60→100 档 +${((g100 / g60 - 1) * 100).toFixed(1)}%，而 200→300 档每 10 档位仅 +${((per10 / g200) * 100).toFixed(1)}%。<b>低档位提档的相对效率最高</b>。`

// 4. 吉林长缴增发
const e25 = get(aMid, 25, 100).extra, e30 = get(aMid, 30, 100).extra
const obs4 = `吉林独有的"长缴增发"（实际缴费超 20 年部分分段增发）：100 档 ${aMid} 岁退休，缴 25 年增发 <b>${e25}</b> 元，缴 30 年增发 <b>${e30}</b> 元；20 年及以下不触发。这是吉林特色，其他省没有。`

// 5. 替代率达标统计
const hiList = rows.filter(r => r.replaceRate >= 50)
const obs5 = `全部 ${rows.length} 个格子里，社平替代率（分母 = 吉林全省计发基数 ${meta.provSocial} 元）达到 50%（社科院公布的全国平均线）的只有 <b>${hiList.length}</b> 个（金色边框标出）：`
  + (hiList.length ? hiList.map(r => `${r.age}岁/${r.years}年/${r.tier}档 ${r.replaceRate}%`).join('、') : '无')

// 6. 极值
const tMinRow = rows.reduce((a, b) => a.total < b.total ? a : b)
const tMaxRow = rows.reduce((a, b) => a.total > b.total ? a : b)
const obs6 = `两端差距：最低 <b>${tMin.toFixed(2)}</b> 元（${tMinRow.age}岁/${tMinRow.years}年/${tMinRow.tier}档），最高 <b>${tMax.toFixed(2)}</b> 元（${tMaxRow.age}岁/${tMaxRow.years}年/${tMaxRow.tier}档），<b>相差 ${(tMax / tMin).toFixed(2)} 倍</b>。注意最低档对应"${tMinRow.startAge} 岁才参保"——年限短 + 年龄早，是双重不利。`

// ---------- 渲染 ----------
const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${meta.name}养老金情景矩阵</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#F7F5F0;color:#2C2C2A;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.6}
.wrap{max-width:1000px;margin:0 auto;padding:32px 24px 64px}
h1{font-size:22px;font-weight:500;margin:0 0 6px}
.sub{color:#7A7265;font-size:13px;margin:0 0 20px}
.switch{display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap}
.switch button{border:1px solid #DED7CA;background:#fff;color:#6B6558;padding:7px 16px;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit}
.switch button.on{background:#8B7355;border-color:#8B7355;color:#fff}
.block{margin-bottom:32px}
.block h2{font-size:15px;font-weight:500;margin:0 0 10px;color:#5A5245;padding-left:10px;border-left:3px solid #8B7355;display:flex;align-items:baseline;gap:10px}
.block h2 .mk{font-size:11px;color:#9A9282;font-weight:400;background:#fff;border:1px solid #EAE4D8;border-radius:20px;padding:1px 9px}
table{width:100%;border-collapse:separate;border-spacing:3px;table-layout:fixed}
th{font-weight:400;font-size:12px;color:#8A8272}
th.rh{width:88px;text-align:right;padding-right:8px;font-size:11px;line-height:1.3}
tbody th.rh{color:#5A5245;font-size:13px;font-weight:500;text-align:right}
td.c{border-radius:6px;padding:8px 4px;text-align:center;vertical-align:middle;position:relative}
td.c .a{display:block;font-size:15px;font-weight:500;line-height:1.25}
td.c .b{display:block;font-size:11px;opacity:.82;line-height:1.3}
td.c.hi{box-shadow:inset 0 0 0 2px #B8860B}
td.c.warn .a{text-decoration:line-through;text-decoration-color:rgba(180,60,60,.45)}
.obs{background:#fff;border:1px solid #EAE4D8;border-radius:12px;padding:20px 24px}
.obs h2{font-size:15px;font-weight:500;margin:0 0 14px;color:#5A5245}
.obs li{margin-bottom:10px;color:#3E392F}
.obs li b{color:#8B7355;font-weight:500}
.note{margin-top:26px;font-size:12px;color:#8A8272;line-height:1.75}
.note b{color:#6B6558;font-weight:500}
.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:#7A7265;margin-bottom:14px}
.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px}
</style></head>
<body><div class="wrap">
<h1>${meta.name}养老金情景矩阵</h1>
<p class="sub">长春市 · 退休年龄 ${agesInfo.map(x => x.age + (x.role ? '（' + x.role + '）' : '')).join(' / ')} · ${meta.years.length} 个缴费年限 × ${meta.tiers.length} 个缴费档位 × ${agesInfo.length} 个退休年龄 ＝ <b>${rows.length}</b> 个样本 · 正元养老金计算引擎实算</p>
<div class="switch">
  <button class="on" data-mode="total">养老金金额（元/月）</button>
  <button data-mode="rate">社平替代率（占 ${meta.provSocial} 元）</button>
</div>
${tables}
<div class="legend">
  <span><i style="background:${mix('#FDFAF4', '#8B7355', 0.08)}"></i>低</span>
  <span><i style="background:${mix('#FDFAF4', '#8B7355', 0.5)}"></i>中</span>
  <span><i style="background:${mix('#FDFAF4', '#8B7355', 1)}"></i>高</span>
  <span><i style="background:#fff;box-shadow:inset 0 0 0 2px #B8860B"></i>替代率 ≥ 50%</span>
  <span><i style="background:#fff;border:1px dashed #C9C2B4"></i>划掉＝缴费不满 20 年</span>
  <span>悬停单元格看分项构成</span>
</div>
<section class="obs">
<h2>扫出来的 6 条规律</h2>
<ol>
<li>${lev}</li>
<li>${obs2}</li>
<li>${obs3}</li>
<li>${obs4}</li>
<li>${obs5}</li>
<li>${obs6}</li>
</ol>
</section>
<p class="note">
<b>口径说明</b>：① 退休年龄由引擎 <code>retireAge</code> 参数显式指定（${A.join(' / ')}），用于横向对照；② 三类年龄<b>统一放在同一年（${meta.retireMonth}）退休</b>、用同一套吉林 2025 计发基数（长春 ${meta.baseRetire} 元 / 全省 ${meta.provSocial} 元）对比，<b>不代表实际退休年份不同</b>；③ 参保年龄 ＝ 退休年龄 − 缴费年限（如 60 岁缴 15 年＝45 岁才参保）；④ 全部按"连续缴费、无中断"假设，个人账户余额由引擎按历年记账利率复利估算；⑤ 未含视同缴费年限，故过渡性养老金为 0，有视同工龄的人实际更高；⑥ 基础养老金为吉林特有的"市县 + 全省"双基数加权公式。<br>
<b>政策提醒</b>：全国已决定自 <b>2030 年起最低缴费年限从 15 年逐步提高到 20 年</b>（每年提高 6 个月）。表中 15 年、不满 20 年的格子（<span style="text-decoration:line-through;color:#B43C3C">划掉</span>）对应 2030 年之后退休的人员将<b>不满足领取条件</b>，仅作对照参考。
</p>
</div>
<script>
var mode = 'total'
var tMin = ${tMin}, tMax = ${tMax}, rMin = ${rMin}, rMax = ${rMax}
function hex2rgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function mix(a,b,t){var A=hex2rgb(a),B=hex2rgb(b);return 'rgb('+A.map(function(v,i){return Math.round(v+(B[i]-v)*t)}).join(',')+')'}
function paint(){
  document.querySelectorAll('td.c').forEach(function(td){
    var v = parseFloat(td.dataset[mode === 'total' ? 'total' : 'rate'])
    var min = mode === 'total' ? tMin : rMin
    var max = mode === 'total' ? tMax : rMax
    var t = Math.pow((v - min) / (max - min), 0.8)
    td.style.background = mix('#FDFAF4', '#8B7355', t)
    var col = t > 0.55 ? '#fff' : '#3A342A'
    td.style.color = col
    td.querySelectorAll('span').forEach(function(s){ s.style.color = col })
  })
}
document.querySelectorAll('.switch button').forEach(function(btn){
  btn.addEventListener('click', function(){
    mode = btn.dataset.mode
    document.querySelectorAll('.switch button').forEach(function(b){ b.classList.toggle('on', b === btn) })
    paint()
  })
})
paint()
</script>
</body></html>`

const out = path.join(DIR, 'matrix-' + meta.province + '.html')
fs.writeFileSync(out, html)
console.log('已生成：', out)
console.log('格子数：', rows.length, '｜ 金额区间：', tMin.toFixed(2), '-', tMax.toFixed(2), '｜ 替代率区间：', rMin + '% - ' + rMax + '%')
console.log('替代率≥50% 的格子：', hiList.length)
