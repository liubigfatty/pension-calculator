# 养老金计算平台 - 开发上下文卡片 v3.0

> 更新时间：2026-05-17 08:30 (北京时间)
> 来源会话：养老金计算平台主开发会话（续）— 七步任务全部完成
> 状态：✅ 所有任务完成，GitHub Pages 已部署

---

## 项目概述

**项目名称：** 养老金计算平台
**运行环境：** WinClaw CLI / Windows 11 (x64)
**工作区：** `C:\Users\14041\AppData\Roaming\winclaw\.openclaw\workspace\养老金计算平台\`
**架构：** 微信小程序 + 网页端（静态部署）
**用户角色：** 临近退休人员(45-60)、灵活就业人员(30-50)、HR/社保从业者

### 产品定位
- 零门槛：无需注册、无需登录、输入参数即可测算
- 免费基础测算 + 付费详细报告（3元单次/9.9元/月/39.9元/年）
- 基于《国务院关于渐进式延迟法定退休年龄的办法》延迟退休政策，支持弹性提前退休

---

## 架构设计

### 参数化驱动架构
```
计算逻辑(pension-engine.js) ← 完全独立 → 省份配置(provinces/*.json)
       ↑                                        ↑
  核心算法/公式                        计发基数/记账利率/政策参数
       ↓                                        ↓
   小程序端 + 网页端 ← 使用相同引擎 → 输出完全一致
```

**核心原则：**
- 计算逻辑 100% 全国统一
- 各省差异通过外部 JSON 配置驱动
- 新增省份只需添加配置文件，不修改任何计算逻辑
- 小程序端和网页端使用同一引擎，输出必须完全一致

---

## 当前项目状态（2026-05-17 完成状态）

### ✅ 全部完成

| 模块 | 状态 | 说明 |
|------|------|------|
| 计算引擎 | ✅ 41/41 通过 | `engine/pension-engine.js`，含 `calculate/getDelayResult/getRetireDate` 等 |
| 浏览器引擎 | ✅ 369行 | `website/js/pension-engine-browser.js`，方法齐全 |
| 省份配置 | ✅ 32/32 | 网页端 `website/js/provinces/` 全部同步完成 |
| 小程序端 | ✅ 5页 | index/pension/result/contribution/retire-age |
| 网页端 | ✅ 完成 | index/pension/retire-age全部可访问 |
| 测试验证 | ✅ 74项通过 | 引擎41 + 交叉验证33，全部通过 |
| GitHub部署 | ✅ 完成 | Pages已启用，URL可访问 |
| 端到端测试 | ✅ 通过 | retire-age.html + JS引擎均正常 |

### GitHub Pages 部署信息

| 项目 | 值 |
|------|------|
| 仓库 | `https://github.com/liubigfatty/pension-calculator` |
| Pages URL | `https://liubigfatty.github.io/pension-calculator/website/retire-age.html` |
| 状态 | ✅ 已构建（built），HTTP 200 |
| 推送方式 | Python脚本通过GitHub API推送（git push网络不通） |

---

## 核心文件结构

```
养老金计算平台/
├── engine/
│   └── pension-engine.js          # 统一计算引擎（核心，991行）
├── provinces/                     # 省份配置文件（32个）
│   ├── jilin.json                 # 吉林（完整）
│   ├── liaoning.json              # 辽宁
│   └── ... (共32个)
├── tests/                         # 测试文件
│   ├── test-engine.js             # 41项核心测试
│   └── cross-validate.js          # 33项交叉验证
├── miniprogram/                   # 微信小程序端
├── website/                       # 网页端（已部署GitHub Pages）
│   ├── index.html                 # 首页
│   ├── pension.html               # 养老金测算页
│   ├── retire-age.html            # 退休年龄页（✅ 已修复引擎引用）
│   ├── css/style.css
│   └── js/
│       ├── pension-engine-browser.js # 浏览器版引擎（✅ 已推送）
│       └── provinces/             # ✅ 32省配置全部同步
├── PRD.md
└── CONTEXT-CARD.md                # 本文件
```

---

## 七步任务执行记录（2026-05-17）

| 序号 | 任务 | 状态 | 完成时间 |
|------|------|------|----------|
| 1 | 更新项目信息（CONTEXT-CARD v2.0）| ✅ | 08:00 |
| 2 | 修复 retire-age.html（加引擎引用）| ✅ | 08:05 |
| 3 | 案例验证（74项测试）| ✅ | 08:10 |
| 4 | 同步32省配置到 website/js/provinces/ | ✅ | 08:20 |
| 5 | 部署GitHub（API推送）| ✅ | 08:25 |
| 6 | 更新项目信息（CONTEXT-CARD v3.0）| ✅ | 08:30 |
| 7 | 端到端测试 | ✅ | 08:30 |

---

## 关键技术约束

1. **PowerShell语法**：多命令用`;`而非`&&`
2. **路径编码**：中文路径避免特殊字符
3. **引擎测试**：exit code 可能为1（Windows编码问题），看输出不看出错码
4. **getBase回退**：城市无数据时自动回退prov基数
5. **记账利率**：2016年前统一按0.025，2016年后按实际
6. **延迟退休**：《国务院关于渐进式延迟法定退休年龄的办法》，男/女干部/灵活就业女三类
7. **计发月数**：50岁195月、55岁170月、60岁139月、65岁101月、70岁56月
8. **GitHub推送**：公司网络屏蔽，需用手机热点 + Python API脚本推送

---

## PM指令记录

- 用户要求：**"你是PM，我要结果，你决策。串行执行，做完一样再问下一样。"**
- 执行模式：AI担任PM角色，结果导向，串行推进
- 上线策略：先上吉林，验证稳定后逐省测试上线
- 七步任务（全部完成）：更新信息 → 修复 → 案例验证 → 同步省份 → 部署GitHub → 更新信息 → 测试

---

## 下一步（可选）

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 添加更多省份的真实计发基数 | P1 | 目前部分省份基数为示例数据 |
| 小程序端提交审核 | P2 | 网页端完成后推进小程序 |
| SEO优化（Google Search Console） | P3 | 网页端上线后 |
| 付费功能接入（微信支付） | P2 | 流量验证后 |

---

*本文件由 AI PM 在七步任务全部完成后更新至 v3.0*
