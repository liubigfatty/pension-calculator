# PROJECT-MAP · 养老金项目地图（先读这一页，避免重新定位）

> 本文件随 git 仓库走，是**唯一权威导航**。任何新会话第一步先读它。
> 最后更新：2026-07-17

---

## 0. 真实路径（每次被 junction 坑的根源）

- **仓库真实路径**：`C:\Users\14041\AppData\Roaming\winclaw\.openclaw\workspace\养老金计算平台\`
- winclaw workspace 是 **junction 空壳**：Bash 默认 cwd 看不到真实文件（ls 只见少量文件、git 不识别）。
  操作一律用**上面的绝对真实路径 + `dangerouslyDisableSandbox:true`**。
- GitHub：`git@github.com:liubigfatty/pension-calculator.git`（SSH；原 HTTPS URL 含明文 PAT 已弃用）。
- 分支：`main`（提审/发布，无 AI）｜`ai-mode`（含 AI，体验版专用）。当前 main HEAD = `fcc28be`。

## 1. 4 个产品（一源多端，勿物理拆库）

| # | 产品 | 目录 | AppID / 云环境 | 后端 | 线上版本 |
|---|---|---|---|---|---|
| ① | 养老金计算引擎（小程序）| `miniprogram/` + `cloudfunctions/` | wx76075ba352d5333c ／ cyz0813-d0go10t7vfbe3bc47 | 云函数 calculate 等5个 | v2.1.3（提审中）|
| ② | 缴费指数计算器（小程序）| `index-mini/` | wxc226d43e4cfc62e3 ／ pension-calculato-d8dhrr613b49c3 | 云函数 calcIndex | v2.1.4（提审中）|
| ③ | 养老金计算（网页）| `web/` | GitHub Pages | 无（数据内联）| 随①|
| ④ | 缴费指数（网页）| `web-index/` | GitHub Pages | 无（数据内联）| 随②|

主程序小程序项目根 = 仓库根（`miniprogramRoot=miniprogram/`，`cloudfunctionRoot=cloudfunctions/`）。

## 2. 唯一真相源 + 同步链（改数据只动这两处）

- 引擎真相源：`engine/pension-engine.js`
- 省份数据真相源：`cloudfunctions/calculate/provinces/*.js`
- 改完必须跑同步链（否则不生效）：
  1. `node scripts/sync-provinces.js` → 派发 4 处 .json 镜像：根 `provinces/`、`cloudfunctions/calculate/provinces/`、`docs/js/`、`docs/网页版/`（旧文档的 data/、js/ 两目录实际不存在，已废弃，详见脚本注释）
  2. `node scripts/build-web.js` → 再生 `web/engine.js` + `web/provinces-bundle.js`
  3. `node scripts/_gen_province_data.js` → 再生 `index-mini/cloudfunctions/calcIndex/provinces-data.js`
     （已含未发布年份 2025/2026 外推，勿手改此文件）
  4. 若在 ai-mode，另同步 `miniprogram/ai/...` 与 `index-mini/ai/...`
- 验证：`node run-cases.js`（应 169/169）+ `node tests/test_henan.js`（14/14）+ `node verify-index-mini.js`

## 3. 发布快照归档（每次提审后单独存一份）

- 位置：`C:\Users\14041\养老金发布归档\`（独立于仓库，按产品+版本）
- 索引与"新增快照/恢复"操作见该目录 `README.md`
- 已存：4 产品 2026-07-17 首批快照（①③=v2.1.3，②④=v2.1.4）

## 4. 资料与文章

| 类别 | 位置 |
|---|---|
| 项目文档手册 | 仓库内 `docs/`（00 管理手册～08 缴费指数）|
| 原则与实现总纲 | `docs/00-项目管理手册/项目手册-原则与实现.md` |
| 河南篇文章（已发）| `C:\Users\14041\WorkBuddy\2026-07-15-07-46-17\articles\` |
| 其他公众号文章 | 仓库内 `公众号文章/` |
| 案例库 | 仓库内 `cases/`（163 个 json）|
| 冷备份（勿动）| `C:\Users\14041\WorkBuddy\_pension_archive_20260712\`、`_pre_reorg_backup_20260712\` |

## 5. 记忆文件

- 长期：`.workbuddy/memory/MEMORY.md`
- 每日：`.workbuddy/memory/YYYY-MM-DD.md`

## 6. 31 省社平系列文章进度

已发：黑龙江、吉林、辽宁、河北、河南、湖北、湖南 → **下一篇=山西（MD已出待确认）**。
