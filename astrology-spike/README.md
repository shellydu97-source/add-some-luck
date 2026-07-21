# Astrology Spike

这是“加点好运”星盘真实基础排盘的隔离技术验证。它没有接入现有 `AstrologyPage`，也不读取或写入产品 store。

## 固定规则

- 中国大陆城市代表坐标；时区固定 `Asia/Shanghai`。
- 热带黄道、地心、真黄道（日期黄道）。
- Astronomy Engine `2.1.19` 计算十星体黄经；黄经中心差分判断逆行。
- 本地公式计算 ASC、MC、Placidus 十二宫宫头。
- 行星恰好落宫头时归入该宫头开始的后一个宫位。
- 仅计算十星体两两之间的合、冲、刑、拱、六合相位。
- Placidus 不可计算时返回 `placidus_unavailable`，不回退其他宫位制。
- 出生时间未知时不生成 ASC、MC、宫头和行星落宫。

## 运行

```bash
pnpm install
pnpm run check
```

`pnpm run generate:references` 会重新调用外部验证工具和 JPL 公共接口。它要求通过环境变量提供 `SWETEST_PATH`、`ASTROLOG_PATH`，不会下载或复制这些工具到项目中。正常开发和测试不需要重新生成黄金期望值。

## 目录

- `src/`：纯计算模块和结构化接口。
- `tests/`：规则、边界和八组外部黄金样本测试。
- `references/raw/`：每个样本的输入、三套原始输出、外部期望值和误差结果。
- `data/`：验证样本涉及的离线城市代表坐标及来源元数据。
- `reports/`：测试报告与推荐结论。

注意：`data/` 目前是验证子集，不是完整中国大陆城市索引，不能直接冒充产品级地点库。
