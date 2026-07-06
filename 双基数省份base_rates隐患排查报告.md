# 双基数 / 三基数省份 base_rates 隐患排查与修复报告

生成时间：2026-07-07
关联问题：吉林此前因 `getEngineConfig()` 内重复 `base_rates` key 导致基础养老金=0，双基数/三基数省份是否也存在同类问题？

---

## 一、结论先行

- **当前没有任何省份出现「基础养老金=0」的线上故障**（吉林已修复，其余双基数省份因 key 顺序相反而结果正确）。
- 但 **广东、河南、辽宁** 的 `getEngineConfig()` 里确实存在与吉林**完全同根**的脆弱写法（重复 `base_rates` key）。吉林当初是「嵌套在前、扁平在后」→ 扁平覆盖 → 出错；这三个省是「扁平在前、嵌套在后」→ 嵌套覆盖 → 当前侥幸正确。
- 已主动修复这三个文件，**运行时计算结果完全不变、零回归**。

---

## 二、双基数 / 三基数省份清单

`base_rates` 中包含「省会城市单列计发基数」的省份（即多基数省份）：

| 省份 | base_rates 子键 | 单列城市 |
|------|----------------|----------|
| 广东 | prov + shenzhen | 深圳 |
| 河南 | prov + zhengzhou | 郑州 |
| 吉林 | prov + cc + 长春 + changchun | 长春 |
| 辽宁 | prov + 沈阳 + 大连 + shenyang + dalian | 沈阳、大连 |

其余 27 省为单基数（`prov` 一个子键）。

---

## 三、根因分析（与吉林同根）

吉林当初的 bug：

```js
return {
  base_rates: { prov: PROV_BASE, cc: CC_BASE }, // 嵌套（正确结构）
  ...
  base_rates: PROV_BASE,                         // 扁平（重复 key，在后 → 覆盖）
}
```

JavaScript 对象字面量中**重复 key 后者覆盖前者**，于是 `base_rates` 最终变成扁平的 `PROV_BASE`，引擎读 `base_rates.prov` 得到 `undefined` → 基础养老金算不出（=0）。

广东/河南/辽宁的写法是同一个根因、但顺序相反：

```js
return {
  ...
  base_rates: PROV_BASE,                         // 扁平（重复 key，在前）
  ...
  base_rates: { prov: PROV_BASE, shenzhen: SHENZHEN_BASE }, // 嵌套（在后 → 覆盖，侥幸正确）
}
```

嵌套恰好胜出，所以**当前计算结果是对的**——但只要哪天有人按「修吉林」的直觉去删重复 key 时删错一个，或调整顺序，就会立刻复现吉林的故障。

---

## 四、两份配置架构（关键背景）

| 用途 | 路径 | 格式 |
|------|------|------|
| 线上云函数 | `cloudfunctions/calculate/provinces/*.js` | JS，`getEngineConfig()` |
| 本地验证 verify.js | `ROOT/provinces/*.json` | JSON，cases 目录读案例 |

两份**相互独立**：改 JS 不影响 verify，改 JSON 不影响线上。

经检测，`ROOT/provinces/*.json` 那份**是干净的**——广东/河南/辽宁/吉林的 `base_rates` 都只出现 1 次、且为正确的嵌套结构。因此 **verify 的 172/172 是可信的，确实覆盖了双基数省份**，本次隐患只存在于「线上云函数用的 JS 那份」。

---

## 五、修复内容

删除 `guangdong.js` / `henan.js` / `liaoning.js` 三个文件 `getEngineConfig()` 中多余的扁平行：

```diff
-      base_rates: PROV_BASE,
       account_start: ACCOUNT_START,
```

嵌套 `base_rates: { prov: ..., 省会: ... }` 完整保留，运行时 `getEngineConfig().base_rates` 的值**完全等价**（原本就是嵌套覆盖扁平，删掉被覆盖的扁平 key 不影响结果）。

---

## 六、验证结果

- 修复后重新扫描 31 省：`base_rates` 全部为 `NESTED`，省会子基数（shenzhen / zhengzhou / 沈阳·大连 / cc）完整保留。
- `git diff`：三个文件各**仅删除一行**，无任何结构改动。
- 逻辑保证：删除的是「被覆盖的重复 key」，对象最终值与修复前逐字节相同 → 计算零回归。

---

## 七、遗留隐患（建议后续专项处理）

`guangdong.js` / `henan.js` 的 `getEngineConfig()` 内 `avg_salary_history` **也重复写了两次**：

```js
return {
  avg_salary_history: { 1994-2024 大字面量（"缴费基数"） },  // 第一次
  ...
  avg_salary_history: AVG_SALARY_HISTORY,                   // 第二次（覆盖第一次）
}
```

同样是脆弱写法：第一个大字面量（含 2020:91764 等元/年值）实际是死代码，被 `AVG_SALARY_HISTORY` 覆盖。若未来误删覆盖关系会引入数据错误。该问题涉及「缴费指数数据」与「个人账户社平工资数据」的语义区分，建议单独核查后再清理，本次未动。

---

## 八、下一步

1. 重新上传 `cloudfunctions/calculate` 云函数，使本次修复生效。
2. 真机 / 预览模式下验证双基数省份（深圳、郑州、沈阳、大连）基础养老金正常、不再依赖脆弱写法。
3. 择期专项处理 `avg_salary_history` 重复 key 隐患。
