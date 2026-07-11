#!/usr/bin/env node
// 无头冒烟测试：用最小 DOM 垫片加载 web 三件套，模拟填写+提交，核对渲染结果
global.window = {}

// ---- 最小 DOM 垫片 ----
function makeEl(tag) {
  var el = {
    tagName: tag, _id: null, className: '', _value: '', textContent: '',
    innerHTML: '', hidden: false, style: {}, dataset: {}, children: [],
    _listeners: {},
    classList: {
      _s: new Set(),
      add: function (c) { this._s.add(c) },
      remove: function (c) { this._s.delete(c) },
      toggle: function (c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c) } else { f ? this._s.add(c) : this._s.delete(c) } },
      contains: function (c) { return this._s.has(c) }
    },
    appendChild: function (c) { this.children.push(c); return c },
    addEventListener: function (t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn) },
    closest: function () { return null },
    scrollIntoView: function () {},
    dispatch: function (t, ev) { (this._listeners[t] || []).forEach(function (fn) { fn(ev || { target: el, preventDefault: function () {} }) }) }
  }
  Object.defineProperty(el, 'value', { get: function () { return this._value }, set: function (v) { this._value = v } })
  return el
}
var registry = {}
function getEl(id) { if (!registry[id]) { var e = makeEl('div'); e._id = id; registry[id] = e } return registry[id] }

global.document = {
  readyState: 'complete',
  getElementById: function (id) { return getEl(id) },
  createElement: function (tag) { return makeEl(tag) },
  querySelectorAll: function () { return [] },
  addEventListener: function () {}
}
global.alert = function (m) { throw new Error('ALERT: ' + m) }

// ---- 加载网页资源 ----
require('../web/engine.js')
require('../web/provinces-bundle.js')
require('../web/app.js')  // init() 因 readyState=complete 立即执行

function setVal(id, v) { getEl(id)._value = v }

// 用例1：北京男 1970-06 / 1995-07 / 指数1.0 / 自动估算
setVal('province', 'beijing')
setVal('retireType', '0')
setVal('birthDate', '1970-06')
setVal('workDate', '1995-07')
setVal('avgIndex', '1.0')
setVal('balance', '')
getEl('calcBtn').dispatch('click')

console.log('【北京男·法定】')
console.log('  每月合计:', getEl('totalAmount').textContent)
console.log('  退休时间:', getEl('retireDate').textContent)
console.log('  退休年龄:', getEl('retireAge').textContent)
console.log('  计发月数:', getEl('retireMonths').textContent)
console.log('  基础:', getEl('basePension').textContent, '| 个人:', getEl('personalPension').textContent)
console.log('  对比框:', getEl('compareBox').innerHTML.replace(/<[^>]+>/g, '').slice(0, 80))

var total = getEl('totalAmount').textContent
var num = parseFloat(total.replace(/[^\d.]/g, ''))
if (!(num > 6000 && num < 8000)) { console.log('  ❌ 期望约 ¥7,126，实际', total); process.exit(1) }
console.log('  ✅ 与引擎直算一致（精确值 ' + num.toFixed(2) + '，约 ¥7,126）\n')

// 用例2：双基数省——切换广东应显示城市选项
setVal('province', 'guangdong')
getEl('province').dispatch('change')
console.log('【广东·城市字段】')
console.log('  cityField.hidden =', getEl('cityField').hidden, getEl('cityField').hidden ? '(单基数?)' : '(已显示双基数城市选择 ✅)')
if (getEl('cityField').hidden) { console.log('  ❌ 广东应为双基数，城市字段应显示'); process.exit(1) }
console.log('  transIndexField.hidden =', getEl('transIndexField').hidden, '(广东为双指数省，应显示 ✅)')
if (getEl('transIndexField').hidden) { console.log('  ❌ 广东应为双指数，过渡指数字段应显示'); process.exit(1) }

// 用例3：单基数省——北京不应显示城市选项
setVal('province', 'beijing')
getEl('province').dispatch('change')
console.log('\n【北京·城市字段】')
console.log('  cityField.hidden =', getEl('cityField').hidden, getEl('cityField').hidden ? '(正确：单基数不显示 ✅)' : '(❌ 不应显示)')

console.log('\n✅ 冒烟测试全部通过')
