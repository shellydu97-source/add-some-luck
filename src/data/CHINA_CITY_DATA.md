# 中国大陆省市与代表坐标数据

产品使用本地离线省市数据，不读取设备位置，也不调用地图或在线地理编码服务。

- 省市层级与行政区划代码：`modood/Administrative-divisions-of-China` 的 `pc-code.json`，数据更新至 2023-06-30，WTFPL。
- 主要坐标来源：GeoNames `CN.zip` 中国数据，快照下载于 2026-07-14，CC BY 4.0。
- GeoNames `CN.zip` SHA-256：`7B90B81D1B61AF90A38D93A97958E1A4DEBEFF9BD1B21A558785D16353D8B96A`。
- GeoNames 尚未收录的双河市、昆玉市、新星市、白杨市坐标取自 Wikidata 结构化数据快照，CC0 1.0；实体 ID 和原始坐标保存在 `artifacts/location-data/sources/wikidata-city-coordinate-overrides-2026-07-14.json`。
- 坐标系：WGS 84 十进制度数。
- 当前范围：31 个省级行政区、369 个地级或省直辖城市条目。
- 产品时区规则：统一保存为 `Asia/Shanghai`。

城市坐标是用于基础星盘计算的城市代表点，不是具体街道或行政区边界中心。用户必须先选省份，再主动确认城市；旧人物只有文本地点时不会自动猜测。

数据生成脚本为 `scripts/generate-china-city-data.mjs`。GeoNames 完整下载包不进入产品源码；行政区划输入快照和许可证保存在 `artifacts/location-data/sources`。
