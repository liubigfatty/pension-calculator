/* 网页版养老金计算器 — 交互逻辑
 * 依赖：engine.js (window.PensionEngine) + provinces-bundle.js (window.PROVINCE_CONFIGS)
 * 调用方式与云函数 calculate/index.js 完全一致，保证结果同源。
 */
(function () {
  'use strict'

  var E = window.PensionEngine
  var C = window.PROVINCE_CONFIGS

  // 省份：完整行政区划全称 → 拼音 slug（4直辖市 + 22省 + 5自治区）
  var PROVINCES = [
    { name: '北京市', slug: 'beijing' }, { name: '天津市', slug: 'tianjin' },
    { name: '河北省', slug: 'hebei' }, { name: '山西省', slug: 'shanxi' },
    { name: '内蒙古自治区', slug: 'neimenggu' }, { name: '辽宁省', slug: 'liaoning' },
    { name: '吉林省', slug: 'jilin' }, { name: '黑龙江省', slug: 'heilongjiang' },
    { name: '上海市', slug: 'shanghai' }, { name: '江苏省', slug: 'jiangsu' },
    { name: '浙江省', slug: 'zhejiang' }, { name: '安徽省', slug: 'anhui' },
    { name: '福建省', slug: 'fujian' }, { name: '江西省', slug: 'jiangxi' },
    { name: '山东省', slug: 'shandong' }, { name: '河南省', slug: 'henan' },
    { name: '湖北省', slug: 'hubei' }, { name: '湖南省', slug: 'hunan' },
    { name: '广东省', slug: 'guangdong' }, { name: '广西壮族自治区', slug: 'guangxi' },
    { name: '海南省', slug: 'hainan' }, { name: '重庆市', slug: 'chongqing' },
    { name: '四川省', slug: 'sichuan' }, { name: '贵州省', slug: 'guizhou' },
    { name: '云南省', slug: 'yunnan' }, { name: '西藏自治区', slug: 'xizang' },
    { name: '陕西省', slug: 'shaanxi' }, { name: '甘肃省', slug: 'gansu' },
    { name: '青海省', slug: 'qinghai' }, { name: '宁夏回族自治区', slug: 'ningxia' },
    { name: '新疆维吾尔自治区', slug: 'xinjiang' }
  ]

  // 人员类型 → 引擎 genderType（与小程序 RETIRE_TYPE_MAP 一致）
  var RETIRE_TYPES = [
    { label: '企业职工男', gender: 'male', genderType: 'male', identity: 'employee' },
    { label: '企业职工女（原 50 岁退休）', gender: 'female', genderType: 'fw50', identity: 'employee' },
    { label: '企业职工女（原 55 岁退休）', gender: 'female', genderType: 'fw55', identity: 'employee' },
    { label: '灵活就业男', gender: 'male', genderType: 'male', identity: 'flexible' },
    { label: '灵活就业女', gender: 'female', genderType: 'fw55', identity: 'flexible' }
  ]

  // 双基数省份城市 key → 中文标签
  var CITY_LABELS = { shenzhen: '深圳', zhengzhou: '郑州', shenyang: '沈阳', dalian: '大连', cc: '长春' }
  // 双指数省份（显示过渡性指数输入框）：基础养老金与过渡性养老金使用不同平均缴费指数
  //   浙江/广东/陕西：引擎原生支持，前端透传 transIndex
  //   天津/山西/江苏：双指数省份此前遗漏，2026-07-23 补齐（天津/山西见 MEMORY；江苏 use_trans_index:true）
  var DOUBLE_INDEX = { zhejiang: 1, guangdong: 1, shaanxi: 1, tianjin: 1, shanxi: 1, jiangsu: 1 }

  var INDEX_PRESETS = [0.6, 0.8, 1.0, 1.5, 2.0, 2.5, 3.0]

  // ---------- DOM ----------
  var $ = function (id) { return document.getElementById(id) }
  var elProvince = $('province'), elRetireType = $('retireType')
  var elBirth = $('birthDate'), elWork = $('workDate')
  var elAvg = $('avgIndex'), elChips = $('indexChips')
  var elCityField = $('cityField'), elCity = $('cityType')
  var elTransField = $('transIndexField'), elTrans = $('transIndex')
  var elBalance = $('balance'), elEstimate = $('estimateBtn'), elCalc = $('calcBtn')
  var elResult = $('resultCard'), elTabs = $('scenarioTabs')
  // 加发项控件
  var elExtraField = $('extraField')
  var elExtraRate = $('extraRate')
  var elIntellectual = $('intellectual')
  var elOneChild = $('oneChild')
  var elOneChildAvgPension = $('oneChildAvgPension')
  var elOneChildType = $('oneChildType')
  var elRegionCategory = $('regionCategory')
  var elTibetWorkYears = $('tibetWorkYears')

  // ── 第一步：缴费指数计算器分区 ──
  var IC = {
    toggle: $('indexToggle'), body: $('indexCalcBody'), arrow: $('indexArrow'),
    startDate: $('idxStartDate'), deemedYears: $('idxDeemedYears'), deemedHint: $('idxDeemedHint'),
    deemedStartField: $('idxDeemedStartField'), deemedStartYear: $('idxDeemedStartYear'), deemedStartHint: $('idxDeemedStartHint'),
    gdCityField: $('idxGdCityField'), gdCity: $('idxGdCity'),
    gapHint: $('idxGapHint'), genBtn: $('idxGenBtn'), calcBtn: $('idxCalcBtn'),
    yearlyWrap: $('idxYearlyWrap'), yearlyRows: $('idxYearlyRows'),
    result: $('idxResult'), avgIndex: $('idxAvgIndex'), transRow: $('idxTransRow'), transIndex: $('idxTransIndex'),
    totalMonths: $('idxTotalMonths'), balance: $('idxBalance'), note: $('idxNote'), detailRows: $('idxDetailRows')
  }
  var idxYearlyList = []

  var currentScenario = 'legal'
  var lastResult = null
  var lastInput = null

  // ---------- 初始化 ----------
  function init() {
    if (!E || !C) { alert('引擎加载失败，请确认 engine.js 与 provinces-bundle.js 已生成。'); return }

    PROVINCES.forEach(function (p, i) {
      var o = document.createElement('option')
      o.value = p.slug; o.textContent = p.name
      elProvince.appendChild(o)
    })
    RETIRE_TYPES.forEach(function (t, i) {
      var o = document.createElement('option')
      o.value = String(i); o.textContent = t.label
      elRetireType.appendChild(o)
    })

    // 指数预设
    INDEX_PRESETS.forEach(function (v) {
      var c = document.createElement('span')
      c.className = 'chip' + (v === 1.0 ? ' active' : '')
      c.textContent = (v === 1.0 ? '1.0（基准）' : String(v))
      c.dataset.val = v
      c.addEventListener('click', function () {
        document.querySelectorAll('#indexChips .chip').forEach(function (x) { x.classList.remove('active') })
        c.classList.add('active')
        elAvg.value = v
      })
      elChips.appendChild(c)
    })

    elProvince.addEventListener('change', onProvinceChange)
    elAvg.addEventListener('input', function () {
      document.querySelectorAll('#indexChips .chip').forEach(function (x) { x.classList.remove('active') })
    })
    elEstimate.addEventListener('click', onEstimate)
    elCalc.addEventListener('click', onCalculate)
    elTabs.addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b) return
      currentScenario = b.dataset.sc
      document.querySelectorAll('#scenarioTabs .tab').forEach(function (x) { x.classList.remove('active') })
      b.classList.add('active')
      renderScenario()
    })

    refreshCityOptions()
    refreshExtraOptions()
    initIndexCalc()
  }

  // 省份变化：双基数省显示城市选择；双指数省显示过渡指数；加发项按省显示
  function onProvinceChange() {
    refreshCityOptions()
    refreshExtraOptions()
    var slug = elProvince.value
    elTransField.hidden = !DOUBLE_INDEX[slug]
    if (!DOUBLE_INDEX[slug]) elTrans.value = ''
    refreshIndexCalcProvince(slug)
  }

  // 加发项区块：仅显示当前参保地适用的项目
  function refreshExtraOptions() {
    var slug = elProvince.value
    var rows = document.querySelectorAll('#extraField [data-extra]')
    var any = false
    rows.forEach(function (row) {
      var list = (row.getAttribute('data-extra') || '').trim().split(/\s+/)
      var show = list.indexOf(slug) >= 0
      row.hidden = !show
      if (show) any = true
    })
    elExtraField.hidden = !any
  }

  function refreshCityOptions() {
    var slug = elProvince.value
    var cfg = C[slug]
    elCity.innerHTML = ''
    if (!cfg || !cfg.base_rates) { elCityField.hidden = true; return }
    // 只展示 CITY_LABELS 中有中文标签的规范 slug（cc/shenzhen/zhengzhou 等）
    // 忽略 base_rates 中的冗余键（如中文别名 '长春'、拼音别名 'changchun'）
    var cityKeys = Object.keys(cfg.base_rates).filter(function (k) {
      return k !== 'prov' && CITY_LABELS[k]
    })
    if (cityKeys.length === 0) { elCityField.hidden = true; return }

    // 默认选中 prov（全省），城市选项紧跟其后
    var o0 = document.createElement('option')
    o0.value = 'prov'; o0.textContent = '全省统一计发基数'
    elCity.appendChild(o0)
    cityKeys.forEach(function (k) {
      var o = document.createElement('option')
      o.value = k; o.textContent = CITY_LABELS[k] + '计发基数'
      elCity.appendChild(o)
    })
    elCityField.hidden = false
  }

  // ---------- 构造引擎输入 ----------
  function buildInput() {
    var rt = RETIRE_TYPES[parseInt(elRetireType.value, 10)]
    var birth = (elBirth.value || '').split('-')
    var work = (elWork.value || '').split('-')
    if (birth.length < 2 || work.length < 2) return null

    var input = {
      gender: rt.gender,
      identity: rt.identity,
      genderType: rt.genderType,
      birthYear: parseInt(birth[0], 10),
      birthMonth: parseInt(birth[1], 10),
      workYear: parseInt(work[0], 10),
      workMonth: parseInt(work[1], 10),
      avgIndex: parseFloat(elAvg.value) || 1.0,
      personalAccInput: parseFloat(elBalance.value) || 0,
      cityType: elCityField.hidden ? 'prov' : (elCity.value || 'prov')
    }
    if (!elTransField.hidden && elTrans.value) input.transIndex = parseFloat(elTrans.value)

    // 加发项：直接摊平成引擎所需的扁平字段，绕过云函数 extras 对象断链
    // （云函数把前端 extras 原样透传，但引擎只读扁平字段 extraRate/intellectual/oneChild/...）
    var slug = elProvince.value
    if (slug === 'sichuan' && elExtraRate.value) input.extraRate = parseFloat(elExtraRate.value)
    if (slug === 'ningxia') input.intellectual = elIntellectual.checked
    if (slug === 'yunnan' || slug === 'chongqing' || slug === 'hainan') input.oneChild = elOneChild.checked
    if (slug === 'yunnan' && elOneChildAvgPension.value) input.oneChildAvgPension = parseFloat(elOneChildAvgPension.value)
    if (slug === 'hainan') input.oneChildType = elOneChildType.value || 'parent'
    if (slug === 'xizang') {
      input.regionCategory = elRegionCategory.value || '二类地区'
      if (elTibetWorkYears.value) input.tibetWorkYears = parseFloat(elTibetWorkYears.value)
    }
    return input
  }

  // ---------- 计算 ----------
  function onCalculate() {
    var slug = elProvince.value
    var input = buildInput()
    if (!input) { alert('请完整填写出生年月与参加工作时间'); return }
    if (!input.birthYear || !input.workYear) { alert('请完整填写出生年月与参加工作时间'); return }
    if (isNaN(input.avgIndex) || input.avgIndex < 0.4 || input.avgIndex > 3) {
      alert('平均缴费指数一般为 0.6 ~ 3.0，请检查'); return
    }
    var cfg = C[slug]
    var result
    try {
      result = E.calculate(cfg, input)
    } catch (err) {
      alert('计算出错：' + err.message); console.error(err); return
    }
    lastResult = result
    lastInput = input
    // 不能弹性提前时默认看法定
    if (!result.comparison.canFlex && currentScenario === 'flex') {
      currentScenario = 'legal'
      document.querySelectorAll('#scenarioTabs .tab').forEach(function (x) {
        x.classList.toggle('active', x.dataset.sc === 'legal')
      })
    }
    elResult.hidden = false
    elResult.scrollIntoView({ behavior: 'smooth', block: 'start' })
    renderScenario()
  }

  // 估算个人账户余额
  function onEstimate() {
    var slug = elProvince.value
    var input = buildInput()
    if (!input) { alert('请先填写出生年月、参加工作时间与缴费指数'); return }
    var cfg = C[slug]
    var r = E.calculate(cfg, Object.assign({}, input, { personalAccInput: 0 }))
    var bal = (r.legal && r.legal.personalAccount && r.legal.personalAccount.balance) || 0
    elBalance.value = Math.round(bal)
    if (bal > 0) {
      elEstimate.textContent = '已填入'
      setTimeout(function () { elEstimate.textContent = '估算' }, 1500)
    }
  }

  // ---------- 渲染 ----------
  function fmt(n) {
    if (n == null || isNaN(n)) return '—'
    return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  function fmtYears(n) {
    if (n == null || isNaN(n)) return '—'
    return Number(n).toFixed(1) + ' 年'
  }
  function fmtDate(d) {
    if (!d || !d.year) return '—'
    return d.year + ' 年 ' + String(d.month).padStart(2, '0') + ' 月'
  }

  function renderScenario() {
    if (!lastResult) return
    var sc = lastResult[currentScenario] || lastResult.legal
    var cmp = lastResult.comparison

    $('totalAmount').textContent = fmt(sc.total)
    // 个人替代率 = 本人养老金 ÷ (退休地计发基数 × 本人平均缴费指数)，与报告页口径一致（本人收入口径，对标国际/官方个人替代率）
    var personalRate = (sc.baseRetire && sc.avgIndex && sc.baseRetire > 0 && sc.avgIndex > 0)
      ? Math.round(sc.total / (sc.baseRetire * sc.avgIndex) * 100)
      : null
    var rateTxt = (personalRate != null)
      ? '个人替代率约 ' + personalRate + '%（月养老金 ÷ 指数化缴费工资）'
      : ''
    $('replaceRate').textContent = rateTxt

    $('retireDate').textContent = fmtDate(sc.date)
    $('retireAge').textContent = sc.ageStr || '—'
    $('retireMonths').textContent = sc.months != null ? sc.months + ' 个月' : '—'
    $('rate').textContent = (personalRate != null) ? personalRate + '%' : '—'

    $('basePension').textContent = fmt(sc.basicPension && sc.basicPension.amount)
    $('personalPension').textContent = fmt(sc.personalAccount && sc.personalAccount.amount)

    var transAmt = (sc.transitionalPension && sc.transitionalPension.amount) || 0
    $('transRow').hidden = !(transAmt > 0)
    $('transPension').textContent = fmt(transAmt)

    var extraAmt = (sc.extraPension && sc.extraPension.amount || 0)
      + (sc.specialAddition && sc.specialAddition.amount || 0)
      + (sc.adjustmentFund && sc.adjustmentFund.amount || 0)
    $('extraRow').hidden = !(extraAmt > 0)
    $('extraPension').textContent = fmt(extraAmt)

    $('totalRow').textContent = fmt(sc.total)

    $('totalYears').textContent = fmtYears(sc.totalYears)
    $('actualYears').textContent = fmtYears(sc.actualYears)
    $('sightYears').textContent = fmtYears(sc.sightYears)
    if (sc.minYears != null) {
      $('minYears').textContent = fmtYears(sc.minYears) + (sc.meetMin ? ' ✓ 已满足' : ' ✗ 不足')
      $('minYears').style.color = sc.meetMin ? 'var(--green)' : 'var(--red)'
    } else { $('minYears').textContent = '—' }

    renderCompare(cmp)
  }

  function renderCompare(cmp) {
    var box = $('compareBox')
    if (!cmp) { box.innerHTML = ''; return }
    if (!cmp.canFlex) {
      box.innerHTML = '当前人员类型按延迟退休政策，<span class="hl">已无弹性提前空间</span>（弹性提前退休年龄不早于原法定年龄）。下方为法定退休测算结果。'
      return
    }
    var adv = cmp.flexAdvance
    var diff = cmp.amountDiff // flex - legal（负数=提前退休每月更少）
    var y = Math.floor(adv / 12), m = adv % 12
    var advStr = (y > 0 ? y + ' 年' : '') + (m > 0 ? m + ' 个月' : '') || '0 个月'
    box.innerHTML =
      '相比法定退休，选择<span class="hl">弹性提前退休</span>可于 <span class="hl">' +
      fmtDate(cmp.flexDate) + '</span>（' + (lastResult.flex.ageStr || '') + '）开始领取，' +
      '最多提前 <span class="hl">' + advStr + '</span>。' +
      '<br>代价：每月养老金减少 <span class="down">' + fmt(Math.abs(diff)) + '</span>' +
      '（约为法定的 ' + (cmp.diffPercent != null ? cmp.diffPercent.toFixed(1) : '0') + '%）。'
  }

  // ---------- 第一步：缴费指数计算器 ----------
  function initIndexCalc() {
    // 折叠/展开
    IC.toggle.addEventListener('click', function () {
      var open = IC.body.style.display !== 'none'
      IC.body.style.display = open ? 'none' : 'block'
      IC.arrow.textContent = open ? '展开 ▼' : '收起 ▲'
    })
    // 广东城市选项（从引擎 D 值表动态生成）
    try {
      var map = window.CalcIndex && window.CalcIndex.GUANGDONG_SIGHT_INDEX_MAP
      if (map) {
        var labels = { guangzhou:'广州市',shenzhen:'深圳市',zhuhai:'珠海市',shantou:'汕头市',shaoguan:'韶关市',heyuan:'河源市',meizhou:'梅州市',huizhou:'惠州市',shanwei:'汕尾市',dongguan:'东莞市',zhongshan:'中山市',jiangmen:'江门市',foshan:'佛山市',yangjiang:'阳江市',zhanjiang:'湛江市',maoming:'茂名市',zhaoqing:'肇庆市',yunfu:'云浮市',qingyuan:'清远市',chaozhou:'潮州市',jieyang:'揭阳市' }
        Object.keys(map).forEach(function (k) {
          if (k === 'prov' || !labels[k]) return
          var o = document.createElement('option')
          o.value = labels[k]
          o.textContent = labels[k] + '（D=' + map[k] + (k === 'shenzhen' ? '，独立社平' : '') + '）'
          IC.gdCity.appendChild(o)
        })
      }
    } catch (e) { console.warn('广东城市填充失败', e) }

    IC.genBtn.addEventListener('click', function () { idxGenYearly(false) })
    IC.calcBtn.addEventListener('click', idxCalcAndFill)
    IC.startDate.addEventListener('change', function () { idxGenYearly(true) })
    // 初始刷新一次（默认省份的提示）
    refreshIndexCalcProvince(elProvince.value)
  }

  function refreshIndexCalcProvince(slug) {
    var rule = null
    try { rule = window.CalcIndex && window.CalcIndex.PROVINCE_RULES[slug] } catch (e) {}
    // 广东城市
    IC.gdCityField.style.display = (slug === 'guangdong') ? 'block' : 'none'
    if (slug !== 'guangdong') IC.gdCity.value = ''
    // 浙苏赣视同起始年
    if (slug === 'zhejiang' || slug === 'jiangsu' || slug === 'jiangxi') {
      IC.deemedStartField.style.display = 'block'
      var tip = { zhejiang:'浙江：1992年底前替代指数≈1.279（温州1.1），1993年起1.0', jiangsu:'江苏：1985.6前=1.0、1985.7-1991分段联动', jiangxi:'江西：1992.9前=1.0、1992.10-1995.9按设区市/全省比' }[slug]
      IC.deemedStartHint.textContent = tip + '——填写视同起始年以精确取分段值。'
    } else {
      IC.deemedStartField.style.display = 'none'
    }
    // 断缴提示
    if (rule && (rule.gapZero || rule.gapFloor)) {
      var name = PROVINCES.find(function (p) { return p.slug === slug }).name
      var v = rule.gapZero ? 0 : rule.gapFloor
      IC.gapHint.textContent = '提示：' + name + '执行"断缴年份按指数' + v + '计入平均指数"规则——中间断缴年份会按指数' + v + '计入分母，请如实逐年填写。'
      IC.gapHint.style.display = 'block'
    } else {
      IC.gapHint.style.display = 'none'
    }
    // 视同年提示
    if (rule) {
      IC.deemedHint.textContent = rule.deemedInDenom
        ? '该省将视同缴费年限计入平均指数分母（指数默认1.0，广东查表/浙江替代指数等特例已内置），请填写上方视同年限。'
        : '该省视同缴费年限不计入平均指数分母（仅用于养老金年限计算），可不填或填0。'
      IC.deemedHint.style.display = 'block'
    } else {
      IC.deemedHint.style.display = 'none'
    }
  }

  function idxGenYearly(silent) {
    var sd = IC.startDate.value
    if (!sd) { if (!silent) alert('请先选择首次缴费年月'); return }
    var parts = sd.split('-').map(Number)
    var sy = parts[0], sm = parts[1]
    var ey = new Date().getFullYear()
    if (sy > ey) { if (!silent) alert('起始年不能晚于今年'); return }
    var oldMap = {}
    idxYearlyList.forEach(function (r) { if (r.year && r.baseAvg !== '' && r.baseAvg != null) oldMap[r.year] = r.baseAvg })
    var rows = [], y = sy
    while (y <= ey) {
      var months = y === sy ? (sm > 1 ? 13 - sm : 12) : 12
      rows.push({ year: y, months: months, baseAvg: oldMap[y] !== undefined ? oldMap[y] : '' })
      y += 1
    }
    idxYearlyList = rows
    idxRenderYearly()
    IC.yearlyWrap.style.display = 'block'
  }

  function idxRenderYearly() {
    IC.yearlyRows.innerHTML = ''
    idxYearlyList.forEach(function (r, idx) {
      var tr = document.createElement('div')
      tr.className = 'tr'
      tr.innerHTML =
        '<span class="c1">' + r.year + '年</span>' +
        '<input class="c2" type="number" min="0" max="12" value="' + r.months + '" data-idx="' + idx + '" data-sub="months" style="width:50px">' +
        '<input class="c3" type="number" step="0.01" placeholder="如4980" value="' + r.baseAvg + '" data-idx="' + idx + '" data-sub="baseAvg" style="width:120px">'
      IC.yearlyRows.appendChild(tr)
      tr.querySelector('[data-sub="months"]').addEventListener('input', idxOnYearlyInput)
      tr.querySelector('[data-sub="baseAvg"]').addEventListener('input', idxOnYearlyInput)
    })
  }

  function idxOnYearlyInput(e) {
    var idx = Number(e.target.dataset.idx)
    idxYearlyList[idx][e.target.dataset.sub] = e.target.value
  }

  function idxCalcAndFill() {
    var CalcIndex = window.CalcIndex
    if (!CalcIndex || !window.INDEX_PROVINCES) { alert('计算器引擎未加载'); return }
    var slug = elProvince.value
    var sd = IC.startDate.value
    if (!sd) { alert('请选择首次缴费年月'); return }
    if (idxYearlyList.length === 0) { alert('请先生成逐年清单'); return }
    var yearlyData = idxYearlyList
      .filter(function (r) { return Number(r.year) > 0 && Number(r.months) > 0 })
      .map(function (r) { return { year: Number(r.year), months: Number(r.months), baseAvg: Number(r.baseAvg) || 0 } })
    if (!yearlyData.some(function (r) { return r.baseAvg > 0 })) { alert('请至少填写一年的月均缴费基数'); return }

    var provinceConfig = window.INDEX_PROVINCES[slug]
    var deemedYears = Number(IC.deemedYears.value) || 0
    var deemedStartYear = Number(IC.deemedStartYear.value) || null
    var city = (slug === 'guangdong' && IC.gdCity.value) ? IC.gdCity.value : null
    var fwd
    try {
      fwd = CalcIndex.calculateIndex({
        provinceConfig: provinceConfig, provinceCode: slug, contribution: yearlyData,
        granularity: 'A', deemedYears: deemedYears, deemedStartYear: deemedStartYear, city: city
      })
    } catch (err) { alert('计算出错：' + err.message); console.error(err); return }
    if (fwd.error) { alert(fwd.error); return }

    idxRenderResult(fwd, slug)

    // ── 自动填入下方养老金表单 ──
    elAvg.value = fwd.avgIndex.toFixed(4)
    document.querySelectorAll('#indexChips .chip').forEach(function (x) { x.classList.remove('active') })
    if (fwd.transIndex != null && fwd.transIndex > 0 && DOUBLE_INDEX[slug]) {
      elTrans.value = fwd.transIndex.toFixed(4)
      elTransField.hidden = false
    }
    // 个人账户余额也可填入
    if (fwd.accountBalance && fwd.accountBalance > 0) {
      elBalance.value = Math.round(fwd.accountBalance)
    }
    IC.calcBtn.textContent = '已填入下方 ✓'
    setTimeout(function () { IC.calcBtn.textContent = '计算并填入下方' }, 2000)
  }

  function idxRenderResult(fwd, slug) {
    IC.avgIndex.textContent = fwd.avgIndex.toFixed(4)
    IC.balance.textContent = '¥' + fwd.accountBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    IC.totalMonths.textContent = fwd.totalMonths + ' 个月（' + (fwd.totalYears || 0).toFixed(1) + ' 年）'
    var meta = fwd._meta || {}
    // 过渡性指数
    if (fwd.transIndex != null && fwd.transIndex > 0) {
      IC.transRow.style.display = 'flex'
      IC.transIndex.textContent = fwd.transIndex.toFixed(4)
    } else {
      IC.transRow.style.display = 'none'
    }
    // 提示
    var parts = []
    if (meta.gapZero && meta.gapYears > 0) {
      parts.push('有 ' + meta.gapYears + ' 个断缴年份按指数0计入分母')
    }
    if (meta.gapFloor && meta.gapYears > 0) {
      parts.push('有 ' + meta.gapYears + ' 个断缴年份按指数' + meta.gapFloor + '计入分母')
    }
    if (meta.deemedInDenom && meta.deemedYears > 0) {
      parts.push('已将 ' + meta.deemedYears + ' 年视同缴费计入指数分母')
    } else if (meta.deemedInDenom && meta.deemedYears === 0) {
      parts.push('该省视同年计入指数分母，未填写视同年限可能影响准确度')
    }
    if (meta.city) {
      var dval = (window.CalcIndex.GUANGDONG_SIGHT_INDEX_MAP && window.CalcIndex.GUANGDONG_SIGHT_INDEX_MAP[meta.city.replace(/市$/, '')]) || 1.0
      parts.push('广东「' + meta.city + '」D=' + dval + (meta.city === '深圳' ? '（深圳独立社平）' : ''))
    }
    IC.note.textContent = parts.length ? parts.join('；') + '。' : ''
    IC.note.style.display = parts.length ? 'block' : 'none'
    // 逐年明细
    IC.detailRows.innerHTML = ''
    ;(fwd.yearsDetail || []).filter(function (y) { return y.index !== null && y.index !== undefined }).forEach(function (y) {
      var tr = document.createElement('div')
      tr.className = 'tr'
      tr.innerHTML =
        '<span class="c1">' + y.year + '</span>' +
        '<span class="c2">' + y.months + '</span>' +
        '<span class="c3">' + (y.baseAvg || 0).toFixed(0) + '</span>' +
        '<span class="c4">' + y.index.toFixed(4) + '</span>'
      IC.detailRows.appendChild(tr)
    })
    IC.result.style.display = 'block'
  }

  // ---------- 启动 ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else { init() }
})()
