// pages/test/test.js
Page({
  data: {
    testing: false,
    result: null,
    error: null
  },

  onTestCalculate() {
    if (this.data.testing) return
    
    this.setData({ testing: true, result: null, error: null })
    
    // 构造测试参数（北京-男性-60岁退休）
    const params = {
      province: 'beijing',
      cityType: 'prov',
      gender: 'male',
      identity: 'employee',
      genderType: 'male',
      birthDate: '1965-10',
      workStartDate: '1985-07',
      averageIndex: 1.2,
      personalAccount: 80000,
      extras: {}
    }
    
    console.log('[test] 开始测试云函数调用，参数：', params)
    
    wx.cloud.callFunction({
      name: 'calculate',
      data: params,
      success: (res) => {
        this.setData({ testing: false })
        console.log('[test] 云函数调用成功：', res.result)
        
        if (res.result && res.result.success) {
          this.setData({ 
            result: JSON.stringify(res.result.data, null, 2)
          })
        } else {
          this.setData({ 
            error: res.result?.message || '云函数返回失败'
          })
        }
      },
      fail: (err) => {
        this.setData({ testing: false })
        console.error('[test] 云函数调用失败：', err)
        this.setData({ 
          error: err.message || '网络错误，请重试'
        })
      }
    })
  }
})
