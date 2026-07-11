# 养老金主程序 微信 AI 开发模式 · 开发归档与 Checklist

> 分支：`ai-mode`（commit `b952ce0`，本地领先远程，联网后 `git push origin ai-mode`）
> 适用：养老金主程序（AppID `wx76075ba352d5333c`）接入微信 AI 开发模式（beta）
> 最后整理：2026-07-10

## 一、红线（最高优先级，必读）
- AI 开发模式仍内测，**暂未开放代码提审**。
- **严禁**把 AI 代码合入要提审的正式版本（主程序 v2.0.4 审核中），否则影响正常发布。
- AI 代码**只能在独立分支 `ai-mode` + 体验版 / 开发版**测试；等微信开放提审再从 `ai-mode` 合入 `main`。
- 本仓库 AI 代码范围：`miniprogram/app.json` 的 `agent` + 独立分包 `ai`、`miniprogram/ai/pension-calc-skill/`、`miniprogram/AGENTS.md`、`app.js` 的 `wx.onAgentHandoff`、`result.js` 的 handoff 接收逻辑。
- 已禁用 API 清单（requestPayment / chooseLocation / scanCode 等）本程序未使用，不受影响。

## 二、分支策略
| 分支 | 用途 | 状态 |
|---|---|---|
| `main` | 正式版（v2.0.4 审核中，不含 AI） | 审核中 |
| `ai-mode` | AI 全部代码 | 本地 commit `b952ce0`，待 push 远程 |

提交记录：
- `b952ce0` 脚手架（agent + 独立分包 + 原子接口 calculatePension + 引擎整包 + 账号卡片 + handoff 接力 + 22 断言测试）

本地改完：`git commit` → `git push origin ai-mode`。**注意**：`ai-mode` 与提审线 `main` 必须物理隔离，合并前先确认微信已开放 AI 提审。

## 三、功能清单（1 个原子接口）
| 接口 | 输入 | 输出 |
|---|---|---|
| `calculatePension` | 参保地 province + 人员类型 personType + 出生年月 birthDate + 参保年月 workStartDate + 平均缴费指数 averageIndex（个人账户 personalAccount、退休方式 retirePlan 可选） | 退休时间 retireDate / 退休年龄 retireAge / 月养老金 monthlyPension / 平均指数 averageIndex |

- **人员类型解析**（`apis/_shared.js`）：`personType` 接受「企业男／企业女50／企业女55／灵活男／灵活女」中文枚举；或分字段 `gender(male/female)` + `identity(employee/flexible)` + `femaleRetireType(fw50/fw55)`。女职工默认 fw50，灵活女默认 fw55。
- **参保地解析**：支持中文省名、slug、常见别称（`resolveProvince` 经 CN2SLUG；`SKILL.md` 内附 SLUG2CN 全量映射）。
- **退休方式** `retirePlan`：`normal` 普通退休 / `early` 提前退休（影响 legal/flex 选择，结果页用 `source = isEarly && flex.total ? flex : legal` 还原）。
- 引擎：`cloudfunctions/calculate/pension-engine.js` 纯 JS 无依赖，整包打包进 `engine/`，小程序端本地计算，**不依赖云函数**。

## 四、引擎打包与数据口径
- 来源：`cloudfunctions/calculate/pension-engine.js` + `provinces/*.js`（31 省）。
- 打包：`miniprogram/ai/pension-calc-skill/engine/` = `pension-engine.js` + `provinces/*.js`（复制）+ `provinces-index.js`（**静态汇总入口**，逐一显式 `require` 31 省，导出 `getConfig(slug)=getEngineConfig()`、`SLUGS` 数组）。
- ⚠️ **分包不支持动态 `require(变量路径)`**，故必须静态汇总，新增省份须同步更新 `provinces-index.js`。
- 数据口径：沿用主程序红线条（Y 槽位存 **Y 年度官方社平**；计发基数"公布年即作用年"；2026 未发布留空引擎自动跳过）。**引擎副本是 cloudfunctions 复制件**，改源须手动重新复制同步。
- 返回值含顶层函数 `getAgeStr` / `getDateStr`，handoff 前须 `JSON.parse(JSON.stringify(...))` 剥离，否则序列化失败。

## 五、账号卡片与 handoff 接力（重点，出问题先查这里）
- 账号卡片组件：`components/result-card/index.*`（金色主题 `#8B7355`），`modelCtx.on('result', ...)` 读 `structuredContent` 渲染退休时间/年龄/月养老金。
- **handoff 结构**：原子接口返回 `handoff: () => ({ query, payload })`，`payload` 形状：
  ```js
  {
    calcResult: {
      _raw: { legal, flex, comparison, metaData },  // 引擎原样返回（已剥离函数）
      retirePlan, averageIndex, provinceName, cityLabel
    }
  }
  ```
  该形状与主程序 `step2` 写入 `wx.setStorageSync('calc_result', ...)` 的结构**完全一致**，故结果页无需特判即可复用。
- **接力接线**（带守卫，误合入主程序提审线也不炸）：
  1. `app.js` onLaunch 加 `if (typeof wx.onAgentHandoff === 'function') wx.onAgentHandoff(({pageId,path,query,payload}) => { globalData.agentHandoffs[pageId] = {path,query,payload} })`。
  2. `result.js` onLoad 开头 `try{ ... 用 this.getPageId() 取对应 handoff → wx.setStorageSync('calc_result', payload.calcResult) → delete ... }catch(e){}` 再走原流程。
- **诊断清单**（后续若账号卡片不接力 / 结果页空白）：
  1. 是否真的在体验版/开发版跑（AI 能力只在 Nightly + 体验版）；
  2. `app.json` 是否含 `agent.skills` + `subPackages[].root:'ai'`；
  3. `getPageId()` 返回值与 `agentHandoffs` 的 key 是否对得上（pageId 一致性）；
  4. `payload.calcResult` 是否真实存在且含 `_raw`（手测可在 AI 面板看结构化输出）；
  5. `mcp.json` 是否声明 `_meta.ui.pagePath:'/pages/result/result'`；
  6. 改 `SKILL.md` / `mcp.json` 后是否**重新上传体验版**。

## 六、本地测试入口
- 工具：**微信开发者工具 Nightly 版**（稳定版无 AI 能力）。
- 入口：顶部「编译模式」下拉 → **「小程序 AI 编译」** + 调试基础库 **3.16.2** → AI 调试面板（单步调试 SKILL / 原子接口，手动填参）。
- 若下拉无此选项：确认公众平台已开通 AI 开发模式（主程序**申请审核中**，通过后才出现）；重登/重开窗口重试。

## 七、真机终验流程 + 上线 Checklist（审核通过后执行）
> ⚠️ 当前主程序 AI 申请仍在审核，以下流程待审核通过再跑。

1. [ ] 公众平台确认主程序 AI 开发模式已开通（审核通过）。
2. [ ] 切换 `ai-mode` 分支，`git pull` 确保与远程一致。
3. [ ] Nightly 打开主程序，顶部「编译模式」→「小程序 AI 编译」+基础库 3.16.2，本地单步跑 `calculatePension` 验证金额与样例（吉林企业男 1975-02 / 1998-07 / 指数1.0 → 退休 2037-09 / 62岁7个月 / 月 6906.5）一致。
4. [ ] Nightly 点「上传」→ 版本号 `2.0.x-ai.y` → 上传成**体验版**。
5. [ ] mp.weixin.qq.com → 版本管理 → 体验版 → 取二维码。
6. [ ] 微信 AI 对话（iOS 灰度入口）触发 skill → 点**账号卡片** → 跳 `/pages/result/result`。
7. [ ] 检查：handoff 接力成功（结果页正常显示退休时间/年龄/月养老金）。
8. [ ] 回归主程序原有功能（首页→step1/2/3→result→report 付费）在 AI 版不受影响（因 handoff 仅 onLoad 优先读，普通流程走原 `calc_result`）。
9. [ ] 通过后：等微信开放 AI 提审，再从 `ai-mode` 合入 `main` 发布；提审前确保 `app.json` 的 `agent` 字段配置符合最新审核要求。
10. [ ] ⚠️ 改 `SKILL.md` / `mcp.json` 后须**重新上传体验版**才生效。

## 八、自动化测试
- `scripts/_test_ai_pension.js`（node 直跑，不依赖 wx）：**22 断言全过**。
- 覆盖：省份识别、人员类型解析、引擎调用、handoff 结构、JSON 安全（函数剥离）、异常分支（缺省/非法入参）、**31 省冒烟**（均算出正数养老金）。
- 跑法：`node scripts/_test_ai_pension.js`。

## 九、关键文件
- SKILL：`miniprogram/ai/pension-calc-skill/` 下 `SKILL.md` / `mcp.json` / `index.js` / `apis/`(calculatePension.js, _shared.js) / `engine/` / `components/result-card/`
- 全局指引：`miniprogram/AGENTS.md`
- 接线存量：`miniprogram/app.json`(agent+分包) / `miniprogram/app.js`(onAgentHandoff) / `miniprogram/pages/result/result.js`(handoff 接收)
- 引擎源：`cloudfunctions/calculate/pension-engine.js` + `provinces/*.js`（同步到 ai 副本 `engine/`）

## 十、当前状态 & 待办
- ✅ 1 接口 + 引擎整包 + 账号卡片 + handoff 接力 + 22 断言，已 commit `b952ce0`（ai-mode，本地领先远程）。
- ⏳ 主程序 AI 申请**审核中**（截至 2026-07-10 未通过），通过后才出现 AI 编译入口。
- ⏳ 真机 C 端账号卡片终验（待申请通过 + 上传体验版）。
- ⏳ 等微信开放 AI 模式代码提审，再从 `ai-mode` 合入 `main` 发布。

## 十一、官方文档
- 指南 `https://developers.weixin.qq.com/miniprogram/dev/ai/guide`
- 接入 `https://developers.weixin.qq.com/miniprogram/dev/ai/integration.html`
- 调试 `https://developers.weixin.qq.com/miniprogram/dev/ai/debugging`
- 最佳实践 `https://developers.weixin.qq.com/miniprogram/dev/ai/best-practices`
- Demo `https://github.com/wechat-miniprogram/ai-mode-demo`
