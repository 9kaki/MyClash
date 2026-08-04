'use strict';

const groupByName = (groups, name) => groups.find((g) => g.name === name);
const proxyNames = (proxies) => proxies.map((p) => p.name);

/** 临时修改 ruleOptionsEnable 的若干选项，执行完成后恢复，避免污染后续用例 */
function withOptions(api, patch, fn) {
  const saved = {};
  for (const key of Object.keys(patch)) {
    saved[key] = api.ruleOptionsEnable[key];
    api.ruleOptionsEnable[key] = patch[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(patch)) api.ruleOptionsEnable[key] = saved[key];
  }
}

/**
 * 集成测试：直接调用 main() 对模拟订阅进行覆写并断言输出。
 * meta: { full, regions }
 */
function runIntegrationTests(h, api, meta, fx) {
  // ---------------- 节点过滤与标准化 ----------------
  h.section('集成测试 · 节点过滤与标准化');
  h.test('过滤 DIRECT/REJECT/REMATCH 与信息节点', () => {
    const out = api.main(fx.typicalSubscription());
    const n = proxyNames(out.proxies);
    for (const bad of ['DIRECT', 'REJECT', 'REMATCH', '官方网站', '剩余流量', '节点到期 2026-08-01']) {
      h.assert(!n.includes(bad), `不应包含节点 ${bad}`);
    }
  });
  h.test('保留有效节点并自动补地区国旗', () => {
    const out = api.main(fx.typicalSubscription());
    const n = proxyNames(out.proxies);
    h.assert(n.includes('🇭🇰 HK 02 - 香港'));
    h.assert(n.includes('🇯🇵 JAPAN-02'));
    h.assert(n.includes('🇸🇬 SG 01 | 新加坡'));
  });
  h.test('dialer-proxy 指向被重命名节点 → 引用同步更新', () => {
    const out = api.main(fx.typicalSubscription());
    const p = out.proxies.find((x) => x.name === '🇯🇵 东京');
    h.assert(p, '节点 🇯🇵 东京 应存在');
    h.assertEqual(p['dialer-proxy'], '🇯🇵 日本大阪');
  });
  h.test('dialer-proxy 指向被过滤节点 → 移除引用', () => {
    const out = api.main(fx.typicalSubscription());
    const p = out.proxies.find((x) => x.name === '测试节点A');
    h.assert(p, '节点 测试节点A 应存在');
    h.assert(!('dialer-proxy' in p), '应移除指向已过滤节点的引用');
  });
  h.test('dialer-proxy 指向存活未改名节点 → 引用保留', () => {
    const out = api.main(fx.typicalSubscription());
    const p = out.proxies.find((x) => x.name === '🇭🇰 香港 04');
    h.assertEqual(p['dialer-proxy'], '🇭🇰 香港 01 | 中转');
  });

  // ---------------- GLOBAL 策略组 ----------------
  h.section('集成测试 · GLOBAL 策略组');
  h.test('GLOBAL 聚合所有策略组', () => {
    const out = api.main(fx.typicalSubscription());
    const global = groupByName(out['proxy-groups'], 'GLOBAL');
    h.assert(global, '缺少 GLOBAL 组');
    for (const g of out['proxy-groups']) {
      if (g.name !== 'GLOBAL') {
        h.assert(global.proxies.includes(g.name), `GLOBAL 缺少策略组 ${g.name}`);
      }
    }
  });

  // ---------------- DNS 与 hosts ----------------
  h.section('集成测试 · DNS 与 hosts');
  h.test('启用 fake-ip 并保留机场私有 DNS', () => {
    const out = api.main(fx.typicalSubscription());
    h.assertEqual(out.dns.enable, true);
    h.assertEqual(out.dns['enhanced-mode'], 'fake-ip');
    h.assert(
      out.dns['proxy-server-nameserver'].includes('https://private.example-dns.com/dns-query'),
      '应保留私有 DNS',
    );
    h.assert(!out.dns['proxy-server-nameserver'].includes('223.5.5.5'), '公共 DNS 应被过滤');
    h.assert(!out.dns['proxy-server-nameserver'].includes('8.8.8.8'), '公共 DNS 应被过滤');
  });
  h.test('节点域名对应 nameserver-policy 被保留', () => {
    const out = api.main(fx.typicalSubscription());
    h.assertDeep(out.dns['proxy-server-nameserver-policy'], {
      'hk1.example.com': 'https://private.example-dns.com/dns-query',
      '+.example.com': ['https://other-dns.com/dns-query'],
    });
  });
  h.test('节点域名对应 hosts 被保留、无关 hosts 被过滤', () => {
    const out = api.main(fx.typicalSubscription());
    h.assertDeep(out.hosts['hk1.example.com'], ['10.0.0.1']);
    h.assertDeep(out.hosts['+.example.com'], ['10.0.0.2']);
    h.assert(!('www.unrelated.com' in out.hosts), '无关 hosts 应被过滤');
  });
  h.test('fake-ip-filter 中匹配节点域名的条目被保留', () => {
    const out = api.main(fx.typicalSubscription());
    const f = out.dns['fake-ip-filter'];
    h.assert(f.includes('hk1.example.com'), '精确匹配的节点域名应保留');
    h.assert(f.includes('+.example.com'), '后缀匹配的节点域名应保留');
    h.assert(f.includes('*.example.com'), '通配匹配的节点域名应保留');
    h.assert(!f.includes('www.unrelated.com'), '无关条目应被过滤');
    h.assert(!f.includes('rule-set:unrelated'), 'rule-set 条目应被过滤');
    h.assertEqual(f[0], 'rule-set:private');
    h.assertEqual(f[1], 'rule-set:fakeip_filter');
  });
  h.test('原配置无 fake-ip-filter → 仅保留默认条目', () => {
    const cfg = fx.typicalSubscription();
    delete cfg.dns['fake-ip-filter'];
    const out = api.main(cfg);
    h.assertDeep(out.dns['fake-ip-filter'], ['rule-set:private', 'rule-set:fakeip_filter']);
  });
  h.test('fake-ip-filter 保留 hosts 映射目标域名条目', () => {
    const out = api.main(fx.hostsMappedSubscription());
    const f = out.dns['fake-ip-filter'];
    h.assert(f.includes('+.example-apt.com'), '节点 hosts 映射目标域名对应的条目应保留');
    h.assert(!f.includes('+.unrelated-filter.com'), '与节点无关的条目应被过滤');
  });
  h.test('hosts 中节点域名映射记录被保留', () => {
    const out = api.main(fx.hostsMappedSubscription());
    h.assertDeep(out.hosts['node-a1b2c3.example-node.biz'], 'node-a1b2c3.example-apt.com');
  });
  h.test('无 dns/hosts 输入时生成默认配置', () => {
    const cfg = fx.typicalSubscription();
    delete cfg.dns;
    delete cfg.hosts;
    const out = api.main(cfg);
    h.assertEqual(out.dns.enable, true);
    h.assertDeep(out.hosts['dns.google'], ['8.8.8.8', '8.8.4.4']);
  });

  // ---------------- 配置选项切换 ----------------
  h.section('集成测试 · 配置选项切换');
  h.test('过滤高倍率节点=true → 移除高倍率节点及组', () =>
    withOptions(api, { 过滤高倍率节点: true }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assert(!proxyNames(out.proxies).includes('日本 2x 高倍率'), '高倍率节点应被过滤');
      h.assert(!groupByName(out['proxy-groups'], '高倍率节点'), '不应生成高倍率组');
      h.assert(groupByName(out['proxy-groups'], '日本'), '日本组仍应存在');
    }),
  );
  h.test('生成地区自动选择组=false → 无自动选择组', () =>
    withOptions(api, { 生成地区自动选择组: false }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assert(!out['proxy-groups'].some((g) => g.name.endsWith('-自动选择')), '不应有自动选择组');
      h.assert(groupByName(out['proxy-groups'], '香港'), '香港组仍应存在');
    }),
  );
  h.test('隐藏地区手动选择组=true → 地区组 hidden', () =>
    withOptions(api, { 隐藏地区手动选择组: true }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assertEqual(groupByName(out['proxy-groups'], '香港').hidden, true);
    }),
  );
  h.test('分流组添加所有节点=true → 分流组含全部节点', () =>
    withOptions(api, { 分流组添加所有节点: true }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assert(groupByName(out['proxy-groups'], 'AI').proxies.includes('🇭🇰 香港 A'), 'AI 组应含全部节点');
    }),
  );
  h.test('屏蔽国外QUIC=false → 移除 QUIC 规则', () =>
    withOptions(api, { 屏蔽国外QUIC: false }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assert(!out.rules.some((r) => r.includes('DST-PORT,443') && r.includes('REJECT')), '不应含 QUIC 规则');
    }),
  );
  h.test('关闭 AI 分流组 → 移除组/规则/规则集', () =>
    withOptions(api, { AI: false }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assert(!groupByName(out['proxy-groups'], 'AI'), 'AI 组应被移除');
      h.assert(!out.rules.includes('RULE-SET,ai,AI'), 'AI 规则应被移除');
      h.assert(!out['rule-providers'].ai, 'ai 规则集应被移除');
    }),
  );
  h.test('关闭手动选择基础组 → 默认代理不含手动选择', () =>
    withOptions(api, { 手动选择: false }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assert(!groupByName(out['proxy-groups'], '手动选择'), '手动选择组应被移除');
      h.assert(!groupByName(out['proxy-groups'], '默认代理').proxies.includes('手动选择'), '默认代理不应含手动选择');
    }),
  );
  h.test('过滤非地区节点=false → 保留信息节点', () =>
    withOptions(api, { 过滤非地区节点: false }, () => {
      const out = api.main(fx.minimalSubscription());
      h.assert(proxyNames(out.proxies).includes('官网公告'), '信息节点应被保留');
    }),
  );

  // ---------------- 异常场景 ----------------
  h.section('集成测试 · 异常场景');
  h.test('空节点列表 → 抛错', () => h.assertThrows(() => api.main(fx.emptySubscription()), /未找到任何代理节点/));
  h.test('仅 DIRECT/REJECT/rematch 类型 → 抛错', () =>
    h.assertThrows(() => api.main(fx.filteredByTypeSubscription()), /未找到任何代理节点/),
  );
  h.test('全部为可过滤节点（信息节点/rematch）且开启过滤 → 抛错', () =>
    h.assertThrows(() => api.main(fx.allFilteredSubscription()), /未找到任何代理节点/),
  );
}

module.exports = { runIntegrationTests };
