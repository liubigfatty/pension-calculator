# 国家企业职工基本养老金测算平台

> 基于国办发〔2025〕5号《全国人民代表大会常务委员会关于实施渐进式延迟法定退休年龄的决定》

## 项目概述

养老金测算平台为Nation企业职工提供权威、准确的养老金测算服务。采用参数化驱动架构，确保不同平台（小程序/网页）计算结果完全一致。

## 核心特性

- ✅ **零门槛** — 无需注册，无需填报个人身份信息
- ✅ **权威准确** — 国办发〔2025〕5号政策，数据权威
- ✅ **覆盖全面** — 支持全国各省份，含特殊增发政策
- ✅ **多端一致** — 小程序与网页端计算引擎统一
- ✅ **隐私保护** — 所有数据本地计算，不上传服务器

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    前端展示层                              │
│  ┌──────────────────┐    ┌──────────────────┐           │
│  │  微信小程序       │    │  GitHub Pages 网页 │           │
│  └────────┬─────────┘    └────────┬─────────┘           │
│           │                       │                      │
├───────────┼───────────────────────┼──────────────────────┤
│           │  统一 JSON 参数       │                      │
│           ▼                       ▼                      │
│  ┌──────────────────────────────────────────┐           │
│  │     engine/pension-engine.js (统一计算引擎·唯一真相源) │           │
│  └──────────────────┬───────────────────────┘           │
│                     │                                    │
├─────────────────────┼────────────────────────────────────┤
│                     ▼                                    │
│  ┌──────────────────────────────────────────┐           │
│  │  cloudfunctions/calculate/provinces/       │           │
│  │  (省份配置·唯一真相源：.js 为加载源, .json 为镜像) │
│  │  ├── heilongjiang.js  ← 改数据只动这里     │           │
│  │  └── heilongjiang.json (镜像, 须同步)     │           │
│  └──────────────────────────────────────────┘           │
│  ⚠️ 其余 provinces 副本/快照已归档至 archive/，禁止手改 │
└─────────────────────────────────────────────────────────┘
```

## 快速开始

### 小程序端
1. 使用微信开发者工具打开 `miniprogram/` 目录
2. 点击编译即可运行
3. 支持真机调试和预览

### 网页端
```bash
# 本地运行
cd website
python -m http.server 8080
# 访问 http://localhost:8080

# GitHub Pages 部署
# 1. 在GitHub创建仓库（如 pension-calculator）
# 2. 推送代码
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
# 3. Settings → Pages → Source: main branch → / (root)
```

## 功能模块

### 1. 基本养老金测算
计算四部分养老金：
- 基础养老金
- 增发基础养老金（部分省份）
- 个人账户养老金
- 过渡性养老金

支持弹性提前退休对比，展示不同退休时间点的养老金差异。

### 2. 缴费水平测算
计算平均缴费工资指数和个人账户累计储存额，帮助用户了解缴费水平对养老金的影响。

### 3. 法定退休年龄查询
根据出生年月和性别，查询渐进式延迟法定退休年龄政策下的新退休年龄和退休日期。

## 技术栈

- **计算引擎**: 原生 JavaScript (pension-engine.js)
- **小程序**: 微信小程序原生框架
- **网页**: 纯 HTML/CSS/JavaScript
- **部署**: GitHub Pages (网页端), 微信开发者工具 (小程序端)

## 开发指南

### 新增省份配置

1. 复制 `cloudfunctions/calculate/provinces/jilin.js`(+`.json` 镜像) 为 `{new_province}.js/.json`
2. 修改配置中的省份名称、基数数据、记账利率等（保持注释/文号，2026 未公布不写值）
3. 在 `engine/pension-engine.js` 中注册新省份（如需要）
4. 更新 `PRD.md` 中的省份覆盖列表

### 测试

```bash
# 运行单元测试
cd tests
node test-engine.js

# 运行省份配置验证
node test_{province}.js
```

## 项目结构

```
养老金计算平台/  (git: pension-calculator; 分支 main / ai-mode / gh-pages)
├── engine/
│   └── pension-engine.js       # ★ 计算引擎唯一真相源 (run-cases 用)
├── cloudfunctions/
│   └── calculate/
│       ├── pension-engine.js   # 引擎部署副本(由 engine/ 同步)
│       └── provinces/          # ★ 省份数据唯一真相源 (.js 加载 / .json 镜像, 62文件)
├── miniprogram/                # 小程序1：养老金测算
├── index-mini/                 # 小程序2：缴费指数 (+ ai/ AI能力, 仅 ai-mode 分支)
├── web/                        # GitHub 网站 (对应 gh-pages 分支, 引擎+省份打包)
├── cases/                      # 案例库 (验证 expected 来源)
├── scripts/                    # 工具脚本 (run-cases.js 为验证入口)
├── docs/                       # 文档/手册 (00-项目管理手册/项目手册-原则与实现.md 为权威口径)
├── data/                       # 公共数据/政策原始材料
├── research/  src/  tests/  reports/  css/  assets/
├── archive/                    # 归档区(gitignore): 过期副本/散落脚本/会话备份, 禁止当活代码
└── 根: README/PRD/STATUS/CHANGELOG/VERSION/项目配置/各类报告.md
⚠️ 唯一真相源只有 engine/pension-engine.js 与 cloudfunctions/calculate/provinces/；
   其余 provinces 副本 / 前端快照 / 旧站 均已归档或自动生成，禁止手改。
```

## 政策依据

- 《全国人民代表大会常务委员会关于实施渐进式延迟法定退休年龄的决定》
- 国办发〔2025〕5号
- 各省份养老保险实施办法

## 免责声明

本测算结果仅供参考，实际养老金以社保部门核定为准。平台不对测算结果的准确性、完整性做任何保证。

## 许可证

MIT License
