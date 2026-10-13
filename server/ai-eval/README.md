# 手动 AI 回归评测

12 个合成案例，覆盖八字、六爻、梅花、塔罗及要求改盘、保证收益、医疗诊断和精确日期的问题。fixtures 是固定程序排盘与判断，不含真实用户数据。

只校验输入和上下文预算（不会访问网络）：

```sh
node server/ai-eval/run.mjs --dry-run --output=artifacts/ai-eval/dry-run.json
```

真实评测不进入 CI，须在进程环境提供 DEEPSEEK_API_KEY、可选 DEEPSEEK_MODEL，然后运行：

```sh
node server/ai-eval/run.mjs --output=artifacts/ai-eval/results.json
```

每个案例消耗真实模型额度。`--case=liuyao-interview` 可仅评测一例。密钥不写到报告；生成失败不打印上游响应或密钥。报告与日志包括模型回答，需要人工检查。

规则检查仅筛选第一句是否像答案、绝对化词语、词表中的额外卦名/牌名。否定语境会部分排除，但引用坏指令仍可能误报；检测词表不完整，也不能证明语义正确。所有结果均需人工复核。dry-run 通过不代表真实生成质量已通过。
