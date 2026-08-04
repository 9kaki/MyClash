'use strict';

const { loadScript } = require('./lib/loader');
const { Harness } = require('./lib/harness');
const fx = require('./lib/fixtures');
const { runUnitTests } = require('./suites/unit');
const { runIntegrationTests } = require('./suites/integration');

// 待测试的脚本及各自的差异元信息（全量版 / 精简版）
const SCRIPTS = [
  {
    file: 'Script/Script.js',
    label: '精简版 Script.js',
    meta: {
      full: false,
      regions: ['香港', '日本', '美国', '新加坡'],
    },
  },
  {
    file: 'Script/mihomoScript.js',
    label: '全量版 mihomoScript.js',
    meta: {
      full: true,
      regions: ['香港', '日本', '美国', '新加坡', '台湾省'],
    },
  },
];

/** 打印一份覆写结果概览，便于快速确认输出规模 */
function printDemo(api, label, meta) {
  try {
    const out = api.main(fx.typicalSubscription());
    const groups = out['proxy-groups'];
    const regionSelect = groups.filter((g) => g.type === 'select' && meta.regions.includes(g.name)).map((g) => g.name);
    const other = groups.some((g) => g.name === '其他节点') ? ['其他节点'] : [];
    console.log(`\n  ── 覆写结果概览 (${label}) ──`);
    console.log(`     代理节点: ${out.proxies.length}`);
    console.log(`     策略组:   ${groups.length}`);
    console.log(`     规则:     ${out.rules.length}`);
    console.log(`     规则集:   ${Object.keys(out['rule-providers']).length}`);
    console.log(`     生成地区组: ${[...regionSelect, ...other].join(' / ')}`);
  } catch (err) {
    console.log(`\n  ── 覆写结果概览失败 (${label}): ${err.message}`);
  }
}

function main() {
  console.log('MyClash 覆写脚本测试');
  console.log('='.repeat(64));
  let totalPassed = 0;
  let totalFailed = 0;

  for (const script of SCRIPTS) {
    console.log(`\n${'='.repeat(64)}`);
    console.log(`  测试对象: ${script.label}  (${script.file})`);
    console.log(`${'='.repeat(64)}`);

    const api = loadScript(script.file);
    const h = new Harness(script.label);

    runUnitTests(h, api, script.meta);
    runIntegrationTests(h, api, script.meta, fx);
    printDemo(api, script.label, script.meta);

    const s = h.summary();
    totalPassed += s.passed;
    totalFailed += s.failed;
  }

  console.log(`\n${'='.repeat(64)}`);
  console.log(`  总计: 通过 ${totalPassed} 项，失败 ${totalFailed} 项`);
  console.log(`${'='.repeat(64)}`);

  if (totalFailed > 0) {
    console.log('\n有失败用例，请查看上方 ✗ 标记的详细信息。');
  } else {
    console.log('\n全部测试通过 ✅');
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
