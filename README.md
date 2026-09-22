# MyClash

基于 [Mihomo](https://github.com/MetaCubeX/mihomo/tree/Alpha) 的**配置文件与覆写脚本**，仅适用于 mihomo 内核的代理客户端

分**全量版**与**精简版**，两者**只是分流策略组数量不同**（不需要那么多分流组就用精简版），其余基本一致

## 特色功能

- 🧩 **分流策略组开箱即用**：内置多个分流组（FCM / YouTube / Google / AI / Microsoft / Apple / Telegram / Steam / TikTok / Twitter / Meta / Line / Netflix / Emby / PikPak / Spotify / Crypto / PayPal / EHentai / AdBlock），每个都能单独开关
- 🌏 **地区策略组按节点自动生成**：香港 / 日本 / 美国 / 新加坡 / 台湾省 / 低倍率 / 高倍率 / 其他节点，每个地区自带对应的自动选择组
- 🧹 **节点自动清洗**：补国旗、折叠空格、自动排除非国家/地区的信息节点、按倍率归类（高倍率 `≥2`、低倍率 `≤0.5` 及“免费 / 低倍 / free”等关键字），可选统一为 IPv4/IPv6 优先
- 🪶 **规则轻量**：采用 `rule-set`（以 `domain` / `ipcidr` 行为为主）按需加载，告别臃肿的 geodata，更省内存
- 🩺 **搞定机场 DNS / hosts 疑难**：节点域名 hosts 映射自动改写进节点 `server`、私有 DNS 自动合并，无需手动搬运
- 🛡️ **屏蔽国外 QUIC 流量**：连接更稳定
- 🪜 **自定义节点 + 链式代理**：在脚本里填节点即生成「自建节点」组；启用链式代理会自动补 `dialer-proxy`，经「链式中转」落地
- 🎨 **图标统一化**：尺寸1024×1024 SVG，超高清渲染无锯齿，等比例铺满、自带渐变、兼容 Flutter 与第三方渲染器
- ✅ **自带自动化测试**：`node Test/run-tests.js`（含 ES2020 语法检查与 QuickJS 实跑 `main()`）
- 📱 **适配 [Bettbox](https://github.com/appshubcc/Bettbox)**：在图形界面里开关策略组与配置项

友情推荐：
[Bettbox](https://github.com/appshubcc/Bettbox) —— 一款轻量、省电、低内存占用的代理客户端。

**覆写脚本已适配 Bettbox，可通过图形界面自定义启用策略组及配置选项，获得更灵活的使用体验，具体效果请查看下方效果预览图。**

---

## 覆写脚本

### 注意事项

> [!IMPORTANT]
>
> ⚠️该脚本仅用于覆写机场提供的配置文件，请勿用于覆写自行编写的配置
>
> ⚠️脚本已解决部分机场抽象DNS导致无法解析节点或者覆写后导致解析出来节点延迟高的问题，请务必关闭代理软件的DNS覆写功能
>
> ⚠️内置 DNS 与路由规则是**配套设计**的（已解决 DNS 泄露）：不要随意改动 DNS 配置段；Windows 上如需解决 DNS 泄露，请关闭系统的“智能多宿主名称解析”，或在代理软件里开启 [严格路由](https://wiki.metacubex.one/config/inbound/tun/#strict-route)

### 脚本功能

脚本顶部的 `ruleOptionsEnable` 就是全部开关，使用 **[Bettbox](https://github.com/appshubcc/Bettbox)** 的图形化开关更加方便（关键项默认全开，按需开关即可）：

| 分类     | 能力                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 策略组   | 根据节点匹配情况动态生成地区策略组；可选是否生成「地区自动选择组」、是否隐藏「地区手动选择组」、是否生成高/低倍率组                                          |
| 节点处理 | 可选过滤高倍率 / 低倍率 / 非地区节点；可将订阅节点统一为 IPv4 或 IPv6 优先（同时开启不生效）                                                                 |
| 分流     | 可将全部节点加入分流策略组；`极简模式` 只保留 默认代理 / 直连 / GLOBAL 与基础国内外分流                                                                      |
| 网络     | 可选屏蔽国外 QUIC 流量                                                                                                                                       |
| 高级     | 自定义节点（自动生成「自建节点」组，与订阅节点重名时自动加「自建-」前缀）；链式代理（自定义节点作落地，经「链式中转」由订阅节点中转，自动补 `dialer-proxy`） |
| 兼容     | 解决机场私有 DNS / 节点域名 hosts 导致的解析问题：hosts 映射自动改写进节点 `server`，自动合并私有 DNS，无需手动复制                                          |

### 使用方法（脚本）

复制以下任意一个链接或者复制完整代码后按如图所示步骤导入到代理客户端，以 [Bettbox](https://github.com/appshubcc/Bettbox) 为例

- [mihomoScript.js（全量版）](/Script/mihomoScript.js)，复制下面这个链接使用👇👇👇

```txt
https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/mihomoScript.js
```

- [Script.js（精简版）](/Script/Script.js)，仅包含少量分流策略组，复制下面这个链接使用👇👇👇

```txt
https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/Script.js
```

|                                                                                   |
| --------------------------------------------------------------------------------- |
| ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/import.webp) |

## 配置文件

配置文件与脚本实现效果基本一致，但功能存在限制。

### 限制

静态 YAML 没法像脚本那样“根据节点动态生成”，因此：

- 不支持自定义启用/禁用配置项
- 无法根据节点匹配情况动态生成策略组（未匹配地区的策略组会回退到 `REJECT`）
- 使用私有 DNS 或 hosts 节点域名映射的机场，需要手动写进配置

### 使用方法（配置）

复制以下任意一个链接或者复制完整代码后导入代理客户端

- [mihomoConfig.yaml（全量版）](/Config/mihomoConfig.yaml)，复制下面这个链接使用👇👇👇

```txt
https://raw.githubusercontent.com/AIsouler/MyClash/main/Config/mihomoConfig.yaml
```

- [mihomoConfigLite.yaml（精简版）](/Config/mihomoConfigLite.yaml)，仅包含少量分流策略组，复制下面这个链接使用👇👇👇

```txt
https://raw.githubusercontent.com/AIsouler/MyClash/main/Config/mihomoConfigLite.yaml
```

## 效果预览

- 客户端： [Bettbox](https://github.com/appshubcc/Bettbox)

|                                                                                  |                                                                                  |                                                                                  |                                                                                  |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_1.webp) | ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_2.webp) | ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_3.webp) | ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_4.webp) |
| ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_5.webp) | ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_6.webp) | ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_7.webp) | ![img](https://raw.githubusercontent.com/AIsouler/MyClash/main/Image/IMG_8.webp) |

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=aisouler/myclash&type=date&legend=top-left)](https://www.star-history.com/?repos=aisouler%2Fmyclash&type=date&legend=top-left)

## 致谢

感谢以下项目以及所有上游项目

- [dahaha-365/YaNet](https://github.com/dahaha-365/YaNet/blob/main/Mihomo/global_script.js)

- [YiXuanZX/rules](https://github.com/YiXuanZX/rules)

- [appshubcc/bett-rules](https://github.com/appshubcc/bett-rules)

- [217heidai/adblockfilters](https://github.com/217heidai/adblockfilters)

- [Koolson/Qure](https://github.com/Koolson/Qure)
