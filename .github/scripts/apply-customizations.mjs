import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(filePath(relativePath), 'utf8');
}

function writeIfChanged(relativePath, content) {
  const target = filePath(relativePath);
  const previous = fs.readFileSync(target, 'utf8');
  if (previous !== content) {
    fs.writeFileSync(target, content);
    console.log('updated ' + relativePath);
    return true;
  }
  console.log('unchanged ' + relativePath);
  return false;
}

function patchScript(text) {
  const overrides = {
    Microsoft: 'false',
    Apple: 'false',
    Line: 'false',
    Netflix: 'false',
    Spotify: 'false',
    PayPal: 'false',
    Patreon: 'false',
    EHentai: 'false',
    GitHub: 'false',
  };

  for (const [key, value] of Object.entries(overrides)) {
    const option = new RegExp(
      '(^\\s*' + key + ':\\s*)(?:true|false)(\\s*,\\s*//[^\\n]*)$',
      'm',
    );
    if (!option.test(text)) {
      throw new Error('missing script option: ' + key);
    }
    text = text.replace(option, (_, prefix, suffix) => prefix + value + suffix);
  }

  const marker = "    name: 'Emby',";
  const start = text.indexOf(marker);
  if (start < 0) {
    throw new Error('missing Emby service in Script/mihomoScript.js');
  }
  const end = text.indexOf('\n  },\n  {', start);
  if (end < 0) {
    throw new Error('cannot locate the end of the Emby service in Script/mihomoScript.js');
  }

  let block = text.slice(start, end);
  const providers = [
    '      emby_direct: {',
    '        ...ruleProviderCommonDomain,',
    "        url: 'https://raw.githubusercontent.com/9kaki/emby-rules/main/rules/emby-direct.mrs',",
    "        path: './ruleset/emby_direct.mrs',",
    "        'path-in-bundle': 'geo/geosite/category-emby.mrs',",
    '      },',
    '      emby_proxy: {',
    '        ...ruleProviderCommonDomain,',
    "        url: 'https://raw.githubusercontent.com/9kaki/emby-rules/main/rules/emby-proxy.mrs',",
    "        path: './ruleset/emby_proxy.mrs',",
    "        'path-in-bundle': 'geo/geosite/category-emby.mrs',",
    '      },',
  ].join('\n');

  if (!block.includes('      emby_direct:')) {
    const providerMarker = /\n      emby:\s*\{/;
    if (!providerMarker.test(block)) {
      throw new Error('missing base Emby provider in Script/mihomoScript.js');
    }
    block = block.replace(providerMarker, (match) => '\n' + providers + match);
  }

  function addRule(rule) {
    if (block.includes("'" + rule + "'")) {
      return;
    }
    const anchor = "'RULE-SET,emby,Emby',";
    const index = block.indexOf(anchor);
    if (index < 0) {
      throw new Error('missing Emby rule anchor in Script/mihomoScript.js');
    }
    block = block.slice(0, index) + "'" + rule + "',\n      " + block.slice(index);
  }

  addRule('RULE-SET,emby_direct,直连');
  addRule('RULE-SET,emby_proxy,Emby');

  block = block.replace(
    /^(\s*)(['"]PROCESS-NAME,[^'\r\n]+,Emby['"],)$/gm,
    (_, indent, body) => indent + '//' + body,
  );

  return text.slice(0, start) + block + text.slice(end);
}

function patchConfig(text) {
  const providers = [
    '  emby_direct:',
    '    <<: *rule_providers_domain',
    "    url: 'https://raw.githubusercontent.com/9kaki/emby-rules/main/rules/emby-direct.mrs'",
    "    path: './ruleset/emby_direct.mrs'",
    "    path-in-bundle: 'geo/geosite/category-emby.mrs'",
    '  emby_proxy:',
    '    <<: *rule_providers_domain',
    "    url: 'https://raw.githubusercontent.com/9kaki/emby-rules/main/rules/emby-proxy.mrs'",
    "    path: './ruleset/emby_proxy.mrs'",
    "    path-in-bundle: 'geo/geosite/category-emby.mrs'",
  ].join('\n');

  if (!text.includes('  emby_direct:')) {
    const marker = '\n  emby:\n';
    const index = text.indexOf(marker);
    if (index < 0) {
      throw new Error('missing base Emby provider in Config/mihomoConfig.yaml');
    }
    text = text.slice(0, index + 1) + providers + '\\n' + text.slice(index + 1);
  }

  function addRule(rule) {
    const line = '  - ' + rule + '\\n';
    if (text.includes(line)) {
      return;
    }
    const anchor = '  - RULE-SET,emby,Emby\n';
    const index = text.indexOf(anchor);
    if (index < 0) {
      throw new Error('missing Emby rule anchor in Config/mihomoConfig.yaml');
    }
    text = text.slice(0, index) + line + text.slice(index);
  }

  addRule('RULE-SET,emby_direct,直连');
  addRule('RULE-SET,emby_proxy,Emby');

  text = text.replace(
    /^(\s*)- PROCESS-NAME,([^\r\n]+,Emby)$/gm,
    (_, indent, body) => indent + '# - PROCESS-NAME,' + body,
  );

  return text;
}

const scriptChanged = writeIfChanged(
  'Script/mihomoScript.js',
  patchScript(read('Script/mihomoScript.js')),
);
const configChanged = writeIfChanged(
  'Config/mihomoConfig.yaml',
  patchConfig(read('Config/mihomoConfig.yaml')),
);

if (!scriptChanged && !configChanged) {
  console.log('customizations already applied');
}
