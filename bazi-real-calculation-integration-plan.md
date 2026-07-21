# 「加点好运」八字真实基础排盘接入方案（历史分析稿）

> 状态更新（2026-07-14）：本文档原有“待确认”项已被后续冻结规则取代。当前实现以 `src/calculation/bazi/`、`README.md` 和 `bazi-real-calculation-v1-delivery.md` 为准。

- 文档日期：2026-07-14
- 当前状态：仅分析，尚未编码，尚未安装依赖
- 目标流程：人物出生信息 → 标准化输入 → 八字计算模块 → 结构化结果 → 现有八字页面展示
- 产品边界：不接 AI，不生成格局、旺衰、喜忌等争议性判断，不修改塔罗、六爻、星盘和记录功能

## 一、结论摘要

当前项目适合接入“真实基础排盘”，但出生数据只能满足部分场景。正式接入前必须先确认六项核心规则，并补齐独立标准化层；页面不应直接调用第三方历法库。

建议按以下顺序推进：

1. 确认立春、节气、子时、真太阳时、大运顺逆和起运时间规则。
2. 完成出生输入标准化与真实农历合法性校验。
3. 建立项目自己的稳定计算接口。
4. 将 `lunar-javascript` 仅封装在独立 adapter 内。
5. 用边界测试和独立黄金样本校验结果。
6. 先接四柱与基础字段，后续再单独接大运。

## 二、当前出生信息是否足够

当前 `Profile` 数据已经具备：

| 数据 | 当前状态 | 评估 |
|---|---|---|
| 性别 | 男 / 女 | 足够，但只应在大运规则确认后参与计算 |
| 历法 | 公历 / 农历 | 足够 |
| 出生日期 | `YYYY/MM/DD` | 公历合法性已校验；农历仅校验 1—12 月、1—30 日 |
| 闰月 | 布尔值 | 能表达，但尚未验证该年是否真实存在该闰月 |
| 出生时间 | 可为空 | 已支持未知时间 |
| 时间精确度 | 已保留 | 足够表达可信度 |
| 出生地点 | 自由文本 | 不足以确定时区、经纬度和真太阳时 |
| 时区、经纬度、夏令时 | 数据模型已有字段 | 新建人物默认为空，不能直接依赖 |
| 标准化字段 | 已有 | 当前默认 `unprocessed`，尚未真正生成 |
| 换日、真太阳时 | `system_default` | 尚未形成可执行规则 |

评估结论：

- 对“已知公历日期、已知民用时间、不启用真太阳时”的基础四柱，数据接近够用，但仍受换年、换月、换日规则阻塞。
- 对农历输入，需要先做真实农历合法性验证和公历转换。
- 对海外出生、历史时区、夏令时或真太阳时，当前地点文本不够。
- 不应把浏览器所在时区当作出生地时区。
- 不应把中午 12:00 等占位时间送入排盘来伪造时柱。

## 三、现有八字页面字段与计算结果映射

| 页面字段 | 所需结构化结果 | 说明 |
|---|---|---|
| 四柱摘要 | 年、月、日、时柱干支及各自状态 | 每柱需支持 `available / ambiguous / unavailable` |
| 当前大运 | 当前大运干支、起止年份、年龄 | 依赖顺逆与起运规则 |
| 当前流年 | 公历年份、流年干支 | 不生成吉凶判断 |
| 天干、地支 | 每柱的干、支 | 基础结果 |
| 主星 | 各柱天干相对日干的十神 | 日干本身显示“日主” |
| 藏干 | 每个地支的藏干数组 | 不写权重，除非规则另行确认 |
| 副星 | 藏干相对日干的十神数组 | 日柱不能确定时整体不可确定 |
| 星运 | 日干相对各柱地支的十二长生 | 可映射为库的 `DiShi` |
| 自坐 | 各柱天干相对本柱地支的十二长生 | 当前定义不够明确，需单独确认，不能直接等同“星运” |
| 空亡 | 每柱旬空 | 结构化为地支数组，不只存文案 |
| 纳音 | 每柱纳音 | 基础查表结果 |
| 十神关系 | 天干十神、藏干十神的结构化集合 | 不延伸成性格或现实判断 |
| 阴阳五行分布 | 每个干支的阴阳、五行及未加权计数 | 不据此计算旺衰、喜忌 |
| 合、冲、刑、害、破 | 发生关系的柱、地支和关系类型 | 规则表存在差异，需先确定检测范围 |
| 十二长生 | 每柱阶段 | 与“星运”字段可能重复，页面需去重或明确名称 |
| 神煞 | 独立规则集 | 不属于本轮基础排盘，建议暂时隐藏 |
| 格局、旺衰、喜忌 | 不生成 | 应从真实基础结果页隐藏 |
| 大运时间轴 | 顺逆、起运时间、大运干支和起止范围 | 六项待确认规则未定前不输出 |
| 流年列表 | 年份、年龄、干支、所属大运 | 不输出流年判断 |
| 解读页 | 无对应计算字段 | 保持演示隔离或隐藏，不接 AI |

## 四、建议新增的独立文件

```text
src/calculation/bazi/
├─ types.ts
├─ ruleConfig.ts
├─ errors.ts
├─ normalizeBirthInput.ts
├─ baziAdapter.ts
├─ lunarJavascriptAdapter.ts
├─ calculateBazi.ts
├─ availability.ts
└─ index.ts

src/calculation/bazi/__tests__/
├─ normalizeBirthInput.test.ts
├─ lunarConversion.test.ts
├─ lunarJavascriptAdapter.contract.test.ts
├─ baziBoundaries.test.ts
├─ baziUnknownTime.test.ts
├─ baziLocation.test.ts
├─ baziGoldenCases.test.ts
└─ fixtures.ts

src/types/
└─ lunar-javascript.d.ts
```

职责划分：

- `normalizeBirthInput`：只负责合法性、历法转换、时区/地点状态及审计信息。
- `BaziCalculationAdapter`：项目自己的稳定接口。
- `lunarJavascriptAdapter`：唯一允许引用第三方库的文件。
- `calculateBazi`：检查规则是否已确认，再调用 adapter。
- `availability`：决定每个字段是可展示、存在歧义还是不可用。
- 黄金样本不能只复制第三方库结果，应至少与另一份独立历法资料人工核对。

## 五、`lunar-javascript` 候选依赖评估

截至本方案编写时，官方仓库版本为 1.7.7，无第三方运行依赖，入口为 CommonJS `index.js`。

- 官方仓库：https://github.com/6tail/lunar-javascript
- 官方 API：https://6tail.cn/calendar/api.html
- `package.json`：https://github.com/6tail/lunar-javascript/blob/master/package.json
- 许可证：https://github.com/6tail/lunar-javascript/blob/master/LICENSE

### 可以提供

- 公历、农历互转，农历闰月通过负月份表达。
- 节气表、上一/下一节气及精确时刻。
- 年、月、日、时四柱。
- 每柱天干、地支、藏干、五行、纳音、十神、十二长生、旬和旬空。
- 胎元、命宫、身宫。
- 起运、大运、流年、流月接口。
- 两种子时日柱流派和两种起运换算流派。

相关官方文档：

- 八字 API：https://6tail.cn/calendar/lunar.bazi.html
- 节气 API：https://6tail.cn/calendar/lunar.jieqi.html
- 农历实例化 API：https://6tail.cn/calendar/lunar.new.html

### 不能直接或不能可靠提供

- 地点文本解析、经纬度、IANA 时区和夏令时。
- 真太阳时修正。
- 世界各地历史时区规则。
- 出生时间未知时的“三柱安全输出”；需要项目 adapter 自己裁剪。
- 任意自定义的换年、换月、换日、大运顺逆规则。
- 可审计的格局、旺衰、喜忌结论。
- 当前页面“自坐”的明确业务定义。
- 完整且无争议的合冲刑害破、神煞规则。
- 第三方结果的权威保证。

### 许可证

- MIT License。
- 可商业使用、复制、修改和分发。
- 分发时需保留版权与许可证声明。
- 软件按“现状”提供，不作准确性或适用性保证。

### React + TypeScript 适配性

- React 无直接冲突，它是纯计算库。
- Vite 通常可以预打包 CommonJS 依赖，但仍需在实际安装后验证 production build。
- 官方包目前没有在 `package.json` 声明 TypeScript 类型，也没有 ESM `module` 入口。
- 接入时需要本地最小 `.d.ts`、严格 adapter 和运行时输出校验。
- 适合作为“候选历法引擎”，不适合被页面直接依赖，更不能当作绝对正确来源。
- 应固定精确版本，并在结果中记录 `engineVersion`。

## 六、必须等待确认的规则

接口里应将以下规则全部设为 `unresolved`，不提供隐藏默认值：

1. 立春换年：是否采用立春精确时刻。
2. 节气换月：是否采用十二“节”的精确时刻。
3. 子时换日：午夜换日、23:00 换日或晚子时流派。
4. 真太阳时：是否启用、使用什么经度和修正公式。
5. 大运顺逆：年干阴阳与性别如何决定，是否存在其他方案。
6. 起运时间：三天一岁法、分钟换算法或其他规则。

`lunar-javascript` 内置了自己的立春、节令、子时和起运流派；在产品规则确认前，即使库能算，也不应直接采用。

建议追加确认：

- “自坐”的页面定义。
- 五行分布是否只统计可见八字，是否纳入藏干，是否允许权重。
- 合冲刑害破检测范围。
- 神煞是否彻底移出基础排盘。

## 七、出生时间未知时的展示策略

| 结果 | 处理 |
|---|---|
| 公历/农历转换结果 | 可展示 |
| 年柱 | 普通日期可展示；恰逢立春交界日且时间未知时显示歧义 |
| 月柱 | 普通日期可展示；恰逢节令交界日时显示歧义 |
| 日柱 | 受子时换日规则影响；规则未确认时应标记为暂定或歧义 |
| 时柱 | 必须隐藏 |
| 年/月/日柱藏干、纳音、旬空 | 对已确定的柱展示 |
| 十神 | 只有日干确定时才展示 |
| 五行原始分布 | 可展示“三柱部分结果”，明确不完整 |
| 星运、自坐 | 仅对可确定的柱展示 |
| 胎元、命宫、身宫 | 建议隐藏 |
| 大运顺逆、起运、大运时间轴 | 隐藏 |
| 格局、旺衰、喜忌、神煞判断 | 不生成 |

建议不要只有全局 `timeAccuracy`，每个柱和派生字段都返回独立状态。

## 八、公历、农历与闰月转换流程

```text
原始 Profile
  → 格式与范围校验
  → 真实历法合法性校验
  → 生成公历/农历双表示
  → 地点与时区标准化
  → 应用已确认的时间规则
  → 八字 adapter
```

具体要求：

- 公历：校验真实年月日，再以明确的本地民用时间构造输入，避免隐式使用浏览器时区。
- 农历：先验证该年该月是否存在；闰月传入负月份；不存在的闰月直接报错，不能悄悄按普通月处理。
- 未知时间：农历转公历可以只转换日期，但禁止用占位时刻继续计算时柱。
- 转换结果同时保留原始输入、标准化公历、标准化农历、时区/经纬度来源、真太阳时状态、算法版本、规则版本及警告信息。
- 地点无法解析时，应返回 `location_unresolved`，或进入明确标注的“民用时间、未做地点修正”模式，不能静默猜测。

## 九、计算结果接口设计

```ts
interface BaziRuleSet {
  yearBoundary: 'unresolved' | 'li_chun_exact'
  monthBoundary: 'unresolved' | 'jie_exact'
  dayBoundary:
    | 'unresolved'
    | 'civil_midnight'
    | 'late_zi_next_day'
    | 'late_zi_same_day'
  solarTime: 'unresolved' | 'civil_time' | 'true_solar_time'
  luckDirection: 'unresolved' | 'year_yin_yang_and_gender'
  luckStartMethod:
    | 'unresolved'
    | 'three_days_per_year'
    | 'minute_ratio'
}

interface NormalizedBirthInput {
  sourceCalendar: 'solar' | 'lunar'
  sourceDate: string
  sourceTime?: string
  timeAccuracy: TimeAccuracy
  solarDate: string
  lunarDate: {
    year: number
    month: number
    day: number
    isLeapMonth: boolean
  }
  timezone?: string
  utcOffsetMinutes?: number
  latitude?: number
  longitude?: number
  civilDateTime?: string
  effectiveDateTime?: string
  solarTimeCorrectionMinutes?: number
  warnings: string[]
}

interface BaziPillar {
  status: 'available' | 'ambiguous' | 'unavailable'
  ganZhi?: string
  gan?: string
  zhi?: string
  hiddenStems?: string[]
  stemTenGod?: string
  hiddenStemTenGods?: string[]
  wuXing?: { gan: string; zhi: string }
  naYin?: string
  twelveStage?: string
  selfStage?: string
  xun?: string
  xunKong?: string[]
  candidates?: Array<Pick<BaziPillar, 'ganZhi' | 'gan' | 'zhi'>>
  reason?: string
}

interface BaziCalculationResult {
  resultVersion: 'bazi-result-1'
  engine: {
    id: 'lunar-javascript'
    version: string
    adapterVersion: string
  }
  rules: BaziRuleSet
  normalizedInput: NormalizedBirthInput
  pillars: {
    year: BaziPillar
    month: BaziPillar
    day: BaziPillar
    time: BaziPillar
  }
  dayMaster?: string
  visibleFiveElementCounts?: Record<'wood' | 'fire' | 'earth' | 'metal' | 'water', number>
  relations?: Array<{
    type: 'combine' | 'clash' | 'punishment' | 'harm' | 'break'
    participants: string[]
    ruleId: string
  }>
  luck?: {
    direction: 'forward' | 'backward'
    startAfter: { years: number; months: number; days: number; hours?: number }
    startDate: string
    cycles: Array<{
      index: number
      ganZhi: string
      startYear: number
      endYear: number
      startAge: number
      endAge: number
    }>
  }
  warnings: string[]
}

type BaziCalculationResponse =
  | { ok: true; data: BaziCalculationResult }
  | { ok: false; code: BaziErrorCode; message: string; details?: unknown }
```

建议错误码：

- `invalid_solar_date`
- `invalid_lunar_date`
- `invalid_leap_month`
- `rules_unresolved`
- `location_unresolved`
- `timezone_unresolved`
- `unknown_time`
- `unsupported_range`
- `engine_failure`

## 十、边界测试规划

| # | 案例 | 主要断言 |
|---:|---|---|
| 1 | 立春精确时刻前 1 分钟 | 年柱保持上一年规则结果 |
| 2 | 立春精确时刻 | 边界归属符合已确认规则 |
| 3 | 立春精确时刻后 1 分钟 | 年柱完成切换 |
| 4 | 立春当日、时间未知 | 年柱返回 `ambiguous` |
| 5 | 惊蛰前 1 分钟 | 月柱未切换 |
| 6 | 惊蛰精确时刻 | 边界归属符合规则 |
| 7 | 惊蛰后 1 分钟 | 月柱完成切换 |
| 8 | 节令当日、时间未知 | 月柱返回 `ambiguous` |
| 9 | 小寒跨公历年交界 | 节气表跨年索引正确 |
| 10 | 22:59 | 不触发子时换日 |
| 11 | 23:00 | 三种待选换日规则分别验证 |
| 12 | 23:59 | 晚子时规则稳定 |
| 13 | 00:00 | 早子时日柱、时柱正确衔接 |
| 14 | 00:59 / 01:00 | 子时与丑时边界正确 |
| 15 | 普通农历日期转公历 | 双向转换一致 |
| 16 | 2020 闰四月合法日期 | 闰月标志保留，转换成功 |
| 17 | 不存在的闰月 | 返回 `invalid_leap_month` |
| 18 | 农历大月三十 | 合法日期成功 |
| 19 | 农历小月三十 | 返回真实历法错误 |
| 20 | 普通日期、出生时间未知 | 时柱隐藏，其他字段按状态输出 |
| 21 | 立春日、时间未知 | 年柱候选而不是伪造确定值 |
| 22 | 节令日、时间未知 | 月柱候选而不是伪造确定值 |
| 23 | 上海与乌鲁木齐相同民用时间 | 真太阳时关闭时不擅自按经度修正 |
| 24 | 上海与乌鲁木齐启用真太阳时 | 规则未确认时返回 `rules_unresolved` |
| 25 | 上海与纽约同一绝对时刻 | 正确生成不同本地时间表示 |
| 26 | 纽约 DST 跳过的 02:30 | 返回不存在的民用时间错误 |
| 27 | 纽约 DST 重复的 01:30 | 要求明确 offset，不静默选择 |
| 28 | 最小年份 1900 边界 | 转换和引擎范围一致 |
| 29 | 当前日期及未来日期 | 当前可算，未来出生日期拒绝 |
| 30 | 男/女使用同一命盘输入 | 四柱相同；只有已确认的大运规则允许不同 |

另需至少准备 6 个黄金样本，覆盖：

- 普通公历
- 普通农历
- 闰月
- 立春交界
- 节令交界
- 子时交界

每个黄金样本都应记录两个独立核对来源及核对日期。

## 十一、预计修改文件

确认后预计修改：

- `src/pages/BaziPage.tsx`：由 mock 切换到结构化结果及状态展示。
- `src/mocks/charts.ts`：八字 mock 仅保留为开发回退或停止页面引用。
- `src/models/types.ts`：只在确需共享类型时补充；优先把计算类型放独立目录。
- `src/models/labels.ts`：新增计算状态和规则标签。
- `src/components/TermHelp.tsx`：替换为中性的术语定义，不加入判断。
- `src/styles/global.css`：补充歧义、不可用和部分结果样式。
- `package.json`、`pnpm-lock.yaml`：仅在确认采用候选库后修改。
- 新增 `src/calculation/bazi/*`、测试和本地类型声明。

原则上不修改：

- 塔罗相关文件。
- 六爻相关文件。
- `AstrologyPage.tsx`。
- 记录列表、详情和不可变记录逻辑。
- AI、解读和运势模块。

## 十二、建议的实施分段

### 阶段 A：规则与标准化

- 确认六项核心规则。
- 完成公历/农历双向标准化。
- 完成真实闰月和农历日期合法性校验。
- 定义地点、时区和真太阳时缺失时的错误策略。

### 阶段 B：基础四柱

- 接入年、月、日、时四柱。
- 接入天干、地支、藏干、十神、纳音、十二长生、旬空。
- 完成未知时间及边界日期的字段级可用性处理。
- 暂不接大运、神煞、格局、旺衰、喜忌。

### 阶段 C：页面接入

- 替换八字页面 mock 数据源。
- 保留计算来源、规则版本、可信度和错误提示。
- 不生成解读，不写入新的八字解读记录。

### 阶段 D：大运（单独确认后）

- 在顺逆和起运规则确认后单独实现。
- 独立测试起运时间、大运、流年与跨年边界。
- 不与第一批四柱接入捆绑上线。

---

本文件为待确认方案。确认前不得安装 `lunar-javascript`、不得修改现有产品功能、不得开始真实算法编码。
