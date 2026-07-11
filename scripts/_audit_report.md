# 已启动省份 红CASE 现状审计（严格口径：零红=A类）

> 生成时间：2026-07-11  |  总用例 154 / 绿 153 / 红 1
> 红case分类：脏expected(可重标定)=历史脏数据，重标定引擎值即转绿；真实表冲突=verified真实表与引擎不符，需真实表或引擎修复；生成对照垃圾=旧引擎自动生成case_id=NaN，应删。

## 一、A类·已全绿（30省，零红）

- 安徽(anhui) 1/1
- 北京(beijing) 7/7
- 重庆(chongqing) 5/5
- 甘肃(gansu) 4/4
- 广东(guangdong) 6/6
- 广西(guangxi) 5/5
- 贵州(guizhou) 4/4
- 海南(hainan) 3/3
- 河北(hebei) 4/4
- 黑龙江(heilongjiang) 6/6
- 河南(henan) 7/7
- 湖北(hubei) 10/10
- 湖南(hunan) 4/4
- 江苏(jiangsu) 6/6
- 江西(jiangxi) 8/8
- 吉林(jilin) 6/6
- 辽宁(liaoning) 6/6
- 内蒙古(neimenggu) 1/1
- 宁夏(ningxia) 3/3
- 青海(qinghai) 4/4
- 陕西(shaanxi) 5/5
- 山东(shandong) 5/5
- 上海(shanghai) 3/3
- 山西(shanxi) 5/5
- 四川(sichuan) 7/7
- 天津(tianjin) 6/6
- 新疆(xinjiang) 3/3
- 西藏(xizang) 4/4
- 云南(yunnan) 4/4
- 浙江(zhejiang) 9/9

## 二、可重标定升A（0省，红case全是脏expected/生成垃圾，重标定即全绿）

| 省 | 绿/总 | 红数 | 红case明细(类型) |
|---|---|---|---|

## 三、暂不能升A（1省，含真实表冲突/引擎报错，需决策）

### 福建(fujian) 2/3 绿，红1
- backup_32.json [真实表冲突/verified] transitional_pension:678.3->681.12 | total:3699.23->3702.17

## 结论

- **30/31 已启动省**的红case均为脏数据或可删垃圾，经引擎重标定（沿用湖北/山西/四川/西藏范式）即可全部转绿、升A类。
- **仅福建(fujian)** 存在真实表冲突：`backup_32.json` 过渡养老金引擎算得比真实表高 2.82 元（pre_account_years 取整误差，源表 11.5 实为约 11.46 年），属真实标定缺口，**不能**直接重标定覆盖，需你决策（保留为已知校准项 / 反推精确有效年限）。
