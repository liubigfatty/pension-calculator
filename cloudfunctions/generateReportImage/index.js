// 云函数：generateReportImage
// 接收小程序传来的报告数据 JSON，使用 @napi-rs/canvas 在服务端渲染成 PNG，
// 上传云存储并返回可访问的图片 URL。彻底规避小程序端 Canvas 原生组件叠字 /
// 16384 尺寸硬上限 / 离屏 canvas 真机 getContext(null) 等全部坑。
// @napi-rs/canvas 为 Rust/Skia 预编译二进制，零系统依赖；降级到个人版（256M/3s）也可运行。
const cloud = require('wx-server-sdk')
const path = require('path')
const { GlobalFonts } = require('@napi-rs/canvas')
const { renderReport } = require('./report-render.js')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云端 Linux 容器无中文字体，必须注册随包上传的黑体（SimHei）。
// 改为懒加载 + 模块级缓存：仅首次调用时注册一次（便于日志量化耗时，且避免模块顶层 import 时不可见计时）。
let _fontRegistered = false
function ensureFont() {
  if (_fontRegistered) return
  const t = Date.now()
  const FONT_PATH = path.join(__dirname, 'assets', 'simhei.ttf')
  GlobalFonts.registerFromPath(FONT_PATH, 'SimHei')
  _fontRegistered = true
  console.log('[gen] 字体注册耗时', Date.now() - t, 'ms')
}

exports.main = async (event) => {
  const T0 = Date.now()
  try {
    const data = event && event.data
    // 轻量预热：只返回 success，不渲染，用于触发云函数实例加载，降低首次保存冷启动
    if (data && data._warmup) {
      console.log('[gen] warmup 响应耗时', Date.now() - T0, 'ms')
      return { success: true, _warmup: true }
    }
    if (!data || !data.legalTotalStr) {
      return { success: false, message: '报告数据缺失' }
    }

    // 1) 注册中文字体（仅首次）
    ensureFont()

    // 2) 服务端渲染
    const tRender = Date.now()
    const pngBuffer = await renderReport(data)
    console.log('[gen] 渲染耗时', Date.now() - tRender, 'ms, PNG大小', pngBuffer.length, 'bytes')

    // 3) 转 base64 直接回传（省掉 uploadFile + getTempFileURL 两轮网络，利于 3s 硬上限）
    const tConvert = Date.now()
    const base64 = pngBuffer.toString('base64')
    console.log('[gen] base64 耗时', Date.now() - tConvert, 'ms, base64长度', base64.length)

    // 安全阈值：云函数回传上限约 1MB，base64 超过 950KB 时走云存储兜底
    const MAX_BASE64 = 950 * 1024
    if (base64.length <= MAX_BASE64) {
      console.log('[gen] 总耗时', Date.now() - T0, 'ms')
      return { success: true, base64: base64, bytes: pngBuffer.length }
    }

    console.warn('[gen] base64 长度', base64.length, '超过', MAX_BASE64, '，回退云存储')
    const tUpload = Date.now()
    const cloudPath = `report_images/${Date.now()}_${Math.floor(Math.random() * 1e6)}.png`
    const uploadRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: pngBuffer
    })
    console.log('[gen] 上传耗时', Date.now() - tUpload, 'ms')
    if (!uploadRes || !uploadRes.fileID) {
      return { success: false, message: '图片上传失败' }
    }
    let url = uploadRes.fileID
    const tUrl = Date.now()
    try {
      const urlRes = await cloud.getTempFileURL({ fileList: [uploadRes.fileID] })
      if (urlRes && urlRes.fileList && urlRes.fileList[0] && urlRes.fileList[0].tempFileURL) {
        url = urlRes.fileList[0].tempFileURL
      }
    } catch (e) {
      console.warn('[generateReportImage] getTempFileURL 失败，退回 fileID：', e.message)
    }
    console.log('[gen] 取URL耗时', Date.now() - tUrl, 'ms')
    console.log('[gen] 总耗时', Date.now() - T0, 'ms')
    return { success: true, fileID: uploadRes.fileID, url: url }
  } catch (err) {
    console.error('[generateReportImage] 执行失败(总耗时', Date.now() - T0, 'ms)：', err)
    return { success: false, message: err.message, stack: err.stack }
  }
}
