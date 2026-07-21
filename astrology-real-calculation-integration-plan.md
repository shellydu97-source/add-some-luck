# 「加点好运」星盘真实基础排盘接入方案

> 文档状态：待确认方案，不包含代码实现  
> 分析日期：2026-07-14  
> 当前项目：V1.2 数据结构上的 V1 基础框架版  
> 冻结范围：八字模块及其测试保持原样；塔罗、六爻、记录模块不修改

## 0. 结论先行

当前人物资料的**字段形状接近够用，但实际数据通常不够**。日期、时间和历法可以复用；真正的缺口是：新建人物一般只有 `birthPlaceText`，没有经过用户确认的纬度、经度、IANA 时区，也没有出生当时的 UTC 偏移、夏令时状态和时区数据版本。因此不能直接生成可靠的上升、天顶、宫位和行星落宫。

建议把接入拆成两个互不混杂的 adapter：

1. `LocationNormalizationAdapter`：地点文本 → 用户确认的 WGS84 经纬度 → IANA 时区。
2. `AstrologyCalculationAdapter`：标准化出生时刻和地点 → 天体位置 → Placidus 宫位 → 落宫与主要相位。

计算引擎建议采用带闸门的两路线决策：

- **路线 A，质量优先：Swiss Ephemeris。** 行星、速度、上升、天顶和 Placidus 宫位都完整，但必须先书面确认采用 AGPL 还是购买商业许可。许可未确认前，不安装、不集成、不提交任何 Swiss 源码、WASM、数据文件或包装库。
- **路线 B，当前默认的许可安全方案：Astronomy Engine + 项目自有宫位/相位模块。** Astronomy Engine 用于天体位置；上升、天顶、Placidus、落宫、相位由项目自己的纯函数实现并接受更严格的黄金样本验证。它更适合当前 React + TypeScript 浏览器项目，但宫位部分的验证成本高于 Swiss 路线。

不建议把 `astronomia`、`@tubular/astronomy` 或任何简易“星盘一键生成库”直接作为唯一生产引擎；它们可以作为研究或辅助对照，但目前没有同时满足“明确精度边界 + 完整 Placidus + 浏览器友好 + 许可清晰”的证据链。

## 1. 当前人物资料是否足够

### 1.1 已有字段评估

| 当前字段 | 是否可复用 | 结论 |
| --- | --- | --- |
| `calendarType`、`rawBirthDate`、`lunarLeapMonth` | 是 | 足以表达公历、农历和闰月输入；农历仍需转换为公历后再进入天文计算。 |
| `rawBirthTime`、`timeAccuracy` | 部分 | `exact_minute` 可用于完整盘；`unknown` 不得生成角点和宫位。旧数据中的 `known_shichen`、`approximate_period` 不能伪装成精确分钟。 |
| `birthPlaceText` | 否 | 仅是自由文本，不能直接作为天文输入；同名地点、行政区层级和拼写都可能造成误定位。 |
| `latitude`、`longitude` | 结构够、数据常缺 | 已有可选字段，但新建人物的安全默认值是空；还缺坐标来源、版本、置信度与用户确认状态。 |
| `timezone` | 结构够、数据常缺 | 可承载 IANA ID，但目前通常为空，也没有 tzdb 版本。 |
| `daylightSavingStatus` | 不能作为计算真值 | 当前是 `unknown/applied/not_applied` 的档案字段。真实排盘应由“出生时刻 + IANA 时区 + 固定 tzdb 版本”推导，不能让用户手填状态直接决定 UTC。 |
| `normalizedBirthDate`、`normalizedBirthTime`、`normalizationStatus` | 部分 | 字段已存在，但当前新档案默认为 `unprocessed`，不能视为已标准化。 |
| `houseSystem: system_default` | 不直接使用 | V1 计算规则在结果里明确解析为 `placidus`，不把 `system_default` 当成真实算法参数。 |
| `gender`、`relation`、`notes` | 不需要 | 不参与基础星盘计算。 |

### 1.2 可计算等级

| 输入状态 | 可输出内容 |
| --- | --- |
| 精确时间 + 已确认经纬度 + IANA 时区 | 太阳至冥王星、逆行、上升、天顶、十二宫宫头、行星落宫、主要相位。 |
| 精确时间 + 时区已确认，但经纬度缺失 | 可计算时刻对应的行星位置与逆行；不得生成上升、天顶、宫位和落宫。 |
| 出生时间未知 + 时区已确认 | 只计算出生地当地自然日内的稳定范围；不得用中午或 00:00 伪装成精确结果。 |
| 地点文本未确认，且无可信时区 | 暂停真实计算，提示先确认地点；不以浏览器当前时区代替出生地时区。 |
| `known_shichen` / `approximate_period` | V1 应按时间区间计算并返回范围或歧义，不直接输出单一角点。若本轮不实现区间搜索，则按“不足以生成宫位”保守处理。 |

## 2. 地点、时区和出生瞬间标准化

### 2.1 推荐流程

```text
birthPlaceText
  → 地理编码候选（只发送地点文本，不发送姓名、生日、时间）
  → 用户确认候选地点
  → WGS84 纬度/经度 + 标准地点名 + 来源版本
  → 经纬度查询时区边界
  → IANA tzid
  → 本地墙上时间 + tzid + 固定 tzdb 版本
  → UTC 瞬间、UTC 偏移、DST 状态
  → 儒略日 / 天文计算输入
```

### 2.2 纬度与经度

- 地理编码必须返回候选列表，用户确认后才持久化；不能静默选择第一条结果。
- 坐标统一保存为 WGS84 十进制度：北纬为正、南纬为负，东经为正、西经为负。
- 保存 `provider`、`providerVersion`、`canonicalName`、`resolvedAt`、`confidence`、`userConfirmed`，避免未来供应商结果变化后无法复现旧盘。
- 不读取设备 GPS。需要的是出生地点，不是用户当前位置。
- “上海市”等城市级输入可以使用城市代表点；若用户输入医院或区县，应保留更具体的确认结果。V1 不需要海拔，因为本轮采用地心行星位置，Placidus 宫位只需要纬度、经度与时刻。

### 2.3 IANA 时区

- 经纬度不能靠“经度 ÷ 15”推断时区；政治边界、历史变化和夏令时都会使这种方法失效。
- 使用时区边界数据或时区服务，将坐标映射为 `Asia/Shanghai`、`America/New_York` 等 IANA ID。
- IANA tzdb 保存历史 UTC 偏移和夏令时规则，但官方也提示 1970 年以前的历史资料存在更高不确定性。项目必须记录 `tzdbVersion`，不能只保存 tzid。
- 浏览器 `Intl.supportedValuesOf('timeZone')` 只能列出浏览器支持的时区名，不能把地点转换为时区，也不能保证不同设备使用同一 tzdb 版本，因此不能作为黄金测试的唯一来源。

### 2.4 出生当时的 UTC 偏移与夏令时

输入应是“出生地当地日期时间”，不是先构造浏览器本地 `Date`。标准化器使用固定 tzdb：

1. 解析当地墙上时间。
2. 查找该 tzid 在该日期时间的合法 UTC 瞬间。
3. 输出 `utcDateTime`、`utcOffsetMinutes`、`isDst: true/false/unknown`。
4. 若遇到春季跳时产生的不存在时间，返回 `nonexistent_local_time`。
5. 若遇到秋季回拨产生的两个同名时间，返回 `ambiguous_local_time` 和两个候选 UTC，要求用户选择较早或较晚的一次。

`daylightSavingStatus` 只保留为兼容字段，不作为天文计算的输入真值。出生当时的 DST 状态应写入标准化结果快照。

### 2.5 地点服务选择

建议先定义 provider-neutral adapter，再确认供应商：

- 公共 Nominatim 只能用于低频、用户触发的查询，要求限流、缓存和署名；其公共服务明确不适合被无条件写死为通用产品后端。
- 自托管 Nominatim 或商业地理编码服务更可控，但需要单独确认成本、隐私、缓存与署名条款。
- 离线时区边界可来自 Timezone Boundary Builder；代码为 MIT，输出数据为 ODbL。全球多边形不宜直接塞入首屏浏览器包，优先放到服务端或构建期索引。
- 第一版若继续坚持纯本地，可使用经审核的城市索引 + 用户确认；它不应冒充完整全球地址解析。

## 3. 计算路线评估

### 3.1 对比表

> 包体积中的 npm 数字是 2026-07-14 查询到的 `dist.unpackedSize`，不是最终浏览器 gzip 体积；正式选型前必须用 Vite 对固定版本做真实构建测量。本轮没有安装任何包。

| 路线 | 精度与覆盖 | 逆行 | 上升 / 天顶 / Placidus | 浏览器与体积 | 许可与商业风险 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| Swiss Ephemeris 原生 / WASM | 官方称压缩星历可复现 JPL 数据至约 0.001 角秒；覆盖太阳、月亮、主要行星、冥王星及大量附加天体 | 可直接取得速度，适合判定逆行 | 原生支持角点、宫头和行星宫位；Placidus 高纬有明确失败/回退行为 | C 库需 WASM 包装；完整长时间范围行星+月亮星历文件官方给出约 97 MB，V1 可裁剪年份但仍需实测 | **AGPL / Professional 双重许可**。商业闭源不能默认使用 AGPL；WASM 包装不改变底层许可义务 | 技术上最完整；许可确认前禁止接入 |
| Astronomy Engine | 官方目标为相对 NOVAS/JPL 的 ±1 角分；覆盖太阳、月亮、水星至冥王星 | 没有面向占星的现成标志，可用相邻时刻的地心黄经速度稳定推导 | 官方功能表没有星盘宫位；需项目自有角点与 Placidus 实现 | 原生 JS/TS、浏览器可用；官方称 minified JS 约 116,485 字节；npm 2.1.19 解包约 1.84 MB | MIT，商业使用风险低，仍需保留版权声明 | **未获得 Swiss 商业许可时的推荐生产路线** |
| `astronomia` | Meeus 算法集合、完整 VSOP87 行星数据、月亮与 Pluto 模块；没有像 Astronomy Engine 一样清晰的统一 ±1′ 质量承诺 | 需自行用位置差分推导 | 没有现成 Placidus/星盘宫位，Ascendant 仍有开放需求 | 现代浏览器可用、可按模块引入；npm 4.2.0 解包约 18.66 MB，需验证 tree-shaking | MIT | 可做研究或辅助对照，不建议作为第一生产引擎 |
| `@tubular/astronomy` | TypeScript 天文计算库，覆盖日月行星等；公开文档较简略，需自行完成精度审计 | 需推导 | 未发现完整占星宫位 API | npm 3.5.6 解包约 7.92 MB，另有时间等依赖 | MIT | 备选研究路线，不作为当前首选 |
| JPL Horizons API | 成熟的高精度在线星历与参考坐标服务 | 可取得位置/速度用于核验 | 不提供占星 Placidus 宫位 | 网络 API，不适合离线主流程，也不应把外部服务可用性变成出生盘展示的单点故障 | NASA/JPL 服务条款需遵守 | 作为黄金样本参考，不作为生产计算依赖 |

### 3.2 Swiss Ephemeris 许可硬闸门

Astrodienst 官方说明 Swiss Ephemeris 使用双重许可：AGPL 或 Swiss Ephemeris Professional License；在分发包含其代码的软件、或公开启用相关服务前必须完成选择。选择 AGPL 可能要求整个项目采用 AGPL 或兼容许可。

因此：

- 在产品负责人和法务/商业许可方案书面确认前，不得把 Swiss 源码、WASM、星历文件或包装包加入仓库。
- `@swisseph/browser`、其他 npm WASM 包装、远端 Swiss 服务都不能被视为绕过底层许可。
- 允许在独立 QA 环境中把官方 `swetest` 输出当作对照数据，但它不进入应用依赖树或交付包；使用方式仍需遵守官方条款。

### 3.3 推荐路线的实现含义

若选择 Astronomy Engine：

- 使用地心位置，转换为 true ecliptic of date 的热带黄经；最终坐标定义必须在 `ruleVersion` 中冻结。
- 逆行由归一化后的地心黄经对时间求中心差分；处理 359° → 0° 跨界，并在驻留点附近返回 `stationary/ambiguous`，不能因浮点噪声随机翻转。
- 上升、天顶和 Placidus 宫头使用独立的纯函数模块，禁止把无测试的网上公式片段直接复制进 adapter。
- 行星落宫和相位是项目规则层，不散落在页面组件中。

若后续确认 Swiss Professional License：

- 只替换 adapter 实现，不改变页面和结构化结果接口。
- 固定 Swiss、包装器、星历文件和规则版本；禁止运行时自动切换 Swiss/JPL/Moshier 而不写入结果元数据。

### 3.4 明确排除

下列库或方案不进入候选名单：

- 已存在公开度数、经纬度正负号、时区或宫位错误且没有修复版本的简易星盘库。
- 长期无人维护、没有可复现测试、没有许可证或只给出格式化字符串的“一键星盘”库。
- 内部仍调用 Swiss Ephemeris，却把包装层许可证写成更宽松许可的项目。
- 只与一个在线网站视觉比对、没有记录坐标系和时刻设置的方案。

## 4. 第一批真实结果范围

### 4.1 固定范围

- 热带黄道。
- 地心星盘。
- Placidus 宫位制。
- 太阳、月亮、水星、金星、火星、木星、土星、天王星、海王星、冥王星。
- 上升、天顶。
- 行星落座、绝对黄经、座内度数。
- 逆行状态。
- 十二宫宫头。
- 行星落宫。
- 主要相位及实际容许度。

True Node 与 Mean Node 本轮都不输出，等待独立研究后再决定；不能以引擎默认值偷渡其中一种。

### 4.2 不在本轮

- 星盘解读、人格判断、运势、合盘、推运。
- AI、API 解读、继续追问。
- 小行星、凯龙、莉莉丝、福点、Vertex、交点。
- 根据星盘生成任何个性化结论。
- 修改八字、塔罗、六爻和记录逻辑。

### 4.3 仍须在编码前冻结的计算细则

这些不是扩大范围，而是实现“主要相位/落宫”必须明确的细则：

1. 主要相位是否固定为合相 0°、六合 60°、刑相 90°、拱相 120°、冲相 180°。
2. 各相位的最大容许度是否统一，还是日月与其他行星分级；当前不能擅自写死。
3. 相位是否只计算十个星体，还是包含 ASC/MC；建议 V1 先只计算十星体，待确认。
4. 行星恰好落在宫头时归入前宫还是后宫，以及浮点 epsilon。
5. 行星落宫使用“黄经落入宫头区间”的常见画盘方式，还是使用考虑黄纬的三维 mundane house position。两者在少数位置可能不同，必须写入规则版本。
6. 热带黄经采用 apparent / true equinox of date 还是其他坐标定义。黄金工具必须使用完全一致的 frame、time scale、aberration 和 nutation 设置。
7. Placidus 在极圈附近无解时，V1 是返回 `unsupported_house_system_at_latitude`，还是明确允许回退 Porphyry。当前建议**返回不支持，不静默换宫位制**。

## 5. 出生时间未知与不精确

### 5.1 时间未知

严格执行：

- 不生成上升、天顶、十二宫宫头、行星落宫。
- 不用默认中午、00:00 或当前时间补齐。
- 将出生地当地自然日转换为真实 UTC 区间；遇到 23/25 小时的 DST 日也按真实区间处理。
- 对每个星体计算当天黄经范围，并搜索 30° 星座边界与逆行驻留点。
- 若星体整天在同一星座，返回 `stable_range`，页面显示星座与度数范围，不显示伪精确的单一点。
- 若月亮或其他星体当天跨星座，返回 `ambiguous`、候选星座和跨界原因。
- 太阳位于换座日时同样返回歧义，不能只对月亮特殊处理。
- 相位只有在整天都满足同一相位和容许度规则时才可标为稳定；否则隐藏或显示“当天可能变化”，不得用中午盘代表全天。

### 5.2 时间不精确

`known_shichen` 和 `approximate_period` 应转换为 UTC 时间区间，沿用相同的区间搜索模型：

- 只有全区间稳定的结果可以显示为稳定。
- ASC/MC/宫位通常对时间敏感，若无法保证稳定则不生成。
- 若本阶段不实现完整区间搜索，保守降级为与未知时间相同的输出，不能直接取区间中点。

## 6. 公历、农历和闰月输入

1. 保留原始 `calendarType/rawBirthDate/lunarLeapMonth`，不改写用户输入。
2. 公历输入做完整日期合法性和未来日期校验。
3. 农历输入先做真实月份天数与闰月存在性校验。
4. 农历转换为唯一公历日期；若无效，返回 `invalid_lunar_date` 或 `invalid_leap_month`。
5. 将公历日期与出生地当地时间、IANA tzid 组合，再转换为 UTC；不能先把日期当 UTC 再套时区。
6. 八字模块保持冻结。星盘 normalizer 可独立调用项目已经固定的 `lunar-typescript@1.8.6` 完成历法转换，但不得导入八字计算 adapter、不得修改八字源码或测试。
7. 星盘转换另建测试，并继续用香港天文台 1901—2100 对照资料抽样；不会因为八字测试已通过就省略星盘输入链路测试。

## 7. 现有星盘页面字段映射

| 现有页面 | 真实数据来源 | 调整 |
| --- | --- | --- |
| 总览圆盘 | 十星体黄经、ASC/MC、十二宫宫头 | 用最小 SVG 画真实基础圆盘；若计算不完整，明确省略对应图层。 |
| 太阳 / 月亮 / 上升摘要 | `bodies.sun`、`bodies.moon`、`angles.ascendant` | 时间未知时上升不生成；日月可能显示稳定范围或歧义。 |
| 出生信息 | `normalizedInput` | 显示确认地点、经纬度、IANA、出生时偏移/DST、UTC 和数据版本。 |
| 行星表 | `bodies` | 十星体全量展示：星座、座内度数、逆行、宫位；缺少时间时不展示宫位。 |
| 宫位表 | `houses.cusps` | 展示 12 宫宫头。现有“宫主星”不在本轮真实范围，应移除或隐藏，避免擅自选择传统/现代守护星规则。 |
| 相位表 | `aspects` | 展示星体 A、相位、星体 B、实际夹角、容许度。 |
| 解读页 | 无 | 隐藏入口，不创建解读，不调用 `InterpretationView`。 |

所有成功结果显示“真实基础天文计算”及引擎/规则版本；不再给真实结果挂 `DemoBadge`。仍未接入的解读区域不展示，不能把基础数据包装成结论。

## 8. 接口设计

### 8.1 adapter 边界

```ts
export interface LocationNormalizationAdapter {
  search(query: string): Promise<LocationCandidate[]>
  resolveTimeZone(coordinates: GeoCoordinates): Promise<TimeZoneResolution>
}

export interface AstrologyCalculationAdapter {
  readonly engineName: string
  readonly engineVersion: string
  readonly adapterVersion: string
  readonly ruleVersion: string

  calculate(input: NormalizedAstrologyInput): Promise<AstrologyCalculationResult>
}
```

页面只依赖 `AstrologyCalculationAdapter` 的项目接口，不导入第三方引擎类型。

### 8.2 标准化输入

```ts
export interface NormalizedAstrologyInput {
  source: {
    calendarType: 'solar' | 'lunar'
    rawBirthDate: string
    lunarLeapMonth: boolean
    rawBirthTime?: string
    timeAccuracy: 'exact_minute' | 'known_shichen' | 'approximate_period' | 'unknown'
    birthPlaceText: string
  }
  solarDate: { year: number; month: number; day: number }
  location: {
    canonicalName: string
    latitude: number
    longitude: number
    coordinateSystem: 'WGS84'
    ianaTimeZone: string
    locationProvider: string
    locationProviderVersion: string
    tzdbVersion: string
    userConfirmed: true
  }
  time:
    | {
        status: 'exact'
        localDateTime: string
        utcDateTime: string
        utcOffsetMinutes: number
        isDst: boolean | 'unknown'
      }
    | {
        status: 'range' | 'unknown'
        localDate: string
        utcStart: string
        utcEndExclusive: string
      }
}
```

### 8.3 结构化结果

```ts
export type AstrologyBody =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'

export interface AstrologyPosition {
  body: AstrologyBody
  status: 'exact' | 'stable_range' | 'ambiguous'
  eclipticLongitudeDeg?: number
  longitudeRangeDeg?: { start: number; end: number; wrapsZero: boolean }
  sign?: ZodiacSign
  signCandidates?: ZodiacSign[]
  degreeInSignDeg?: number
  retrograde: boolean | 'stationary' | 'ambiguous'
  longitudeSpeedDegPerDay?: number
  house?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  uncertaintyReason?: string
}

export interface AstrologyCalculationSuccess {
  ok: true
  engine: string
  engineVersion: string
  adapterVersion: string
  ruleVersion: string
  calculatedAt: string
  settings: {
    zodiac: 'tropical'
    center: 'geocentric'
    houseSystem: 'placidus'
    nodeMode: 'not_included'
    coordinateFrame: string
    aspectPolicyVersion: string
  }
  normalizedInput: NormalizedAstrologyInput
  bodies: Record<AstrologyBody, AstrologyPosition>
  angles?: {
    ascendant: AnglePosition
    midheaven: AnglePosition
  }
  houses?: {
    system: 'placidus'
    cusps: readonly [HouseCusp, HouseCusp, HouseCusp, HouseCusp, HouseCusp, HouseCusp,
      HouseCusp, HouseCusp, HouseCusp, HouseCusp, HouseCusp, HouseCusp]
  }
  aspects: AstrologyAspect[]
  warnings: string[]
}

export type AstrologyErrorCode =
  | 'invalid_date'
  | 'invalid_lunar_date'
  | 'invalid_leap_month'
  | 'invalid_time'
  | 'location_required'
  | 'location_not_confirmed'
  | 'timezone_required'
  | 'ambiguous_local_time'
  | 'nonexistent_local_time'
  | 'unsupported_house_system_at_latitude'
  | 'calculation_failed'
```

相位对象至少保存：两端星体、相位类型、精确角、实际夹角、实际 orb、允许的最大 orb、规则版本。所有角度内部使用十进制度，格式化为“度/分/秒”只在 UI 层完成。

### 8.4 可复现性元数据

每次结果至少保存：

- `engineVersion`
- `adapterVersion`
- `ruleVersion`
- `tzdbVersion`
- 地理编码来源及版本
- 热带/地心/坐标 frame
- `houseSystem: placidus`
- `aspectPolicyVersion`
- 原始输入和标准化后的 UTC/经纬度

这些字段不能只写在日志里，否则供应商或 tzdb 更新后无法解释同一人物为什么排出不同结果。

## 9. 测试计划

### 9.1 边界测试（规划 30 组，超过最低 20 组）

1. 1900 年最小出生年份。
2. 当前年份合法日期与未来日期拒绝。
3. 普通公历闰日 2000-02-29。
4. 非闰年 1900-02-29 拒绝。
5. 普通农历转公历。
6. 合法农历闰月。
7. 不存在的闰月拒绝。
8. 农历大月/小月边界。
9. 同名地点返回多个候选，未确认时不得计算。
10. 地点无匹配时返回可恢复错误。
11. 东/西经正负号不被颠倒。
12. 赤道、0° 经线和 180° 经线边界。
13. IANA 时区缺失时禁止用浏览器时区补齐。
14. 夏令时春季跳时的不存在本地时间。
15. 夏令时秋季回拨的重复本地时间，较早/较晚两个 fold。
16. 1970 年以前历史时区及不确定性警告。
17. 中国大陆曾实行夏令时年份的出生时刻。
18. 15/30/45 分钟偏移时区，如 `Asia/Kathmandu`。
19. 被整日跳过的民用日期，如 `Pacific/Apia` 2011-12-30。
20. 未知时间遇到 23 小时当地日。
21. 未知时间遇到 25 小时当地日。
22. 黄经 359.999° → 0° 的白羊座换座与角度归一化。
23. 十二个 30° 星座边界参数化测试。
24. 月亮在出生当日跨星座，必须返回歧义。
25. 太阳在换座日且时间未知，不能返回单一星座。
26. 水星驻留点前、驻留点、驻留点后的逆行状态。
27. 其他行星黄经差分跨 0° 时逆行方向不翻转。
28. 合、六合、刑、拱、冲在 orb 内、恰好阈值、阈值外的参数化测试。
29. 两星体位于 359° 和 1° 时，相位夹角应为 2° 而不是 358°。
30. 行星恰落宫头和宫头跨 0° 的落宫规则。
31. 常规纬度 Placidus 12 宫顺序与 ASC/MC。
32. 极圈附近 Placidus 收敛边界。
33. 极圈以外 Placidus 无解时返回明确错误，不能静默换 Porphyry。
34. 同一 UTC 瞬间在不同格式输入下的行星结果一致。
35. 时间未知时绝不出现 ASC、MC、宫头或行星宫位。
36. True Node / Mean Node 都不出现在 V1 结果中。

### 9.2 八个以上黄金样本

以下先固定输入场景；实现阶段生成期望值时，必须记录两套以上独立成熟工具的原始输出。

| ID | 输入 | 覆盖目的 |
| --- | --- | --- |
| G01 | 2000-01-01 12:00:00，Greenwich，51.4779N, 0.0015W，`Europe/London` | J2000 参考瞬间、零时区、完整十星体与宫位。 |
| G02 | 1997-08-30 09:30，上海，31.2304N, 121.4737E，`Asia/Shanghai` | 当前项目常用中国样本、无 DST、完整盘。 |
| G03 | 2024-03-10 01:30，New York，40.7128N, 74.0060W，`America/New_York` | 春季跳时之前的合法本地时间。 |
| G04a | 2024-11-03 01:30，New York，fold=earlier | 秋季回拨第一次 01:30。 |
| G04b | 同上，fold=later | 同名本地时间的第二个 UTC 瞬间；结果必须与 G04a 可区分。 |
| G05 | 1968-07-01 12:00，London，51.5074N, 0.1278W，`Europe/London` | 1970 前历史偏移和英国特殊时制。 |
| G06 | 2024-01-15 12:00，Sydney，33.8688S, 151.2093E，`Australia/Sydney` | 南半球与夏令时。 |
| G07 | 2024-06-21 00:00，Reykjavík，64.1466N, 21.9426W，`Atlantic/Reykjavik` | 高纬但仍低于极圈的 Placidus 压力样本。 |
| G08 | 2024-06-21 00:00，Tromsø，69.6492N, 18.9553E，`Europe/Oslo` | Placidus 无解/不支持的负向黄金样本。 |
| G09 | 农历 2023 年闰二月初一 09:00，上海 | 农历闰月 → 公历 → UTC → 星盘全链路。 |

另增加一个由 JPL 搜索确定并固定的“出生当日月亮跨星座、时间未知”样本，专门验收 `ambiguous`。因此最终黄金 fixture 不少于 10 项。

### 9.3 独立交叉验证协议

不能把“两个网站”自动视为两个独立工具；若它们都使用 Swiss Ephemeris，只算同一引擎的两个界面。

每个黄金样本保存以下三组证据：

1. **NASA/JPL Horizons**：核对地心行星位置与速度；记录 Horizons API 版本、目标、中心、参考平面、时间尺度、aberration/光行时设置和原始响应。
2. **Swiss Ephemeris `swetest`**：核对行星、速度、ASC/MC 和 Placidus 宫头；记录 Swiss 版本、星历源 DE/Swiss/Moshier、flags、命令行和原始输出。仅用于 QA 对照，不进入应用。
3. **Astrolog 8.x 独立配置**：重点核对角点、宫头和相位；必须记录版本、Placidus、热带、地心、时区与坐标，并确认该次运行是否禁用了 Swiss。若实际仍调用 Swiss，则不计为独立来源。

接受规则：

- Astronomy Engine 路线的十星体黄经初始门槛为与参考值误差不超过 1 角分；不能为了让失败测试通过而放宽阈值。
- 常规纬度 ASC/MC/宫头目标误差不超过 1 角分；接近极圈可单列更严格审查，不用“看起来差不多”通过。
- 参考工具之间若因 frame、time scale 或算法定义不一致超过阈值，样本标记 `unresolved` 并停止，不选择最顺眼的结果作为期望值。
- 黄金值只从已达成一致的原始输出生成；禁止直接复制待测库输出再称为黄金值。
- 每项 fixture 记录工具版本、设置、运行日期、原始文件哈希、误差和审核人。

## 10. 文件规划

### 10.1 新增计算与标准化文件

```text
src/calculation/astrology/
  index.ts
  types.ts
  AstrologyCalculationAdapter.ts
  astronomyEngineAdapter.ts          # 若选择 Astronomy Engine
  swissEphemerisAdapter.ts           # 仅在许可确认后才允许新增
  zodiac.ts
  retrograde.ts
  placidus.ts
  housePlacement.ts
  aspects.ts
  unknownTime.ts
  astrologyAdapter.test.ts
  placidus.test.ts
  housePlacement.test.ts
  aspects.test.ts
  unknownTime.test.ts
  goldenSamples.test.ts
  __fixtures__/goldenSamples.ts

src/normalization/location/
  types.ts
  LocationNormalizationAdapter.ts
  locationNormalizer.ts
  locationNormalizer.test.ts

src/normalization/timezone/
  timeZoneResolver.ts
  timeZoneResolver.test.ts

src/components/
  AstrologyChartWheel.tsx
  AstrologyLocationConfirmPanel.tsx
```

公农历转换代码放在星盘 normalizer 内或独立中立模块；不导入、不移动、不重构 `src/calculation/bazi/`。

### 10.2 预计修改的现有文件

| 文件 | 目的 |
| --- | --- |
| `src/pages/AstrologyPage.tsx` | 移除星盘 mock/解读依赖，接结构化真实结果、错误和歧义状态。 |
| `src/components/ChartHeader.tsx` | 将星盘状态从“演示数据”改为“真实基础计算”，保留未知时间提示。 |
| `src/models/types.ts` | 增加可选的地点标准化来源/确认字段；保留现有字段与 schemaVersion 1.2。 |
| `src/storage/schema.ts` | 允许新的可选标准化字段，继续兼容旧档案。 |
| `src/storage/migrations.ts` | 旧档案缺少新字段时保持“待确认”，不猜经纬度和时区。 |
| `src/storage/store.ts` | 新增明确的地点确认 action，只更新对应标准化字段。 |
| `src/storage/store.test.ts` | 验证旧人物、guest 记录和其他数据不丢失。 |
| `src/pages/SettingsPage.tsx` | 显示星盘固定规则、引擎/规则版本和未支持范围。 |
| `src/styles/global.css` | 星盘表格、歧义状态、地点确认和最小 SVG 圆盘样式。 |
| `README.md`、`progress.md` | 实现完成后更新真实范围与限制。 |
| `package.json`、`pnpm-lock.yaml` | 仅在方案和许可证确认后，固定所选依赖精确版本。 |

`src/mocks/charts.ts` 可以保留，星盘页面不再引用其中的星盘 mock；不为“清理”而删除可能仍被其他冻结页面使用的内容。

### 10.3 明确不修改

```text
src/calculation/bazi/**
src/pages/BaziPage.tsx
src/calculation/tarotMock.ts
src/data/tarotCards.ts
src/data/tarotMeanings.ts
src/pages/Tarot*.tsx
src/calculation/liuyaoMock.ts
src/pages/Liuyao*.tsx
src/pages/RecordsPage.tsx
src/pages/RecordDetailPage.tsx
src/utils/record.ts
```

本轮不新增星盘记录类型、不写 AI 解读、不改变现有旧星盘记录。

## 11. 实施顺序与停止条件

1. 确认计算路线及 Swiss 许可结论。
2. 冻结坐标 frame、相位集合/orb、落宫边界与极圈策略。
3. 确认地理编码和时区边界 provider、缓存与数据许可。
4. 创建备份；固定依赖精确版本。
5. 先实现地点/时区标准化和错误状态测试。
6. 实现十星体位置、逆行和未知时间范围。
7. 实现 ASC/MC、Placidus、落宫、主要相位。
8. 建立黄金 fixture，完成至少两个独立成熟工具的交叉验证。
9. 只有计算测试全部通过后，才接入 `AstrologyPage`。
10. 最后执行 build、lint、test、桌面与 390px 移动端流程检查。

任何以下情况立即停止，不靠修改期望值“修好”：

- 黄金工具超出误差阈值且无法解释。
- 出现经纬度正负、UTC/DST、黄经 frame 或宫头顺序不一致。
- Swiss 许可没有明确结论却需要引入 Swiss 代码或数据。
- Placidus 在目标纬度无法稳定收敛。
- 地点供应商条款不允许当前缓存、展示或商业使用方式。

## 12. 主要风险

- **地点歧义是当前最大数据风险。** “长安”“Springfield”等自由文本无法可靠自动定点，必须用户确认。
- **历史时区不是纯技术真值。** IANA 对 1970 年前数据的覆盖和确定性有限，应显示来源与警告。
- **夏令时重叠/空洞。** 同一当地时间可能对应两个 UTC，或根本不存在。
- **天文 frame 不一致。** apparent/astrometric、J2000/of-date、UT/TT 设置不同会造成看似“库算错”的差异。
- **Placidus 高纬无解。** 不可静默改用其他宫位制。
- **容许度与落宫规则尚未冻结。** 它们会直接改变相位列表和宫位归属，必须版本化。
- **浏览器可复现性。** 不能依赖每台设备自带、版本不可控的时区数据库生成黄金值。
- **商业许可。** Swiss 的 AGPL/商业双许可是产品决策，不是 npm 包名选择问题。

## 13. 官方资料与核验入口

- [Swiss Ephemeris 官方介绍、精度、数据体积与双重许可](https://www.astro.com/swisseph/sweph_p.htm)
- [Swiss Ephemeris Programmer's Documentation](https://www.astro.com/ftp/swisseph/doc/swephprg.htm)
- [Swiss Ephemeris General Documentation](https://www.astro.com/ftp/swisseph/doc/swisseph.htm)
- [Astronomy Engine 官方仓库：精度、覆盖、浏览器体积与 MIT 许可](https://github.com/cosinekitty/astronomy)
- [`astronomia` 官方仓库：Meeus/VSOP87、浏览器模块与 MIT 许可](https://github.com/commenthol/astronomia)
- [`@tubular/astronomy` 官方仓库](https://github.com/kshetline/tubular_astronomy)
- [NASA/JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [IANA tzdb 的历史数据范围与限制](https://ftp.iana.org/tz/theory.html)
- [IANA 汇总的时区边界与网络服务资料](https://data.iana.org/time-zones/data/tz-link.html)
- [OpenStreetMap Nominatim 公共服务使用政策](https://operations.osmfoundation.org/policies/nominatim/)
- [Astrolog 8.x 官方文档](https://www.astrolog.org/ftp/astrolog.htm)
- [npm registry：Astronomy Engine](https://registry.npmjs.org/astronomy-engine)
- [npm registry：astronomia](https://registry.npmjs.org/astronomia)
- [npm registry：@tubular/astronomy](https://registry.npmjs.org/%40tubular%2Fastronomy)

---

本方案停在“分析与文件规划”。未安装依赖，未改动任何代码、八字测试或现有产品功能；等待确认后再进入实现。
