// 扫描云端 provinces/*.js 的 PROV_BASE（2021-2025），与官方退休年口径对比
// 黑龙江特例：PROV_BASE 下标=社平年，需 +1 错位对比（PROV_BASE[2024] 实际=退休年2025）
const fs = require('fs');
const path = require('path');

const DIR = 'C:/Users/14041/WorkBuddy/2026-07-16-10-20-33/养老金计算平台/cloudfunctions/calculate/provinces/';

// 官方退休年口径（元/月）——见 _核对-计发基数配置全量陈旧报告.md
const OFFICIAL = {
  anhui:{2021:7103,2022:7401,2023:7688,2024:7842,2025:7999},
  beijing:{2021:10534,2022:11082,2023:11525,2024:11883,2025:12049},
  chongqing:{2021:7438,2022:7750,2023:7988,2024:8160,2025:8240},
  fujian:{2021:6933,2022:7238,2023:7528,2024:7776,2025:7932},
  gansu:{2021:6791,2022:7077,2023:7359,2024:7594,2025:7746},
  guangdong:{2021:8332,2022:8682,2023:9028,2024:9307,2025:9493},
  guangxi:{2021:6184,2022:6442,2023:6629,2024:6847,2025:6983},
  guizhou:{2021:6379,2022:6798,2023:6858,2024:7272.25,2025:7324.5},
  hainan:{2021:7169,2022:7599,2023:8050,2024:8131,2025:8188},
  hebei:{2021:6575,2022:6849,2023:7122,2024:7265,2025:7410},
  heilongjiang:{2021:5120,2022:5865,2023:6430,2024:7010,2025:7570}, // 云端下标=社平年，对比时错位
  henan:{2021:5907,2022:6155,2023:6401,2024:6606,2025:6738},
  hubei:{2021:8125,2022:8531,2023:8613,2024:9022,2025:9112},
  hunan:{2021:6728,2022:7132,2023:7417,2024:7618,2025:7694},
  jiangsu:{2021:7974,2022:8309,2023:8613,2024:8785,2025:8917},
  jiangxi:{2021:6306,2022:6569,2023:6747,2024:6916,2025:7054},
  jilin:{2021:6004.75,2022:6384.83,2023:6655.33,2024:7178.5,2025:7322.08},
  liaoning:{2021:6340,2022:6720,2023:6987,2024:7201,2025:7346},
  neimenggu:{2021:6803,2022:7089,2023:7469,2024:8105,2025:8179},
  ningxia:{2021:7215,2022:7648,2023:7953,2024:8202,2025:8366},
  qinghai:{2021:7908,2022:8261,2023:8591,2024:8878,2025:9056},
  shaanxi:{2021:6914,2022:7202,2023:7489,2024:7727,2025:7881},
  shandong:{2021:6893,2022:7182.5,2023:7468,2024:7678,2025:7831},
  shanghai:{2021:10338,2022:11396,2023:12183,2024:12307,2025:12434},
  shanxi:{2021:6257,2022:6695,2023:6987,2024:7111,2025:7253},
  sichuan:{2021:7379,2022:7822,2023:8079,2024:8321,2025:8462},
  tianjin:{2021:8324,2022:8672,2023:9016,2024:9232,2025:9417},
  xinjiang:{2021:6531,2022:7089,2023:7625,2024:8332,2025:8448},
  xizang:{2021:8839,2022:9900,2023:10791,2024:11546,2025:11777},
  yunnan:{2021:7455,2022:7767,2023:8023,2024:8183,2025:8265},
  zhejiang:{2021:6594,2022:7437,2023:8020,2024:8310,2025:8433}
};

const HEILONGJIANG_SHIFT = true; // 云端 PROV_BASE 下标=社平年
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js'));

let diffCount = 0;
for (const f of files) {
  const prov = f.replace('.js', '');
  if (!OFFICIAL[prov]) continue;
  const src = fs.readFileSync(DIR + f, 'utf8');
  const m = src.match(/PROV_BASE\s*=\s*\{([\s\S]*?)\n\};/);
  if (!m) { console.log(`${prov}: 未找到 PROV_BASE`); continue; }
  const body = m[1];
  const obj = {};
  const re = /(\d{4}):\s*([\d.]+)/g; let mm;
  while ((mm = re.exec(body))) obj[mm[1]] = parseFloat(mm[2]);

  const off = OFFICIAL[prov];
  let diffs = [];
  for (const y of [2021, 2022, 2023, 2024, 2025]) {
    let cloudVal;
    if (prov === 'heilongjiang') {
      cloudVal = obj[String(y - 1)]; // 错位：云端社平年 y-1 → 退休年 y
    } else {
      cloudVal = obj[String(y)];
    }
    const offVal = off[y];
    const cloudStr = (cloudVal === undefined) ? '—' : cloudVal;
    const eq = (cloudVal !== undefined) && Math.abs(cloudVal - offVal) < 0.01;
    if (!eq) {
      diffs.push(`  ${y}: 云端=${cloudStr} 官方=${offVal}`);
    }
  }
  if (diffs.length) {
    diffCount++;
    console.log(`【${prov}】偏差:`);
    diffs.forEach(d => console.log(d));
  }
}
console.log(`\n扫描完成：共 ${diffCount} 个省存在 2021-2025 偏差`);
