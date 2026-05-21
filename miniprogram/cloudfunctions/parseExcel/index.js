// 云函数入口
const cloud = require('wx-server-sdk')
cloud.init({ environment: 'pension-calculato-6es590ea35e2f3' })
const db = cloud.database()

// 吉林省历年计发基数（元/月）
const PROV_BASE = {
  1995: 369.17, 1996: 447.50, 1997: 472.00, 1998: 545.92, 1999: 596.50,
  2000: 660.33, 2001: 730.92, 2002: 832.50, 2003: 923.42, 2004: 1035.92,
  2005: 1200.75, 2006: 1381.92, 2007: 1709.42, 2008: 1957.17, 2009: 2185.83,
  2010: 2449.92, 2011: 2849.75, 2012: 3200.58, 2013: 3570.50, 2014: 3876.33,
  2015: 4296.50, 2016: 4674.83, 2017: 5120.92, 2018: 5711.08, 2019: 6151.08,
  2020: 5088.42, 2021: 6004.75, 2022: 6384.83, 2023: 6655.33, 2024: 7178.50,
  2025: 7322.08
}

// 长春市历年计发基数（2020年起单列）
const CC_BASE = {
  2020: 6605.23, 2021: 6605.23, 2022: 7023.31, 2023: 7320.86, 2024: 7852.58, 2025: 7978.25
}

// 历年记账利率
const INTEREST_RATE = {
  1995: 0.025, 1996: 0.025, 1997: 0.025, 1998: 0.025, 1999: 0.025,
  2000: 0.025, 2001: 0.025, 2002: 0.025, 2003: 0.025, 2004: 0.025,
  2005: 0.0226, 2006: 0.025, 2007: 0.025, 2008: 0.0393, 2009: 0.0225,
  2010: 0.0230, 2011: 0.025, 2012: 0.025, 2013: 0.0325, 2014: 0.025,
  2015: 0.025,
  2016: 0.0831, 2017: 0.0712, 2018: 0.0829, 2019: 0.0761, 2020: 0.0604,
  2021: 0.0669, 2022: 0.0397, 2023: 0.0397, 2024: 0.0262, 2025: 0.0150
}

// 字段映射表（标准格式：2010年缴费基数 列）
const FIELD_MAPPINGS = {
  avgIndex: ['平均缴费指数', '平均指数', '缴费指数'],
  avgIndexTotal: ['平均缴费指数（合计）', '平均指数（合计）'],
  totalYears: ['累计缴费年限', '缴费年限', '总缴费年限', '实际缴费年限'],
  base_2010: ['2010年缴费基数', '2010年度缴费基数', '2010年基数'],
  base_2011: ['2011年缴费基数', '2011年度缴费基数', '2011年基数'],
  base_2012: ['2012年缴费基数', '2012年度缴费基数', '2012年基数'],
  base_2013: ['2013年缴费基数', '2013年度缴费基数', '2013年基数'],
  base_2014: ['2014年缴费基数', '2014年度缴费基数', '2014年基数'],
  base_2015: ['2015年缴费基数', '2015年度缴费基数', '2015年基数'],
  base_2016: ['2016年缴费基数', '2016年度缴费基数', '2016年基数'],
  base_2017: ['2017年缴费基数', '2017年度缴费基数', '2017年基数'],
  base_2018: ['2018年缴费基数', '2018年度缴费基数', '2018年基数'],
  base_2019: ['2019年缴费基数', '2019年度缴费基数', '2019年基数'],
  base_2020: ['2020年缴费基数', '2020年度缴费基数', '2020年基数'],
  base_2021: ['2021年缴费基数', '2021年度缴费基数', '2021年基数'],
  base_2022: ['2022年缴费基数', '2022年度缴费基数', '2022年基数'],
  base_2023: ['2023年缴费基数', '2023年度缴费基数', '2023年基数'],
  base_2024: ['2024年缴费基数', '2024年度缴费基数', '2024年基数'],
  base_2025: ['2025年缴费基数', '2025年度缴费基数', '2025年基数'],
}

// 社保网站导出格式 —— 列名模糊匹配
const SHEBao_NAME_PATTERNS = {
  period: ['缴费所属期', '所属期', '月份', '年月', '缴费月份', '缴费时期', '期别'],
  base:   ['缴费基数', '工资基数', '缴费工资基数'],
  flag:   ['缴费标志', '状态', '缴费状态', '标志', '是否缴纳', '缴费情况'],
}

/**
 * 从缴费所属期文本中提取年份
 * 支持格式："2023年01月"、"2023-01"、"202301"、"2023" 等
 */
function extractYearFromPeriod(value) {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  if (!s) return null
  const m = s.match(/(\d{4})/) // 匹配第一个4位数字
  return m ? parseInt(m[1]) : null
}

/**
 * 扫描Excel第一行，查找社保网站导出格式的列
 * 返回 { periodCol: number, baseCol: number } 或 null
 */
function findSheBaoColumns(header) {
  let periodCol = -1
  let baseCol = -1
  for (let i = 0; i < header.length; i++) {
    const name = String(header[i] || '').trim()
    if (!name) continue

    // 匹配所属期
    if (periodCol === -1) {
      for (const p of SHEBao_NAME_PATTERNS.period) {
        if (name.includes(p) || p.includes(name)) { periodCol = i; break }
      }
    }
    // 匹配基数
    if (baseCol === -1) {
      for (const b of SHEBao_NAME_PATTERNS.base) {
        if (name.includes(b) || b.includes(name)) { baseCol = i; break }
      }
    }
    if (periodCol !== -1 && baseCol !== -1) break
  }
  return periodCol !== -1 && baseCol !== -1
    ? { periodCol, baseCol }
    : null
}

function findField(sheet, names) {
  if (!sheet || !sheet[0]) return null
  const header = sheet[0]
  for (const name of names) {
    const idx = header.indexOf(name)
    if (idx !== -1) return idx
  }
  return null
}

/**
 * 解析社保网站导出格式
 * 逐行读取：从"缴费所属期"提取年份，从"缴费基数"取数值
 * 同一年可能有多个月，取最后一个有效值（通常是最新/最新月份）
 */
function parseSheBaoFormat(data, colMap) {
  const result = {}
  const { periodCol, baseCol } = colMap

  // 从数据行开始遍历（跳过第一行表头）
  for (let r = 1; r < data.length; r++) {
    const row = data[r]
    if (!row || row.length === 0) continue

    const period = row[periodCol]
    const base = row[baseCol]

    const year = extractYearFromPeriod(period)
    if (!year) continue
    if (year < 1995 || year > 2026) continue

    const baseVal = cellVal(base)
    if (!baseVal || baseVal <= 0) continue

    // 同一年可能有多个月份，记录最后一个有效值
    result[year] = baseVal
  }

  return result
}

function cellVal(cell) {
  if (cell === undefined || cell === null) return null
  if (typeof cell === 'number') return cell
  const s = String(cell).trim()
  if (!s || s === '-' || s === '/' || s === '—') return null
  return parseFloat(s.replace(/,/g, '')) || null
}

function calcPersonalAcc(yearlyData) {
  let acc = 0
  const years = Object.keys(yearlyData).map(Number).sort()
  for (let i = 0; i < years.length; i++) {
    const y = years[i]
    const base = yearlyData[y]
    if (!base) continue
    const deposit = base * 0.08 * 12
    for (let j = i + 1; j < years.length; j++) {
      const r = INTEREST_RATE[years[j]] || 0.025
      acc = (acc + deposit) * (1 + r)
    }
    if (i === years.length - 1) acc += deposit
  }
  return Math.round(acc)
}

function calcAvgIndex(yearlyData) {
  let sum = 0, count = 0
  const years = Object.keys(yearlyData).map(Number).sort()
  for (const y of years) {
    const base = yearlyData[y]
    if (!base) continue
    const provBase = PROV_BASE[y]
    if (!provBase) continue
    sum += base / provBase
    count++
  }
  return count > 0 ? +(sum / count).toFixed(4) : null
}

exports.main = async (event, context) => {
  try {
    const { fileID } = event
    if (!fileID) return { success: false, error: '缺少文件ID' }

    const res = await cloud.downloadFile({ fileID })
    const buffer = res.fileContent
    const xlsx = require('xlsx')
    const workbook = xlsx.read(buffer, { type: 'buffer' })

    const result = {}
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null })
      if (!data || data.length < 2) continue

      let dataRow = 1
      while (dataRow < data.length) {
        const row = data[dataRow]
        if (!row || row.every(c => !c)) { dataRow++; continue }
        const hasContent = row.some(c => c !== null && c !== undefined && String(c).trim() !== '')
        if (!hasContent) { dataRow++; continue }
        break
      }

      if (dataRow >= data.length) continue
      const row = data[dataRow]

      // ===== 方案1：标准格式（平均缴费指数 / 2010年缴费基数 等列） =====
      const mergedData = {}
      for (const [field, names] of Object.entries(FIELD_MAPPINGS)) {
        const colIdx = findField(data, names)
        if (colIdx !== null && colIdx < row.length) {
          const val = cellVal(row[colIdx])
          if (val !== null) mergedData[field] = val
        }
      }

      // ===== 方案2：社保网站导出格式（缴费所属期 + 缴费基数 行数据） =====
      let yearlyData = {}
      const headerRow = data[0] || []
      const sheBao = findSheBaoColumns(headerRow)

      if (sheBao) {
        // 社保格式：逐行读取，从"缴费所属期"提取年份，取"缴费基数"值
        yearlyData = parseSheBaoFormat(data, sheBao)
      }

      // 如果没有社保格式数据，退回到标准格式
      if (Object.keys(yearlyData).length === 0) {
        for (let y = 2010; y <= 2025; y++) {
          const key = `base_${y}`
          if (mergedData[key]) yearlyData[y] = mergedData[key]
        }
      }

      if (Object.keys(yearlyData).length === 0 && mergedData.avgIndex) {
        const avgIdx = mergedData.avgIndex
        for (let y = 2010; y <= 2025; y++) {
          const provBase = PROV_BASE[y]
          if (provBase) yearlyData[y] = +(provBase * avgIdx).toFixed(2)
        }
      }

      let avgIndex = mergedData.avgIndex || calcAvgIndex(yearlyData)
      let personalAcc = null
      if (Object.keys(yearlyData).length > 0) {
        personalAcc = calcPersonalAcc(yearlyData)
        if (!avgIndex) avgIndex = calcAvgIndex(yearlyData)
      }

      const yearlyDetails = []
      const years = Object.keys(yearlyData).map(Number).sort()
      let runningAcc = 0
      for (let i = 0; i < years.length; i++) {
        const y = years[i]
        const base = yearlyData[y]
        const provBase = PROV_BASE[y] || 0
        const idx = provBase > 0 ? +(base / provBase).toFixed(4) : null
        const deposit = base * 0.08 * 12
        const rate = INTEREST_RATE[y] || 0.025
        for (let j = i + 1; j < years.length; j++) {
          const r2 = INTEREST_RATE[years[j]] || 0.025
          runningAcc = (runningAcc + deposit) * (1 + r2)
        }
        if (i === years.length - 1) runningAcc += deposit
        yearlyDetails.push({
          year: y,
          base: base,
          provBase: provBase,
          index: idx,
          deposit: +deposit.toFixed(2),
          account: Math.round(runningAcc)
        })
      }

      result[sheetName] = {
        avgIndex: avgIndex,
        personalAcc: personalAcc,
        totalYears: mergedData.totalYears || years.length,
        yearlyDetails: yearlyDetails
      }
    }

    const sheetNames = Object.keys(result)
    if (sheetNames.length === 0) {
      return { success: false, error: '未能解析到有效数据，请检查Excel格式' }
    }

    return { success: true, data: result[sheetNames[0]], allSheets: result }

  } catch (err) {
    console.error('parseExcel error:', err)
    return { success: false, error: err.message || '解析失败' }
  }
}
