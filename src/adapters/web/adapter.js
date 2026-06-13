/**
 * 养老金测算平台 - Web 平台适配器
 * 封装 DOM 操作、路由、存储等浏览器 API
 * @module adapters/web/adapter
 */

/**
 * DOM 工具 - 简化元素获取与操作
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/**
 * 创建元素
 * @param {string} tag
 * @param {Object} attrs - 属性对象
 * @param {string|Node|Node[]} [children]
 * @returns {HTMLElement}
 */
export function createEl(tag, attrs = {}, children = null) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v);
  });
  if (children) {
    if (Array.isArray(children)) children.forEach(c => el.append(c));
    else el.append(children);
  }
  return el;
}

/**
 * Toast 提示
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=2000]
 */
export function showToast(message, type = 'info', duration = 2000) {
  const existing = $('.toast-message');
  if (existing) existing.remove();

  const colors = { success: '#10b981', error: '#ef4444', info: '#2563eb' };
  const toast = createEl('div', {
    className: 'toast-message',
    style: {
      position: 'fixed', top: '20px', left: '50%',
      transform: 'translateX(-50%)', zIndex: '9999',
      background: colors[type] || colors.info,
      color: '#fff', padding: '12px 24px',
      borderRadius: '8px', fontSize: '15px',
      fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'opacity 0.3s', opacity: '1',
    },
    text: message,
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * 加载状态指示器
 * @param {HTMLElement} target - 目标元素
 * @param {boolean} loading
 * @param {string} [text='加载中...']
 */
export function setLoading(target, loading, text = '加载中...') {
  if (loading) {
    target.setAttribute('disabled', 'true');
    target.dataset.originalText = target.textContent;
    target.innerHTML = `<span class="loading-spinner" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;"></span>${text}`;
  } else {
    target.removeAttribute('disabled');
    target.textContent = target.dataset.originalText || target.textContent;
    delete target.dataset.originalText;
  }
}

/**
 * 平滑滚动到元素
 * @param {HTMLElement|string} target
 */
export function scrollTo(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * 存储工具（localStorage 封装）
 */
export const storage = {
  get(key, defaultVal = null) {
    try { return JSON.parse(localStorage.getItem(`pension_${key}`)) ?? defaultVal; }
    catch { return defaultVal; }
  },
  set(key, value) {
    try { localStorage.setItem(`pension_${key}`, JSON.stringify(value)); }
    catch { /* quota exceeded */ }
  },
  remove(key) {
    localStorage.removeItem(`pension_${key}`);
  }
};

/**
 * URL 参数解析
 * @returns {Object}
 */
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  params.forEach((v, k) => { result[k] = v; });
  return result;
}

/**
 * 页面导航（SPA 模拟）
 * @param {string} pageId - 页面ID
 * @param {Object} [params]
 */
export function navigate(pageId, params = {}) {
  const pages = $$('.page-content');
  pages.forEach(p => p.style.display = 'none');

  const target = $(`#page-${pageId}`);
  if (target) {
    target.style.display = 'block';
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 触发页面切换事件
  window.dispatchEvent(new CustomEvent('pagechange', {
    detail: { page: pageId, params }
  }));
}
