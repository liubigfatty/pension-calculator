# index-mini 微信 AI 开发模式 · 开发归档与 Checklist

> 分支：`ai-mode`（已推远程 `origin/ai-mode`）
> 适用：index-mini 缴费指数小程序接入微信 AI 开发模式（beta）
> 最后整理：2026-07-10

## 一、红线（最高优先级，必读）
- AI 开发模式仍内测，**暂未开放代码提审**。
- **严禁**把 AI 代码（app.json 的 `agent` / `lazyCodeLoading` / 独立分包 `ai`、SKILL 分包 `ai/pension-index-skill`）合入要提审的正式版本，否则影响正常发布。
- AI 代码**只能在独立分支 `ai-mode` + 体验版 / 开发版**测试；等微信开放提审再从 `ai-mode` 合入。
- 已禁用 API 清单（requestPayment / chooseLocation / scanCode 等）本项目纯计算均未使用，不受影响。

## 二、分支策略
| 分支 | 用途 | 状态 |
|---|---|---|
| `main` | 正式版（v2.0，不含 AI） | 已发布 |
| `ai-mode` | AI 全部代码 | 已推远程，体验版/开发版专用 |

提交记录：
- `5e47b5a` 脚手架（app.json agent + SKILL 结构）
- `b2c3601` 账号卡片 handoff 适配（2026-07-03 官方更新）
- `3a82ae9` 三种倒推模式原子接口
- `7b96e60` few-shot 示例 + mcp.json description 优化

本地改完：`git commit` → `git push origin ai-mode`。

## 三、功能清单（4 个原子接口）
| 接口 | 输入（含 province+首缴年月+月数） | 反推/输出 |
|---|---|---|
| `calculatePensionIndex` | 逐年基数 yearlyData | 正向：avgIndex + 余额 + 年限 |
| `reverseIndexByBalance` | + knownBalance 账户余额 | 反推平均指数 |
| `reverseYearlyByCurrentBase` | + currentBase 当前月基数 | 反推历年基数+指数+余额 |
| `reverseYearlyByTargetIndex` | + targetIndex 目标指数 | 反推每年应缴基数 |

- 引擎：calcIndex.js 纯 JS 无依赖，打包进 SKILL `engine/`，本地计算。
- 三种倒推统一用**当年社平口径**；结果均为「假设历年按统一比例缴费」估算，结果页 `_meta.reverseMode` 标注「本结果为【反推】…」。

## 四、本地测试入口
- 工具：**微信开发者工具 Nightly 版**（稳定版无 AI 能力）。
- 入口：顶部「编译模式」下拉 → **「小程序 AI 编译」** + 调试基础库 **3.16.2** → AI 调试面板（单步调试 SKILL / 原子接口，手动填参）。
- 若下拉无此选项：确认公众平台已开通开发模式（2026-06-10 通过），重登 / 重开窗口重试。

## 五、真机终验流程（C 端账号卡片接力）
1. Nightly 点「上传」→ 版本号 `2.0.0-ai.x` → 上传成体验版。
2. mp.weixin.qq.com → 版本管理 → 体验版 → 取二维码。
3. 微信 AI 对话（iOS 8.0.74+ 灰度入口）触发 skill → 点**账号卡片** → 跳 `/pages/result/result`。
4. 检查：handoff 接力成功 + 结果页顶部显示反推标注。
5. ⚠️ 改 SKILL.md / mcp.json 后需**重新上传体验版**才生效。

## 六、测试方案
- 手测：见同目录 [`倒推模式测试方案.md`](./倒推模式测试方案.md)（三组互证 JSON + 预期值 + 边界用例）。
- 自动化：`scripts/_test_reverse_ai.js`（20 断言全过，含正向回归 + 吉林金标准）。

## 七、关键文件
- SKILL：`index-mini/ai/pension-index-skill/` 下 `SKILL.md` / `mcp.json` / `index.js` / `apis/` / `engine/`
- 结果页：`index-mini/pages/result/result.js`（`_meta.reverseMode` 反推标注）、`result.wxml`
- 引擎源：`index-engine/calcIndex.js`（同步到 ai 副本 `engine/calcIndex.js`）

## 八、当前状态 & 待办
- ✅ 4 接口 + handoff + few-shot 示例，已推远程 `ai-mode`。
- ⏳ 真机 C 端账号卡片终验（用户暂无 iOS 测试环境，待验）。
- ⏳ 等微信开放 AI 模式代码提审，再从 `ai-mode` 合入正式版。

## 九、官方文档
- 指南 `https://developers.weixin.qq.com/miniprogram/dev/ai/guide`
- 接入 `https://developers.weixin.qq.com/miniprogram/dev/ai/integration.html`
- 调试 `https://developers.weixin.qq.com/miniprogram/dev/ai/debugging`
- 最佳实践 `https://developers.weixin.qq.com/miniprogram/dev/ai/best-practices`
- Demo `https://github.com/wechat-miniprogram/ai-mode-demo`
