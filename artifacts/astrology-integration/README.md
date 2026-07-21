# 星盘真实基础排盘增量接入验收

验收日期：2026-07-14（Asia/Shanghai）

## 实现范围

- 中国大陆离线省市搜索与用户确认坐标；固定 `Asia/Shanghai`。
- Astronomy Engine `2.1.19`：十星体 true ecliptic of date 黄经与逆行状态。
- 项目独立模块：ASC、MC、Placidus 十二宫、行星落宫与五种主要相位。
- 星盘页仅保留总览、行星、宫位、相位；未接解读、运势、AI 或追问。
- 未知或不精确出生时间按完整自然日范围处理，不补中午、零点或时段中点。

## 备份

- 文件：`../../../backups/luck-app-pre-astrology-integration-20260714-1532.zip`
- SHA-256：`7542A8F8140D6F9E7A5C1865A11F9CCD60C8386038BF3527B7C5617E912EFC42`

## 验收结果

- `pnpm build`：通过，189 modules transformed。
- `pnpm lint`：通过。
- `pnpm test`：14 个文件、131 个测试全部通过。
- `astrology-spike/pnpm test`：3 个文件、21 个测试全部通过。
- 浏览器控制台：总览、宫位、相位及错误状态均为 0 条应用 error/warning。
- 390px 检查：无横向溢出。
- 备份哈希核验：八字、塔罗、六爻、记录模块无差异；`astrology-spike` 的源码、黄金样本、原始对照输出和误差报告无差异。

## 分包变化

| 资源 | 接入前 | 接入后 | 说明 |
| --- | ---: | ---: | --- |
| 首屏主 JS | 713,753 B | 730,577 B | +16,824 B（+2.36%） |
| 首屏主 JS gzip | 228.47 kB | 234.40 kB | 约 +5.93 kB |
| CSS | 28.43 kB | 33.00 kB | +4.57 kB |
| 星盘计算动态包 | — | 54,636 B / gzip 23,932 B | 进入星盘页后加载 |
| 城市数据动态包 | — | 78,309 B / gzip 14,232 B | 使用地点选择器时加载 |

主包仍有 Vite 的 500 kB 体积提示；该提示在接入前已存在，本轮新增计算与城市数据已独立动态分包。

## 截图

1. `01-new-profile-city-search.png`：新建人物城市搜索。
2. `02-location-pending.png`：旧人物地点待确认。
3. `03-real-astrology-overview.png`：真实星盘总览。
4. `04-planets.png`：十星体列表。
5. `05-houses.png`：Placidus 十二宫。
6. `06-aspects.png`：主要相位。
7. `07-unknown-birth-time.png`：未知出生时间与跨星座歧义。
8. `08-mobile-390-overview.png`：390px 移动端总览。
