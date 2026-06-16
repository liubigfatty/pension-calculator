/**
 * 引擎加载工具
 * 延迟加载 pension-engine，避免初始化超时
 */

const ENGINE_URL = 'https://liubigfatty.github.io/pension-calculator/js/pension-engine-browser.js'
let _engine = null

/**
 * 加载引擎（缓存，只加载一次）
 * @returns {Promise<Object>} PensionEngine
 */
function loadEngine() {
  if (_engine) return Promise.resolve(_engine)

  return new Promise((resolve, reject) => {
    wx.request({
      url: ENGINE_URL,
      dataType: 'text',
      success(res) {
        try {
          // 在沙箱中执行引擎代码
          var fn = new Function('module', res.data + '; return module.exports;')
          _engine = fn({ exports: {} })
          resolve(_engine)
        } catch(e) {
          reject(new Error('引擎解析失败: ' + e.message))
        }
      },
      fail(err) {
        reject(new Error('引擎加载失败: ' + err.errMsg))
      }
    })
  })
}

module.exports = { loadEngine }
