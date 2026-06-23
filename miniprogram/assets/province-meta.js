// 31省城市类型和加发项配置
// 由 deep-scan.js 生成，也可手动编辑
// 供 step3.js 动态渲染加发项

module.exports = {
  desc: "31省城市类型和加发项配置",
  provinces: [
    {
      "code": "anhui",
      "name": "安徽省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "beijing",
      "name": "北京市",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全市统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "chongqing",
      "name": "重庆市",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全市统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "fujian",
      "name": "福建省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "gansu",
      "name": "甘肃省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": true,
      "extraType": "special_addition",
      "extraLabel": "调节金"
    },
    {
      "code": "guangdong",
      "name": "广东省",
      "cityTypes": ["prov", "shenzhen"],
      "cityTypeLabels": { "prov": "全省（不含深圳）", "shenzhen": "深圳市" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "guangxi",
      "name": "广西壮族自治区",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全区统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "guizhou",
      "name": "贵州省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "hainan",
      "name": "海南省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "hebei",
      "name": "河北省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "heilongjiang",
      "name": "黑龙江省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": true,
      "extraType": "special_addition",
      "extraLabel": "调节金"
    },
    {
      "code": "henan",
      "name": "河南省",
      "cityTypes": ["prov", "zhengzhou"],
      "cityTypeLabels": { "prov": "全省（不含郑州）", "zhengzhou": "郑州市" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "hubei",
      "name": "湖北省",
      "cityTypes": ["prov", "wh", "tier3"],
      "cityTypeLabels": {
        "prov": "全省其他地区（二档）",
        "wh": "武汉市及省直（一档）",
        "tier3": "三档城市（孝感/荆州/黄冈等）"
      },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "hunan",
      "name": "湖南省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "jiangsu",
      "name": "江苏省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "jiangxi",
      "name": "江西省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "jilin",
      "name": "吉林省",
      "cityTypes": ["prov", "changchun"],
      "cityTypeLabels": { "prov": "全省（不含长春）", "changchun": "长春市" },
      "hasExtra": true,
      "extraType": "extra_pension",
      "extraLabel": "增发养老金"
    },
    {
      "code": "liaoning",
      "name": "辽宁省",
      "cityTypes": ["prov", "shenyang", "dalian"],
      "cityTypeLabels": { "prov": "全省（不含沈阳、大连）", "shenyang": "沈阳市", "dalian": "大连市" },
      "hasExtra": true,
      "extraType": "extra_pension",
      "extraLabel": "增发养老金"
    },
    {
      "code": "neimenggu",
      "name": "内蒙古自治区",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全区统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "ningxia",
      "name": "宁夏回族自治区",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全区统一基数" },
      "hasExtra": true,
      "extraType": "intellectual_subsidy",
      "extraLabel": "知识分子补贴"
    },
    {
      "code": "qinghai",
      "name": "青海省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "shaanxi",
      "name": "陕西省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "shandong",
      "name": "山东省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "shanghai",
      "name": "上海市",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全市统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "shanxi",
      "name": "山西省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "sichuan",
      "name": "四川省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": true,
      "extraType": "extra_pension",
      "extraLabel": "增发养老金"
    },
    {
      "code": "tianjin",
      "name": "天津市",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全市统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "xinjiang",
      "name": "新疆维吾尔自治区",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全区统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "xizang",
      "name": "西藏自治区",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全区统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    },
    {
      "code": "yunnan",
      "name": "云南省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": true,
      "extraType": "special_addition",
      "extraLabel": "独生子女补贴"
    },
    {
      "code": "zhejiang",
      "name": "浙江省",
      "cityTypes": ["prov"],
      "cityTypeLabels": { "prov": "全省统一基数" },
      "hasExtra": false,
      "extraType": null,
      "extraLabel": null
    }
  ]
}
