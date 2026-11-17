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

const disabledProxyGroups = new Set([
  'GitHub',
  'Apple',
  'Line',
  'Netflix',
  'Spotify',
  'Crypto',
  'Patreon',
  'EHentai',
]);

const disabledProxyRules = new Map([
  ['github', 'GitHub'],
  ['apple', 'Apple'],
  ['apple_ip', 'Apple'],
  ['line', 'Line'],
  ['netflix', 'Netflix'],
  ['netflix_ip', 'Netflix'],
  ['spotify', 'Spotify'],
  ['spotify_ip', 'Spotify'],
  ['cryptocurrency', 'Crypto'],
  ['patreon', 'Patreon'],
  ['ehentai', 'EHentai'],
]);

function disableSelectedProxyGroups(text) {
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  let inProxyGroups = false;
  let disabledGroup = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line === 'proxy-groups:') {
      inProxyGroups = true;
      disabledGroup = null;
      continue;
    }

    if (inProxyGroups && /^[A-Za-z0-9_-]+:\s*$/.test(line)) {
      inProxyGroups = false;
      disabledGroup = null;
    }

    if (!inProxyGroups) {
      continue;
    }

    const groupMatch = line.match(/^  - name:\s*['"]([^'"]+)['"]\s*$/);
    if (groupMatch) {
      disabledGroup = disabledProxyGroups.has(groupMatch[1])
        ? groupMatch[1]
        : null;
    }

    if (disabledGroup && !line.startsWith('#')) {
      lines[index] = line ? '# ' + line : '#';
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const ruleMatch = lines[index].match(
      /^  - RULE-SET,([^,]+),([^,\s]+)(?:,.*)?$/,
    );
    if (
      ruleMatch &&
      disabledProxyRules.get(ruleMatch[1]) === ruleMatch[2]
    ) {
      lines[index] = '# ' + lines[index];
    }
  }

  return lines.join(newline);
}

const embyProviders = [
  { name: 'emby_direct', source: 'emby-direct' },
  { name: 'emby_proxy', source: 'emby-proxy' },
];

function scriptEmbyProviders(pathInBundle) {
  return embyProviders
    .map(({ name, source }) => {
      const lines = [
        `      ${name}: {`,
        '        ...ruleProviderCommonDomain,',
        `        url: 'https://raw.githubusercontent.com/9kaki/emby-rules/main/rules/${source}.mrs',`,
        `        path: './ruleset/${name}.mrs',`,
      ];
      if (pathInBundle) {
        lines.push("        'path-in-bundle': 'geo/geosite/category-emby.mrs',");
      }
      lines.push('      },');
      return lines.join('\n');
    })
    .join('\n');
}

function configEmbyProviders(pathInBundle) {
  return embyProviders
    .map(({ name, source }) => {
      const lines = [
        `  ${name}:`,
        '    <<: *rule_providers_domain',
        `    url: 'https://raw.githubusercontent.com/9kaki/emby-rules/main/rules/${source}.mrs'`,
        `    path: './ruleset/${name}.mrs'`,
      ];
      if (pathInBundle) {
        lines.push("    path-in-bundle: 'geo/geosite/category-emby.mrs'");
      }
      return lines.join('\n');
    })
    .join('\n');
}

function patchScript(text, { scriptPath, pathInBundle }) {
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
    Crypto: 'false',
  };

  for (const [key, value] of Object.entries(overrides)) {
    const option = new RegExp(
      '(^\\s*' + key + ':\\s*)(?:true|false)(\\s*,\\s*//[^\\n]*)$',
      'm',
    );
    if (!option.test(text)) {
      throw new Error('missing script option: ' + key + ' in ' + scriptPath);
    }
    text = text.replace(option, (_, prefix, suffix) => prefix + value + suffix);
  }

  const marker = "    name: 'Emby',";
  const start = text.indexOf(marker);
  if (start < 0) {
    throw new Error('missing Emby service in ' + scriptPath);
  }
  const end = text.indexOf('\n  },\n  {', start);
  if (end < 0) {
    throw new Error('cannot locate the end of the Emby service in ' + scriptPath);
  }

  let block = text.slice(start, end);
  const providers = scriptEmbyProviders(pathInBundle);

  if (!block.includes('      emby_direct:')) {
    const providerMarker = /\n      emby:\s*\{/;
    if (!providerMarker.test(block)) {
      throw new Error('missing base Emby provider in ' + scriptPath);
    }
    block = block.replace(providerMarker, (match) => '\n' + providers + match);
  }

  function addRule(rule) {
    const quoted = "'" + rule + "'";
    if (block.includes(quoted)) {
      return;
    }
    const rulesMatch = /rules: \[([\s\S]*?)\]/.exec(block);
    if (!rulesMatch) {
      throw new Error('missing Emby rules array in ' + scriptPath);
    }
    const items = (rulesMatch[1].match(/'[^']*'/g) || []).map((item) =>
      item.trim(),
    );
    const anchorIndex = items.indexOf("'RULE-SET,emby,Emby'");
    items.splice(anchorIndex < 0 ? items.length : anchorIndex, 0, quoted);
    block = block.replace(rulesMatch[0], 'rules: [' + items.join(', ') + ']');
  }

  addRule('RULE-SET,emby_direct,直连');
  addRule('RULE-SET,emby_proxy,Emby');

  block = block.replace(
    /^(\s*)(['"]PROCESS-NAME,[^'\r\n]+,Emby['"],)$/gm,
    (_, indent, body) => indent + '//' + body,
  );

  return text.slice(0, start) + block + text.slice(end);
}

function patchConfig(text, { configPath, pathInBundle }) {
  const providers = configEmbyProviders(pathInBundle);

  if (!text.includes('  emby_direct:')) {
    const marker = '\n  emby:\n';
    const index = text.indexOf(marker);
    if (index < 0) {
      throw new Error('missing base Emby provider in ' + configPath);
    }
    text = text.slice(0, index + 1) + providers + '\n' + text.slice(index + 1);
  }

  function addRule(rule) {
    const line = '  - ' + rule + '\n';
    if (text.includes(line)) {
      return;
    }
    const anchor = '  - RULE-SET,emby,Emby\n';
    const index = text.indexOf(anchor);
    if (index < 0) {
      throw new Error('missing Emby rule anchor in ' + configPath);
    }
    text = text.slice(0, index) + line + text.slice(index);
  }

  addRule('RULE-SET,emby_direct,直连');
  addRule('RULE-SET,emby_proxy,Emby');

  text = text.replace(
    /^(\s*)- PROCESS-NAME,([^\r\n]+,Emby)$/gm,
    (_, indent, body) => indent + '# - PROCESS-NAME,' + body,
  );

  text = disableSelectedProxyGroups(text);

  return text;
}

const targets = [
  {
    scriptPath: 'Script/mihomoScript.js',
    configPath: 'Config/mihomoConfig.yaml',
    pathInBundle: true,
  },
  {
    scriptPath: 'Script/concordScript.js',
    configPath: 'Config/concordConfig.yaml',
    pathInBundle: false,
  },
];

let changed = false;
for (const target of targets) {
  const scriptChanged = writeIfChanged(
    target.scriptPath,
    patchScript(read(target.scriptPath), target),
  );
  const configChanged = writeIfChanged(
    target.configPath,
    patchConfig(read(target.configPath), target),
  );
  changed = scriptChanged || configChanged || changed;
}

if (!changed) {
  console.log('customizations already applied');
}
