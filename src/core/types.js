/**
 * 养老金测算平台 - 类型定义
 * 运行时类型标注 + JSDoc，不依赖 TypeScript 编译器
 * @module core/types
 */

/**
 * @typedef {Object} ProvinceConfig - 省份配置
 * @property {string} province - 省份代码
 * @property {string} name - 省份名称
 * @property {{year:number, month:number}} account_start - 个人账户建立时间
 * @property {{year:number, month:number}} viewing_start - 视同缴费起始
 * @property {Object} base_rates - 历年计发基数
 * @property {Object} modules - 模块开关配置
 */

/**
 * @typedef {Object} PersonInput - 人员输入信息
 * @property {string} gender - 性别 'male'|'female'
 * @property {string} genderType - 人员子类 'male'|'fw'|'fc'|'fw55'
 * @property {number} birthYear - 出生年份
 * @property {number} birthMonth - 出生月份
 * @property {number} workYear - 参保年份
 * @property {number} workMonth - 参保月份
 * @property {string} cityType - 退休地类型 'cc'|'prov'
 * @property {string} userType - 参保类型 'standard'|'flexible'
 * @property {number} sightYears - 视同缴费年限
 * @property {number} avgIndex - 平均缴费指数
 * @property {number|null} personalAccInput - 个人账户余额（用户填写）
 * @property {number} monthlyIncome - 月收入
 */

/**
 * @typedef {Object} PensionResult - 测算结果
 * @property {Object} legal - 法定退休结果
 * @property {Object} flex - 弹性提前退休结果
 * @property {Object} comparison - 对比数据
 */

/**
 * @typedef {Object} CalcInput - 引擎计算输入
 * @property {PersonInput} person - 人员信息
 * @property {ProvinceConfig} config - 省份配置
 */

/**
 * 人员类型枚举
 */
export const PersonTypes = {
  MALE_WORKER:     { value: 'male',       label: '企业职工·男',     gender: 'male',   type: 'standard', genderType: 'male' },
  FEMALE_WORKER50: { value: 'fw',          label: '企业职工·女（原50岁）', gender: 'female', type: 'standard', genderType: 'fw' },
  FEMALE_WORKER55: { value: 'fc',          label: '企业职工·女（原55岁）', gender: 'female', type: 'standard', genderType: 'fc' },
  FLEX_MALE:       { value: 'eco_male',    label: '灵活就业·男',     gender: 'male',   type: 'flexible', genderType: 'male' },
  FLEX_FEMALE:     { value: 'eco_female',  label: '灵活就业·女',     gender: 'female', type: 'flexible', genderType: 'fw55' },
};

/**
 * 表单字段定义
 * @typedef {Object} FieldDef
 * @property {string} id - 字段ID
 * @property {string} label - 标签
 * @property {'text'|'number'|'month'|'select'|'radio'} type - 控件类型
 * @property {boolean} required - 是否必填
 * @property {string} [placeholder] - 占位提示
 * @property {string} [hint] - 辅助说明
 * @property {Array<{value:string,label:string}>} [options] - select/radio 选项
 * @property {Function} [validate] - 校验函数
 */

export const MODULE_NAMES = {
  BASIC_PENSION: 'basic_pension',
  EXTRA_PENSION: 'extra_pension',
  PERSONAL_ACCOUNT: 'personal_account',
  TRANSITIONAL_PENSION: 'transitional_pension',
  SPECIAL_ADDITION: 'special_addition',
};

export const PROVINCE_LIST = {
  jilin:        { name: '吉林省', region: '东北' },
  liaoning:     { name: '辽宁省', region: '东北' },
  heilongjiang: { name: '黑龙江省', region: '东北' },
  beijing:      { name: '北京市', region: '华北' },
  shanghai:     { name: '上海市', region: '华东' },
  jiangsu:      { name: '江苏省', region: '华东' },
  shandong:     { name: '山东省', region: '华东' },
  henan:        { name: '河南省', region: '华中' },
  hebei:        { name: '河北省', region: '华北' },
  gansu:        { name: '甘肃省', region: '西北' },
  yunnan:       { name: '云南省', region: '西南' },
  sichuan:      { name: '四川省', region: '西南' },
};
