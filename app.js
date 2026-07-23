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
  }

  // 省份变化：双基数省显示城市选择；双指数省显示过渡指数；加发项按省显示
  function onProvinceChange() {
    refreshCityOptions()
    refreshExtraOptions()
    var slug = elProvince.value
    elTransField.hidden = !DOUBLE_INDEX[slug]
    if (!DOUBLE_INDEX[slug]) elTrans.value = ''
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
    var rateTxt = (sc.rate != null && !isNaN(sc.rate))
      ? '替代率约 ' + sc.rate.toFixed(1) + '%（月养老金 ÷ 退休时计发基数）'
      : ''
    $('replaceRate').textContent = rateTxt

    $('retireDate').textContent = fmtDate(sc.date)
    $('retireAge').textContent = sc.ageStr || '—'
    $('retireMonths').textContent = sc.months != null ? sc.months + ' 个月' : '—'
    $('rate').textContent = (sc.rate != null && !isNaN(sc.rate)) ? sc.rate.toFixed(1) + '%' : '—'

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

  // ---------- 启动 ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else { init() }
})()
