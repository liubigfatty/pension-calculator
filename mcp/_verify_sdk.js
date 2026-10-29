'use strict'

// 用官方 MCP SDK 的 client 对我方手写 server 做完整握手验证。
// 目的：不靠自查，靠真实客户端判定实现是否合规。
// 覆盖：initialize → notifications/initialized → tools/list → tools/call（正常/缺参/未知工具）

const path = require('path')

const SDK = (() => {
  // node_modules 装在上级目录，显式定位
  const base = path.resolve(__dirname, '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs')
  return {
    Client: require(path.join(base, 'client', 'index.js')).Client,
    StreamableHTTPClientTransport: require(path.join(base, 'client', 'streamableHttp.js')).StreamableHTTPClientTransport
  }
})()

const ENDPOINT = process.env.MCP_URL || 'http://127.0.0.1:8787/mcp'

const ok = []
const bad = []
const check = (name, cond, detail) => {
  ;(cond ? ok : bad).push(name + (detail ? ' — ' + detail : ''))
  console.log((cond ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''))
}

async function main () {
  const client = new SDK.Client(
    { name: 'pension-verify-client', version: '1.0.0' },
    { capabilities: {} }
  )
  const transport = new SDK.StreamableHTTPClientTransport(new URL(ENDPOINT))

  try {
    await client.connect(transport)
    check('client.connect() 握手成功', true)
  } catch (e) {
    check('client.connect() 握手成功', false, e.message)
    console.log('\n握手失败，后续测试无法进行。')
    return report()
  }

  // 1. 服务端信息
  const info = client.getServerVersion()
  check('getServerVersion() 可读', !!info && !!info.name, info ? `${info.name} v${info.version}` : 'null')
  const caps = client.getServerCapabilities()
  check('serverCapabilities 含 tools', !!(caps && caps.tools))

  // 2. tools/list —— 校验 inputSchema 是否是合法 JSON Schema
  let tools
  try {
    tools = (await client.listTools()).tools
    check('tools/list 返回工具', Array.isArray(tools) && tools.length > 0, tools.length + ' 个')
  } catch (e) {
    check('tools/list 返回工具', false, e.message)
    return report()
  }

  for (const t of tools) {
    const s = t.inputSchema
    const schemaOk = s && typeof s === 'object' && s.type === 'object'
    check(`inputSchema 合法 [${t.name}]`, schemaOk, schemaOk ? `type=${s.type}, 必填=${JSON.stringify(s.required || [])}` : JSON.stringify(s).slice(0, 80))
    check(`description 非空 [${t.name}]`, !!t.description, (t.description || '').slice(0, 40) + '...')
  }

  // 3. tools/call 正常路径 —— 锚点：吉林男 1976-02 → 7,214.29
  try {
    const r = await client.callTool({
      name: 'pension_calculate',
      arguments: {
        province: '吉林', gender_type: '男', birth_date: '1976-02',
        work_start_date: '1996-01', average_index: 1.0
      }
    })
    const txt = (r.content || []).map((c) => c.text).join('\n')
    check('tools/call 正常路径无 isError', !r.isError)
    check('content[].type = text', (r.content || []).every((c) => c.type === 'text'))
    check('锚点数字 7,214.29 命中', /7,214\.29/.test(txt), txt.split('\n').find((l) => /7,214/.test(l)) || '未命中')
    check('输出含免责声明', /核定|估算/.test(txt))
  } catch (e) {
    check('tools/call 正常路径', false, e.message)
  }

  // 4. tools/call 缺参数 —— 必须是 isError:true 的业务错误，不是协议报错抛异常
  try {
    const r = await client.callTool({
      name: 'pension_calculate',
      arguments: { province: '吉林', gender_type: '男', birth_date: '1976-02', work_start_date: '1996-01' }
    })
    const txt = (r.content || []).map((c) => c.text).join('\n')
    check('缺参数 → isError=true 且不抛异常', r.isError === true)
    check('缺参数 → 点名回问所缺字段', /average_index/.test(txt), txt.slice(0, 60).replace(/\n/g, ' '))
  } catch (e) {
    check('缺参数 → isError=true 且不抛异常', false, '抛异常了: ' + e.message)
  }

  // 5. 未知工具 —— SDK 应当收到协议级错误
  try {
    const r = await client.callTool({ name: 'no_such_tool', arguments: {} })
    check('未知工具 → 协议报错', r.isError === true, 'isError=' + r.isError)
  } catch (e) {
    check('未知工具 → 协议报错（抛异常也算正确）', true, e.message.slice(0, 60))
  }

  // 6. ping
  try {
    await client.ping()
    check('ping 通过', true)
  } catch (e) {
    check('ping 通过', false, e.message)
  }

  await client.close()
  report()
}

function report () {
  console.log('\n===== 汇总 =====')
  console.log('通过 ' + ok.length + ' 项，失败 ' + bad.length + ' 项')
  if (bad.length) {
    console.log('失败项：')
    bad.forEach((b) => console.log('  - ' + b))
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.log('💥 未捕获异常:', e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e)
  process.exitCode = 1
})
