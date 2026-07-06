# DESIGN.md — 养老金计算平台（桌面网页版）

> 品牌：正元 | 色号：#8B7355 | 风格参考：Stripe + Vercel 的简洁专业 + Apple 的排版

---

## 1. Visual Theme & Atmosphere

**设计哲学**: 专业可信、沉稳温暖、数据清晰。面向演示/直播场景，视觉上传递"官方工具"般的信赖感，同时通过金色暖调保持人文温度。

**核心关键词**: 专业可靠 · 沉稳温暖 · 数据驱动 · 宽敞通透 · 微质感

**光影质感**: 微阴影层级（非毛玻璃），卡片有细微的3D层次，背景用暖灰白渐变模拟纸张质感。

---

## 2. Color Palette & Roles

```css
--color-primary: #8B7355;           /* 正元金 - 品牌主色 */
--color-primary-dark: #6D5A42;      /* 正元深金 - hover/active */
--color-primary-light: #B8977D;     /* 正元亮金 - 强调元素 */
--color-primary-bg: #FEF0D6;        /* 金色底 - 提示背景 */

--color-accent: #005F6B;            /* Teal - 数据高亮/链接 */
--color-accent-light: #E8F4F5;      /* Teal底 */

--color-text-primary: #1A1A1A;      /* 主文字 */
--color-text-secondary: #6C584B;     /* 次文字 - 暖棕 */
--color-text-hint: #A0988E;         /* 提示文字 */
--color-text-white: #FFFFFF;

--color-bg-page: #F7F5F2;           /* 页面底 - 暖白 */
--color-bg-card: #FFFFFF;            /* 卡片底 */
--color-bg-sidebar: #F0EDE8;        /* 侧栏底 */
--color-bg-input: #FAF8F5;          /* 输入框底 */
--color-bg-hover: #F0ECE6;          /* hover 态底 */

--color-border: #E0D8CC;            /* 边框 */
--color-border-focus: #8B7355;      /* 聚焦边框 */

--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;

--shadow-sm: 0 1px 3px rgba(30,25,20,0.08);
--shadow-md: 0 4px 12px rgba(30,25,20,0.10);
--shadow-lg: 0 8px 30px rgba(30,25,20,0.12);
--shadow-xl: 0 20px 60px rgba(30,25,20,0.15);
--shadow-primary: 0 4px 20px rgba(139,115,85,0.25);
```

---

## 3. Typography Rules

```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| display | 48px | 700 | 1.15 | -0.02em | 页面大标题/金额数字 |
| heading-1 | 32px | 600 | 1.25 | -0.01em | 步骤标题 |
| heading-2 | 24px | 600 | 1.3 | 0 | 区块标题 |
| heading-3 | 18px | 600 | 1.4 | 0 | 卡片标题 |
| body | 15px | 400 | 1.6 | 0 | 正文 |
| body-sm | 13px | 400 | 1.5 | 0 | 辅助文字/标签 |
| caption | 12px | 500 | 1.4 | 0.02em | 提示/脚注 |
| amount | 56px | 700 | 1 | -0.03em | 结果页金额大数字 |

---

## 4. Component Stylings

### Buttons

| Variant | BG | Text | Border | Radius | Padding | Hover | Active |
|---------|-----|------|--------|--------|---------|-------|--------|
| Primary | linear-gradient(#8B7355→#A08566) | #fff | none | 12px | 14px 32px | opacity 0.9, translateY(-1px) | scale(0.98) |
| Secondary | #fff | #8B7355 | 1.5px solid #8B7355 | 12px | 14px 32px | bg #FEF0D6 | bg #F5E6D0 |
| Ghost | transparent | #6C584B | none | 12px | 14px 24px | bg #F0ECE6 | bg #E5DDD0 |
| Danger | #EF4444 | #fff | none | 12px | 14px 32px | opacity 0.9 | — |
| Icon | transparent | #6C584B | none | 8px | 8px | bg #F0ECE6 | — |

### Cards
```css
.card {
  background: #FFFFFF;
  border: 1px solid #E0D8CC;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(30,25,20,0.08);
  transition: box-shadow 0.2s ease;
}
.card:hover { box-shadow: 0 4px 12px rgba(30,25,20,0.10); }
```

### Inputs
```css
.input {
  background: #FAF8F5;
  border: 1.5px solid #E0D8CC;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  color: #1A1A1A;
  transition: all 0.2s ease;
  width: 100%;
}
.input:focus {
  border-color: #8B7355;
  box-shadow: 0 0 0 3px rgba(139,115,85,0.12);
  background: #FFFFFF;
  outline: none;
}
.input::placeholder { color: #A0988E; }
```

### Select / Picker
```css
.select-box {
  background: #FAF8F5;
  border: 1.5px solid #E0D8CC;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.select-box:hover { border-color: #B8977D; }
.select-box.active { border-color: #8B7355; background: #fff; }
```

### Result Amount Card
```css
.result-card {
  background: linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  color: #fff;
}
.result-amount {
  font-size: 56px;
  font-weight: 700;
  color: #B8977D;
  letter-spacing: -0.03em;
}
```

---

## 5. Layout Principles

**间距基数**: 8px

| Token | Value | Usage |
|-------|-------|-------|
| space-xs | 4px | 图标与文字间距 |
| space-sm | 8px | 紧凑元素间距 |
| space-md | 16px | 表单组内间距 |
| space-lg | 24px | 卡片内间距/元素间距 |
| space-xl | 32px | 区块间距 |
| space-xxl | 48px | 大区块间距 |
| space-xxxl | 64px | 页面边缘间距 |

**Grid**: 12列网格，间距24px，最大内容宽度1200px

**布局结构**:
- 桌面端：左侧280px固定侧栏 + 右侧内容区
- 内容区单栏布局，max-width 680px 居中
- 底部操作栏固定（上一步/下一步/计算）

---

## 6. Depth & Elevation

```css
--shadow-xs: 0 1px 2px rgba(30,25,20,0.05);
--shadow-sm: 0 1px 3px rgba(30,25,20,0.08);
--shadow-md: 0 4px 12px rgba(30,25,20,0.10);
--shadow-lg: 0 8px 30px rgba(30,25,20,0.12);
--shadow-xl: 0 20px 60px rgba(30,25,20,0.15);
--shadow-primary: 0 4px 20px rgba(139,115,85,0.25);

--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-modal-backdrop: 300;
--z-modal: 400;
--z-tooltip: 500;
```

---

## 7. Do's and Don'ts

**Do's:**
- 金色用于关键数据展示（金额、标题高亮）
- 表单使用预置选项（下拉选择）以减少输入错误
- 数字金额使用大字号 + 字距压缩，增强视觉冲击
- 步骤之间使用平滑过渡动画（fade + slide）
- 侧栏实时显示已填信息摘要

**Don'ts:**
- 不要使用金色作为大面积背景色
- 不要在同一行放超过两个表单字段
- 不要在结果页使用过多装饰元素
- 不要使用闪烁或过于花哨的动画
- 不要隐藏"下一步"按钮

---

## 8. Responsive Behavior

| Breakpoint | Width | Layout |
|------------|-------|--------|
| mobile | < 768px | 单栏全屏，侧栏隐藏为步骤指示器 |
| tablet | 768-1024px | 侧栏折叠为顶部条 |
| desktop | 1024-1440px | 侧栏+内容区标准布局 |
| wide | > 1440px | 内容区居中，最大1200px |

**Touch Targets**: 最小 44×44px（保留兼容性）

**Font Scaling**: 桌面端固定 px，移动端等比缩放

---

## 9. Agent Prompt Guide

### Quick Reference
- Brand: 正元 (#8B7355 gold), warm professional financial tool
- Layout: Sidebar (280px) + Content area, max 1200px
- Typography: Inter, 48→12px scale
- Spacing: 8px base, 24px card padding
- Shadows: 5 levels, warm tone

### Component Prompts

```
1. 生成一个金色主题的金额展示卡片，带渐变深色背景
2. 创建一个步骤进度条组件，含4个步骤和连线
3. 设计一个省份选择下拉框，含31个选项
4. 生成表单输入组：含标签、输入框、提示文字和错误状态
5. 创建结果详情表格，展示养老金各组成部分
6. 设计侧栏导航，含已填信息摘要
7. 生成过渡动画（步骤切换时的fade+slide）
```

### Iteration Guide
- 确保金色 (#8B7355) 只在关键数据点使用，不过度
- 步骤进度条状态用"已完成/进行中/待完成"三态
- 桌面端侧栏在滚动时应固定（sticky）
- hover状态统一使用 `#F0ECE6` 背景
- 输入框聚焦时使用金色边框 + 3px金色阴影光晕
- 金额数字使用letter-spacing: -0.03em 增强可读性
- 结果页深色卡片使用渐变避免死黑
- 所有动画时长统一为200-300ms ease
