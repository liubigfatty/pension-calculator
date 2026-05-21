// pages/contribution/contribution.js
const app = getApp()

Page({
  data: {
    name: '',
    gender: 'male',
    birthDate: '',
    workDate: '',
    avgIndex: '1.0',
    personalAcc: '',
    selectedProvince: null,
    cityList: [],
    selectedCity: null,
    loading: false,
    result: null,
    excelImporting: false,
    importSource: null  // 'excel' | 'manual'
  },

  onLoad() {
    if (app.globalData.provinces && app.globalData.provinces.length > 0) {
      this.setData({
        provinceList: app.globalData.provinces.map(p => p.name)
      })
    }
  },

  onProvinceChange(e) {
    const index = e.detail.value
    const province = app.globalData.provinces[index]
    const config = require(`../../provinces/${province.code}.json`)
    this.setData({
      selectedProvince: { name: config.name, code: province.code, config }
    })
    const cities = []
    if (config.base_rates) {
      Object.keys(config.base_rates).forEach(key => {
        if (key !== 'prov') {
          cities.push({ code: key, name: key === 'cc' ? '长春市' : key })
        }
      })
    }
    this.setData({ cityList: cities })
  },

  onCityChange(e) {
    const index = e.detail.value
    this.setData({ selectedCity: this.data.cityList[index] })
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onGenderChange(e) { this.setData({ gender: e.detail.value }) },
  onBirthChange(e) { this.setData({ birthDate: e.detail.value }) },
  onWorkChange(e) { this.setData({ workDate: e.detail.value }) },
  onIndexInput(e) { this.setData({ avgIndex: e.detail.value, importSource: 'manual' }) },
  onPersonalAccInput(e) { this.setData({ personalAcc: e.detail.value }) },

  // ===== Excel 导入 =====
  onImportExcel() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: async (res) => {
        const file = res.tempFiles[0]
        wx.showLoading({ title: '解析中...' })
        this.setData({ excelImporting: true, importSource: 'excel' })

        try {
          // 1. 上传到云存储
          const cloudPath = `excel-imports/${Date.now()}_${file.name}`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: file.tempFilePath
          })
          const fileID = uploadRes.fileID

          // 2. 调用云函数解析
          const parseRes = await wx.cloud.callFunction({
            name: 'parseExcel',
            data: { fileID }
          })

          wx.hideLoading()

          if (parseRes.result.success) {
            const data = parseRes.result.data
            const updateData = { excelImporting: false }

            // 自动填入解析到的数据
            if (data.avgIndex !== null) {
              updateData.avgIndex = String(data.avgIndex)
            }
            if (data.personalAccount !== null) {
              updateData.personalAcc = String(data.personalAccount)
            }

            this.setData(updateData)

            // 提示解析结果
            const parts = []
            if (data.avgIndex !== null) parts.push(`平均缴费指数：${data.avgIndex}`)
            if (data.personalAccount !== null) parts.push(`个人账户：${data.personalAccount}元`)
            if (data.sightYears !== null) parts.push(`视同年限：${data.sightYears}年`)

            if (parts.length > 0) {
              wx.showModal({
                title: '解析成功',
                content: parts.join('\n') + '\n\n数据已自动填入，可手动修改',
                showCancel: false
              })
            } else {
              wx.showModal({
                title: '部分解析',
                content: '未识别到标准字段，请手动填写。如有疑问请查看数据来源。',
                showCancel: false
              })
            }
          } else {
            this.setData({ excelImporting: false })
            wx.showModal({
              title: '解析失败',
              content: parseRes.result.error || '请确认是标准Excel文件（xlsx/xls格式）',
              showCancel: false
            })
          }
        } catch (err) {
          wx.hideLoading()
          this.setData({ excelImporting: false })
          console.error('Excel导入失败:', err)
          wx.showModal({
            title: '导入失败',
            content: err.message || '请确认云开发环境已开通，并已部署parseExcel云函数',
            showCancel: false
          })
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return
        wx.showToast({ title: '选择文件失败', icon: 'none' })
      }
    })
  },

  handleSubmit() {
    const { name, gender, birthDate, workDate, avgIndex, selectedProvince, selectedCity } = this.data
    if (!selectedProvince) {
      wx.showToast({ title: '请选择参保地区', icon: 'none' })
      return
    }
    if (!birthDate || !workDate) {
      wx.showToast({ title: '请填写出生年月和参加工作时间', icon: 'none' })
      return
    }
    const [birthY, birthM] = birthDate.split('-').map(Number)
    const [workY, workM] = workDate.split('-').map(Number)

    const input = {
      name,
      gender,
      birthYear: birthY,
      birthMonth: birthM,
      workYear: workY,
      workMonth: workM,
      avgIndex: parseFloat(avgIndex) || 1.0,
      cityType: selectedCity ? selectedCity.code : 'prov',
      retireType: gender === 'female' ? 'standard' : 'standard'
    }

    this.setData({ loading: true })
    const engine = require('../../engine/pension-engine')
    const result = engine.calculate(selectedProvince.config, input)
    this.setData({ loading: false, result })
  },

  goBack() {
    wx.navigateBack()
  }
})
