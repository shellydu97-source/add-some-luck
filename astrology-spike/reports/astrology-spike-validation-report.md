# 星盘独立计算技术验证报告

测试日期：2026-07-14  
结论：**通过独立技术验证，宫位模块未触发停止条件；建议进入下一轮“产品接入设计”，但本轮不接入现有页面。**

## 1. 本轮交付边界

所有新增内容都位于独立的 `astrology-spike/` 目录。本轮没有修改：

- 现有 `AstrologyPage` 及星盘路由；
- 八字、塔罗、六爻、记录模块；
- 产品 store、schema、迁移和根项目依赖；
- 任何 AI、解读、运势或追问功能。

Swiss Ephemeris 只作为外部 QA 工具使用。项目中没有加入 Swiss 源码、可执行文件、WASM 或星历文件。

## 2. 已验证的计算链路

```text
本地出生时间（固定 UTC+8）
  → UTC 标准化
  → 城市代表经纬度
  → Astronomy Engine 十星体真黄经
  → 中心差分黄经速度 / 逆行
  → 本地 ASC、MC、Placidus 宫头公式
  → 行星落宫
  → 十星体五种主要相位
  → 结构化 AstrologySpikeResult
```

已实现并验证：

- 太阳、月亮、水星、金星、火星、木星、土星、天王星、海王星、冥王星；
- 日期真黄道黄经与逆行状态；
- ASC、MC、Placidus 十二宫宫头；
- 跨 0° 的宫位顺序；
- 宫头精确命中时归入后一个宫位；
- 行星落宫；
- 合相 8°、冲相 8°、刑相 6°、拱相 6°、六合 4°；
- 出生时间未知时省略 ASC、MC、宫头和行星落宫；
- Placidus 不收敛时返回明确错误，不自动切换宫位制。

## 3. 计算与对照工具

| 工具 | 版本 / 模式 | 用途 | 是否进入产品依赖 |
|---|---|---|---|
| Astronomy Engine | `2.1.19`，MIT，精确锁定 | 被验证实现：十星体黄经 | 是，仅在独立 spike 中 |
| Swiss `swetest` | `2.10.03`，`-emos` Moshier | 十星体、速度、ASC/MC、Placidus 黄金基准 | 否 |
| NASA/JPL Horizons | API `1.2`，DE441，`500@399`，quantity 31 | 独立十星体黄经对照 | 否，只有保存的 QA 输出 |
| Astrolog | `8.00`，独立 Matrix `-bm` | 独立 ASC/MC、Placidus 宫头与落宫对照 | 否 |

关键设置：tropical、geocentric、apparent / ecliptic-of-date、Placidus、固定 `Asia/Shanghai`。JPL quantity 31 使用 observer-centered IAU76/80 ecliptic-of-date apparent longitude；其坐标定义与项目目标非常接近，但仍作为独立交叉证据而非绝对来源。

外部工具可执行文件哈希：

- `swetest64.exe`：`C44D29554927AD1BA44196B5B274904F012DACAA3B4797F7F4AE6A48618FC1C5`
- 独立 Astrolog Matrix 可执行文件：`80B30F757434D2884A354E2EE12C1B56802816EF1E1613291E84027581D4C811`

详细参数与生成时间保存在 `references/tool-metadata.json`；每个样本的完整输入和原始输出保存在 `references/raw/<sample-id>/`。

## 4. 八个黄金样本结果

误差单位均为角分。表中“十星体”取十颗星体最大误差；“角度/宫头”取 ASC、MC 和十二宫宫头最大误差。

| 样本 | 覆盖点 | 十星体 vs swetest | 十星体 vs JPL | 角度/宫头 vs swetest | 角度/宫头 vs Astrolog Matrix |
|---|---|---:|---:|---:|---:|
| `shanghai-normal` | 上海、普通时间、跨 0° | 0.1871 | 0.1838 | 0.0017 | 0.2452 |
| `beijing-normal` | 北京、普通时间 | 0.0780 | 0.0754 | 0.0004 | 0.2285 |
| `guangzhou-late-night` | 广州、深夜、火星逆行 | 0.1387 | 0.1373 | 0.0009 | 0.1683 |
| `chengdu-leap-day` | 成都、公历闰日 | 0.2719 | 0.2668 | 0.0007 | 0.2980 |
| `urumqi-fixed-shanghai-time` | 乌鲁木齐、固定 UTC+8 | 0.2217 | 0.2195 | 0.0011 | 0.1006 |
| `shanghai-zodiac-boundary` | 太阳约 30° 星座边界 | 0.1924 | 0.1878 | 0.0005 | 0.1753 |
| `beijing-house-cusp-boundary` | 太阳接近上升宫头 | 0.2025 | 0.1976 | 0.0013 | 0.0341 |
| `guangzhou-1901-lower-range` | 1901 下界附近 | 0.1372 | 0.1314 | 0.0003 | 0.2407 |

全局最大值：

- 十星体黄经 vs swetest：**0.2719 角分**；
- 十星体黄经 vs JPL Horizons：**0.2668 角分**；
- ASC、MC、宫头 vs swetest：**0.0017 角分**；
- ASC、MC、宫头 vs 独立 Astrolog Matrix：**0.2980 角分**。

全部低于 1 角分门槛。八组共核验 80 个星体状态，其中 16 个逆行、64 个顺行，与 swetest 速度符号全部一致。八组实际结果合计覆盖了合、冲、刑、拱、六合五种相位；相位容许度边界另有穷举单元测试。

## 5. 自动测试结果

执行命令：

```text
pnpm run check
```

结果：

```text
TypeScript build: passed
Test Files: 3 passed (3)
Tests: 21 passed (21)
```

测试包含：

- 八个黄金样本对 swetest、JPL Horizons、Astrolog Matrix 的误差门槛；
- 十星体与逆行状态；
- ASC、MC、十二宫宫头和行星落宫；
- 宫位顺序、对宫关系和跨 0°；
- 精确宫头归入后一个宫位；
- 五种主要相位及各自容许度边界；
- 出生时间未知的字段抑制；
- Placidus 失败时明确报错且不回退；
- 每个黄金样本的原始工具输出和版本元数据存在性。

## 6. 城市坐标数据

验证数据来自 [GeoNames 中国离线快照](https://download.geonames.org/export/dump/CN.zip)：

- 下载日期：2026-07-14；
- SHA-256：`7B90B81D1B61AF90A38D93A97958E1A4DEBEFF9BD1B21A558785D16353D8B96A`；
- 坐标系：WGS 84 十进制度数；
- 许可证：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；
- 当前验证子集：上海、北京、广州、成都、乌鲁木齐；
- 乌鲁木齐来源记录自带的时区不参与计算，本轮仍严格固定 `Asia/Shanghai`。

当前文件只是黄金样本所需子集。产品接入前应从同一快照生成完整中国大陆省市索引，保留 GeoNames 署名、记录级更新时间和源文件哈希，并对重名城市、行政区变更、直辖市层级进行一次人工抽查。

## 7. 风险与限制

1. 城市代表坐标不是精确出生坐标。对 ASC 和宫头敏感的用户，应在界面明确显示所选城市和代表坐标来源；V1 不应暗示医院级精度。
2. 本轮按产品规则把所有历史日期固定为 UTC+8，没有实现中国历史时区变化。1901 样本验证的是“固定规则的一致性”，不是历史地方时还原。
3. 星座或宫头边界附近，即便误差低于 1 角分，不同成熟引擎仍可能位于边界两侧。结构化结果应保留原始度数和引擎/规则版本，不能只保存星座或宫位标签。
4. 逆行使用前后各 0.05 日的中心差分。当前 80 个状态均一致；产品接入前可再增加“驻留转向时刻”专门样本，避免速度接近零时被浮点噪声翻转。
5. Placidus 在高纬度可能无解。本地模块已明确返回 `placidus_unavailable`，没有静默切换。中国大陆城市样本未出现不收敛。
6. Swiss Ephemeris 的许可仍未确认，因此不能因为本轮拿它做对照，就顺手塞进产品依赖——许可证不会因为我们很认真地测试就突然变温柔。

## 8. 推荐结论

**建议通过本轮技术验证。** Astronomy Engine 十星体路线与独立 Placidus 模块均满足既定 1 角分验收门槛，宫位顺序、跨 0° 和边界归属规则通过，未触发停止条件。

下一阶段若获确认，建议只做以下产品接入准备：

1. 生成并审核完整中国大陆省市离线索引；
2. 将 spike 接口整理为正式 `AstrologyCalculationAdapter`，保留 `engineVersion`、`adapterVersion`、`ruleVersion`；
3. 先接结构化基础结果，不接解读、AI、运势或追问；
4. 继续把 Swiss、Astrolog、JPL 留在测试/验收链路之外，不成为浏览器运行依赖；
5. 增加驻留转向和更多行政区坐标样本后，再进入现有星盘页面展示。

本报告所引用的工具说明：

- [Astronomy Engine 官方仓库](https://github.com/cosinekitty/astronomy)
- [Swiss swetest 官方说明](https://www.astro.com/swisseph/swetest.htm)
- [NASA/JPL Horizons API 文档](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [Astrolog 官方文档](https://www.astrolog.org/ftp/astrolog.htm)
- [GeoNames dump 文档与许可证说明](https://download.geonames.org/export/dump/readme.txt)
