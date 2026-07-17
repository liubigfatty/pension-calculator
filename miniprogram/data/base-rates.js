// miniprogram/data/base-rates.js
// 各省市计发基数选择配置（前端使用）
// 用于step2页面显示计发基数选择

// 2024/2025年计发基数（元/月），按省份索引 [0-30]
// 数据来源：data/provinces/*.js 的 PROV_BASE 最新年份值
const PROV_BASE_LATEST = [
  12477, // [0] beijing (2025)
  8762,  // [1] tianjin (2025)
  7483,  // [2] hebei (2025)
  7324,  // [3] shanxi (2025)
  8348,  // [4] neimenggu (2025)
  7121,  // [5] liaoning (2023)
  7394,  // [6] jilin (2025)
  7705,  // [7] heilongjiang (2025)
  12636, // [8] shanghai (2025)
  9049,  // [9] jiangsu (2025)
  8559,  // [10] zhejiang (2025)
  8077,  // [11] anhui (2025)
  8009,  // [12] fujian (2025)
  7123,  // [13] jiangxi (2025)
  7908,  // [14] shandong (2025)
  6738,  // [15] henan (2025)
  6665,  // [16] hubei (2025)
  7060,  // [17] hunan (2025)
  9905,  // [18] guangdong (2025)
  7052,  // [19] guangxi (2025)
  8375,  // [20] hainan (2025)
  8405,  // [21] chongqing (2025)
  8289,  // [22] sichuan (2025)
  7490,  // [23] guizhou (2025)
  7263,  // [24] yunnan (2025)
  11892, // [25] xizang (2025)
  7959,  // [26] shaanxi (2025)
  7822,  // [27] gansu (2025)
  9144,  // [28] qinghai (2025)
  8448,  // [29] ningxia (2025)
  8582,  // [30] xinjiang (2025)
]

// 双基数省份配置：省份索引 → 城市选项
// 与 step1.js 的 DOUBLE_BASE_PROVINCES 对应
const CITY_TYPE_CONFIG = {
  // 河南双基数城市（values 必须与 henan.js base_rates key 一致：引擎按 cityType 直接查 base_rates，无缩写映射）
  15: {
    names: ['郑州市', '洛阳市', '开封市', '信阳市', '平顶山市', '新乡市', '全省其他'],
    values: ['zhengzhou', 'luoyang', 'xinyang', 'kaifeng', 'pingdingshan', 'xinxiang', 'prov']
  },
  // 吉林：长春市 / 全省其他
  6: {
    names: ['长春市', '全省其他'],
    values: ['cc', 'prov']
  },
  // 辽宁：沈阳市 / 大连市 / 全省其他
  5: {
    names: ['沈阳市', '大连市', '全省其他'],
    values: ['shenyang', 'dalian', 'prov']
  },
  // 广东：深圳市 / 全省其他
  18: {
    names: ['深圳市', '全省其他'],
    values: ['sz', 'prov']
  }
}

// 双基数省份索引列表
const DOUBLE_BASE_PROVINCES = [15, 6, 5, 18]

module.exports = {
  PROV_BASE_LATEST,
  CITY_TYPE_CONFIG,
  DOUBLE_BASE_PROVINCES
}
