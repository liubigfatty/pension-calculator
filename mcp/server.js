'use strict'

// 养老金计算 MCP Server —— 零依赖实现（只用 Node 内置 http）
// 为什么不用官方 SDK：引擎本身零依赖纯 JS，引入 npm 包反而增加部署体积与打包环节；
// MCP 本质是 JSON-RPC 2.0 + 三个方法，自己实现足够，也便于直接塞进云函数 / Workers。
//
// 传输：Streamable HTTP，无状态模式（不维护 session，不实现 SSE 流）
// 端点：POST /mcp

const http = require('http')
const TOOLS = require('./tools.js')

const PORT = process.env.PORT || 8787
const HOST = process.env.HOST || '127.0.0.1'
const SERVER_NAME = 'pension-calculator'
const SERVER_VERSION = '0.1.0'

// ⚠️ 版本声明必须诚实：只声明真正实现过的版本。
// 本实现是「legacy 时代」（initialize 握手 + 有状态可选无状态会话）。
// 规范 2026-07-28 已取消 initialize 握手、改为每请求自带 _meta 版本号，并要求实现 server/discover
// —— 本实现【没有】实现这些，因此绝不能宣告支持 2026-07-28，否则现代客户端会按新版语义通信而静默出错。
// 同理 2025-11-25 未逐条核对，不宣告。
const PROTOCOL_VERSION = '2025-06-18'
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07']
const supportsVersion = (v) => SUPPORTED_PROTOCOL_VERSIONS.indexOf(v) >= 0

// DNS rebinding 防护：规范 Streamable HTTP 安全章节的 MUST 项。
// 默认只放行本机来源；部署到公网时必须用 ALLOWED_ORIGINS 显式配置。
const DEFAULT_ORIGINS = ['http://127.0.0.1', 'http://localhost', 'https://localhost']
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean)
const ORIGIN_WHITELIST = DEFAULT_ORIGINS.concat(ALLOWED_ORIGINS)

const TOOL_MAP = {}
TOOLS.forEach((t) => { if (t && t.name) TOOL_MAP[t.name] = t })

function jsonrpcRes (id, result) {
  return { jsonrpc: '2.0', id: id == null ? null : id, result }
}

function jsonrpcErr (id, code, message, data) {
  const e = { jsonrpc: '2.0', id: id == null ? null : id, error: { code, message } }
  if (data !== undefined) e.error.data = data
  return e
}

function handleInitialize (id, params) {
  const clientVersion = params && params.protocolVersion
  // 只在我们真正实现的版本里选：客户端要的我们支持就回它，否则老实回自己支持的最高版本，
  // 由客户端决定是否继续。绝不能回显未实现的版本（会让客户端误判能力）。
  const negotiated = supportsVersion(clientVersion) ? clientVersion : PROTOCOL_VERSION
  return jsonrpcRes(id, {
    protocolVersion: negotiated,
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    instructions:
      '这是中国企业职工养老金测算工具。用户问退休金数额时用 pension_calculate，问退休时间时用 pension_retire_date，' +
      '不确定地区时用 pension_regions。缺参数必须回问用户，不得猜测。所有结果均为估算，须提示以社保经办机构核定为准。'
  })
}

function handleToolsList (id) {
  return jsonrpcRes(id, {
    tools: TOOLS.filter(Boolean).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  })
}

async function handleToolsCall (id, params) {
  const name = params && params.name
  const args = (params && params.arguments) || {}
  const tool = TOOL_MAP[name]
  if (!tool) {
    return jsonrpcErr(id, -32602, '未知工具：' + name + '。可用工具：' + Object.keys(TOOL_MAP).join(', '))
  }
  try {
    const out = await tool.run(args)
    return jsonrpcRes(id, {
      content: [{ type: 'text', text: out.text }],
      isError: !!out.isError
    })
  } catch (e) {
    return jsonrpcRes(id, {
      content: [{ type: 'text', text: '工具执行出错：' + e.message }],
      isError: true
    })
  }
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || '').split('?')[0]

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version, Authorization',
    'Access-Control-Expose-Headers': 'MCP-Protocol-Version'
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  if (url !== '/mcp') {
    res.writeHead(404, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify({ error: 'not found. use POST /mcp' }))
    return
  }

  // —— 安全：Origin 校验（规范 MUST，防 DNS rebinding）——
  // 只放行白名单来源；不带 Origin 的调用方（本地进程、curl、部分 SDK）视为可信放行。
  const origin = req.headers.origin
  if (origin && ORIGIN_WHITELIST.indexOf(origin) < 0 && ORIGIN_WHITELIST.indexOf('*') < 0) {
    res.writeHead(403, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify({ error: 'Origin 不在白名单。若部署到公网，请用 ALLOWED_ORIGINS 环境变量配置。' }))
    return
  }

  // —— 协议版本头：不支持的版本必须 400（规范 MUST）——
  const versionHeader = req.headers['mcp-protocol-version']
  if (versionHeader && !supportsVersion(versionHeader)) {
    res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify(jsonrpcErr(null, -32600,
      '不支持的 MCP-Protocol-Version：' + versionHeader + '。本服务器支持：' + SUPPORTED_PROTOCOL_VERSIONS.join(', '),
      { supported: SUPPORTED_PROTOCOL_VERSIONS, requested: versionHeader })))
    return
  }

  // GET / DELETE 用于 SSE 会话流与会话终止 —— 本实现是无状态模式，不支持
  // ⚠️ 顺序要点：GET 按规范本就只带 Accept: text/event-stream，
  // 所以 Accept 校验必须只对 POST 生效，不能前置到此处，否则会误伤 GET（应回 405 而非 406）。
  if (req.method === 'GET') {
    res.writeHead(405, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify({ error: '本服务器为无状态模式，不支持 SSE 流。请改用 POST /mcp。' }))
    return
  }
  if (req.method === 'DELETE') {
    res.writeHead(405, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify({ error: '无状态模式，无会话可终止。' }))
    return
  }
  if (req.method !== 'POST') {
    res.writeHead(405, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify({ error: 'method not allowed' }))
    return
  }

  // —— Accept（仅 POST）：本实现只产 JSON。客户端若明确不接受 JSON，按规范回 406——
  const accept = req.headers.accept
  if (accept && !/application\/json|\*\/\*/i.test(accept)) {
    res.writeHead(406, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify({ error: '本服务器只返回 application/json（无状态模式，不提供 SSE 流）。' }))
    return
  }

  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 1e6) break
  }

  let msg
  try {
    msg = JSON.parse(body)
  } catch (e) {
    res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, cors))
    res.end(JSON.stringify(jsonrpcErr(null, -32700, 'JSON 解析失败：' + e.message)))
    return
  }

  const batch = Array.isArray(msg) ? msg : [msg]
  const responses = []

  for (const m of batch) {
    const id = m && m.id
    const method = m && m.method
    // 无 id 即为 notification（JSON-RPC 语义），一律不回响应。
    // 之前只跳过 notifications/ 前缀的，导致非常规通知被当成请求回了 error，不符合规范。
    if (id == null) continue
    if (!method) {
      responses.push(jsonrpcErr(id, -32600, '缺少 method'))
      continue
    }
    let r
    switch (method) {
      case 'initialize':
        r = handleInitialize(id, m.params)
        break
      case 'tools/list':
        r = handleToolsList(id)
        break
      case 'tools/call':
        r = await handleToolsCall(id, m.params)
        break
      case 'ping':
        r = jsonrpcRes(id, {})
        break
      default:
        r = jsonrpcErr(id, -32601, '不支持的方法：' + method)
    }
    responses.push(r)
  }

  if (!responses.length) {
    res.writeHead(202, cors)
    res.end()
    return
  }

  const out = Array.isArray(msg) ? responses : responses[0]
  res.writeHead(200, Object.assign({ 'Content-Type': 'application/json', 'MCP-Protocol-Version': PROTOCOL_VERSION }, cors))
  res.end(JSON.stringify(out))
})

server.listen(PORT, HOST, () => {
  console.log('养老金 MCP Server 已启动: http://' + HOST + ':' + PORT + '/mcp')
  console.log('工具: ' + Object.keys(TOOL_MAP).join(', '))
})

module.exports = server
