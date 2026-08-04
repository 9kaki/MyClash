# MyClash 覆写脚本测试

对 `Script/Script.js`（精简版）与 `Script/mihomoScript.js`（全量版）两个覆写脚本的自动化测试。

## 运行方式

在仓库根目录执行：

```bash
node Test/run-tests.js
# 或
npm --prefix Test test
```

无需安装任何依赖，仅需要 Node.js（推荐 ≥ 16）。

## 覆盖内容

### 单元测试（纯函数）

- `matchDomainPattern`：精确 / `+.` / `.` / `*.` / 中间通配符、大小写
- `applyHostsToProxies`：hosts 映射改写节点 server（精确/通配/数组取值/优先级，单层替换）
- `getMatchedRegions`：香港 / 日本 / 美国 / 新加坡 / 台湾省（全量版）以及低/高倍率匹配
- `normalizeProxyName`：自动补国旗、折叠空格、保持原名
- `fixDialerProxy`：重命名引用更新、过滤引用移除、未变引用保留

### 集成测试（main 覆写）

- 节点过滤（DIRECT/REJECT/rematch/信息节点）、标准化补国旗、dialer-proxy 修复
- GLOBAL 策略组聚合所有策略组
- DNS 与 hosts（私有 DNS 保留、公共 DNS 过滤、节点域名 policy/fake-ip-filter 保留、hosts 映射改写 server）
- 配置选项开关（过滤高倍率 / 自动选择组 / 隐藏手动组 / 分流组添加所有节点 / QUIC / 关闭分流组）
- 异常场景（空节点、仅 DIRECT/REJECT/rematch 类型、全部可过滤节点 → 抛错）

## 文件结构

```text
Test/
├── package.json            # npm test 脚本
├── run-tests.js            # 入口：对两个脚本分别跑单元+集成测试并输出结果
├── README.md
├── lib/
│   ├── loader.js           # vm 沙箱加载脚本并暴露 main / 内部函数 / ruleOptionsEnable
│   ├── harness.js          # 轻量断言与 ✓/✗ 输出、汇总
│   └── fixtures.js         # 模拟订阅配置（典型/精简/空/仅type过滤/全部可过滤/hosts映射/通配映射）
└── suites/
    ├── unit.js             # 纯函数单元测试
    └── integration.js      # main() 集成测试
```

## 说明

- 通过 `vm` 沙箱执行原脚本并在末尾追加导出语句来获取内部符号，**不会修改 `Script/` 目录下的原文件**。
- 测试通过修改导出的 `ruleOptionsEnable` 对象来模拟配置项开关，用 `withOptions` 保证用后恢复。
