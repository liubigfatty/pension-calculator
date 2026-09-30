#!/usr/bin/env node
/**
 * _audit_all.js — 引擎一键盘点（只读体检 · 纯内联单进程）
 *
 * 【为什么需要它】
 * 仓库改了几十版之后，"现在到底是什么状态"没人能一句话说清：
 * scripts/ 里有 70+ 个一次性 _probe_* / _verify_* 脚本，不知道哪个还有效；
 * 副本、产物、探针是否同步全靠记忆。本脚本把分散检查串成一个入口，跑完给红黄绿结论。
 *
 * ⚠️ 硬约束 1：本脚本**只读**，绝不调用 sync-provinces.js（会写入并覆盖
 *    青海/广西那份"故意撤回"的旧语义副本待办）。副本差异只报告、不自动修。
 * ⚠️ 硬约束 2：**不使用 child_process**。本环境（Git-Bash 沙箱）spawnSync 起不来子进程
 *    （连 `node -e` 都返回 exit=null），所以所有检查必须内联实现。
 *    因此 git 状态与 run-cases 全量回归改为"打印命令，终端手动跑"。
 *
 * 用法：
 *   node scripts/_audit_all.js          # 全量体检（约 3-8 秒）
 *   node scripts/_audit_all.js --only 2,4   # 只跑指定项
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const argv = process.argv.slice(2)
// 同时支持 `--only 2,4`（空格）与 `--only=2,4`（等号）
let ONLY = null
{
  const i = argv.findIndex(a => a === '--only' || a.startsWith('--only'))
  if (i >= 0) {
    const a = argv[i]
    const v = a.includes('=') ? a.split('=')[1] : argv[i + 1]
    ONLY = String(v || '').split(',').map(s => s.trim()).filter(Boolean)
  }
}
const want = n => !ONLY || ONLY.includes(String(n))

const ICON = { ok: '✅', warn: '⚠️', bad: '❌', info: 'ℹ️' }
const verdicts = []
const t0 = Date.now()

function hr(t) { console.log('\n' + '─'.repeat(60)); console.log(t) }
function mark(level, headline) { verdicts.push({ headline, level }); return level }

// ══════════════ ② 引擎副本一致性（7 份，内联加载） ══════════════
const ENGINE_COPIES = [
  { file: 'engine.js', browser: true, note: '★线上（Pages 发布根）' },
  { file: 'docs/js/pension-engine.js', browser: false, note: 'docs 文档站' },
  { file: 'docs/js/pension-engine-browser.js', browser: false, note: 'docs 浏览器版' },
  { file: 'docs/网页版/js/pension-engine-browser.js', browser: false, note: 'docs 网页版' },
  { file: 'engine/pension-engine.js', browser: false, note: '★工作副本（真相源）' },
  { file: 'cloudfunctions/calculate/pension-engine.js', browser: false, note: '云函数（部署快照）' },
  { file: 'web/engine.js', browser: true, note: 'web/ 构建产物 IIFE' },
]
function loadEngine(rel, browser) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) return { missing: true }
  try {
    delete require.cache[require.resolve(abs)]
    if (browser) {
      global.window = {}
      global.document = global.document || { getElementById: () => null, querySelector: () => null }
      require(abs)
      return { eng: global.window.PensionEngine }
    }
    const m = require(abs)
    return { eng: m && m.calculate ? m : (m && m.default) || m }
  } catch (e) { return { err: e.message } }
}

function checkEngineCopies() {
  hr('② 引擎副本一致性（7 份 · 同输入同结果）')
  // 基准输入：吉林读者案例（本轮刚验过）；再叠一组延迟退休边界与女性干部
  const cases = [
    { label: '吉林男 60岁5个月', prov: 'jilin', inp: { gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 5, workYear: 1986, workMonth: 9, retireDateInput: { year: 2026, month: 10 }, avgIndex: 1.0, personalAccInput: 0, cityType: 'prov', baseRetireInput: 7322.08, baseProvInput: 7322.08, totalYearsInput: 40.17, sightYearsInput: 8.83 } },
    { label: '吉林男 60岁整', prov: 'jilin', inp: { gender: 'male', genderType: 'male', birthYear: 1966, birthMonth: 5, workYear: 1986, workMonth: 9, retireDateInput: { year: 2026, month: 5 }, avgIndex: 1.0, personalAccInput: 0, cityType: 'prov', baseRetireInput: 7322.08, baseProvInput: 7322.08 } },
    { label: '吉林女干部 55岁+', prov: 'jilin', inp: { gender: 'female', genderType: 'cadre', birthYear: 1971, birthMonth: 3, workYear: 1993, workMonth: 7, retireDateInput: { year: 2026, month: 12 }, avgIndex: 0.8, personalAccInput: 0, cityType: 'cc', baseRetireInput: 7978.25, baseProvInput: 7322.08 } },
  ]
  // ⚠️ 必须先把"工作副本"基准算出来，否则排在基准之前的副本会跳过比对（曾误报全绿）
  const BASE_FILE = 'engine/pension-engine.js'
  const baseRow = (() => {
    const { eng } = loadEngine(BASE_FILE, false)
    if (!eng || !eng.calculate) return null
    return cases.map(c => {
      try {
        const cfg = require(path.join(ROOT, 'cloudfunctions/calculate/provinces', c.prov + '.js')).getEngineConfig()
        return Number(eng.calculate(cfg, JSON.parse(JSON.stringify(c.inp))).legal.total).toFixed(2)
      } catch (e) { return 'ERR' }
    })
  })()
  if (!baseRow) { console.log(`   ${ICON.bad} 工作副本 ${BASE_FILE} 加载失败，无法比对`); return mark('bad', '引擎副本：基准加载失败') }

  const results = {}
  let badCount = 0, missingCount = 0
  for (const t of ENGINE_COPIES) {
    const { eng, missing, err } = loadEngine(t.file, t.browser)
    if (missing) { console.log(`   ${ICON.bad} ${t.file}  不存在`); missingCount++; continue }
    if (err || !eng || !eng.calculate) { console.log(`   ${ICON.bad} ${t.file}  加载失败: ${err || '无 calculate'}`); badCount++; continue }
    const row = []
    for (const c of cases) {
      let cfg
      try { cfg = require(path.join(ROOT, 'cloudfunctions/calculate/provinces', c.prov + '.js')).getEngineConfig() }
      catch (e) { row.push('cfgErr'); continue }
      try {
        const L = eng.calculate(cfg, JSON.parse(JSON.stringify(c.inp))).legal
        row.push(Number(L.total).toFixed(2))
      } catch (e) { row.push('ERR:' + e.message.slice(0, 20)) }
    }
    results[t.file] = row
    const same = row.every((v, i) => v === baseRow[i])
    if (!same) badCount++
    console.log(`   ${same ? ICON.ok : ICON.bad} ${t.file.padEnd(46)} ${row.join(' | ')}   ${t.note}`)
  }
  console.log(`   （列为：${cases.map(c => c.label).join(' / ')}）`)
  const level = (badCount || missingCount) ? 'bad' : 'ok'
  return mark(level, `引擎副本：${badCount + missingCount ? badCount + ' 份不一致 / ' + missingCount + ' 份缺失' : '7 份输出一致'}`)
}

// ══════════════ ③ 省份副本同步（含"整体错位 N 年"识别） ══════════════
function extractBlockText(file, name) {
  const txt = fs.readFileSync(file, 'utf8')
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*\\{')
  const start = txt.search(re)
  if (start < 0) return null
  const bs = txt.indexOf('{', start)
  let depth = 0, i = bs
  for (; i < txt.length; i++) {
    if (txt[i] === '{') depth++
    else if (txt[i] === '}') { depth--; if (depth === 0) break }
  }
  return txt.slice(start, i + 1)
}
function extractAllConsts(file) {
  const txt = fs.readFileSync(file, 'utf8'); const map = {}
  const re = /const\s+([A-Z_][A-Z0-9_]*)\s*=\s*/g; let m
  while ((m = re.exec(txt))) {
    const name = m[1]; const rest = txt.slice(m.index + m[0].length)
    if (/^[-\d.]/.test(rest)) { const n = rest.match(/^([-\d.]+)/); if (n) map[name] = parseFloat(n[1]) }
    else if (rest[0] === '{') {
      let d = 0, i = 0
      for (; i < rest.length; i++) { if (rest[i] === '{') d++; else if (rest[i] === '}') { d--; if (!d) break } }
      try { map[name] = eval('(' + rest.slice(0, i + 1) + ')') } catch (e) {}
    }
  }
  return map
}
function extractObj(file, name) {
  const b = extractBlockText(file, name); if (!b) return undefined
  const open = b.indexOf('{')
  const inner = b.slice(open, b.lastIndexOf('}') + 1).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const consts = extractAllConsts(file); const keys = Object.keys(consts)
  try { return new Function(...keys, 'return ' + inner + ';')(...keys.map(k => consts[k])) } catch (e) { return undefined }
}
// 找最佳错位年数 k：副本[y] == 源[y+k]
// ⚠️ k 必须双向搜索：实测存在 k=+1（旧副本未右移）与 k=-1（另一套语义）两种方向，
//    只搜 k>=0 会把 k=-1 误判成"真不一致"
function bestShift(src, cp) {
  const cy = Object.keys(cp).filter(k => /^\d{4}$/.test(k))
  if (cy.length === 0) return null
  let best = null
  for (let k = -2; k <= 3; k++) {
    let match = 0, total = 0
    for (const y of cy) {
      const sy = String(+y + k)
      if (src[sy] === undefined) continue
      total++
      if (Math.abs(cp[y] - src[sy]) < 0.01) match++
    }
    if (total >= 3 && match / total >= 0.9) {
      const score = match / total
      if (!best || score > best.score || (score === best.score && Math.abs(k) < Math.abs(best.k))) {
        best = { k, match, total, score }
      }
    }
  }
  return best
}

function checkProvinceCopies() {
  hr('③ 省份副本同步（真相源 provinces/*.js → 4 个 .json 镜像）')
  const AUTH = path.join(ROOT, 'cloudfunctions/calculate/provinces')
  const COPIES = ['cloudfunctions/calculate/provinces', 'provinces', 'docs/js/provinces', 'docs/网页版/provinces']
  const provs = fs.readdirSync(AUTH).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, '')).sort()

  const realDiff = [], shifted = {}, baseDiff = [], nested = []
  for (const code of provs) {
    const srcFile = path.join(AUTH, code + '.js')
    const srcAsh = extractObj(srcFile, 'AVG_SALARY_HISTORY')
    const srcBase = extractObj(srcFile, 'PROV_BASE')
    for (const dir of COPIES) {
      const fp = path.join(ROOT, dir, code + '.json')
      if (!fs.existsSync(fp)) continue
      let j; try { j = JSON.parse(fs.readFileSync(fp, 'utf8')) } catch (e) { continue }
      const cAsh = j.avg_salary_history || {}
      if (srcAsh) {
        const cYears = Object.keys(cAsh).filter(k => /^\d{4}$/.test(k))
        if (cYears.length === 0) {
          // 嵌套结构（如广东 {prov, shenzhen, 深圳}），无年份键，无法用错位模型比对
          nested.push({ code, dir, keys: Object.keys(cAsh).join('/') })
        } else {
          const sh = bestShift(srcAsh, cAsh)
          if (!sh || sh.k === 0) { if (!sh) realDiff.push({ code, dir }) }
          else { shifted[code] = shifted[code] || {}; (shifted[code]['k=' + sh.k] = shifted[code]['k=' + sh.k] || new Set()).add(dir) }
        }
      }
      if (srcBase) {
        const cBase = (j.base_rates && j.base_rates.prov) || j.base_rates || {}
        const by = Object.keys(srcBase).filter(k => /^\d{4}$/.test(k)).sort()
        const last = by[by.length - 1]
        // 阈值 0.5 元：容忍 .08 级别的四舍五入差（如吉林 7322.08 vs 7322），
        // 超过 0.5 才算实质不一致，否则会淹没在精度噪声里
        if (last && Math.abs((cBase[last] ?? -1) - srcBase[last]) > 0.5) {
          baseDiff.push({ code, dir, year: last, src: srcBase[last], cp: cBase[last] })
        }
      }
    }
  }
  console.log(`   已核 ${provs.length} 省 × ${COPIES.length} 目录`)
  const shiftCodes = Object.keys(shifted)
  if (shiftCodes.length) {
    console.log(`   ${ICON.warn} 社平(ash)「整体错位」${shiftCodes.length} 省（副本[Y] == 源[Y+k]，旧语义遗留，非本次引入）：`)
    const byK = {}
    for (const code of shiftCodes) {
      for (const [kk, set] of Object.entries(shifted[code])) {
        byK[kk] = byK[kk] || {}
        byK[kk][code] = [...set]
      }
    }
    for (const kk of Object.keys(byK).sort()) {
      const codes = Object.keys(byK[kk])
      const dirs = new Set(); codes.forEach(c => byK[kk][c].forEach(d => dirs.add(d)))
      console.log(`      ${kk}  ${codes.length} 省  目录[${[...dirs].join('/')}]`)
      console.log(`         ${codes.join('、')}`)
    }
    console.log(`      修它要连同 index-engine/calcIndex.js 取数索引一起改，已列待办；k 方向不同说明存在两套语义，先别盲改。`)
  }
  if (nested.length) {
    console.log(`   ${ICON.info} 嵌套结构跳过比对 ${nested.length} 处（ash 非年份表，如广东含 shenzhen 子表）：`)
    nested.slice(0, 5).forEach(d => console.log(`      ${d.code} @ ${d.dir}  键=${d.keys}`))
  }
  if (realDiff.length) {
    console.log(`   ${ICON.bad} 社平(ash)真不一致（非错位能解释）${realDiff.length} 处：`)
    realDiff.slice(0, 10).forEach(d => console.log(`      ${d.code} @ ${d.dir}`))
  }
  if (baseDiff.length) {
    console.log(`   ${ICON.bad} 计发基数(base)最后年不一致 ${baseDiff.length} 处：`)
    baseDiff.slice(0, 10).forEach(d => console.log(`      ${d.code} @ ${d.dir}  ${d.year}: 源=${d.src} 副本=${d.cp}`))
  }
  if (!realDiff.length && !baseDiff.length) console.log(`   ${ICON.ok} 计发基数全部一致`)
  const level = (realDiff.length || baseDiff.length) ? 'bad' : (shiftCodes.length ? 'warn' : 'ok')
  return mark(level, `省份副本：${realDiff.length + baseDiff.length} 处真不一致 / ${shiftCodes.length} 省旧语义待办`)
}

// ══════════════ ④ build 产物新鲜度（mtime，2 秒容差） ══════════════
function checkBuildFreshness() {
  hr('④ build 产物新鲜度（真相源 mtime vs 产物 mtime）')
  const AUTH = path.join(ROOT, 'cloudfunctions/calculate/provinces')
  let srcMax = 0, srcNewest = ''
  for (const f of fs.readdirSync(AUTH).filter(x => x.endsWith('.js'))) {
    const mt = fs.statSync(path.join(AUTH, f)).mtimeMs
    if (mt > srcMax) { srcMax = mt; srcNewest = f }
  }
  const PRODUCTS = [
    ['cloudfunctions/calculate/provinces-data.js', 'node scripts/build-cloud-provinces.js'],
    ['web/provinces-bundle.js', 'node scripts/build-web.js'],
    ['web-index/provinces-index-data.js', 'node scripts/build-web-index.js'],
    ['index-mini/cloudfunctions/calcIndex/provinces-data.js', 'node scripts/_gen_province_data.js'],
    ['index-mini/data/salaryHistory.js', 'cd index-mini && node ../scripts/_gen_salary_data.js'],
  ]
  let stale = 0
  console.log(`   真相源最新改动：${srcNewest}  ${new Date(srcMax).toLocaleString('zh-CN')}`)
  for (const [rel, cmd] of PRODUCTS) {
    const fp = path.join(ROOT, rel)
    if (!fs.existsSync(fp)) { console.log(`   ${ICON.bad} ${rel} 不存在`); stale++; continue }
    const mt = fs.statSync(fp).mtimeMs
    const ok = mt >= srcMax - 2000
    if (!ok) stale++
    console.log(`   ${ok ? ICON.ok : ICON.bad} ${rel.padEnd(52)} ${new Date(mt).toLocaleString('zh-CN')}${ok ? '' : '  ← 需跑 ' + cmd}`)
  }
  return mark(stale ? 'bad' : 'ok', `build 产物：${stale ? stale + ' 项过期' : '全部新鲜'}`)
}

// ══════════════ ⑥ 探针漂移（内联跑 probes/） ══════════════
function checkProbes() {
  hr('⑥ 探针漂移（probes/ golden master · 验"变没变"）')
  const dir = path.join(ROOT, 'probes')
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).filter(f => f.endsWith('.json')).length) {
    console.log('   ⚠️ 无探针（算完案例后跑 node scripts/_probe_case.js --save <id> 建一条）')
    return mark('warn', '探针：无')
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  let drift = 0
  for (const f of files) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    let cfg, eng
    try {
      eng = require(path.join(ROOT, 'engine/pension-engine.js'))
      cfg = require(path.join(ROOT, 'cloudfunctions/calculate/provinces', p.province + '.js')).getEngineConfig()
    } catch (e) { console.log(`   ${ICON.bad} ${f} 加载失败 ${e.message.slice(0, 40)}`); drift++; continue }
    let L
    try { L = eng.calculate(cfg, p.input).legal } catch (e) { console.log(`   ${ICON.bad} ${f} 计算失败 ${e.message.slice(0, 40)}`); drift++; continue }
    const b = p.baseline || {}
    const cmp = [
      ['total', L.total, b.total], ['months', L.months, b.months],
      ['basic', L.basicPension && L.basicPension.amount, b.basic],
      ['account', L.personalAccount && L.personalAccount.amount, b.account],
    ]
    const diffs = cmp.filter(([k, got, exp]) => exp !== undefined && Math.abs(got - exp) > 0.01)
    if (diffs.length) {
      drift++
      console.log(`   ${ICON.bad} ${f}  漂移：` + diffs.map(([k, g, e]) => `${k} ${e}→${g}`).join('，'))
    } else {
      console.log(`   ${ICON.ok} ${f.padEnd(38)} total=${Number(L.total).toFixed(2)}  无漂移`)
    }
  }
  console.log(`   探针数 ${files.length}`)
  return mark(drift ? 'bad' : 'ok', `探针：${drift ? drift + ' 条漂移' : files.length + ' 条无漂移'}`)
}

// ══════════════ ①⑤ 终端手动项 ══════════════
function checkManual() {
  hr('①⑤ 需在终端手动跑（本环境禁止起子进程）')
  console.log('   git 工作区：')
  console.log('     git status --porcelain')
  console.log('     git diff --shortstat')
  console.log('     git log --oneline -5')
  console.log('   官方案例回归（129 条第一方证据）：')
  console.log('     node scripts/run-cases.js')
  console.log('   分档验算（注意：有 109 个既有失败，判定回归要用 git stash 对照实验）：')
  console.log('     node scripts/_verify_tiers.js')
  return mark('info', 'git / run-cases：需终端手动跑（见上命令）')
}

// ══════════════ 主流程 ══════════════
console.log('\n╔' + '═'.repeat(60) + '╗')
console.log('║' + ' 养老金引擎 · 一键盘点（只读 · 不写入 · 不起子进程）'.padEnd(46) + '║')
console.log('║' + (' ' + new Date().toLocaleString('zh-CN')).padEnd(60) + '║')
console.log('╚' + '═'.repeat(60) + '╝')

if (want(2)) checkEngineCopies()
if (want(3)) checkProvinceCopies()
if (want(4)) checkBuildFreshness()
if (want(6)) checkProbes()
if (want(1) || want(5)) checkManual()

console.log('\n╔' + '═'.repeat(60) + '╗')
console.log('║' + ' 汇总'.padEnd(58) + '║')
console.log('╚' + '═'.repeat(60) + '╝')
verdicts.forEach((v, i) => {
  const icon = v.level === 'ok' ? ICON.ok : v.level === 'warn' ? ICON.warn : v.level === 'info' ? ICON.info : ICON.bad
  console.log(`  ${icon}  ${v.headline}`)
})
const bad = verdicts.filter(v => v.level === 'bad').length
const warn = verdicts.filter(v => v.level === 'warn').length
console.log('\n  判定：' + (bad ? `🔴 ${bad} 项必须处理` : (warn ? `🟡 ${warn} 项需留意，无阻断` : '🟢 全部通过')))
console.log(`  耗时：${((Date.now() - t0) / 1000).toFixed(1)}s`)
console.log('\n  下一步：')
console.log('    · 先看 ❌ 项，逐条定位（读源码，不猜）')
console.log('    · 改动走最小集，改完重跑本脚本确认转绿')
console.log('    · 判断回归是否本次引入 → git stash 对照实验，别一看红就回滚')
console.log('    · 状态绿了再 git commit 落盘，别让未提交改动继续堆积')
