/**
 * Batch fix: fill missing 2025/2026 in avg_salary_history for all 31 provinces
 * Strategy: extrapolate from each province's own 3-year CAGR
 */
const fs = require('fs');
const path = require('path');
const PROV_DIR = path.join(__dirname, '..', 'cloudfunctions', 'calculate', 'provinces');

function parseAVGSalaryHistory(content) {
  const match = content.match(/const AVG_SALARY_HISTORY\s*=\s*\{([\s\S]*?)\};/);
  if (!match) return null;
  const block = match[1];
  const data = {};
  const entries = block.match(/\b(\d{4})\s*:\s*([\d.]+)/g);
  if (entries) {
    for (const e of entries) {
      const m = e.match(/(\d{4})\s*:\s*([\d.]+)/);
      if (m) data[parseInt(m[1])] = parseFloat(m[2]);
    }
  }
  return data;
}

function calcGrowthRate(data, lastYear) {
  const years = Object.keys(data).map(Number).filter(y => y >= lastYear - 3 && y <= lastYear).sort((a,b) => a-b);
  if (years.length < 2) return 0.05;
  return Math.pow(data[lastYear] / data[years[0]], 1 / (lastYear - years[0])) - 1;
}

function fmt(v) {
  return Number.isInteger(v) ? v.toString() : parseFloat(v.toFixed(2)).toString();
}

function main() {
  const files = fs.readdirSync(PROV_DIR).filter(f => f.endsWith('.js'));
  let fixed = 0;
  const report = [];

  for (const f of files.sort()) {
    const code = f.replace('.js', '');
    const fp = path.join(PROV_DIR, f);
    const content = fs.readFileSync(fp, 'utf8');
    
    const data = parseAVGSalaryHistory(content);
    if (!data) continue;
    
    const has2025 = !!data[2025];
    const has2026 = !!data[2026];
    if (has2025 && has2026) continue;

    const lastYear = Math.max(...Object.keys(data).map(Number));
    const rate = calcGrowthRate(data, lastYear);
    
    // Calculate projections
    let val2025 = data[2025];
    let val2026 = data[2026];
    if (!val2025) {
      const base = data[2024] || data[2023] || data[lastYear];
      val2025 = Math.round(base * (1 + rate) * 100) / 100;
    }
    if (!val2026) {
      val2026 = Math.round(val2025 * (1 + rate) * 100) / 100;
    }

    // Replace the entire AVG_SALARY_HISTORY block
    const oldBlockMatch = content.match(/const AVG_SALARY_HISTORY\s*=\s*\{[\s\S]*?\};/);
    if (!oldBlockMatch) { console.log(code + ': cannot find block'); continue; }

    const oldBlock = oldBlockMatch[0];
    
    // Build new block: add missing years before the closing };
    const need2025 = !has2025 ? `\n  2025: ${fmt(val2025)},` : '';
    const need2026 = !has2026 ? `\n  2026: ${fmt(val2026)},` : '';
    
    // Insert before final "};"
    const newBlock = oldBlock.replace(
      /\n\};$/,
      need2025 + need2026 + '\n};'
    );

    if (newBlock === oldBlock) {
      console.log(code + ': no change (already has 2025/2026 or replace failed)');
      continue;
    }

    const newContent = content.replace(oldBlock, newBlock);
    fs.writeFileSync(fp, newContent, 'utf8');
    
    fixed++;
    report.push({
      code,
      added: (!has2025 ? '2025 ' : '') + (!has2026 ? '2026' : ''),
      vals: (!has2025 ? fmt(val2025) : '') + ((!has2025 && !has2026) ? '/' : '') + (!has2026 ? fmt(val2026) : ''),
      rate: (rate * 100).toFixed(1) + '%',
    });
  }

  console.log('\n=== Fixed ' + fixed + ' provinces ===\n');
  console.log('Province     | Added   | Values (yuan/mo) | Growth');
  console.log('-------------|---------|-----------------|-------');
  for (const r of report) {
    console.log(r.code.padEnd(12) + '| ' + r.added.padEnd(7) + '| ' + r.vals.padEnd(15) + '| ' + r.rate);
  }

  // Syntax check all modified files
  console.log('\n--- Syntax check ---');
  let syntaxOk = true;
  for (const r of report) {
    try {
      const result = require('child_process').execSync(
        `node --check "${path.join(PROV_DIR, r.code + '.js')}"`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      console.log(r.code + ': OK');
    } catch (e) {
      console.log(r.code + ': SYNTAX ERROR - ' + e.stderr.trim());
      syntaxOk = false;
    }
  }
  console.log(syntaxOk ? '\nAll syntax checks passed!' : '\nSome files have syntax errors!');
}

main();
