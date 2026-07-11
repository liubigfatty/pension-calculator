---
name: pensionIndexCalc
description: 计算本人平均缴费工资指数与个人账户余额。当用户想了解自己的养老金缴费水平、平均缴费指数、个人账户累计金额，或提供参保省份与逐年缴费基数时使用。
---

# 平均缴费工资指数计算 SKILL

## 功能
将用户的缴费信息转换为两个核心指标：
- **平均缴费工资指数**：各年「月均缴费基数 ÷ 当年全省社平工资」的月数加权平均，反映缴费水平高低（通常 0.6~3.0）。
- **个人账户余额**：各年「月均基数 × 月数 × 8%」按历年记账利率复利累加。
- 附带：累计缴费月数 / 年限、逐年明细。

## 何时调用
- 用户问「我的平均缴费指数是多少」「帮我算下养老金缴费指数」「我这些年缴费水平怎样」。
- 用户提供了参保地和逐年缴费基数（或愿意补充）。

## 输入
原子接口 `calculatePensionIndex`：
- `province`（string）：参保地，支持中文省名（「吉林省」「浙江」「北京」）或拼音代码（jilin/zhejiang/beijing）。
- `yearlyData`（array）：逐年明细，每项 `{ year: 年份, months: 该年缴费月数(1-12), baseAvg: 该年月均缴费基数(元/月) }`。
  - 未缴费年份：可省略，或 `baseAvg` 设为 0（5 个断缴计入省份会自动按 0 计入分母）。

## 输出（结构化）
- `avgIndex`：平均缴费工资指数
- `accountBalance`：个人账户余额（元）
- `totalMonths` / `totalYears`：累计缴费月数 / 年限
- `province`：参保地

## 示例
用户：「我是吉林的，1998 到 2022 年缴费，每年基数大概 3000 到 12000 不等」
→ 整理为 province="吉林省"，yearlyData=[{year:1998,months:12,baseAvg:3000}, ...]，调用 calculatePensionIndex。

## 数据口径
- 社平工资：各省市人社部门公布的官方全口径社平（元/月）。
- 记账利率：1996–2025 年统一利率表（2025 年 1.50%）。
- 断缴计入省份：北京、天津、陕西、浙江、云南（断缴年按 0 计入平均指数分母）。
- 2026 年及以后社平未正式公布，按已发布数据推算，结果仅供参考。

## 结果呈现（2026-07-03 账号卡片）
- 计算完成后，结果以「账号卡片」呈现；用户点击可接力进入小程序结果页（`/pages/result/result`），查看完整逐年明细与断缴提示。
- 话术上可先给出核心结论（平均指数、余额、累计缴费），并引导「点击卡片进入小程序查看逐年明细」。

## 边界
- 仅支持有逐年基数的正向计算；纯起止时间无基数无法算指数。
- 不提供理财/收益建议。


## 倒推模式（反向计算）
当用户没有逐年基数、但掌握其他信息时，调用以下反推原子接口（三种都需：province 参保地 + startYear/startMonth 首次缴费年月 + totalMonths 累计缴费月数）：

- **倒推① reverseIndexByBalance**：已知**账户余额** knownBalance → 反推平均缴费指数。触发：「我账户里有多少钱 / 余额多少」。
- **倒推② reverseYearlyByCurrentBase**：已知**当前月缴费基数** currentBase → 反推历年基数 + 平均指数 + 账户余额（假设历年按当前比例缴费）。触发：「我现在的工资/基数多少」。
- **倒推③ reverseYearlyByTargetIndex**：已知**目标平均指数** targetIndex → 反推每年应缴基数（每年 = 当年社平 × 目标指数）。触发：「我想达到 X 的指数 / 每年该缴多少」。

倒推结果均为「假设历年按统一比例缴费」的估算值，结果页会以「本结果为【反推】…」标注，对话中也应向用户说明这是估算。

## 示例对话（意图识别 few-shot）
以下示例帮助小程序 AI 准确识别用户意图并选择正确原子接口：

**① 正向计算**
用户：「我是吉林的，2018 到 2022 每年都按 6000 到 8000 交的」
→ 调用 `calculatePensionIndex`：province="吉林省"，yearlyData 按用户说的逐年基数补全（缺失具体年份则追问或按区间估算）。

**② 倒推①余额反推**
用户：「我北京交了 5 年，账户里现在有 5 万块钱，平均指数多少」
→ 调用 `reverseIndexByBalance`：province="北京"，totalMonths=60，knownBalance=50000（首缴年月缺失则追问 startYear/startMonth）。

**③ 倒推②当前基数反推**
用户：「我在北京从 2019 年交到现在的，现在月工资 11000，帮我反推历年」
→ 调用 `reverseYearlyByCurrentBase`：province="北京"，startYear=2019,startMonth=1，currentBase=11000（totalMonths 按 2019 至今推算或追问）。

**④ 倒推③目标指数反推**
用户：「我想平均指数达到 1.5，北京的话每年得交多少基数」
→ 调用 `reverseYearlyByTargetIndex`：province="北京"，targetIndex=1.5（首缴年月与 totalMonths 缺失则追问）。

**意图关键词速查**：
- 提到「逐年基数 / 每年交多少 / 每年工资」→ 正向 `calculatePensionIndex`
- 提到「账户里有多少钱 / 余额多少」→ 倒推① `reverseIndexByBalance`
- 提到「我现在工资 / 现在基数多少」→ 倒推② `reverseYearlyByCurrentBase`
- 提到「想达到 X 指数 / 每年该缴多少基数」→ 倒推③ `reverseYearlyByTargetIndex`
- 倒推均为估算（假设历年按统一比例缴费），对话与结果页均需说明是估算。
