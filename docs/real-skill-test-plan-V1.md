# AI-Skill-Evaluator 第一批真实 Skill 测试方案 V1.0

> 日期：2026-08-25 ｜ 执行环境：AI-Skill-Evaluator V0.1 + 本地 chatgpt2api 网关（0 元）
> 原则：不为漂亮结果选容易通过的 Skill——4 个对象里至少 1 个预期会暴露评分体系问题。

---

## 1. 测试目标

验证 V0.1 评分体系能否区分：**真有效 / 无效 / 负资产** 的 Skill，并暴露以下问题：
- 判官（gpt 系模型自评）是否存在系统性偏差
- 六维权重是否与人的直觉判断一致
- with/without 对比在"软技能类 Skill"上是否可测
- 稳定性维度对 LLM 天然随机性的惩罚是否过重

## 2. Skill 选择理由（覆盖 4 类型）

| # | Skill | 来源 | 类型 | 选择理由 | 预期 |
|---|---|---|---|---|---|
| 1 | **tdd** | mattpocock/skills（75.9万安装） | Coding | 最热门工程 skill；测试任务有客观对错，最可能测出真实 lift | 中-高有效 |
| 2 | **research** | mattpocock/skills | Research | 结构化资料整理指令，效果依赖判断，测判官在开放性任务上的表现 | 不确定 |
| 3 | **writing-for-agents** | mattpocock/skills | Writing | 元技能（教 agent 写文档），输出主观性强——**预期暴露判官偏差** | 低-中 |
| 4 | **frontend-design** | anthropics 官方（81.4万安装） | 高热度争议 | "热门≠有效"验证位：官方出品+高安装，但设计质量难以被文本判官评估 | 预期低分/测不出 |

## 3. 测试任务设计

每个 skill 由我人工编写 `evals.json`（3 条 eval），任务设计为**不依赖 skill 也部分可做、但 skill 应显著改善**的形式：

### tdd
1. 为"解析 CSV 并求最大值"函数写测试先行方案（断言：先写失败测试→再实现）
2. 重构含 bug 的函数时给出回归测试清单
3. mock 边界场景设计

### research
1. 给定主题列出调研框架（信息源分级+交叉验证步骤）
2. 冲突信息裁决流程
3. 摘要结构化输出

### writing-for-agents
1. 为 CLI 工具写 README 片段（agent 可执行性）
2. 改写含糊需求为明确规格
3. 写操作手册步骤

### frontend-design
1. 生成落地页 HTML 的设计决策说明
2. 配色/排版系统建议
3. 组件层次规划

**无基线任务**：同一 prompt，system message 为空（V0.1 自动处理）。
**使用模型**：target=judge=`gpt`（chatgpt2api 网关），temperature 0。
**运行参数**：`--baseline --runs 3 --concurrency 2`

## 4. 测试执行流程

```
1. 为每个 skill 建 testbed 目录（复制 SKILL.md + 自编 evals.json）
2. node dist/cli.js <testbed> --config batch.yaml（逐个跑，避免网关限流）
3. 收集 benchmark.json + score.json + grading.json 到 results/
4. 人工抽查每条 grading evidence 是否靠谱（判官质检）
5. 对照分析：分数 vs 我作为人类的预判
```

## 5. 数据记录方式

- 自动落盘：`benchmark.json`（pass_rate/tokens/time/cost mean+stddev+delta）、`score.json`（六维分）、`grading.json`（逐断言证据）
- 人工记录：`human-judgment.md` —— 每条 eval 我先盲评（skill 该不该有帮助），跑完后对比机器分
- 抽查比例：grading evidence 100% 人工过目（本批仅 36 条）

## 6. 评分结果分析方法

1. **排序一致性**：机器总分排序 vs 人工盲评排序是否一致（Spearman 手算）
2. **判官可靠性**：evidence 是否真的引用了输出（防判官敷衍）
3. **lift 可信度**：with−without 的 Δpass_rate 方向是否符合直觉
4. **成本效率**：token 开销 ×N 的提升是否值得（结合 SkillsBench 的"+16.2pp 但 16/84 负增长"基准线）
5. **稳定性维度校准**：LLM temperature 0 下 pass_rate stddev 正常范围是多少，当前 0.25 归零阈值是否过严

## 7. 可能发现的问题（预登记假设，防事后合理化）

| # | 假设 | 若成立的影响 |
|---|---|---|
| H1 | 判官对"有结构化输出的回答"系统性偏袒 with_skill（因为 SKILL.md 通常要求格式化） | lift 维度虚高 → 需要双向盲评 |
| H2 | frontend-design 类视觉 skill 在纯文本判官下测不出价值 | capability/lift 失真 → 该类型应标注"不适合本工具"或引入渲染截图评测（V0.2） |
| H3 | stability 权重 15% 过重：runs=3 时一次判官抖动就砸掉 15 分 | 权重降到 10%，或 stddev 阈值放宽 |
| H4 | cost 预算默认值（2000 tokens 舒适）对长 SKILL.md 不公平——光注入 skill 本身就可能超 | 预算按 skill 体积自适应 |

## 8. 下一步优化建议（视结果触发）

- 若 H1 成立 → V0.2 加"判官不知道哪个是 with_skill"的盲评模式
- 若 H2 成立 → 文档声明适用边界 + 排期视觉评测通道
- 若 H3/H4 成立 → 调权重/预算并重跑本批验证收敛性

---

## 执行记录

（见后续实际运行结果）
