/**
 * 养老金测算平台 - 统一状态管理
 * 发布-订阅模式，支持跨组件通信
 * @module core/store
 */

class Store {
  constructor() {
    /** @type {Map<string, any>} */
    this._state = new Map();
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Array<{key:string, oldVal:any, newVal:any, time:number}>} */
    this._history = [];
    this._maxHistory = 50;
  }

  /**
   * 获取状态值
   * @param {string} key
   * @param {any} [defaultVal]
   * @returns {any}
   */
  get(key, defaultVal = undefined) {
    return this._state.has(key) ? this._state.get(key) : defaultVal;
  }

  /**
   * 设置状态值，触发监听器
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    const oldVal = this._state.get(key);
    if (oldVal === value) return;

    this._state.set(key, value);

    // 记录历史
    this._history.push({ key, oldVal, newVal: value, time: Date.now() });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    // 通知监听器
    const listeners = this._listeners.get(key);
    if (listeners) {
      listeners.forEach(fn => {
        try { fn(value, oldVal); }
        catch (e) { console.error(`[Store] 监听器错误 [${key}]:`, e); }
      });
    }

    // 通知全局监听器
    const globalListeners = this._listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(fn => {
        try { fn(key, value, oldVal); }
        catch (e) { console.error('[Store] 全局监听器错误:', e); }
      });
    }
  }

  /**
   * 订阅状态变化
   * @param {string} key - 状态键，'*' 监听所有
   * @param {Function} fn - 回调 fn(newVal, oldVal)
   * @returns {Function} 取消订阅函数
   */
  subscribe(key, fn) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(fn);
    return () => this._listeners.get(key)?.delete(fn);
  }

  /**
   * 批量设置
   * @param {Object} obj
   */
  batchSet(obj) {
    Object.entries(obj).forEach(([k, v]) => this.set(k, v));
  }

  /**
   * 重置指定键
   * @param {string[]} keys
   */
  reset(keys = []) {
    if (keys.length === 0) {
      this._state.clear();
      this._listeners.clear();
      this._history = [];
    } else {
      keys.forEach(k => {
        this._state.delete(k);
        this._listeners.delete(k);
      });
    }
  }

  /**
   * 获取变更历史
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * 快照当前状态
   */
  snapshot() {
    const snap = {};
    this._state.forEach((v, k) => { snap[k] = v; });
    return snap;
  }
}

// 单例导出
export const store = new Store();

// 状态键常量
export const STATE_KEYS = {
  // 用户输入
  PROVINCE:       'input.province',
  CITY_TYPE:      'input.cityType',
  PERSON_TYPE:    'input.personType',
  BIRTH_DATE:     'input.birthDate',
  WORK_DATE:      'input.workDate',
  AVG_INDEX:      'input.avgIndex',
  MONTHLY_INCOME: 'input.monthlyIncome',
  PERSONAL_ACC:   'input.personalAcc',

  // 计算状态
  CALC_LOADING:   'calc.loading',
  CALC_ERROR:     'calc.error',
  CALC_RESULT:    'calc.result',

  // 省份配置
  CONFIG_LOADING: 'config.loading',
  CONFIG_DATA:    'config.data',
  CONFIG_ERROR:   'config.error',

  // UI状态
  CURRENT_PAGE:   'ui.currentPage',
  MODAL_OPEN:     'ui.modalOpen',
  TOAST:          'ui.toast',
};
