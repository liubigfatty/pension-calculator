# -*- coding: utf-8 -*-
"""给省份配置插入 annual_subsidies（年度/采暖季补贴，不进月领）

数据源全部为省级官方文件，见公众号内容库
  09-测算案例与规划/_地方项全量审计（2026-09-22 纠正版）.md 第五节
"""
import io, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cloudfunctions', 'calculate', 'provinces')

BLOCKS = {
 'shanxi': """  // 冬季取暖补贴：按年一次性发放，**不计入月基本养老金**（企业离退休，统筹基金支付）
  // 晋人社厅发〔2017〕9号：标准由 2400 元调整为每人每年 3360 元，每年 10 月随基本养老金一次性发放
  modules.annual_subsidies = {
    enabled: true,
    note: '参加山西省城镇企业职工基本养老保险、当年9月30日前办理离退休手续并按月领取基本养老金的人员',
    items: [
      { name: '冬季取暖补贴', amount: 3360, unit: '元/年', when: '每年10月随基本养老金一次性发放', source: '晋人社厅发〔2017〕9号（2016年10月起执行）' }
    ]
  };
""",
 'shandong': """  // 冬季取暖补贴：按年一次性发放，**不计入月基本养老金**
  // 鲁人社办发〔2013〕106号：企业退休职工年取暖补贴由 1100 元调整为每人每年 1700 元
  modules.annual_subsidies = {
    enabled: true,
    note: '企业退休、退职人员（含以灵活就业身份参加职工养老保险并办理退休的人员）',
    items: [
      { name: '冬季取暖补贴', amount: 1700, unit: '元/年', when: '每年10月随当月养老待遇一并发放', source: '鲁人社办发〔2013〕106号（原鲁人社发〔2010〕38号）' }
    ]
  };
""",
 'hebei': """  // 冬季取暖补贴：按年一次性发放，**不计入月基本养老金**；分三档，按退休地所属取暖区域
  // 冀人社发〔2012〕3号：坝上地区 1560 元 / 张承其他县及青龙、涞源 1400 元 / 省内其他地区 1240 元
  modules.annual_subsidies = {
    enabled: true,
    note: '按退休地所属取暖区域分档；取暖期内退休的人员按 当地年度标准÷取暖期月数×剩余月数 计发',
    items: [
      { name: '冬季取暖补贴', tiers: { default: 1240, prov: 1240, bashang: 1560, mountain: 1400 }, unit: '元/年', when: '每年11月随当月养老金一次性发放', source: '冀人社发〔2012〕3号（2011年冬季取暖期起执行）' }
    ]
  };
""",
 'tianjin': """  // 冬季取暖补贴 + 集中供热采暖补助费：按采暖季一次性发放，**不计入月基本养老金**
  // 天津市人社局/财政局：冬季取暖补贴 335 元/年 + 集中供热采暖补助费 185 元/年 = 520 元
  modules.annual_subsidies = {
    enabled: true,
    note: '退休职工由企业职工基本养老保险基金发放；采暖季内新退休的按4个月平均折算后一次性发放',
    items: [
      { name: '冬季取暖补贴', amount: 335, unit: '元/采暖季', when: '每年11月随养老金一次性发放', source: '天津市人社局2018年完善发放方式通知（2008年起由235元提至335元）' },
      { name: '集中供热采暖补助费', amount: 185, unit: '元/采暖季', when: '每年11月随养老金一次性发放', source: '津政发〔2000〕72号' }
    ]
  };
""",
 'shaanxi': """  // 供热采暖补贴：按采暖季发放，**不计入月基本养老金**
  // 陕人社发〔2017〕57号：企业退休（职）人员供热采暖补贴标准调整为 2360 元，2017年冬季取暖季起执行
  modules.annual_subsidies = {
    enabled: true,
    note: '参加企业职工基本养老保险的退休（职）人员，从养老保险基金支付；发放时间为11、12月及次年1、2月',
    items: [
      { name: '供热采暖补贴', amount: 2360, unit: '元/采暖季', when: '11、12月及次年1、2月发放', source: '陕人社发〔2017〕57号' }
    ]
  };
""",
 'qinghai': """  // 冬季取暖费：按年发放，**不计入月基本养老金**
  // ⚠️ 待核：目前采信西宁市企业离退休人员口径 3900 元/年（西宁市社保局 2022 年公开发放数据）；
  //    祁连县 2024 年度决算显示当地企业退休人员取暖费 4133 元/人，提示标准可能分地区、逐年浮动。
  //    省级统一文件尚未查到，引用前须再核。
  modules.annual_subsidies = {
    enabled: true,
    pendingVerify: true,
    note: '西宁市企业离退休人员口径；省级统一标准待核，各地州可能不同',
    items: [
      { name: '冬季取暖费', amount: 3900, unit: '元/年', when: '每年10月随养老金发放', source: '西宁市社保局公开发放数据（省级统一文件待核）' }
    ]
  };
""",
 'ningxia': """  // 冬季取暖费补贴：按年发放，**不计入月基本养老金**；标准逐年浮动
  // 机制（自治区人社厅）：= 上一年度全区企业参保退休人员月平均养老金 + 2010年以来增加的人均 750 元
  //   2020年度 4193 元（月均 3443 + 750）；2021年度 4394 元（月均 3644 + 750）
  // ⚠️ avgPensionData.latest 用的是最近一次已公布的月均基数，之后年份须按当年公布值更新
  modules.annual_subsidies = {
    enabled: true,
    note: '标准逐年浮动＝上年度全区企业参保退休人员月平均养老金＋750元；此处沿用最近一次已公布基数，非当年实际值',
    items: [
      { name: '冬季取暖费补贴', formula: 'avgPensionPlus', avgPensionData: { latest: 3644 }, plus: 750, unit: '元/年', when: '每年10月随养老金一次性发放', source: '自治区人社厅/财政厅年度通知（2021年度为4394元）' }
    ]
  };
""",
}

ok, fail = [], []
for prov, block in BLOCKS.items():
    p = os.path.join(ROOT, prov + '.js')
    if not os.path.exists(p):
        fail.append((prov, '文件不存在')); continue
    s = io.open(p, encoding='utf-8').read()
    if 'annual_subsidies' in s:
        fail.append((prov, '已存在，跳过')); continue
    # 定位 getEngineConfig() 之后的第一个顶层 "  return {"
    i = s.find('function getEngineConfig()')
    if i < 0:
        fail.append((prov, '未找到 getEngineConfig')); continue
    j = s.find('\n  return {', i)
    if j < 0:
        fail.append((prov, '未找到 return {')); continue
    s = s[:j+1] + block + s[j+1:]
    io.open(p, 'w', encoding='utf-8').write(s)
    ok.append(prov)

print('已插入:', '、'.join(ok) if ok else '无')
for f in fail: print('  ✗', f[0], f[1])
