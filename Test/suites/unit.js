'use strict';

/**
 * 纯函数单元测试，两个脚本共用。
 * 覆盖：matchDomainPattern / getMatchedRegions / normalizeProxyName / fixDialerProxy
 */
function runUnitTests(h, api, meta) {
  h.section('单元测试 · matchDomainPattern（域名规则匹配）');
  const d = new Set(['example.com', 'sub.example.com', 'a.b.example.com', 'other.org']);
  h.test('精确匹配命中', () => h.assert(api.matchDomainPattern('example.com', d)));
  h.test('精确匹配未命中', () => h.assert(!api.matchDomainPattern('nothere.com', d)));
  h.test('精确匹配大小写不敏感', () => h.assert(api.matchDomainPattern('EXAMPLE.COM', new Set(['example.com']))));
  h.test('空集合不匹配', () => h.assert(!api.matchDomainPattern('example.com', new Set())));
  h.test('+.前缀匹配自身及子域', () => h.assert(api.matchDomainPattern('+.example.com', d)));
  h.test('+.前缀未命中', () => h.assert(!api.matchDomainPattern('+.nonexist.com', d)));
  h.test('.前缀匹配子域', () => h.assert(api.matchDomainPattern('.example.com', d)));
  h.test('.前缀不匹配自身', () => h.assert(!api.matchDomainPattern('.other.org', d)));
  h.test('*.通配同层级匹配', () => h.assert(api.matchDomainPattern('*.example.com', d)));
  h.test('*.通配跨层级不匹配', () => h.assert(!api.matchDomainPattern('*.example.com', new Set(['a.b.example.com']))));
  h.test('中间通配符匹配', () => h.assert(api.matchDomainPattern('a.*.com', new Set(['a.b.com', 'a.example.com']))));

  h.section('单元测试 · getMatchedRegions（地区匹配）');
  const matched = (name) => api.getMatchedRegions(name).map((r) => r.name);
  h.test('🇭🇰 香港 01 → 香港', () => h.assert(matched('🇭🇰 香港 01').includes('香港')));
  h.test('HK 02 → 香港', () => h.assert(matched('HK 02').includes('香港')));
  h.test('hongkong-03 → 香港', () => h.assert(matched('hongkong-03').includes('香港')));
  h.test('JAPAN-02 → 日本', () => h.assert(matched('JAPAN-02').includes('日本')));
  h.test('US-LosAngeles-02 → 美国', () => h.assert(matched('US-LosAngeles-02').includes('美国')));
  h.test('SG 01 | 新加坡 → 新加坡', () => h.assert(matched('SG 01 | 新加坡').includes('新加坡')));
  h.test('台湾 01 → 台湾省（仅全量版）', () => {
    if (meta.full) h.assert(matched('台湾 01').includes('台湾省'));
  });
  h.test('日本 0.3x 流量 → 低倍率节点 + 日本', () => {
    const n = matched('日本 0.3x 流量');
    h.assert(n.includes('低倍率节点'));
    h.assert(n.includes('日本'));
  });
  h.test('香港 2x 速率 → 高倍率节点 + 香港', () => {
    const n = matched('香港 2x 速率');
    h.assert(n.includes('高倍率节点'));
    h.assert(n.includes('香港'));
  });
  h.test('无地区关键词 → 空结果', () => h.assertEqual(matched('随便测试名称').length, 0));

  h.section('单元测试 · normalizeProxyName（节点名标准化）');
  h.test('无国旗自动补地区国旗', () => h.assertEqual(api.normalizeProxyName({ name: 'HK 01' }).name, '🇭🇰 HK 01'));
  h.test('已有国旗保持不变', () => h.assertEqual(api.normalizeProxyName({ name: '🇭🇰 香港 01' }).name, '🇭🇰 香港 01'));
  h.test('多余空格被折叠', () => h.assertEqual(api.normalizeProxyName({ name: '日本  大阪' }).name, '🇯🇵 日本 大阪'));
  h.test('无法识别地区保持原名', () => h.assertEqual(api.normalizeProxyName({ name: '随机' }).name, '随机'));

  h.section('单元测试 · fixDialerProxy（dialer-proxy 引用修复）');
  const renameMap = new Map([['旧名', '新名']]);
  const originalNames = new Set(['旧名', '存活名', '被删名']);
  const surviving = new Set(['存活名']);
  const fixArgs = [renameMap, originalNames, surviving];
  h.test('目标被重命名 → 引用同步更新', () =>
    h.assertEqual(api.fixDialerProxy({ 'dialer-proxy': '旧名' }, ...fixArgs)['dialer-proxy'], '新名'),
  );
  h.test('目标存活未改名 → 引用不变', () =>
    h.assertEqual(api.fixDialerProxy({ 'dialer-proxy': '存活名' }, ...fixArgs)['dialer-proxy'], '存活名'),
  );
  h.test('目标被过滤 → 移除引用', () =>
    h.assert(!('dialer-proxy' in api.fixDialerProxy({ 'dialer-proxy': '被删名' }, ...fixArgs))),
  );
  h.test('目标从未存在 → 保持原样', () =>
    h.assertEqual(api.fixDialerProxy({ 'dialer-proxy': '从未存在' }, ...fixArgs)['dialer-proxy'], '从未存在'),
  );
  h.test('无引用字段 → 原样返回', () => h.assertEqual(api.fixDialerProxy({ name: 'x' }, ...fixArgs).name, 'x'));
}

module.exports = { runUnitTests };
