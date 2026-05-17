# 养老金计算平台 - 开发上下文卡片 v2.0

> 更新时间：2026-05-17 08:00 (北京时间)
> 来源会话：养老金计算平台主开发会话（续）

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
- 基于国办发〔2025〕5号延迟退休政策，支持弹性提前退休

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

## 当前项目状态（2026-05-17 实际状态）

### ✅ 已完成

| 模块 | 状态 | 说明 |
|------|------|------|
| 计算引擎 | ✅ 41/41 通过 | `engine/pension-engine.js`，含 `calculate/getDelayResult/getRetireDate` 等 |
| 浏览器引擎 | ✅ 369行 | `website/js/pension-engine-browser.js`，方法齐全 |
| 省份配置 | ✅ 32省 | 含吉林/辽宁/黑龙江/山东/河南/河北/江苏 + 25个其他省 |
| 小程序端 | ✅ 5页 | index/pension/result/contribution/retire-age |
| 网页端 | ⚠️ 部分完成 | index/pension/retire-age（retire-age 缺引擎引用，需修复）|
| 测试验证 | ✅ 74项通过 | 引擎41 + 交叉验证33，全部通过 |
| Git历史 | ✅ 9次提交 | 含初始提交+各省配置+前端优化+报告导出 |
| 省份同步 | ⚠️ 8/32 | 网页端只同步了8省，还剩24省未同步 |

### ❌ 待修复（P0）

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 修复 retire-age.html | 🔴 P0 | 缺少 `<script src="js/pension-engine-browser.js">`，页面无法计算 |
| 同步省份配置到网页端 | 🔴 P0 | 24省未同步：`website/js/provinces/` 只有8个 |
| 部署 GitHub Pages | 🔴 P0 | 网页端无法对外服务 |
| pension-engine.min.js 空壳 | 🟡 P1 | 只有8行空壳，不影响当前使用（pension.html 引的是 browser.js）|

---

## 核心文件结构

```
养老金计算平台/
├── engine/
│   └── pension-engine.js          # 统一计算引擎（核心，991行）
├── provinces/                     # 省份配置文件（32个）
│   ├── jilin.json                 # 吉林（完整）
│   ├── liaoning.json              # 辽宁
│   ├── heilongjiang.json          # 黑龙江
│   ├── guangdong.json            # 广东
│   ├── shandong.json              # 山东
│   ├── beijing.json               # 北京
│   ├── shanghai.json              # 上海
│   └── ... (共32个)
├── tests/                         # 测试文件
│   ├── test-engine.js             # 41项核心测试
│   ├── cross-validate.js          # 33项交叉验证
│   └── test_*.js                 # 各省专项测试
├── miniprogram/                   # 微信小程序端
│   ├── app.js / app.json
│   └── pages/
│       ├── index/                 # 首页
│       ├── pension/               # 养老金测算
│       ├── result/                # 结果展示
│       ├── retire-age/            # 退休年龄查询
│       └── contribution/          # 缴费指数测算
├── website/                       # 网页端（静态部署）
│   ├── index.html                 # 首页
│   ├── pension.html               # 养老金测算页
│   ├── retire-age.html            # 退休年龄页（⚠️ 需修复）
│   ├── css/style.css              # 全局样式
│   └── js/
│       ├── app.js                 # 网页端逻辑
│       ├── pension-engine-browser.js # 浏览器版引擎（369行，正常）
│       ├── pension-engine.min.js   # ⚠️ 空壳（8行）
│       └── provinces/             # ⚠️ 只同步了8省
├── PRD.md                         # 产品需求文档 v3.0
├── README.md                      # 项目说明
└── package.json                   # Node.js依赖
```

---

## 关键业务逻辑

### 计算引擎核心函数

```javascript
// 核心计算入口
engine.calculate(config, inputData) → result

// 退休年龄查询
engine.getDelayResult(birthYear, birthMonth, gender) → result
// 返回：{ originalAge, originalAgeStr, delayMonths, newAge, newAgeStr, retireDate }

// 返回结构
result = {
  legal: {
    date: {year, month},
    ageYears, ageM, totalYears,
    baseRetire, baseProv,
    personalAccount: { amount, balance, description },
    pension: {
      basicPension, extraPension,
      personalAccount, transitionalPension, specialAddition
    }
  },
  standardRetire: { date: {year, month}, total },
  flex: { date: {year, month}, total, monthsAhead },
  total: number
}
```

### 输入数据结构

```javascript
const input = {
  gender: 'male' | 'female',
  birthYear: number,
  birthMonth: number,
  workYear: number,
  workMonth: number,
  avgIndex: number,        // 平均缴费指数
  cityType: 'cc' | 'prov' | 'sy' | 'dl' | 'nj',
  sightYears: number,       // 视同缴费年限
  retireType: 'standard' | 'flex'
}
```

---

## 已验证测试案例（吉林）

| 案例 | 参数 | 月领养老金 |
|------|------|-----------|
| 男职工(1970.6) | 41.67年, 指数1.0, 2031年退休 | 8,905.92元 |
| 女灵活就业(1973.3) | 24.75年, 指数0.6, 2023年退休 | 7,373.55元 |
| 女老职工(1962.1) | 31.75年, 指数0.8, 12年视同 | 2,942.83元 |

---

## 网页端省份同步状态（2026-05-17）

**已同步（8省）：**
jilin, liaoning, heilongjiang, shandong, henan, hebei, jiangsu, 吉林省

**未同步（24省）：**
anhui, beijing, chongqing, fujian, gansu, guangdong, guangxi, guizhou, hainan, hubei, hunan, jiangxi, neimenggu, ningxia, qinghai, shaanxi, shanghai, shanxi, sichuan, tianjin, xinjiang, xizang, yunnan, zhejiang

---

## UI设计规范

### 配色方案
- 导航栏背景：`#1e3a5f`
- 按钮主色：`#2563eb`
- 背景色：`#f8f9fa`
- 卡片背景：`#ffffff`
- 成功色：`#10b981`
- 文字主色：`#1f2937`
- 文字次色：`#6b7280`

### 字体/间距
- 字体：PingFang SC / San Francisco
- 卡片圆角：16px / 按钮圆角：10px
- 阴影：`0 2px 8px rgba(0,0,0,0.06)`
- 内边距：16px / 字号：12px / 14px / 17px / 24px

---

## 部署准备

### GitHub Pages
1. 创建GitHub仓库
2. 推送代码：`git push -u origin main`
3. 启用Pages：Settings → Pages → Source: main branch
4. 访问：`https://<username>.github.io/<repo>/`

### 微信小程序
1. 下载微信开发者工具
2. 导入 `miniprogram/` 目录
3. 配置AppID → 真机调试 → 上传版本

---

## 下一步行动（2026-05-17）

| 序号 | 行动 | 状态 |
|------|------|------|
| 1 | 修复 retire-age.html（加引擎引用）| 🔴 待做 |
| 2 | 同步24省配置到 website/js/provinces/ | 🔴 待做 |
| 3 | 部署 GitHub Pages | 🔴 待做 |
| 4 | 端到端测试 | 🔴 待做 |
| 5 | 更新 CONTEXT-CARD.md | ✅ 本文件 |

---

## 关键技术约束

1. **PowerShell语法**：多命令用`;`而非`&&`
2. **路径编码**：中文路径避免特殊字符
3. **引擎测试**：exit code 可能为1（Windows编码问题），看输出不看出错码
4. **getBase回退**：城市无数据时自动回退prov基数
5. **记账利率**：2016年前统一按0.025，2016年后按实际
6. **延迟退休**：国办发〔2025〕5号，男/女干部/灵活就业女三类
7. **计发月数**：50岁195月、55岁170月、60岁139月、65岁101月、70岁56月
8. **retire-age.html 必须引用** `pension-engine-browser.js`（目前缺失，页面坏）

---

## PM指令记录

- 用户要求：**"你是PM，我要结果，你决策。串行执行，做完一样再问下一样。"**
- 执行模式：AI担任PM角色，结果导向，串行推进
- 上线策略：先上吉林，验证稳定后逐省测试上线
- 七步任务（2026-05-17）：更新信息 → 修复 → 案例验证 → 同步省份 → 部署GitHub → 更新信息 → 测试

---

*本文件由 AI PM 在任务重启后重新评估项目状态并生成，替代过时的 CONTEXT-CARD.md*
