'use strict'

// 协议边界破坏性测试：专挑规范里写了 MUST / SHOULD 而我方可能没做到的地方。
// 这些用官方 SDK 测不出来（SDK 会主动迁就），必须用裸 HTTP 模拟严格客户端。

const http = require('http')

const HOST = '127.0.0.1'
const PORT = process.env.PORT || 8787

function req (opts, body) {
  return new Promise((resolve) => {
    const data = body == null ? '' : (typeof body === 'string' ? body : JSON.stringify(body))
    const r = http.request({
      host: HOST, port: PORT, path: '/mcp', method: opts.method || 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {})
    }, (res) => {
      let b = ''
      res.on('data', (c) => { b += c })
      res.on('end', () => {
        let j = null
        try { j = JSON.parse(b) } catch (e) { /* 非 JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, raw: b, json: j })
      })
    })
    r.on('error', (e) => resolve({ status: 0, error: e.message }))
    if (data) r.setHeader('Content-Length', Buffer.byteLength(data))
    r.end(data)
  })
}

const ok = []
const bad = []
const check = (name, cond, detail) => {
  ;(cond ? ok : bad).push(name + (detail ? ' — ' + detail : ''))
  console.log((cond ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''))
}

const STD_ACCEPT = 'application/json, text/event-stream'
const INIT = (v) => ({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: v, capabilities: {}, clientInfo: { name: 'strict', version: '1' } }
})

async function main () {
  console.log('--- A. 传输层 MUST 项 ---')

  // A1 缺失 Accept 头：规范要求客户端 MUST 带，服务端 SHOULD 校验
  let r = await req({ headers: {} }, INIT('2025-06-18'))
  console.log('   [A1] 无 Accept 头 → HTTP', r.status)

  // A2 Accept 只接受 text/event-stream（不含 application/json），而服务端只回 JSON
  r = await req({ headers: { Accept: 'text/event-stream' } }, INIT('2025-06-18'))
  console.log('   [A2] Accept 仅 SSE → HTTP', r.status)

  // A3 非法协议版本头：规范要求 MUST 400
  r = await req({ headers: { Accept: STD_ACCEPT, 'MCP-Protocol-Version': '1900-01-01' } }, INIT('2025-06-18'))
  check('A3 非法 MCP-Protocol-Version → 400', r.status === 400, '实际 ' + r.status)

  // A4 支持的版本头应当放行
  r = await req({ headers: { Accept: STD_ACCEPT, 'MCP-Protocol-Version': '2025-06-18' } }, INIT('2025-06-18'))
  check('A4 合法版本头 → 200', r.status === 200, '实际 ' + r.status)

  // A5 Origin 校验（DNS rebinding 防护，规范 MUST）——这是安全硬要求
  r = await req({ headers: { Accept: STD_ACCEPT, Origin: 'https://evil.example.com' } }, INIT('2025-06-18'))
  check('A5 恶意 Origin → 拒绝(403)', r.status === 403, '实际 ' + r.status)

  console.log('\n--- B. 生命周期 ---')

  // B1 版本协商：客户端发一个我方并未实现的旧版本，看服务端是否老实回自己支持的版本
  for (const v of ['2024-10-07', '2024-11-05', '2025-03-26', '2025-11-25', '2026-07-28']) {
    const rr = await req({ headers: { Accept: STD_ACCEPT, 'MCP-Protocol-Version': v } }, INIT(v))
    const got = rr.json && rr.json.result && rr.json.result.protocolVersion
    console.log('   [B1] 客户端要 ' + v + ' → 服务端回 ' + got)
  }

  // B2 通知类：notifications/initialized 必须是 202 且无 body
  r = await req({ headers: { Accept: STD_ACCEPT } }, { jsonrpc: '2.0', method: 'notifications/initialized' })
  check('B2 notifications/initialized → 202 空 body', r.status === 202 && r.raw === '', `status=${r.status} body长度=${r.raw.length}`)

  // B3 未知通知（非 notifications/ 前缀但无 id）不应崩
  r = await req({ headers: { Accept: STD_ACCEPT } }, { jsonrpc: '2.0', method: 'foo/bar' })
  console.log('   [B3] 未知无 id 方法 → HTTP', r.status, 'body:', (r.raw || '').slice(0, 60))

  console.log('\n--- C. 错误码合规性 ---')

  // C1 坏 JSON
  r = await req({ headers: { Accept: STD_ACCEPT } }, '{不是JSON')
  check('C1 坏 JSON → 400 + (-32700)', r.status === 400 && r.json && r.json.error && r.json.error.code === -32700,
    `status=${r.status} code=${r.json && r.json.error && r.json.error.code}`)

  // C2 缺 method
  r = await req({ headers: { Accept: STD_ACCEPT } }, { jsonrpc: '2.0', id: 9 })
  check('C2 缺 method → (-32600)', r.json && r.json.error && r.json.error.code === -32600,
    'code=' + (r.json && r.json.error && r.json.error.code))

  // C3 未知方法
  r = await req({ headers: { Accept: STD_ACCEPT } }, { jsonrpc: '2.0', id: 9, method: 'resources/list' })
  check('C3 未知方法 → (-32601)', r.json && r.json.error && r.json.error.code === -32601,
    'code=' + (r.json && r.json.error && r.json.error.code))

  // C4 响应缺少 jsonrpc 字段
  r = await req({ headers: { Accept: STD_ACCEPT } }, { jsonrpc: '2.0', id: 9, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
  check('C4 响应含 jsonrpc:"2.0"', r.json && r.json.jsonrpc === '2.0', 'jsonrpc=' + (r.json && r.json.jsonrpc))
  check('C4 响应 id 与请求一致', r.json && r.json.id === 9, 'id=' + (r.json && r.json.id))

  console.log('\n--- D. 方法与传输 ---')

  // D1 GET 必须 405（本实现不支持 SSE 流）
  r = await req({ method: 'GET', headers: { Accept: 'text/event-stream' } })
  check('D1 GET → 405', r.status === 405, '实际 ' + r.status)

  // D2 DELETE 无会话 → 405 或 404 均可接受
  r = await req({ method: 'DELETE', headers: { Accept: STD_ACCEPT } })
  check('D2 DELETE → 405/404', r.status === 405 || r.status === 404, '实际 ' + r.status)

  // D3 错误路径
  r = await new Promise((resolve) => {
    const rr = http.request({ host: HOST, port: PORT, path: '/nope', method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let b = ''; res.on('data', (c) => { b += c }); res.on('end', () => resolve({ status: res.statusCode, raw: b }))
    })
    rr.on('error', (e) => resolve({ status: 0, raw: e.message }))
    rr.end('{}')
  })
  check('D3 错误路径 → 404', r.status === 404, '实际 ' + r.status)

  console.log('\n--- E. 健壮性 ---')

  // E1 空 body
  r = await req({ headers: { Accept: STD_ACCEPT } }, '')
  console.log('   [E1] 空 body → HTTP', r.status, '（不应崩溃）')

  // E2 巨大 body
  const big = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'pension_calculate', arguments: { province: 'A'.repeat(900000) } } })
  r = await req({ headers: { Accept: STD_ACCEPT } }, big)
  console.log('   [E2] 900KB body → HTTP', r.status, '（不应崩溃/挂起）')

  // E3 并发
  const many = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    req({ headers: { Accept: STD_ACCEPT } }, { jsonrpc: '2.0', id: i, method: 'tools/list' })))
  check('E3 20 并发 tools/list 全 200', many.every((x) => x.status === 200), many.filter((x) => x.status !== 200).length + ' 个失败')

  console.log('\n===== 汇总 =====')
  console.log('硬性通过 ' + ok.length + ' 项，失败 ' + bad.length + ' 项')
  if (bad.length) { console.log('失败项：'); bad.forEach((b) => console.log('  - ' + b)) }
}

main().catch((e) => console.log('💥', e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n') : e))
