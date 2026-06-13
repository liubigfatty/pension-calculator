#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
江苏养老金引擎升级脚本
为 engine/pension-engine.js 添加江苏省过渡性养老金特殊公式支持
"""

import os

# 引擎文件路径
engine_file = r'C:\Users\14041\AppData\Roaming\winclaw\.openclaw\workspace\养老金计算平台\engine\pension-engine.js'

# 备份原文件
backup_file = engine_file + '.bak'
with open(engine_file, 'r', encoding='utf-8') as f:
    original_content = f.read()

with open(backup_file, 'w', encoding='utf-8') as f:
    f.write(original_content)

print(f'已备份原文件到: {backup_file}')

content = original_content

# ========== 修改1: parseInput() 函数 ==========
# 在 'monthsInput' 解析之后、return 语句之前添加新参数解析

marker1 = '    monthsInput: inputData.months != null ? parseFloat(inputData.months) : null'
marker1_end = '    // 性别映射到人员类型'

new_code1 = """    // 江苏特殊参数：过渡性养老金平均缴费指数（与基础养老金指数可能不同）
    const transIndex = parseFloat(inputData.transIndex) || null

    // 江苏特殊参数：1996年底前的缴费年限（用于过渡性养老金计算）
    const pre1996Years = parseFloat(inputData.pre1996Years) || null

    // 江苏特殊参数：原办法过渡性养老金（新老办法并存，取高值）
    const transPensionOld = parseFloat(inputData.transPensionOld) || null
"""

if marker1 in content and marker1_end in content:
    # 找到 marker1 的位置
    pos1 = content.find(marker1)
    # 找到 marker1_end 的位置（在 marker1 之后）
    pos2 = content.find(marker1_end, pos1)
    
    # 在 pos2 之前插入新代码
    content = content[:pos2] + new_code1 + '    ' + content[pos2:]
    print('OK: 已修改 parseInput() - 添加 transIndex, pre1996Years, transPensionOld 解析')
else:
    print('ERROR: 找不到 parseInput() 中的标记1')

# ========== 修改2: parseInput() return 语句 ==========
# 在 'monthsInput,' 之后添加新字段

marker2_old = '    monthsInput,     // 用户显式指定的计发月数（可为null，覆盖自动计算）'
marker2_new = """    monthsInput,     // 用户显式指定的计发月数（可为null，覆盖自动计算）
    transIndex,       // 过渡性养老金平均缴费指数（可为null）
    pre1996Years,    // 1996年底前的缴费年限（可为null）
    transPensionOld, // 原办法过渡性养老金（可为null）
"""

if marker2_old in content:
    content = content.replace(marker2_old, marker2_new)
    print('OK: 已修改 parseInput() return - 添加新字段')
else:
    print('ERROR: 找不到 parseInput() return 中的标记2')

# ========== 修改3: calcTransitionalPension() 函数 - 添加江苏分支 ==========
# 在北京分支结束后添加江苏分支

marker3 = """    // 通用公式：全省计发基数 × 缴费年限 × 指数 × 系数
  const coef = actualYears > 20 ? mod.coefficient_over_20 : mod.coefficient_under_20
  const amount = Math.round(provBase * effectiveYears * avgIndex * coef * 100) / 100"""

jiangsu_branch = """
  // 江苏特殊公式（苏政发〔2023〕?号）：
  // 过渡性养老金 = 退休时上年度全省在岗职工月平均工资 × 1996年底前平均缴费工资指数 × 1996年底前缴费年限 × 1.2%
  // 新老办法并存：取高值
  if (mod.formula_type === "jiangsu") {
    const retireBase = params?.retireBase || provBase
    const transIdx = params?.transIndex || avgIndex
    const pre96 = params?.pre1996Years || 0
    const coefJS = mod.coefficient || 0.012

    if (pre96 <= 0) return { amount: 0, description: '1996年底前无缴费年限' }

    const amountNew = Math.round(retireBase * transIdx * pre96 * coefJS * 100) / 100

    // 新老办法并存：取高值
    const oldMethod = params?.transPensionOld || 0
    const finalAmount = Math.max(amountNew, oldMethod)

    let desc = '江苏过渡性养老金(新办法): ' + retireBase.toLocaleString() + ' x ' + transIdx.toFixed(4) + ' x ' + pre96.toFixed(2) + '年 x ' + (coefJS * 100).toFixed(1) + '% = ' + amountNew.toFixed(2) + '元'
    if (oldMethod > 0) {
      desc += '，原办法=' + oldMethod.toFixed(2) + '元，取高值=' + finalAmount.toFixed(2) + '元'
    }

    return { amount: finalAmount, description: desc }
  }
"""

if marker3 in content:
    content = content.replace(marker3, jiangsu_branch + '\n  ' + marker3)
    print('OK: 已修改 calcTransitionalPension() - 添加江苏分支')
else:
    print('ERROR: 找不到 calcTransitionalPension() 中的标记3')

# ========== 修改4: calculate() 函数 - 第一处调用 ==========
# 修改第一次调用 calcTransitionalPension() 的位置

marker4_old = """  // 过渡性养老金
  const transPension = calcTransitionalPension({
    provBase: provBase,
    sightYears,
    avgIndex: data.avgIndex,
    actualYears,
    totalYears,
    mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 },
    preAccountYears
  })"""

marker4_new = """  // 过渡性养老金
  const transPension = calcTransitionalPension({
    provBase: provBase,
    retireBase: retBase,
    sightYears,
    avgIndex: data.avgIndex,
    actualYears,
    totalYears,
    mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 },
    preAccountYears,
    transIndex: data.transIndex,
    pre1996Years: data.pre1996Years,
    transPensionOld: data.transPensionOld
  })"""

if marker4_old in content:
    content = content.replace(marker4_old, marker4_new)
    print('OK: 已修改 calculate() - 第一处 calcTransitionalPension 调用')
else:
    print('ERROR: 找不到 calculate() 中第一处调用标记4')

# ========== 修改5: calculate() 函数 - 第二处调用 ==========
# 修改第二次调用 calcTransitionalPension() 的位置

marker5_old = """  const flexTrans = calcTransitionalPension({
    provBase: flexProvBase, sightYears, avgIndex: data.avgIndex,
    actualYears,
    totalYears,
    mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 },
    preAccountYears
  })"""

marker5_new = """  const flexTrans = calcTransitionalPension({
    provBase: flexProvBase,
    retireBase: flexRetBase,
    sightYears, avgIndex: data.avgIndex,
    actualYears,
    totalYears,
    mod: config.modules?.transitional_pension || { enabled: false, coefficient_over_20: 0.014, coefficient_under_20: 0.012 },
    preAccountYears,
    transIndex: data.transIndex,
    pre1996Years: data.pre1996Years,
    transPensionOld: data.transPensionOld
  })"""

if marker5_old in content:
    content = content.replace(marker5_old, marker5_new)
    print('OK: 已修改 calculate() - 第二处 calcTransitionalPension 调用')
else:
    print('ERROR: 找不到 calculate() 中第二处调用标记5')

# 写入修改后的文件
with open(engine_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n完成! 已升级引擎文件: {engine_file}')
print('请检查修改是否正确，如有问题可从备份文件恢复')
