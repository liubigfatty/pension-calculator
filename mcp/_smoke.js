'use strict'

// 冒烟测试：走真实 HTTP，验证 MCP 三个方法 + 三个工具
const http = require('http')

const PORT = process.env.PORT || 8787

function post (obj) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(obj)
    const req = http.request(
      { host: '127.0.0.1', port: PORT, path: '/mcp', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let b = ''
        res.on('data', (c) => (b += c))
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(b) }) } catch (e) { resolve({ status: res.statusCode, raw: b }) }
        })
      }
    )
    req.on('error', reject)
    req.end(data)
  })
}

let seq = 1
const call = (method, params) => post({ jsonrpc: '2.0', id: seq++, method, params })

async function main () {
  console.log('=== 1. initialize ===')
  const init = await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } })
  console.log('status:', init.status, '| serverInfo:', JSON.stringify(init.body && init.body.result && init.body.result.serverInfo))

  console.log('\n=== 2. tools/list ===')
  const list = await call('tools/list', {})
  const tools = (list.body && list.body.result && list.body.result.tools) || []
  tools.forEach((t) => console.log('  -', t.name, '| 必填:', (t.inputSchema.required || []).join(',')))

  console.log('\n=== 3. tools/call pension_calculate（吉林/男/1976-02/1996-01/指数1.0）===')
  const c1 = await call('tools/call', {
    name: 'pension_calculate',
    arguments: { province: '吉林', gender_type: '男', birth_date: '1976-02', work_start_date: '1996-01', average_index: 1.0 }
  })
  console.log((c1.body.result.content[0].text))

  console.log('\n=== 4. tools/call pension_calculate（长春 / 中文入参 / 60档）===')
  const c2 = await call('tools/call', {
    name: 'pension_calculate',
    arguments: { province: '吉林省', city: '长春', gender_type: '男性', birth_date: '1976年2月', work_start_date: '1996-01', average_index: 0.6 }
  })
  console.log(c2.body.result.content[0].text)

  console.log('\n=== 5. tools/call pension_retire_date（广东/女工人/1984-11 封顶档）===')
  const c3 = await call('tools/call', {
    name: 'pension_retire_date',
    arguments: { province: '广东', gender_type: '女工人', birth_date: '1984-11' }
  })
  console.log(c3.body.result.content[0].text)

  console.log('\n=== 6. 缺参数回问（故意漏 average_index）===')
  const c4 = await call('tools/call', {
    name: 'pension_calculate',
    arguments: { province: '吉林', gender_type: '男', birth_date: '1976-02', work_start_date: '1996-01' }
  })
  console.log('isError:', c4.body.result.isError, '|', c4.body.result.content[0].text)

  console.log('\n=== 7. pension_regions（吉林）===')
  const c5 = await call('tools/call', { name: 'pension_regions', arguments: { province: '吉林' } })
  console.log(c5.body.result.content[0].text)

  console.log('\n=== 8. 未知省份 ===')
  const c6 = await call('tools/call', { name: 'pension_calculate', arguments: { province: '火星', gender_type: '男', birth_date: '1976-02', work_start_date: '1996-01', average_index: 1 } })
  console.log('isError:', c6.body.result.isError, '|', c6.body.result.content[0].text)
}

main().catch((e) => { console.error('测试失败:', e); process.exit(1) })
