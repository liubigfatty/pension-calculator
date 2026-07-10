// 静态汇总入口：小程序分包不支持动态 require(变量路径)，此处逐一显式 require 31 省
// 由 scripts 从 cloudfunctions/calculate/provinces 复制生成

const anhui = require('./provinces/anhui');
const beijing = require('./provinces/beijing');
const chongqing = require('./provinces/chongqing');
const fujian = require('./provinces/fujian');
const gansu = require('./provinces/gansu');
const guangdong = require('./provinces/guangdong');
const guangxi = require('./provinces/guangxi');
const guizhou = require('./provinces/guizhou');
const hainan = require('./provinces/hainan');
const hebei = require('./provinces/hebei');
const heilongjiang = require('./provinces/heilongjiang');
const henan = require('./provinces/henan');
const hubei = require('./provinces/hubei');
const hunan = require('./provinces/hunan');
const jiangsu = require('./provinces/jiangsu');
const jiangxi = require('./provinces/jiangxi');
const jilin = require('./provinces/jilin');
const liaoning = require('./provinces/liaoning');
const neimenggu = require('./provinces/neimenggu');
const ningxia = require('./provinces/ningxia');
const qinghai = require('./provinces/qinghai');
const shaanxi = require('./provinces/shaanxi');
const shandong = require('./provinces/shandong');
const shanghai = require('./provinces/shanghai');
const shanxi = require('./provinces/shanxi');
const sichuan = require('./provinces/sichuan');
const tianjin = require('./provinces/tianjin');
const xinjiang = require('./provinces/xinjiang');
const xizang = require('./provinces/xizang');
const yunnan = require('./provinces/yunnan');
const zhejiang = require('./provinces/zhejiang');

const MODULES = {
  anhui,
  beijing,
  chongqing,
  fujian,
  gansu,
  guangdong,
  guangxi,
  guizhou,
  hainan,
  hebei,
  heilongjiang,
  henan,
  hubei,
  hunan,
  jiangsu,
  jiangxi,
  jilin,
  liaoning,
  neimenggu,
  ningxia,
  qinghai,
  shaanxi,
  shandong,
  shanghai,
  shanxi,
  sichuan,
  tianjin,
  xinjiang,
  xizang,
  yunnan,
  zhejiang,
};

// slug -> engineConfig（调用各省 getEngineConfig()）
function getConfig(slug) {
  const m = MODULES[slug];
  if (!m || typeof m.getEngineConfig !== 'function') return null;
  return m.getEngineConfig();
}

module.exports = { MODULES, getConfig, SLUGS: ["anhui","beijing","chongqing","fujian","gansu","guangdong","guangxi","guizhou","hainan","hebei","heilongjiang","henan","hubei","hunan","jiangsu","jiangxi","jilin","liaoning","neimenggu","ningxia","qinghai","shaanxi","shandong","shanghai","shanxi","sichuan","tianjin","xinjiang","xizang","yunnan","zhejiang"] };
