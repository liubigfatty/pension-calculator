// 校验「线上已部署的 calculate 云函数」是否真的生效
//   用法：先 cli cloud functions download --name calculate --path ./_tmp_download 拉回线上代码，再跑本脚本
//   断言对象 = 线上拉回版 _tmp_download/index.js（不是本地 cloudfunctions/calculate/index.js）
const path = require('path')
const online = require(path.resolve('./_tmp_download/index.js'))

const BASE = { identity: 'worker', genderType: 'male', personalAccount: 0, cityType: 'prov' }

const CASES = [
  {
    tag: '上海保底·应触发（1993参工/1966生男/60档，传 indexLevel）',
    ev: Object.assign({}, BASE, {
      province: 'shanghai', gender: 'male',
      birthDate: '1966-01', workStartDate: '1993-01',
      averageIndex: 0.6, indexLevel: 0.6,
    }),
    expectFloor: true,
  },
  {
    tag: '上海·手填指数不触发（同参数但不传 indexLevel）',
    ev: Object.assign({}, BASE, {
      province: 'shanghai', gender: 'male',
      birthDate: '1966-01', workStartDate: '1993-01',
      averageIndex: 0.6,
    }),
    expectFloor: false,
  },
  {
    tag: '上海·100档不触发（档位高于保底线）',
    ev: Object.assign({}, BASE, {
      province: 'shanghai', gender: 'male',
      birthDate: '1966-01', workStartDate: '1993-01',
      averageIndex: 1.0, indexLevel: 1.0,
    }),
    expectFloor: false,
  },
  {
    tag: '上海·2015参工不触发（2014后无明文保底）',
    ev: Object.assign({}, BASE, {
      province: 'shanghai', gender: 'male',
      birthDate: '1966-01', workStartDate: '2015-01',
      averageIndex: 0.6, indexLevel: 0.6,
    }),
    expectFloor: false,
  },
  { tag: '浙江（新基数8537落地）', ev: Object.assign({}, BASE, { province: 'zhejiang', gender: 'male', birthDate: '1966-01', workStartDate: '1996-01', averageIndex: 1.0 }) },
  { tag: '湖北（新基数7587落地）', ev: Object.assign({}, BASE, { province: 'hubei', gender: 'male', birthDate: '1966-01', workStartDate: '1996-01', averageIndex: 1.0 }) },
  { tag: '广东（新基数9201落地）', ev: Object.assign({}, BASE, { province: 'guangdong', gender: 'male', birthDate: '1966-01', workStartDate: '1996-01', averageIndex: 1.0 }) },
  { tag: '吉林（非上海，应完全不受影响）', ev: Object.assign({}, BASE, { province: 'jilin', gender: 'male', birthDate: '1966-01', workStartDate: '1996-01', averageIndex: 0.6, indexLevel: 0.6 }) },
]

;(async () => {
  let fail = 0
  for (const c of CASES) {
    let r
    try {
      r = await online.main(c.ev)
    } catch (e) {
      console.log('❌【' + c.tag + '】抛异常：' + e.message)
      fail++
      continue
    }
    if (!r || !r.success) {
      console.log('❌【' + c.tag + '】返回失败：' + (r && r.message))
      fail++
      continue
    }
    const total = r.data && r.data.legal && r.data.legal.total
    // ⚠️ shanghaiFloor 挂在返回体顶层，不在 data 里
    const floor = r.shanghaiFloor
    const y = r.data && r.data.legal && r.data.legal.date ? r.data.legal.date.year : '?'

    let line = '【' + c.tag + '】\n  退休年 ' + y + '，月领 ' + (typeof total === 'number' ? total.toFixed(2) : total)
    if (floor) {
      line += '\n  保底：' + floor.from + ' → ' + floor.to + '（档位 ' + floor.level + '，' + floor.startYear + '–' + floor.retireYear + '）'
      if (c.expectFloor === false) { line += '  ❌ 不该触发却触发了'; fail++ }
      else line += '  ✅ 已触发'
    } else {
      if (c.expectFloor === true) { line += '\n  ❌ 该触发却没触发'; fail++ }
      else line += '\n  保底：未触发' + (c.expectFloor === false ? ' ✅' : '')
    }
    console.log(line)
  }
  console.log('\n' + (fail === 0 ? '✅ 线上云函数全部通过' : '❌ 失败 ' + fail + ' 项'))
  process.exit(fail === 0 ? 0 : 1)
})()
